import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { AuditLog } from '@/models/AuditLog';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import { getUserFromRequest } from '@/lib/auth-helper';
import mongoose from 'mongoose';

// Notification preferences validation schema
const notificationPreferencesSchema = z.object({
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
  marketing: z.object({
    emailMarketing: z.boolean().optional(),
    smsMarketing: z.boolean().optional(),
    pushMarketing: z.boolean().optional(),
    personalizedOffers: z.boolean().optional(),
    referralNotifications: z.boolean().optional()
  }).optional(),
  security: z.object({
    loginNotifications: z.boolean().optional(),
    suspiciousActivityAlerts: z.boolean().optional(),
    deviceRegistrationNotifications: z.boolean().optional(),
    sessionTimeout: z.number().min(5).max(120).optional()
  }).optional()
});

// GET /api/notifications/preferences - Get notification preferences
async function getNotificationPreferencesHandler(request: NextRequest) {
  const apiHandler = new ApiHandler(request);

  try {
    // Connect to database
    await connectToDatabase();

    // Get authenticated user
    const authResult = await getUserFromRequest(request);
    if (!authResult) {
      return apiHandler.unauthorized('Authentication required');
    }

    const userId = new mongoose.Types.ObjectId(authResult.userId);

    // Get user with preferences
    const user = await User.findById(userId).select('preferences name email');
    if (!user) {
      return apiHandler.notFound('User not found');
    }

    // Get default preferences if not set
    const defaultPreferences = User.getDefaultPreferences();
    const currentPreferences = user.preferences || defaultPreferences;

    // Get device-specific notification settings
    const devices = user.devices?.map(device => ({
      deviceId: device.deviceId,
      deviceName: device.deviceName,
      platform: device.platform,
      fcmToken: !!device.fcmToken,
      isPrimary: device.isPrimary,
      lastActiveAt: device.lastActiveAt
    })) || [];

    return apiHandler.success({
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      },
      preferences: {
        notifications: currentPreferences.notifications,
        marketing: currentPreferences.marketing,
        security: currentPreferences.security
      },
      devices: devices,
      summary: {
        totalDevices: devices.length,
        devicesWithPush: devices.filter(d => d.fcmToken).length,
        primaryDevice: devices.find(d => d.isPrimary)?.deviceName || 'None',
        lastUpdated: user.updatedAt
      }
    });

  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    return apiHandler.internalError('Failed to fetch notification preferences');
  }
}

// PUT /api/notifications/preferences - Update notification preferences
async function updateNotificationPreferencesHandler(request: NextRequest) {
  const apiHandler = new ApiHandler(request);

  try {
    // Connect to database
    await connectToDatabase();

    // Get authenticated user
    const authResult = await getUserFromRequest(request);
    if (!authResult) {
      return apiHandler.unauthorized('Authentication required');
    }

    const userId = new mongoose.Types.ObjectId(authResult.userId);

    // Parse request body
    const body = await request.json();
    const validationResult = notificationPreferencesSchema.safeParse(body);
    
    if (!validationResult.success) {
      return apiHandler.validationError(
        validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      );
    }

    const updates = validationResult.data;

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      return apiHandler.notFound('User not found');
    }

    // Store old preferences for audit log
    const oldPreferences = user.preferences ? JSON.parse(JSON.stringify(user.preferences)) : null;

    // Initialize preferences if not set
    if (!user.preferences) {
      user.preferences = User.getDefaultPreferences();
    }

    // Track what was changed
    const changes: string[] = [];

    // Update notification preferences
    if (updates.notifications) {
      Object.keys(updates.notifications).forEach(channel => {
        if (updates.notifications![channel as keyof typeof updates.notifications]) {
          Object.keys(updates.notifications![channel as keyof typeof updates.notifications]!).forEach(type => {
            const newValue = updates.notifications![channel as keyof typeof updates.notifications]![type as any];
            if (newValue !== undefined) {
              const oldValue = user.preferences!.notifications[channel as keyof typeof user.preferences.notifications][type as any];
              if (oldValue !== newValue) {
                user.preferences!.notifications[channel as keyof typeof user.preferences.notifications][type as any] = newValue;
                changes.push(`${channel}.${type}: ${oldValue} → ${newValue}`);
              }
            }
          });
        }
      });
    }

    // Update marketing preferences
    if (updates.marketing) {
      Object.keys(updates.marketing).forEach(key => {
        const newValue = updates.marketing![key as keyof typeof updates.marketing];
        if (newValue !== undefined) {
          const oldValue = user.preferences!.marketing[key as keyof typeof user.preferences.marketing];
          if (oldValue !== newValue) {
            user.preferences!.marketing[key as keyof typeof user.preferences.marketing] = newValue;
            changes.push(`marketing.${key}: ${oldValue} → ${newValue}`);
          }
        }
      });
    }

    // Update security preferences
    if (updates.security) {
      Object.keys(updates.security).forEach(key => {
        const newValue = updates.security![key as keyof typeof updates.security];
        if (newValue !== undefined) {
          const oldValue = user.preferences!.security[key as keyof typeof user.preferences.security];
          if (oldValue !== newValue) {
            user.preferences!.security[key as keyof typeof user.preferences.security] = newValue;
            changes.push(`security.${key}: ${oldValue} → ${newValue}`);
          }
        }
      });
    }

    user.lastActiveAt = new Date();
    await user.save();

    // Update FCM topic subscriptions based on new preferences
    try {
      if (process.env.FIREBASE_ADMIN_SDK_KEY && user.devices?.length) {
        await updateFCMTopicSubscriptions(user);
      }
    } catch (fcmError) {
      console.error('FCM topic update error:', fcmError);
      // Don't fail the request if topic updates fail
    }

    // Log preference changes
    await AuditLog.create({
      adminId: null,
      action: 'NOTIFICATION_PREFERENCES_UPDATED',
      entity: 'User',
      entityId: userId.toString(),
      oldData: oldPreferences,
      newData: user.preferences,
      status: 'Success',
      metadata: {
        userSelfAction: true,
        userId: userId.toString(),
        userName: user.name,
        changesCount: changes.length,
        changes: changes
      },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      severity: 'Low'
    });

    return apiHandler.success({
      message: 'Notification preferences updated successfully',
      changes: changes,
      preferences: {
        notifications: user.preferences.notifications,
        marketing: user.preferences.marketing,
        security: user.preferences.security
      },
      updatedAt: user.updatedAt
    });

  } catch (error) {
    console.error('Error updating notification preferences:', error);
    return apiHandler.internalError('Failed to update notification preferences');
  }
}

// Helper function to update FCM topic subscriptions
async function updateFCMTopicSubscriptions(user: any) {
  const admin = require('firebase-admin');
  
  // Get all FCM tokens from user's devices
  const fcmTokens = user.devices
    ?.filter((d: any) => d.fcmToken && d.isActive)
    .map((d: any) => d.fcmToken) || [];

  if (fcmTokens.length === 0) return;

  // Define topic mapping based on preferences
  const topicMappings = [
    { topic: 'system_notifications', enabled: user.preferences?.notifications?.push?.system },
    { topic: 'transaction_notifications', enabled: user.preferences?.notifications?.push?.transactions },
    { topic: 'loan_notifications', enabled: user.preferences?.notifications?.push?.loans },
    { topic: 'referral_notifications', enabled: user.preferences?.notifications?.push?.referrals },
    { topic: 'task_notifications', enabled: user.preferences?.notifications?.push?.tasks },
    { topic: 'marketing_notifications', enabled: user.preferences?.notifications?.push?.marketing },
    { topic: 'security_notifications', enabled: user.preferences?.notifications?.push?.security }
  ];

  // Update subscriptions for each topic
  for (const mapping of topicMappings) {
    try {
      if (mapping.enabled) {
        await admin.messaging().subscribeToTopic(fcmTokens, mapping.topic);
      } else {
        await admin.messaging().unsubscribeFromTopic(fcmTokens, mapping.topic);
      }
    } catch (error) {
      console.error(`Error updating topic ${mapping.topic}:`, error);
    }
  }
}

export const GET = withErrorHandler(getNotificationPreferencesHandler);
export const PUT = withErrorHandler(updateNotificationPreferencesHandler);
