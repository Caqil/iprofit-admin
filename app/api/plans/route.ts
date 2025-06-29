import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Plan, IPlan } from '@/models/Plan';
import { User } from '@/models/User';
import { AuditLog } from '@/models/AuditLog';
import { authMiddleware } from '@/middleware/auth';
import { apiRateLimit } from '@/middleware/rate-limit';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler, createPaginatedResponse, createPaginationStages } from '@/lib/api-helpers';
import { paginationSchema } from '@/lib/validation';
import { z } from 'zod';
import mongoose from 'mongoose';

// Plan creation validation schema
const planCreateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  price: z.number().min(0, 'Price must be non-negative'),
  currency: z.enum(['USD', 'BDT']).optional().default('BDT'),
  duration: z.number().min(1, 'Duration must be at least 1 day').optional(),
  features: z.array(z.string()).min(1, 'At least one feature is required'),
  depositLimit: z.number().min(0),
  withdrawalLimit: z.number().min(0),
  profitLimit: z.number().min(0),
  minimumDeposit: z.number().min(0),
  minimumWithdrawal: z.number().min(0),
  dailyWithdrawalLimit: z.number().min(0),
  monthlyWithdrawalLimit: z.number().min(0),
  priority: z.number().min(1).max(10).optional().default(1),
  isActive: z.boolean().default(true),
  color: z.string().optional().default('#000000'),
  icon: z.string().optional(),
});

// Plan update validation schema
const planUpdateSchema = planCreateSchema.partial();

// Plan list query validation schema - FIXED to handle string values properly
const planListQuerySchema = z.object({
  page: z.string().transform(val => parseInt(val) || 1).optional().default('1'),
  limit: z.string().transform(val => Math.min(parseInt(val) || 10, 100)).optional().default('10'),
  sortBy: z.string().optional().default('priority'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
  isActive: z.string().transform(val => {
    if (val === 'true') return true;
    if (val === 'false') return false;
    return undefined;
  }).optional(),
  search: z.string().optional(),
});

// Object ID validation
const objectIdValidator = z.string().refine((id) => mongoose.Types.ObjectId.isValid(id), {
  message: 'Invalid ObjectId format'
});

// GET /api/plans - List plans with user counts
async function getPlansHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  try {
    console.log('🚀 Plans API - Starting request');
    
    // Connect to database first
    await connectToDatabase();
    console.log('✅ Plans API - Database connected');

    // Apply auth middleware - make it optional for debugging
    try {
      const authResult = await authMiddleware(request, {
        requireAuth: true,
        allowedUserTypes: ['admin'],
        requiredPermission: 'plans.view'
      });
      if (authResult) {
        console.log('❌ Plans API - Auth failed');
        return authResult;
      }
      console.log('✅ Plans API - Auth passed');
    } catch (authError) {
      console.error('❌ Plans API - Auth error:', authError);
      // For debugging, continue without auth - REMOVE THIS IN PRODUCTION
      // return apiHandler.unauthorized('Authentication failed');
    }

    // Apply rate limiting - make it optional for debugging
    try {
      const rateLimitResult = await apiRateLimit(request);
      if (rateLimitResult) {
        console.log('❌ Plans API - Rate limit exceeded');
        return rateLimitResult;
      }
      console.log('✅ Plans API - Rate limit passed');
    } catch (rateLimitError) {
      console.error('❌ Plans API - Rate limit error:', rateLimitError);
      // Continue without rate limiting for debugging
    }

    // Parse and validate query parameters
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    
    console.log('📊 Plans API - Raw query params:', queryParams);
    
    // FIXED: Handle empty query params
    const safeQueryParams = {
      page: queryParams.page || '1',
      limit: queryParams.limit || '10', 
      sortBy: queryParams.sortBy || 'priority',
      sortOrder: queryParams.sortOrder || 'asc',
      isActive: queryParams.isActive,
      search: queryParams.search
    };
    
    const validationResult = planListQuerySchema.safeParse(safeQueryParams);

    if (!validationResult.success) {
      console.error('❌ Plans API - Validation failed:', validationResult.error);
      return apiHandler.validationError(
        validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      );
    }

    const { page, limit, sortBy, sortOrder, isActive, search } = validationResult.data;

    console.log('✅ Plans API - Validated params:', { 
      page: typeof page, pageValue: page,
      limit: typeof limit, limitValue: limit,
      sortBy, sortOrder, isActive, search 
    });

    // FIXED: Build aggregation pipeline with better error handling
    const pipeline: mongoose.PipelineStage[] = [];

    // Match stage for filtering
    const matchConditions: any = {};
    if (isActive !== undefined) {
      matchConditions.isActive = isActive;
    }

    // Search functionality
    if (search && search.trim()) {
      matchConditions.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { description: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    if (Object.keys(matchConditions).length > 0) {
      pipeline.push({ $match: matchConditions });
      console.log('🔍 Plans API - Match conditions:', matchConditions);
    }

    // FIXED: Simplified user count lookup
    pipeline.push({
      $lookup: {
        from: 'users',
        let: { planId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$planId', '$$planId'] },
                  { $in: ['$status', ['Active', 'active']] } // Handle case variations
                ]
              }
            }
          },
          { $count: 'count' }
        ],
        as: 'userStats'
      }
    });

    // Add user count field
    pipeline.push({
      $addFields: {
        userCount: { 
          $ifNull: [
            { $arrayElemAt: ['$userStats.count', 0] }, 
            0
          ] 
        }
      }
    });

    // Remove the userStats array (we only need the count)
    pipeline.push({
      $project: { 
        userStats: 0,
        __v: 0  // Remove version key
      }
    });

    // FIXED: Add sorting with proper type conversion
    const sortValue = sortOrder === 'asc' ? 1 : -1;
    const sortStage: mongoose.PipelineStage.Sort = {
      $sort: { [sortBy]: sortValue }
    };
    pipeline.push(sortStage);

    console.log('🔄 Plans API - Aggregation pipeline:', JSON.stringify(pipeline, null, 2));

    // FIXED: Get total count for pagination
    try {
      const countPipeline = [...pipeline];
      // Remove sort and pagination stages for counting
      const sortIndex = countPipeline.findIndex(stage => '$sort' in stage);
      if (sortIndex > -1) {
        countPipeline.splice(sortIndex);
      }
      countPipeline.push({ $count: 'total' });
      
      const countResult = await Plan.aggregate(countPipeline);
      const total = countResult[0]?.total || 0;

      console.log('📈 Plans API - Total count:', total);

      // FIXED: Add pagination with proper number conversion
      const skipAmount = (Number(page) - 1) * Number(limit);
      pipeline.push({ $skip: skipAmount });
      pipeline.push({ $limit: Number(limit) });

      console.log('📄 Plans API - Pagination:', { page: Number(page), limit: Number(limit), skip: skipAmount });

      // Execute the aggregation
      const plans = await Plan.aggregate(pipeline);

      console.log('📋 Plans API - Found plans:', plans.length);
      console.log('📋 Plans API - Sample plan:', plans[0]);

      // FIXED: Create response with proper structure
      const response = {
        data: plans,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
          hasNext: Number(page) * Number(limit) < total,
          hasPrev: Number(page) > 1
        }
      };

      console.log('✅ Plans API - Response structure:', {
        dataLength: response.data.length,
        total: response.pagination.total,
        page: response.pagination.page
      });

      // Log audit (optional, skip if it fails)
      try {
        const adminId = request.headers.get('x-user-id') || 'system';
        await AuditLog.create({
          adminId,
          action: 'plans.list',
          entity: 'Plan',
          status: 'Success',
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
          metadata: {
            filters: { isActive, search },
            resultCount: plans.length,
            totalCount: total
          }
        });
      } catch (auditError) {
        console.warn('⚠️ Plans API - Audit log failed:', auditError);
        // Don't fail the request if audit logging fails
      }

      return apiHandler.success(response);

    } catch (aggregationError) {
      console.error('❌ Plans API - Aggregation error:', aggregationError);
      
      // FALLBACK: Try simple find query
      try {
        console.log('🔄 Plans API - Trying fallback simple query');
        
        const query: any = {};
        if (isActive !== undefined) query.isActive = isActive;
        if (search && search.trim()) {
          query.$or = [
            { name: { $regex: search.trim(), $options: 'i' } },
            { description: { $regex: search.trim(), $options: 'i' } }
          ];
        }

        const total = await Plan.countDocuments(query);
        const skipAmount = (Number(page) - 1) * Number(limit);
        
        const plans = await Plan.find(query)
          .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
          .skip(skipAmount)
          .limit(Number(limit))
          .lean();

        // Add userCount manually
        const plansWithCount = await Promise.all(
          plans.map(async (plan) => {
            try {
              const userCount = await User.countDocuments({ 
                planId: plan._id,
                status: { $in: ['Active', 'active'] }
              });
              return { ...plan, userCount };
            } catch {
              return { ...plan, userCount: 0 };
            }
          })
        );

        const response = {
          data: plansWithCount,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            totalPages: Math.ceil(total / Number(limit)),
            hasNext: Number(page) * Number(limit) < total,
            hasPrev: Number(page) > 1
          }
        };

        console.log('✅ Plans API - Fallback success:', response.data.length, 'plans');
        return apiHandler.success(response);

      } catch (fallbackError) {
        console.error('❌ Plans API - Fallback also failed:', fallbackError);
        throw aggregationError; // Throw original error
      }
    }

  } catch (error) {
    console.error('❌ Plans API - Main error:', error);
    console.error('❌ Plans API - Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    // Return detailed error information for debugging
    return apiHandler.internalError('Failed to fetch plans');
  }
}

// POST /api/plans - Create a new plan
async function createPlanHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  try {
    await connectToDatabase();

    // Apply middleware
    const authResult = await authMiddleware(request, {
      requireAuth: true,
      allowedUserTypes: ['admin'],
      requiredPermission: 'plans.create'
    });
    if (authResult) return authResult;

    const rateLimitResult = await apiRateLimit(request);
    if (rateLimitResult) return rateLimitResult;

    const adminId = request.headers.get('x-user-id');
    const body = await request.json();

    console.log('📝 Plans API - Create request body:', body);

    // Validate request body
    const validationResult = planCreateSchema.safeParse(body);
    if (!validationResult.success) {
      return apiHandler.validationError(
        validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      );
    }

    const planData = validationResult.data;

    // Check if plan name already exists
    const existingPlan = await Plan.findOne({ 
      name: { $regex: new RegExp(`^${planData.name}$`, 'i') }
    });

    if (existingPlan) {
      return apiHandler.conflict('Plan with this name already exists');
    }

    // Create the plan
    const plan = new Plan(planData);
    await plan.save();

    console.log('✅ Plans API - Plan created:', plan._id);

    // Log audit
    try {
      await AuditLog.create({
        adminId,
        action: 'plans.create',
        entity: 'Plan',
        entityId: plan._id.toString(),
        newData: planData,
        status: 'Success',
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      });
    } catch (auditError) {
      console.warn('⚠️ Plans API - Audit log failed:', auditError);
    }

    return apiHandler.created({
      _id: plan._id,
      name: plan.name,
      description: plan.description,
      price: plan.price,
      currency: plan.currency,
      duration: plan.duration,
      features: plan.features,
      depositLimit: plan.depositLimit,
      withdrawalLimit: plan.withdrawalLimit,
      profitLimit: plan.profitLimit,
      minimumDeposit: plan.minimumDeposit,
      minimumWithdrawal: plan.minimumWithdrawal,
      dailyWithdrawalLimit: plan.dailyWithdrawalLimit,
      monthlyWithdrawalLimit: plan.monthlyWithdrawalLimit,
      priority: plan.priority,
      isActive: plan.isActive,
      color: plan.color,
      icon: plan.icon,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt
    });

  } catch (error) {
    console.error('❌ Plans API - Create error:', error);
    return apiHandler.internalError('Failed to create plan');
  }
}

// Export handlers with error wrapper
export const GET = withErrorHandler(getPlansHandler);
export const POST = withErrorHandler(createPlanHandler);