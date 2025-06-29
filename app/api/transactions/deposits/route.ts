import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Transaction } from '@/models/Transaction';
import { User } from '@/models/User';
import { Plan } from '@/models/Plan';
import { AuditLog } from '@/models/AuditLog';
import { authMiddleware } from '@/middleware/auth';
import { apiRateLimit } from '@/middleware/rate-limit';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import { z } from 'zod';
import mongoose from 'mongoose';

// Deposit request validation schema
const depositRequestSchema = z.object({
  userId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID'),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  currency: z.enum(['USD', 'BDT']),
  gateway: z.enum(['CoinGate', 'UddoktaPay', 'Manual']),
  gatewayData: z.object({
    // CoinGate specific
    orderId: z.string().optional(),
    coinbaseOrderId: z.string().optional(),
    
    // UddoktaPay specific
    uddoktaPayOrderId: z.string().optional(),
    paymentMethod: z.string().optional(),
    
    // Manual deposit specific
    referenceNumber: z.string().optional(),
    bankName: z.string().optional(),
    accountNumber: z.string().optional(),
    depositSlip: z.string().optional(), // File URL
    
    // Common fields
    note: z.string().optional(),
    customerReference: z.string().optional()
  }).optional()
});

// GET /api/transactions/deposits - List deposit transactions
async function getDepositsHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Apply middleware
  const authResult = await authMiddleware(request, {
    requireAuth: true,
    allowedUserTypes: ['admin'],
    requiredPermission: 'transactions.view'
  });
  if (authResult) return authResult;

  const rateLimitResult = await apiRateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    await connectToDatabase();

    const { page, limit, sortBy, sortOrder } = apiHandler.getPaginationParams();
    const filters = apiHandler.getFilterParams();

    // Build match stage for deposits only
    const matchStage: any = { type: 'deposit' };

    // Apply additional filters
    if (filters.status) matchStage.status = filters.status;
    if (filters.gateway) matchStage.gateway = filters.gateway;
    if (filters.currency) matchStage.currency = filters.currency;
    if (filters.userId) matchStage.userId = new mongoose.Types.ObjectId(filters.userId);

    // Date range filter
    if (filters.dateFrom || filters.dateTo) {
      matchStage.createdAt = {};
      if (filters.dateFrom) matchStage.createdAt.$gte = new Date(filters.dateFrom);
      if (filters.dateTo) matchStage.createdAt.$lte = new Date(filters.dateTo);
    }

    // Amount range filter
    if (filters.amountMin || filters.amountMax) {
      matchStage.amount = {};
      if (filters.amountMin) matchStage.amount.$gte = parseFloat(filters.amountMin);
      if (filters.amountMax) matchStage.amount.$lte = parseFloat(filters.amountMax);
    }

    // Build aggregation pipeline
    const pipeline: mongoose.PipelineStage[] = [
      { $match: matchStage },
      
      // Lookup user information
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
          pipeline: [
            { $project: { name: 1, email: 1, phone: 1, kycStatus: 1, planId: 1 } }
          ]
        }
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      
      // Lookup user's plan
      {
        $lookup: {
          from: 'plans',
          localField: 'user.planId',
          foreignField: '_id',
          as: 'userPlan',
          pipeline: [
            { $project: { name: 1, depositLimit: 1, minimumDeposit: 1 } }
          ]
        }
      },
      { $unwind: { path: '$userPlan', preserveNullAndEmptyArrays: true } },
      
      // Add computed fields
      {
        $addFields: {
          isOverLimit: {
            $gt: ['$amount', '$userPlan.depositLimit']
          },
          isBelowMinimum: {
            $lt: ['$amount', '$userPlan.minimumDeposit']
          },
          gatewayFee: {
            $switch: {
              branches: [
                { case: { $eq: ['$gateway', 'CoinGate'] }, then: { $multiply: ['$amount', 0.025] } },
                { case: { $eq: ['$gateway', 'UddoktaPay'] }, then: { $multiply: ['$amount', 0.035] } },
                { case: { $eq: ['$gateway', 'Manual'] }, then: 0 }
              ],
              default: 0
            }
          }
        }
      },
      
      // Sort
      { $sort: { [sortBy]: sortOrder === 'asc' ? 1 : -1 } },
      
      // Pagination
      { $skip: (page - 1) * limit },
      { $limit: limit }
    ];

    // Execute aggregation
    const [deposits, totalDocs] = await Promise.all([
      Transaction.aggregate(pipeline),
      Transaction.countDocuments(matchStage)
    ]);

    return apiHandler.success({
      data: deposits,
      pagination: {
        page,
        limit,
        total: totalDocs,
        pages: Math.ceil(totalDocs / limit)
      }
    });

  } catch (error) {
    console.error('Get deposits error:', error);
    return apiHandler.handleError(error);
  }
}

// POST /api/transactions/deposits - Create a new deposit request
async function createDepositHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Apply middleware - Allow both admin and user (users can create their own deposits)
  const authResult = await authMiddleware(request, {
    requireAuth: true,
    allowedUserTypes: ['admin', 'user']
  });
  if (authResult) return authResult;

  const rateLimitResult = await apiRateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    await connectToDatabase();

    const currentUserId = request.headers.get('x-user-id');
    const userType = request.headers.get('x-user-type');
    const body = await request.json();
    const validationResult = depositRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return apiHandler.validationError(
        validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      );
    }

    const { userId, amount, currency, gateway, gatewayData } = validationResult.data;

    // Permission check: users can only create deposits for themselves
    if (userType === 'user' && userId !== currentUserId) {
      return apiHandler.forbidden('Users can only create deposits for themselves');
    }

    // Verify user exists and get user with plan information
    const user = await User.findById(userId).populate('planId');
    if (!user) {
      return apiHandler.notFound('User not found');
    }

    // Check if user is active and KYC approved for non-manual deposits
    if (gateway !== 'Manual') {
      if (user.status !== 'Active') {
        return apiHandler.badRequest('User account is not active');
      }
      
      if (user.kycStatus !== 'Approved') {
        return apiHandler.badRequest('User KYC must be approved for online deposits');
      }
    }

    // Check plan limits
    const plan = user.planId as any;
    if (plan) {
      if (amount < plan.minimumDeposit) {
        return apiHandler.badRequest(`Minimum deposit amount is ${currency} ${plan.minimumDeposit}`);
      }
      
      if (amount > plan.depositLimit) {
        return apiHandler.badRequest(`Maximum deposit amount is ${currency} ${plan.depositLimit}`);
      }
    }

    // Check daily deposit limit (sum of today's deposits)
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const todayDeposits = await Transaction.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          type: 'deposit',
          status: { $in: ['Pending', 'Approved', 'Processing'] },
          createdAt: { $gte: startOfDay, $lte: endOfDay }
        }
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    const todayTotal = todayDeposits[0]?.totalAmount || 0;
    if (plan?.dailyDepositLimit && (todayTotal + amount) > plan.dailyDepositLimit) {
      return apiHandler.badRequest(`Daily deposit limit exceeded. Current: ${todayTotal}, Limit: ${plan.dailyDepositLimit}`);
    }

    // Calculate fees based on gateway
    let fees = 0;
    switch (gateway) {
      case 'CoinGate':
        fees = amount * 0.025; // 2.5%
        break;
      case 'UddoktaPay':
        fees = amount * 0.035; // 3.5%
        break;
      case 'Manual':
        fees = 0;
        break;
    }

    const netAmount = amount - fees;

    // Generate transaction ID
    const transactionId = `DEP-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Determine initial status based on gateway
    let initialStatus: string;
    let gatewayResponse: any = null;

    switch (gateway) {
      case 'Manual':
        initialStatus = 'Pending'; // Manual deposits need admin approval
        break;
      case 'CoinGate':
      case 'UddoktaPay':
        initialStatus = 'Processing'; // Gateway processing
        // Here you would integrate with actual payment gateway APIs
        gatewayResponse = {
          gateway,
          orderId: gatewayData?.orderId || `${gateway}-${Date.now()}`,
          paymentUrl: `https://${gateway.toLowerCase()}.com/pay/${transactionId}`,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
        };
        break;
      default:
        initialStatus = 'Pending';
    }

    // Create transaction
    const transaction = await Transaction.create({
      userId: new mongoose.Types.ObjectId(userId),
      type: 'deposit',
      amount,
      currency,
      gateway,
      status: initialStatus,
      transactionId,
      gatewayTransactionId: gatewayResponse?.orderId,
      gatewayResponse,
      fees,
      netAmount,
      description: `Deposit via ${gateway}`,
      metadata: {
        ...gatewayData,
        ipAddress: apiHandler.getClientIP(),
        userAgent: request.headers.get('user-agent'),
        planLimits: {
          minimum: plan?.minimumDeposit,
          maximum: plan?.depositLimit,
          dailyLimit: plan?.dailyDepositLimit
        }
      }
    });

    // Log audit trail
    await AuditLog.create({
      userId: currentUserId,
      userType,
      action: 'deposit.create',
      resource: 'Transaction',
      resourceId: transaction._id,
      details: {
        amount,
        currency,
        gateway,
        targetUserId: userId,
        transactionId
      },
      ipAddress: apiHandler.getClientIP(),
      userAgent: request.headers.get('user-agent'),
      status: 'Success'
    });

    // Populate transaction with user data
    const populatedTransaction = await Transaction.findById(transaction._id)
      .populate('userId', 'name email phone kycStatus');

    return apiHandler.created({
      transaction: populatedTransaction,
      paymentUrl: gatewayResponse?.paymentUrl,
      message: `Deposit request created successfully via ${gateway}`
    });

  } catch (error) {
    console.error('Create deposit error:', error);
    return apiHandler.handleError(error);
  }
}

// Export handlers with error wrapper
export const GET = withErrorHandler(getDepositsHandler);
export const POST = withErrorHandler(createDepositHandler);