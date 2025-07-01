// app/api/user/wallet/deposit/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/config/auth';
import { z } from 'zod';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Transaction } from '@/models/Transaction';
import { AuditLog } from '@/models/AuditLog';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import { sendEmail } from '@/lib/email';
import TransactionUtils from '@/utils/transaction-helpers';
import { TRANSACTION_LIMITS } from '@/lib/constants';
import mongoose from 'mongoose';

// Mobile deposit validation schema
const mobileDepositSchema = z.object({
  amount: z.number().min(1, 'Amount must be greater than 0').max(1000000, 'Amount too large'),
  currency: z.enum(['USD', 'BDT']).default('BDT'),
  gateway: z.enum(['CoinGate', 'UddoktaPay', 'Manual']),
  depositMethod: z.string().min(1, 'Deposit method is required'),
  deviceId: z.string().min(1, 'Device ID is required'),
  
  // Gateway-specific data
  gatewayData: z.object({
    // For CoinGate (crypto)
    coinType: z.string().optional(),
    walletAddress: z.string().optional(),
    
    // For UddoktaPay (mobile banking)
    mobileNumber: z.string().optional(),
    mobileProvider: z.enum(['bKash', 'Nagad', 'Rocket', 'Upay', 'SureCash']).optional(),
    
    // For Manual deposits
    bankName: z.string().optional(),
    accountNumber: z.string().optional(),
    accountHolderName: z.string().optional(),
    referenceNumber: z.string().optional(),
    depositSlip: z.string().optional(), // Base64 image or file URL
    bankBranch: z.string().optional(),
    
    // Common fields
    note: z.string().max(500).optional(),
    urgentProcessing: z.boolean().optional().default(false),
    customerReference: z.string().optional()
  }).optional(),

  // User confirmation
  acceptTerms: z.boolean().refine(val => val === true, 'You must accept terms and conditions'),
  confirmAmount: z.boolean().refine(val => val === true, 'Please confirm the deposit amount'),
  
  // Additional security
  securityPin: z.string().optional(),
  biometricVerification: z.boolean().optional().default(false)
});

export interface DepositResponse {
  success: boolean;
  transactionId: string;
  amount: number;
  currency: string;
  gateway: string;
  status: string;
  fees: {
    baseFee: number;
    percentageFee: number;
    totalFee: number;
    urgentFee?: number;
  };
  netAmount: number;
  estimatedProcessingTime: string;
  paymentInstructions?: {
    method: string;
    details: any;
    qrCode?: string;
    expirationTime?: Date;
  };
  nextSteps: string[];
  warnings: string[];
  trackingInfo: {
    referenceNumber: string;
    statusCheckUrl: string;
    estimatedCompletion: Date;
  };
}

// Validation helper functions
function validateGatewayData(gateway: string, depositMethod: string, gatewayData: any): string[] {
  const errors: string[] = [];

  switch (gateway) {
    case 'CoinGate':
      if (!gatewayData?.coinType) {
        errors.push('Coin type is required for crypto deposits');
      }
      break;

    case 'UddoktaPay':
      if (!gatewayData?.mobileNumber) {
        errors.push('Mobile number is required for UddoktaPay');
      }
      if (!gatewayData?.mobileProvider) {
        errors.push('Mobile provider is required for UddoktaPay');
      }
      if (gatewayData?.mobileNumber && !/^(\+88)?01[3-9]\d{8}$/.test(gatewayData.mobileNumber)) {
        errors.push('Invalid Bangladesh mobile number format');
      }
      break;

    case 'Manual':
      if (depositMethod === 'bank_transfer') {
        if (!gatewayData?.bankName) errors.push('Bank name is required');
        if (!gatewayData?.accountNumber) errors.push('Account number is required');
        if (!gatewayData?.accountHolderName) errors.push('Account holder name is required');
      }
      if (depositMethod === 'mobile_banking') {
        if (!gatewayData?.mobileNumber) errors.push('Mobile number is required');
        if (!gatewayData?.mobileProvider) errors.push('Mobile provider is required');
      }
      if (!gatewayData?.referenceNumber) {
        errors.push('Reference number is required for manual deposits');
      }
      break;
  }

  return errors;
}

function generatePaymentInstructions(gateway: string, amount: number, currency: string, gatewayData: any): any {
  switch (gateway) {
    case 'CoinGate':
      return {
        method: 'Cryptocurrency',
        details: {
          coinType: gatewayData?.coinType || 'Bitcoin',
          amount: amount,
          currency: currency,
          network: 'Bitcoin',
          confirmationsRequired: 3
        },
        expirationTime: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
      };

    case 'UddoktaPay':
      return {
        method: 'Mobile Banking',
        details: {
          provider: gatewayData?.mobileProvider,
          merchantNumber: '01XXXXXXXXX', // Your merchant number
          amount: amount,
          reference: `DEP-${Date.now()}`,
          instructions: [
            `Open your ${gatewayData?.mobileProvider} app`,
            'Go to Send Money',
            'Enter merchant number: 01XXXXXXXXX',
            `Enter amount: ${amount} ${currency}`,
            'Complete the payment',
            'Save the transaction ID'
          ]
        },
        expirationTime: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
      };

    case 'Manual':
      return {
        method: 'Manual Transfer',
        details: {
          bankName: 'Your Bank Name',
          accountNumber: 'XXXXXXXXXXXX',
          accountHolderName: 'Your Company Name',
          routingNumber: 'XXXXXXXXX',
          amount: amount,
          currency: currency,
          reference: gatewayData?.referenceNumber,
          instructions: [
            'Transfer the exact amount to the provided account',
            'Use the reference number in transaction details',
            'Upload proof of payment',
            'Wait for admin verification'
          ]
        }
      };

    default:
      return {
        method: 'Unknown',
        details: {},
        instructions: ['Contact support for payment instructions']
      };
  }
}

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
      confirmAmount,
      securityPin,
      biometricVerification
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

    // Check for account locks
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return apiHandler.forbidden('Account is temporarily locked');
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

    // Validate gateway-specific requirements
    const gatewayValidation = validateGatewayData(gateway, depositMethod, gatewayData);
    if (gatewayValidation.length > 0) {
      return apiHandler.validationError(
        gatewayValidation.map(error => ({
          field: 'gatewayData',
          message: error,
          code: 'GATEWAY_VALIDATION_ERROR'
        }))
      );
    }

    // Calculate fees
    const feeCalculation = TransactionUtils.calculateFees(
      amount,
      gateway,
      'deposit',
      gatewayData?.urgentProcessing || false
    );

    // Risk assessment
    const riskScore = TransactionUtils.calculateRiskScore(
      { amount }, // transaction object with amount
      user,
      existingTransactions
    );

    // Generate unique transaction ID
    const transactionId = TransactionUtils.generateTransactionId('deposit');

    // Determine initial status based on risk and amount
    let initialStatus = 'Pending';
    if (riskScore > 70 || amount > 50000) {
      initialStatus = 'Pending'; // High risk - manual review
    }

    // Start transaction session for atomicity
    const session_db = await mongoose.startSession();
    
    try {
      await session_db.withTransaction(async () => {
        // Create deposit transaction
        const transaction = await Transaction.create([{
          userId: new mongoose.Types.ObjectId(userId),
          type: 'deposit',
          amount,
          currency,
          gateway,
          status: initialStatus,
          transactionId,
          fees: feeCalculation.totalFee,
          netAmount: feeCalculation.netAmount,
          description: `Deposit via ${depositMethod}${gatewayData?.urgentProcessing ? ' (Urgent)' : ''}`,
          gatewayResponse: gatewayData,
          metadata: {
            ipAddress: clientIP,
            userAgent,
            deviceId,
            depositMethod,
            urgentProcessing: gatewayData?.urgentProcessing || false,
            riskScore,
            securityPin: securityPin ? 'PROVIDED' : 'NOT_PROVIDED',
            biometricVerification: biometricVerification || false,
            customerReference: gatewayData?.customerReference
          }
        }], { session: session_db });

        // Create audit log
        await AuditLog.create([{
          userId: new mongoose.Types.ObjectId(userId),
          action: 'deposit.create',
          entity: 'Transaction',
          entityId: transaction[0]._id.toString(),
          changes: [{
            field: 'status',
            oldValue: null,
            newValue: initialStatus
          }],
          ipAddress: clientIP,
          userAgent,
          status: 'Success',
          severity: amount >= 10000 ? 'High' : 'Medium'
        }], { session: session_db });

        // Generate payment instructions
        const paymentInstructions = generatePaymentInstructions(gateway, amount, currency, gatewayData);

        // Get processing time estimate
        const processingTime = TransactionUtils.getProcessingTime(gateway, undefined, gatewayData?.urgentProcessing);

        // Generate warnings
        const warnings: string[] = [];
        if (riskScore > 50) {
          warnings.push('This transaction may require additional verification');
        }
        if (gatewayData?.urgentProcessing) {
          warnings.push('Urgent processing fee applied');
        }
        if (amount > user.balance * 2) {
          warnings.push('Large deposit detected - may require verification');
        }

        // Next steps based on gateway
        const nextSteps: string[] = [];
        switch (gateway) {
          case 'CoinGate':
            nextSteps.push('Complete cryptocurrency payment');
            nextSteps.push('Wait for blockchain confirmations');
            nextSteps.push('Funds will be credited automatically');
            break;
          case 'UddoktaPay':
            nextSteps.push('Complete mobile banking payment');
            nextSteps.push('Save transaction reference');
            nextSteps.push('Funds will be credited within 1-3 hours');
            break;
          case 'Manual':
            nextSteps.push('Transfer funds to provided account');
            nextSteps.push('Upload proof of payment');
            nextSteps.push('Wait for admin verification');
            break;
        }

        const response: DepositResponse = {
          success: true,
          transactionId: transaction[0].transactionId,
          amount,
          currency,
          gateway,
          status: initialStatus,
          fees: {
            baseFee: feeCalculation.baseFee,
            percentageFee: feeCalculation.percentageFee,
            totalFee: feeCalculation.totalFee,
            ...(gatewayData?.urgentProcessing && { urgentFee: amount * 0.005 })
          },
          netAmount: feeCalculation.netAmount,
          estimatedProcessingTime: processingTime,
          paymentInstructions,
          nextSteps,
          warnings,
          trackingInfo: {
            referenceNumber: transaction[0].transactionId,
            statusCheckUrl: `/api/user/transactions/${transaction[0]._id}/status`,
            estimatedCompletion: new Date(Date.now() + (processingTime.includes('hour') ? 6 * 60 * 60 * 1000 : 30 * 60 * 1000))
          }
        };

        // Send notification email (async, don't wait)
        sendEmail({
          to: user.email,
          subject: 'Deposit Request Received',
          templateId: 'deposit_created',
          variables: {
            userName: user.name,
            amount,
            currency,
            transactionId: transaction[0].transactionId,
            gateway,
            estimatedTime: processingTime
          }
        }).catch(err => console.error('Email error:', err));

        return apiHandler.success(response, 'Deposit request created successfully');
      });

    } finally {
      await session_db.endSession();
    }

    // If the transaction completes without returning, return a generic success response (should not happen)
    return apiHandler.internalError('Deposit request did not complete as expected');
  } catch (error) {
    console.error('Deposit API Error:', error);
    return apiHandler.internalError('Failed to create deposit request');
  }
}

export const POST = withErrorHandler(createMobileDepositHandler);