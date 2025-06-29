import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Transaction } from '@/models/Transaction';
import { User } from '@/models/User';
import { AuditLog } from '@/models/AuditLog';
import { authMiddleware } from '@/middleware/auth';
import { apiRateLimit } from '@/middleware/rate-limit';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler, createPaginatedResponse, createSortStage, createPaginationStages } from '@/lib/api-helpers';
import { transactionCreateSchema, paginationSchema, dateRangeSchema } from '@/lib/validation';
import { objectIdValidator } from '@/utils/validators';
import { z } from 'zod';
import mongoose from 'mongoose';

// Transaction list query validation
const transactionListQuerySchema = paginationSchema.extend({
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  type: z.enum(['deposit', 'withdrawal', 'bonus', 'profit', 'penalty']).optional(),
  status: z.enum(['Pending', 'Approved', 'Rejected', 'Processing', 'Failed']).optional(),
  gateway: z.enum(['CoinGate', 'UddoktaPay', 'Manual', 'System']).optional(),
  currency: z.enum(['USD', 'BDT']).optional()
}).merge(dateRangeSchema);

// GET /api/users/[id]/transactions - Get user transactions
async function getUserTransactionsHandler(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
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

    const { id } = params;

    // Validate user ID
    const idValidation = objectIdValidator.safeParse(id);
    if (!idValidation.success) {
      return apiHandler.badRequest('Invalid user ID format');
    }

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
      dateFrom,
      dateTo
    } = validationResult.data;

    // Check if user exists
    const user = await User.findById(id).select('_id name email');
    if (!user) {
      return apiHandler.notFound('User not found');
    }

    // Build aggregation pipeline
    const pipeline: any[] = [];

    // Match user transactions
    const matchConditions: any = { userId: new mongoose.Types.ObjectId(id) };

    if (type) matchConditions.type = type;
    if (status) matchConditions.status = status;
    if (gateway) matchConditions.gateway = gateway;
    if (currency) matchConditions.currency = currency;

    if (dateFrom || dateTo) {
      matchConditions.createdAt = {};
      if (dateFrom) matchConditions.createdAt.$gte = new Date(dateFrom);
      if (dateTo) matchConditions.createdAt.$lte = new Date(dateTo);
    }

    pipeline.push({ $match: matchConditions });

    // Lookup admin who approved/rejected
    pipeline.push({
      $lookup: {
        from: 'admins',
        localField: 'approvedBy',
        foreignField: '_id',
        as: 'approvedByAdmin'
      }
    });

    pipeline.push({
      $unwind: {
        path: '$approvedByAdmin',
        preserveNullAndEmptyArrays: true
      }
    });

    // Get total count for pagination
    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await Transaction.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    // Add sorting
    pipeline.push(createSortStage(sortBy, sortOrder));

    // Add pagination
    pipeline.push(...createPaginationStages(page, limit));

    // Project final fields
    pipeline.push({
      $project: {
        _id: 1,
        type: 1,
        amount: 1,
        currency: 1,
        gateway: 1,
        status: 1,
        description: 1,
        transactionId: 1,
        gatewayTransactionId: 1,
        rejectionReason: 1,
        fees: 1,
        netAmount: 1,
        metadata: 1,
        createdAt: 1,
        updatedAt: 1,
        processedAt: 1,
        'approvedByAdmin.name': 1,
        'approvedByAdmin.email': 1
      }
    });

    const transactions = await Transaction.aggregate(pipeline);

    // Calculate summary statistics
    const summaryPipeline = [
      { $match: { userId: new mongoose.Types.ObjectId(id) } },
      {
        $group: {
          _id: null,
          totalDeposits: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$type', 'deposit'] }, { $eq: ['$status', 'Approved'] }] },
                '$amount',
                0
              ]
            }
          },
          totalWithdrawals: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$type', 'withdrawal'] }, { $eq: ['$status', 'Approved'] }] },
                '$amount',
                0
              ]
            }
          },
          totalFees: { $sum: '$fees' },
          pendingAmount: {
            $sum: {
              $cond: [
                { $eq: ['$status', 'Pending'] },
                '$amount',
                0
              ]
            }
          },
          totalTransactions: { $sum: 1 },
          approvedTransactions: {
            $sum: {
              $cond: [{ $eq: ['$status', 'Approved'] }, 1, 0]
            }
          }
        }
      }
    ];

    const summaryResult = await Transaction.aggregate(summaryPipeline);
    const summary = summaryResult[0] || {
      totalDeposits: 0,
      totalWithdrawals: 0,
      totalFees: 0,
      pendingAmount: 0,
      totalTransactions: 0,
      approvedTransactions: 0
    };

    const successRate = summary.totalTransactions > 0 
      ? (summary.approvedTransactions / summary.totalTransactions) * 100 
      : 0;

    const paginatedResponse = createPaginatedResponse(transactions, total, page, limit);

    // Log audit
    await AuditLog.create({
      adminId: request.headers.get('x-user-id'),
      action: 'transactions.view_user',
      entity: 'Transaction',
      entityId: id,
      status: 'Success',
      metadata: {
        userName: user.name,
        filters: { type, status, gateway, currency },
        resultCount: transactions.length
      },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return apiHandler.success({
      ...paginatedResponse,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email
      },
      summary: {
        ...summary,
        successRate: Math.round(successRate * 100) / 100
      }
    });

  } catch (error) {
    return apiHandler.handleError(error);
  }
}

// POST /api/users/[id]/transactions - Create manual transaction for user
async function createUserTransactionHandler(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Apply middleware
  const authResult = await authMiddleware(request, {
    requireAuth: true,
    allowedUserTypes: ['admin'],
  });
  if (authResult) return authResult;

  const rateLimitResult = await apiRateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    await connectToDatabase();

    const { id } = params;
    const adminId = request.headers.get('x-user-id');

    // Validate user ID
    const idValidation = objectIdValidator.safeParse(id);
    if (!idValidation.success) {
      return apiHandler.badRequest('Invalid user ID format');
    }

    const body = await request.json();
    const validationResult = transactionCreateSchema.safeParse({
      ...body,
      userId: id
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

    const { type, amount, currency, description, gateway = 'Manual' } = validationResult.data;

    // Check if user exists
    const user = await User.findById(id);
    if (!user) {
      return apiHandler.notFound('User not found');
    }

    // Generate transaction ID
    const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Calculate fees (if applicable)
    const fees = 0; // Manual transactions typically have no fees
    const netAmount = amount - fees;

    // Create transaction
    const transaction = await Transaction.create({
      userId: new mongoose.Types.ObjectId(id),
      type,
      amount,
      currency,
      gateway,
      status: 'Approved', // Manual transactions are auto-approved
      description: description || `Manual ${type} by admin`,
      transactionId,
      approvedBy: adminId,
      fees,
      netAmount,
      metadata: {
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        createdBy: 'admin'
      },
      processedAt: new Date()
    });

    // Update user balance
    const balanceChange = type === 'deposit' || type === 'bonus' || type === 'profit' 
      ? netAmount 
      : -netAmount;

    await User.findByIdAndUpdate(id, {
      $inc: { balance: balanceChange }
    });

    // Log audit
    await AuditLog.create({
      adminId,
      action: 'transactions.create_manual',
      entity: 'Transaction',
      entityId: transaction._id.toString(),
      status: 'Success',
      metadata: {
        userId: id,
        userName: user.name,
        transactionType: type,
        amount,
        currency,
        balanceChange
      },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return apiHandler.created({
      transaction: {
        _id: transaction._id,
        type: transaction.type,
        amount: transaction.amount,
        currency: transaction.currency,
        gateway: transaction.gateway,
        status: transaction.status,
        description: transaction.description,
        transactionId: transaction.transactionId,
        fees: transaction.fees,
        netAmount: transaction.netAmount,
        createdAt: transaction.createdAt,
        processedAt: transaction.processedAt
      },
      balanceChange,
      newBalance: user.balance + balanceChange
    });

  } catch (error) {
    return apiHandler.handleError(error);
  }
}

export async function GET(request: NextRequest, context: { params: { id: string } }) {
  return withErrorHandler(getUserTransactionsHandler)(request, context);
}

export async function POST(request: NextRequest, context: { params: { id: string } }) {
  return withErrorHandler(createUserTransactionHandler)(request, context);
}