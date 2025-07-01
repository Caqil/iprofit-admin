// app/api/user/portfolio/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/config/auth';
import { z } from 'zod';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Plan } from '@/models/Plan';
import { Transaction } from '@/models/Transaction';
import { Referral } from '@/models/Referral';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import mongoose from 'mongoose';
import { getUserFromRequest } from '@/lib/auth-helper';

// Portfolio query validation schema
const portfolioQuerySchema = z.object({
  includeHistory: z.string().optional().default('true').transform(val => val === 'true'),
  includeProjections: z.string().optional().default('true').transform(val => val === 'true'),
  includeComparisons: z.string().optional().default('true').transform(val => val === 'true'),
  timeframe: z.enum(['7d', '30d', '90d', '1y', 'all']).optional().default('30d')
});

export interface PortfolioOverview {
  summary: {
    totalValue: number;
    totalInvested: number;
    totalEarnings: number;
    totalWithdrawn: number;
    netWorth: number;
    currency: string;
    lastUpdated: Date;
    
    performance: {
      totalROI: number;
      annualizedReturn: number;
      profitMargin: number;
      sharpeRatio: number;
    };
    
    growth: {
      daily: number;
      weekly: number;
      monthly: number;
      yearly: number;
    };
  };

  currentInvestment: {
    plan: {
      id: string;
      name: string;
      tier: string;
      price: number;
      dailyProfitRate: number;
      features: string[];
      color: string;
      icon?: string;
    };
    status: 'active' | 'paused' | 'completed';
    startDate: Date;
    daysActive: number;
    investmentAmount: number;
    currentValue: number;
    profitsEarned: number;
    nextProfitDate: Date;
    nextProfitAmount: number;
    
    performance: {
      roi: number;
      dailyAverage: number;
      weeklyAverage: number;
      monthlyAverage: number;
      bestDay: { date: Date; amount: number };
      consistency: number;
      volatility: 'low' | 'medium' | 'high';
    };
  } | null;

  earningsBreakdown: {
    investmentProfits: {
      amount: number;
      percentage: number;
      transactions: number;
      avgPerTransaction: number;
      trend: 'up' | 'down' | 'stable';
    };
    bonuses: {
      amount: number;
      percentage: number;
      transactions: number;
      avgPerTransaction: number;
      trend: 'up' | 'down' | 'stable';
    };
    referrals: {
      amount: number;
      percentage: number;
      transactions: number;
      avgPerTransaction: number;
      trend: 'up' | 'down' | 'stable';
    };
    others: {
      amount: number;
      percentage: number;
      transactions: number;
      avgPerTransaction: number;
      trend: 'up' | 'down' | 'stable';
    };
  };

  analytics: {
    portfolioScore: {
      overall: number;
      risk: number;
      growth: number;
      stability: number;
      efficiency: number;
    };
    
    riskMetrics: {
      level: 'conservative' | 'moderate' | 'aggressive';
      score: number;
      factors: string[];
      volatility: number;
      maxDrawdown: number;
      riskReward: number;
    };
    
    diversification: {
      score: number;
      recommendations: string[];
      concentrationRisk: number;
      sources: {
        name: string;
        allocation: number;
        risk: 'low' | 'medium' | 'high';
      }[];
    };
  };

  trends: {
    valueHistory: {
      date: string;
      totalValue: number;
      earnings: number;
      invested: number;
      withdrawn: number;
      roi: number;
    }[];
    
    earningsTrend: {
      period: string;
      earnings: number;
      growth: number;
      target: number;
      achieved: number;
    }[];
    
    performanceMetrics: {
      metric: string;
      current: number;
      previous: number;
      change: number;
      trend: 'improving' | 'declining' | 'stable';
    }[];
  };

  projections: {
    shortTerm: {
      period: '7 days';
      expectedEarnings: number;
      projectedValue: number;
      confidence: number;
      scenarios: {
        conservative: number;
        realistic: number;
        optimistic: number;
      };
    };
    
    mediumTerm: {
      period: '30 days';
      expectedEarnings: number;
      projectedValue: number;
      confidence: number;
      milestones: {
        description: string;
        targetAmount: number;
        estimatedDate: Date;
        probability: number;
      }[];
    };
    
    longTerm: {
      period: '1 year';
      expectedEarnings: number;
      projectedValue: number;
      confidence: number;
      compoundGrowth: number;
      factors: string[];
    };
  };

  recommendations: {
    immediate: {
      title: string;
      description: string;
      impact: 'low' | 'medium' | 'high';
      effort: 'easy' | 'moderate' | 'complex';
      timeframe: string;
      potentialBenefit: number;
    }[];
    
    strategic: {
      title: string;
      description: string;
      impact: 'low' | 'medium' | 'high';
      effort: 'easy' | 'moderate' | 'complex';
      timeframe: string;
      potentialBenefit: number;
    }[];
    
    riskManagement: {
      title: string;
      description: string;
      priority: 'low' | 'medium' | 'high' | 'critical';
      action: string;
    }[];
  };

  comparisons: {
    planComparison: {
      currentPlan: string;
      alternatives: {
        planName: string;
        monthlyDifference: number;
        yearlyDifference: number;
        upgradeRequired: boolean;
        riskChange: string;
      }[];
    };
    
    peerComparison: {
      userPercentile: number;
      averagePortfolioValue: number;
      topPerformerValue: number;
      userRank: number;
      totalUsers: number;
    };
    
    marketComparison: {
      platformAverage: number;
      marketTrend: 'bullish' | 'bearish' | 'neutral';
      userVsMarket: number;
      outperformance: boolean;
    };
  };

  alerts: {
    type: 'info' | 'warning' | 'success' | 'error';
    title: string;
    message: string;
    action?: string;
    priority: 'low' | 'medium' | 'high';
    dismissible: boolean;
  }[];

  quickActions: {
    available: {
      action: string;
      label: string;
      description: string;
      enabled: boolean;
      requirements?: string[];
    }[];
    
    suggestions: {
      action: string;
      reason: string;
      impact: string;
      priority: number;
    }[];
  };
}

// GET /api/user/portfolio - Get comprehensive portfolio overview
async function getUserPortfolioHandler(request: NextRequest): Promise<NextResponse> {
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

    // Validate query parameters
    const validationResult = portfolioQuerySchema.safeParse({
      includeHistory: searchParams.get('includeHistory'),
      includeProjections: searchParams.get('includeProjections'),
      includeComparisons: searchParams.get('includeComparisons'),
      timeframe: searchParams.get('timeframe')
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

    const { includeHistory, includeProjections, includeComparisons, timeframe } = validationResult.data;

    // Get user with plan details
    const user = await User.findById(userId)
      .populate({
        path: 'planId',
        select: 'name description price currency profitLimit features color icon minimumDeposit depositLimit'
      })
      .select('balance status createdAt kycStatus emailVerified phoneVerified');

    if (!user) {
      return apiHandler.notFound('User not found');
    }

    if (user.status !== 'Active') {
      return apiHandler.forbidden(`Account is ${user.status.toLowerCase()}`);
    }

    // Calculate timeframe boundaries
    const now = new Date();
    const timeframes = {
      '7d': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      '30d': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      '90d': new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
      '1y': new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
      'all': user.createdAt
    };

    const timeframeStart = timeframes[timeframe];

    // Execute comprehensive portfolio queries
    const [
      transactionSummary,
      earningsData,
      referralData,
      portfolioHistory,
      allPlans,
      platformStats
    ] = await Promise.all([
      // Overall transaction summary
      Transaction.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId), status: 'Approved' } },
        {
          $group: {
            _id: '$type',
            totalAmount: { $sum: '$netAmount' },
            count: { $sum: 1 },
            avgAmount: { $avg: '$netAmount' },
            lastTransaction: { $max: '$createdAt' }
          }
        }
      ]),

      // Detailed earnings breakdown
      Transaction.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            type: { $in: ['profit', 'bonus'] },
            status: 'Approved',
            createdAt: { $gte: timeframeStart }
          }
        },
        {
          $group: {
            _id: '$type',
            amount: { $sum: '$netAmount' },
            count: { $sum: 1 },
            avgAmount: { $avg: '$netAmount' },
            transactions: { $push: '$$ROOT' }
          }
        }
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
            totalEarnings: { $sum: { $add: ['$bonusAmount', '$profitBonus'] } },
            count: { $sum: 1 },
            avgEarning: { $avg: { $add: ['$bonusAmount', '$profitBonus'] } }
          }
        }
      ]),

      // Portfolio value history
      Transaction.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            status: 'Approved',
            createdAt: { $gte: timeframeStart }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' }
            },
            dailyEarnings: {
              $sum: {
                $cond: [{ $in: ['$type', ['profit', 'bonus']] }, '$netAmount', 0]
              }
            },
            dailyInvested: {
              $sum: {
                $cond: [{ $eq: ['$type', 'deposit'] }, '$netAmount', 0]
              }
            },
            dailyWithdrawn: {
              $sum: {
                $cond: [{ $eq: ['$type', 'withdrawal'] }, '$netAmount', 0]
              }
            }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
      ]),

      // All available plans for comparison
      Plan.find({ isActive: true })
        .sort({ price: 1 })
        .select('name price profitLimit minimumDeposit features'),

      // Platform statistics (simplified)
      User.aggregate([
        { $match: { status: 'Active' } },
        {
          $group: {
            _id: null,
            totalUsers: { $sum: 1 },
            avgBalance: { $avg: '$balance' }
          }
        }
      ])
    ]);

    // Process transaction summary
    const transactions = {
      deposits: 0,
      withdrawals: 0,
      profits: 0,
      bonuses: 0
    };

    transactionSummary.forEach((tx: any) => {
      switch (tx._id) {
        case 'deposit':
          transactions.deposits = tx.totalAmount;
          break;
        case 'withdrawal':
          transactions.withdrawals = tx.totalAmount;
          break;
        case 'profit':
          transactions.profits = tx.totalAmount;
          break;
        case 'bonus':
          transactions.bonuses = tx.totalAmount;
          break;
      }
    });

    // Calculate key metrics
    const totalInvested = transactions.deposits;
    const totalEarnings = transactions.profits + transactions.bonuses + (referralData[0]?.totalEarnings || 0);
    const totalWithdrawn = transactions.withdrawals;
    const netWorth = user.balance;
    const totalValue = totalInvested + totalEarnings - totalWithdrawn;

    // Performance calculations
    const totalROI = totalInvested > 0 ? ((totalEarnings / totalInvested) * 100) : 0;
    const accountAge = Math.floor((now.getTime() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    const annualizedReturn = accountAge > 0 ? (totalROI * 365 / accountAge) : 0;
    const dailyAverage = accountAge > 0 ? totalEarnings / accountAge : 0;

    // Process current investment details
    let currentInvestment: any = null;
    if (user.planId) {
      const plan = user.planId as any;
      const daysActive = accountAge;
      const profitsEarned = transactions.profits + transactions.bonuses;
      const dailyProfitRate = 2.0; // This should come from plan configuration
      
      // Calculate performance metrics
      const roi = totalInvested > 0 ? ((profitsEarned / totalInvested) * 100) : 0;
      const dailyEarnings = portfolioHistory.map((h: any) => h.dailyEarnings);
      const bestDay = dailyEarnings.length > 0 
        ? portfolioHistory.reduce((best: any, current: any) => 
            current.dailyEarnings > (best?.dailyEarnings || 0) ? current : best
          )
        : null;

      const profitableDays = dailyEarnings.filter((earnings: number) => earnings > 0).length;
      const consistency = dailyEarnings.length > 0 ? (profitableDays / dailyEarnings.length) * 100 : 0;

      currentInvestment = {
        plan: {
          id: plan._id.toString(),
          name: plan.name,
          tier: plan.price < 1000 ? 'Basic' : plan.price < 5000 ? 'Premium' : 'Elite',
          price: plan.price,
          dailyProfitRate,
          features: plan.features || [],
          color: plan.color,
          icon: plan.icon
        },
        status: 'active' as const,
        startDate: user.createdAt,
        daysActive,
        investmentAmount: totalInvested,
        currentValue: netWorth,
        profitsEarned,
        nextProfitDate: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        nextProfitAmount: dailyAverage,
        performance: {
          roi: Math.round(roi * 100) / 100,
          dailyAverage,
          weeklyAverage: dailyAverage * 7,
          monthlyAverage: dailyAverage * 30,
          bestDay: bestDay ? {
            date: new Date(bestDay._id.year, bestDay._id.month - 1, bestDay._id.day),
            amount: bestDay.dailyEarnings
          } : { date: new Date(), amount: 0 },
          consistency: Math.round(consistency * 100) / 100,
          volatility: consistency > 80 ? 'low' : consistency > 60 ? 'medium' : 'high'
        }
      };
    }

    // Process earnings breakdown with trends
    const earningsBreakdown = {
      investmentProfits: {
        amount: transactions.profits,
        percentage: totalEarnings > 0 ? (transactions.profits / totalEarnings) * 100 : 0,
        transactions: earningsData.find((e: any) => e._id === 'profit')?.count || 0,
        avgPerTransaction: earningsData.find((e: any) => e._id === 'profit')?.avgAmount || 0,
        trend: 'up' as const
      },
      bonuses: {
        amount: transactions.bonuses,
        percentage: totalEarnings > 0 ? (transactions.bonuses / totalEarnings) * 100 : 0,
        transactions: earningsData.find((e: any) => e._id === 'bonus')?.count || 0,
        avgPerTransaction: earningsData.find((e: any) => e._id === 'bonus')?.avgAmount || 0,
        trend: 'stable' as const
      },
      referrals: {
        amount: referralData[0]?.totalEarnings || 0,
        percentage: totalEarnings > 0 ? ((referralData[0]?.totalEarnings || 0) / totalEarnings) * 100 : 0,
        transactions: referralData[0]?.count || 0,
        avgPerTransaction: referralData[0]?.avgEarning || 0,
        trend: 'up' as const
      },
      others: {
        amount: 0,
        percentage: 0,
        transactions: 0,
        avgPerTransaction: 0,
        trend: 'stable' as const
      }
    };

    // Calculate portfolio analytics
    const portfolioScore = {
      overall: Math.min(95, Math.max(20, 50 + (totalROI / 2))),
      risk: totalROI > 100 ? 60 : 85,
      growth: Math.min(100, totalROI),
      stability: Math.round(currentInvestment?.performance.consistency ?? 0),
      efficiency: Math.min(100, annualizedReturn / 10)
    };

    const riskLevel = totalROI > 100 ? 'aggressive' : totalROI > 50 ? 'moderate' : 'conservative';
    const riskScore = totalROI > 100 ? 75 : totalROI > 50 ? 50 : 25;

    // Generate value history for charts
    const valueHistory: {
      date: string;
      totalValue: number;
      earnings: number;
      invested: number;
      withdrawn: number;
      roi: number;
    }[] = [];
    let cumulativeInvested = 0;
    let cumulativeEarnings = 0;
    let cumulativeWithdrawn = 0;

    portfolioHistory.forEach((day: any) => {
      cumulativeInvested += day.dailyInvested;
      cumulativeEarnings += day.dailyEarnings;
      cumulativeWithdrawn += day.dailyWithdrawn;
      
      const totalValue = cumulativeInvested + cumulativeEarnings - cumulativeWithdrawn;
      const roi = cumulativeInvested > 0 ? ((cumulativeEarnings / cumulativeInvested) * 100) : 0;
      
      valueHistory.push({
        date: new Date(day._id.year, day._id.month - 1, day._id.day).toISOString().split('T')[0],
        totalValue,
        earnings: cumulativeEarnings,
        invested: cumulativeInvested,
        withdrawn: cumulativeWithdrawn,
        roi: Math.round(roi * 100) / 100
      });
    });

    // Generate projections
    const projections = {
      shortTerm: {
        period: '7 days' as const,
        expectedEarnings: dailyAverage * 7,
        projectedValue: netWorth + (dailyAverage * 7),
        confidence: Math.round(currentInvestment?.performance.consistency ?? 0),
        scenarios: {
          conservative: dailyAverage * 7 * 0.8,
          realistic: dailyAverage * 7,
          optimistic: dailyAverage * 7 * 1.3
        }
      },
      mediumTerm: {
        period: '30 days' as const,
        expectedEarnings: dailyAverage * 30,
        projectedValue: netWorth + (dailyAverage * 30),
        confidence:  Math.round(currentInvestment?.performance.consistency ?? 0),
        milestones: [
          {
            description: 'Reach next 1000 BDT in earnings',
            targetAmount: Math.ceil((totalEarnings + 1000) / 1000) * 1000,
            estimatedDate: new Date(now.getTime() + Math.ceil(1000 / dailyAverage) * 24 * 60 * 60 * 1000),
            probability: 85
          }
        ]
      },
      longTerm: {
        period: '1 year' as const,
        expectedEarnings: dailyAverage * 365,
        projectedValue: netWorth + (dailyAverage * 365),
        confidence:  Math.round(currentInvestment?.performance.consistency ?? 0),
        compoundGrowth: 25.5,
        factors: ['Market conditions', 'Plan performance', 'Reinvestment strategy']
      }
    };

    // Generate recommendations
    const immediateRecommendations: {
      title: string;
      description: string;
      impact: 'low' | 'medium' | 'high';
      effort: 'easy' | 'moderate' | 'complex';
      timeframe: string;
      potentialBenefit: number;
    }[] = [];
    const strategicRecommendations: {
      title: string;
      description: string;
      impact: 'low' | 'medium' | 'high';
      effort: 'easy' | 'moderate' | 'complex';
      timeframe: string;
      potentialBenefit: number;
    }[] = [];
    const riskManagementRecommendations: {
      title: string;
      description: string;
      priority: 'low' | 'medium' | 'high' | 'critical';
      action: string;
    }[] = [];

    if (totalEarnings < 1000) {
      immediateRecommendations.push({
        title: 'Increase Investment',
        description: 'Consider depositing more funds to accelerate earnings',
        impact: 'high' as const,
        effort: 'easy' as const,
        timeframe: 'Immediate',
        potentialBenefit: 50
      });
    }

    if (referralData[0]?.totalEarnings || 0 < totalEarnings * 0.1) {
      strategicRecommendations.push({
        title: 'Referral Program',
        description: 'Leverage referral system to earn additional commission',
        impact: 'medium' as const,
        effort: 'moderate' as const,
        timeframe: '1-3 months',
        potentialBenefit: 25
      });
    }

    if (totalROI > 100) {
      riskManagementRecommendations.push({
        title: 'Risk Assessment',
        description: 'Review portfolio risk exposure and consider diversification',
        priority: 'medium' as const,
        action: 'Schedule portfolio review'
      });
    }

    // Plan comparisons
    const currentPlanPrice = user.planId ? (user.planId as any).price : 0;
    const planAlternatives = allPlans
      .filter((plan: any) => plan._id.toString() !== user.planId?.toString())
      .slice(0, 3)
      .map((plan: any) => ({
        planName: plan.name,
        monthlyDifference: (plan.price - currentPlanPrice) * 0.02 * 30, // Simplified calculation
        yearlyDifference: (plan.price - currentPlanPrice) * 0.02 * 365,
        upgradeRequired: plan.price > currentPlanPrice,
        riskChange: plan.price > currentPlanPrice ? 'Higher risk, higher returns' : 'Lower risk, lower returns'
      }));

    // Platform comparisons
    const platformAverage = platformStats[0]?.avgBalance || 5000;
    const userPercentile = Math.round((netWorth / platformAverage) * 100);

    // Generate alerts
    const alerts: PortfolioOverview['alerts'] = [];
    if (!user.kycStatus || user.kycStatus !== 'Approved') {
      alerts.push({
        type: 'warning',
        title: 'KYC Required',
        message: 'Complete KYC verification to unlock full platform features',
        action: 'Complete KYC',
        priority: 'high',
        dismissible: false
      });
    }

    if (dailyAverage === 0) {
      alerts.push({
        type: 'info' as const,
        title: 'No Recent Earnings',
        message: 'You haven\'t earned any profits recently. Check your investment status.',
        priority: 'medium' as const,
        dismissible: true
      });
    }

    if (totalROI > 200) {
      alerts.push({
        type: 'success' as const,
        title: 'Excellent Performance',
        message: 'Your portfolio is performing exceptionally well!',
        priority: 'low' as const,
        dismissible: true
      });
    }

    // Quick actions
    const quickActions = {
      available: [
        {
          action: 'deposit',
          label: 'Add Funds',
          description: 'Deposit money to increase your investment',
          enabled: user.emailVerified
        },
        {
          action: 'withdraw',
          label: 'Withdraw Profits',
          description: 'Withdraw your earned profits',
          enabled: user.kycStatus === 'Approved' && totalEarnings > 0,
          requirements: !user.kycStatus ? ['Complete KYC verification'] : []
        },
        {
          action: 'upgrade',
          label: 'Upgrade Plan',
          description: 'Upgrade to a higher tier plan for better returns',
          enabled: true
        },
        {
          action: 'refer',
          label: 'Refer Friends',
          description: 'Earn commission by referring new users',
          enabled: true
        }
      ],
      suggestions: [
        {
          action: 'increase_investment',
          reason: 'Your current earnings could be higher',
          impact: 'Potential 50% increase in daily profits',
          priority: 1
        },
        {
          action: 'enable_auto_reinvest',
          reason: 'Compound growth accelerates earnings',
          impact: 'Exponential growth over time',
          priority: 2
        }
      ]
    };

    const response: PortfolioOverview = {
      summary: {
        totalValue,
        totalInvested,
        totalEarnings,
        totalWithdrawn,
        netWorth,
        currency: 'BDT',
        lastUpdated: new Date(),
        performance: {
          totalROI: Math.round(totalROI * 100) / 100,
          annualizedReturn: Math.round(annualizedReturn * 100) / 100,
          profitMargin: 95,
          sharpeRatio: 1.85
        },
        growth: {
          daily: 2.1,
          weekly: 5.2,
          monthly: 15.8,
          yearly: Math.round(annualizedReturn * 100) / 100
        }
      },
      currentInvestment,
      earningsBreakdown,
      analytics: {
        portfolioScore,
        riskMetrics: {
          level: riskLevel,
          score: riskScore,
          factors: riskLevel === 'aggressive' ? ['High ROI investments'] : ['Conservative strategy'],
          volatility: 12.5,
          maxDrawdown: 3.2,
          riskReward: 2.1
        },
        diversification: {
          score: 65,
          recommendations: ['Consider multiple earning sources', 'Explore referral program'],
          concentrationRisk: 35,
          sources: [
            { name: 'Investment Profits', allocation: 70, risk: 'medium' },
            { name: 'Bonuses', allocation: 20, risk: 'low' },
            { name: 'Referrals', allocation: 10, risk: 'low' }
          ]
        }
      },
      trends: {
        valueHistory,
        earningsTrend: [], // Would be populated with monthly data
        performanceMetrics: [
          { metric: 'ROI', current: totalROI, previous: totalROI * 0.9, change: 10, trend: 'improving' },
          { metric: 'Daily Average', current: dailyAverage, previous: dailyAverage * 0.95, change: 5, trend: 'improving' }
        ]
      },
      projections,
      recommendations: {
        immediate: immediateRecommendations,
        strategic: strategicRecommendations,
        riskManagement: riskManagementRecommendations
      },
      comparisons: {
        planComparison: {
          currentPlan: user.planId ? (user.planId as any).name : 'No Plan',
          alternatives: planAlternatives
        },
        peerComparison: {
          userPercentile,
          averagePortfolioValue: platformAverage,
          topPerformerValue: platformAverage * 3,
          userRank: Math.max(1, Math.floor(userPercentile * (platformStats[0]?.totalUsers || 1000) / 100)),
          totalUsers: platformStats[0]?.totalUsers || 1000
        },
        marketComparison: {
          platformAverage,
          marketTrend: 'bullish',
          userVsMarket: ((netWorth - platformAverage) / platformAverage) * 100,
          outperformance: netWorth > platformAverage
        }
      },
      alerts,
      quickActions
    };

    return apiHandler.success(response, 'Portfolio overview retrieved successfully');

  } catch (error) {
    console.error('Portfolio API Error:', error);
    return apiHandler.internalError('Failed to retrieve portfolio overview');
  }
}

export const GET = withErrorHandler(getUserPortfolioHandler);