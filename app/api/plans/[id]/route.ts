import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Plan, IPlan } from '@/models/Plan';
import { User } from '@/models/User';
import { AuditLog } from '@/models/AuditLog';
import { authMiddleware } from '@/middleware/auth';
import { apiRateLimit } from '@/middleware/rate-limit';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import { objectIdValidator } from '@/utils/validators';
import { z } from 'zod';
import mongoose from 'mongoose';
import { planUpdateSchema } from '@/lib/validation';

// GET /api/plans/[id] - Get plan details with user statistics
async function getPlanHandler(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
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

    const { id } = params;

    // Validate plan ID
    const idValidation = objectIdValidator.safeParse(id);
    if (!idValidation.success) {
      return apiHandler.badRequest('Invalid plan ID format');
    }

    // Get plan with user statistics
    const pipeline: mongoose.PipelineStage[] = [
      { $match: { _id: new mongoose.Types.ObjectId(id) } },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: 'planId',
          as: 'users'
        }
      },
      {
        $addFields: {
          userStats: {
            total: { $size: '$users' },
            active: {
              $size: {
                $filter: {
                  input: '$users',
                  cond: { $eq: ['$$this.status', 'Active'] }
                }
              }
            },
            suspended: {
              $size: {
                $filter: {
                  input: '$users',
                  cond: { $eq: ['$$this.status', 'Suspended'] }
                }
              }
            },
            banned: {
              $size: {
                $filter: {
                  input: '$users',
                  cond: { $eq: ['$$this.status', 'Banned'] }
                }
              }
            },
            kycApproved: {
              $size: {
                $filter: {
                  input: '$users',
                  cond: { $eq: ['$$this.kycStatus', 'Approved'] }
                }
              }
            }
          }
        }
      },
      {
        $project: { users: 0 } // Remove the users array to reduce response size
      }
    ];

    const [plan] = await Plan.aggregate(pipeline);

    if (!plan) {
      return apiHandler.notFound('Plan not found');
    }

    // Log audit
    await AuditLog.create({
      adminId: request.headers.get('x-user-id'),
      action: 'plans.view',
      entity: 'Plan',
      entityId: id,
      status: 'Success',
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return apiHandler.success(plan);

  } catch (error) {
    console.error('Error fetching plan:', error);
    return apiHandler.internalError('Failed to fetch plan');
  }
}

// PUT /api/plans/[id] - Update a plan
async function updatePlanHandler(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Apply middleware
  const authResult = await authMiddleware(request, {
    requireAuth: true,
    allowedUserTypes: ['admin'],
    requiredPermission: 'plans.update'
  });
  if (authResult) return authResult;

  const rateLimitResult = await apiRateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    await connectToDatabase();

    const { id } = params;
    const adminId = request.headers.get('x-user-id');

    // Validate plan ID
    const idValidation = objectIdValidator.safeParse(id);
    if (!idValidation.success) {
      return apiHandler.badRequest('Invalid plan ID format');
    }

    const body = await request.json();

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

    const updateData = validationResult.data;

    // Get the existing plan
    const existingPlan = await Plan.findById(id);
    if (!existingPlan) {
      return apiHandler.notFound('Plan not found');
    }

    // Check if name is being changed and if it conflicts
    if (updateData.name && updateData.name !== existingPlan.name) {
      const nameConflict = await Plan.findOne({
        _id: { $ne: id },
        name: { $regex: new RegExp(`^${updateData.name}$`, 'i') }
      });

      if (nameConflict) {
        return apiHandler.conflict('Plan with this name already exists');
      }
    }

    // Store old data for audit
    const oldData = {
      name: existingPlan.name,
      description: existingPlan.description,
      price: existingPlan.price,
      isActive: existingPlan.isActive
    };

    // Update the plan
    const updatedPlan = await Plan.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    // Log audit
    await AuditLog.create({
      adminId,
      action: 'plans.update',
      entity: 'Plan',
      entityId: id,
      oldData,
      newData: updateData,
      changes: Object.keys(updateData).map(field => ({
        field,
        oldValue: (oldData as any)[field],
        newValue: (updateData as any)[field]
      })),
      status: 'Success',
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return apiHandler.success({
      id: updatedPlan!._id,
      name: updatedPlan!.name,
      description: updatedPlan!.description,
      price: updatedPlan!.price,
      currency: updatedPlan!.currency,
      duration: updatedPlan!.duration,
      features: updatedPlan!.features,
      depositLimit: updatedPlan!.depositLimit,
      withdrawalLimit: updatedPlan!.withdrawalLimit,
      profitLimit: updatedPlan!.profitLimit,
      minimumDeposit: updatedPlan!.minimumDeposit,
      minimumWithdrawal: updatedPlan!.minimumWithdrawal,
      dailyWithdrawalLimit: updatedPlan!.dailyWithdrawalLimit,
      monthlyWithdrawalLimit: updatedPlan!.monthlyWithdrawalLimit,
      priority: updatedPlan!.priority,
      isActive: updatedPlan!.isActive,
      color: updatedPlan!.color,
      icon: updatedPlan!.icon,
      createdAt: updatedPlan!.createdAt,
      updatedAt: updatedPlan!.updatedAt
    });

  } catch (error) {
    console.error('Error updating plan:', error);
    return apiHandler.internalError('Failed to update plan');
  }
}

// DELETE /api/plans/[id] - Delete a plan (only if no users are assigned)
async function deletePlanHandler(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Apply middleware
  const authResult = await authMiddleware(request, {
    requireAuth: true,
    allowedUserTypes: ['admin'],
    requiredPermission: 'plans.delete'
  });
  if (authResult) return authResult;

  const rateLimitResult = await apiRateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    await connectToDatabase();

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
        `Cannot delete plan. ${userCount} users are currently assigned to this plan.`
      );
    }

    // Store plan data for audit
    const planData = {
      name: plan.name,
      description: plan.description,
      price: plan.price,
      isActive: plan.isActive
    };

    // Delete the plan
    await Plan.findByIdAndDelete(id);

    // Log audit
    await AuditLog.create({
      adminId,
      action: 'plans.delete',
      entity: 'Plan',
      entityId: id,
      oldData: planData,
      status: 'Success',
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return apiHandler.success({
      message: 'Plan deleted successfully',
      deletedPlan: {
        id,
        name: plan.name
      }
    });

  } catch (error) {
    console.error('Error deleting plan:', error);
    return apiHandler.internalError('Failed to delete plan');
  }
}

// Export handlers with error wrapper
export const GET = withErrorHandler(getPlanHandler);
export const PUT = withErrorHandler(updatePlanHandler);
export const DELETE = withErrorHandler(deletePlanHandler);
