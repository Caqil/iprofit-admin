// app/api/user/wallet/deposit/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/config/auth';
import { z } from 'zod';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Transaction } from '@/models/Transaction';
import { Plan } from '@/models/Plan';
import { AuditLog } from '@/models/AuditLog';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import { sendEmail } from '@/lib/email';
import TransactionUtils from '@/utils/transaction-helpers';
import mongoose from 'mongoose';

// Mobile deposit validation schema
const mobileDepositSchema = z.object({
  amount: z.number().min(0.01, 'Amount must be greater than 0').max(100000, 'Amount too large'),
  currency: z.enum(['USD', 'BDT']).default('BDT'),
  gateway: z.enum(['CoinGate', 'UddoktaPay', 'Manual']),
  depositMethod: z.string().min(1, 'Deposit method is required'),
  deviceId: z.string().min(1, 'Device ID is required'),
  
  // Gateway-specific data
  gatewayData: z.object({
    // For CoinGate (crypto)
    coinType: z.string().optional(),
    
    // For UddoktaPay (mobile banking)
    mobileNumber: z.string().optional(),
    mobileProvider: z.string().optional(), // bKash, Nagad, Rocket, etc.
    
    // For Manual deposits
    bankName: z.string().optional(),
    accountNumber: z.string().optional(),
    referenceNumber: z.string().optional(),
    depositSlip: z.string().optional(), // Base64 image or file URL
    
    // Common fields
    note: z.string().max(500).optional(),
    urgentProcessing: z.boolean().optional().default(false)
  }).optional(),

  // User confirmation
  acceptTerms: z.boolean().refine(val => val === true, 'You must accept terms and conditions'),
  confirmAmount: z.boolean().refine(val => val === true, 'Please confirm the deposit amount')
});

// POST /api/user/wallet/deposit - Create mobile deposit
async function createMobileDepositHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  try {
    await connectToDatabase();

    // Check authentication
    const session = await getServerSession(authConfig);
    if (!session?.user || session.user.userType !== 'user') {
      return apiHandler.unauthorized('User authentication required');
    }

    const userId = session.user.id;
    const body = await request.json();
    const validationResult = mobileDepositSchema.safeParse(body);

    if (!validationResult.success) {
      return apiHandler.validationError(
        validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      );
    }

    const { 
      amount, 
      currency, 
      gateway, 
      depositMethod, 
      deviceId, 
      gatewayData,
      acceptTerms,
      confirmAmount
    } = validationResult.data;

    const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    // Get user with plan
    const user = await User.findById(userId).populate('planId');
    if (!user) {
      return apiHandler.notFound('User not found');
    }

    // Check account status
    if (user.status !== 'Active') {
      return apiHandler.forbidden(`Account is ${user.status.toLowerCase()}`);
    }

    if (!user.emailVerified) {
      return apiHandler.forbidden('Email verification required for deposits');
    }

    // Get user's existing transactions for limit validation
    const existingTransactions = await Transaction.find({
      userId,
      type: 'deposit',
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
    });

    // Validate transaction limits
    const limitValidation = await TransactionUtils.validateTransactionLimits(
      user,
      amount,
      'deposit',
      existingTransactions
    );

    if (!limitValidation.isValid) {
      return apiHandler.badRequest(limitValidation.errors.join(', '));
    }

    // Calculate fees
    const feeCalculation = TransactionUtils.calculateDepositFees(
      amount,
      gateway,
      gatewayData?.urgentProcessing || false
    );

    // Generate unique transaction ID
    const transactionId = TransactionUtils.generateTransactionId('deposit');

    // Validate gateway-specific requirements
    const gatewayValidation = validateGatewayData(gateway, depositMethod, gatewayData);
    if (!gatewayValidation.isValid) {
      return apiHandler.badRequest(gatewayValidation.error || 'Invalid gateway data');
    }

    // Create transaction record
    const transaction = await Transaction.create({
      userId,
      type: 'deposit',
      amount,
      currency,
      gateway,
      status: 'Pending', // All mobile deposits require admin approval
      description: `Mobile deposit via ${depositMethod}`,
      transactionId,
      fees: feeCalculation.totalFee,
      netAmount: feeCalculation.netAmount,
      balanceBefore: user.balance,
      metadata: {
        ipAddress: clientIP,
        userAgent,
        deviceId,
        depositMethod,
        gatewayData,
        mobileDeposit: true,
        urgentProcessing: gatewayData?.urgentProcessing || false,
        feeBreakdown: {
          baseFee: feeCalculation.baseFee,
          percentageFee: feeCalculation.percentageFee,
          totalFee: feeCalculation.totalFee
        }
      }
    });

    // Log audit
    await AuditLog.create({
      adminId: null,
      action: 'MOBILE_DEPOSIT_REQUEST',
      entity: 'Transaction',
      entityId: transaction._id.toString(),
      oldData: { balance: user.balance },
      newData: {
        amount,
        currency,
        gateway,
        depositMethod,
        transactionId
      },
      status: 'Success',
      metadata: {
        userSelfAction: true,
        depositMethod,
        urgentProcessing: gatewayData?.urgentProcessing || false
      },
      ipAddress: clientIP,
      userAgent,
      severity: 'Low'
    });

    // Send notification email
    try {
      await sendEmail({
        to: user.email,
        subject: 'Deposit Request Submitted',
        templateId: 'deposit_requested',
        variables: {
          userName: user.name,
          amount: amount.toFixed(2),
          currency,
          transactionId,
          depositMethod,
          estimatedProcessingTime: getEstimatedProcessingTime(gateway),
          trackingUrl: `${process.env.NEXTAUTH_URL}/user/transactions/${transaction._id}`,
          supportEmail: process.env.SUPPORT_EMAIL || 'support@iprofit.com'
        }
      });
    } catch (emailError) {
      console.error('Failed to send deposit notification email:', emailError);
    }

    // Prepare response based on gateway
    let paymentInfo = {};
    
    if (gateway === 'CoinGate') {
      paymentInfo = {
        paymentType: 'cryptocurrency',
        instructions: 'You will receive payment instructions via email',
        estimatedConfirmation: '10-30 minutes after payment'
      };
    } else if (gateway === 'UddoktaPay') {
      paymentInfo = {
        paymentType: 'mobile_banking',
        instructions: 'Complete payment through your mobile banking app',
        mobileProvider: gatewayData?.mobileProvider,
        estimatedConfirmation: '5-15 minutes after payment'
      };
    } else {
      paymentInfo = {
        paymentType: 'manual',
        instructions: 'Your deposit request will be reviewed by our team',
        estimatedConfirmation: '1-24 hours'
      };
    }

    const response = {
      transaction: {
        id: transaction._id.toString(),
        transactionId,
        amount,
        currency,
        fees: feeCalculation.totalFee,
        netAmount: feeCalculation.netAmount,
        status: 'Pending',
        gateway,
        depositMethod,
        createdAt: transaction.createdAt
      },
      
      paymentInfo,
      
      feeBreakdown: {
        depositAmount: amount,
        baseFee: feeCalculation.baseFee,
        percentageFee: feeCalculation.percentageFee,
        urgentFee: gatewayData?.urgentProcessing ? amount * 0.005 : 0,
        totalFees: feeCalculation.totalFee,
        netCredit: feeCalculation.netAmount
      },

      nextSteps: [
        gateway === 'Manual' 
          ? 'Submit payment proof through the app'
          : 'Complete payment using the provided instructions',
        'Wait for admin approval',
        'Funds will be credited to your account after approval'
      ],

      estimatedProcessingTime: getEstimatedProcessingTime(gateway),
      
      supportInfo: {
        trackingId: transactionId,
        supportEmail: process.env.SUPPORT_EMAIL || 'support@iprofit.com',
        helpUrl: `${process.env.NEXTAUTH_URL}/user/help/deposits`
      },

      warnings: limitValidation.warnings
    };

    return apiHandler.created(response, 'Deposit request created successfully');

  } catch (error) {
    console.error('Mobile deposit error:', error);
    return apiHandler.internalError('Failed to create deposit request');
  }
}

// Helper functions
function validateGatewayData(gateway: string, depositMethod: string, gatewayData: any): { isValid: boolean; error?: string } {
  if (!gatewayData) {
    return { isValid: false, error: 'Gateway data is required' };
  }

  switch (gateway) {
    case 'CoinGate':
      if (!gatewayData.coinType) {
        return { isValid: false, error: 'Cryptocurrency type is required' };
      }
      break;

    case 'UddoktaPay':
      if (!gatewayData.mobileNumber || !gatewayData.mobileProvider) {
        return { isValid: false, error: 'Mobile number and provider are required' };
      }
      
      // Validate mobile number format
      const cleanMobileNumber = gatewayData.mobileNumber.replace(/[^\d]/g, '');
      if (cleanMobileNumber.length < 10 || cleanMobileNumber.length > 15) {
        return { isValid: false, error: 'Invalid mobile number format' };
      }
      break;

    case 'Manual':
      if (depositMethod === 'bank_transfer') {
        if (!gatewayData.bankName || !gatewayData.accountNumber) {
          return { isValid: false, error: 'Bank name and account number are required' };
        }
      }
      
      if (!gatewayData.referenceNumber) {
        return { isValid: false, error: 'Reference number is required for manual deposits' };
      }
      break;

    default:
      return { isValid: false, error: 'Invalid gateway selected' };
  }

  return { isValid: true };
}

function getEstimatedProcessingTime(gateway: string): string {
  switch (gateway) {
    case 'CoinGate':
      return '10-30 minutes after payment confirmation';
    case 'UddoktaPay':
      return '5-15 minutes after payment';
    case 'Manual':
      return '1-24 hours after verification';
    default:
      return '1-3 business days';
  }
}

export const POST = withErrorHandler(createMobileDepositHandler);