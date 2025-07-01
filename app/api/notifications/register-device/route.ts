import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { AuditLog } from '@/models/AuditLog';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import { getUserFromRequest } from '@/lib/auth-helper';
import mongoose from 'mongoose';

// FCM token registration validation schema
const fcmTokenRegistrationSchema = z.object({
  deviceId: z.string().min(1, 'Device ID is required'),
  fcmToken: z.string().min(1, 'FCM token is required'),
  platform: z.enum(['ios', 'android', 'web']),
  appVersion: z.string().optional(),
  osVersion: z.string().optional(),
  notificationPermission: z.enum(['granted', 'denied', 'default']).optional(),
  topics: z.array(z.string()).optional().default([]),
  testNotification: z.boolean().optional().default(false)
});

async function registerFCMTokenHandler(request: NextRequest) {
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
    const validationResult = fcmTokenRegistrationSchema.safeParse(body);
    
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
      deviceId, 
      fcmToken, 
      platform, 
      appVersion, 
      osVersion, 
      notificationPermission,
      topics,
      testNotification 
    } = validationResult.data;

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      return apiHandler.notFound('User not found');
    }

    // Find the device in user's devices array
    const deviceIndex = user.devices?.findIndex(d => d.deviceId === deviceId);
    
    if (deviceIndex === undefined || deviceIndex === -1) {
      return apiHandler.notFound('Device not registered. Please register device first.');
    }

    const device = user.devices[deviceIndex];
    const oldFCMToken = device.fcmToken;

    // Update device with new FCM token
    device.fcmToken = fcmToken;
    device.lastActiveAt = new Date();
    
    if (appVersion) device.appVersion = appVersion;
    if (osVersion) device.osVersion = osVersion;

    // If this is the primary device, update user's main FCM token for backwards compatibility
    if (device.isPrimary) {
      user.fcmToken = fcmToken;
      user.lastAppVersion = appVersion || user.lastAppVersion;
    }

    user.lastActiveAt = new Date();

    // Subscribe to default topics based on user preferences
    const defaultTopics: Array<'system_notifications' | 'transaction_notifications' | 'loan_notifications' | 'marketing_notifications'> = [];
    if (user.preferences?.notifications?.push?.system) defaultTopics.push('system_notifications');
    if (user.preferences?.notifications?.push?.transactions) defaultTopics.push('transaction_notifications');
    if (user.preferences?.notifications?.push?.loans) defaultTopics.push('loan_notifications');
    if (user.preferences?.notifications?.push?.marketing) defaultTopics.push('marketing_notifications');

    await user.save();

    // Subscribe to FCM topics (if Firebase Admin SDK is configured)
    try {
      if (process.env.FIREBASE_ADMIN_SDK_KEY) {
        const admin = require('firebase-admin');
        
        // Initialize Firebase Admin if not already done
        if (!admin.apps.length) {
          const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SDK_KEY);
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
          });
        }

        // Subscribe to topics
        const topicsToSubscribe = [...defaultTopics, ...topics];
        if (topicsToSubscribe.length > 0) {
          await admin.messaging().subscribeToTopic(fcmToken, topicsToSubscribe);
        }

        // Unsubscribe from previous topics if token changed
        if (oldFCMToken && oldFCMToken !== fcmToken) {
          await admin.messaging().unsubscribeFromTopic(oldFCMToken, topicsToSubscribe);
        }
      }
    } catch (fcmError) {
      console.error('FCM topic subscription error:', fcmError);
      // Don't fail the request if topic subscription fails
    }

    // Send test notification if requested
    let testNotificationResult: Awaited<ReturnType<typeof sendTestPushNotification>> | null = null;
    if (testNotification) {
      testNotificationResult = await sendTestPushNotification(fcmToken, user.name, platform);
    }

    // Log FCM token registration
    await AuditLog.create({
      adminId: null,
      action: 'FCM_TOKEN_REGISTERED',
      entity: 'Device',
      entityId: deviceId,
      oldData: { fcmToken: oldFCMToken },
      newData: { fcmToken: fcmToken },
      status: 'Success',
      metadata: {
        userSelfAction: true,
        userId: userId.toString(),
        userName: user.name,
        platform: platform,
        appVersion: appVersion,
        osVersion: osVersion,
        notificationPermission: notificationPermission,
        topicsSubscribed: [...defaultTopics, ...topics],
        tokenChanged: oldFCMToken !== fcmToken,
        testNotificationSent: testNotification
      },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      severity: 'Low'
    });

    return apiHandler.success({
      message: 'FCM token registered successfully',
      device: {
        deviceId: device.deviceId,
        deviceName: device.deviceName,
        platform: device.platform,
        fcmToken: fcmToken,
        isPrimary: device.isPrimary,
        lastActiveAt: device.lastActiveAt
      },
      subscription: {
        topics: [...defaultTopics, ...topics],
        notificationPermission: notificationPermission
      },
      testNotification: testNotificationResult
    });

  } catch (error) {
    console.error('Error registering FCM token:', error);
    return apiHandler.internalError('Failed to register FCM token');
  }
}

// Helper function to send test push notification
async function sendTestPushNotification(fcmToken: string, userName: string, platform: string) {
  try {
    if (!process.env.FIREBASE_ADMIN_SDK_KEY) {
      return { success: false, message: 'Firebase Admin SDK not configured' };
    }

    const admin = require('firebase-admin');
    
    const message = {
      token: fcmToken,
      notification: {
        title: '🎉 Push Notifications Active!',
        body: `Welcome ${userName}! Your push notifications are now enabled.`
      },
      data: {
        type: 'test_notification',
        timestamp: new Date().toISOString(),
        platform: platform
      },
      android: {
        notification: {
          channelId: 'default',
          priority: 'high' as const,
          defaultSound: true,
          defaultVibrateTimings: true
        }
      },
      apns: {
        payload: {
          aps: {
            alert: {
              title: '🎉 Push Notifications Active!',
              body: `Welcome ${userName}! Your push notifications are now enabled.`
            },
            sound: 'default',
            badge: 1
          }
        }
      }
    };

    const response = await admin.messaging().send(message);
    
    return {
      success: true,
      messageId: response,
      message: 'Test notification sent successfully'
    };

  } catch (error) {
    console.error('Test notification error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export const POST = withErrorHandler(registerFCMTokenHandler);
