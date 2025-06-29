import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { User, IUser } from '@/models/User';
import { Plan } from '@/models/Plan';
import { AuditLog } from '@/models/AuditLog';
import { authMiddleware } from '@/middleware/auth';
import { apiRateLimit } from '@/middleware/rate-limit';
import { deviceCheckMiddleware } from '@/middleware/device-check';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler, createPaginatedResponse, createMatchStage, createSortStage, createPaginationStages } from '@/lib/api-helpers';
import { generateReferralCode } from '@/lib/utils';
import { sendEmail } from '@/lib/email';
import { userCreateSchema, paginationSchema, dateRangeSchema } from '@/lib/validation';
import { objectIdValidator } from '@/utils/validators';
import { UserFilter, PaginationParams } from '@/types';
import { z } from 'zod';
import mongoose from 'mongoose';

// User list query validation schema
const userListQuerySchema = paginationSchema.extend({
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  
  // Search and filters
  search: z.string().optional(),
  status: z.enum(['Active', 'Suspended', 'Banned']).optional(),
  kycStatus: z.enum(['Pending', 'Approved', 'Rejected']).optional(),
  planId: objectIdValidator.optional(),
  hasReferrals: z.string().transform(Boolean).optional(),
  minBalance: z.string().transform(Number).pipe(z.number().min(0)).optional(),
  maxBalance: z.string().transform(Number).pipe(z.number().min(0)).optional(),
  emailVerified: z.string().transform(Boolean).optional(),
  phoneVerified: z.string().transform(Boolean).optional(),
  twoFactorEnabled: z.string().transform(Boolean).optional()
}).merge(dateRangeSchema);

// Enhanced user creation schema with additional fields
const userCreateExtendedSchema = userCreateSchema.extend({
  address: z.object({
    street: z.string().min(5).max(200),
    city: z.string().min(2).max(100),
    state: z.string().min(2).max(100),
    country: z.string().min(2).max(100),
    zipCode: z.string().min(3).max(20)
  }).optional(),
  dateOfBirth: z.string().datetime().optional(),
  initialBalance: z.number().min(0).optional().default(0)
});

// GET /api/users - List all users with filtering and pagination
async function getUsersHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Apply middleware
  const authResult = await authMiddleware(request, {
    requireAuth: true,
    allowedUserTypes: ['admin'],
    requiredPermission: 'users.view'
  });
  if (authResult) return authResult;

  const rateLimitResult = await apiRateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    await connectToDatabase();

    // Parse and validate query parameters
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    const validationResult = userListQuerySchema.safeParse(queryParams);

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
      search,
      status,
      kycStatus,
      planId,
      dateFrom,
      dateTo,
      hasReferrals,
      minBalance,
      maxBalance,
      emailVerified,
      phoneVerified,
      twoFactorEnabled
    } = validationResult.data;

    // Build aggregation pipeline
    const pipeline: any[] = [];

    // Match stage for filtering
    const matchConditions: any = {};

    if (search) {
      matchConditions.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { referralCode: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) matchConditions.status = status;
    if (kycStatus) matchConditions.kycStatus = kycStatus;
    if (planId) matchConditions.planId = new mongoose.Types.ObjectId(planId);
    if (emailVerified !== undefined) matchConditions.emailVerified = emailVerified;
    if (phoneVerified !== undefined) matchConditions.phoneVerified = phoneVerified;
    if (twoFactorEnabled !== undefined) matchConditions.twoFactorEnabled = twoFactorEnabled;
    
    if (minBalance !== undefined || maxBalance !== undefined) {
      matchConditions.balance = {};
      if (minBalance !== undefined) matchConditions.balance.$gte = minBalance;
      if (maxBalance !== undefined) matchConditions.balance.$lte = maxBalance;
    }

    if (dateFrom || dateTo) {
      matchConditions.createdAt = {};
      if (dateFrom) matchConditions.createdAt.$gte = new Date(dateFrom);
      if (dateTo) matchConditions.createdAt.$lte = new Date(dateTo);
    }

    if (hasReferrals !== undefined) {
      if (hasReferrals) {
        matchConditions.referredBy = { $exists: true, $ne: null };
      } else {
        matchConditions.referredBy = { $exists: false };
      }
    }

    pipeline.push({ $match: matchConditions });

    // Lookup plan information
    pipeline.push({
      $lookup: {
        from: 'plans',
        localField: 'planId',
        foreignField: '_id',
        as: 'plan'
      }
    });

    pipeline.push({
      $unwind: {
        path: '$plan',
        preserveNullAndEmptyArrays: true
      }
    });

    // Lookup referral statistics
    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'referralCode',
        foreignField: 'referredBy',
        as: 'referrals'
      }
    });

    // Add computed fields
    pipeline.push({
      $addFields: {
        referralCount: { $size: '$referrals' },
        accountAge: {
          $divide: [
            { $subtract: [new Date(), '$createdAt'] },
            1000 * 60 * 60 * 24 // Convert to days
          ]
        },
        isNewUser: {
          $lte: [
            { $divide: [{ $subtract: [new Date(), '$createdAt'] }, 1000 * 60 * 60 * 24] },
            7 // New if less than 7 days old
          ]
        }
      }
    });

    // Get total count for pagination
    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await User.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    // Add sorting
    pipeline.push(createSortStage(sortBy, sortOrder));

    // Add pagination
    pipeline.push(...createPaginationStages(page, limit));

    // Project final fields
    pipeline.push({
      $project: {
        _id: 1,
        name: 1,
        email: 1,
        phone: 1,
        balance: 1,
        status: 1,
        kycStatus: 1,
        referralCode: 1,
        referredBy: 1,
        profilePicture: 1,
        emailVerified: 1,
        phoneVerified: 1,
        twoFactorEnabled: 1,
        lastLogin: 1,
        createdAt: 1,
        updatedAt: 1,
        referralCount: 1,
        accountAge: 1,
        isNewUser: 1,
        'plan._id': 1,
        'plan.name': 1,
        'plan.type': 1,
        'plan.color': 1
      }
    });

    const users = await User.aggregate(pipeline);

    const paginatedResponse = createPaginatedResponse(users, total, page, limit);

    // Log audit
    await AuditLog.create({
      adminId: request.headers.get('x-user-id'),
      action: 'users.list',
      entity: 'User',
      status: 'Success',
      metadata: {
        filters: { search, status, kycStatus, planId },
        resultCount: users.length,
        totalCount: total
      },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return apiHandler.success(paginatedResponse);

  } catch (error) {
    return apiHandler.handleError(error);
  }
}

async function createUserHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Apply middleware
  const authResult = await authMiddleware(request, {
    requireAuth: true,
    allowedUserTypes: ['admin'],
    requiredPermission: 'users.create'
  });
  if (authResult) return authResult;

  const rateLimitResult = await apiRateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  const deviceCheckResult = await deviceCheckMiddleware(request);
  if (deviceCheckResult) return deviceCheckResult;

  try {
    await connectToDatabase();

    const body = await request.json();
    const validationResult = userCreateExtendedSchema.safeParse(body);

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
      name,
      email,
      phone,
      planId,
      deviceId,
      referralCode,
      address,
      dateOfBirth,
      initialBalance
    } = validationResult.data;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { email },
        { phone },
        { deviceId }
      ]
    });

    if (existingUser) {
      const duplicateField = existingUser.email === email ? 'email' :
                            existingUser.phone === phone ? 'phone' : 'device';
      return apiHandler.conflict(`User with this ${duplicateField} already exists`);
    }

    // Validate plan exists
    const plan = await Plan.findById(planId);
    if (!plan) {
      return apiHandler.badRequest('Invalid plan ID');
    }

    // Validate referral code if provided
    let referrerUser = null;
    if (referralCode) {
      referrerUser = await User.findOne({ referralCode });
      if (!referrerUser) {
        return apiHandler.badRequest('Invalid referral code');
      }
    }

    // Generate unique referral code for new user
    let newReferralCode: string;
    do {
      newReferralCode = generateReferralCode();
    } while (await User.findOne({ referralCode: newReferralCode }));

    // Create user
    const userData = {
      name,
      email,
      phone,
      planId: new mongoose.Types.ObjectId(planId),
      balance: initialBalance || 0,
      kycStatus: 'Pending' as const,
      kycDocuments: [],
      referralCode: newReferralCode,
      referredBy: referralCode || undefined,
      deviceId,
      address,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      status: 'Active' as const,
      loginAttempts: 0,
      emailVerified: false,
      phoneVerified: false,
      twoFactorEnabled: false
    };

    const newUser = await User.create(userData);

    // Populate plan information
    await newUser.populate('planId', 'name type description features pricing');

    // Send welcome email
    try {
      await sendEmail({
        to: email,
        templateId: 'welcome',
        subject: 'Welcome to Financial Admin Panel',
        variables: {
          name,
          referralCode: newReferralCode,
          planName: plan.name,
          loginUrl: process.env.NEXTAUTH_URL + '/user/login'
        }
      });
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail the user creation if email fails
    }

    // Log audit
    await AuditLog.create({
      adminId: request.headers.get('x-user-id'),
      action: 'users.create',
      entity: 'User',
      entityId: newUser._id.toString(),
      status: 'Success',
      metadata: {
        userName: name,
        userEmail: email,
        planId,
        referralCode: referralCode || null,
        hasAddress: !!address
      },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return apiHandler.created({
      user: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        balance: newUser.balance,
        status: newUser.status,
        kycStatus: newUser.kycStatus,
        referralCode: newUser.referralCode,
        referredBy: newUser.referredBy,
        emailVerified: newUser.emailVerified,
        phoneVerified: newUser.phoneVerified,
        twoFactorEnabled: newUser.twoFactorEnabled,
        createdAt: newUser.createdAt,
        plan: newUser.planId
      }
    });

  } catch (error) {
    return apiHandler.handleError(error);
  }
}

export async function GET(request: NextRequest) {
  return withErrorHandler(getUsersHandler)(request);
}

export async function POST(request: NextRequest) {
  return withErrorHandler(createUserHandler)(request);
}