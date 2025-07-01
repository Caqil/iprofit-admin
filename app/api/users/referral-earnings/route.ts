import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Referral } from '@/models/Referral';
import { Transaction } from '@/models/Transaction';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler, createPaginatedResponse } from '@/lib/api-helpers';
import { getUserFromRequest } from '@/lib/auth-helper';
import mongoose from 'mongoose';

// Validation schema for earnings query
const earningsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.enum(['date', 'amount', 'type']).default('date'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  status: z.enum(['all', 'pending', 'paid']).default('all'),
  bonusType: z.enum(['all', 'signup', 'profit_share']).default('all'),
  period: z.enum(['all', 'today', 'week', 'month', 'quarter', 'year']).default('all'),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional()
});

async function getUserReferralEarningsHandler(request: NextRequest) {
  const apiHandler = new ApiHandler(request);

  try {
    // Connect to database
    await connectToDatabase();

    // Get authenticated user
    const authResult = await getUserFromRequest(request);
    if (!authResult) {
      return apiHandler.unauthorized('Authentication required');
    }

    const userId = new mongoose.Types.ObjectId(authResult.userId);

    // Validate query parameters
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    
    const validationResult = earningsQuerySchema.safeParse(queryParams);
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
      status,
      bonusType,
      period,
      dateFrom,
      dateTo
    } = validationResult.data;

    // Build date filter
    let dateFilter: any = {};
    const now = new Date();

    if (period !== 'all') {
      switch (period) {
        case 'today':
          dateFilter = {
            $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
            $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
          };
          break;
        case 'week':
          const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          dateFilter = { $gte: weekStart };
          break;
        case 'month':
          dateFilter = {
            $gte: new Date(now.getFullYear(), now.getMonth(), 1)
          };
          break;
        case 'quarter':
          const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
          dateFilter = { $gte: quarterStart };
          break;
        case 'year':
          dateFilter = {
            $gte: new Date(now.getFullYear(), 0, 1)
          };
          break;
      }
    } else if (dateFrom || dateTo) {
      if (dateFrom) dateFilter.$gte = dateFrom;
      if (dateTo) dateFilter.$lte = dateTo;
    }

    // Build aggregation pipeline
    const pipeline: mongoose.PipelineStage[] = [];

    // Match referrals where user is the referrer
    const matchConditions: any = { referrerId: userId };

    if (status !== 'all') {
      if (status === 'pending') matchConditions.status = 'Pending';
      else if (status === 'paid') matchConditions.status = 'Paid';
    }

    if (bonusType !== 'all') {
      matchConditions.bonusType = bonusType;
    }

    if (Object.keys(dateFilter).length > 0) {
      matchConditions.createdAt = dateFilter;
    }

    pipeline.push({ $match: matchConditions });

    // Lookup referee information
    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'refereeId',
        foreignField: '_id',
        as: 'referee',
        pipeline: [
          { $project: { name: 1, email: 1, profilePicture: 1, createdAt: 1 } }
        ]
      }
    });

    // Lookup transaction information
    pipeline.push({
      $lookup: {
        from: 'transactions',
        localField: 'transactionId',
        foreignField: '_id',
        as: 'transaction',
        pipeline: [
          { $project: { transactionId: 1, status: 1, createdAt: 1 } }
        ]
      }
    });

    // Unwind lookups
    pipeline.push(
      { $unwind: '$referee' },
      { $unwind: { path: '$transaction', preserveNullAndEmptyArrays: true } }
    );

    // Add computed fields
    pipeline.push({
      $addFields: {
        totalEarning: { $add: ['$bonusAmount', { $ifNull: ['$profitBonus', 0] }] },
        daysSinceEarned: {
          $floor: {
            $divide: [
              { $subtract: [new Date(), '$createdAt'] },
              1000 * 60 * 60 * 24
            ]
          }
        },
        paymentStatus: {
          $switch: {
            branches: [
              { case: { $eq: ['$status', 'Paid'] }, then: 'paid' },
              { case: { $eq: ['$status', 'Pending'] }, then: 'pending' },
              { case: { $eq: ['$status', 'Cancelled'] }, then: 'cancelled' }
            ],
            default: 'unknown'
          }
        }
      }
    });

    // Count total documents
    const countPipeline = [...pipeline, { $count: 'total' }];

    // Sort and paginate
    const sortField = sortBy === 'date' ? 'createdAt' : 
                     sortBy === 'amount' ? 'totalEarning' : 
                     sortBy === 'type' ? 'bonusType' : 'createdAt';

    pipeline.push(
      { $sort: { [sortField]: sortOrder === 'desc' ? -1 : 1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit }
    );

    // Execute queries and get summary statistics
    const [earnings, countResult, summaryStats] = await Promise.all([
      Referral.aggregate(pipeline),
      Referral.aggregate(countPipeline),
      
      // Summary statistics
      Referral.aggregate([
        { $match: { referrerId: userId } },
        {
          $group: {
            _id: null,
            totalEarnings: { $sum: { $add: ['$bonusAmount', { $ifNull: ['$profitBonus', 0] }] } },
            pendingEarnings: {
              $sum: {
                $cond: [
                  { $eq: ['$status', 'Pending'] },
                  { $add: ['$bonusAmount', { $ifNull: ['$profitBonus', 0] }] },
                  0
                ]
              }
            },
            paidEarnings: {
              $sum: {
                $cond: [
                  { $eq: ['$status', 'Paid'] },
                  { $add: ['$bonusAmount', { $ifNull: ['$profitBonus', 0] }] },
                  0
                ]
              }
            },
            totalReferrals: { $sum: 1 },
            byType: {
              $push: {
                type: '$bonusType',
                amount: { $add: ['$bonusAmount', { $ifNull: ['$profitBonus', 0] }] },
                status: '$status'
              }
            }
          }
        }
      ])
    ]);

    const total = countResult[0]?.total || 0;
    const summary = summaryStats[0] || {
      totalEarnings: 0,
      pendingEarnings: 0,
      paidEarnings: 0,
      totalReferrals: 0,
      byType: []
    };

    // Calculate earnings breakdown by type
    const earningsByType = summary.byType.reduce((acc: any, item: any) => {
      if (!acc[item.type]) {
        acc[item.type] = { total: 0, pending: 0, paid: 0 };
      }
      acc[item.type].total += item.amount;
      if (item.status === 'Pending') acc[item.type].pending += item.amount;
      if (item.status === 'Paid') acc[item.type].paid += item.amount;
      return acc;
    }, {});

    // Format earnings data
    const formattedEarnings = earnings.map(earning => ({
      id: earning._id,
      referee: {
        id: earning.referee._id,
        name: earning.referee.name,
        email: earning.referee.email,
        profilePicture: earning.referee.profilePicture,
        joinedDate: earning.referee.createdAt
      },
      bonusType: earning.bonusType,
      bonusAmount: earning.bonusAmount,
      profitBonus: earning.profitBonus || 0,
      totalEarning: earning.totalEarning,
      status: earning.paymentStatus,
      paidAt: earning.paidAt,
      createdAt: earning.createdAt,
      daysSinceEarned: earning.daysSinceEarned,
      transaction: earning.transaction ? {
        id: earning.transaction._id,
        transactionId: earning.transaction.transactionId,
        status: earning.transaction.status,
        createdAt: earning.transaction.createdAt
      } : null,
      metadata: earning.metadata
    }));

    // Create paginated response
    const response = createPaginatedResponse(formattedEarnings, total, page, limit);

    return apiHandler.success({
      ...response,
      summary: {
        totalEarnings: summary.totalEarnings,
        pendingEarnings: summary.pendingEarnings,
        paidEarnings: summary.paidEarnings,
        totalReferrals: summary.totalReferrals,
        averageEarningPerReferral: summary.totalReferrals > 0 ? 
          parseFloat((summary.totalEarnings / summary.totalReferrals).toFixed(2)) : 0,
        earningsByType
      },
      filters: {
        status,
        bonusType,
        period,
        dateFrom,
        dateTo
      }
    });

  } catch (error) {
    console.error('Error fetching referral earnings:', error);
    return apiHandler.internalError('Failed to fetch referral earnings');
  }
}

export const GET = withErrorHandler(getUserReferralEarningsHandler);