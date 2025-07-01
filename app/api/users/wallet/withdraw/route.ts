// app/api/user/wallet/withdraw/route.ts
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

// Mobile withdrawal validation schema
const mobileWithdrawalSchema = z.object({
  amount: z.number().min(1, 'Amount must be greater than 0'),
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
    mobileProvider: z.enum(['bKash', 'Nagad', 'Rocket', 'Upay', 'SureCash']).optional(),
    mobileAccountName: z.string().optional(),
    
    // Crypto wallet
    walletAddress: z.string().optional(),
    walletType: z.enum(['Bitcoin', 'Ethereum', 'USDT', 'BUSD', 'BNB']).optional(),
    walletNetwork: z.enum(['BTC', 'ETH', 'TRC20', 'BEP20', 'BSC']).optional(),
    
    // Check
    mailingAddress: z.string().optional(),
    postalCode: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    
    // Common
    note: z.string().max(500).optional()
  }),
  
  // Additional fields
  reason: z.string().max(200).optional(),
  urgentWithdrawal: z.boolean().optional().default(false),
  
  // Security verification
  securityPin: z.string().min(4, 'Security PIN required').max(6),
  twoFactorCode: z.string().optional(),
  biometricVerification: z.boolean().optional().default(false),
  
  // User confirmation
  confirmWithdrawal: z.boolean().refine(val => val === true, 'Please confirm withdrawal'),
  acceptFees: z.boolean().refine(val => val === true, 'Please accept withdrawal fees'),
  
  // Schedule withdrawal (optional)
  scheduledFor: z.string().optional().transform(val => {
    if (!val) return undefined;
    const date = new Date(val);
    return isNaN(date.getTime()) ? undefined : date;
  })
});

export interface WithdrawalResponse {
  success: boolean;
  transactionId: string;
  amount: number;
  currency: string;
  withdrawalMethod: string;
  status: string;
  fees: {
    baseFee: number;
    percentageFee: number;
    totalFee: number;
    urgentFee?: number;
    networkFee?: number;
  };
  netAmount: number;
  estimatedProcessingTime: string;
  processingSteps: {
    step: string;
    description: string;
    estimatedTime: string;
    status: 'pending' | 'in_progress' | 'completed';
  }[];
  accountDetails: {
    method: string;
    maskedDetails: any;
    verificationRequired: boolean;
  };
  warnings: string[];
  restrictions: string[];
  trackingInfo: {
    referenceNumber: string;
    statusCheckUrl: string;
    estimatedCompletion: Date;
    canCancel: boolean;
    cancelDeadline?: Date;
  };
  balanceAfterWithdrawal: number;
}

// Validation helper functions
function validateAccountDetails(method: string, details: any): string[] {
  const errors: string[] = [];

  switch (method) {
    case 'bank_transfer':
      if (!details.bankName) errors.push('Bank name is required');
      if (!details.accountNumber) errors.push('Account number is required');
      if (!details.accountHolderName) errors.push('Account holder name is required');
      if (!details.routingNumber) errors.push('Routing number is required');
      
      // Validate account number format (simple check)
      if (details.accountNumber && !/^\d{8,20}$/.test(details.accountNumber.replace(/\s+/g, ''))) {
        errors.push('Invalid account number format');
      }
      break;

    case 'mobile_banking':
      if (!details.mobileNumber) errors.push('Mobile number is required');
      if (!details.mobileProvider) errors.push('Mobile provider is required');
      if (!details.mobileAccountName) errors.push('Account holder name is required');
      
      // Validate Bangladesh mobile number
      if (details.mobileNumber && !/^(\+88)?01[3-9]\d{8}$/.test(details.mobileNumber)) {
        errors.push('Invalid Bangladesh mobile number format');
      }
      break;

    case 'crypto_wallet':
      if (!details.walletAddress) errors.push('Wallet address is required');
      if (!details.walletType) errors.push('Wallet type is required');
      if (!details.walletNetwork) errors.push('Wallet network is required');
      
      // Basic wallet address validation
      if (details.walletAddress) {
        const address = details.walletAddress;
        if (details.walletType === 'Bitcoin' && !/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-z0-9]{39,59}$/.test(address)) {
          errors.push('Invalid Bitcoin wallet address');
        } else if (details.walletType === 'Ethereum' && !/^0x[a-fA-F0-9]{40}$/.test(address)) {
          errors.push('Invalid Ethereum wallet address');
        }
      }
      break;

    case 'check':
      if (!details.mailingAddress) errors.push('Mailing address is required');
      if (!details.city) errors.push('City is required');
      if (!details.postalCode) errors.push('Postal code is required');
      if (!details.country) errors.push('Country is required');
      break;
  }

  return errors;
}

function maskAccountDetails(method: string, details: any): any {
  switch (method) {
    case 'bank_transfer':
      return {
        bankName: details.bankName,
        accountNumber: details.accountNumber ? 
          `****${details.accountNumber.slice(-4)}` : '',
        accountHolderName: details.accountHolderName,
        bankBranch: details.bankBranch
      };

    case 'mobile_banking':
      return {
        mobileProvider: details.mobileProvider,
        mobileNumber: details.mobileNumber ? 
          `****${details.mobileNumber.slice(-4)}` : '',
        mobileAccountName: details.mobileAccountName
      };

    case 'crypto_wallet':
      return {
        walletType: details.walletType,
        walletNetwork: details.walletNetwork,
        walletAddress: details.walletAddress ? 
          `${details.walletAddress.slice(0, 6)}...${details.walletAddress.slice(-6)}` : ''
      };

    case 'check':
      return {
        city: details.city,
        country: details.country,
        maskedAddress: details.mailingAddress ? 
          `${details.mailingAddress.slice(0, 10)}...` : ''
      };

    default:
      return details;
  }
}

function generateProcessingSteps(method: string, amount: number, isUrgent: boolean): any[] {
  const baseSteps = [
    {
      step: 'verification',
      description: 'Account and transaction verification',
      estimatedTime: isUrgent ? '30 minutes' : '2-6 hours',
      status: 'pending' as const
    },
    {
      step: 'approval',
      description: 'Admin approval and compliance check',
      estimatedTime: isUrgent ? '1-2 hours' : '6-24 hours',
      status: 'pending' as const
    }
  ];

  const methodSteps: { [key: string]: any[] } = {
    bank_transfer: [
      ...baseSteps,
      {
        step: 'processing',
        description: 'Bank transfer initiation',
        estimatedTime: '1-2 hours',
        status: 'pending' as const
      },
      {
        step: 'completion',
        description: 'Funds credited to your account',
        estimatedTime: '24-48 hours',
        status: 'pending' as const
      }
    ],
    mobile_banking: [
      ...baseSteps,
      {
        step: 'processing',
        description: 'Mobile banking transfer',
        estimatedTime: '30 minutes - 2 hours',
        status: 'pending' as const
      },
      {
        step: 'completion',
        description: 'Funds credited to your mobile wallet',
        estimatedTime: '2-6 hours',
        status: 'pending' as const
      }
    ],
    crypto_wallet: [
      ...baseSteps,
      {
        step: 'processing',
        description: 'Blockchain transaction broadcast',
        estimatedTime: '15-30 minutes',
        status: 'pending' as const
      },
      {
        step: 'completion',
        description: 'Blockchain confirmation',
        estimatedTime: '30 minutes - 2 hours',
        status: 'pending' as const
      }
    ],
    check: [
      ...baseSteps,
      {
        step: 'processing',
        description: 'Check preparation and mailing',
        estimatedTime: '2-3 days',
        status: 'pending' as const
      },
      {
        step: 'completion',
        description: 'Check delivery',
        estimatedTime: '5-10 business days',
        status: 'pending' as const
      }
    ]
  };

  return methodSteps[method] || baseSteps;
}

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
      reason,
      urgentWithdrawal,
      securityPin,
      twoFactorCode,
      biometricVerification,
      scheduledFor
    } = validationResult.data;

    const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    // Get user with plan
    const user = await User.findById(userId).populate('planId');
    if (!user) {
      return apiHandler.notFound('User not found');
    }

    // Comprehensive account status checks
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

    // Validate account details
    const accountValidationErrors = validateAccountDetails(withdrawalMethod, accountDetails);
    if (accountValidationErrors.length > 0) {
      return apiHandler.validationError(
        accountValidationErrors.map(error => ({
          field: 'accountDetails',
          message: error,
          code: 'ACCOUNT_DETAILS_ERROR'
        }))
      );
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
    const totalDeduction = feeCalculation.totalFee;
    if (amount > user.balance) {
      return apiHandler.badRequest(`Insufficient balance including fees. Available: ${user.balance}, Required: ${amount + totalDeduction}`);
    }

    // Risk assessment
    const riskScore = TransactionUtils.calculateRiskScore(
      { amount }, // transaction object with amount
      user,
      existingTransactions
    );

    // Generate unique transaction ID
    const transactionId = TransactionUtils.generateTransactionId('withdrawal');

    // Determine initial status
    let initialStatus = 'Pending';
    if (riskScore > 80 || amount > 100000) {
      initialStatus = 'Pending'; // High risk - manual review required
    } else if (scheduledFor && scheduledFor > new Date()) {
      initialStatus = 'Scheduled';
    }

    // Start database transaction
    const session_db = await mongoose.startSession();
    
    try {
      const result = await session_db.withTransaction(async () => {
        // Create withdrawal transaction
        const transaction = await Transaction.create([{
          userId: new mongoose.Types.ObjectId(userId),
          type: 'withdrawal',
          amount,
          currency,
          gateway: 'Manual', // Withdrawals are manually processed
          status: initialStatus,
          transactionId,
          fees: feeCalculation.totalFee,
          netAmount: feeCalculation.netAmount,
          description: `Withdrawal via ${withdrawalMethod}${urgentWithdrawal ? ' (Urgent)' : ''}${reason ? ` - ${reason}` : ''}`,
          gatewayResponse: {
            withdrawalMethod,
            accountDetails,
            urgentWithdrawal,
            scheduledFor
          },
          metadata: {
            ipAddress: clientIP,
            userAgent,
            deviceId,
            withdrawalMethod,
            urgentWithdrawal: urgentWithdrawal || false,
            riskScore,
            securityVerification: {
              pin: 'PROVIDED',
              twoFactor: twoFactorCode ? 'PROVIDED' : 'NOT_PROVIDED',
              biometric: biometricVerification || false
            },
            reason,
            scheduledFor
          },
          balanceBefore: user.balance,
          balanceAfter: user.balance // Will be updated when approved
        }], { session: session_db });

        // Reserve balance for non-scheduled withdrawals
        if (initialStatus !== 'Scheduled') {
          await User.findByIdAndUpdate(
            userId,
            { 
              $inc: { 
                balance: 0, // Don't deduct yet, wait for approval
                // You might want to track reserved amounts separately
              }
            },
            { session: session_db }
          );
        }

        // Create audit log
        await AuditLog.create([{
          userId: new mongoose.Types.ObjectId(userId),
          action: 'withdrawal.create',
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
          severity: amount >= 50000 ? 'High' : riskScore > 70 ? 'Medium' : 'Low',
          metadata: {
            amount,
            withdrawalMethod,
            riskScore,
            urgentWithdrawal
          }
        }], { session: session_db });

        // Generate response data
        const processingSteps = generateProcessingSteps(withdrawalMethod, amount, urgentWithdrawal || false);
        const estimatedProcessingTime = TransactionUtils.getProcessingTime('Manual', withdrawalMethod, urgentWithdrawal);

        // Generate warnings and restrictions
        const warnings: string[] = [];
        const restrictions: string[] = [];

        if (riskScore > 60) {
          warnings.push('This withdrawal may require additional verification');
        }
        if (urgentWithdrawal) {
          warnings.push('Urgent processing fee has been applied');
        }
        if (amount > 50000) {
          warnings.push('Large withdrawal amounts may take longer to process');
          restrictions.push('Additional compliance checks required');
        }
        if (withdrawalMethod === 'crypto_wallet') {
          warnings.push('Cryptocurrency withdrawals are irreversible');
          restrictions.push('Ensure wallet address is correct');
        }

        // Calculate balance after withdrawal (estimated)
        const balanceAfterWithdrawal = user.balance - amount;

        const response: WithdrawalResponse = {
          success: true,
          transactionId: transaction[0].transactionId,
          amount,
          currency,
          withdrawalMethod,
          status: initialStatus,
          fees: {
            baseFee: feeCalculation.baseFee,
            percentageFee: feeCalculation.percentageFee - (urgentWithdrawal ? amount * 0.005 : 0),
            totalFee: feeCalculation.totalFee,
            ...(urgentWithdrawal && { urgentFee: amount * 0.005 }),
            ...(withdrawalMethod === 'crypto_wallet' && { networkFee: 10 })
          },
          netAmount: feeCalculation.netAmount,
          estimatedProcessingTime,
          processingSteps,
          accountDetails: {
            method: withdrawalMethod,
            maskedDetails: maskAccountDetails(withdrawalMethod, accountDetails),
            verificationRequired: riskScore > 70
          },
          warnings,
          restrictions,
          trackingInfo: {
            referenceNumber: transaction[0].transactionId,
            statusCheckUrl: `/api/user/transactions/${transaction[0]._id}/status`,
            estimatedCompletion: scheduledFor || new Date(Date.now() + (urgentWithdrawal ? 6 * 60 * 60 * 1000 : 48 * 60 * 60 * 1000)),
            canCancel: initialStatus === 'Pending' || initialStatus === 'Scheduled',
            ...(initialStatus === 'Pending' && { 
              cancelDeadline: new Date(Date.now() + 60 * 60 * 1000) // 1 hour to cancel
            })
          },
          balanceAfterWithdrawal
        };

        // Send notification email (async)
        sendEmail({
          to: user.email,
          subject: 'Withdrawal Request Received',
          templateId: 'withdrawal_created',
          variables: {
            userName: user.name,
            amount,
            currency,
            transactionId: transaction[0].transactionId,
            withdrawalMethod,
            estimatedTime: estimatedProcessingTime,
            canCancel: response.trackingInfo.canCancel
          }
        }).catch(err => console.error('Email error:', err));

        return response;
      });

      return apiHandler.success(result, 'Withdrawal request created successfully');

    } finally {
      await session_db.endSession();
    }

  } catch (error) {
    console.error('Withdrawal API Error:', error);
    return apiHandler.internalError('Failed to create withdrawal request');
  }
}

export const POST = withErrorHandler(createMobileWithdrawalHandler);