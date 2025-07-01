// app/api/user/balance/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/config/auth';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Transaction } from '@/models/Transaction';
import { Plan } from '@/models/Plan';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import mongoose from 'mongoose';

export interface BalanceResponse {
  balance: number;
  currency: string;
  lastUpdated: Date;
  balanceBreakdown: {
    deposits: number;
    withdrawals: number;
    bonuses: number;
    profits: number;
    penalties: number;
  };
  pendingTransactions: {
    deposits: number;
    withdrawals: number;
    count: number;
  };
  planDetails: {
    id: string;
    name: string;
    type: string;
    limits: {
      depositLimit: number;
      withdrawalLimit: number;
      minimumDeposit: number;
      minimumWithdrawal: number;
    };
  } | null;
  accountStatus: {
    isActive: boolean;
    kycVerified: boolean;
    emailVerified: boolean;
    phoneVerified: boolean;
    canDeposit: boolean;
    canWithdraw: boolean;
    restrictions: string[];
  };
  recentActivity: {
    lastDeposit: Date | null;
    lastWithdrawal: Date | null;
    transactionCount7Days: number;
  };
}

// GET /api/user/balance - Get current user balance with detailed information
async function getUserBalanceHandler(request: NextRequest): Promise<NextResponse> {
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

    // Parallel queries for better performance
    const [balanceBreakdown, pendingTransactions, recentActivity] = await Promise.all([
      // Balance breakdown by transaction types
      Transaction.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId), status: 'Approved' } },
        {
          $group: {
            _id: '$type',
            totalAmount: {
              $sum: {
                $cond: [
                  { $in: ['$type', ['deposit', 'bonus', 'profit']] },
                  '$netAmount',
                  { $multiply: ['$netAmount', -1] } // Negative for withdrawals and penalties
                ]
              }
            }
          }
        }
      ]),

      // Pending transactions summary
      Transaction.aggregate([
        { 
          $match: { 
            userId: new mongoose.Types.ObjectId(userId), 
            status: { $in: ['Pending', 'Processing'] }
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

      // Recent activity summary
      Transaction.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId) } },
        {
          $facet: {
            lastDeposit: [
              { $match: { type: 'deposit', status: 'Approved' } },
              { $sort: { createdAt: -1 } },
              { $limit: 1 },
              { $project: { createdAt: 1 } }
            ],
            lastWithdrawal: [
              { $match: { type: 'withdrawal', status: 'Approved' } },
              { $sort: { createdAt: -1 } },
              { $limit: 1 },
              { $project: { createdAt: 1 } }
            ],
            recent7Days: [
              {
                $match: {
                  createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
                }
              },
              { $count: 'total' }
            ]
          }
        }
      ])
    ]);

    // Process balance breakdown
    const breakdown = {
      deposits: 0,
      withdrawals: 0,
      bonuses: 0,
      profits: 0,
      penalties: 0
    };

    balanceBreakdown.forEach((item: any) => {
      const type = item._id;
      const amount = Math.abs(item.totalAmount);
      
      switch (type) {
        case 'deposit':
          breakdown.deposits = amount;
          break;
        case 'withdrawal':
          breakdown.withdrawals = amount;
          break;
        case 'bonus':
          breakdown.bonuses = amount;
          break;
        case 'profit':
          breakdown.profits = amount;
          break;
        case 'penalty':
          breakdown.penalties = amount;
          break;
      }
    });

    // Process pending transactions
    const pending = {
      deposits: 0,
      withdrawals: 0,
      count: 0
    };

    pendingTransactions.forEach((item: any) => {
      const type = item._id;
      const amount = item.totalAmount;
      const count = item.count;

      if (type === 'deposit') {
        pending.deposits = amount;
      } else if (type === 'withdrawal') {
        pending.withdrawals = amount;
      }
      pending.count += count;
    });

    // Process recent activity
    const activity = recentActivity[0];
    const lastDeposit = activity.lastDeposit[0]?.createdAt || null;
    const lastWithdrawal = activity.lastWithdrawal[0]?.createdAt || null;
    const transactionCount7Days = activity.recent7Days[0]?.total || 0;

    // Account status checks
    const isActive = user.status === 'Active';
    const kycVerified = user.kycStatus === 'Approved';
    const emailVerified = user.emailVerified;
    const phoneVerified = user.phoneVerified;
    const isLocked = user.lockedUntil && user.lockedUntil > new Date();

    const restrictions: string[] = [];
    if (!isActive) restrictions.push('Account is inactive');
    if (!kycVerified) restrictions.push('KYC verification required');
    if (!emailVerified) restrictions.push('Email verification required');
    if (!phoneVerified) restrictions.push('Phone verification required');
    if (isLocked) restrictions.push('Account is temporarily locked');

    const canDeposit = isActive && emailVerified;
    const canWithdraw = isActive && emailVerified && phoneVerified && kycVerified && !isLocked;

    // Plan details
    const plan = user.planId as any;
    const planDetails = plan ? {
      id: plan._id.toString(),
      name: plan.name,
      type: plan.type || 'Standard',
      limits: {
        depositLimit: plan.depositLimit,
        withdrawalLimit: plan.withdrawalLimit,
        minimumDeposit: plan.minimumDeposit,
        minimumWithdrawal: plan.minimumWithdrawal,
        dailyDepositLimit: plan.dailyDepositLimit,
        dailyWithdrawalLimit: plan.dailyWithdrawalLimit,
        monthlyDepositLimit: plan.monthlyDepositLimit,
        monthlyWithdrawalLimit: plan.monthlyWithdrawalLimit
      }
    } : null;

    const response: BalanceResponse = {
      balance: user.balance,
      currency: 'BDT', // Default currency, can be made dynamic
      lastUpdated: new Date(),
      balanceBreakdown: breakdown,
      pendingTransactions: pending,
      planDetails,
      accountStatus: {
        isActive,
        kycVerified,
        emailVerified,
        phoneVerified,
        canDeposit,
        canWithdraw,
        restrictions
      },
      recentActivity: {
        lastDeposit,
        lastWithdrawal,
        transactionCount7Days
      }
    };

    return apiHandler.success(response, 'Balance retrieved successfully');

  } catch (error) {
    console.error('Balance API Error:', error);
    return apiHandler.internalError('Failed to retrieve balance');
  }
}

export const GET = withErrorHandler(getUserBalanceHandler);