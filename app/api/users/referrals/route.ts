import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Referral } from '@/models/Referral';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler, createPaginatedResponse } from '@/lib/api-helpers';
import { getUserFromRequest } from '@/lib/auth-helper';
import mongoose from 'mongoose';

// Validation schema for referrals query
const referralsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.enum(['date', 'amount', 'status', 'name']).default('date'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  status: z.enum(['all', 'pending', 'paid', 'cancelled']).default('all'),
  type: z.enum(['all', 'referred_by_me', 'referred_by_others']).default('referred_by_me'),
  search: z.string().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional()
});

async function getUserReferralsHandler(request: NextRequest) {
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
    
    const validationResult = referralsQuerySchema.safeParse(queryParams);
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
      type,
      search,
      dateFrom,
      dateTo
    } = validationResult.data;

    // Build aggregation pipeline
    const pipeline: mongoose.PipelineStage[] = [];

    // Match stage based on type
    const matchConditions: any = {};

    if (type === 'referred_by_me') {
      matchConditions.referrerId = userId;
    } else if (type === 'referred_by_others') {
      matchConditions.refereeId = userId;
    } else {
      // type === 'all'
      matchConditions.$or = [
        { referrerId: userId },
        { refereeId: userId }
      ];
    }

    // Status filter
    if (status !== 'all') {
      if (status === 'pending') matchConditions.status = 'Pending';
      else if (status === 'paid') matchConditions.status = 'Paid';
      else if (status === 'cancelled') matchConditions.status = 'Cancelled';
    }

    // Date range filter
    if (dateFrom || dateTo) {
      matchConditions.createdAt = {};
      if (dateFrom) matchConditions.createdAt.$gte = dateFrom;
      if (dateTo) matchConditions.createdAt.$lte = dateTo;
    }

    pipeline.push({ $match: matchConditions });

    // Lookup referrer and referee information
    pipeline.push(
      {
        $lookup: {
          from: 'users',
          localField: 'referrerId',
          foreignField: '_id',
          as: 'referrer',
          pipeline: [
            { $project: { name: 1, email: 1, referralCode: 1, profilePicture: 1, status: 1 } }
          ]
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'refereeId',
          foreignField: '_id',
          as: 'referee',
          pipeline: [
            { $project: { name: 1, email: 1, profilePicture: 1, status: 1, kycStatus: 1, createdAt: 1 } }
          ]
        }
      },
      {
        $lookup: {
          from: 'transactions',
          localField: 'transactionId',
          foreignField: '_id',
          as: 'transaction',
          pipeline: [
            { $project: { amount: 1, status: 1, createdAt: 1, transactionId: 1 } }
          ]
        }
      }
    );

    // Unwind lookups
    pipeline.push(
      { $unwind: { path: '$referrer', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$referee', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$transaction', preserveNullAndEmptyArrays: true } }
    );

    // Add computed fields
    pipeline.push({
      $addFields: {
        totalBonus: { $add: ['$bonusAmount', { $ifNull: ['$profitBonus', 0] }] },
        relationshipType: {
          $cond: [
            { $eq: ['$referrerId', userId] },
            'referred_by_me',
            'referred_by_others'
          ]
        },
        partnerUser: {
          $cond: [
            { $eq: ['$referrerId', userId] },
            '$referee',
            '$referrer'
          ]
        },
        daysSinceJoined: {
          $floor: {
            $divide: [
              { $subtract: [new Date(), '$referee.createdAt'] },
              1000 * 60 * 60 * 24
            ]
          }
        }
      }
    });

    // Search filter
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { 'partnerUser.name': { $regex: search, $options: 'i' } },
            { 'partnerUser.email': { $regex: search, $options: 'i' } },
            { bonusType: { $regex: search, $options: 'i' } }
          ]
        }
      });
    }

    // Count total documents
    const countPipeline = [...pipeline, { $count: 'total' }];

    // Sort and paginate
    const sortField = sortBy === 'date' ? 'createdAt' : 
                     sortBy === 'amount' ? 'totalBonus' : 
                     sortBy === 'name' ? 'partnerUser.name' : 'createdAt';

    pipeline.push(
      { $sort: { [sortField]: sortOrder === 'desc' ? -1 : 1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit }
    );

    // Execute queries
    const [referrals, countResult] = await Promise.all([
      Referral.aggregate(pipeline),
      Referral.aggregate(countPipeline)
    ]);

    const total = countResult[0]?.total || 0;

    // Format response data
    const formattedReferrals = referrals.map(ref => ({
      id: ref._id,
      relationshipType: ref.relationshipType,
      partnerUser: {
        id: ref.partnerUser?._id,
        name: ref.partnerUser?.name || 'Unknown',
        email: ref.partnerUser?.email || 'Unknown',
        profilePicture: ref.partnerUser?.profilePicture,
        status: ref.partnerUser?.status,
        kycStatus: ref.partnerUser?.kycStatus,
        joinedDate: ref.referee?.createdAt,
        daysSinceJoined: ref.daysSinceJoined
      },
      bonusAmount: ref.bonusAmount,
      profitBonus: ref.profitBonus || 0,
      totalBonus: ref.totalBonus,
      bonusType: ref.bonusType,
      status: ref.status,
      paidAt: ref.paidAt,
      createdAt: ref.createdAt,
      transaction: ref.transaction ? {
        id: ref.transaction._id,
        transactionId: ref.transaction.transactionId,
        amount: ref.transaction.amount,
        status: ref.transaction.status,
        createdAt: ref.transaction.createdAt
      } : null,
      metadata: ref.metadata
    }));

    // Create paginated response
    const response = createPaginatedResponse(formattedReferrals, total, page, limit);

    return apiHandler.success({
      ...response,
      filters: {
        status,
        type,
        search,
        dateFrom,
        dateTo
      }
    });

  } catch (error) {
    console.error('Error fetching user referrals:', error);
    return apiHandler.internalError('Failed to fetch user referrals');
  }
}

export const GET = withErrorHandler(getUserReferralsHandler);
