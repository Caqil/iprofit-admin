import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Transaction, ITransaction } from '@/models/Transaction';
import { User } from '@/models/User';
import { AuditLog } from '@/models/AuditLog';
import { authMiddleware } from '@/middleware/auth';
import { apiRateLimit } from '@/middleware/rate-limit';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler, createPaginatedResponse, createPaginationStages } from '@/lib/api-helpers';

// Helper to create a properly typed $sort stage for Mongoose aggregation
function createSortStage(sortBy: string, sortOrder: string): mongoose.PipelineStage.Sort {
  return {
    $sort: {
      [sortBy]: sortOrder === 'asc' ? 1 : -1
    }
  };
}
import { paginationSchema, dateRangeSchema } from '@/lib/validation';
import { TransactionFilter, TransactionSummary } from '@/types/transaction';
import { z } from 'zod';
import mongoose from 'mongoose';

// Transaction list query validation
const transactionListQuerySchema = paginationSchema.extend({
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  type: z.enum(['deposit', 'withdrawal', 'bonus', 'profit', 'penalty']).optional(),
  status: z.enum(['Pending', 'Approved', 'Rejected', 'Processing', 'Failed']).optional(),
  gateway: z.enum(['CoinGate', 'UddoktaPay', 'Manual', 'System']).optional(),
  currency: z.enum(['USD', 'BDT']).optional(),
  userId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  amountMin: z.string().transform(Number).pipe(z.number().min(0)).optional(),
  amountMax: z.string().transform(Number).pipe(z.number().min(0)).optional(),
  search: z.string().optional()
}).merge(dateRangeSchema);

// GET /api/transactions - List transactions with filtering and pagination
async function getTransactionsHandler(request: NextRequest): Promise<NextResponse> {
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

    // Parse and validate query parameters
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    const validationResult = transactionListQuerySchema.safeParse(queryParams);

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
      sortBy,
      sortOrder,
      type,
      status,
      gateway,
      currency,
      userId,
      amountMin,
      amountMax,
      search,
      dateFrom,
      dateTo
    } = validationResult.data;

    // Build match stage for filtering
    const matchStage: any = {};

    if (type) matchStage.type = type;
    if (status) matchStage.status = status;
    if (gateway) matchStage.gateway = gateway;
    if (currency) matchStage.currency = currency;
    if (userId) matchStage.userId = new mongoose.Types.ObjectId(userId);

    // Amount range filter
    if (amountMin !== undefined || amountMax !== undefined) {
      matchStage.amount = {};
      if (amountMin !== undefined) matchStage.amount.$gte = amountMin;
      if (amountMax !== undefined) matchStage.amount.$lte = amountMax;
    }

    // Date range filter
    if (dateFrom || dateTo) {
      matchStage.createdAt = {};
      if (dateFrom) matchStage.createdAt.$gte = new Date(dateFrom);
      if (dateTo) matchStage.createdAt.$lte = new Date(dateTo);
    }

    // Search filter
    if (search) {
      matchStage.$or = [
        { transactionId: { $regex: search, $options: 'i' } },
        { gatewayTransactionId: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
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
            { $project: { name: 1, email: 1, phone: 1, kycStatus: 1 } }
          ]
        }
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      
      // Lookup approver information
      {
        $lookup: {
          from: 'admins',
          localField: 'approvedBy',
          foreignField: '_id',
          as: 'approver',
          pipeline: [
            { $project: { name: 1, email: 1 } }
          ]
        }
      },
      { $unwind: { path: '$approver', preserveNullAndEmptyArrays: true } },
      
      // Add computed fields
      {
        $addFields: {
          formattedAmount: {
            $concat: [
              '$currency',
              ' ',
              { $toString: '$amount' }
            ]
          },
          processingTime: {
            $cond: {
              if: '$processedAt',
              then: {
                $divide: [
                  { $subtract: ['$processedAt', '$createdAt'] },
                  1000 * 60 // Convert to minutes
                ]
              },
              else: null
            }
          }
        }
      },
      
      // Sort stage
      createSortStage(sortBy, sortOrder),
      
      // Add pagination stages
      ...createPaginationStages(page, limit)
    ];

    // Execute aggregation
    const [transactions, totalDocs] = await Promise.all([
      Transaction.aggregate(pipeline),
      Transaction.countDocuments(matchStage)
    ]);

    // Create paginated response
    const response = createPaginatedResponse(transactions, totalDocs, page, limit);

    return apiHandler.success(response);

  } catch (error) {
    console.error('Get transactions error:', error);
    return apiHandler.handleError(error);
  }
}

// POST /api/transactions - Create a new transaction (for manual entries)
const manualTransactionSchema = z.object({
  userId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID'),
  type: z.enum(['deposit', 'withdrawal', 'bonus', 'profit', 'penalty']),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  currency: z.enum(['USD', 'BDT']),
  description: z.string().min(1, 'Description is required'),
  gateway: z.enum(['Manual', 'System']).optional().default('Manual'),
  metadata: z.object({
    adminReason: z.string().optional(),
    referenceId: z.string().optional()
  }).optional()
});

async function createTransactionHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Apply middleware
  const authResult = await authMiddleware(request, {
    requireAuth: true,
    allowedUserTypes: ['admin'],
    requiredPermission: 'transactions.create'
  });
  if (authResult) return authResult;

  const rateLimitResult = await apiRateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    await connectToDatabase();

    const adminId = request.headers.get('x-user-id');
    const body = await request.json();
    const validationResult = manualTransactionSchema.safeParse(body);

    if (!validationResult.success) {
      return apiHandler.validationError(
        validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      );
    }

    const { userId, type, amount, currency, description, gateway, metadata } = validationResult.data;

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return apiHandler.notFound('User not found');
    }

    // Generate transaction ID
    const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Calculate fees (0 for manual transactions)
    const fees = 0;
    const netAmount = amount;

    // Create transaction
    const transaction = await Transaction.create({
      userId: new mongoose.Types.ObjectId(userId),
      type,
      amount,
      currency,
      gateway,
      status: gateway === 'Manual' ? 'Approved' : 'Pending',
      description,
      transactionId,
      fees,
      netAmount,
      approvedBy: gateway === 'Manual' && adminId ? new mongoose.Types.ObjectId(adminId) : undefined,
      processedAt: gateway === 'Manual' ? new Date() : undefined,
      metadata: {
        ...metadata,
        ipAddress: apiHandler.getClientIP(),
        adminCreated: true
      }
    });

    // Update user balance for approved transactions
    if (transaction.status === 'Approved') {
      const balanceChange = type === 'deposit' || type === 'bonus' || type === 'profit' 
        ? netAmount 
        : -netAmount;
      
      await User.findByIdAndUpdate(userId, {
        $inc: { balance: balanceChange }
      });
    }

    // Log audit trail
    await AuditLog.create({
      userId: adminId,
      userType: 'admin',
      action: 'transaction.create',
      resource: 'Transaction',
      resourceId: transaction._id,
      details: {
        transactionType: type,
        amount,
        currency,
        gateway,
        targetUserId: userId,
        manual: true
      },
      ipAddress: apiHandler.getClientIP(),
      userAgent: request.headers.get('user-agent'),
      status: 'Success'
    });

    // Populate transaction with user data
    const populatedTransaction = await Transaction.findById(transaction._id)
      .populate('userId', 'name email phone')
      .populate('approvedBy', 'name email');

    return apiHandler.created({
      transaction: populatedTransaction,
      message: 'Transaction created successfully'
    });

  } catch (error) {
    console.error('Create transaction error:', error);
    return apiHandler.handleError(error);
  }
}

// Export handlers with error wrapper
export const GET = withErrorHandler(getTransactionsHandler);
export const POST = withErrorHandler(createTransactionHandler);