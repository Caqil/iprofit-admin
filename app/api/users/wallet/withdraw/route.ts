// app/api/user/wallet/withdraw/route.ts
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

// Mobile withdrawal validation schema
const mobileWithdrawalSchema = z.object({
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  currency: z.enum(['USD', 'BDT']).default('BDT'),
  withdrawalMethod: z.enum(['bank_transfer', 'mobile_banking', 'crypto_wallet', 'check']),
  deviceId: z.string().min(1, 'Device ID is required'),
  
  // Withdrawal account details
  accountDetails: z.object({
    // Bank transfer
    bankName: z.string().optional(),
    accountNumber: z.string().optional(),
    accountHolderName: z.string().optional(),
    routingNumber: z.string().optional(),
    swiftCode: z.string().optional(),
    bankBranch: z.string().optional(),
    
    // Mobile banking (bKash, Nagad, etc.)
    mobileNumber: z.string().optional(),
    mobileProvider: z.string().optional(), // bKash, Nagad, Rocket, Upay
    mobileAccountName: z.string().optional(),
    
    // Crypto wallet
    walletAddress: z.string().optional(),
    walletType: z.string().optional(), // Bitcoin, Ethereum, USDT, etc.
    walletNetwork: z.string().optional(), // BTC, ETH, TRC20, BEP20, etc.
    
    // Check
    mailingAddress: z.object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional(),
      zipCode: z.string().optional()
    }).optional(),
    
    // Common fields
    note: z.string().max(500).optional()
  }),

  // Processing options
  urgentWithdrawal: z.boolean().optional().default(false),
  reason: z.string().max(200).optional(),
  
  // Security confirmation
  confirmAmount: z.boolean().refine(val => val === true, 'Please confirm the withdrawal amount'),
  acceptFees: z.boolean().refine(val => val === true, 'You must accept the withdrawal fees'),
  authorizeWithdrawal: z.boolean().refine(val => val === true, 'You must authorize this withdrawal')
});

// POST /api/user/wallet/withdraw - Create mobile withdrawal
async function createMobileWithdrawalHandler(request: NextRequest): Promise<NextResponse> {
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
    const validationResult = mobileWithdrawalSchema.safeParse(body);

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
      withdrawalMethod, 
      deviceId, 
      accountDetails,
      urgentWithdrawal,
      reason
    } = validationResult.data;

    const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    // Get user with plan
    const user = await User.findById(userId).populate('planId');
    if (!user) {
      return apiHandler.notFound('User not found');
    }

    // Check account status and requirements
    if (user.status !== 'Active') {
      return apiHandler.forbidden(`Account is ${user.status.toLowerCase()}`);
    }

    if (!user.emailVerified) {
      return apiHandler.forbidden('Email verification required for withdrawals');
    }

    if (!user.phoneVerified) {
      return apiHandler.forbidden('Phone verification required for withdrawals');
    }

    if (user.kycStatus !== 'Approved') {
      return apiHandler.forbidden('KYC verification required for withdrawals');
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return apiHandler.forbidden('Account is temporarily locked');
    }

    // Check sufficient balance
    if (amount > user.balance) {
      return apiHandler.badRequest(`Insufficient balance. Available: ${user.balance}, Requested: ${amount}`);
    }

    // Get user's existing transactions for limit validation
    const existingTransactions = await Transaction.find({
      userId,
      type: 'withdrawal',
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
    });

    // Validate transaction limits
    const limitValidation = await TransactionUtils.validateTransactionLimits(
      user,
      amount,
      'withdrawal',
      existingTransactions
    );

    if (!limitValidation.isValid) {
      return apiHandler.badRequest(limitValidation.errors.join(', '));
    }

    // Calculate withdrawal fees
    const feeCalculation = TransactionUtils.calculateWithdrawalFees(
      amount,
      withdrawalMethod,
      urgentWithdrawal
    );

    // Check if user has enough balance after fees
    if (amount > user.balance) {
      return apiHandler.badRequest(`Insufficient balance including fees. Available: ${user.balance}, Required: ${amount}`);
    }

    // Validate withdrawal method specific data
    const accountValidation = validateAccountDetails(withdrawalMethod, accountDetails);
    if (!accountValidation.isValid) {
      return apiHandler.badRequest(accountValidation.error || 'Invalid account details');
    }

    // Generate unique transaction ID
    const transactionId = TransactionUtils.generateTransactionId('withdrawal');

    // Check for suspicious activity (basic fraud detection)
    const riskAssessment = await assessWithdrawalRisk(user, amount, withdrawalMethod, clientIP);

    // Create transaction record
    const transaction = await Transaction.create({
      userId,
      type: 'withdrawal',
      amount,
      currency,
      gateway: 'Manual', // All withdrawals are manual processing
      status: riskAssessment.riskLevel === 'high' ? 'Pending' : 'Pending', // Can be flagged for review
      description: `Mobile withdrawal via ${withdrawalMethod}`,
      transactionId,
      fees: feeCalculation.totalFee,
      netAmount: feeCalculation.netAmount,
      balanceBefore: user.balance,
      metadata: {
        ipAddress: clientIP,
        userAgent,
        deviceId,
        withdrawalMethod,
        accountDetails: sanitizeAccountDetails(accountDetails),
        mobileWithdrawal: true,
        urgentWithdrawal,
        reason,
        riskAssessment,
        feeBreakdown: {
          baseFee: feeCalculation.baseFee,
          percentageFee: feeCalculation.percentageFee,
          totalFee: feeCalculation.totalFee
        }
      }
    });

    // Reserve balance (don't deduct yet, wait for approval)
    // This could be implemented with a separate "reserved" field in user model

    // Log audit
    await AuditLog.create({
      adminId: null,
      action: 'MOBILE_WITHDRAWAL_REQUEST',
      entity: 'Transaction',
      entityId: transaction._id.toString(),
      oldData: { balance: user.balance },
      newData: {
        amount,
        currency,
        withdrawalMethod,
        transactionId,
        netAmount: feeCalculation.netAmount
      },
      status: 'Success',
      metadata: {
        userSelfAction: true,
        withdrawalMethod,
        urgentWithdrawal,
        riskLevel: riskAssessment.riskLevel
      },
      ipAddress: clientIP,
      userAgent,
      severity: riskAssessment.riskLevel === 'high' ? 'High' : 'Low'
    });

    // Send notification emails
    try {
      // User notification
      await sendEmail({
        to: user.email,
        subject: 'Withdrawal Request Submitted',
        templateId: 'withdrawal_requested',
        variables: {
          userName: user.name,
          amount: amount.toFixed(2),
          currency,
          transactionId,
          withdrawalMethod: getWithdrawalMethodName(withdrawalMethod),
          fees: feeCalculation.totalFee.toFixed(2),
          netAmount: feeCalculation.netAmount.toFixed(2),
          estimatedProcessingTime: getEstimatedWithdrawalTime(withdrawalMethod),
          trackingUrl: `${process.env.NEXTAUTH_URL}/user/transactions/${transaction._id}`,
          supportEmail: process.env.SUPPORT_EMAIL || 'support@iprofit.com'
        }
      });

      // Admin notification for high-risk or large amounts
      if (riskAssessment.riskLevel === 'high' || amount > 5000) {
        await sendEmail({
          to: process.env.ADMIN_EMAIL || 'admin@iprofit.com',
          subject: `High Priority Withdrawal Request - ${transactionId}`,
          templateId: 'withdrawal_admin_alert',
          variables: {
            userName: user.name,
            userEmail: user.email,
            amount: amount.toFixed(2),
            currency,
            transactionId,
            withdrawalMethod,
            riskLevel: riskAssessment.riskLevel,
            riskReasons: riskAssessment.reasons.join(', '),
            reviewUrl: `${process.env.NEXTAUTH_URL}/dashboard/transactions/${transaction._id}`
          }
        });
      }
    } catch (emailError) {
      console.error('Failed to send withdrawal notification emails:', emailError);
    }

    const response = {
      transaction: {
        id: transaction._id.toString(),
        transactionId,
        amount,
        currency,
        withdrawalMethod,
        fees: feeCalculation.totalFee,
        netAmount: feeCalculation.netAmount,
        status: 'Pending',
        createdAt: transaction.createdAt,
        estimatedProcessingTime: getEstimatedWithdrawalTime(withdrawalMethod)
      },
      
      feeBreakdown: {
        withdrawalAmount: amount,
        baseFee: feeCalculation.baseFee,
        percentageFee: feeCalculation.percentageFee,
        urgentFee: urgentWithdrawal ? amount * 0.005 : 0,
        totalFees: feeCalculation.totalFee,
        netWithdrawal: feeCalculation.netAmount
      },

      accountDetails: {
        method: withdrawalMethod,
        displayName: getAccountDisplayName(withdrawalMethod, accountDetails),
        lastFourDigits: getLastFourDigits(withdrawalMethod, accountDetails)
      },

      processingInfo: {
        estimatedTime: getEstimatedWithdrawalTime(withdrawalMethod),
        businessDaysOnly: withdrawalMethod !== 'crypto_wallet',
        priority: urgentWithdrawal ? 'urgent' : 'normal',
        riskLevel: riskAssessment.riskLevel
      },

      nextSteps: [
        'Your withdrawal request is under review',
        'You will receive email confirmation once approved',
        'Funds will be transferred to your specified account',
        `Expected processing: ${getEstimatedWithdrawalTime(withdrawalMethod)}`
      ],

      supportInfo: {
        trackingId: transactionId,
        supportEmail: process.env.SUPPORT_EMAIL || 'support@iprofit.com',
        helpUrl: `${process.env.NEXTAUTH_URL}/user/help/withdrawals`,
        canCancel: true,
        cancelDeadline: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
      },

      warnings: [
        ...limitValidation.warnings,
        ...(riskAssessment.riskLevel === 'high' ? ['This withdrawal may require additional verification'] : [])
      ]
    };

    return apiHandler.created(response, 'Withdrawal request created successfully');

  } catch (error) {
    console.error('Mobile withdrawal error:', error);
    return apiHandler.internalError('Failed to create withdrawal request');
  }
}

// Helper functions
function validateAccountDetails(method: string, details: any): { isValid: boolean; error?: string } {
  switch (method) {
    case 'bank_transfer':
      if (!details.bankName || !details.accountNumber || !details.accountHolderName) {
        return { isValid: false, error: 'Bank name, account number, and account holder name are required' };
      }
      break;

    case 'mobile_banking':
      if (!details.mobileNumber || !details.mobileProvider) {
        return { isValid: false, error: 'Mobile number and provider are required' };
      }
      
      const cleanMobile = details.mobileNumber.replace(/[^\d]/g, '');
      if (cleanMobile.length < 10 || cleanMobile.length > 15) {
        return { isValid: false, error: 'Invalid mobile number format' };
      }
      break;

    case 'crypto_wallet':
      if (!details.walletAddress || !details.walletType) {
        return { isValid: false, error: 'Wallet address and type are required' };
      }
      
      // Basic wallet address validation
      if (details.walletAddress.length < 20 || details.walletAddress.length > 100) {
        return { isValid: false, error: 'Invalid wallet address format' };
      }
      break;

    case 'check':
      if (!details.mailingAddress || !details.mailingAddress.street || !details.mailingAddress.city) {
        return { isValid: false, error: 'Complete mailing address is required for check delivery' };
      }
      break;

    default:
      return { isValid: false, error: 'Invalid withdrawal method' };
  }

  return { isValid: true };
}

async function assessWithdrawalRisk(user: any, amount: number, method: string, ip: string): Promise<{
  riskLevel: 'low' | 'medium' | 'high';
  reasons: string[];
  score: number;
}> {
  const reasons: string[] = [];
  let score = 0;

  // Large amount check
  if (amount > user.balance * 0.8) {
    score += 30;
    reasons.push('Large percentage of balance');
  }

  if (amount > 5000) {
    score += 20;
    reasons.push('High amount withdrawal');
  }

  // Account age check
  const accountAge = (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24);
  if (accountAge < 30) {
    score += 25;
    reasons.push('New account');
  }

  // Recent verification check
  if (!user.emailVerified || !user.phoneVerified) {
    score += 15;
    reasons.push('Incomplete verification');
  }

  // Multiple recent withdrawals
  const recentWithdrawals = await Transaction.countDocuments({
    userId: user._id,
    type: 'withdrawal',
    createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
  });

  if (recentWithdrawals > 2) {
    score += 20;
    reasons.push('Multiple recent withdrawals');
  }

  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  if (score >= 50) riskLevel = 'high';
  else if (score >= 25) riskLevel = 'medium';

  return { riskLevel, reasons, score };
}

function sanitizeAccountDetails(details: any): any {
  // Remove or mask sensitive information for storage
  const sanitized = { ...details };
  
  if (sanitized.accountNumber) {
    sanitized.accountNumber = maskAccountNumber(sanitized.accountNumber);
  }
  
  if (sanitized.walletAddress) {
    sanitized.walletAddress = maskWalletAddress(sanitized.walletAddress);
  }
  
  return sanitized;
}

function maskAccountNumber(accountNumber: string): string {
  if (accountNumber.length <= 4) return accountNumber;
  return '*'.repeat(accountNumber.length - 4) + accountNumber.slice(-4);
}

function maskWalletAddress(address: string): string {
  if (address.length <= 8) return address;
  return address.slice(0, 4) + '*'.repeat(address.length - 8) + address.slice(-4);
}

function getWithdrawalMethodName(method: string): string {
  const names = {
    bank_transfer: 'Bank Transfer',
    mobile_banking: 'Mobile Banking',
    crypto_wallet: 'Cryptocurrency Wallet',
    check: 'Check Payment'
  };
  return names[method as keyof typeof names] || method;
}

function getEstimatedWithdrawalTime(method: string): string {
  const times = {
    bank_transfer: '2-3 business days',
    mobile_banking: '1-2 business days',
    crypto_wallet: '30 minutes - 2 hours',
    check: '5-7 business days'
  };
  return times[method as keyof typeof times] || '3-5 business days';
}

function getAccountDisplayName(method: string, details: any): string {
  switch (method) {
    case 'bank_transfer':
      return `${details.bankName} - ${details.accountHolderName}`;
    case 'mobile_banking':
      return `${details.mobileProvider} - ${details.mobileNumber}`;
    case 'crypto_wallet':
      return `${details.walletType} Wallet`;
    case 'check':
      return `Check to ${details.mailingAddress?.street}`;
    default:
      return 'Unknown Account';
  }
}

function getLastFourDigits(method: string, details: any): string {
  switch (method) {
    case 'bank_transfer':
      return details.accountNumber ? details.accountNumber.slice(-4) : '';
    case 'mobile_banking':
      return details.mobileNumber ? details.mobileNumber.slice(-4) : '';
    case 'crypto_wallet':
      return details.walletAddress ? details.walletAddress.slice(-4) : '';
    case 'check':
      return details.mailingAddress?.zipCode || '';
    default:
      return '';
  }
}

export const POST = withErrorHandler(createMobileWithdrawalHandler);