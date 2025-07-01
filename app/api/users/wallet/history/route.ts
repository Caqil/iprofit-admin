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
import { getUserFromRequest } from '@/lib/auth-helper';

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
  gateway: z.enum(['CoinGate', 'UddoktaPay', 'Manual', 'System', 'all']).optional().default('all'),
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
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'amount', 'status', 'type']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  includeMetadata: z.string().optional().default('false').transform(val => val === 'true')
});

export interface TransactionHistoryItem {
  id: string;
  type: string;
  amount: number;
  currency: string;
  gateway: string;
  status: string;
  description: string;
  transactionId: string;
  fees: number;
  netAmount: number;
  balanceBefore?: number;
  balanceAfter?: number;
  createdAt: Date;
  processedAt?: Date;
  rejectionReason?: string;
  statusInfo: {
    text: string;
    color: string;
    description: string;
    canCancel: boolean;
  };
  balanceImpact: {
    direction: 'credit' | 'debit' | 'neutral';
    amount: number;
    displayText: string;
  };
  processingInfo: {
    estimatedTime?: string;
    actualTime?: string;
    isUrgent: boolean;
  };
  gatewayInfo: {
    name: string;
    type: 'crypto' | 'mobile' | 'bank' | 'manual' | 'system';
    icon?: string;
  };
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    deviceInfo?: string;
    location?: string;
  };
}

export interface WalletHistoryResponse {
  transactions: TransactionHistoryItem[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  summary: {
    totalTransactions: number;
    totalAmount: number;
    totalFees: number;
    totalNetAmount: number;
    breakdown: {
      deposits: { count: number; amount: number };
      withdrawals: { count: number; amount: number };
      bonuses: { count: number; amount: number };
      profits: { count: number; amount: number };
      penalties: { count: number; amount: number };
    };
    statusBreakdown: {
      approved: number;
      pending: number;
      rejected: number;
      processing: number;
      failed: number;
    };
  };
  filters: {
    appliedFilters: string[];
    availableFilters: {
      types: string[];
      statuses: string[];
      gateways: string[];
      dateRange: { min: Date; max: Date } | null;
    };
  };
}

// Helper functions
function getTransactionStatusInfo(status: string) {
  const statusMap: { [key: string]: { text: string; color: string; description: string; canCancel: boolean } } = {
    'Pending': {
      text: 'Pending',
      color: 'yellow',
      description: 'Awaiting admin approval',
      canCancel: true
    },
    'Approved': {
      text: 'Approved',
      color: 'green',
      description: 'Transaction completed successfully',
      canCancel: false
    },
    'Rejected': {
      text: 'Rejected',
      color: 'red',
      description: 'Transaction rejected by admin',
      canCancel: false
    },
    'Processing': {
      text: 'Processing',
      color: 'blue',
      description: 'Transaction is being processed',
      canCancel: false
    },
    'Failed': {
      text: 'Failed',
      color: 'red',
      description: 'Transaction failed during processing',
      canCancel: false
    }
  };

  return statusMap[status] || {
    text: status,
    color: 'gray',
    description: 'Unknown status',
    canCancel: false
  };
}

function calculateBalanceImpact(type: string, netAmount: number) {
  switch (type) {
    case 'deposit':
    case 'bonus':
    case 'profit':
      return {
        direction: 'credit' as const,
        amount: netAmount,
        displayText: `+${netAmount.toFixed(2)}`
      };
    case 'withdrawal':
    case 'penalty':
      return {
        direction: 'debit' as const,
        amount: Math.abs(netAmount),
        displayText: `-${Math.abs(netAmount).toFixed(2)}`
      };
    default:
      return {
        direction: 'neutral' as const,
        amount: 0,
        displayText: '0.00'
      };
  }
}

function getProcessingInfo(transaction: any) {
  const isUrgent = transaction.metadata?.urgentProcessing || false;
  
  let estimatedTime = '';
  switch (transaction.gateway) {
    case 'CoinGate':
      estimatedTime = isUrgent ? '30 minutes' : '2-6 hours';
      break;
    case 'UddoktaPay':
      estimatedTime = isUrgent ? '15 minutes' : '1-3 hours';
      break;
    case 'Manual':
      estimatedTime = isUrgent ? '2-6 hours' : '24-48 hours';
      break;
    case 'System':
      estimatedTime = 'Instant';
      break;
    default:
      estimatedTime = '1-24 hours';
  }

  let actualTime = '';
  if (transaction.processedAt && transaction.createdAt) {
    const diff = transaction.processedAt.getTime() - transaction.createdAt.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    actualTime = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  }

  return {
    estimatedTime,
    actualTime,
    isUrgent
  };
}

function getGatewayInfo(gateway: string) {
  const gatewayMap: { [key: string]: { name: string; type: 'crypto' | 'mobile' | 'bank' | 'manual' | 'system'; icon?: string } } = {
    'CoinGate': {
      name: 'CoinGate',
      type: 'crypto',
      icon: 'crypto'
    },
    'UddoktaPay': {
      name: 'UddoktaPay',
      type: 'mobile',
      icon: 'mobile'
    },
    'Manual': {
      name: 'Manual Transfer',
      type: 'bank',
      icon: 'bank'
    },
    'System': {
      name: 'System',
      type: 'system',
      icon: 'system'
    }
  };

  return gatewayMap[gateway] || {
    name: gateway,
    type: 'manual' as const,
    icon: 'default'
  };
}

function parseUserAgent(userAgent: string) {
  if (!userAgent) return null;
  
  // Simple user agent parsing
  if (userAgent.includes('Mobile')) return 'Mobile Device';
  if (userAgent.includes('Chrome')) return 'Chrome Browser';
  if (userAgent.includes('Firefox')) return 'Firefox Browser';
  if (userAgent.includes('Safari')) return 'Safari Browser';
  return 'Unknown Device';
}

function getLocationFromIP(ip: string) {
  // This would typically use a GeoIP service
  // For now, return a placeholder
  return ip === '127.0.0.1' ? 'Local' : 'Unknown Location';
}

// GET /api/user/wallet/history - Get wallet transaction history
async function getUserWalletHistoryHandler(request: NextRequest): Promise<NextResponse> {
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
    const validationResult = walletHistoryQuerySchema.safeParse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      type: searchParams.get('type'),
      status: searchParams.get('status'),
      gateway: searchParams.get('gateway'),
      dateFrom: searchParams.get('dateFrom'),
      dateTo: searchParams.get('dateTo'),
      search: searchParams.get('search'),
      sortBy: searchParams.get('sortBy'),
      sortOrder: searchParams.get('sortOrder'),
      includeMetadata: searchParams.get('includeMetadata')
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

    const { 
      page, 
      limit, 
      type, 
      status, 
      gateway,
      dateFrom, 
      dateTo, 
      search,
      sortBy, 
      sortOrder,
      includeMetadata
    } = validationResult.data;

    // Verify user exists and is active
    const user = await User.findById(userId).select('status balance');
    if (!user) {
      return apiHandler.notFound('User not found');
    }

    if (user.status !== 'Active') {
      return apiHandler.forbidden(`Account is ${user.status.toLowerCase()}`);
    }

    // Build aggregation pipeline
    const matchStage: any = { userId: new mongoose.Types.ObjectId(userId) };

    // Apply filters
    if (type !== 'all') {
      matchStage.type = type;
    }

    if (status !== 'all') {
      matchStage.status = status;
    }

    if (gateway !== 'all') {
      matchStage.gateway = gateway;
    }

    // Date range filter
    if (dateFrom || dateTo) {
      matchStage.createdAt = {};
      if (dateFrom) matchStage.createdAt.$gte = dateFrom;
      if (dateTo) matchStage.createdAt.$lte = dateTo;
    }

    // Search filter
    if (search) {
      matchStage.$or = [
        { transactionId: { $regex: search, $options: 'i' } },
        { gatewayTransactionId: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Sorting
    const sortStage: any = {};
    sortStage[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Calculate skip value
    const skip = (page - 1) * limit;

    // Execute queries in parallel
    const [transactions, totalCount, summary, availableFilters] = await Promise.all([
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
            gatewayTransactionId: 1,
            fees: 1,
            netAmount: 1,
            createdAt: 1,
            processedAt: 1,
            rejectionReason: 1,
            balanceBefore: 1,
            balanceAfter: 1,
            metadata: includeMetadata ? 1 : 0
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
                netAmount: '$netAmount'
              }
            },
            byStatus: {
              $push: {
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
            breakdown: {
              deposits: {
                count: {
                  $size: {
                    $filter: {
                      input: '$byType',
                      cond: { $eq: ['$$this.type', 'deposit'] }
                    }
                  }
                },
                amount: {
                  $sum: {
                    $map: {
                      input: {
                        $filter: {
                          input: '$byType',
                          cond: { $eq: ['$$this.type', 'deposit'] }
                        }
                      },
                      as: 'item',
                      in: '$$item.netAmount'
                    }
                  }
                }
              },
              withdrawals: {
                count: {
                  $size: {
                    $filter: {
                      input: '$byType',
                      cond: { $eq: ['$$this.type', 'withdrawal'] }
                    }
                  }
                },
                amount: {
                  $sum: {
                    $map: {
                      input: {
                        $filter: {
                          input: '$byType',
                          cond: { $eq: ['$$this.type', 'withdrawal'] }
                        }
                      },
                      as: 'item',
                      in: { $abs: '$$item.netAmount' }
                    }
                  }
                }
              },
              bonuses: {
                count: {
                  $size: {
                    $filter: {
                      input: '$byType',
                      cond: { $eq: ['$$this.type', 'bonus'] }
                    }
                  }
                },
                amount: {
                  $sum: {
                    $map: {
                      input: {
                        $filter: {
                          input: '$byType',
                          cond: { $eq: ['$$this.type', 'bonus'] }
                        }
                      },
                      as: 'item',
                      in: '$$item.netAmount'
                    }
                  }
                }
              },
              profits: {
                count: {
                  $size: {
                    $filter: {
                      input: '$byType',
                      cond: { $eq: ['$$this.type', 'profit'] }
                    }
                  }
                },
                amount: {
                  $sum: {
                    $map: {
                      input: {
                        $filter: {
                          input: '$byType',
                          cond: { $eq: ['$$this.type', 'profit'] }
                        }
                      },
                      as: 'item',
                      in: '$$item.netAmount'
                    }
                  }
                }
              },
              penalties: {
                count: {
                  $size: {
                    $filter: {
                      input: '$byType',
                      cond: { $eq: ['$$this.type', 'penalty'] }
                    }
                  }
                },
                amount: {
                  $sum: {
                    $map: {
                      input: {
                        $filter: {
                          input: '$byType',
                          cond: { $eq: ['$$this.type', 'penalty'] }
                        }
                      },
                      as: 'item',
                      in: { $abs: '$$item.netAmount' }
                    }
                  }
                }
              }
            },
            statusBreakdown: {
              approved: {
                $size: {
                  $filter: {
                    input: '$byStatus',
                    cond: { $eq: ['$$this.status', 'Approved'] }
                  }
                }
              },
              pending: {
                $size: {
                  $filter: {
                    input: '$byStatus',
                    cond: { $eq: ['$$this.status', 'Pending'] }
                  }
                }
              },
              rejected: {
                $size: {
                  $filter: {
                    input: '$byStatus',
                    cond: { $eq: ['$$this.status', 'Rejected'] }
                  }
                }
              },
              processing: {
                $size: {
                  $filter: {
                    input: '$byStatus',
                    cond: { $eq: ['$$this.status', 'Processing'] }
                  }
                }
              },
              failed: {
                $size: {
                  $filter: {
                    input: '$byStatus',
                    cond: { $eq: ['$$this.status', 'Failed'] }
                  }
                }
              }
            }
          }
        }
      ]),

      // Get available filter options
      Transaction.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId) } },
        {
          $group: {
            _id: null,
            types: { $addToSet: '$type' },
            statuses: { $addToSet: '$status' },
            gateways: { $addToSet: '$gateway' },
            minDate: { $min: '$createdAt' },
            maxDate: { $max: '$createdAt' }
          }
        }
      ])
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    // Format transactions
    const formattedTransactions: TransactionHistoryItem[] = transactions.map(tx => ({
      id: tx._id.toString(),
      type: tx.type,
      amount: tx.amount,
      currency: tx.currency || 'BDT',
      gateway: tx.gateway,
      status: tx.status,
      description: tx.description || '',
      transactionId: tx.transactionId || '',
      fees: tx.fees,
      netAmount: tx.netAmount,
      balanceBefore: tx.balanceBefore,
      balanceAfter: tx.balanceAfter,
      createdAt: tx.createdAt,
      processedAt: tx.processedAt,
      rejectionReason: tx.rejectionReason,
      
      // Enhanced information
      statusInfo: getTransactionStatusInfo(tx.status),
      balanceImpact: calculateBalanceImpact(tx.type, tx.netAmount),
      processingInfo: getProcessingInfo(tx),
      gatewayInfo: getGatewayInfo(tx.gateway),
      
      // Metadata (only if requested and available)
      ...(includeMetadata && tx.metadata && {
        metadata: {
          ipAddress: tx.metadata.ipAddress,
          userAgent: tx.metadata.userAgent,
          deviceInfo: tx.metadata.userAgent ? parseUserAgent(tx.metadata.userAgent) : undefined,
          location: tx.metadata.ipAddress ? getLocationFromIP(tx.metadata.ipAddress) : undefined
        }
      })
    }));

    // Process summary data
    const summaryData = summary[0] || {
      totalTransactions: 0,
      totalAmount: 0,
      totalFees: 0,
      totalNetAmount: 0,
      breakdown: {
        deposits: { count: 0, amount: 0 },
        withdrawals: { count: 0, amount: 0 },
        bonuses: { count: 0, amount: 0 },
        profits: { count: 0, amount: 0 },
        penalties: { count: 0, amount: 0 }
      },
      statusBreakdown: {
        approved: 0,
        pending: 0,
        rejected: 0,
        processing: 0,
        failed: 0
      }
    };

    // Process available filters
    const filterData = availableFilters[0] || {
      types: [],
      statuses: [],
      gateways: [],
      minDate: null,
      maxDate: null
    };

    // Build applied filters list
    const appliedFilters: string[] = [];
    if (type !== 'all') appliedFilters.push(`Type: ${type}`);
    if (status !== 'all') appliedFilters.push(`Status: ${status}`);
    if (gateway !== 'all') appliedFilters.push(`Gateway: ${gateway}`);
    if (dateFrom) appliedFilters.push(`From: ${dateFrom.toDateString()}`);
    if (dateTo) appliedFilters.push(`To: ${dateTo.toDateString()}`);
    if (search) appliedFilters.push(`Search: ${search}`);

    const response: WalletHistoryResponse = {
      transactions: formattedTransactions,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalCount,
        itemsPerPage: limit,
        hasNextPage,
        hasPreviousPage
      },
      summary: summaryData,
      filters: {
        appliedFilters,
        availableFilters: {
          types: filterData.types || [],
          statuses: filterData.statuses || [],
          gateways: filterData.gateways || [],
          dateRange: filterData.minDate && filterData.maxDate 
            ? { min: filterData.minDate, max: filterData.maxDate }
            : null
        }
      }
    };

    return apiHandler.success(response, 'Wallet history retrieved successfully');

  } catch (error) {
    console.error('Wallet History API Error:', error);
    return apiHandler.internalError('Failed to retrieve wallet history');
  }
}

export const GET = withErrorHandler(getUserWalletHistoryHandler);