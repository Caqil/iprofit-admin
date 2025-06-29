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
  priority: z.number().min(1).max(10),
  isActive: z.boolean().default(true),
  color: z.string().optional().default('#000000'),
  icon: z.string().optional(),
});

// Plan list query validation schema
const planListQuerySchema = paginationSchema.extend({
  sortBy: z.string().optional().default('priority'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
  isActive: z.string().transform(val => {
    if (val === 'true') return true;
    if (val === 'false') return false;
    return undefined;
  }).optional(),
  search: z.string().optional(),
});

// GET /api/plans - List plans with user counts
async function getPlansHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Apply middleware
  const authResult = await authMiddleware(request, {
    requireAuth: true,
    allowedUserTypes: ['admin'],
    requiredPermission: 'plans.view'
  });
  if (authResult) return authResult;

  const rateLimitResult = await apiRateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    await connectToDatabase();

    // Parse and validate query parameters
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    
    console.log('📊 Plans API - Raw query params:', queryParams);
    
    const validationResult = planListQuerySchema.safeParse(queryParams);

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

    console.log('✅ Plans API - Validated params:', { page, limit, sortBy, sortOrder, isActive, search });

    // Build aggregation pipeline
    const pipeline: mongoose.PipelineStage[] = [];

    // Match stage for filtering
    const matchConditions: any = {};
    if (isActive !== undefined) matchConditions.isActive = isActive;

    // Search functionality
    if (search) {
      matchConditions.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (Object.keys(matchConditions).length > 0) {
      pipeline.push({ $match: matchConditions });
      console.log('🔍 Plans API - Match conditions:', matchConditions);
    }

    // Lookup user counts for each plan
    pipeline.push({
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: 'planId',
        as: 'users',
        pipeline: [
          { $match: { status: 'Active' } },
          { $count: 'count' }
        ]
      }
    });

    // Add user count field
    pipeline.push({
      $addFields: {
        userCount: { $ifNull: [{ $arrayElemAt: ['$users.count', 0] }, 0] }
      }
    });

    // Remove the users array (we only need the count)
    pipeline.push({
      $project: { users: 0 }
    });

    // Add sorting
    const sortStage: mongoose.PipelineStage.Sort = {
      $sort: { [sortBy]: sortOrder === 'asc' ? 1 : -1 }
    };
    pipeline.push(sortStage);

    console.log('🔄 Plans API - Aggregation pipeline:', JSON.stringify(pipeline, null, 2));

    // Get total count for pagination
    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await Plan.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    console.log('📈 Plans API - Total count:', total);

    // Add pagination
    const paginationStages = createPaginationStages(page, limit);
    pipeline.push(...paginationStages);

    // Execute the aggregation
    const plans = await Plan.aggregate(pipeline);

    console.log('📋 Plans API - Found plans:', plans.length);
    console.log('📋 Plans API - Sample plan:', plans[0]);

    // Log audit
    await AuditLog.create({
      adminId: request.headers.get('x-user-id'),
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

    // Create paginated response
    const response = createPaginatedResponse(plans, total, page, limit);

    console.log('✅ Plans API - Response structure:', {
      dataLength: response.data.length,
      total: response.pagination.total,
      page: response.pagination.page
    });

    return apiHandler.success(response);

  } catch (error) {
    console.error('❌ Plans API - Error:', error);
    return apiHandler.internalError('Failed to fetch plans');
  }
}

// POST /api/plans - Create a new plan
async function createPlanHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Apply middleware
  const authResult = await authMiddleware(request, {
    requireAuth: true,
    allowedUserTypes: ['admin'],
    requiredPermission: 'plans.create'
  });
  if (authResult) return authResult;

  const rateLimitResult = await apiRateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    await connectToDatabase();

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

    return apiHandler.created({
      id: plan._id,
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