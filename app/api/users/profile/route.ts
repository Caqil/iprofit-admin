// app/api/user/profile/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/config/auth';
import { z } from 'zod';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Plan } from '@/models/Plan';
import { AuditLog } from '@/models/AuditLog';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import { nameValidator, phoneValidator } from '@/utils/validators';

// Profile update validation schema
const profileUpdateSchema = z.object({
  name: nameValidator.optional(),
  phone: phoneValidator.optional(),
  dateOfBirth: z.string().optional().refine(val => {
    if (!val) return true;
    const date = new Date(val);
    const age = new Date().getFullYear() - date.getFullYear();
    return age >= 18 && age <= 100;
  }, 'Must be between 18 and 100 years old'),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    zipCode: z.string().optional()
  }).optional(),
  deviceId: z.string().min(1, 'Device ID is required')
});

// GET /api/user/profile - Get current user profile
async function getUserProfileHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  try {
    await connectToDatabase();

    // Check authentication
    const session = await getServerSession(authConfig);
    if (!session?.user || session.user.userType !== 'user') {
      return apiHandler.unauthorized('User authentication required');
    }

    // Get user with populated plan data
    const user = await User.findById(session.user.id)
      .populate('planId', 'name type features dailyProfit monthlyProfit minInvestment maxInvestment')
      .populate('referredBy', 'name email referralCode')
      .select('-passwordHash -passwordHistory -emailVerificationToken -phoneVerificationCode -passwordResetToken -twoFactorSecret');

    if (!user) {
      return apiHandler.notFound('User not found');
    }

    // Check if user account is active
    if (user.status !== 'Active') {
      return apiHandler.forbidden(`Account is ${user.status.toLowerCase()}`);
    }

    // Format user profile response
    const userProfile = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone,
      balance: user.balance,
      status: user.status,
      kycStatus: user.kycStatus,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      twoFactorEnabled: user.twoFactorEnabled || false,
      referralCode: user.referralCode,
      profilePicture: user.profilePicture,
      dateOfBirth: user.dateOfBirth,
      address: user.address,
      deviceId: user.deviceId,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      
      // Plan information
      plan: user.planId ? {
        id: user.planId._id.toString(),
        name: user.planId.name,
        type: user.planId.type,
        features: user.planId.features,
        dailyProfit: user.planId.dailyProfit,
        monthlyProfit: user.planId.monthlyProfit,
        minInvestment: user.planId.minInvestment,
        maxInvestment: user.planId.maxInvestment
      } : null,

      // Referrer information  
      referredBy: user.referredBy ? {
        id: user.referredBy._id.toString(),
        name: user.referredBy.name,
        email: user.referredBy.email,
        referralCode: user.referredBy.referralCode
      } : null,

      // Verification status
      verification: {
        email: user.emailVerified,
        phone: user.phoneVerified,
        kyc: user.kycStatus === 'Approved',
        twoFactor: user.twoFactorEnabled || false
      },

      // Account completion percentage
      completionPercentage: calculateProfileCompletion(user)
    };

    return apiHandler.success(userProfile);

  } catch (error) {
    console.error('Get user profile error:', error);
    return apiHandler.internalError('Failed to get user profile');
  }
}

// PUT /api/user/profile - Update current user profile
async function updateUserProfileHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  try {
    await connectToDatabase();

    // Check authentication
    const session = await getServerSession(authConfig);
    if (!session?.user || session.user.userType !== 'user') {
      return apiHandler.unauthorized('User authentication required');
    }

    const body = await request.json();
    const validationResult = profileUpdateSchema.safeParse(body);

    if (!validationResult.success) {
      return apiHandler.validationError(
        validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      );
    }

    const { name, phone, dateOfBirth, address, deviceId } = validationResult.data;
    const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    // Get current user
    const currentUser = await User.findById(session.user.id);
    if (!currentUser) {
      return apiHandler.notFound('User not found');
    }

    // Check if user account is active
    if (currentUser.status !== 'Active') {
      return apiHandler.forbidden(`Account is ${currentUser.status.toLowerCase()}`);
    }

    // Store original data for audit
    const originalData = {
      name: currentUser.name,
      phone: currentUser.phone,
      dateOfBirth: currentUser.dateOfBirth,
      address: currentUser.address,
      deviceId: currentUser.deviceId
    };

    // Check if phone number is being changed and if it's already in use
    if (phone && phone !== currentUser.phone) {
      const existingPhoneUser = await User.findOne({
        phone,
        _id: { $ne: currentUser._id }
      });

      if (existingPhoneUser) {
        return apiHandler.conflict('Phone number is already in use by another account');
      }

      // If phone is changed, mark as unverified
      currentUser.phoneVerified = false;
      currentUser.phoneVerificationCode = undefined;
      currentUser.phoneVerificationExpires = undefined;
    }

    // Prepare update data
    const updateData: any = {
      deviceId,
      updatedAt: new Date()
    };

    if (name !== undefined) updateData.name = name.trim();
    if (phone !== undefined) updateData.phone = phone;
    if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
    if (address !== undefined) updateData.address = address;

    // If phone changed, update verification status
    if (phone && phone !== currentUser.phone) {
      updateData.phoneVerified = false;
      updateData.phoneVerificationCode = undefined;
      updateData.phoneVerificationExpires = undefined;
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      currentUser._id,
      updateData,
      { new: true, runValidators: true }
    ).populate('planId', 'name type features');

    if (!updatedUser) {
      return apiHandler.internalError('Failed to update profile');
    }

    // Log audit
    await AuditLog.create({
      adminId: null,
      action: 'USER_PROFILE_UPDATE',
      entity: 'User',
      entityId: updatedUser._id.toString(),
      oldData: originalData,
      newData: updateData,
      status: 'Success',
      metadata: {
        userSelfUpdate: true,
        updatedFields: Object.keys(updateData).filter(key => key !== 'updatedAt' && key !== 'deviceId')
      },
      ipAddress: clientIP,
      userAgent,
      severity: 'Low'
    });

    // Format response
    const userProfile = {
      id: updatedUser._id.toString(),
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      balance: updatedUser.balance,
      status: updatedUser.status,
      kycStatus: updatedUser.kycStatus,
      emailVerified: updatedUser.emailVerified,
      phoneVerified: updatedUser.phoneVerified,
      twoFactorEnabled: updatedUser.twoFactorEnabled || false,
      referralCode: updatedUser.referralCode,
      profilePicture: updatedUser.profilePicture,
      dateOfBirth: updatedUser.dateOfBirth,
      address: updatedUser.address,
      deviceId: updatedUser.deviceId,
      lastLogin: updatedUser.lastLogin,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
      
      plan: updatedUser.planId ? {
        id: updatedUser.planId._id.toString(),
        name: updatedUser.planId.name,
        type: updatedUser.planId.type,
        features: updatedUser.planId.features
      } : null,

      verification: {
        email: updatedUser.emailVerified,
        phone: updatedUser.phoneVerified,
        kyc: updatedUser.kycStatus === 'Approved',
        twoFactor: updatedUser.twoFactorEnabled || false
      },

      completionPercentage: calculateProfileCompletion(updatedUser)
    };

    let message = 'Profile updated successfully';
    if (phone && phone !== originalData.phone) {
      message += '. Please verify your new phone number.';
    }

    return apiHandler.success({
      user: userProfile,
      message
    });

  } catch (error) {
    console.error('Update user profile error:', error);
    return apiHandler.internalError('Failed to update profile');
  }
}

// Helper function to calculate profile completion percentage
function calculateProfileCompletion(user: any): number {
  const fields = [
    user.name,
    user.email,
    user.phone,
    user.emailVerified,
    user.phoneVerified,
    user.dateOfBirth,
    user.address?.street,
    user.address?.city,
    user.address?.country,
    user.kycStatus === 'Approved'
  ];

  const completedFields = fields.filter(field => 
    field !== null && field !== undefined && field !== ''
  ).length;

  return Math.round((completedFields / fields.length) * 100);
}

export const GET = withErrorHandler(getUserProfileHandler);
export const PUT = withErrorHandler(updateUserProfileHandler);