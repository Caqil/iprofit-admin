// app/api/user/investments/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/config/auth';
import { z } from 'zod';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Plan } from '@/models/Plan';
import { Transaction } from '@/models/Transaction';
import { AuditLog } from '@/models/AuditLog';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import { sendEmail } from '@/lib/email';
import mongoose from 'mongoose';

// Investment validation schema for POST requests
const investmentSchema = z.object({
  planId: z.string().min(1, 'Plan ID is required'),
  deviceId: z.string().min(1, 'Device ID is required'),
  confirmInvestment: z.boolean().refine(val => val === true, 'Please confirm your investment'),
  acceptTerms: z.boolean().refine(val => val === true, 'Please accept terms and conditions'),
  
  // Optional fields for investment customization
  autoReinvest: z.boolean().optional().default(false),
  withdrawalPreference: z.enum(['manual', 'auto_monthly', 'auto_quarterly']).optional().default('manual'),
  riskAcknowledgment: z.boolean().refine(val => val === true, 'Please acknowledge investment risks')
});

export interface UserInvestment {
  id: string;
  plan: {
    id: string;
    name: string;
    description: string;
    price: number;
    currency: string;
    duration?: number;
    profitLimit: number;
    features: string[];
    color: string;
    icon?: string;
  };
  investmentDate: Date;
  status: 'active' | 'completed' | 'suspended';
  totalInvested: number;
  totalProfitsEarned: number;
  currentValue: number;
  profitRate: number;
  expectedDailyProfit: number;
  expectedMonthlyProfit: number;
  performance: {
    roi: number; // Return on Investment percentage
    daysActive: number;
    profitToday: number;
    profitThisMonth: number;
    totalWithdrawn: number;
  };
  projections: {
    nextProfit: {
      amount: number;
      date: Date;
    };
    monthlyTarget: number;
    yearlyProjection: number;
  };
  settings: {
    autoReinvest: boolean;
    withdrawalPreference: string;
    notifications: boolean;
  };
}

export interface InvestmentsResponse {
  currentInvestment: UserInvestment | null;
  availablePlans: {
    id: string;
    name: string;
    description: string;
    price: number;
    currency: string;
    profitRate: number;
    minimumDeposit: number;
    features: string[];
    color: string;
    isUpgrade: boolean;
    upgradePrice: number;
  }[];
  investmentHistory: {
    planName: string;
    startDate: Date;
    endDate: Date;
    totalInvested: number;
    totalEarned: number;
    roi: number;
  }[];
  summary: {
    totalInvestments: number;
    totalEarnings: number;
    averageRoi: number;
    bestPerformingPlan: string;
    investmentDuration: number; // days
  };
  recommendations: {
    suggestedPlan?: string;
    reason: string;
    potentialBenefit: string;
  }[];
}

export interface InvestmentResponse {
  success: boolean;
  investment: UserInvestment;
  message: string;
  transactionId?: string;
  nextSteps: string[];
  warnings: string[];
}

// GET /api/user/investments - Get user's current investments and available plans
async function getUserInvestmentsHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  try {
    await connectToDatabase();

    // Check authentication
    const session = await getServerSession(authConfig);
    if (!session?.user || session.user.userType !== 'user') {
      return apiHandler.unauthorized('User authentication required');
    }

    const userId = session.user.id;

    // Get user with current plan
    const user = await User.findById(userId)
      .populate({
        path: 'planId',
        select: 'name description price currency duration profitLimit features color icon depositLimit withdrawalLimit minimumDeposit'
      })
      .select('balance status planId createdAt kycStatus');

    if (!user) {
      return apiHandler.notFound('User not found');
    }

    // Get all available plans for comparison
    const [allPlans, userTransactions, planChangeHistory] = await Promise.all([
      // Available plans
      Plan.find({ isActive: true })
        .sort({ priority: -1, price: 1 })
        .select('name description price currency profitLimit minimumDeposit features color icon'),

      // User's investment-related transactions
      Transaction.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId) } },
        {
          $group: {
            _id: '$type',
            totalAmount: { $sum: { $cond: [{ $eq: ['$status', 'Approved'] }, '$netAmount', 0] } },
            count: { $sum: { $cond: [{ $eq: ['$status', 'Approved'] }, 1, 0] } },
            lastTransaction: { $max: '$createdAt' }
          }
        }
      ]),

      // Plan change history (transactions related to plan upgrades)
      Transaction.find({
        userId,
        description: { $regex: /plan|upgrade|investment/i },
        status: 'Approved'
      })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('amount description createdAt')
    ]);

    // Process transaction data
    const transactionSummary = {
      deposits: 0,
      withdrawals: 0,
      profits: 0,
      bonuses: 0
    };

    userTransactions.forEach((tx: any) => {
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

    // Calculate current investment details
    let currentInvestment: UserInvestment | null = null;
    if (user.planId) {
      const plan = user.planId as any;
      const investmentDate = user.createdAt; // Assuming user creation is when they started investing
      const daysActive = Math.floor((Date.now() - investmentDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Calculate profit rates (these should come from plan configuration)
      const dailyProfitRate = 0.02; // 2% daily (example)
      const expectedDailyProfit = (transactionSummary.deposits * dailyProfitRate) / 100;
      const expectedMonthlyProfit = expectedDailyProfit * 30;

      // Calculate performance metrics
      const roi = transactionSummary.deposits > 0 
        ? ((transactionSummary.profits / transactionSummary.deposits) * 100) 
        : 0;

      // Get today's and this month's profits
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      const [profitToday, profitThisMonth] = await Promise.all([
        Transaction.aggregate([
          {
            $match: {
              userId: new mongoose.Types.ObjectId(userId),
              type: 'profit',
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
              type: 'profit',
              status: 'Approved',
              createdAt: { $gte: startOfMonth }
            }
          },
          { $group: { _id: null, total: { $sum: '$netAmount' } } }
        ])
      ]);

      currentInvestment = {
        id: plan._id.toString(),
        plan: {
          id: plan._id.toString(),
          name: plan.name,
          description: plan.description,
          price: plan.price,
          currency: plan.currency,
          duration: plan.duration,
          profitLimit: plan.profitLimit,
          features: plan.features || [],
          color: plan.color,
          icon: plan.icon
        },
        investmentDate,
        status: user.status === 'Active' ? 'active' : 'suspended',
        totalInvested: transactionSummary.deposits,
        totalProfitsEarned: transactionSummary.profits,
        currentValue: user.balance,
        profitRate: dailyProfitRate,
        expectedDailyProfit,
        expectedMonthlyProfit,
        performance: {
          roi,
          daysActive,
          profitToday: profitToday[0]?.total || 0,
          profitThisMonth: profitThisMonth[0]?.total || 0,
          totalWithdrawn: transactionSummary.withdrawals
        },
        projections: {
          nextProfit: {
            amount: expectedDailyProfit,
            date: new Date(Date.now() + 24 * 60 * 60 * 1000) // Tomorrow
          },
          monthlyTarget: expectedMonthlyProfit,
          yearlyProjection: expectedDailyProfit * 365
        },
        settings: {
          autoReinvest: false, // Could be stored in user metadata
          withdrawalPreference: 'manual',
          notifications: true
        }
      };
    }

    // Process available plans
    const currentPlanPrice = user.planId ? (user.planId as any).price : 0;
    const availablePlans = allPlans.map((plan: any) => ({
      id: plan._id.toString(),
      name: plan.name,
      description: plan.description,
      price: plan.price,
      currency: plan.currency,
      profitRate: 2.0, // This should come from plan configuration
      minimumDeposit: plan.minimumDeposit,
      features: plan.features || [],
      color: plan.color,
      isUpgrade: plan.price > currentPlanPrice,
      upgradePrice: Math.max(0, plan.price - currentPlanPrice)
    }));

    // Calculate investment history
    const investmentHistory = planChangeHistory.map((tx: any) => ({
      planName: 'Investment Plan', // Extract from transaction description
      startDate: tx.createdAt,
      endDate: new Date(), // Current if still active
      totalInvested: tx.amount,
      totalEarned: 0, // Would need more complex calculation
      roi: 0
    }));

    // Generate summary
    const summary = {
      totalInvestments: transactionSummary.deposits,
      totalEarnings: transactionSummary.profits + transactionSummary.bonuses,
      averageRoi: currentInvestment?.performance.roi || 0,
      bestPerformingPlan: user.planId ? (user.planId as any).name : 'None',
      investmentDuration: currentInvestment?.performance.daysActive || 0
    };

    // Generate recommendations
    const recommendations: InvestmentsResponse['recommendations'] = [];
    if (!user.planId) {
      recommendations.push({
        suggestedPlan: allPlans[0]?.name || 'Basic Plan',
        reason: 'Start your investment journey',
        potentialBenefit: 'Begin earning daily profits'
      });
    } else if (user.balance > 50000 && currentPlanPrice < 5000) {
      const upgradeOption = allPlans.find((p: any) => p.price > currentPlanPrice);
      if (upgradeOption) {
        recommendations.push({
          suggestedPlan: upgradeOption.name,
          reason: 'Your balance qualifies for a higher tier',
          potentialBenefit: 'Increase your daily profit potential'
        });
      }
    }

    const response: InvestmentsResponse = {
      currentInvestment,
      availablePlans,
      investmentHistory,
      summary,
      recommendations
    };

    return apiHandler.success(response, 'Investments retrieved successfully');

  } catch (error) {
    console.error('Investments API Error:', error);
    return apiHandler.internalError('Failed to retrieve investments');
  }
}

// POST /api/user/investments - Invest in a plan (upgrade/change plan)
async function createInvestmentHandler(request: NextRequest): Promise<NextResponse> {
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
    const validationResult = investmentSchema.safeParse(body);

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
      planId, 
      deviceId, 
      autoReinvest, 
      withdrawalPreference 
    } = validationResult.data;

    const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    // Get user and target plan
    const [user, targetPlan] = await Promise.all([
      User.findById(userId).populate('planId'),
      Plan.findById(planId).select('name price currency minimumDeposit depositLimit isActive')
    ]);

    if (!user) {
      return apiHandler.notFound('User not found');
    }

    if (!targetPlan || !targetPlan.isActive) {
      return apiHandler.notFound('Plan not found or inactive');
    }

    // Check account status
    if (user.status !== 'Active') {
      return apiHandler.forbidden(`Account is ${user.status.toLowerCase()}`);
    }

    if (!user.emailVerified) {
      return apiHandler.forbidden('Email verification required for investments');
    }

    if (user.kycStatus !== 'Approved') {
      return apiHandler.forbidden('KYC verification required for investments');
    }

    // Check if user already has this plan
    if (user.planId && user.planId.toString() === planId) {
      return apiHandler.badRequest('You are already subscribed to this plan');
    }

    // Calculate investment cost
    const currentPlanPrice = user.planId ? (user.planId as any).price : 0;
    const investmentCost = Math.max(0, targetPlan.price - currentPlanPrice);

    // Check if upgrade requires payment and user has sufficient balance
    if (investmentCost > 0) {
      if (investmentCost > user.balance) {
        return apiHandler.badRequest(`Insufficient balance. Required: ${investmentCost}, Available: ${user.balance}`);
      }

      // Check minimum deposit requirement
      if (investmentCost < targetPlan.minimumDeposit) {
        return apiHandler.badRequest(`Minimum investment amount is ${targetPlan.minimumDeposit}`);
      }
    }

    // Start database transaction
    const session_db = await mongoose.startSession();

    try {
      const result = await session_db.withTransaction(async () => {
        // Update user's plan
        const updatedUser = await User.findByIdAndUpdate(
          userId,
          { 
            planId: targetPlan._id,
            ...(investmentCost > 0 && { $inc: { balance: -investmentCost } })
          },
          { new: true, session: session_db }
        ).populate('planId');

        let transactionId: string | undefined;

        // Create investment transaction if there's a cost
        if (investmentCost > 0) {
          const transaction = await Transaction.create([{
            userId: new mongoose.Types.ObjectId(userId),
            type: 'bonus', // Using bonus type for plan investments
            amount: investmentCost,
            currency: targetPlan.currency,
            gateway: 'System',
            status: 'Approved',
            transactionId: `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            fees: 0,
            netAmount: investmentCost,
            description: `Investment in ${targetPlan.name} plan`,
            processedAt: new Date(),
            metadata: {
              ipAddress: clientIP,
              userAgent,
              deviceId,
              planUpgrade: true,
              oldPlanId: user.planId?.toString(),
              newPlanId: planId,
              autoReinvest,
              withdrawalPreference
            }
          }], { session: session_db });

          transactionId = transaction[0].transactionId;
        }

        // Create audit log
        await AuditLog.create([{
          userId: new mongoose.Types.ObjectId(userId),
          action: 'investment.create',
          entity: 'User',
          entityId: userId,
          changes: [{
            field: 'planId',
            oldValue: user.planId?.toString() || null,
            newValue: planId
          }],
          ipAddress: clientIP,
          userAgent,
          status: 'Success',
          severity: investmentCost > 10000 ? 'High' : 'Medium',
          metadata: {
            planName: targetPlan.name,
            investmentCost,
            upgradeType: user.planId ? 'upgrade' : 'initial'
          }
        }], { session: session_db });

        // Create current investment object
        const currentInvestment: UserInvestment = {
          id: targetPlan._id.toString(),
          plan: {
            id: targetPlan._id.toString(),
            name: targetPlan.name,
            description: targetPlan.description,
            price: targetPlan.price,
            currency: targetPlan.currency,
            profitLimit: targetPlan.profitLimit,
            features: targetPlan.features || [],
            color: targetPlan.color,
            icon: targetPlan.icon
          },
          investmentDate: new Date(),
          status: 'active',
          totalInvested: investmentCost,
          totalProfitsEarned: 0,
          currentValue: updatedUser?.balance || 0,
          profitRate: 2.0, // Should come from plan configuration
          expectedDailyProfit: (investmentCost * 2.0) / 100,
          expectedMonthlyProfit: ((investmentCost * 2.0) / 100) * 30,
          performance: {
            roi: 0,
            daysActive: 0,
            profitToday: 0,
            profitThisMonth: 0,
            totalWithdrawn: 0
          },
          projections: {
            nextProfit: {
              amount: (investmentCost * 2.0) / 100,
              date: new Date(Date.now() + 24 * 60 * 60 * 1000)
            },
            monthlyTarget: ((investmentCost * 2.0) / 100) * 30,
            yearlyProjection: ((investmentCost * 2.0) / 100) * 365
          },
          settings: {
            autoReinvest: autoReinvest || false,
            withdrawalPreference: withdrawalPreference || 'manual',
            notifications: true
          }
        };

        const nextSteps = [
          'Your investment plan has been activated',
          'Daily profits will start accumulating tomorrow',
          'Monitor your earnings in the portfolio section',
          'Set up withdrawal preferences if needed'
        ];

        const warnings: string[] = [];
        if (investmentCost > user.balance * 0.5) {
          warnings.push('Large investment detected - ensure you have funds for other expenses');
        }
        if (!autoReinvest) {
          warnings.push('Auto-reinvest is disabled - remember to manually reinvest for compound growth');
        }

        const response: InvestmentResponse = {
          success: true,
          investment: currentInvestment,
          message: `Successfully invested in ${targetPlan.name} plan`,
          transactionId,
          nextSteps,
          warnings
        };

        // Send notification email (async)
        sendEmail({
          to: user.email,
          subject: 'Investment Plan Activated',
          templateId: 'investment_created',
          variables: {
            userName: user.name,
            planName: targetPlan.name,
            investmentAmount: investmentCost,
            expectedDailyProfit: currentInvestment.expectedDailyProfit,
            currency: targetPlan.currency
          }
        }).catch(err => console.error('Email error:', err));

        return response;
      });

      return apiHandler.success(result, 'Investment created successfully');

    } finally {
      await session_db.endSession();
    }

  } catch (error) {
    console.error('Investment Creation API Error:', error);
    return apiHandler.internalError('Failed to create investment');
  }
}

export const GET = withErrorHandler(getUserInvestmentsHandler);
export const POST = withErrorHandler(createInvestmentHandler);