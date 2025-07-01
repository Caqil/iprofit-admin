// app/api/user/preferences/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/config/auth';
import { z } from 'zod';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { AuditLog } from '@/models/AuditLog';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';

// User preferences validation schema
const preferencesUpdateSchema = z.object({
  notifications: z.object({
    email: z.object({
      kyc: z.boolean().optional(),
      transactions: z.boolean().optional(),
      loans: z.boolean().optional(),
      referrals: z.boolean().optional(),
      tasks: z.boolean().optional(),
      system: z.boolean().optional(),
      marketing: z.boolean().optional(),
      security: z.boolean().optional()
    }).optional(),
    push: z.object({
      kyc: z.boolean().optional(),
      transactions: z.boolean().optional(),
      loans: z.boolean().optional(),
      referrals: z.boolean().optional(),
      tasks: z.boolean().optional(),
      system: z.boolean().optional(),
      marketing: z.boolean().optional(),
      security: z.boolean().optional()
    }).optional(),
    sms: z.object({
      kyc: z.boolean().optional(),
      transactions: z.boolean().optional(),
      loans: z.boolean().optional(),
      referrals: z.boolean().optional(),
      tasks: z.boolean().optional(),
      system: z.boolean().optional(),
      marketing: z.boolean().optional(),
      security: z.boolean().optional()
    }).optional(),
    inApp: z.object({
      kyc: z.boolean().optional(),
      transactions: z.boolean().optional(),
      loans: z.boolean().optional(),
      referrals: z.boolean().optional(),
      tasks: z.boolean().optional(),
      system: z.boolean().optional(),
      marketing: z.boolean().optional(),
      security: z.boolean().optional()
    }).optional()
  }).optional(),
  privacy: z.object({
    profileVisibility: z.enum(['public', 'private', 'friends']).optional(),
    showBalance: z.boolean().optional(),
    showTransactions: z.boolean().optional(),
    showReferrals: z.boolean().optional(),
    allowContact: z.boolean().optional()
  }).optional(),
  app: z.object({
    language: z.enum(['en', 'bn', 'hi']).optional(),
    currency: z.enum(['BDT', 'USD']).optional(),
    theme: z.enum(['light', 'dark', 'auto']).optional(),
    biometricLogin: z.boolean().optional(),
    autoLock: z.boolean().optional(),
    autoLockDuration: z.number().min(1).max(60).optional(), // minutes
    soundEnabled: z.boolean().optional(),
    vibrationEnabled: z.boolean().optional()
  }).optional(),
  security: z.object({
    twoFactorEnabled: z.boolean().optional(),
    loginNotifications: z.boolean().optional(),
    suspiciousActivityAlerts: z.boolean().optional(),
    deviceRegistrationNotifications: z.boolean().optional(),
    sessionTimeout: z.number().min(5).max(120).optional() // minutes
  }).optional(),
  marketing: z.object({
    emailMarketing: z.boolean().optional(),
    smsMarketing: z.boolean().optional(),
    pushMarketing: z.boolean().optional(),
    personalizedOffers: z.boolean().optional(),
    referralNotifications: z.boolean().optional()
  }).optional(),
  deviceId: z.string().min(1, 'Device ID is required')
});

// GET /api/user/preferences - Get user preferences
async function getUserPreferencesHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  try {
    await connectToDatabase();

    // Check authentication
    const session = await getServerSession(authConfig);
    if (!session?.user || session.user.userType !== 'user') {
      return apiHandler.unauthorized('User authentication required');
    }

    // Get user with preferences
    const user = await User.findById(session.user.id)
      .select('preferences deviceId createdAt');

    if (!user) {
      return apiHandler.notFound('User not found');
    }

    // Return preferences with defaults
    const preferences = getDefaultPreferences(user.preferences || {});

    return apiHandler.success({
      preferences,
      deviceId: user.deviceId,
      lastUpdated: user.updatedAt || user.createdAt
    });

  } catch (error) {
    console.error('Get user preferences error:', error);
    return apiHandler.internalError('Failed to get user preferences');
  }
}

// PUT /api/user/preferences - Update user preferences
async function updateUserPreferencesHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  try {
    await connectToDatabase();

    // Check authentication
    const session = await getServerSession(authConfig);
    if (!session?.user || session.user.userType !== 'user') {
      return apiHandler.unauthorized('User authentication required');
    }

    const body = await request.json();
    const validationResult = preferencesUpdateSchema.safeParse(body);

    if (!validationResult.success) {
      return apiHandler.validationError(
        validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      );
    }

    const { notifications, privacy, app, security, marketing, deviceId } = validationResult.data;
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

    // Merge with existing preferences
    const currentPreferences = currentUser.preferences || {};
    const updatedPreferences = {
      notifications: {
        ...getDefaultNotificationPreferences(),
        ...currentPreferences.notifications,
        ...notifications
      },
      privacy: {
        ...getDefaultPrivacyPreferences(),
        ...currentPreferences.privacy,
        ...privacy
      },
      app: {
        ...getDefaultAppPreferences(),
        ...currentPreferences.app,
        ...app
      },
      security: {
        ...getDefaultSecurityPreferences(),
        ...currentPreferences.security,
        ...security
      },
      marketing: {
        ...getDefaultMarketingPreferences(),
        ...currentPreferences.marketing,
        ...marketing
      }
    };

    // Store original data for audit
    const originalData = {
      preferences: currentUser.preferences,
      deviceId: currentUser.deviceId
    };

    // Update user preferences
    const updatedUser = await User.findByIdAndUpdate(
      currentUser._id,
      {
        preferences: updatedPreferences,
        deviceId,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return apiHandler.internalError('Failed to update preferences');
    }

    // Log audit
    await AuditLog.create({
      adminId: null,
      action: 'USER_PREFERENCES_UPDATE',
      entity: 'User',
      entityId: updatedUser._id.toString(),
      oldData: originalData,
      newData: {
        preferences: updatedPreferences,
        deviceId
      },
      status: 'Success',
      metadata: {
        userSelfUpdate: true,
        updatedSections: Object.keys(body).filter(key => key !== 'deviceId')
      },
      ipAddress: clientIP,
      userAgent,
      severity: 'Low'
    });

    return apiHandler.success({
      preferences: updatedPreferences,
      message: 'Preferences updated successfully'
    });

  } catch (error) {
    console.error('Update user preferences error:', error);
    return apiHandler.internalError('Failed to update preferences');
  }
}

// Helper functions to provide default preferences
function getDefaultPreferences(existingPreferences: any = {}) {
  return {
    notifications: {
      ...getDefaultNotificationPreferences(),
      ...existingPreferences.notifications
    },
    privacy: {
      ...getDefaultPrivacyPreferences(),
      ...existingPreferences.privacy
    },
    app: {
      ...getDefaultAppPreferences(),
      ...existingPreferences.app
    },
    security: {
      ...getDefaultSecurityPreferences(),
      ...existingPreferences.security
    },
    marketing: {
      ...getDefaultMarketingPreferences(),
      ...existingPreferences.marketing
    }
  };
}

function getDefaultNotificationPreferences() {
  return {
    email: {
      kyc: true,
      transactions: true,
      loans: true,
      referrals: true,
      tasks: true,
      system: true,
      marketing: false,
      security: true
    },
    push: {
      kyc: true,
      transactions: true,
      loans: true,
      referrals: true,
      tasks: true,
      system: true,
      marketing: false,
      security: true
    },
    sms: {
      kyc: true,
      transactions: true,
      loans: false,
      referrals: false,
      tasks: false,
      system: true,
      marketing: false,
      security: true
    },
    inApp: {
      kyc: true,
      transactions: true,
      loans: true,
      referrals: true,
      tasks: true,
      system: true,
      marketing: true,
      security: true
    }
  };
}

function getDefaultPrivacyPreferences() {
  return {
    profileVisibility: 'private',
    showBalance: false,
    showTransactions: false,
    showReferrals: false,
    allowContact: true
  };
}

function getDefaultAppPreferences() {
  return {
    language: 'en',
    currency: 'BDT',
    theme: 'auto',
    biometricLogin: false,
    autoLock: true,
    autoLockDuration: 5, // 5 minutes
    soundEnabled: true,
    vibrationEnabled: true
  };
}

function getDefaultSecurityPreferences() {
  return {
    twoFactorEnabled: false,
    loginNotifications: true,
    suspiciousActivityAlerts: true,
    deviceRegistrationNotifications: true,
    sessionTimeout: 30 // 30 minutes
  };
}

function getDefaultMarketingPreferences() {
  return {
    emailMarketing: false,
    smsMarketing: false,
    pushMarketing: false,
    personalizedOffers: true,
    referralNotifications: true
  };
}

export const GET = withErrorHandler(getUserPreferencesHandler);
export const PUT = withErrorHandler(updateUserPreferencesHandler);