// app/api/users/[id]/transactions/route.ts
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
import { sendEmail } from '@/lib/email';
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

// Next.js 15 Route Handler with proper params typing
interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/users/[id]/transactions - Get user transactions
async function getUserTransactionsHandler(
  request: NextRequest,
  context: RouteContext
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

    // Await the params Promise (Next.js 15 requirement)
    const { id } = await context.params;

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
    const user = await User.findById(id).select('name email status');
    if (!user) {
      return apiHandler.notFound('User not found');
    }

    // Build match conditions
    const matchConditions: any = { userId: new mongoose.Types.ObjectId(id) };

    if (type) matchConditions.type = type;
    if (status) matchConditions.status = status;
    if (gateway) matchConditions.gateway = gateway;
    if (currency) matchConditions.currency = currency;

    // Date range filter
    if (dateFrom || dateTo) {
      matchConditions.createdAt = {};
      if (dateFrom) matchConditions.createdAt.$gte = new Date(dateFrom);
      if (dateTo) matchConditions.createdAt.$lte = new Date(dateTo);
    }

    // Build aggregation pipeline
    const pipeline: mongoose.PipelineStage[] = [
      { $match: matchConditions },
      
      // Lookup user information
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
          pipeline: [
            {
              $project: {
                name: 1,
                email: 1,
                profilePicture: 1
              }
            }
          ]
        }
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },

      // Add computed fields
      {
        $addFields: {
          displayAmount: {
            $concat: [
              { $toString: '$amount' },
              ' ',
              '$currency'
            ]
          },
          daysSinceCreated: {
            $divide: [
              { $subtract: [new Date(), '$createdAt'] },
              1000 * 60 * 60 * 24
            ]
          }
        }
      },

      // Sort stage
      createSortStage(sortBy, sortOrder),

      // Facet for pagination and summary
      {
        $facet: {
          data: createPaginationStages(page, limit),
          summary: [
            {
              $group: {
                _id: null,
                totalTransactions: { $sum: 1 },
                totalAmount: { $sum: '$amount' },
                totalUSD: {
                  $sum: {
                    $cond: [
                      { $eq: ['$currency', 'USD'] },
                      '$amount',
                      0
                    ]
                  }
                },
                totalBDT: {
                  $sum: {
                    $cond: [
                      { $eq: ['$currency', 'BDT'] },
                      '$amount',
                      0
                    ]
                  }
                },
                pendingTransactions: {
                  $sum: {
                    $cond: [
                      { $eq: ['$status', 'Pending'] },
                      1,
                      0
                    ]
                  }
                },
                approvedTransactions: {
                  $sum: {
                    $cond: [
                      { $eq: ['$status', 'Approved'] },
                      1,
                      0
                    ]
                  }
                },
                rejectedTransactions: {
                  $sum: {
                    $cond: [
                      { $eq: ['$status', 'Rejected'] },
                      1,
                      0
                    ]
                  }
                },
                totalDeposits: {
                  $sum: {
                    $cond: [
                      { $eq: ['$type', 'deposit'] },
                      '$amount',
                      0
                    ]
                  }
                },
                totalWithdrawals: {
                  $sum: {
                    $cond: [
                      { $eq: ['$type', 'withdrawal'] },
                      '$amount',
                      0
                    ]
                  }
                },
                avgTransactionAmount: { $avg: '$amount' }
              }
            }
          ],
          count: [{ $count: 'total' }]
        }
      }
    ];

    const [result] = await Transaction.aggregate(pipeline);
    const transactions = result.data || [];
    const summary = result.summary[0] || {
      totalTransactions: 0,
      totalAmount: 0,
      totalUSD: 0,
      totalBDT: 0,
      pendingTransactions: 0,
      approvedTransactions: 0,
      rejectedTransactions: 0,
      totalDeposits: 0,
      totalWithdrawals: 0,
      avgTransactionAmount: 0
    };
    const total = result.count[0]?.total || 0;

    // Calculate success rate
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
        successRate: Math.round(successRate * 100) / 100,
        netAmount: summary.totalDeposits - summary.totalWithdrawals
      }
    });

  } catch (error) {
    return apiHandler.handleError(error);
  }
}

// POST /api/users/[id]/transactions - Create manual transaction for user
async function createUserTransactionHandler(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
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

    // Await the params Promise (Next.js 15 requirement)
    const { id } = await context.params;
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

    const transactionData = validationResult.data;

    // Verify user exists and is active
    const user = await User.findById(id);
    if (!user) {
      return apiHandler.notFound('User not found');
    }

    if (user.status !== 'Active') {
      return apiHandler.badRequest('Cannot create transactions for inactive users');
    }

    // Create transaction
    const transaction = new Transaction({
      ...transactionData,
      gateway: 'Manual', // Admin-created transactions are always manual
      status: 'Approved', // Admin transactions are auto-approved
      approvedBy: adminId,
      approvedAt: new Date(),
      metadata: {
        createdByAdmin: true,
        adminId,
        reason: transactionData.description || 'Manual transaction by admin'
      }
    });

    await transaction.save();

    // Update user balance based on transaction type
    let balanceUpdate = 0;
    switch (transactionData.type) {
      case 'deposit':
      case 'bonus':
      case 'profit':
        balanceUpdate = transactionData.amount;
        break;
      case 'withdrawal':
      case 'penalty':
        balanceUpdate = -transactionData.amount;
        break;
    }

    if (balanceUpdate !== 0) {
      await User.findByIdAndUpdate(
        id,
        { $inc: { balance: balanceUpdate } },
        { new: true }
      );
    }

    // Send notification email to user
    try {
      let emailTemplate = '';
      let emailSubject = '';

      switch (transactionData.type) {
        case 'deposit':
          emailTemplate = 'manual_deposit_credited';
          emailSubject = `Manual Deposit Credited - ${transactionData.amount} ${transactionData.currency}`;
          break;
        case 'withdrawal':
          emailTemplate = 'manual_withdrawal_processed';
          emailSubject = `Manual Withdrawal Processed - ${transactionData.amount} ${transactionData.currency}`;
          break;
        case 'bonus':
          emailTemplate = 'bonus_credited';
          emailSubject = `Bonus Credited - ${transactionData.amount} ${transactionData.currency}`;
          break;
        case 'penalty':
          emailTemplate = 'penalty_deducted';
          emailSubject = `Penalty Applied - ${transactionData.amount} ${transactionData.currency}`;
          break;
        case 'profit':
          emailTemplate = 'profit_credited';
          emailSubject = `Profit Credited - ${transactionData.amount} ${transactionData.currency}`;
          break;
      }

      if (emailTemplate) {
        await sendEmail({
          to: user.email,
          subject: emailSubject,
          templateId: emailTemplate,
          variables: {
            userName: user.name,
            amount: `${transactionData.amount} ${transactionData.currency}`,
            transactionId: transaction._id.toString(),
            transactionType: transactionData.type,
            description: transactionData.description || '',
            processedDate: new Date().toLocaleDateString(),
            newBalance: user.balance + balanceUpdate,
            accountUrl: `${process.env.NEXTAUTH_URL}/user/account`,
            supportEmail: process.env.SUPPORT_EMAIL || 'support@example.com'
          }
        });
      }
    } catch (emailError) {
      console.error('Failed to send transaction notification email:', emailError);
      // Don't fail the request if email fails
    }

    // Log audit
    await AuditLog.create({
      adminId,
      action: 'transactions.create_manual',
      entity: 'Transaction',
      entityId: transaction._id.toString(),
      status: 'Success',
      metadata: {
        userName: user.name,
        userEmail: user.email,
        transactionType: transactionData.type,
        amount: transactionData.amount,
        currency: transactionData.currency,
        balanceChange: balanceUpdate,
        newBalance: user.balance + balanceUpdate
      },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    // Populate user information for response
    await transaction.populate('userId', 'name email profilePicture');

    return apiHandler.success({
      transaction,
      balanceUpdate,
      newBalance: user.balance + balanceUpdate,
      message: `Manual ${transactionData.type} transaction created successfully`
    }, 'Transaction created successfully');

  } catch (error) {
    console.error('Create user transaction error:', error);
    return apiHandler.handleError(error);
  }
}

// Export handlers with Next.js 15 compatible context
export async function GET(request: NextRequest, context: RouteContext) {
  return withErrorHandler(getUserTransactionsHandler)(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return withErrorHandler(createUserTransactionHandler)(request, context);
}