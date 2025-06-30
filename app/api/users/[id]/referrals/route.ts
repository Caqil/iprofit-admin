import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Referral } from '@/models/Referral';
import { User } from '@/models/User';
import { AuditLog } from '@/models/AuditLog';
import { authMiddleware } from '@/middleware/auth';
import { apiRateLimit } from '@/middleware/rate-limit';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler, createPaginatedResponse, createPaginationStages } from '@/lib/api-helpers';
import { urlPaginationSchema, userReferralsQuerySchema } from '@/lib/validation';
import { z } from 'zod';
import mongoose from 'mongoose';

// Route Context interface for Next.js 15
interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/users/[id]/referrals - Get referrals for a specific user
async function getUserReferralsHandler(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Apply middleware
  const authResult = await authMiddleware(request, {
    requireAuth: true,
    allowedUserTypes: ['admin'],
    requiredPermission: 'referrals.view'
  });
  if (authResult) return authResult;

  const rateLimitResult = await apiRateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    await connectToDatabase();

    // Await the params Promise (Next.js 15 requirement)
    const { id } = await context.params;

    // Validate user ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return apiHandler.badRequest('Invalid user ID format');
    }

    // Check if user exists
    const user = await User.findById(id).select('name email referralCode');
    if (!user) {
      return apiHandler.notFound('User not found');
    }

    // Parse and validate query parameters
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    const validationResult = userReferralsQuerySchema.safeParse(queryParams);

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
      bonusType
    } = validationResult.data;

    // Build aggregation pipeline
    const pipeline: mongoose.PipelineStage[] = [];

    // Match stage - find referrals where user is referrer or referee
    const matchConditions: any = {};

    if (type === 'referrer') {
      matchConditions.referrerId = new mongoose.Types.ObjectId(id);
    } else if (type === 'referee') {
      matchConditions.refereeId = new mongoose.Types.ObjectId(id);
    } else {
      // type === 'all' - find both referrer and referee relationships
      matchConditions.$or = [
        { referrerId: new mongoose.Types.ObjectId(id) },
        { refereeId: new mongoose.Types.ObjectId(id) }
      ];
    }

    // Additional filters
    if (status) matchConditions.status = status;
    if (bonusType) matchConditions.bonusType = bonusType;

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
            { $project: { name: 1, email: 1, referralCode: 1 } }
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
            { $project: { name: 1, email: 1, kycStatus: 1, status: 1 } }
          ]
        }
      },
      {
        $lookup: {
          from: 'transactions',
          localField: 'transactionId',
          foreignField: '_id',
          as: 'transaction'
        }
      }
    );

    // Unwind the lookups
    pipeline.push(
      { $unwind: { path: '$referrer', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$referee', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$transaction', preserveNullAndEmptyArrays: true } }
    );

    // Add fields to indicate relationship type
    pipeline.push({
      $addFields: {
        relationshipType: {
          $cond: [
            { $eq: ['$referrerId', new mongoose.Types.ObjectId(id)] },
            'referrer', // This user referred someone else
            'referee'   // This user was referred by someone else
          ]
        },
        totalBonus: { $add: ['$bonusAmount', { $ifNull: ['$profitBonus', 0] }] }
      }
    });

    // Project the final fields
    pipeline.push({
      $project: {
        _id: 1,
        bonusAmount: 1,
        profitBonus: 1,
        totalBonus: 1,
        status: 1,
        bonusType: 1,
        relationshipType: 1,
        metadata: 1,
        createdAt: 1,
        updatedAt: 1,
        paidAt: 1,
        referrer: {
          id: '$referrer._id',
          name: '$referrer.name',
          email: '$referrer.email',
          referralCode: '$referrer.referralCode'
        },
        referee: {
          id: '$referee._id',
          name: '$referee.name',
          email: '$referee.email',
          kycStatus: '$referee.kycStatus',
          status: '$referee.status'
        },
        transaction: {
          $cond: {
            if: { $gt: ['$transaction', null] },
            then: {
              id: '$transaction._id',
              transactionId: '$transaction.transactionId',
              status: '$transaction.status',
              processedAt: '$transaction.processedAt'
            },
            else: null
          }
        }
      }
    });

    // Add sorting
    const sortStage: mongoose.PipelineStage.Sort = {
      $sort: { [sortBy]: sortOrder === 'asc' ? 1 : -1 }
    };
    pipeline.push(sortStage);

    // Get total count for pagination
    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await Referral.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    // Add pagination
    const paginationStages = createPaginationStages(page, limit);
    pipeline.push(...paginationStages);

    // Execute the aggregation
    const referrals = await Referral.aggregate(pipeline);

    // Calculate summary statistics
    const summaryPipeline: mongoose.PipelineStage[] = [
      { $match: matchConditions },
      {
        $group: {
          _id: null,
          totalReferrals: { $sum: 1 },
          totalEarnings: { 
            $sum: { 
              $cond: [
                { $eq: ['$referrerId', new mongoose.Types.ObjectId(id)] },
                { $add: ['$bonusAmount', { $ifNull: ['$profitBonus', 0] }] },
                0
              ]
            }
          },
          pendingEarnings: { 
            $sum: { 
              $cond: [
                { 
                  $and: [
                    { $eq: ['$referrerId', new mongoose.Types.ObjectId(id)] },
                    { $eq: ['$status', 'Pending'] }
                  ]
                },
                { $add: ['$bonusAmount', { $ifNull: ['$profitBonus', 0] }] },
                0
              ]
            }
          },
          paidEarnings: { 
            $sum: { 
              $cond: [
                { 
                  $and: [
                    { $eq: ['$referrerId', new mongoose.Types.ObjectId(id)] },
                    { $eq: ['$status', 'Paid'] }
                  ]
                },
                { $add: ['$bonusAmount', { $ifNull: ['$profitBonus', 0] }] },
                0
              ]
            }
          },
          referrerCount: {
            $sum: { $cond: [{ $eq: ['$referrerId', new mongoose.Types.ObjectId(id)] }, 1, 0] }
          },
          refereeCount: {
            $sum: { $cond: [{ $eq: ['$refereeId', new mongoose.Types.ObjectId(id)] }, 1, 0] }
          }
        }
      }
    ];

    const [summary] = await Referral.aggregate(summaryPipeline);

    // Log audit
    await AuditLog.create({
      adminId: request.headers.get('x-user-id'),
      action: 'referrals.user.view',
      entity: 'Referral',
      entityId: id,
      status: 'Success',
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      metadata: {
        userId: id,
        userName: user.name,
        filters: { type, status, bonusType },
        resultCount: referrals.length
      }
    });

    // Create paginated response
    const response = createPaginatedResponse(referrals, total, page, limit);

    // Add summary data
    const enhancedResponse = {
      ...response,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        referralCode: user.referralCode
      },
      summary: {
        totalReferrals: summary?.totalReferrals || 0,
        totalEarnings: summary?.totalEarnings || 0,
        pendingEarnings: summary?.pendingEarnings || 0,
        paidEarnings: summary?.paidEarnings || 0,
        referrerCount: summary?.referrerCount || 0, // Times they referred others
        refereeCount: summary?.refereeCount || 0    // Times they were referred
      }
    };

    return apiHandler.success(enhancedResponse);

  } catch (error) {
    console.error('Error fetching user referrals:', error);
    return apiHandler.internalError('Failed to fetch user referrals');
  }
}

// Export handler with error wrapper
export const GET = withErrorHandler(getUserReferralsHandler);