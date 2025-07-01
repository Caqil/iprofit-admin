// app/api/user/wallet/summary/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/config/auth';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Transaction } from '@/models/Transaction';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import mongoose from 'mongoose';

export interface WalletSummaryResponse {
  overview: {
    currentBalance: number;
    currency: string;
    totalDeposited: number;
    totalWithdrawn: number;
    totalBonuses: number;
    netProfit: number;
    accountAge: number; // days
  };
  statistics: {
    totalTransactions: number;
    successfulTransactions: number;
    pendingTransactions: number;
    rejectedTransactions: number;
    averageTransactionAmount: number;
    largestTransaction: number;
    smallestTransaction: number;
  };
  monthlyBreakdown: {
    month: string;
    deposits: number;
    withdrawals: number;
    bonuses: number;
    profits: number;
    netChange: number;
  }[];
  recentActivity: {
    last7Days: {
      transactionCount: number;
      totalAmount: number;
      types: { [key: string]: number };
    };
    last30Days: {
      transactionCount: number;
      totalAmount: number;
      types: { [key: string]: number };
    };
    lastTransaction: {
      id: string;
      type: string;
      amount: number;
      status: string;
      createdAt: Date;
    } | null;
  };
  performance: {
    depositSuccess: {
      rate: number;
      averageProcessingTime: number; // hours
    };
    withdrawalSuccess: {
      rate: number;
      averageProcessingTime: number; // hours
    };
    monthlyGrowth: number; // percentage
  };
  warnings: {
    level: 'none' | 'low' | 'medium' | 'high';
    messages: string[];
    suggestions: string[];
  };
  quickActions: {
    canDeposit: boolean;
    canWithdraw: boolean;
    nextRequiredAction: string | null;
    recommendedActions: string[];
  };
}

// GET /api/user/wallet/summary - Get comprehensive wallet summary
async function getWalletSummaryHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  try {
    await connectToDatabase();

    // Check authentication
    const session = await getServerSession(authConfig);
    if (!session?.user || session.user.userType !== 'user') {
      return apiHandler.unauthorized('User authentication required');
    }

    const userId = session.user.id;

    // Get user details
    const user = await User.findById(userId)
      .populate('planId', 'name')
      .select('balance status kycStatus emailVerified phoneVerified lockedUntil createdAt');

    if (!user) {
      return apiHandler.notFound('User not found');
    }

    // Time periods for analysis
    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const last6Months = new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000);

    // Complex aggregation queries
    const [
      transactionOverview,
      transactionStats,
      monthlyData,
      recentActivityData,
      performanceData
    ] = await Promise.all([
      // Transaction Overview
      Transaction.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId) } },
        {
          $group: {
            _id: '$type',
            totalAmount: { $sum: '$netAmount' },
            totalGross: { $sum: '$amount' },
            count: { $sum: 1 },
            approvedAmount: {
              $sum: {
                $cond: [{ $eq: ['$status', 'Approved'] }, '$netAmount', 0]
              }
            }
          }
        }
      ]),

      // Transaction Statistics
      Transaction.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId) } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
            avgAmount: { $avg: '$amount' },
            maxAmount: { $max: '$amount' },
            minAmount: { $min: '$amount' }
          }
        }
      ]),

      // Monthly breakdown (last 6 months)
      Transaction.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            createdAt: { $gte: last6Months },
            status: 'Approved'
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              type: '$type'
            },
            totalAmount: { $sum: '$netAmount' }
          }
        },
        {
          $group: {
            _id: {
              year: '$_id.year',
              month: '$_id.month'
            },
            transactions: {
              $push: {
                type: '$_id.type',
                amount: '$totalAmount'
              }
            }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]),

      // Recent Activity
      Transaction.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId) } },
        {
          $facet: {
            last7Days: [
              { $match: { createdAt: { $gte: last7Days } } },
              {
                $group: {
                  _id: '$type',
                  count: { $sum: 1 },
                  totalAmount: { $sum: '$amount' }
                }
              }
            ],
            last30Days: [
              { $match: { createdAt: { $gte: last30Days } } },
              {
                $group: {
                  _id: '$type',
                  count: { $sum: 1 },
                  totalAmount: { $sum: '$amount' }
                }
              }
            ],
            lastTransaction: [
              { $sort: { createdAt: -1 } },
              { $limit: 1 },
              {
                $project: {
                  _id: 1,
                  type: 1,
                  amount: 1,
                  status: 1,
                  createdAt: 1
                }
              }
            ]
          }
        }
      ]),

      // Performance metrics
      Transaction.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId) } },
        {
          $facet: {
            depositPerformance: [
              { $match: { type: 'deposit' } },
              {
                $group: {
                  _id: '$status',
                  count: { $sum: 1 },
                  avgProcessingTime: {
                    $avg: {
                      $cond: [
                        { $ne: ['$processedAt', null] },
                        {
                          $divide: [
                            { $subtract: ['$processedAt', '$createdAt'] },
                            1000 * 60 * 60 // Convert to hours
                          ]
                        },
                        null
                      ]
                    }
                  }
                }
              }
            ],
            withdrawalPerformance: [
              { $match: { type: 'withdrawal' } },
              {
                $group: {
                  _id: '$status',
                  count: { $sum: 1 },
                  avgProcessingTime: {
                    $avg: {
                      $cond: [
                        { $ne: ['$processedAt', null] },
                        {
                          $divide: [
                            { $subtract: ['$processedAt', '$createdAt'] },
                            1000 * 60 * 60
                          ]
                        },
                        null
                      ]
                    }
                  }
                }
              }
            ]
          }
        }
      ])
    ]);

    // Process overview data
    const overview = {
      currentBalance: user.balance,
      currency: 'BDT',
      totalDeposited: 0,
      totalWithdrawn: 0,
      totalBonuses: 0,
      netProfit: 0,
      accountAge: Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24))
    };

    transactionOverview.forEach((item: any) => {
      switch (item._id) {
        case 'deposit':
          overview.totalDeposited = item.approvedAmount;
          break;
        case 'withdrawal':
          overview.totalWithdrawn = Math.abs(item.approvedAmount);
          break;
        case 'bonus':
          overview.totalBonuses = item.approvedAmount;
          break;
        case 'profit':
          overview.netProfit = item.approvedAmount;
          break;
      }
    });

    // Process statistics
    const statistics = {
      totalTransactions: 0,
      successfulTransactions: 0,
      pendingTransactions: 0,
      rejectedTransactions: 0,
      averageTransactionAmount: 0,
      largestTransaction: 0,
      smallestTransaction: 0
    };

    let totalAmount = 0;
    transactionStats.forEach((item: any) => {
      statistics.totalTransactions += item.count;
      totalAmount += item.totalAmount;

      switch (item._id) {
        case 'Approved':
          statistics.successfulTransactions = item.count;
          break;
        case 'Pending':
        case 'Processing':
          statistics.pendingTransactions += item.count;
          break;
        case 'Rejected':
        case 'Failed':
          statistics.rejectedTransactions += item.count;
          break;
      }

      if (item.maxAmount > statistics.largestTransaction) {
        statistics.largestTransaction = item.maxAmount;
      }
      if (statistics.smallestTransaction === 0 || item.minAmount < statistics.smallestTransaction) {
        statistics.smallestTransaction = item.minAmount;
      }
    });

    statistics.averageTransactionAmount = statistics.totalTransactions > 0 
      ? totalAmount / statistics.totalTransactions 
      : 0;

    // Process monthly breakdown
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyBreakdown = monthlyData.map((month: any) => {
      const monthName = monthNames[month._id.month - 1];
      const year = month._id.year;
      
      let deposits = 0, withdrawals = 0, bonuses = 0, profits = 0;
      
      month.transactions.forEach((tx: any) => {
        switch (tx.type) {
          case 'deposit': deposits = tx.amount; break;
          case 'withdrawal': withdrawals = Math.abs(tx.amount); break;
          case 'bonus': bonuses = tx.amount; break;
          case 'profit': profits = tx.amount; break;
        }
      });

      return {
        month: `${monthName} ${year}`,
        deposits,
        withdrawals,
        bonuses,
        profits,
        netChange: deposits + bonuses + profits - withdrawals
      };
    });

    // Process recent activity
    const activityData = recentActivityData[0];
    const recentActivity = {
      last7Days: {
        transactionCount: 0,
        totalAmount: 0,
        types: {} as { [key: string]: number }
      },
      last30Days: {
        transactionCount: 0,
        totalAmount: 0,
        types: {} as { [key: string]: number }
      },
      lastTransaction: null as any
    };

    // Process 7-day activity
    activityData.last7Days.forEach((item: any) => {
      recentActivity.last7Days.transactionCount += item.count;
      recentActivity.last7Days.totalAmount += item.totalAmount;
      recentActivity.last7Days.types[item._id] = item.count;
    });

    // Process 30-day activity
    activityData.last30Days.forEach((item: any) => {
      recentActivity.last30Days.transactionCount += item.count;
      recentActivity.last30Days.totalAmount += item.totalAmount;
      recentActivity.last30Days.types[item._id] = item.count;
    });

    // Last transaction
    if (activityData.lastTransaction.length > 0) {
      const lastTx = activityData.lastTransaction[0];
      recentActivity.lastTransaction = {
        id: lastTx._id.toString(),
        type: lastTx.type,
        amount: lastTx.amount,
        status: lastTx.status,
        createdAt: lastTx.createdAt
      };
    }

    // Process performance data
    const performanceMetrics = performanceData[0];
    const performance = {
      depositSuccess: { rate: 0, averageProcessingTime: 0 },
      withdrawalSuccess: { rate: 0, averageProcessingTime: 0 },
      monthlyGrowth: 0
    };

    // Calculate deposit success rate
    const depositStats = performanceMetrics.depositPerformance;
    const totalDeposits = depositStats.reduce((sum: number, stat: any) => sum + stat.count, 0);
    const approvedDeposits = depositStats.find((stat: any) => stat._id === 'Approved')?.count || 0;
    performance.depositSuccess.rate = totalDeposits > 0 ? (approvedDeposits / totalDeposits) * 100 : 0;
    performance.depositSuccess.averageProcessingTime = depositStats.find((stat: any) => stat._id === 'Approved')?.avgProcessingTime || 0;

    // Calculate withdrawal success rate
    const withdrawalStats = performanceMetrics.withdrawalPerformance;
    const totalWithdrawals = withdrawalStats.reduce((sum: number, stat: any) => sum + stat.count, 0);
    const approvedWithdrawals = withdrawalStats.find((stat: any) => stat._id === 'Approved')?.count || 0;
    performance.withdrawalSuccess.rate = totalWithdrawals > 0 ? (approvedWithdrawals / totalWithdrawals) * 100 : 0;
    performance.withdrawalSuccess.averageProcessingTime = withdrawalStats.find((stat: any) => stat._id === 'Approved')?.avgProcessingTime || 0;

    // Calculate monthly growth
    if (monthlyBreakdown.length >= 2) {
      const thisMonth = monthlyBreakdown[monthlyBreakdown.length - 1]?.netChange || 0;
      const lastMonth = monthlyBreakdown[monthlyBreakdown.length - 2]?.netChange || 0;
      performance.monthlyGrowth = lastMonth !== 0 ? ((thisMonth - lastMonth) / Math.abs(lastMonth)) * 100 : 0;
    }

    // Generate warnings and suggestions
    const warnings = {
      level: 'none' as 'none' | 'low' | 'medium' | 'high',
      messages: [] as string[],
      suggestions: [] as string[]
    };

    if (!user.kycStatus || user.kycStatus !== 'Approved') {
      warnings.level = 'high';
      warnings.messages.push('KYC verification required');
      warnings.suggestions.push('Complete KYC verification to unlock full features');
    }

    if (!user.emailVerified) {
      warnings.level = 'medium';
      warnings.messages.push('Email not verified');
      warnings.suggestions.push('Verify your email address');
    }

    if (user.balance < 100) {
      warnings.level = warnings.level === 'high' ? 'high' : 'low';
      warnings.messages.push('Low balance');
      warnings.suggestions.push('Consider making a deposit to start earning');
    }

    if (performance.withdrawalSuccess.rate < 80 && totalWithdrawals > 5) {
      warnings.level = 'medium';
      warnings.messages.push('Low withdrawal success rate');
      warnings.suggestions.push('Ensure your withdrawal details are correct');
    }

    // Quick actions
    const quickActions = {
      canDeposit: user.status === 'Active' && user.emailVerified,
      canWithdraw: user.status === 'Active' && user.emailVerified && user.phoneVerified && user.kycStatus === 'Approved',
      nextRequiredAction: null as string | null,
      recommendedActions: [] as string[]
    };

    if (!user.emailVerified) {
      quickActions.nextRequiredAction = 'Verify email address';
    } else if (!user.phoneVerified) {
      quickActions.nextRequiredAction = 'Verify phone number';
    } else if (user.kycStatus !== 'Approved') {
      quickActions.nextRequiredAction = 'Complete KYC verification';
    }

    if (user.balance > 1000 && !quickActions.canWithdraw) {
      quickActions.recommendedActions.push('Complete verification to enable withdrawals');
    }
    if (user.balance < 500) {
      quickActions.recommendedActions.push('Make a deposit to start earning');
    }
    if (statistics.totalTransactions === 0) {
      quickActions.recommendedActions.push('Make your first transaction');
    }

    const response: WalletSummaryResponse = {
      overview,
      statistics,
      monthlyBreakdown,
      recentActivity,
      performance,
      warnings,
      quickActions
    };

    return apiHandler.success(response, 'Wallet summary retrieved successfully');

  } catch (error) {
    console.error('Wallet Summary API Error:', error);
    return apiHandler.internalError('Failed to retrieve wallet summary');
  }
}

export const GET = withErrorHandler(getWalletSummaryHandler);