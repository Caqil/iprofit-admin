import { ApiHandler } from '@/lib/api-helpers';
import { withErrorHandler } from '@/middleware/error-handler';
import { AuditLog } from '@/models/AuditLog';
import { Transaction } from '@/models/Transaction';
import { NextRequest } from 'next/server';

async function getTransactionsSummaryHandler(request: NextRequest) {
   const apiHandler = ApiHandler.create(request);
  try {
    const { searchParams } = new URL(request.url);
     
    // Extract filters from query params
    const type = searchParams.get('type') || undefined;
    const status = searchParams.get('status') || undefined;
    const gateway = searchParams.get('gateway') || undefined;
    const currency = searchParams.get('currency') || undefined;
    const userId = searchParams.get('userId') || undefined;
    const search = searchParams.get('search') || undefined;

    // Build match conditions
    const matchConditions: any = {};
    
    if (type) matchConditions.type = type;
    if (status) matchConditions.status = status;
    if (gateway) matchConditions.gateway = gateway;
    if (currency) matchConditions.currency = currency;
    if (userId) matchConditions.userId = userId;
    
    if (search) {
      matchConditions.$or = [
        { transactionId: { $regex: search, $options: 'i' } },
        { 'user.name': { $regex: search, $options: 'i' } },
        { 'user.email': { $regex: search, $options: 'i' } }
      ];
    }

    // Aggregation pipeline for summary only
    const pipeline = [
      { $match: matchConditions },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $facet: {
          summary: [
            {
              $group: {
                _id: null,
                totalTransactions: { $sum: 1 },
                totalAmount: { $sum: '$amount' },
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
    const summary = result.summary[0] || {
      totalTransactions: 0,
      totalAmount: 0,
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

    // Log audit
    await AuditLog.create({
      adminId: request.headers.get('x-user-id'),
      action: 'transactions.view_summary',
      entity: 'Transaction',
      status: 'Success',
      metadata: {
        filters: { type, status, gateway, currency, userId, search }
      },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return apiHandler.success({
      ...summary,
      successRate: Math.round(successRate * 100) / 100
    });

  } catch (error) {
    console.error('Error fetching transaction summary:', error);
    return apiHandler.handleError(error);
  }
}

export const GET = withErrorHandler(getTransactionsSummaryHandler);