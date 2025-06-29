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
import { userCreateSchema } from '@/lib/validation';
import { objectIdValidator } from '@/utils/validators';
import { UserFilter, PaginationParams } from '@/types';
import { z } from 'zod';
import mongoose from 'mongoose';

// FIXED: User list query validation schema - Proper URL parameter handling
const userListQuerySchema = z.object({
  // Pagination - URL params are always strings
  page: z.string().optional().default('1').transform(val => {
    const num = parseInt(val, 10);
    return isNaN(num) || num < 1 ? 1 : num;
  }),
  limit: z.string().optional().default('10').transform(val => {
    const num = parseInt(val, 10);
    return isNaN(num) || num < 1 ? 10 : Math.min(num, 100);
  }),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  
  // Search and filters
  search: z.string().optional(),
  status: z.enum(['Active', 'Suspended', 'Banned']).optional(),
  kycStatus: z.enum(['Pending', 'Approved', 'Rejected']).optional(),
  planId: z.string().optional().refine(val => !val || /^[0-9a-fA-F]{24}$/.test(val), 'Invalid plan ID'),
  
  // FIXED: Proper boolean handling for optional filters
  hasReferrals: z.string().optional().transform(val => {
    if (!val || val === '') return undefined;
    return val === 'true';
  }),
  emailVerified: z.string().optional().transform(val => {
    if (!val || val === '') return undefined;
    return val === 'true';
  }),
  phoneVerified: z.string().optional().transform(val => {
    if (!val || val === '') return undefined;
    return val === 'true';
  }),
  twoFactorEnabled: z.string().optional().transform(val => {
    if (!val || val === '') return undefined;
    return val === 'true';
  }),
  
  // FIXED: Proper number handling for optional filters
  minBalance: z.string().optional().transform(val => {
    if (!val || val === '') return undefined;
    const num = parseFloat(val);
    return isNaN(num) ? undefined : num;
  }),
  maxBalance: z.string().optional().transform(val => {
    if (!val || val === '') return undefined;
    const num = parseFloat(val);
    return isNaN(num) ? undefined : num;
  }),
  
  // Date range
  dateFrom: z.string().optional().transform(val => {
    if (!val || val === '') return undefined;
    const date = new Date(val);
    return isNaN(date.getTime()) ? undefined : date;
  }),
  dateTo: z.string().optional().transform(val => {
    if (!val || val === '') return undefined;
    const date = new Date(val);
    return isNaN(date.getTime()) ? undefined : date;
  })
});

// Enhanced user creation schema with additional fields
const userCreateExtendedSchema = z.discriminatedUnion("isAdminCreated", [
  // Admin creation - password is optional (auto-generated)
  z.object({
    isAdminCreated: z.literal(true),
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    email: z.string().email('Invalid email address'),
    phone: z.string().min(10, 'Phone number must be at least 10 digits').max(20),
    planId: z.string().min(1, 'Plan is required'),
    deviceId: z.string().min(1, 'Device ID is required'),
    referralCode: z.string().optional(),
    generatePassword: z.boolean().optional().default(true),
    password: z.string().min(8).optional(), // Optional for admin creation
    initialBalance: z.number().min(0).optional().default(0),
    address: z.object({
      street: z.string().min(5).max(200),
      city: z.string().min(2).max(100),
      state: z.string().min(2).max(100),
      country: z.string().min(2).max(100),
      zipCode: z.string().min(3).max(20)
    }).optional(),
    dateOfBirth: z.string().datetime().optional(),
  }),
  // User registration - password is required
  z.object({
    isAdminCreated: z.literal(false).optional(),
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    email: z.string().email('Invalid email address'),
    phone: z.string().min(10, 'Phone number must be at least 10 digits').max(20),
    password: z.string().min(8, 'Password must be at least 8 characters'), // Required for user registration
    planId: z.string().optional(),
    referredBy: z.string().optional(),
    deviceId: z.string().min(1, 'Device ID is required'),
    fingerprint: z.string().min(1, 'Device fingerprint is required'),
    initialBalance: z.number().min(0).optional().default(0),
    address: z.object({
      street: z.string().min(5).max(200),
      city: z.string().min(2).max(100),
      state: z.string().min(2).max(100),
      country: z.string().min(2).max(100),
      zipCode: z.string().min(3).max(20)
    }).optional(),
    dateOfBirth: z.string().datetime().optional(),
  })
]);

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
    
    console.log('Raw query params:', queryParams); // Debug log
    
    const validationResult = userListQuerySchema.safeParse(queryParams);

    if (!validationResult.success) {
      console.log('Validation errors:', validationResult.error.errors); // Debug log
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

    console.log('Parsed params:', { // Debug log
      page, limit, sortBy, sortOrder, hasReferrals, emailVerified, phoneVerified, twoFactorEnabled
    });

    // Build aggregation pipeline
    const pipeline: any[] = [];

    // FIXED: Build match conditions properly
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
    
    // FIXED: Only apply filters when they are explicitly set (not undefined)
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
      if (dateFrom) matchConditions.createdAt.$gte = dateFrom;
      if (dateTo) matchConditions.createdAt.$lte = dateTo;
    }

    // FIXED: Referral filtering logic - only apply when explicitly requested
    if (hasReferrals !== undefined) {
      if (hasReferrals) {
        // Show only users who were referred by someone
        matchConditions.referredBy = { $exists: true, $nin: [null, ''] };
      } else {
        // Show only users who were NOT referred by anyone
        matchConditions.$or = [
          { referredBy: { $exists: false } },
          { referredBy: null },
          { referredBy: '' }
        ];
      }
    }
    // If hasReferrals is undefined, don't apply any referral filtering at all

    console.log('Match conditions:', JSON.stringify(matchConditions, null, 2)); // Debug log

    // Only add match stage if there are conditions
    if (Object.keys(matchConditions).length > 0) {
      pipeline.push({ $match: matchConditions });
    }

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

    // Lookup referral statistics - count users who used this user's referral code
    pipeline.push({
      $lookup: {
        from: 'users',
        let: { userReferralCode: '$referralCode' },
        pipeline: [
          { 
            $match: { 
              $expr: { 
                $and: [
                  { $eq: ['$referredBy', '$$userReferralCode'] },
                  { $ne: ['$$userReferralCode', null] },
                  { $ne: ['$$userReferralCode', ''] }
                ]
              } 
            } 
          },
          { $count: 'count' }
        ],
        as: 'referralStats'
      }
    });

    // Add computed fields
    pipeline.push({
      $addFields: {
        referralCount: {
          $ifNull: [{ $arrayElemAt: ['$referralStats.count', 0] }, 0]
        },
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

    // Get total count for pagination BEFORE applying sort and pagination
    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await User.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    console.log('Total users found:', total); // Debug log

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
        lastLoginAt: 1,
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

    console.log('Users returned:', users.length); // Debug log

    const paginatedResponse = createPaginatedResponse(users, total, page, limit);

    // Log audit
    await AuditLog.create({
      adminId: request.headers.get('x-user-id'),
      action: 'users.list',
      entity: 'User',
      entityId: 'bulk',
      status: 'Success',
      metadata: {
        filters: { search, status, kycStatus, planId, hasReferrals },
        resultCount: users.length,
        totalCount: total,
        page,
        limit
      },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return apiHandler.success(paginatedResponse);

  } catch (error) {
    console.error('Get users error:', error);
    return apiHandler.internalError('Failed to fetch users');
  }
}

// POST /api/users - Create a new user (Admin only)
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

  try {
    await connectToDatabase();

    const adminId = request.headers.get('x-user-id');
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
      password,
      planId,
      address,
      dateOfBirth,
      initialBalance
    } = validationResult.data;

    // Only get referredBy if it exists on the data object
    const referredBy = 'referredBy' in validationResult.data ? validationResult.data.referredBy : undefined;

    // Check for existing user
    const existingUser = await User.findOne({
      $or: [{ email }, { phone }]
    });

    if (existingUser) {
      return apiHandler.conflict(
        existingUser.email === email 
          ? 'Email already registered' 
          : 'Phone number already registered'
      );
    }

    // Get or create default plan
    let userPlan: any = null;
    if (planId) {
      userPlan = await Plan.findById(planId);
      if (!userPlan) {
        return apiHandler.badRequest('Invalid plan ID');
      }
    } else {
      userPlan = await Plan.findOne({ 
        name: 'Free Plan',
        status: 'Active' 
      });
      
      if (!userPlan) {
        return apiHandler.internalError('Default plan not found');
      }
    }

    // Validate referrer if provided
    let referrerUser: any = null;
    if (referredBy) {
      referrerUser = await User.findOne({
        $or: [
          { referralCode: referredBy },
          { _id: mongoose.Types.ObjectId.isValid(referredBy) ? referredBy : null }
        ]
      });

      if (!referrerUser) {
        return apiHandler.badRequest('Invalid referral code');
      }
    }

    // Generate unique referral code
    const referralCode = await generateReferralCode();

    // Create new user
    const newUser = new User({
      name,
      email,
      phone,
      password, // Will be hashed by the model middleware
      planId: userPlan._id,
      referralCode,
      referredBy: referrerUser?._id,
      balance: initialBalance || 0,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      address,
      status: 'Active',
      kycStatus: 'Pending',
      emailVerified: false,
      phoneVerified: false,
      twoFactorEnabled: false,
      lastLoginAt: null,
      metadata: {
        source: 'admin_created',
        createdBy: adminId
      }
    });

    await newUser.save();

    // Log audit
    await AuditLog.create({
      adminId,
      action: 'users.create',
      entity: 'User',
      entityId: newUser._id.toString(),
      status: 'Success',
      metadata: {
        userName: newUser.name,
        userEmail: newUser.email,
        planId: userPlan._id,
        initialBalance,
        hasReferrer: !!referrerUser,
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
    console.error('Create user error:', error);
    return apiHandler.internalError('Failed to create user');
  }
}

// Export handlers wrapped with error handling
export const GET = withErrorHandler(getUsersHandler);
export const POST = withErrorHandler(createUserHandler);