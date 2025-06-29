import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Referral, IReferral } from '@/models/Referral';
import { User } from '@/models/User';
import { Transaction } from '@/models/Transaction';
import { AuditLog } from '@/models/AuditLog';
import { authMiddleware } from '@/middleware/auth';
import { apiRateLimit } from '@/middleware/rate-limit';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler, createPaginatedResponse, createPaginationStages } from '@/lib/api-helpers';
import { paginationSchema, dateRangeSchema, referralListQuerySchema, createReferralSchema } from '@/lib/validation';
import { ReferralOverview, TopReferrer } from '@/types/referral';
import { z } from 'zod';
import mongoose from 'mongoose';


// GET /api/referrals - List referrals with filtering and pagination
async function getReferralsHandler(request: NextRequest): Promise<NextResponse> {
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

    // Parse and validate query parameters
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    const validationResult = referralListQuerySchema.safeParse(queryParams);

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
      referrerId,
      refereeId,
      amountMin,
      amountMax,
      dateFrom,
      dateTo,
      search
    } = validationResult.data;

    // Build aggregation pipeline
    const pipeline: mongoose.PipelineStage[] = [];

    // Match stage for filtering
    const matchConditions: any = {};

    if (status) matchConditions.status = status;
    if (bonusType) matchConditions.bonusType = bonusType;
    if (referrerId) matchConditions.referrerId = new mongoose.Types.ObjectId(referrerId);
    if (refereeId) matchConditions.refereeId = new mongoose.Types.ObjectId(refereeId);

    // Amount range filter
    if (amountMin !== undefined || amountMax !== undefined) {
      matchConditions.bonusAmount = {};
      if (amountMin !== undefined) matchConditions.bonusAmount.$gte = amountMin;
      if (amountMax !== undefined) matchConditions.bonusAmount.$lte = amountMax;
    }

    // Date range filter
    if (dateFrom || dateTo) {
      matchConditions.createdAt = {};
      if (dateFrom) matchConditions.createdAt.$gte = new Date(dateFrom);
      if (dateTo) matchConditions.createdAt.$lte = new Date(dateTo);
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
      { $unwind: { path: '$referrer', preserveNullAndEmptyArrays: false } },
      { $unwind: { path: '$referee', preserveNullAndEmptyArrays: false } },
      { $unwind: { path: '$transaction', preserveNullAndEmptyArrays: true } }
    );

    // Search functionality
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { 'referrer.name': { $regex: search, $options: 'i' } },
            { 'referrer.email': { $regex: search, $options: 'i' } },
            { 'referee.name': { $regex: search, $options: 'i' } },
            { 'referee.email': { $regex: search, $options: 'i' } },
            { 'referrer.referralCode': { $regex: search, $options: 'i' } }
          ]
        }
      });
    }

    // Project the final fields
    pipeline.push({
      $project: {
        _id: 1,
        bonusAmount: 1,
        profitBonus: 1,
        status: 1,
        bonusType: 1,
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

    // Log audit
    await AuditLog.create({
      adminId: request.headers.get('x-user-id'),
      action: 'referrals.list',
      entity: 'Referral',
      status: 'Success',
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      metadata: {
        filters: { status, bonusType, referrerId, refereeId, search },
        resultCount: referrals.length
      }
    });

    // Create paginated response
    const response = createPaginatedResponse(referrals, total, page, limit);

    return apiHandler.success(response);

  } catch (error) {
    console.error('Error fetching referrals:', error);
    return apiHandler.internalError('Failed to fetch referrals');
  }
}

// POST /api/referrals - Create a new referral (admin only)
async function createReferralHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Apply middleware
  const authResult = await authMiddleware(request, {
    requireAuth: true,
    allowedUserTypes: ['admin'],
    requiredPermission: 'referrals.create'
  });
  if (authResult) return authResult;

  const rateLimitResult = await apiRateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    await connectToDatabase();

    const adminId = request.headers.get('x-user-id');
    const body = await request.json();

    // Validate request body
    const validationResult = createReferralSchema.safeParse(body);
    if (!validationResult.success) {
      return apiHandler.validationError(
        validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      );
    }

    const { referrerId, refereeId, bonusAmount, bonusType, profitBonus, metadata } = validationResult.data;

    // Verify both users exist
    const [referrer, referee] = await Promise.all([
      User.findById(referrerId).select('name email referralCode'),
      User.findById(refereeId).select('name email referredBy')
    ]);

    if (!referrer) {
      return apiHandler.notFound('Referrer not found');
    }

    if (!referee) {
      return apiHandler.notFound('Referee not found');
    }

    // Check if referral already exists
    const existingReferral = await Referral.findOne({
      referrerId: new mongoose.Types.ObjectId(referrerId),
      refereeId: new mongoose.Types.ObjectId(refereeId),
      bonusType
    });

    if (existingReferral) {
      return apiHandler.conflict('Referral already exists for this user and bonus type');
    }

    // Create the referral
    const referral = new Referral({
      referrerId: new mongoose.Types.ObjectId(referrerId),
      refereeId: new mongoose.Types.ObjectId(refereeId),
      bonusAmount,
      bonusType,
      profitBonus: profitBonus || 0,
      status: 'Pending',
      metadata: metadata ? {
        ...metadata,
        refereeFirstDepositDate: metadata.refereeFirstDepositDate ? new Date(metadata.refereeFirstDepositDate) : undefined
      } : undefined
    });

    await referral.save();

    // Populate the referral with user details
    await referral.populate([
      { path: 'referrerId', select: 'name email referralCode' },
      { path: 'refereeId', select: 'name email kycStatus status' }
    ]);

    // Log audit
    await AuditLog.create({
      adminId,
      action: 'referrals.create',
      entity: 'Referral',
      entityId: referral._id.toString(),
      newData: {
        referrerId,
        refereeId,
        bonusAmount,
        bonusType,
        profitBonus
      },
      status: 'Success',
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return apiHandler.created({
      id: referral._id,
      referrerId: referral.referrerId,
      refereeId: referral.refereeId,
      bonusAmount: referral.bonusAmount,
      bonusType: referral.bonusType,
      profitBonus: referral.profitBonus,
      status: referral.status,
      metadata: referral.metadata,
      createdAt: referral.createdAt,
      updatedAt: referral.updatedAt
    });

  } catch (error) {
    console.error('Error creating referral:', error);
    return apiHandler.internalError('Failed to create referral');
  }
}

// Export handlers with error wrapper
export const GET = withErrorHandler(getReferralsHandler);
export const POST = withErrorHandler(createReferralHandler);