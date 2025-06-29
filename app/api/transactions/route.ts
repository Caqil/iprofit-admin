// app/api/transactions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Transaction, ITransaction } from '@/models/Transaction';
import { User } from '@/models/User';
import { AuditLog } from '@/models/AuditLog';
import { authMiddleware } from '@/middleware/auth';
import { apiRateLimit } from '@/middleware/rate-limit';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler, createPaginatedResponse, createPaginationStages } from '@/lib/api-helpers';


import { paginationSchema, dateRangeSchema } from '@/lib/validation';
import { TransactionFilter, TransactionSummary } from '@/types/transaction';
import { z } from 'zod';
import mongoose from 'mongoose';
// Helper to create a properly typed $sort stage for Mongoose aggregation
function createSortStage(sortBy: string, sortOrder: string): mongoose.PipelineStage.Sort {
  return {
    $sort: {
      [sortBy]: sortOrder === 'asc' ? 1 : -1
    }
  };
}
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

    // Search filter - Enhanced to include user name and email
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
      
      // Lookup user information - Enhanced with more user details
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
          pipeline: [
            {
              $project: {
                _id: 1,
                name: 1,
                email: 1,
                phone: 1,
                profilePicture: 1,
                status: 1
              }
            }
          ]
        }
      },
      
      // Unwind user array to object
      {
        $unwind: {
          path: '$user',
          preserveNullAndEmptyArrays: true
        }
      },
      
      // Lookup admin information for approvedBy field
      {
        $lookup: {
          from: 'admins',
          localField: 'approvedBy',
          foreignField: '_id',
          as: 'approvedByAdmin',
          pipeline: [
            {
              $project: {
                _id: 1,
                name: 1,
                email: 1
              }
            }
          ]
        }
      },
      
      // Unwind approvedBy array to object (optional)
      {
        $unwind: {
          path: '$approvedByAdmin',
          preserveNullAndEmptyArrays: true
        }
      },

      // If search includes user name/email, add additional matching after lookup
      ...(search ? [
        {
          $match: {
            $or: [
              { transactionId: { $regex: search, $options: 'i' } },
              { gatewayTransactionId: { $regex: search, $options: 'i' } },
              { description: { $regex: search, $options: 'i' } },
              { 'user.name': { $regex: search, $options: 'i' } },
              { 'user.email': { $regex: search, $options: 'i' } }
            ]
          }
        }
      ] : []),
      
      // Add computed fields for better frontend usage
      {
        $addFields: {
          // Keep original userId for compatibility
          originalUserId: '$userId',
          // Add formatted user display name
          userDisplayName: {
            $cond: [
              { $ne: ['$user', null] },
              '$user.name',
              'Unknown User'
            ]
          },
          // Add user subtitle (userId)
          userSubtitle: {
            $toString: '$userId'
          }
        }
      },
      
      // Count total documents for pagination
      {
        $facet: {
          data: [
            createSortStage(sortBy, sortOrder),
            { $skip: (page - 1) * limit },
            { $limit: limit }
          ],
          totalCount: [
            { $count: 'count' }
          ],
          summary: [
            {
              $group: {
                _id: null,
                totalTransactions: { $sum: 1 },
                totalDeposits: {
                  $sum: {
                    $cond: [{ $eq: ['$type', 'deposit'] }, '$amount', 0]
                  }
                },
                totalWithdrawals: {
                  $sum: {
                    $cond: [{ $eq: ['$type', 'withdrawal'] }, '$amount', 0]
                  }
                },
                totalFees: { $sum: '$fees' },
                pendingAmount: {
                  $sum: {
                    $cond: [{ $eq: ['$status', 'Pending'] }, '$amount', 0]
                  }
                },
                approvedAmount: {
                  $sum: {
                    $cond: [{ $eq: ['$status', 'Approved'] }, '$amount', 0]
                  }
                },
                rejectedAmount: {
                  $sum: {
                    $cond: [{ $eq: ['$status', 'Rejected'] }, '$amount', 0]
                  }
                },
                approvedTransactions: {
                  $sum: {
                    $cond: [{ $eq: ['$status', 'Approved'] }, 1, 0]
                  }
                },
                pendingTransactions: {
                  $sum: {
                    $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0]
                  }
                },
                rejectedTransactions: {
                  $sum: {
                    $cond: [{ $eq: ['$status', 'Rejected'] }, 1, 0]
                  }
                }
              }
            }
          ]
        }
      }
    ];

    const [result] = await Transaction.aggregate(pipeline);
    const transactions = result.data || [];
    const total = result.totalCount[0]?.count || 0;
    const summary = result.summary[0] || {
      totalTransactions: 0,
      totalDeposits: 0,
      totalWithdrawals: 0,
      totalFees: 0,
      pendingAmount: 0,
      approvedAmount: 0,
      rejectedAmount: 0,
      approvedTransactions: 0,
      pendingTransactions: 0,
      rejectedTransactions: 0
    };

    // Calculate success rate
    const successRate = summary.totalTransactions > 0 
      ? (summary.approvedTransactions / summary.totalTransactions) * 100 
      : 0;

    const paginatedResponse = createPaginatedResponse(transactions, total, page, limit);

    // Log audit
    await AuditLog.create({
      adminId: request.headers.get('x-user-id'),
      action: 'transactions.view_list',
      entity: 'Transaction',
      status: 'Success',
      metadata: {
        filters: { type, status, gateway, currency, userId, search },
        resultCount: transactions.length,
        page,
        limit
      },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return apiHandler.success({
      ...paginatedResponse,
      summary: {
        ...summary,
        successRate: Math.round(successRate * 100) / 100
      }
    });

  } catch (error) {
    console.error('Error fetching transactions:', error);
    return apiHandler.handleError(error);
  }
}

export const GET = withErrorHandler(getTransactionsHandler);