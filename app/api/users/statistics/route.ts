// app/api/user/statistics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/config/auth';
import { z } from 'zod';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Transaction } from '@/models/Transaction';
import { Loan } from '@/models/Loan';
import { Referral } from '@/models/Referral';
import { TaskSubmission } from '@/models/TaskSubmission';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import { getUserFromRequest } from '@/lib/auth-helper';

// Statistics query validation schema
const statisticsQuerySchema = z.object({
  period: z.enum(['7d', '30d', '90d', '1y', 'all']).optional().default('30d'),
  category: z.enum(['financial', 'referrals', 'tasks', 'loans', 'overview']).optional().default('overview')
});

// GET /api/user/statistics - Get user statistics
async function getUserStatisticsHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  try {
    await connectToDatabase();

    // Check authentication
  const authResult = await getUserFromRequest(request);
     if (!authResult) {
       return apiHandler.unauthorized('Authentication required');
     }

    const userId = authResult.userId;
    const { searchParams } = new URL(request.url);
    
    const validationResult = statisticsQuerySchema.safeParse({
      period: searchParams.get('period'),
      category: searchParams.get('category')
    });

    if (!validationResult.success) {
      return apiHandler.validationError(
        validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      );
    }

    const { period, category } = validationResult.data;

    // Get user with plan information
    const user = await User.findById(userId)
      .populate('planId', 'name type dailyProfit monthlyProfit')
      .select('name email createdAt planId balance');

    if (!user) {
      return apiHandler.notFound('User not found');
    }

    if (user.status !== 'Active') {
      return apiHandler.forbidden(`Account is ${user.status.toLowerCase()}`);
    }

    // Calculate date range
    const dateRange = calculateDateRange(period);
    const allTimeFilter = {}; // For all-time stats
    const periodFilter = dateRange ? { createdAt: { $gte: dateRange } } : {};

    // Parallel aggregations based on category
    let statistics: { [key: string]: any } = {};

    if (category === 'overview' || category === 'financial') {
      const [transactionStats, monthlyTransactions] = await Promise.all([
        // Overall transaction statistics
        Transaction.aggregate([
          { $match: { userId, ...allTimeFilter } },
          {
            $facet: {
              allTime: [
                {
                  $group: {
                    _id: null,
                    totalDeposits: {
                      $sum: {
                        $cond: [
                          { $and: [{ $eq: ['$type', 'Deposit'] }, { $eq: ['$status', 'Approved'] }] },
                          '$amount',
                          0
                        ]
                      }
                    },
                    totalWithdrawals: {
                      $sum: {
                        $cond: [
                          { $and: [{ $eq: ['$type', 'Withdrawal'] }, { $eq: ['$status', 'Approved'] }] },
                          '$amount',
                          0
                        ]
                      }
                    },
                    pendingWithdrawals: {
                      $sum: {
                        $cond: [
                          { $and: [{ $eq: ['$type', 'Withdrawal'] }, { $eq: ['$status', 'Pending'] }] },
                          '$amount',
                          0
                        ]
                      }
                    },
                    totalTransactions: { $sum: 1 },
                    avgTransactionAmount: { $avg: '$amount' },
                    firstTransactionDate: { $min: '$createdAt' },
                    lastTransactionDate: { $max: '$createdAt' }
                  }
                }
              ],
              period: [
                { $match: periodFilter },
                {
                  $group: {
                    _id: null,
                    periodDeposits: {
                      $sum: {
                        $cond: [
                          { $and: [{ $eq: ['$type', 'Deposit'] }, { $eq: ['$status', 'Approved'] }] },
                          '$amount',
                          0
                        ]
                      }
                    },
                    periodWithdrawals: {
                      $sum: {
                        $cond: [
                          { $and: [{ $eq: ['$type', 'Withdrawal'] }, { $eq: ['$status', 'Approved'] }] },
                          '$amount',
                          0
                        ]
                      }
                    },
                    periodTransactions: { $sum: 1 }
                  }
                }
              ]
            }
          }
        ]),

        // Monthly transaction breakdown (last 12 months)
        Transaction.aggregate([
          {
            $match: {
              userId,
              createdAt: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) } // Last year
            }
          },
          {
            $group: {
              _id: {
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' },
                type: '$type',
                status: '$status'
              },
              amount: { $sum: '$amount' },
              count: { $sum: 1 }
            }
          },
          { $sort: { '_id.year': 1, '_id.month': 1 } }
        ])
      ]);

      statistics.financial = {
        allTime: transactionStats[0]?.allTime[0] || {},
        period: transactionStats[0]?.period[0] || {},
        monthlyBreakdown: formatMonthlyData(monthlyTransactions),
        profitCalculation: calculateProfitStats(user, transactionStats[0]?.allTime[0])
      };
    }

    if (category === 'overview' || category === 'referrals') {
      const [referralStats, referralTrends] = await Promise.all([
        // Referral statistics
        Referral.aggregate([
          { $match: { referrerId: userId, ...allTimeFilter } },
          {
            $facet: {
              allTime: [
                {
                  $group: {
                    _id: null,
                    totalReferrals: { $sum: 1 },
                    paidReferrals: {
                      $sum: { $cond: [{ $eq: ['$status', 'Paid'] }, 1, 0] }
                    },
                    pendingReferrals: {
                      $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] }
                    },
                    totalEarnings: {
                      $sum: {
                        $cond: [
                          { $eq: ['$status', 'Paid'] },
                          { $add: ['$bonusAmount', '$profitBonus'] },
                          0
                        ]
                      }
                    },
                    pendingEarnings: {
                      $sum: {
                        $cond: [
                          { $eq: ['$status', 'Pending'] },
                          { $add: ['$bonusAmount', '$profitBonus'] },
                          0
                        ]
                      }
                    },
                    avgReferralBonus: { $avg: { $add: ['$bonusAmount', '$profitBonus'] } },
                    firstReferralDate: { $min: '$createdAt' },
                    lastReferralDate: { $max: '$createdAt' }
                  }
                }
              ],
              period: [
                { $match: periodFilter },
                {
                  $group: {
                    _id: null,
                    periodReferrals: { $sum: 1 },
                    periodEarnings: {
                      $sum: {
                        $cond: [
                          { $eq: ['$status', 'Paid'] },
                          { $add: ['$bonusAmount', '$profitBonus'] },
                          0
                        ]
                      }
                    }
                  }
                }
              ]
            }
          }
        ]),

        // Monthly referral trends
        Referral.aggregate([
          {
            $match: {
              referrerId: userId,
              createdAt: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) }
            }
          },
          {
            $group: {
              _id: {
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' }
              },
              referrals: { $sum: 1 },
              earnings: {
                $sum: {
                  $cond: [
                    { $eq: ['$status', 'Paid'] },
                    { $add: ['$bonusAmount', '$profitBonus'] },
                    0
                  ]
                }
              }
            }
          },
          { $sort: { '_id.year': 1, '_id.month': 1 } }
        ])
      ]);

      statistics.referrals = {
        allTime: referralStats[0]?.allTime[0] || {},
        period: referralStats[0]?.period[0] || {},
        monthlyTrends: formatReferralTrends(referralTrends),
        performance: calculateReferralPerformance(referralStats[0]?.allTime[0])
      };
    }

    if (category === 'overview' || category === 'tasks') {
      const [taskStats, taskCategories] = await Promise.all([
        // Task statistics
        TaskSubmission.aggregate([
          { $match: { userId, ...allTimeFilter } },
          {
            $facet: {
              allTime: [
                {
                  $group: {
                    _id: null,
                    totalSubmissions: { $sum: 1 },
                    approvedSubmissions: {
                      $sum: { $cond: [{ $eq: ['$status', 'Approved'] }, 1, 0] }
                    },
                    rejectedSubmissions: {
                      $sum: { $cond: [{ $eq: ['$status', 'Rejected'] }, 1, 0] }
                    },
                    pendingSubmissions: {
                      $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] }
                    },
                    totalEarnings: {
                      $sum: {
                        $cond: [{ $eq: ['$status', 'Approved'] }, '$rewardAmount', 0]
                      }
                    },
                    pendingEarnings: {
                      $sum: {
                        $cond: [{ $eq: ['$status', 'Pending'] }, '$rewardAmount', 0]
                      }
                    },
                    avgReward: { $avg: '$rewardAmount' },
                    firstSubmissionDate: { $min: '$createdAt' },
                    lastSubmissionDate: { $max: '$createdAt' }
                  }
                }
              ],
              period: [
                { $match: periodFilter },
                {
                  $group: {
                    _id: null,
                    periodSubmissions: { $sum: 1 },
                    periodEarnings: {
                      $sum: {
                        $cond: [{ $eq: ['$status', 'Approved'] }, '$rewardAmount', 0]
                      }
                    }
                  }
                }
              ]
            }
          }
        ]),

        // Task category performance
        TaskSubmission.aggregate([
          { $match: { userId } },
          {
            $lookup: {
              from: 'tasks',
              localField: 'taskId',
              foreignField: '_id',
              as: 'task'
            }
          },
          { $unwind: '$task' },
          {
            $group: {
              _id: '$task.category',
              submissions: { $sum: 1 },
              approved: {
                $sum: { $cond: [{ $eq: ['$status', 'Approved'] }, 1, 0] }
              },
              earnings: {
                $sum: {
                  $cond: [{ $eq: ['$status', 'Approved'] }, '$rewardAmount', 0]
                }
              },
              avgReward: { $avg: '$rewardAmount' }
            }
          },
          { $sort: { earnings: -1 } }
        ])
      ]);

      statistics.tasks = {
        allTime: taskStats[0]?.allTime[0] || {},
        period: taskStats[0]?.period[0] || {},
        categoryPerformance: taskCategories,
        efficiency: calculateTaskEfficiency(taskStats[0]?.allTime[0])
      };
    }

    if (category === 'overview' || category === 'loans') {
      const loanStats = await Loan.aggregate([
        { $match: { userId, ...allTimeFilter } },
        {
          $facet: {
            allTime: [
              {
                $group: {
                  _id: null,
                  totalLoans: { $sum: 1 },
                  approvedLoans: {
                    $sum: { $cond: [{ $eq: ['$status', 'Approved'] }, 1, 0] }
                  },
                  activeLoans: {
                    $sum: { $cond: [{ $eq: ['$status', 'Active'] }, 1, 0] }
                  },
                  completedLoans: {
                    $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] }
                  },
                  totalBorrowed: {
                    $sum: {
                      $cond: [{ $eq: ['$status', 'Approved'] }, '$amount', 0]
                    }
                  },
                  totalRepaid: { $sum: '$repaidAmount' },
                  avgLoanAmount: { $avg: '$amount' },
                  avgInterestRate: { $avg: '$interestRate' }
                }
              }
            ],
            period: [
              { $match: periodFilter },
              {
                $group: {
                  _id: null,
                  periodLoans: { $sum: 1 },
                  periodBorrowed: {
                    $sum: {
                      $cond: [{ $eq: ['$status', 'Approved'] }, '$amount', 0]
                    }
                  }
                }
              }
            ]
          }
        }
      ]);

      statistics.loans = {
        allTime: loanStats[0]?.allTime[0] || {},
        period: loanStats[0]?.period[0] || {},
        repaymentHealth: calculateRepaymentHealth(loanStats[0]?.allTime[0])
      };
    }

    // Account overview statistics
    const accountAge = Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    
    const overviewStats = {
      accountAge,
      memberSince: user.createdAt,
      currentBalance: user.balance,
      plan: {
        name: user.planId?.name || 'Unknown',
        type: user.planId?.type || 'unknown',
        dailyProfit: user.planId?.dailyProfit || 0,
        monthlyProfit: user.planId?.monthlyProfit || 0
      },
      period: {
        label: getPeriodLabel(period),
        days: getPeriodDays(period)
      }
    };

    // Combine all statistics
    const response = {
      overview: overviewStats,
      ...statistics,
      generatedAt: new Date().toISOString()
    };

    return apiHandler.success(response);

  } catch (error) {
    console.error('Get user statistics error:', error);
    return apiHandler.internalError('Failed to get user statistics');
  }
}

// Helper functions
function calculateDateRange(period: string): Date | null {
  const now = new Date();
  
  switch (period) {
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case '90d':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case '1y':
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    case 'all':
    default:
      return null;
  }
}

function formatMonthlyData(
  monthlyTransactions: any[]
): { month: string; deposits: number; withdrawals: number; net: number }[] {
  const last12Months: { month: string; deposits: number; withdrawals: number; net: number }[] = [];
  const now = new Date();
  
  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    
    const monthData = monthlyTransactions.filter(tx => 
      tx._id.year === year && tx._id.month === month
    );
    
    const deposits = monthData
      .filter(tx => tx._id.type === 'Deposit' && tx._id.status === 'Approved')
      .reduce((sum, tx) => sum + tx.amount, 0);
      
    const withdrawals = monthData
      .filter(tx => tx._id.type === 'Withdrawal' && tx._id.status === 'Approved')
      .reduce((sum, tx) => sum + tx.amount, 0);
    
    last12Months.push({
      month: `${year}-${month.toString().padStart(2, '0')}`,
      deposits,
      withdrawals,
      net: deposits - withdrawals
    });
  }
  
  return last12Months;
}

function formatReferralTrends(
  referralTrends: any[]
): { month: string; referrals: number; earnings: number }[] {
  const last12Months: { month: string; referrals: number; earnings: number }[] = [];
  const now = new Date();
  
  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    
    const monthData = referralTrends.find(ref => 
      ref._id.year === year && ref._id.month === month
    );
    
    last12Months.push({
      month: `${year}-${month.toString().padStart(2, '0')}`,
      referrals: monthData?.referrals || 0,
      earnings: monthData?.earnings || 0
    });
  }
  
  return last12Months;
}

function calculateProfitStats(user: any, transactionData: any): any {
  if (!transactionData || !user.planId) {
    return { estimatedDailyProfit: 0, estimatedMonthlyProfit: 0, projectedYearlyProfit: 0 };
  }

  const totalDeposits = transactionData.totalDeposits || 0;
  const dailyRate = user.planId.dailyProfit || 0;
  
  const estimatedDailyProfit = (totalDeposits * dailyRate) / 100;
  const estimatedMonthlyProfit = estimatedDailyProfit * 30;
  const projectedYearlyProfit = estimatedDailyProfit * 365;
  
  return {
    estimatedDailyProfit,
    estimatedMonthlyProfit,
    projectedYearlyProfit,
    profitRate: dailyRate
  };
}

function calculateReferralPerformance(referralData: any): any {
  if (!referralData) {
    return { conversionRate: 0, avgBonus: 0, efficiency: 'poor' };
  }

  const conversionRate = referralData.totalReferrals > 0 
    ? (referralData.paidReferrals / referralData.totalReferrals) * 100 
    : 0;
    
  const avgBonus = referralData.avgReferralBonus || 0;
  
  let efficiency = 'poor';
  if (conversionRate >= 80) efficiency = 'excellent';
  else if (conversionRate >= 60) efficiency = 'good';
  else if (conversionRate >= 40) efficiency = 'average';
  
  return { conversionRate, avgBonus, efficiency };
}

function calculateTaskEfficiency(taskData: any): any {
  if (!taskData) {
    return { approvalRate: 0, avgReward: 0, efficiency: 'poor' };
  }

  const approvalRate = taskData.totalSubmissions > 0 
    ? (taskData.approvedSubmissions / taskData.totalSubmissions) * 100 
    : 0;
    
  const avgReward = taskData.avgReward || 0;
  
  let efficiency = 'poor';
  if (approvalRate >= 90) efficiency = 'excellent';
  else if (approvalRate >= 75) efficiency = 'good';
  else if (approvalRate >= 60) efficiency = 'average';
  
  return { approvalRate, avgReward, efficiency };
}

function calculateRepaymentHealth(loanData: any): any {
  if (!loanData) {
    return { repaymentRate: 0, health: 'good' };
  }

  const repaymentRate = loanData.totalBorrowed > 0 
    ? (loanData.totalRepaid / loanData.totalBorrowed) * 100 
    : 0;
    
  let health = 'poor';
  if (repaymentRate >= 80) health = 'excellent';
  else if (repaymentRate >= 60) health = 'good';
  else if (repaymentRate >= 40) health = 'average';
  
  return { repaymentRate, health };
}

function getPeriodLabel(period: string): string {
  const labels = {
    '7d': 'Last 7 days',
    '30d': 'Last 30 days',
    '90d': 'Last 90 days',
    '1y': 'Last year',
    'all': 'All time'
  };
  return labels[period] || 'Last 30 days';
}

function getPeriodDays(period: string): number {
  const days = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
    '1y': 365,
    'all': 0
  };
  return days[period] || 30;
}

export const GET = withErrorHandler(getUserStatisticsHandler);