import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { User, IUser } from '@/models/User';
import { Transaction } from '@/models/Transaction';
import { Plan } from '@/models/Plan';
import { AuditLog } from '@/models/AuditLog';
import { authMiddleware } from '@/middleware/auth';
import { apiRateLimit } from '@/middleware/rate-limit';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import { sendEmail } from '@/lib/email';
import { userUpdateSchema } from '@/lib/validation';
import { objectIdValidator } from '@/utils/validators';
import { UserProfile, UserStatistics } from '@/types';
import mongoose from 'mongoose';

// GET /api/users/[id] - Get user details with profile information
async function getUserHandler(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
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

    const { id } = params;

    // Validate user ID
    const idValidation = objectIdValidator.safeParse(id);
    if (!idValidation.success) {
      return apiHandler.badRequest('Invalid user ID format');
    }

    // Build aggregation pipeline for comprehensive user profile
    const pipeline: mongoose.PipelineStage[] = [
      { $match: { _id: new mongoose.Types.ObjectId(id) } },
      
      // Lookup plan information
      {
        $lookup: {
          from: 'plans',
          localField: 'planId',
          foreignField: '_id',
          as: 'plan'
        }
      },
      { $unwind: { path: '$plan', preserveNullAndEmptyArrays: true } },
      
      // Lookup recent transactions
      {
        $lookup: {
          from: 'transactions',
          let: { userId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$userId', '$$userId'] } } },
            { $sort: { createdAt: -1 } },
            { $limit: 10 }
          ],
          as: 'recentTransactions'
        }
      },
      
      // Lookup referrals
      {
        $lookup: {
          from: 'users',
          let: { referralCode: '$referralCode' },
          pipeline: [
            { $match: { $expr: { $eq: ['$referredBy', '$$referralCode'] } } },
            { $project: { _id: 1, name: 1, email: 1, createdAt: 1, balance: 1 } }
          ],
          as: 'referrals'
        }
      },
      
      // Calculate statistics
      {
        $addFields: {
          statistics: {
            totalDeposits: {
              $reduce: {
                input: {
                  $filter: {
                    input: '$recentTransactions',
                    cond: { $eq: ['$$this.type', 'deposit'] }
                  }
                },
                initialValue: 0,
                in: { $add: ['$$value', '$$this.amount'] }
              }
            },
            totalWithdrawals: {
              $reduce: {
                input: {
                  $filter: {
                    input: '$recentTransactions',
                    cond: { $eq: ['$$this.type', 'withdrawal'] }
                  }
                },
                initialValue: 0,
                in: { $add: ['$$value', '$$this.amount'] }
              }
            },
            totalReferrals: { $size: '$referrals' },
            accountAge: {
              $divide: [
                { $subtract: [new Date(), '$createdAt'] },
                1000 * 60 * 60 * 24
              ]
            },
            lastActivity: '$lastLogin'
          }
        }
      }
    ];

    const results = await User.aggregate(pipeline);
    const userProfile = results[0];

    if (!userProfile) {
      return apiHandler.notFound('User not found');
    }

    // Format response
    const response: UserProfile = {
      user: {
        _id: userProfile._id,
        name: userProfile.name,
        email: userProfile.email,
        phone: userProfile.phone,
        balance: userProfile.balance,
        status: userProfile.status,
        kycStatus: userProfile.kycStatus,
        kycDocuments: userProfile.kycDocuments,
        kycRejectionReason: userProfile.kycRejectionReason,
        referralCode: userProfile.referralCode,
        referredBy: userProfile.referredBy,
        deviceId: userProfile.deviceId,
        profilePicture: userProfile.profilePicture,
        dateOfBirth: userProfile.dateOfBirth,
        address: userProfile.address,
        emailVerified: userProfile.emailVerified,
        phoneVerified: userProfile.phoneVerified,
        twoFactorEnabled: userProfile.twoFactorEnabled,
        lastLogin: userProfile.lastLogin,
        loginAttempts: userProfile.loginAttempts,
        lockedUntil: userProfile.lockedUntil,
        createdAt: userProfile.createdAt,
        updatedAt: userProfile.updatedAt,
        planId: userProfile.plan?._id ?? userProfile.planId // add planId to satisfy User type
      },
      plan: userProfile.plan,
      statistics: userProfile.statistics,
      recentTransactions: userProfile.recentTransactions,
      referrals: userProfile.referrals.map((ref: any) => ({
        refereeId: ref._id,
        refereeName: ref.name,
        refereeEmail: ref.email,
        joinedAt: ref.createdAt,
        bonusEarned: 0, // Calculate actual bonus if needed
        status: 'Active'
      }))
    };

    // Log audit
    await AuditLog.create({
      adminId: request.headers.get('x-user-id'),
      action: 'users.view',
      entity: 'User',
      entityId: id,
      status: 'Success',
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return apiHandler.success(response);

  } catch (error) {
    return apiHandler.handleError(error);
  }
}

// PUT /api/users/[id] - Update user information
async function updateUserHandler(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Apply middleware
  const authResult = await authMiddleware(request, {
    requireAuth: true,
    allowedUserTypes: ['admin'],
    requiredPermission: 'users.update'
  });
  if (authResult) return authResult;

  const rateLimitResult = await apiRateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    await connectToDatabase();

    const { id } = params;
    const adminId = request.headers.get('x-user-id');

    // Validate user ID
    const idValidation = objectIdValidator.safeParse(id);
    if (!idValidation.success) {
      return apiHandler.badRequest('Invalid user ID format');
    }

    const body = await request.json();
    const validationResult = userUpdateSchema.safeParse(body);

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

    // Check if user exists
    const existingUser = await User.findById(id);
    if (!existingUser) {
      return apiHandler.notFound('User not found');
    }

    // Check for duplicate email/phone if being updated
    if (updateData.email || updateData.phone) {
      const duplicateConditions: any[] = [];
      if (updateData.email) duplicateConditions.push({ email: updateData.email });
      if (updateData.phone) duplicateConditions.push({ phone: updateData.phone });

      const duplicateUser = await User.findOne({
        $and: [
          { _id: { $ne: id } },
          { $or: duplicateConditions }
        ]
      });

      if (duplicateUser) {
        const field = duplicateUser.email === updateData.email ? 'email' : 'phone';
        return apiHandler.conflict(`User with this ${field} already exists`);
      }
    }

    // Validate plan if being updated
    if (updateData.planId) {
      const plan = await Plan.findById(updateData.planId);
      if (!plan) {
        return apiHandler.badRequest('Invalid plan ID');
      }
    }

    // Store original values for audit
    const originalValues = {
      name: existingUser.name,
      email: existingUser.email,
      phone: existingUser.phone,
      status: existingUser.status,
      planId: existingUser.planId?.toString()
    };

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { 
        ...updateData,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    ).populate('planId', 'name type description');

    if (!updatedUser) {
      return apiHandler.notFound('User not found');
    }

    // Send notification email if status changed
    if (updateData.status && updateData.status !== originalValues.status) {
      try {
        await sendEmail({
          to: updatedUser.email,
          templateId: 'account_status_update',
          subject: `Account Status Update - ${updateData.status}`,
          variables: {
            name: updatedUser.name,
            status: updateData.status,
            supportEmail: process.env.SUPPORT_EMAIL
          }
        });
      } catch (emailError) {
        console.error('Failed to send status update email:', emailError);
      }
    }

    // Log audit
    await AuditLog.create({
      adminId,
      action: 'users.update',
      entity: 'User',
      entityId: id,
      status: 'Success',
      metadata: {
        originalValues,
        updatedValues: updateData,
        changedFields: Object.keys(updateData)
      },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return apiHandler.success({
      user: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        balance: updatedUser.balance,
        status: updatedUser.status,
        kycStatus: updatedUser.kycStatus,
        referralCode: updatedUser.referralCode,
        referredBy: updatedUser.referredBy,
        profilePicture: updatedUser.profilePicture,
        dateOfBirth: updatedUser.dateOfBirth,
        address: updatedUser.address,
        emailVerified: updatedUser.emailVerified,
        phoneVerified: updatedUser.phoneVerified,
        twoFactorEnabled: updatedUser.twoFactorEnabled,
        lastLogin: updatedUser.lastLogin,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
        plan: updatedUser.planId
      }
    });

  } catch (error) {
    return apiHandler.handleError(error);
  }
}

// DELETE /api/users/[id] - Delete user (soft delete)
async function deleteUserHandler(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Apply middleware
  const authResult = await authMiddleware(request, {
    requireAuth: true,
    allowedUserTypes: ['admin'],
    requiredPermission: 'users.delete'
  });
  if (authResult) return authResult;

  try {
    await connectToDatabase();

    const { id } = params;
    const adminId = request.headers.get('x-user-id');

    // Validate user ID
    const idValidation = objectIdValidator.safeParse(id);
    if (!idValidation.success) {
      return apiHandler.badRequest('Invalid user ID format');
    }

    const user = await User.findById(id);
    if (!user) {
      return apiHandler.notFound('User not found');
    }

    // Check if user has active transactions or loans
    const activeTransactions = await Transaction.findOne({
      userId: id,
      status: { $in: ['Pending', 'Processing'] }
    });

    if (activeTransactions) {
      return apiHandler.badRequest('Cannot delete user with active transactions');
    }

    // Soft delete - mark as banned instead of actual deletion
    await User.findByIdAndUpdate(id, {
      status: 'Banned',
      email: `deleted_${Date.now()}_${user.email}`,
      phone: `deleted_${Date.now()}_${user.phone}`,
      updatedAt: new Date()
    });

    // Log audit
    await AuditLog.create({
      adminId,
      action: 'users.delete',
      entity: 'User',
      entityId: id,
      status: 'Success',
      metadata: {
        userName: user.name,
        userEmail: user.email,
        deletionType: 'soft'
      },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return apiHandler.success({ message: 'User deleted successfully' });

  } catch (error) {
    return apiHandler.handleError(error);
  }
}

export async function GET(request: NextRequest, context: { params: { id: string } }) {
  return withErrorHandler(getUserHandler)(request, context);
}

export async function PUT(request: NextRequest, context: { params: { id: string } }) {
  return withErrorHandler(updateUserHandler)(request, context);
}

export async function DELETE(request: NextRequest, context: { params: { id: string } }) {
  return withErrorHandler(deleteUserHandler)(request, context);
}