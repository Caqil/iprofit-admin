// ✅ COMPLETE PLANS API - app/api/plans/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Plan, IPlan } from '@/models/Plan';
import { User } from '@/models/User';
import { AuditLog } from '@/models/AuditLog';
import { authMiddleware } from '@/middleware/auth';
import { apiRateLimit } from '@/middleware/rate-limit';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import { planCreateSchema, planListQuerySchema } from '@/lib/validation';
import { z } from 'zod';
import mongoose from 'mongoose';

// ✅ HELPER: Sanitize numeric fields to prevent NaN
function sanitizePlanData(plan: any) {
  return {
    ...plan,
    // ✅ FIX: Ensure all numeric fields are valid numbers
    price: Number(plan.price) || 0,
    depositLimit: Number(plan.depositLimit) || 0,
    withdrawalLimit: Number(plan.withdrawalLimit) || 0,
    profitLimit: Number(plan.profitLimit) || 0,
    minimumDeposit: Number(plan.minimumDeposit) || 0,
    minimumWithdrawal: Number(plan.minimumWithdrawal) || 0,
    dailyWithdrawalLimit: Number(plan.dailyWithdrawalLimit) || 0,
    monthlyWithdrawalLimit: Number(plan.monthlyWithdrawalLimit) || 0,
    priority: Number(plan.priority) || 0,
    userCount: Number(plan.userCount) || 0,
    duration: plan.duration ? Number(plan.duration) : null
  };
}

// ✅ GET /api/plans - List plans with user counts (FIXED)
async function getPlansHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  try {
    console.log('🚀 Plans API - Starting GET request');
    
    await connectToDatabase();
    console.log('✅ Plans API - Database connected');

    // Apply auth middleware (optional for debugging)
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
    } catch (authError) {
      console.error('❌ Plans API - Auth error:', authError);
      // Continue for debugging - REMOVE IN PRODUCTION
    }

    // Parse query parameters
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    
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

    // ✅ FIXED: Build aggregation pipeline with NaN prevention
    const pipeline: mongoose.PipelineStage[] = [];

    // Match stage for filtering
    const matchConditions: any = {};
    if (isActive !== undefined) {
      matchConditions.isActive = isActive;
    }

    if (search && search.trim()) {
      matchConditions.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { description: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    if (Object.keys(matchConditions).length > 0) {
      pipeline.push({ $match: matchConditions });
    }

    // ✅ FIXED: Lookup users with proper counting
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
                  { $in: ['$status', ['Active', 'active']] }
                ]
              }
            }
          },
          { $count: 'count' }
        ],
        as: 'userStats'
      }
    });

    // ✅ CRITICAL FIX: Sanitize all numeric fields to prevent NaN
    pipeline.push({
      $addFields: {
        userCount: { 
          $ifNull: [{ $arrayElemAt: ['$userStats.count', 0] }, 0] 
        },
        // ✅ FIX: Ensure all numeric fields are valid
        price: { 
          $cond: {
            if: { $isNumber: '$price' },
            then: '$price',
            else: 0
          }
        },
        depositLimit: { 
          $cond: {
            if: { $isNumber: '$depositLimit' },
            then: '$depositLimit',
            else: 0
          }
        },
        withdrawalLimit: { 
          $cond: {
            if: { $isNumber: '$withdrawalLimit' },
            then: '$withdrawalLimit',
            else: 0
          }
        },
        profitLimit: { 
          $cond: {
            if: { $isNumber: '$profitLimit' },
            then: '$profitLimit',
            else: 0
          }
        },
        minimumDeposit: { 
          $cond: {
            if: { $isNumber: '$minimumDeposit' },
            then: '$minimumDeposit',
            else: 0
          }
        },
        minimumWithdrawal: { 
          $cond: {
            if: { $isNumber: '$minimumWithdrawal' },
            then: '$minimumWithdrawal',
            else: 0
          }
        },
        dailyWithdrawalLimit: { 
          $cond: {
            if: { $isNumber: '$dailyWithdrawalLimit' },
            then: '$dailyWithdrawalLimit',
            else: 0
          }
        },
        monthlyWithdrawalLimit: { 
          $cond: {
            if: { $isNumber: '$monthlyWithdrawalLimit' },
            then: '$monthlyWithdrawalLimit',
            else: 0
          }
        },
        priority: { 
          $cond: {
            if: { $isNumber: '$priority' },
            then: '$priority',
            else: 0
          }
        }
      }
    });

    // Remove temporary fields
    pipeline.push({
      $project: { 
        userStats: 0,
        __v: 0
      }
    });

    // Add sorting
    const sortValue = sortOrder === 'asc' ? 1 : -1;
    pipeline.push({ $sort: { [sortBy]: sortValue } });

    // Get total count
    const countPipeline = [...pipeline];
    const sortIndex = countPipeline.findIndex(stage => '$sort' in stage);
    if (sortIndex > -1) {
      countPipeline.splice(sortIndex);
    }
    countPipeline.push({ $count: 'total' });
    
    const countResult = await Plan.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    // Add pagination
    const skipAmount = (Number(page) - 1) * Number(limit);
    pipeline.push({ $skip: skipAmount });
    pipeline.push({ $limit: Number(limit) });

    // Execute aggregation
    const plans = await Plan.aggregate(pipeline);

    // ✅ DOUBLE-CHECK: Sanitize response data
    const sanitizedPlans = plans.map(sanitizePlanData);

    console.log('✅ Plans API - Found plans:', sanitizedPlans.length);
    console.log('🔍 Plans API - Sample plan limits:', {
      name: sanitizedPlans[0]?.name,
      depositLimit: sanitizedPlans[0]?.depositLimit,
      withdrawalLimit: sanitizedPlans[0]?.withdrawalLimit,
      profitLimit: sanitizedPlans[0]?.profitLimit
    });

    const response = {
      data: sanitizedPlans,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
        hasNext: Number(page) * Number(limit) < total,
        hasPrev: Number(page) > 1
      }
    };

    // Audit log (optional)
    try {
      const adminIdHeader = request.headers.get('x-user-id');
      const adminId = adminIdHeader && adminIdHeader !== 'system' 
        ? new mongoose.Types.ObjectId(adminIdHeader)
        : null;
      
      await AuditLog.create({
        adminId,
        action: 'plans.list',
        entity: 'Plan',
        status: 'Success',
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        metadata: {
          filters: { isActive, search },
          resultCount: sanitizedPlans.length,
          totalCount: total
        }
      });
    } catch (auditError) {
      console.warn('⚠️ Plans API - Audit log failed:', auditError);
    }

    return apiHandler.success(response);

  } catch (error) {
    console.error('❌ Plans API - GET error:', error);
    return apiHandler.internalError('Failed to fetch plans');
  }
}

// ✅ POST /api/plans - Create a new plan (FIXED)
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

    let planData = validationResult.data;

    // ✅ FIX: Sanitize numeric fields before saving
    planData = sanitizePlanData(planData);

    // Check if plan name already exists
    const existingPlan = await Plan.findOne({ 
      name: { $regex: new RegExp(`^${planData.name}$`, 'i') }
    });

    if (existingPlan) {
      return apiHandler.conflict('Plan with this name already exists');
    }

    // ✅ VALIDATE: Ensure all required numeric fields are present
    const requiredFields = ['depositLimit', 'withdrawalLimit', 'profitLimit', 'minimumDeposit', 'minimumWithdrawal'];
    for (const field of requiredFields) {
      if (!planData[field] || isNaN(planData[field])) {
        return apiHandler.badRequest(`${field} must be a valid number`);
      }
    }

    // Create the plan
    const plan = new Plan(planData);
    await plan.save();

    console.log('✅ Plans API - Plan created:', plan._id);

    // Audit log
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

    // ✅ RETURN: Sanitized response
    const responseData = sanitizePlanData({
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
      updatedAt: plan.updatedAt,
      userCount: 0
    });

    return apiHandler.created(responseData);

  } catch (error) {
    console.error('❌ Plans API - Create error:', error);
    return apiHandler.internalError('Failed to create plan');
  }
}

// Export handlers
export const GET = withErrorHandler(getPlansHandler);
export const POST = withErrorHandler(createPlanHandler);

// ============================================================================
// ✅ INDIVIDUAL PLAN API - app/api/plans/[id]/route.ts
// ============================================================================

// Validation schema for plan updates
const planUpdateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().min(10).optional(),
  price: z.number().min(0).optional(),
  currency: z.enum(['USD', 'BDT']).optional(),
  duration: z.number().min(1).optional(),
  features: z.array(z.string()).min(1).optional(),
  depositLimit: z.number().min(0).optional(),
  withdrawalLimit: z.number().min(0).optional(),
  profitLimit: z.number().min(0).optional(),
  minimumDeposit: z.number().min(0).optional(),
  minimumWithdrawal: z.number().min(0).optional(),
  dailyWithdrawalLimit: z.number().min(0).optional(),
  monthlyWithdrawalLimit: z.number().min(0).optional(),
  priority: z.number().min(1).max(10).optional(),
  isActive: z.boolean().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
});

const objectIdValidator = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format');

// ✅ GET /api/plans/[id] - Get single plan
async function getPlanHandler(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  try {
    await connectToDatabase();

    // Apply auth middleware
    const authResult = await authMiddleware(request, {
      requireAuth: true,
      allowedUserTypes: ['admin'],
      requiredPermission: 'plans.view'
    });
    if (authResult) return authResult;

    const { id } = params;

    // Validate plan ID
    const idValidation = objectIdValidator.safeParse(id);
    if (!idValidation.success) {
      return apiHandler.badRequest('Invalid plan ID format');
    }

    // ✅ FIXED: Get plan with user count using aggregation
    const pipeline = [
      { $match: { _id: new mongoose.Types.ObjectId(id) } },
      {
        $lookup: {
          from: 'users',
          let: { planId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$planId', '$$planId'] },
                    { $in: ['$status', ['Active', 'active']] }
                  ]
                }
              }
            },
            { $count: 'count' }
          ],
          as: 'userStats'
        }
      },
      {
        $addFields: {
          userCount: { 
            $ifNull: [{ $arrayElemAt: ['$userStats.count', 0] }, 0] 
          },
          // ✅ Sanitize numeric fields
          price: { $cond: { if: { $isNumber: '$price' }, then: '$price', else: 0 } },
          depositLimit: { $cond: { if: { $isNumber: '$depositLimit' }, then: '$depositLimit', else: 0 } },
          withdrawalLimit: { $cond: { if: { $isNumber: '$withdrawalLimit' }, then: '$withdrawalLimit', else: 0 } },
          profitLimit: { $cond: { if: { $isNumber: '$profitLimit' }, then: '$profitLimit', else: 0 } },
          minimumDeposit: { $cond: { if: { $isNumber: '$minimumDeposit' }, then: '$minimumDeposit', else: 0 } },
          minimumWithdrawal: { $cond: { if: { $isNumber: '$minimumWithdrawal' }, then: '$minimumWithdrawal', else: 0 } },
          dailyWithdrawalLimit: { $cond: { if: { $isNumber: '$dailyWithdrawalLimit' }, then: '$dailyWithdrawalLimit', else: 0 } },
          monthlyWithdrawalLimit: { $cond: { if: { $isNumber: '$monthlyWithdrawalLimit' }, then: '$monthlyWithdrawalLimit', else: 0 } },
          priority: { $cond: { if: { $isNumber: '$priority' }, then: '$priority', else: 0 } }
        }
      },
      {
        $project: { userStats: 0, __v: 0 }
      }
    ];

    const plans = await Plan.aggregate(pipeline);
    const plan = plans[0];

    if (!plan) {
      return apiHandler.notFound('Plan not found');
    }

    // ✅ Double-check sanitization
    const sanitizedPlan = sanitizePlanData(plan);

    console.log('✅ Plans API - Retrieved plan:', sanitizedPlan._id);

    return apiHandler.success(sanitizedPlan);

  } catch (error) {
    console.error('❌ Plans API - Get plan error:', error);
    return apiHandler.internalError('Failed to retrieve plan');
  }
}

// ✅ PUT /api/plans/[id] - Update plan
async function updatePlanHandler(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  try {
    await connectToDatabase();

    // Apply middleware
    const authResult = await authMiddleware(request, {
      requireAuth: true,
      allowedUserTypes: ['admin'],
      requiredPermission: 'plans.update'
    });
    if (authResult) return authResult;

    const rateLimitResult = await apiRateLimit(request);
    if (rateLimitResult) return rateLimitResult;

    const { id } = params;
    const adminId = request.headers.get('x-user-id');
    const body = await request.json();

    // Validate plan ID
    const idValidation = objectIdValidator.safeParse(id);
    if (!idValidation.success) {
      return apiHandler.badRequest('Invalid plan ID format');
    }

    // Validate request body
    const validationResult = planUpdateSchema.safeParse(body);
    if (!validationResult.success) {
      return apiHandler.validationError(
        validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      );
    }

    let updateData = validationResult.data;

    // ✅ FIX: Sanitize numeric fields
    updateData = sanitizePlanData(updateData);

    // Check if plan exists
    const existingPlan = await Plan.findById(id);
    if (!existingPlan) {
      return apiHandler.notFound('Plan not found');
    }

    // Check if name is being changed and already exists
    if (updateData.name && updateData.name !== existingPlan.name) {
      const duplicatePlan = await Plan.findOne({ 
        name: { $regex: new RegExp(`^${updateData.name}$`, 'i') },
        _id: { $ne: id }
      });

      if (duplicatePlan) {
        return apiHandler.conflict('Plan with this name already exists');
      }
    }

    // Store old data for audit
    const oldData = existingPlan.toObject();

    // Update the plan
    const updatedPlan = await Plan.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    console.log('✅ Plans API - Plan updated:', updatedPlan?._id);

    // Audit log
    try {
      const changedFields = Object.keys(updateData);
      await AuditLog.create({
        adminId,
        action: 'plans.update',
        entity: 'Plan',
        entityId: id,
        oldData: Object.fromEntries(changedFields.map(field => [field, oldData[field]])),
        newData: updateData,
        changes: changedFields.map(field => ({
          field,
          oldValue: oldData[field],
          newValue: updateData[field]
        })),
        status: 'Success',
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      });
    } catch (auditError) {
      console.warn('⚠️ Plans API - Audit log failed:', auditError);
    }

    // ✅ RETURN: Sanitized response with user count
    const userCount = await User.countDocuments({ 
      planId: id,
      status: { $in: ['Active', 'active'] }
    });

    const responseData = sanitizePlanData({
      ...updatedPlan!.toObject(),
      userCount
    });

    return apiHandler.success(responseData);

  } catch (error) {
    console.error('❌ Plans API - Update error:', error);
    return apiHandler.internalError('Failed to update plan');
  }
}

// ✅ DELETE /api/plans/[id] - Delete plan
async function deletePlanHandler(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  try {
    await connectToDatabase();

    // Apply middleware
    const authResult = await authMiddleware(request, {
      requireAuth: true,
      allowedUserTypes: ['admin'],
      requiredPermission: 'plans.delete'
    });
    if (authResult) return authResult;

    const rateLimitResult = await apiRateLimit(request);
    if (rateLimitResult) return rateLimitResult;

    const { id } = params;
    const adminId = request.headers.get('x-user-id');

    // Validate plan ID
    const idValidation = objectIdValidator.safeParse(id);
    if (!idValidation.success) {
      return apiHandler.badRequest('Invalid plan ID format');
    }

    // Check if plan exists
    const plan = await Plan.findById(id);
    if (!plan) {
      return apiHandler.notFound('Plan not found');
    }

    // Check if any users are assigned to this plan
    const userCount = await User.countDocuments({ planId: id });
    if (userCount > 0) {
      return apiHandler.conflict(
        `Cannot delete plan. ${userCount} user(s) are currently assigned to this plan. Please reassign users to other plans first.`
      );
    }

    // Store plan data for audit
    const planData = plan.toObject();

    // Delete the plan
    await Plan.findByIdAndDelete(id);

    console.log('✅ Plans API - Plan deleted:', id);

    // Audit log
    try {
      await AuditLog.create({
        adminId,
        action: 'plans.delete',
        entity: 'Plan',
        entityId: id,
        oldData: planData,
        status: 'Success',
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        metadata: {
          planName: planData.name,
          hadUsers: userCount > 0
        }
      });
    } catch (auditError) {
      console.warn('⚠️ Plans API - Audit log failed:', auditError);
    }

    return apiHandler.success({
      message: 'Plan deleted successfully',
      deletedPlan: {
        id: planData._id,
        name: planData.name
      }
    });

  } catch (error) {
    console.error('❌ Plans API - Delete error:', error);
    return apiHandler.internalError('Failed to delete plan');
  }
}

// Export individual plan handlers
export const GET_SINGLE = withErrorHandler(getPlanHandler);
export const PUT = withErrorHandler(updatePlanHandler);
export const DELETE = withErrorHandler(deletePlanHandler);
