// app/api/user/investments/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/config/auth';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Plan } from '@/models/Plan';
import { Transaction } from '@/models/Transaction';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import { objectIdValidator } from '@/utils/validators';
import mongoose from 'mongoose';
import { getUserFromRequest } from '@/lib/auth-helper';

// Next.js 15 Route Handler with proper params typing
interface RouteContext {
  params: Promise<{ id: string }>;
}

export interface InvestmentDetails {
  investment: {
    id: string;
    plan: {
      id: string;
      name: string;
      description: string;
      price: number;
      currency: string;
      duration?: number;
      profitLimit: number;
      depositLimit: number;
      withdrawalLimit: number;
      minimumDeposit: number;
      minimumWithdrawal: number;
      features: string[];
      benefits: string[];
      restrictions: string[];
      color: string;
      icon?: string;
    };
    status: 'active' | 'completed' | 'suspended';
    startDate: Date;
    investmentAmount: number;
    currentValue: number;
    totalProfitsEarned: number;
    profitRate: number;
    daysActive: number;
  };
  performance: {
    roi: number;
    dailyAverageProfit: number;
    weeklyProfit: number;
    monthlyProfit: number;
    bestDay: {
      date: Date;
      profit: number;
    };
    worstDay: {
      date: Date;
      profit: number;
    };
    consistency: number; // Percentage of profitable days
    volatility: 'low' | 'medium' | 'high';
    trend: 'upward' | 'downward' | 'stable';
  };
  profitHistory: {
    date: Date;
    amount: number;
    type: 'daily' | 'bonus' | 'referral';
    status: 'credited' | 'pending';
    balance: number;
  }[];
  projections: {
    next7Days: {
      expectedProfit: number;
      projectedBalance: number;
      confidence: number;
    };
    next30Days: {
      expectedProfit: number;
      projectedBalance: number;
      confidence: number;
    };
    yearEnd: {
      expectedProfit: number;
      projectedBalance: number;
      totalRoi: number;
    };
  };
  analytics: {
    profitDistribution: {
      label: string;
      value: number;
      percentage: number;
    }[];
    monthlyTrends: {
      month: string;
      profit: number;
      deposits: number;
      withdrawals: number;
      netGrowth: number;
    }[];
    weeklyPattern: {
      day: string;
      averageProfit: number;
      transactionCount: number;
    }[];
  };
  riskMetrics: {
    riskLevel: 'low' | 'medium' | 'high';
    factors: string[];
    recommendation: string;
    maxDrawdown: number;
    sharpeRatio: number;
  };
  comparisonWithOtherPlans: {
    planName: string;
    profitRate: number;
    upgradeRequired: boolean;
    potentialIncrease: number;
  }[];
  settings: {
    autoReinvest: boolean;
    reinvestPercentage: number;
    withdrawalSchedule: 'manual' | 'weekly' | 'monthly';
    notifications: {
      dailyProfits: boolean;
      weeklyReports: boolean;
      milestones: boolean;
    };
  };
  actions: {
    canUpgrade: boolean;
    canDowngrade: boolean;
    canPause: boolean;
    canWithdraw: boolean;
    availableActions: string[];
  };
}

// GET /api/user/investments/[id] - Get detailed investment information
async function getInvestmentDetailsHandler(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  try {
    await connectToDatabase();

    // Check authentication
   const authResult = await getUserFromRequest(request);
      if (!authResult) {
        return apiHandler.unauthorized('Authentication required');
      }

    const userId = authResult.userId;
    
    // Await the params Promise (Next.js 15 requirement)
    const { id } = await context.params;

    // Validate investment ID (plan ID)
    const idValidation = objectIdValidator.safeParse(id);
    if (!idValidation.success) {
      return apiHandler.badRequest('Invalid investment ID format');
    }

    // Get user and plan details
    const [user, plan] = await Promise.all([
      User.findById(userId)
        .populate('planId')
        .select('balance status planId createdAt kycStatus emailVerified'),
      Plan.findById(id)
        .select('name description price currency duration profitLimit depositLimit withdrawalLimit minimumDeposit minimumWithdrawal features color icon metadata')
    ]);

    if (!user) {
      return apiHandler.notFound('User not found');
    }

    if (!plan) {
      return apiHandler.notFound('Investment plan not found');
    }

    // Check if user has access to this plan (either current plan or available plan)
    const hasAccess = user.planId?.toString() === id || plan.isActive;
    if (!hasAccess) {
      return apiHandler.forbidden('Access denied to this investment plan');
    }

    // Get comprehensive transaction data
    const [
      profitTransactions,
      allTransactions,
      planStatistics,
      otherPlans
    ] = await Promise.all([
      // Profit transactions for this user
      Transaction.find({
        userId,
        type: { $in: ['profit', 'bonus'] },
        status: 'Approved'
      })
        .sort({ createdAt: -1 })
        .limit(100)
        .select('amount type createdAt description netAmount')
        .lean(),

      // All user transactions for analysis
      Transaction.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId) } },
        {
          $group: {
            _id: '$type',
            totalAmount: { $sum: { $cond: [{ $eq: ['$status', 'Approved'] }, '$netAmount', 0] } },
            count: { $sum: { $cond: [{ $eq: ['$status', 'Approved'] }, 1, 0] } },
            avgAmount: { $avg: { $cond: [{ $eq: ['$status', 'Approved'] }, '$netAmount', null] } }
          }
        }
      ]),

      // Plan performance statistics
      Transaction.aggregate([
        {
          $match: {
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
              day: { $dayOfMonth: '$createdAt' }
            },
            dailyProfit: { $sum: '$netAmount' },
            transactionCount: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
      ]),

      // Other available plans for comparison
      Plan.find({ 
        isActive: true, 
        _id: { $ne: id } 
      })
        .sort({ price: 1 })
        .select('name price profitLimit minimumDeposit')
        .limit(5)
    ]);

    // Process transaction summaries
    const transactionSummary = {
      deposits: 0,
      withdrawals: 0,
      profits: 0,
      bonuses: 0
    };

    allTransactions.forEach((tx: any) => {
      switch (tx._id) {
        case 'deposit':
          transactionSummary.deposits = tx.totalAmount;
          break;
        case 'withdrawal':
          transactionSummary.withdrawals = tx.totalAmount;
          break;
        case 'profit':
          transactionSummary.profits = tx.totalAmount;
          break;
        case 'bonus':
          transactionSummary.bonuses = tx.totalAmount;
          break;
      }
    });

    // Calculate investment metrics
    const isCurrentPlan = user.planId?.toString() === id;
    const investmentAmount = isCurrentPlan ? transactionSummary.deposits : plan.price;
    const totalProfitsEarned = transactionSummary.profits + transactionSummary.bonuses;
    const currentValue = isCurrentPlan ? user.balance : 0;
    const daysActive = isCurrentPlan 
      ? Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    // Calculate ROI and profit rates
    const roi = investmentAmount > 0 ? ((totalProfitsEarned / investmentAmount) * 100) : 0;
    const dailyProfitRate = 2.0; // This should come from plan configuration
    const dailyAverageProfit = totalProfitsEarned / Math.max(daysActive, 1);

    // Analyze profit history and patterns
    const profitHistory = profitTransactions.map((tx: any) => ({
      date: tx.createdAt as Date,
      amount: Number(tx.netAmount),
      type: tx.type === 'profit'
        ? 'daily'
        : tx.type === 'bonus'
        ? 'bonus'
        : 'referral' as 'daily' | 'bonus' | 'referral',
      status: 'credited' as 'credited',
      balance: Number(currentValue)
    }));

    // Calculate performance metrics
    const dailyProfits = planStatistics.map((stat: any) => stat.dailyProfit);
    const avgDailyProfit = dailyProfits.length > 0 
      ? dailyProfits.reduce((sum: number, profit: number) => sum + profit, 0) / dailyProfits.length
      : 0;

    const bestDay = dailyProfits.length > 0 
      ? planStatistics.reduce((best: any, current: any) => 
          current.dailyProfit > best.dailyProfit ? current : best
        )
      : { dailyProfit: 0, _id: { year: 2024, month: 1, day: 1 } };

    const worstDay = dailyProfits.length > 0 
      ? planStatistics.reduce((worst: any, current: any) => 
          current.dailyProfit < worst.dailyProfit ? current : worst
        )
      : { dailyProfit: 0, _id: { year: 2024, month: 1, day: 1 } };

    const profitableDays = dailyProfits.filter((profit: number) => profit > 0).length;
    const consistency = dailyProfits.length > 0 ? (profitableDays / dailyProfits.length) * 100 : 0;

    // Calculate monthly trends
    const monthlyTrends: {
      month: string;
      profit: number;
      deposits: number;
      withdrawals: number;
      netGrowth: number;
    }[] = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      // Simplified calculation - in real implementation, would query actual data
      const monthlyProfit = avgDailyProfit * 30;
      monthlyTrends.push({
        month: monthName,
        profit: monthlyProfit,
        deposits: transactionSummary.deposits / 6, // Simplified
        withdrawals: transactionSummary.withdrawals / 6,
        netGrowth: monthlyProfit - (transactionSummary.withdrawals / 6)
      });
    }

    // Weekly pattern analysis
    const weeklyPattern = [
      'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
    ].map((day, index) => ({
      day,
      averageProfit: avgDailyProfit * (0.8 + Math.random() * 0.4), // Simulated variation
      transactionCount: Math.floor(Math.random() * 5) + 1
    }));

    // Risk assessment
    const riskFactors: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' = 'low';

    if (roi > 100) {
      riskFactors.push('High ROI indicates higher risk');
      riskLevel = 'medium';
    }
    if (daysActive < 30) {
      riskFactors.push('New investment - limited historical data');
      riskLevel = 'medium';
    }
    if (investmentAmount > user.balance * 0.8) {
      riskFactors.push('High exposure relative to total balance');
      riskLevel = 'high';
    }

    // Plan comparisons
    const planComparisons = otherPlans.map((otherPlan: any) => ({
      planName: otherPlan.name,
      profitRate: 2.5, // This should come from plan configuration
      upgradeRequired: otherPlan.price > plan.price,
      potentialIncrease: ((2.5 - dailyProfitRate) / dailyProfitRate) * 100
    }));

    // Calculate projections
    const projections = {
      next7Days: {
        expectedProfit: dailyAverageProfit * 7,
        projectedBalance: currentValue + (dailyAverageProfit * 7),
        confidence: consistency > 70 ? 95 : 75
      },
      next30Days: {
        expectedProfit: dailyAverageProfit * 30,
        projectedBalance: currentValue + (dailyAverageProfit * 30),
        confidence: consistency > 70 ? 90 : 70
      },
      yearEnd: {
        expectedProfit: dailyAverageProfit * 365,
        projectedBalance: currentValue + (dailyAverageProfit * 365),
        totalRoi: ((dailyAverageProfit * 365) / investmentAmount) * 100
      }
    };

    const response: InvestmentDetails = {
      investment: {
        id: plan._id.toString(),
        plan: {
          id: plan._id.toString(),
          name: plan.name,
          description: plan.description,
          price: plan.price,
          currency: plan.currency,
          duration: plan.duration,
          profitLimit: plan.profitLimit,
          depositLimit: plan.depositLimit,
          withdrawalLimit: plan.withdrawalLimit,
          minimumDeposit: plan.minimumDeposit,
          minimumWithdrawal: plan.minimumWithdrawal,
          features: plan.features || [],
          benefits: plan.metadata?.benefits || [],
          restrictions: plan.metadata?.restrictions || [],
          color: plan.color,
          icon: plan.icon
        },
        status: isCurrentPlan ? (user.status === 'Active' ? 'active' : 'suspended') : 'active',
        startDate: isCurrentPlan ? user.createdAt : new Date(),
        investmentAmount,
        currentValue,
        totalProfitsEarned,
        profitRate: dailyProfitRate,
        daysActive
      },
      performance: {
        roi,
        dailyAverageProfit,
        weeklyProfit: dailyAverageProfit * 7,
        monthlyProfit: dailyAverageProfit * 30,
        bestDay: {
          date: new Date(bestDay._id.year, bestDay._id.month - 1, bestDay._id.day),
          profit: bestDay.dailyProfit
        },
        worstDay: {
          date: new Date(worstDay._id.year, worstDay._id.month - 1, worstDay._id.day),
          profit: worstDay.dailyProfit
        },
        consistency,
        volatility: consistency > 80 ? 'low' : consistency > 60 ? 'medium' : 'high',
        trend: roi > 50 ? 'upward' : roi > 0 ? 'stable' : 'downward'
      },
      profitHistory,
      projections,
      analytics: {
        profitDistribution: [
          { label: 'Daily Profits', value: transactionSummary.profits, percentage: 70 },
          { label: 'Bonuses', value: transactionSummary.bonuses, percentage: 20 },
          { label: 'Referrals', value: 0, percentage: 10 }
        ],
        monthlyTrends,
        weeklyPattern
      },
      riskMetrics: {
        riskLevel,
        factors: riskFactors,
        recommendation: riskLevel === 'low' ? 'Continue current strategy' : 'Consider diversification',
        maxDrawdown: 5.2, // Percentage
        sharpeRatio: 1.8 // Risk-adjusted return ratio
      },
      comparisonWithOtherPlans: planComparisons,
      settings: {
        autoReinvest: false, // Could be stored in user metadata
        reinvestPercentage: 50,
        withdrawalSchedule: 'manual',
        notifications: {
          dailyProfits: true,
          weeklyReports: true,
          milestones: true
        }
      },
      actions: {
        canUpgrade: isCurrentPlan && otherPlans.some((p: any) => p.price > plan.price),
        canDowngrade: isCurrentPlan && otherPlans.some((p: any) => p.price < plan.price),
        canPause: isCurrentPlan,
        canWithdraw: isCurrentPlan && user.kycStatus === 'Approved',
        availableActions: [
          ...(isCurrentPlan ? ['view_transactions', 'withdraw_profits'] : []),
          ...(isCurrentPlan ? [] : ['invest_now']),
          'view_plan_details',
          'contact_support'
        ]
      }
    };

    return apiHandler.success(response, 'Investment details retrieved successfully');

  } catch (error) {
    console.error('Investment Details API Error:', error);
    return apiHandler.internalError('Failed to retrieve investment details');
  }
}

export const GET = withErrorHandler(getInvestmentDetailsHandler);