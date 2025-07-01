// app/api/user/balance/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/config/auth';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Transaction } from '@/models/Transaction';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import mongoose from 'mongoose';

// GET /api/user/balance - Get current user balance
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
      .populate('planId', 'name type dailyProfit monthlyProfit')
      .select('balance status kycStatus emailVerified phoneVerified');

    if (!user) {
      return apiHandler.notFound('User not found');
    }

    if (user.status !== 'Active') {
      return apiHandler.forbidden(`Account is ${user.status.toLowerCase()}`);
    }

    // Get balance breakdown from transactions
    const [balanceBreakdown, pendingTransactions] = await Promise.all([
      // Balance breakdown by transaction types
      Transaction.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId) } },
        {
          $group: {
            _id: '$type',
            totalAmount: {
              $sum: {
                $cond: [
                  { $eq: ['$status', 'Approved'] },
                  '$amount',
                  0
                ]
              }
            },
            pendingAmount: {
              $sum: {
                $cond: [
                  { $in: ['$status', ['Pending', 'Processing']] },
                  '$amount',
                  0
                ]
              }
            },
            count: { $sum: 1 }
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
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' }
          }
        }
      ])
    ]);

    // Process balance breakdown
    const breakdown = {
      deposits: { approved: 0, pending: 0, count: 0 },
      withdrawals: { approved: 0, pending: 0, count: 0 },
      bonuses: { approved: 0, pending: 0, count: 0 },
      profits: { approved: 0, pending: 0, count: 0 },
      penalties: { approved: 0, pending: 0, count: 0 }
    };

    balanceBreakdown.forEach(item => {
      const type = item._id;
      if (type === 'deposit') {
        breakdown.deposits.approved = item.totalAmount;
        breakdown.deposits.pending = item.pendingAmount;
        breakdown.deposits.count = item.count;
      } else if (type === 'withdrawal') {
        breakdown.withdrawals.approved = item.totalAmount;
        breakdown.withdrawals.pending = item.pendingAmount;
        breakdown.withdrawals.count = item.count;
      } else if (type === 'bonus') {
        breakdown.bonuses.approved = item.totalAmount;
        breakdown.bonuses.pending = item.pendingAmount;
        breakdown.bonuses.count = item.count;
      } else if (type === 'profit') {
        breakdown.profits.approved = item.totalAmount;
        breakdown.profits.pending = item.pendingAmount;
        breakdown.profits.count = item.count;
      } else if (type === 'penalty') {
        breakdown.penalties.approved = item.totalAmount;
        breakdown.penalties.pending = item.pendingAmount;
        breakdown.penalties.count = item.count;
      }
    });

    // Calculate estimated balance
    const estimatedBalance = 
      breakdown.deposits.approved + 
      breakdown.bonuses.approved + 
      breakdown.profits.approved - 
      breakdown.withdrawals.approved - 
      breakdown.penalties.approved;

    // Calculate pending changes
    const pendingCredits = 
      breakdown.deposits.pending + 
      breakdown.bonuses.pending + 
      breakdown.profits.pending;

    const pendingDebits = 
      breakdown.withdrawals.pending + 
      breakdown.penalties.pending;

    // Get last transaction for reference
    const lastTransaction = await Transaction.findOne({ userId })
      .sort({ createdAt: -1 })
      .select('type amount status createdAt balanceAfter')
      .limit(1);

    // Calculate profit information based on plan
    const planProfitRate = user.planId?.dailyProfit || 0;
    const totalInvestments = breakdown.deposits.approved;
    const estimatedDailyProfit = (totalInvestments * planProfitRate) / 100;

    const response = {
      // Current balance
      currentBalance: user.balance,
      estimatedBalance,
      
      // Balance verification
      balanceStatus: Math.abs(user.balance - estimatedBalance) < 0.01 ? 'accurate' : 'discrepancy',
      lastVerified: new Date().toISOString(),

      // Breakdown by transaction types
      breakdown,

      // Pending transactions
      pending: {
        credits: {
          amount: pendingCredits,
          transactions: pendingTransactions.filter(t => ['deposit', 'bonus', 'profit'].includes(t._id))
        },
        debits: {
          amount: pendingDebits,
          transactions: pendingTransactions.filter(t => ['withdrawal', 'penalty'].includes(t._id))
        },
        netChange: pendingCredits - pendingDebits
      },

      // Profit information
      profitInfo: {
        dailyRate: planProfitRate,
        totalInvestments,
        estimatedDailyProfit,
        estimatedMonthlyProfit: estimatedDailyProfit * 30,
        totalProfitsEarned: breakdown.profits.approved
      },

      // Account status
      accountStatus: {
        canDeposit: user.emailVerified && user.status === 'Active',
        canWithdraw: user.emailVerified && user.phoneVerified && user.kycStatus === 'Approved' && user.status === 'Active',
        restrictions: getAccountRestrictions(user)
      },

      // Last transaction reference
      lastTransaction: lastTransaction ? {
        id: lastTransaction._id.toString(),
        type: lastTransaction.type,
        amount: lastTransaction.amount,
        status: lastTransaction.status,
        date: lastTransaction.createdAt,
        balanceAfter: lastTransaction.balanceAfter || null
      } : null,

      // Metadata
      currency: 'BDT', // Default currency
      lastUpdated: new Date().toISOString(),
      planName: user.planId?.name || 'Unknown'
    };

    return apiHandler.success(response);

  } catch (error) {
    console.error('Get user balance error:', error);
    return apiHandler.internalError('Failed to get balance information');
  }
}

// Helper function to get account restrictions
function getAccountRestrictions(user: any): string[] {
  const restrictions: string[] = [];

  if (!user.emailVerified) {
    restrictions.push('Email verification required for transactions');
  }

  if (!user.phoneVerified) {
    restrictions.push('Phone verification required for withdrawals');
  }

  if (user.kycStatus !== 'Approved') {
    restrictions.push('KYC verification required for withdrawals');
  }

  if (user.status !== 'Active') {
    restrictions.push(`Account is ${user.status.toLowerCase()}`);
  }

  return restrictions;
}

export const GET = withErrorHandler(getUserBalanceHandler);