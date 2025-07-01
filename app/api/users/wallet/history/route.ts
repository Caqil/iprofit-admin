// app/api/user/wallet/history/route.ts
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

// Wallet history query validation schema
const walletHistoryQuerySchema = z.object({
  page: z.string().optional().default('1').transform(val => {
    const num = parseInt(val, 10);
    return isNaN(num) || num < 1 ? 1 : num;
  }),
  limit: z.string().optional().default('20').transform(val => {
    const num = parseInt(val, 10);
    return isNaN(num) || num < 1 ? 20 : Math.min(num, 100);
  }),
  type: z.enum(['deposit', 'withdrawal', 'bonus', 'profit', 'penalty', 'all']).optional().default('all'),
  status: z.enum(['Pending', 'Approved', 'Rejected', 'Processing', 'Failed', 'all']).optional().default('all'),
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
  sortBy: z.enum(['createdAt', 'amount', 'status']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
});

// GET /api/user/wallet/history - Get wallet transaction history
async function getUserWalletHistoryHandler(request: NextRequest): Promise<NextResponse> {
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
    const validationResult = walletHistoryQuerySchema.safeParse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      type: searchParams.get('type'),
      status: searchParams.get('status'),
      dateFrom: searchParams.get('dateFrom'),
      dateTo: searchParams.get('dateTo'),
      sortBy: searchParams.get('sortBy'),
      sortOrder: searchParams.get('sortOrder')
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

    const { page, limit, type, status, dateFrom, dateTo, sortBy, sortOrder } = validationResult.data;

    // Verify user exists and is active
    const user = await User.findById(userId).select('status');
    if (!user) {
      return apiHandler.notFound('User not found');
    }

    if (user.status !== 'Active') {
      return apiHandler.forbidden(`Account is ${user.status.toLowerCase()}`);
    }

    // Build aggregation pipeline
    const matchStage: any = { userId: new mongoose.Types.ObjectId(userId) };

    // Filter by transaction type
    if (type !== 'all') {
      matchStage.type = type;
    }

    // Filter by status
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

    // Execute aggregation pipeline
    const [transactions, totalCount, summary] = await Promise.all([
      // Get paginated transactions
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
            gateway: 1,
            status: 1,
            description: 1,
            transactionId: 1,
            fees: 1,
            netAmount: 1,
            createdAt: 1,
            processedAt: 1,
            rejectionReason: 1,
            metadata: {
              ipAddress: 1,
              userAgent: 1
            },
            balanceBefore: 1,
            balanceAfter: 1
          }
        }
      ]),

      // Get total count for pagination
      Transaction.countDocuments(matchStage),

      // Get summary statistics for the filtered results
      Transaction.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalTransactions: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
            totalFees: { $sum: '$fees' },
            totalNetAmount: { $sum: '$netAmount' },
            byType: {
              $push: {
                type: '$type',
                amount: '$amount',
                status: '$status'
              }
            }
          }
        },
        {
          $project: {
            totalTransactions: 1,
            totalAmount: 1,
            totalFees: 1,
            totalNetAmount: 1,
            deposits: {
              $size: {
                $filter: {
                  input: '$byType',
                  cond: { $eq: ['$$this.type', 'deposit'] }
                }
              }
            },
            withdrawals: {
              $size: {
                $filter: {
                  input: '$byType',
                  cond: { $eq: ['$$this.type', 'withdrawal'] }
                }
              }
            },
            bonuses: {
              $size: {
                $filter: {
                  input: '$byType',
                  cond: { $eq: ['$$this.type', 'bonus'] }
                }
              }
            },
            profits: {
              $size: {
                $filter: {
                  input: '$byType',
                  cond: { $eq: ['$$this.type', 'profit'] }
                }
              }
            },
            approvedCount: {
              $size: {
                $filter: {
                  input: '$byType',
                  cond: { $eq: ['$$this.status', 'Approved'] }
                }
              }
            },
            pendingCount: {
              $size: {
                $filter: {
                  input: '$byType',
                  cond: { $eq: ['$$this.status', 'Pending'] }
                }
              }
            }
          }
        }
      ])
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    // Format transactions
    const formattedTransactions = transactions.map(tx => ({
      id: tx._id.toString(),
      type: tx.type,
      amount: tx.amount,
      currency: tx.currency || 'BDT',
      gateway: tx.gateway,
      status: tx.status,
      description: tx.description,
      transactionId: tx.transactionId,
      fees: tx.fees,
      netAmount: tx.netAmount,
      balanceBefore: tx.balanceBefore,
      balanceAfter: tx.balanceAfter,
      createdAt: tx.createdAt,
      processedAt: tx.processedAt,
      rejectionReason: tx.rejectionReason,
      
      // Status information
      statusInfo: getTransactionStatusInfo(tx.status),
      
      // Impact on balance
      balanceImpact: calculateBalanceImpact(tx.type, tx.netAmount),
      
      // Processing information
      processingInfo: getProcessingInfo(tx),
      
      // Gateway information
      gatewayInfo: getGatewayInfo(tx.gateway),
      
      // Metadata (limited for user)
      metadata: {
        device: tx.metadata?.userAgent ? parseUserAgent(tx.metadata.userAgent) : null,
        ipLocation: tx.metadata?.ipAddress ? maskIpAddress(tx.metadata.ipAddress) : null
      }
    }));

    // Summary information
    const summaryData = summary[0] || {
      totalTransactions: 0,
      totalAmount: 0,
      totalFees: 0,
      totalNetAmount: 0,
      deposits: 0,
      withdrawals: 0,
      bonuses: 0,
      profits: 0,
      approvedCount: 0,
      pendingCount: 0
    };

    const response = {
      transactions: formattedTransactions,
      
      // Pagination
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage,
        hasPreviousPage,
        limit,
        skip
      },

      // Summary for current filter
      summary: {
        ...summaryData,
        successRate: summaryData.totalTransactions > 0 
          ? Math.round((summaryData.approvedCount / summaryData.totalTransactions) * 100) 
          : 0,
        averageAmount: summaryData.totalTransactions > 0 
          ? summaryData.totalAmount / summaryData.totalTransactions 
          : 0,
        averageFees: summaryData.totalTransactions > 0 
          ? summaryData.totalFees / summaryData.totalTransactions 
          : 0
      },

      // Filter information
      filters: {
        type: type === 'all' ? 'all' : type,
        status: status === 'all' ? 'all' : status,
        dateFrom,
        dateTo,
        sortBy,
        sortOrder
      },

      // Last updated
      lastUpdated: new Date().toISOString()
    };

    return apiHandler.success(response);

  } catch (error) {
    console.error('Get wallet history error:', error);
    return apiHandler.internalError('Failed to get wallet history');
  }
}

// Helper functions
function getTransactionStatusInfo(status: string) {
  const statusMap = {
    'Pending': { color: 'yellow', description: 'Awaiting approval', canCancel: true },
    'Approved': { color: 'green', description: 'Completed successfully', canCancel: false },
    'Rejected': { color: 'red', description: 'Rejected by admin', canCancel: false },
    'Processing': { color: 'blue', description: 'Being processed', canCancel: false },
    'Failed': { color: 'red', description: 'Processing failed', canCancel: false }
  };

  return statusMap[status as keyof typeof statusMap] || {
    color: 'gray',
    description: 'Unknown status',
    canCancel: false
  };
}

function calculateBalanceImpact(type: string, netAmount: number) {
  const isCredit = ['deposit', 'bonus', 'profit'].includes(type);
  const isDebit = ['withdrawal', 'penalty'].includes(type);

  return {
    type: isCredit ? 'credit' : isDebit ? 'debit' : 'neutral',
    amount: netAmount,
    sign: isCredit ? '+' : isDebit ? '-' : ''
  };
}

function getProcessingInfo(transaction: any) {
  const processingTime = transaction.processedAt && transaction.createdAt
    ? Math.floor((new Date(transaction.processedAt).getTime() - new Date(transaction.createdAt).getTime()) / (1000 * 60))
    : null;

  return {
    processingTimeMinutes: processingTime,
    isInstant: processingTime !== null && processingTime < 5,
    estimatedTime: getEstimatedProcessingTime(transaction.gateway, transaction.type)
  };
}

function getGatewayInfo(gateway: string) {
  const gatewayMap = {
    'CoinGate': { name: 'CoinGate', type: 'crypto', description: 'Cryptocurrency payment' },
    'UddoktaPay': { name: 'UddoktaPay', type: 'mobile', description: 'Mobile banking' },
    'Manual': { name: 'Manual', type: 'manual', description: 'Manual processing' },
    'System': { name: 'System', type: 'system', description: 'System generated' }
  };

  return gatewayMap[gateway as keyof typeof gatewayMap] || {
    name: gateway,
    type: 'unknown',
    description: 'Unknown gateway'
  };
}

function getEstimatedProcessingTime(gateway: string, type: string): string {
  if (type === 'deposit') {
    switch (gateway) {
      case 'CoinGate': return '10-30 minutes';
      case 'UddoktaPay': return '5-15 minutes';
      case 'System': return 'Instant';
      default: return '1-24 hours';
    }
  } else if (type === 'withdrawal') {
    switch (gateway) {
      case 'Manual': return '1-3 business days';
      default: return '2-5 business days';
    }
  }
  
  return 'Instant';
}

function parseUserAgent(userAgent: string): string {
  // Simple user agent parsing for device info
  if (userAgent.includes('Mobile')) return 'Mobile';
  if (userAgent.includes('Tablet')) return 'Tablet';
  return 'Desktop';
}

function maskIpAddress(ip: string): string {
  // Mask IP address for privacy (show only first two octets)
  const parts = ip.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.xxx.xxx`;
  }
  return 'xxx.xxx.xxx.xxx';
}

export const GET = withErrorHandler(getUserWalletHistoryHandler);