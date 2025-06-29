// app/api/users/[id]/route.ts
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

// Next.js 15 Route Handler with proper params typing
interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/users/[id] - Get user details with profile information
async function getUserHandler(
  request: NextRequest,
  context: RouteContext
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

    // Await the params Promise (Next.js 15 requirement)
    const { id } = await context.params;

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
          as: 'plan',
          pipeline: [
            {
              $project: {
                name: 1,
                description: 1,
                price: 1,
                features: 1,
                limits: 1,
                isActive: 1
              }
            }
          ]
        }
      },
      { $unwind: { path: '$plan', preserveNullAndEmptyArrays: true } },

      // Lookup recent transactions
      {
        $lookup: {
          from: 'transactions',
          localField: '_id',
          foreignField: 'userId',
          as: 'recentTransactions',
          pipeline: [
            { $sort: { createdAt: -1 } },
            { $limit: 10 },
            {
              $project: {
                type: 1,
                amount: 1,
                currency: 1,
                status: 1,
                gateway: 1,
                createdAt: 1,
                description: 1
              }
            }
          ]
        }
      },

      // Lookup referrals (users referred by this user)
      {
        $lookup: {
          from: 'users',
          localField: 'referralCode',
          foreignField: 'referredBy',
          as: 'referrals',
          pipeline: [
            {
              $project: {
                name: 1,
                email: 1,
                createdAt: 1,
                status: 1
              }
            }
          ]
        }
      },

      // Calculate statistics
      {
        $addFields: {
          statistics: {
            totalTransactions: { $size: '$recentTransactions' },
            totalReferrals: { $size: '$referrals' },
            accountAge: {
              $divide: [
                { $subtract: [new Date(), '$createdAt'] },
                1000 * 60 * 60 * 24 // Convert to days
              ]
            }
          }
        }
      }
    ];

    const [userProfile] = await User.aggregate(pipeline);

    if (!userProfile) {
      return apiHandler.notFound('User not found');
    }

    // Format response
    const response = {
      user: {
        _id: userProfile._id,
        name: userProfile.name,
        email: userProfile.email,
        phone: userProfile.phone,
        balance: userProfile.balance,
        status: userProfile.status,
        kycStatus: userProfile.kycStatus,
        referralCode: userProfile.referralCode,
        referredBy: userProfile.referredBy,
        profilePicture: userProfile.profilePicture,
        dateOfBirth: userProfile.dateOfBirth,
        address: userProfile.address,
        emailVerified: userProfile.emailVerified,
        phoneVerified: userProfile.phoneVerified,
        twoFactorEnabled: userProfile.twoFactorEnabled,
        lastLogin: userProfile.lastLogin,
        createdAt: userProfile.createdAt,
        updatedAt: userProfile.updatedAt,
        planId: userProfile.planId // add planId to satisfy User type
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
  context: RouteContext
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

    // Await the params Promise (Next.js 15 requirement)
    const { id } = await context.params;
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

    // Store original data for audit log
    const originalData = {
      name: existingUser.name,
      email: existingUser.email,
      phone: existingUser.phone,
      status: existingUser.status,
      balance: existingUser.balance,
      planId: existingUser.planId
    };

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { 
        ...updateData, 
        updatedAt: new Date() 
      },
      { 
        new: true, 
        runValidators: true 
      }
    ).populate('planId', 'name description price features limits');

    if (!updatedUser) {
      return apiHandler.notFound('User not found');
    }

    // Send notification email if status changed or important updates
    try {
      const statusChanged = originalData.status !== updateData.status;
      const emailChanged = originalData.email !== updateData.email;
      
      if (statusChanged && updateData.status) {
        let emailTemplate = '';
        let emailSubject = '';
        
        switch (updateData.status) {
          case 'Active':
            emailTemplate = 'account_activated';
            emailSubject = 'Account Activated';
            break;
          case 'Suspended':
            emailTemplate = 'account_suspended';
            emailSubject = 'Account Suspended';
            break;
          case 'Banned':
            emailTemplate = 'account_banned';
            emailSubject = 'Account Banned';
            break;
        }
        
        if (emailTemplate) {
          await sendEmail({
            to: updatedUser.email,
            subject: emailSubject,
            templateId: emailTemplate,
            variables: {
              userName: updatedUser.name,
              status: updateData.status,
              updateDate: new Date().toLocaleDateString(),
              supportEmail: process.env.SUPPORT_EMAIL || 'support@example.com',
              loginUrl: `${process.env.NEXTAUTH_URL}/login`
            }
          });
        }
      }
      
      if (emailChanged) {
        await sendEmail({
          to: updateData.email!,
          subject: 'Email Address Updated',
          templateId: 'email_updated',
          variables: {
            userName: updatedUser.name,
            newEmail: updateData.email!,
            updateDate: new Date().toLocaleDateString(),
            supportEmail: process.env.SUPPORT_EMAIL || 'support@example.com'
          }
        });
      }
    } catch (emailError) {
      console.error('Failed to send user update notification email:', emailError);
      // Don't fail the request if email fails
    }

    // Log audit
    await AuditLog.create({
      adminId,
      action: 'users.update',
      entity: 'User',
      entityId: id,
      oldData: originalData,
      newData: updateData,
      status: 'Success',
      metadata: {
        updatedFields: Object.keys(updateData)
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
  context: RouteContext
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

    // Await the params Promise (Next.js 15 requirement)
    const { id } = await context.params;
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

    // Store user data for audit log before soft delete
    const userData = {
      name: user.name,
      email: user.email,
      phone: user.phone,
      balance: user.balance,
      status: user.status,
      kycStatus: user.kycStatus
    };

    // Soft delete - mark as banned instead of actual deletion
    const updatedUser = await User.findByIdAndUpdate(id, {
      status: 'Banned',
      email: `deleted_${Date.now()}_${user.email}`,
      phone: `deleted_${Date.now()}_${user.phone}`,
      updatedAt: new Date()
    }, { new: true });

    // Send account deletion notification email (to original email before masking)
    try {
      await sendEmail({
        to: user.email, // Use original email before it was masked
        subject: 'Account Deleted',
        templateId: 'account_deleted',
        variables: {
          userName: user.name,
          deletionDate: new Date().toLocaleDateString(),
          reason: 'Administrative action',
          supportEmail: process.env.SUPPORT_EMAIL || 'support@example.com'
        }
      });
    } catch (emailError) {
      console.error('Failed to send account deletion email:', emailError);
      // Don't fail the request if email fails
    }

    // Log audit
    await AuditLog.create({
      adminId,
      action: 'users.delete',
      entity: 'User',
      entityId: id,
      oldData: userData,
      status: 'Success',
      metadata: {
        userName: user.name,
        userEmail: user.email,
        deletionType: 'soft',
        hasActiveTransactions: !!activeTransactions
      },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return apiHandler.success({ 
      message: 'User deleted successfully',
      deletedUser: {
        id: updatedUser?._id,
        name: userData.name,
        deletedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    return apiHandler.handleError(error);
  }
}

// Export handlers with Next.js 15 compatible context
export async function GET(request: NextRequest, context: RouteContext) {
  return withErrorHandler(getUserHandler)(request, context);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return withErrorHandler(updateUserHandler)(request, context);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return withErrorHandler(deleteUserHandler)(request, context);
}