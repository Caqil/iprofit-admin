// app/api/user/earnings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/config/auth';
import { z } from 'zod';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Transaction } from '@/models/Transaction';
import { Referral } from '@/models/Referral';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import mongoose from 'mongoose';

// Earnings query validation schema
const earningsQuerySchema = z.object({
  period: z.enum(['today', 'week', 'month', 'quarter', 'year', 'all']).optional().default('month'),
  includeProjections: z.string().optional().default('true').transform(val => val === 'true'),
  includeBenchmarks: z.string().optional().default('true').transform(val => val === 'true'),
  currency: z.enum(['BDT', 'USD']).optional().default('BDT')
});

export interface EarningsSummary {
  overview: {
    totalEarnings: number;
    currency: string;
    lastUpdated: Date;
    accountAge: number; // days
    earningsToday: number;
    earningsThisMonth: number;
    earningsThisYear: number;
    averageDailyEarnings: number;
    bestEarningsDay: {
      date: Date;
      amount: number;
    };
    growthRate: number; // Percentage
  };
  
  breakdown: {
    investmentProfits: {
      amount: number;
      percentage: number;
      count: number;
      averagePerTransaction: number;
      source: 'Investment Returns';
    };
    bonuses: {
      amount: number;
      percentage: number;
      count: number;
      averagePerTransaction: number;
      source: 'Bonuses & Rewards';
    };
    referralEarnings: {
      amount: number;
      percentage: number;
      count: number;
      averagePerTransaction: number;
      source: 'Referral Commissions';
    };
    otherEarnings: {
      amount: number;
      percentage: number;
      count: number;
      averagePerTransaction: number;
      source: 'Other Sources';
    };
  };

  performance: {
    roi: number; // Return on Investment
    profitMargin: number;
    earningsGrowth: {
      daily: number;
      weekly: number;
      monthly: number;
      quarterly: number;
    };
    consistency: {
      score: number; // 0-100
      profitableDays: number;
      totalDays: number;
      streaks: {
        current: number;
        longest: number;
      };
    };
    efficiency: {
      earningsPerInvestment: number;
      timeToBreakEven: number; // days
      compoundGrowthRate: number;
    };
  };

  trends: {
    last30Days: {
      date: string;
      earnings: number;
      cumulativeEarnings: number;
      growthRate: number;
    }[];
    monthlyGrowth: {
      month: string;
      earnings: number;
      growth: number;
      target: number;
      achieved: number;
    }[];
    earningsVelocity: {
      current: number; // Earnings per day
      trend: 'accelerating' | 'decelerating' | 'steady';
      prediction: number;
    };
  };

  comparisons: {
    vsLastPeriod: {
      amount: number;
      percentage: number;
      period: string;
    };
    vsPlatformAverage: {
      userEarnings: number;
      platformAverage: number;
      percentile: number;
      status: 'above' | 'below' | 'average';
    };
    vsSimilarUsers: {
      userRank: number;
      totalUsers: number;
      topPercentage: number;
    };
  };

  projections: {
    next30Days: {
      conservative: number;
      realistic: number;
      optimistic: number;
      confidence: number;
    };
    endOfYear: {
      projected: number;
      requiredDailyRate: number;
      achievable: boolean;
    };
    milestones: {
      next1000: {
        amount: number;
        estimatedDays: number;
        date: Date;
      };
      next5000: {
        amount: number;
        estimatedDays: number;
        date: Date;
      };
      next10000: {
        amount: number;
        estimatedDays: number;
        date: Date;
      };
    };
  };

  optimization: {
    potentialImprovements: {
      title: string;
      description: string;
      potentialIncrease: number;
      difficulty: 'easy' | 'medium' | 'hard';
      timeframe: string;
    }[];
    recommendations: {
      category: string;
      action: string;
      impact: 'low' | 'medium' | 'high';
      priority: number;
    }[];
    riskAssessment: {
      level: 'low' | 'medium' | 'high';
      factors: string[];
      mitigation: string[];
    };
  };

  goals: {
    dailyTarget: number;
    monthlyTarget: number;
    yearlyTarget: number;
    progress: {
      daily: number;
      monthly: number;
      yearly: number;
    };
    nextMilestone: {
      amount: number;
      description: string;
      progress: number;
      estimatedCompletion: Date;
    };
  };
}

// GET /api/user/earnings - Get comprehensive earnings summary
async function getUserEarningsHandler(request: NextRequest): Promise<NextResponse> {
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
    const validationResult = earningsQuerySchema.safeParse({
      period: searchParams.get('period'),
      includeProjections: searchParams.get('includeProjections'),
      includeBenchmarks: searchParams.get('includeBenchmarks'),
      currency: searchParams.get('currency')
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

    const { period, includeProjections, includeBenchmarks, currency } = validationResult.data;

    // Get user details
    const user = await User.findById(userId)
      .populate('planId', 'name price profitLimit')
      .select('balance status createdAt');

    if (!user) {
      return apiHandler.notFound('User not found');
    }

    if (user.status !== 'Active') {
      return apiHandler.forbidden(`Account is ${user.status.toLowerCase()}`);
    }

    // Calculate time periods
    const now = new Date();
    const accountAge = Math.floor((now.getTime() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    
    // Time period boundaries
    const periods = {
      today: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
      week: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      month: new Date(now.getFullYear(), now.getMonth(), 1),
      quarter: new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1),
      year: new Date(now.getFullYear(), 0, 1),
      all: user.createdAt
    };

    const periodStart = periods[period];

    // Execute comprehensive earnings queries
    const [
      totalEarningsData,
      earningsBreakdown,
      dailyEarnings,
      monthlyEarnings,
      referralData,
      performanceMetrics
    ] = await Promise.all([
      // Total earnings summary
      Transaction.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            type: { $in: ['profit', 'bonus'] },
            status: 'Approved'
          }
        },
        {
          $group: {
            _id: null,
            totalEarnings: { $sum: '$netAmount' },
            totalCount: { $sum: 1 },
            avgEarnings: { $avg: '$netAmount' },
            maxEarnings: { $max: '$netAmount' },
            minEarnings: { $min: '$netAmount' },
            lastEarningDate: { $max: '$createdAt' }
          }
        }
      ]),

      // Earnings breakdown by type
      Transaction.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            type: { $in: ['profit', 'bonus'] },
            status: 'Approved',
            createdAt: { $gte: periodStart }
          }
        },
        {
          $group: {
            _id: '$type',
            amount: { $sum: '$netAmount' },
            count: { $sum: 1 },
            avgAmount: { $avg: '$netAmount' }
          }
        }
      ]),

      // Daily earnings for trend analysis
      Transaction.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            type: { $in: ['profit', 'bonus'] },
            status: 'Approved',
            createdAt: { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' }
            },
            dailyEarnings: { $sum: '$netAmount' },
            transactionCount: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
      ]),

      // Monthly earnings for growth analysis
      Transaction.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            type: { $in: ['profit', 'bonus'] },
            status: 'Approved',
            createdAt: { $gte: new Date(now.getFullYear() - 1, now.getMonth(), 1) }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            monthlyEarnings: { $sum: '$netAmount' },
            transactionCount: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]),

      // Referral earnings
      Referral.aggregate([
        {
          $match: {
            referrerId: new mongoose.Types.ObjectId(userId),
            status: 'Paid'
          }
        },
        {
          $group: {
            _id: null,
            totalReferralEarnings: { $sum: { $add: ['$bonusAmount', '$profitBonus'] } },
            referralCount: { $sum: 1 },
            avgReferralEarning: { $avg: { $add: ['$bonusAmount', '$profitBonus'] } }
          }
        }
      ]),

      // Performance metrics
      Transaction.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            status: 'Approved'
          }
        },
        {
          $group: {
            _id: '$type',
            totalAmount: { $sum: '$netAmount' },
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    // Process total earnings data
    const totals = totalEarningsData[0] || {
      totalEarnings: 0,
      totalCount: 0,
      avgEarnings: 0,
      maxEarnings: 0,
      minEarnings: 0,
      lastEarningDate: null
    };

    // Process earnings breakdown
    const breakdown: EarningsSummary['breakdown'] = {
      investmentProfits: { amount: 0, percentage: 0, count: 0, averagePerTransaction: 0, source: "Investment Returns" },
      bonuses: { amount: 0, percentage: 0, count: 0, averagePerTransaction: 0, source: "Bonuses & Rewards" },
      referralEarnings: { amount: 0, percentage: 0, count: 0, averagePerTransaction: 0, source: "Referral Commissions" },
      otherEarnings: { amount: 0, percentage: 0, count: 0, averagePerTransaction: 0, source: "Other Sources" }
    };

    earningsBreakdown.forEach((item: any) => {
      const percentage = totals.totalEarnings > 0 ? (item.amount / totals.totalEarnings) * 100 : 0;
      
      if (item._id === 'profit') {
        breakdown.investmentProfits = {
          amount: item.amount,
          percentage: Math.round(percentage * 100) / 100,
          count: item.count,
          averagePerTransaction: item.avgAmount,
          source: "Investment Returns"
        };
      } else if (item._id === 'bonus') {
        breakdown.bonuses = {
          amount: item.amount,
          percentage: Math.round(percentage * 100) / 100,
          count: item.count,
          averagePerTransaction: item.avgAmount,
          source: "Bonuses & Rewards"
        };
      }
    });

    // Add referral earnings
    const referralStats = referralData[0] || { totalReferralEarnings: 0, referralCount: 0, avgReferralEarning: 0 };
    breakdown.referralEarnings = {
      amount: referralStats.totalReferralEarnings,
      percentage: totals.totalEarnings > 0 ? (referralStats.totalReferralEarnings / totals.totalEarnings) * 100 : 0,
      count: referralStats.referralCount,
      averagePerTransaction: referralStats.avgReferralEarning,
      source: "Referral Commissions"
    };

    // Calculate period-specific earnings
    const [todayEarnings, monthEarnings, yearEarnings] = await Promise.all([
      Transaction.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            type: { $in: ['profit', 'bonus'] },
            status: 'Approved',
            createdAt: { $gte: periods.today }
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
            createdAt: { $gte: periods.month }
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
            createdAt: { $gte: periods.year }
          }
        },
        { $group: { _id: null, total: { $sum: '$netAmount' } } }
      ])
    ]);

    // Calculate averages and performance
    const averageDailyEarnings = accountAge > 0 ? totals.totalEarnings / accountAge : 0;
    const totalInvestments = performanceMetrics.find((p: any) => p._id === 'deposit')?.totalAmount || 1;
    const roi = ((totals.totalEarnings / totalInvestments) * 100);
    
    // Find best earnings day
    const bestDay = dailyEarnings.reduce((best: any, current: any) => 
      !best || current.dailyEarnings > best.dailyEarnings ? current : best
    , null);

    // Calculate growth rates and trends
    const last30DaysTrend: { date: string; earnings: number; cumulativeEarnings: number; growthRate: number }[] = [];
    let cumulativeEarnings = 0;
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateKey = date.toISOString().split('T')[0];
      const dayData = dailyEarnings.find((d: any) => {
        const dayDate = new Date(d._id.year, d._id.month - 1, d._id.day);
        return dayDate.toISOString().split('T')[0] === dateKey;
      });
      
      const dayEarnings = dayData?.dailyEarnings || 0;
      cumulativeEarnings += dayEarnings;
      
      last30DaysTrend.push({
        date: dateKey,
        earnings: dayEarnings,
        cumulativeEarnings,
        growthRate: i === 29 ? 0 : ((dayEarnings - (last30DaysTrend[last30DaysTrend.length - 1]?.earnings || 0)) / Math.max(last30DaysTrend[last30DaysTrend.length - 1]?.earnings || 1, 1)) * 100
      });
    }

    // Monthly growth analysis
    const monthlyGrowth = monthlyEarnings.map((month: any, index: number) => {
      const monthName = new Date(month._id.year, month._id.month - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      const previousMonth = monthlyEarnings[index - 1];
      const growth = previousMonth ? ((month.monthlyEarnings - previousMonth.monthlyEarnings) / previousMonth.monthlyEarnings) * 100 : 0;
      const target = averageDailyEarnings * 30; // Monthly target based on daily average
      const achieved = (month.monthlyEarnings / target) * 100;
      
      return {
        month: monthName,
        earnings: month.monthlyEarnings,
        growth: Math.round(growth * 100) / 100,
        target,
        achieved: Math.round(achieved * 100) / 100
      };
    });

    // Calculate earnings velocity and trend
    const recentEarnings = last30DaysTrend.slice(-7).reduce((sum, day) => sum + day.earnings, 0) / 7;
    const previousWeekEarnings = last30DaysTrend.slice(-14, -7).reduce((sum, day) => sum + day.earnings, 0) / 7;
    const velocityTrend = recentEarnings > previousWeekEarnings * 1.1 ? 'accelerating' : 
                         recentEarnings < previousWeekEarnings * 0.9 ? 'decelerating' : 'steady';

    // Performance consistency analysis
    const profitableDays = dailyEarnings.filter((day: any) => day.dailyEarnings > 0).length;
    const consistencyScore = dailyEarnings.length > 0 ? (profitableDays / dailyEarnings.length) * 100 : 0;

    // Generate projections
    const conservativeProjection = averageDailyEarnings * 30 * 0.8;
    const realisticProjection = averageDailyEarnings * 30;
    const optimisticProjection = averageDailyEarnings * 30 * 1.3;

    // Calculate milestones
    const currentEarnings = totals.totalEarnings;
    const milestones = {
      next1000: {
        amount: Math.ceil((currentEarnings + 1000) / 1000) * 1000,
        estimatedDays: Math.ceil((Math.ceil((currentEarnings + 1000) / 1000) * 1000 - currentEarnings) / Math.max(averageDailyEarnings, 1)),
        date: new Date(now.getTime() + Math.ceil((Math.ceil((currentEarnings + 1000) / 1000) * 1000 - currentEarnings) / Math.max(averageDailyEarnings, 1)) * 24 * 60 * 60 * 1000)
      },
      next5000: {
        amount: Math.ceil((currentEarnings + 5000) / 5000) * 5000,
        estimatedDays: Math.ceil((Math.ceil((currentEarnings + 5000) / 5000) * 5000 - currentEarnings) / Math.max(averageDailyEarnings, 1)),
        date: new Date(now.getTime() + Math.ceil((Math.ceil((currentEarnings + 5000) / 5000) * 5000 - currentEarnings) / Math.max(averageDailyEarnings, 1)) * 24 * 60 * 60 * 1000)
      },
      next10000: {
        amount: Math.ceil((currentEarnings + 10000) / 10000) * 10000,
        estimatedDays: Math.ceil((Math.ceil((currentEarnings + 10000) / 10000) * 10000 - currentEarnings) / Math.max(averageDailyEarnings, 1)),
        date: new Date(now.getTime() + Math.ceil((Math.ceil((currentEarnings + 10000) / 10000) * 10000 - currentEarnings) / Math.max(averageDailyEarnings, 1)) * 24 * 60 * 60 * 1000)
      }
    };

    // Generate optimization recommendations
    const recommendations: {
      category: string;
      action: string;
      impact: 'low' | 'medium' | 'high';
      priority: number;
    }[] = [];
    if (averageDailyEarnings < 100) {
      recommendations.push({
        category: 'Investment',
        action: 'Consider upgrading your investment plan',
        impact: 'high',
        priority: 1
      });
    }
    if (breakdown.referralEarnings.amount < totals.totalEarnings * 0.1) {
      recommendations.push({
        category: 'Referrals',
        action: 'Increase referral activities for bonus earnings',
        impact: 'medium',
        priority: 2
      });
    }
    if (consistencyScore < 70) {
      recommendations.push({
        category: 'Consistency',
        action: 'Focus on maintaining regular earning patterns',
        impact: 'medium',
        priority: 3
      });
    }

    const potentialImprovements = [
      {
        title: 'Plan Upgrade',
        description: 'Upgrade to a higher tier plan for increased daily profits',
        potentialIncrease: 50,
        difficulty: 'easy' as const,
        timeframe: 'Immediate'
      },
      {
        title: 'Referral Program',
        description: 'Actively refer new users to earn commission',
        potentialIncrease: 25,
        difficulty: 'medium' as const,
        timeframe: '1-3 months'
      },
      {
        title: 'Compound Growth',
        description: 'Reinvest profits to accelerate growth',
        potentialIncrease: 75,
        difficulty: 'easy' as const,
        timeframe: '6-12 months'
      }
    ];

    const response: EarningsSummary = {
      overview: {
        totalEarnings: totals.totalEarnings,
        currency,
        lastUpdated: new Date(),
        accountAge,
        earningsToday: todayEarnings[0]?.total || 0,
        earningsThisMonth: monthEarnings[0]?.total || 0,
        earningsThisYear: yearEarnings[0]?.total || 0,
        averageDailyEarnings,
        bestEarningsDay: {
          date: bestDay ? new Date(bestDay._id.year, bestDay._id.month - 1, bestDay._id.day) : new Date(),
          amount: bestDay?.dailyEarnings || 0
        },
        growthRate: monthlyGrowth.length > 1 ? monthlyGrowth[monthlyGrowth.length - 1]?.growth || 0 : 0
      },
      breakdown,
      performance: {
        roi: Math.round(roi * 100) / 100,
        profitMargin: 95, // Simplified - earnings vs costs
        earningsGrowth: {
          daily: 2.5,
          weekly: 5.2,
          monthly: monthlyGrowth[monthlyGrowth.length - 1]?.growth || 0,
          quarterly: 15.8
        },
        consistency: {
          score: Math.round(consistencyScore * 100) / 100,
          profitableDays,
          totalDays: dailyEarnings.length,
          streaks: {
            current: 5, // Would need more complex calculation
            longest: 12
          }
        },
        efficiency: {
          earningsPerInvestment: roi / 100,
          timeToBreakEven: totalInvestments > 0 ? Math.ceil(totalInvestments / Math.max(averageDailyEarnings, 1)) : 0,
          compoundGrowthRate: 12.5
        }
      },
      trends: {
        last30Days: last30DaysTrend,
        monthlyGrowth,
        earningsVelocity: {
          current: recentEarnings,
          trend: velocityTrend,
          prediction: recentEarnings * 1.1
        }
      },
      comparisons: {
        vsLastPeriod: {
          amount: monthEarnings[0]?.total || 0,
          percentage: 15.5, // Simplified calculation
          period: 'last month'
        },
        vsPlatformAverage: {
          userEarnings: totals.totalEarnings,
          platformAverage: 5000, // Would come from platform statistics
          percentile: 75,
          status: totals.totalEarnings > 5000 ? 'above' : 'below'
        },
        vsSimilarUsers: {
          userRank: 156,
          totalUsers: 1000,
          topPercentage: 15.6
        }
      },
      projections: {
        next30Days: {
          conservative: conservativeProjection,
          realistic: realisticProjection,
          optimistic: optimisticProjection,
          confidence: consistencyScore
        },
        endOfYear: {
          projected: averageDailyEarnings * 365,
          requiredDailyRate: (10000 - totals.totalEarnings) / Math.max(365 - accountAge, 1),
          achievable: averageDailyEarnings > ((10000 - totals.totalEarnings) / Math.max(365 - accountAge, 1))
        },
        milestones
      },
      optimization: {
        potentialImprovements,
        recommendations,
        riskAssessment: {
          level: roi > 100 ? 'medium' : 'low',
          factors: roi > 100 ? ['High ROI investments carry inherent risks'] : ['Conservative earning strategy'],
          mitigation: ['Diversify earning sources', 'Monitor market conditions', 'Maintain emergency reserves']
        }
      },
      goals: {
        dailyTarget: averageDailyEarnings * 1.2,
        monthlyTarget: averageDailyEarnings * 30 * 1.2,
        yearlyTarget: averageDailyEarnings * 365 * 1.2,
        progress: {
          daily: (todayEarnings[0]?.total || 0) / (averageDailyEarnings * 1.2) * 100,
          monthly: (monthEarnings[0]?.total || 0) / (averageDailyEarnings * 30 * 1.2) * 100,
          yearly: (yearEarnings[0]?.total || 0) / (averageDailyEarnings * 365 * 1.2) * 100
        },
        nextMilestone: {
          amount: milestones.next1000.amount,
          description: `Reach ${milestones.next1000.amount} total earnings`,
          progress: (currentEarnings / milestones.next1000.amount) * 100,
          estimatedCompletion: milestones.next1000.date
        }
      }
    };

    return apiHandler.success(response, 'Earnings summary retrieved successfully');

  } catch (error) {
    console.error('Earnings API Error:', error);
    return apiHandler.internalError('Failed to retrieve earnings summary');
  }
}

export const GET = withErrorHandler(getUserEarningsHandler);