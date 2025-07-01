// app/api/user/wallet/limits/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/config/auth';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Transaction } from '@/models/Transaction';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import { TRANSACTION_LIMITS } from '@/lib/constants';
import mongoose from 'mongoose';

export interface TransactionLimitsResponse {
  deposits: {
    minimum: number;
    maximum: number;
    daily: {
      limit: number;
      used: number;
      remaining: number;
      resetTime: Date;
    };
    monthly: {
      limit: number;
      used: number;
      remaining: number;
      resetTime: Date;
    };
    currentBalance: number;
  };
  withdrawals: {
    minimum: number;
    maximum: number;
    daily: {
      limit: number;
      used: number;
      remaining: number;
      resetTime: Date;
    };
    monthly: {
      limit: number;
      used: number;
      remaining: number;
      resetTime: Date;
    };
    availableBalance: number;
  };
  fees: {
    deposit: {
      bank_transfer: { percentage: number; minimum: number };
      mobile_banking: { percentage: number; minimum: number };
      crypto: { percentage: number; minimum: number };
      manual: { percentage: number; minimum: number };
    };
    withdrawal: {
      bank_transfer: { percentage: number; minimum: number };
      mobile_banking: { percentage: number; minimum: number };
      crypto_wallet: { percentage: number; minimum: number };
      check: { percentage: number; minimum: number };
    };
    urgent_processing: { percentage: number };
  };
  planInfo: {
    id: string;
    name: string;
    upgradeOptions: boolean;
    nextTierBenefits?: string[];
  };
  restrictions: {
    kycRequired: boolean;
    emailVerificationRequired: boolean;
    phoneVerificationRequired: boolean;
    accountLocked: boolean;
    reasonsForRestriction: string[];
  };
  riskProfile: {
    level: 'low' | 'medium' | 'high';
    factors: string[];
    additionalVerificationRequired: boolean;
  };
}

// GET /api/user/wallet/limits - Get comprehensive transaction limits
async function getWalletLimitsHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  try {
    await connectToDatabase();

    // Check authentication
    const session = await getServerSession(authConfig);
    if (!session?.user || session.user.userType !== 'user') {
      return apiHandler.unauthorized('User authentication required');
    }

    const userId = session.user.id;

    // Get user with plan details
    const user = await User.findById(userId)
      .populate({
        path: 'planId',
        select: 'name type depositLimit withdrawalLimit minimumDeposit minimumWithdrawal dailyDepositLimit dailyWithdrawalLimit monthlyDepositLimit monthlyWithdrawalLimit'
      })
      .select('balance status kycStatus emailVerified phoneVerified lockedUntil createdAt');

    if (!user) {
      return apiHandler.notFound('User not found');
    }

    const plan = user.planId as any;

    // Calculate time periods
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // Get usage for current period
    const [dailyUsage, monthlyUsage] = await Promise.all([
      // Daily usage
      Transaction.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            status: { $in: ['Pending', 'Approved', 'Processing'] },
            createdAt: { $gte: startOfDay, $lt: endOfDay }
          }
        },
        {
          $group: {
            _id: '$type',
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]),

      // Monthly usage
      Transaction.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            status: { $in: ['Pending', 'Approved', 'Processing'] },
            createdAt: { $gte: startOfMonth, $lt: endOfMonth }
          }
        },
        {
          $group: {
            _id: '$type',
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    // Process usage data
    const dailyDepositUsed = dailyUsage.find(u => u._id === 'deposit')?.totalAmount || 0;
    const dailyWithdrawalUsed = dailyUsage.find(u => u._id === 'withdrawal')?.totalAmount || 0;
    const monthlyDepositUsed = monthlyUsage.find(u => u._id === 'deposit')?.totalAmount || 0;
    const monthlyWithdrawalUsed = monthlyUsage.find(u => u._id === 'withdrawal')?.totalAmount || 0;

    // Get plan limits or use defaults
    const depositLimits = {
      minimum: plan?.minimumDeposit || TRANSACTION_LIMITS.MIN_DEPOSIT,
      maximum: plan?.depositLimit || 100000,
      dailyLimit: plan?.dailyDepositLimit || plan?.depositLimit || 50000,
      monthlyLimit: plan?.monthlyDepositLimit || (plan?.depositLimit * 30) || 500000
    };

    const withdrawalLimits = {
      minimum: plan?.minimumWithdrawal || TRANSACTION_LIMITS.MIN_WITHDRAWAL,
      maximum: Math.min(plan?.withdrawalLimit || 50000, user.balance),
      dailyLimit: plan?.dailyWithdrawalLimit || plan?.withdrawalLimit || TRANSACTION_LIMITS.MAX_DAILY_WITHDRAWAL,
      monthlyLimit: plan?.monthlyWithdrawalLimit || (plan?.withdrawalLimit * 30) || TRANSACTION_LIMITS.MAX_MONTHLY_WITHDRAWAL
    };

    // Account restrictions
    const isActive = user.status === 'Active';
    const kycVerified = user.kycStatus === 'Approved';
    const emailVerified = user.emailVerified;
    const phoneVerified = user.phoneVerified;
    const isLocked = user.lockedUntil && user.lockedUntil > new Date();

    const restrictionReasons: string[] = [];
    if (!isActive) restrictionReasons.push('Account is inactive');
    if (!kycVerified) restrictionReasons.push('KYC verification pending');
    if (!emailVerified) restrictionReasons.push('Email verification required');
    if (!phoneVerified) restrictionReasons.push('Phone verification required');
    if (isLocked) restrictionReasons.push('Account temporarily locked');

    // Risk assessment
    const userAge = Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    const riskFactors: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' = 'low';

    if (!kycVerified) {
      riskFactors.push('KYC not verified');
      riskLevel = 'high';
    }
    if (userAge < 7) {
      riskFactors.push('New account');
      riskLevel = riskLevel === 'high' ? 'high' : 'medium';
    }
    if (user.balance > 100000) {
      riskFactors.push('High balance account');
      riskLevel = riskLevel === 'high' ? 'high' : 'medium';
    }

    const response: TransactionLimitsResponse = {
      deposits: {
        minimum: depositLimits.minimum,
        maximum: depositLimits.maximum,
        daily: {
          limit: depositLimits.dailyLimit,
          used: dailyDepositUsed,
          remaining: Math.max(0, depositLimits.dailyLimit - dailyDepositUsed),
          resetTime: endOfDay
        },
        monthly: {
          limit: depositLimits.monthlyLimit,
          used: monthlyDepositUsed,
          remaining: Math.max(0, depositLimits.monthlyLimit - monthlyDepositUsed),
          resetTime: endOfMonth
        },
        currentBalance: user.balance
      },
      withdrawals: {
        minimum: withdrawalLimits.minimum,
        maximum: withdrawalLimits.maximum,
        daily: {
          limit: withdrawalLimits.dailyLimit,
          used: dailyWithdrawalUsed,
          remaining: Math.max(0, Math.min(
            withdrawalLimits.dailyLimit - dailyWithdrawalUsed,
            user.balance
          )),
          resetTime: endOfDay
        },
        monthly: {
          limit: withdrawalLimits.monthlyLimit,
          used: monthlyWithdrawalUsed,
          remaining: Math.max(0, Math.min(
            withdrawalLimits.monthlyLimit - monthlyWithdrawalUsed,
            user.balance
          )),
          resetTime: endOfMonth
        },
        availableBalance: user.balance
      },
      fees: {
        deposit: {
          bank_transfer: { percentage: 1.5, minimum: 5 },
          mobile_banking: { percentage: 1.0, minimum: 2 },
          crypto: { percentage: 0.5, minimum: 1 },
          manual: { percentage: 0, minimum: 0 }
        },
        withdrawal: {
          bank_transfer: { percentage: 2.0, minimum: 5 },
          mobile_banking: { percentage: 1.5, minimum: 3 },
          crypto_wallet: { percentage: 1.0, minimum: 2 },
          check: { percentage: 0, minimum: 10 }
        },
        urgent_processing: { percentage: 0.5 }
      },
      planInfo: {
        id: plan?._id?.toString() || '',
        name: plan?.name || 'Free Plan',
        upgradeOptions: !plan || plan.name === 'Free',
        nextTierBenefits: plan?.name === 'Free' ? [
          'Higher transaction limits',
          'Lower fees',
          'Priority support',
          'Advanced features'
        ] : undefined
      },
      restrictions: {
        kycRequired: !kycVerified,
        emailVerificationRequired: !emailVerified,
        phoneVerificationRequired: !phoneVerified,
        accountLocked: !!isLocked,
        reasonsForRestriction: restrictionReasons
      },
      riskProfile: {
        level: riskLevel,
        factors: riskFactors,
        additionalVerificationRequired: riskLevel === 'high'
      }
    };

    return apiHandler.success(response, 'Transaction limits retrieved successfully');

  } catch (error) {
    console.error('Wallet Limits API Error:', error);
    return apiHandler.internalError('Failed to retrieve wallet limits');
  }
}

export const GET = withErrorHandler(getWalletLimitsHandler);