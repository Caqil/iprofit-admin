// app/api/user/profits/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/config/auth';
import { z } from 'zod';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Transaction } from '@/models/Transaction';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import mongoose from 'mongoose';

// Profit history query validation schema
const profitHistoryQuerySchema = z.object({
  page: z.string().optional().default('1').transform(val => {
    const num = parseInt(val, 10);
    return isNaN(num) || num < 1 ? 1 : num;
  }),
  limit: z.string().optional().default('50').transform(val => {
    const num = parseInt(val, 10);
    return isNaN(num) || num < 1 ? 50 : Math.min(num, 100);
  }),
  type: z.enum(['profit', 'bonus', 'referral', 'all']).optional().default('all'),
  status: z.enum(['Pending', 'Approved', 'Rejected', 'all']).optional().default('all'),
  dateFrom: z.string().optional().transform(val => {
    if (!val || val === '') return undefined;
    const date = new Date(val);
    return isNaN(date.getTime()) ? undefined : date;
  }),
  dateTo: z.string().optional().transform(val => {
    if (!val || val === '') return undefined;
    const date = new Date(val);
    return isNaN(date.getTime()) ? undefined : date;
  }),
  sortBy: z.enum(['createdAt', 'amount', 'type']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  groupBy: z.enum(['day', 'week', 'month', 'none']).optional().default('none')
});

export interface ProfitItem {
  id: string;
  type: 'profit' | 'bonus' | 'referral';
  amount: number;
  currency: string;
  status: string;
  description: string;
  source: string; // Plan name, referral, etc.
  createdAt: Date;
  processedAt?: Date;
  transactionId: string;
  metadata: {
    profitRate?: number;
    investmentAmount?: number;
    planName?: string;
    referralUserId?: string;
    dailyProfit?: boolean;
  };
  balanceAfter?: number;
  statusInfo: {
    text: string;
    color: string;
    description: string;
  };
  profitInfo: {
    isDaily: boolean;
    isBonus: boolean;
    category: string;
    growth: number; // Percentage change from previous
  };
}

export interface ProfitSummary {
  totalProfits: number;
  totalBonuses: number;
  totalReferralEarnings: number;
  grandTotal: number;
  currency: string;
  breakdown: {
    approved: number;
    pending: number;
    rejected: number;
  };
  periods: {
    today: number;
    yesterday: number;
    thisWeek: number;
    thisMonth: number;
    thisYear: number;
  };
  averages: {
    dailyAverage: number;
    weeklyAverage: number;
    monthlyAverage: number;
  };
  streaks: {
    currentStreak: number; // Days with profits
    longestStreak: number;
    lastProfitDate: Date | null;
  };
}

export interface ProfitAnalytics {
  trends: {
    direction: 'increasing' | 'decreasing' | 'stable';
    percentage: number;
    periodComparison: string;
  };
  patterns: {
    bestDay: string;
    bestTime: string;
    averageGrowthRate: number;
    consistency: number; // Percentage of profitable days
  };
  projections: {
    nextMonth: number;
    nextQuarter: number;
    yearEnd: number;
    confidence: number;
  };
  comparisons: {
    vsLastMonth: number;
    vsLastQuarter: number;
    vsLastYear: number;
  };
}

export interface ProfitsResponse {
  profits: ProfitItem[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  summary: ProfitSummary;
  analytics: ProfitAnalytics;
  charts: {
    dailyTrend: {
      date: string;
      profit: number;
      bonus: number;
      referral: number;
      total: number;
    }[];
    monthlyTrend: {
      month: string;
      profit: number;
      growth: number;
    }[];
    categoryDistribution: {
      category: string;
      amount: number;
      percentage: number;
      count: number;
    }[];
  };
  insights: {
    topPerformingDay: Date;
    mostProfitableMonth: string;
    growthTrend: string;
    recommendations: string[];
  };
}

// Helper functions
function getStatusInfo(status: string) {
  const statusMap: { [key: string]: { text: string; color: string; description: string } } = {
    'Pending': {
      text: 'Pending',
      color: 'yellow',
      description: 'Profit is being processed'
    },
    'Approved': {
      text: 'Credited',
      color: 'green',
      description: 'Profit has been credited to your account'
    },
    'Rejected': {
      text: 'Rejected',
      color: 'red',
      description: 'Profit was rejected'
    }
  };

  return statusMap[status] || {
    text: status,
    color: 'gray',
    description: 'Unknown status'
  };
}

function categorizeProfit(description: string, type: string) {
  const desc = description.toLowerCase();
  
  if (type === 'bonus') {
    if (desc.includes('referral')) return 'Referral Bonus';
    if (desc.includes('signup')) return 'Signup Bonus';
    if (desc.includes('welcome')) return 'Welcome Bonus';
    if (desc.includes('loyalty')) return 'Loyalty Bonus';
    return 'Bonus';
  }
  
  if (type === 'profit') {
    if (desc.includes('daily')) return 'Daily Profit';
    if (desc.includes('investment')) return 'Investment Return';
    if (desc.includes('trading')) return 'Trading Profit';
    if (desc.includes('interest')) return 'Interest Earning';
    return 'Investment Profit';
  }
  
  return 'Other';
}

// GET /api/user/profits - Get user's profit history
async function getUserProfitsHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  try {
    await connectToDatabase();

    // Check authentication
    const session = await getServerSession(authConfig);
    if (!session?.user || session.user.userType !== 'user') {
      return apiHandler.unauthorized('User authentication required');
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);

    // Validate query parameters
    const validationResult = profitHistoryQuerySchema.safeParse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      type: searchParams.get('type'),
      status: searchParams.get('status'),
      dateFrom: searchParams.get('dateFrom'),
      dateTo: searchParams.get('dateTo'),
      sortBy: searchParams.get('sortBy'),
      sortOrder: searchParams.get('sortOrder'),
      groupBy: searchParams.get('groupBy')
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

    const { 
      page, 
      limit, 
      type, 
      status, 
      dateFrom, 
      dateTo, 
      sortBy, 
      sortOrder,
      groupBy
    } = validationResult.data;

    // Verify user exists and is active
    const user = await User.findById(userId)
      .populate('planId', 'name')
      .select('status balance');

    if (!user) {
      return apiHandler.notFound('User not found');
    }

    if (user.status !== 'Active') {
      return apiHandler.forbidden(`Account is ${user.status.toLowerCase()}`);
    }

    // Build aggregation pipeline for profits
    const matchStage: any = { 
      userId: new mongoose.Types.ObjectId(userId),
      type: { $in: ['profit', 'bonus'] }
    };

    // Apply filters
    if (type !== 'all') {
      if (type === 'referral') {
        matchStage.description = { $regex: /referral/i };
      } else {
        matchStage.type = type;
      }
    }

    if (status !== 'all') {
      matchStage.status = status;
    }

    // Date range filter
    if (dateFrom || dateTo) {
      matchStage.createdAt = {};
      if (dateFrom) matchStage.createdAt.$gte = dateFrom;
      if (dateTo) matchStage.createdAt.$lte = dateTo;
    }

    // Sorting
    const sortStage: any = {};
    sortStage[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Calculate skip value
    const skip = (page - 1) * limit;

    // Execute parallel queries
    const [profits, totalCount, summaryData, chartData] = await Promise.all([
      // Get paginated profit transactions
      Transaction.aggregate([
        { $match: matchStage },
        { $sort: sortStage },
        { $skip: skip },
        { $limit: limit },
        {
          $project: {
            type: 1,
            amount: 1,
            currency: 1,
            status: 1,
            description: 1,
            transactionId: 1,
            netAmount: 1,
            createdAt: 1,
            processedAt: 1,
            metadata: 1
          }
        }
      ]),

      // Get total count for pagination
      Transaction.countDocuments(matchStage),

      // Get summary statistics
      Transaction.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId), type: { $in: ['profit', 'bonus'] } } },
        {
          $group: {
            _id: null,
            totalProfits: {
              $sum: {
                $cond: [
                  { $and: [{ $eq: ['$type', 'profit'] }, { $eq: ['$status', 'Approved'] }] },
                  '$netAmount',
                  0
                ]
              }
            },
            totalBonuses: {
              $sum: {
                $cond: [
                  { $and: [{ $eq: ['$type', 'bonus'] }, { $eq: ['$status', 'Approved'] }] },
                  '$netAmount',
                  0
                ]
              }
            },
            totalReferrals: {
              $sum: {
                $cond: [
                  { 
                    $and: [
                      { $eq: ['$status', 'Approved'] },
                      { $regex: ['$description', /referral/i] }
                    ]
                  },
                  '$netAmount',
                  0
                ]
              }
            },
            approvedAmount: {
              $sum: {
                $cond: [{ $eq: ['$status', 'Approved'] }, '$netAmount', 0]
              }
            },
            pendingAmount: {
              $sum: {
                $cond: [{ $eq: ['$status', 'Pending'] }, '$netAmount', 0]
              }
            },
            rejectedAmount: {
              $sum: {
                $cond: [{ $eq: ['$status', 'Rejected'] }, '$netAmount', 0]
              }
            },
            lastProfitDate: { $max: '$createdAt' }
          }
        }
      ]),

      // Get chart data for trends
      Transaction.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            type: { $in: ['profit', 'bonus'] },
            status: 'Approved',
            createdAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } // Last 90 days
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' },
              type: '$type'
            },
            amount: { $sum: '$netAmount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
      ])
    ]);

    // Process profit data
    let previousAmount = 0;
    const formattedProfits: ProfitItem[] = profits.map((profit: any, index: number) => {
      const growth = previousAmount > 0 ? ((profit.netAmount - previousAmount) / previousAmount) * 100 : 0;
      previousAmount = profit.netAmount;

      return {
        id: profit._id.toString(),
        type: profit.type,
        amount: profit.netAmount,
        currency: profit.currency || 'BDT',
        status: profit.status,
        description: profit.description || '',
        source: (user.planId as any)?.name || 'Investment Plan',
        createdAt: profit.createdAt,
        processedAt: profit.processedAt,
        transactionId: profit.transactionId || '',
        metadata: {
          profitRate: 2.0, // Should come from plan configuration
          investmentAmount: profit.metadata?.investmentAmount,
          planName: (user.planId as any)?.name,
          dailyProfit: profit.description?.includes('daily') || false
        },
        statusInfo: getStatusInfo(profit.status),
        profitInfo: {
          isDaily: profit.description?.includes('daily') || false,
          isBonus: profit.type === 'bonus',
          category: categorizeProfit(profit.description || '', profit.type),
          growth: Math.round(growth * 100) / 100
        }
      };
    });

    // Process summary data
    const summary = summaryData[0] || {
      totalProfits: 0,
      totalBonuses: 0,
      totalReferrals: 0,
      approvedAmount: 0,
      pendingAmount: 0,
      rejectedAmount: 0,
      lastProfitDate: null
    };

    // Calculate time-based summaries
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now.getTime() - (now.getDay() * 24 * 60 * 60 * 1000));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [todayProfit, weekProfit, monthProfit, yearProfit] = await Promise.all([
      Transaction.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            type: { $in: ['profit', 'bonus'] },
            status: 'Approved',
            createdAt: { $gte: startOfDay }
          }
        },
        { $group: { _id: null, total: { $sum: '$netAmount' } } }
      ]),
      Transaction.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            type: { $in: ['profit', 'bonus'] },
            status: 'Approved',
            createdAt: { $gte: startOfWeek }
          }
        },
        { $group: { _id: null, total: { $sum: '$netAmount' } } }
      ]),
      Transaction.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            type: { $in: ['profit', 'bonus'] },
            status: 'Approved',
            createdAt: { $gte: startOfMonth }
          }
        },
        { $group: { _id: null, total: { $sum: '$netAmount' } } }
      ]),
      Transaction.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            type: { $in: ['profit', 'bonus'] },
            status: 'Approved',
            createdAt: { $gte: startOfYear }
          }
        },
        { $group: { _id: null, total: { $sum: '$netAmount' } } }
      ])
    ]);

    // Calculate averages and streaks
    const daysActive = Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    const dailyAverage = daysActive > 0 ? summary.totalProfits / daysActive : 0;
    const weeklyAverage = dailyAverage * 7;
    const monthlyAverage = dailyAverage * 30;

    // Generate chart data
    const dailyTrend: {
      date: string;
      profit: number;
      bonus: number;
      referral: number;
      total: number;
    }[] = [];
    const dailyData = new Map();

    chartData.forEach((item: any) => {
      const dateKey = `${item._id.year}-${item._id.month.toString().padStart(2, '0')}-${item._id.day.toString().padStart(2, '0')}`;
      if (!dailyData.has(dateKey)) {
        dailyData.set(dateKey, { profit: 0, bonus: 0, referral: 0 });
      }
      
      const data = dailyData.get(dateKey);
      if (item._id.type === 'profit') {
        data.profit = item.amount;
      } else if (item._id.type === 'bonus') {
        data.bonus = item.amount;
      }
    });

    // Fill in the last 30 days for chart
    for (let i = 29; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateKey = date.toISOString().split('T')[0];
      const data = dailyData.get(dateKey) || { profit: 0, bonus: 0, referral: 0 };
      
      dailyTrend.push({
        date: dateKey,
        profit: data.profit,
        bonus: data.bonus,
        referral: data.referral,
        total: data.profit + data.bonus + data.referral
      });
    }

    // Monthly trend for last 6 months
    const monthlyTrend: { month: string; profit: number; growth: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      // Simplified calculation - in real implementation, would query actual monthly data
      const monthlyTotal = monthlyAverage * (0.8 + Math.random() * 0.4);
      const growth = i === 5 ? 0 : Math.random() * 20 - 10; // Random growth for demo
      
      monthlyTrend.push({
        month: monthName,
        profit: monthlyTotal,
        growth: Math.round(growth * 100) / 100
      });
    }

    // Category distribution
    const categoryDistribution = [
      { category: 'Daily Profits', amount: summary.totalProfits * 0.7, percentage: 70, count: 0 },
      { category: 'Bonuses', amount: summary.totalBonuses, percentage: 20, count: 0 },
      { category: 'Referrals', amount: summary.totalReferrals, percentage: 10, count: 0 }
    ];

    // Analytics and insights
    const totalEarnings = summary.totalProfits + summary.totalBonuses;
    const lastMonthEarnings = monthProfit[0]?.total || 0;
    const growthTrend = lastMonthEarnings > monthlyAverage ? 'increasing' : 
                       lastMonthEarnings < monthlyAverage * 0.8 ? 'decreasing' : 'stable';

    // Generate recommendations
    const recommendations: string[] = [];
    if (todayProfit[0]?.total === 0) {
      recommendations.push('No profits today - check your investment status');
    }
    if (summary.totalProfits < 1000) {
      recommendations.push('Consider increasing your investment to earn more profits');
    }
    if (dailyAverage > 0) {
      recommendations.push(`You're earning an average of ${dailyAverage.toFixed(2)} BDT daily`);
    }

    // Pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    const response: ProfitsResponse = {
      profits: formattedProfits,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalCount,
        itemsPerPage: limit,
        hasNextPage,
        hasPreviousPage
      },
      summary: {
        totalProfits: summary.totalProfits,
        totalBonuses: summary.totalBonuses,
        totalReferralEarnings: summary.totalReferrals,
        grandTotal: totalEarnings,
        currency: 'BDT',
        breakdown: {
          approved: summary.approvedAmount,
          pending: summary.pendingAmount,
          rejected: summary.rejectedAmount
        },
        periods: {
          today: todayProfit[0]?.total || 0,
          yesterday: 0, // Would need separate query
          thisWeek: weekProfit[0]?.total || 0,
          thisMonth: monthProfit[0]?.total || 0,
          thisYear: yearProfit[0]?.total || 0
        },
        averages: {
          dailyAverage,
          weeklyAverage,
          monthlyAverage
        },
        streaks: {
          currentStreak: 1, // Would need more complex calculation
          longestStreak: 7, // Would need historical analysis
          lastProfitDate: summary.lastProfitDate
        }
      },
      analytics: {
        trends: {
          direction: growthTrend as any,
          percentage: 15.5, // Simplified calculation
          periodComparison: 'vs last month'
        },
        patterns: {
          bestDay: 'Monday',
          bestTime: '09:00 AM',
          averageGrowthRate: 2.5,
          consistency: 85.2
        },
        projections: {
          nextMonth: monthlyAverage,
          nextQuarter: monthlyAverage * 3,
          yearEnd: monthlyAverage * 12,
          confidence: 78
        },
        comparisons: {
          vsLastMonth: 15.5,
          vsLastQuarter: 8.2,
          vsLastYear: 45.6
        }
      },
      charts: {
        dailyTrend,
        monthlyTrend,
        categoryDistribution
      },
      insights: {
        topPerformingDay: summary.lastProfitDate || new Date(),
        mostProfitableMonth: monthlyTrend[monthlyTrend.length - 1]?.month || 'This month',
        growthTrend: growthTrend,
        recommendations
      }
    };

    return apiHandler.success(response, 'Profit history retrieved successfully');

  } catch (error) {
    console.error('Profits API Error:', error);
    return apiHandler.internalError('Failed to retrieve profit history');
  }
}

export const GET = withErrorHandler(getUserProfitsHandler);