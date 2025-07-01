// lib/push-notifications.ts
// Push Notification Helper Functions and Firebase Admin SDK Integration

import { User } from '@/models/User';
import { Notification } from '@/models/Notification';

// Firebase Admin SDK Configuration
let admin: any = null;

export function initializeFirebaseAdmin() {
  if (!process.env.FIREBASE_ADMIN_SDK_KEY) {
    console.warn('Firebase Admin SDK not configured. Push notifications will not work.');
    return null;
  }

  try {
    if (!admin) {
      admin = require('firebase-admin');
      
      if (!admin.apps.length) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SDK_KEY);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: serviceAccount.project_id
        });
      }
    }
    
    return admin;
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK:', error);
    return null;
  }
}

// Push Notification Types
export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  image?: string;
  badge?: number;
  sound?: string;
  clickAction?: string;
  data?: Record<string, string>;
}

export interface PushNotificationOptions {
  priority?: 'normal' | 'high';
  ttl?: number; // Time to live in seconds
  collapseKey?: string;
  restrictedPackageName?: string;
  dryRun?: boolean;
}

// Main function to send push notification
export async function sendPushNotification(
  userIds: string | string[],
  payload: PushNotificationPayload,
  options: PushNotificationOptions = {}
): Promise<{
  success: boolean;
  results: any[];
  successCount: number;
  failureCount: number;
  invalidTokens: string[];
}> {
  const firebaseAdmin = initializeFirebaseAdmin();
  if (!firebaseAdmin) {
    throw new Error('Firebase Admin SDK not initialized');
  }

  const userIdArray = Array.isArray(userIds) ? userIds : [userIds];
  
  // Get users and their FCM tokens
  const users = await User.find({
    _id: { $in: userIdArray }
  }).select('_id name devices fcmToken');

  // Collect all FCM tokens
  const tokenMap = new Map<string, { userId: string; deviceName: string }>();
  
  users.forEach(user => {
    // Get tokens from devices array
    user.devices?.forEach(device => {
      if (device.fcmToken && device.isActive) {
        tokenMap.set(device.fcmToken, {
          userId: user._id.toString(),
          deviceName: device.deviceName
        });
      }
    });
    
    // Fallback to legacy FCM token
    if (user.fcmToken && !Array.from(tokenMap.values()).some(v => v.userId === user._id.toString())) {
      tokenMap.set(user.fcmToken, {
        userId: user._id.toString(),
        deviceName: 'Primary Device'
      });
    }
  });

  if (tokenMap.size === 0) {
    throw new Error('No valid FCM tokens found for the specified users');
  }

  // Prepare Firebase message
  const message = {
    notification: {
      title: payload.title,
      body: payload.body,
      ...(payload.icon && { imageUrl: payload.icon })
    },
    data: {
      timestamp: new Date().toISOString(),
      ...(payload.data || {})
    },
    android: {
      notification: {
        channelId: 'default',
        priority: options.priority === 'high' ? 'high' as const : 'normal' as const,
        defaultSound: true,
        defaultVibrateTimings: true,
        ...(payload.icon && { icon: payload.icon }),
        ...(payload.image && { imageUrl: payload.image }),
        ...(payload.clickAction && { clickAction: payload.clickAction })
      },
      ...(options.ttl && { ttl: options.ttl * 1000 }), // Convert to milliseconds
      ...(options.collapseKey && { collapseKey: options.collapseKey })
    },
    apns: {
      payload: {
        aps: {
          alert: {
            title: payload.title,
            body: payload.body
          },
          sound: payload.sound || 'default',
          badge: payload.badge || 1
        }
      },
      ...(options.ttl && { headers: { 'apns-expiration': (Math.floor(Date.now() / 1000) + options.ttl).toString() } })
    },
    webpush: {
      notification: {
        title: payload.title,
        body: payload.body,
        ...(payload.icon && { icon: payload.icon }),
        ...(payload.image && { image: payload.image }),
        ...(payload.badge && { badge: payload.badge }),
        ...(payload.clickAction && { data: { clickAction: payload.clickAction } })
      },
      ...(options.ttl && { headers: { TTL: options.ttl.toString() } })
    }
  };

  // Send notifications
  type PushNotificationResult = {
    token: string;
    userId?: string;
    deviceName?: string;
    success: boolean;
    messageId?: string;
    error?: string;
    errorCode?: string;
  };
  const results: PushNotificationResult[] = [];
  const invalidTokens: string[] = [];
  let successCount = 0;
  let failureCount = 0;

  const tokens = Array.from(tokenMap.keys());
  
  // Send in batches of 500 (Firebase limit)
  const batchSize = 500;
  for (let i = 0; i < tokens.length; i += batchSize) {
    const batch = tokens.slice(i, i + batchSize);
    
    try {
      const response = await firebaseAdmin.messaging().sendMulticast({
        ...message,
        tokens: batch,
        dryRun: options.dryRun || false
      });

      // Process individual results
      response.responses.forEach((result: any, index: number) => {
        const token = batch[index];
        const tokenInfo = tokenMap.get(token);
        
        if (result.success) {
          successCount++;
          results.push({
            token: token.slice(-6), // Show only last 6 characters for privacy
            userId: tokenInfo?.userId,
            deviceName: tokenInfo?.deviceName,
            success: true,
            messageId: result.messageId
          });
        } else {
          failureCount++;
          const error = result.error;
          
          // Check if token is invalid and should be removed
          if (error.code === 'messaging/invalid-registration-token' ||
              error.code === 'messaging/registration-token-not-registered') {
            invalidTokens.push(token);
          }
          
          results.push({
            token: token.slice(-6),
            userId: tokenInfo?.userId,
            deviceName: tokenInfo?.deviceName,
            success: false,
            error: error.message,
            errorCode: error.code
          });
        }
      });
      
    } catch (error) {
      // Batch failed completely
      batch.forEach(token => {
        const tokenInfo = tokenMap.get(token);
        failureCount++;
        results.push({
          token: token.slice(-6),
          userId: tokenInfo?.userId,
          deviceName: tokenInfo?.deviceName,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      });
    }
  }

  // Clean up invalid tokens
  if (invalidTokens.length > 0) {
    await cleanupInvalidTokens(invalidTokens);
  }

  return {
    success: successCount > 0,
    results,
    successCount,
    failureCount,
    invalidTokens
  };
}

// Function to send push notification to specific topics
export async function sendTopicNotification(
  topic: string,
  payload: PushNotificationPayload,
  options: PushNotificationOptions = {}
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const firebaseAdmin = initializeFirebaseAdmin();
  if (!firebaseAdmin) {
    throw new Error('Firebase Admin SDK not initialized');
  }

  try {
    const message = {
      topic: topic,
      notification: {
        title: payload.title,
        body: payload.body
      },
      data: {
        timestamp: new Date().toISOString(),
        ...(payload.data || {})
      },
      android: {
        notification: {
          channelId: 'default',
          priority: options.priority === 'high' ? 'high' as const : 'normal' as const,
          defaultSound: true,
          defaultVibrateTimings: true
        }
      },
      apns: {
        payload: {
          aps: {
            alert: {
              title: payload.title,
              body: payload.body
            },
            sound: payload.sound || 'default',
            badge: payload.badge || 1
          }
        }
      }
    };

    const response = await firebaseAdmin.messaging().send(message);
    
    return {
      success: true,
      messageId: response
    };
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Function to subscribe users to topics
export async function subscribeToTopic(
  userIds: string | string[],
  topic: string
): Promise<{ success: boolean; results: any[] }> {
  const firebaseAdmin = initializeFirebaseAdmin();
  if (!firebaseAdmin) {
    throw new Error('Firebase Admin SDK not initialized');
  }

  const userIdArray = Array.isArray(userIds) ? userIds : [userIds];
  
  // Get FCM tokens
  const users = await User.find({
    _id: { $in: userIdArray }
  }).select('devices fcmToken');

  const tokens: string[] = [];
  users.forEach(user => {
    user.devices?.forEach(device => {
      if (device.fcmToken && device.isActive) {
        tokens.push(device.fcmToken);
      }
    });
    
    if (user.fcmToken) {
      tokens.push(user.fcmToken);
    }
  });

  if (tokens.length === 0) {
    throw new Error('No FCM tokens found');
  }

  try {
    const response = await firebaseAdmin.messaging().subscribeToTopic(tokens, topic);
    
    return {
      success: response.failureCount < response.successCount,
      results: [{
        topic,
        successCount: response.successCount,
        failureCount: response.failureCount,
        errors: response.errors
      }]
    };
    
  } catch (error) {
    throw new Error(`Failed to subscribe to topic: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Function to unsubscribe users from topics
export async function unsubscribeFromTopic(
  userIds: string | string[],
  topic: string
): Promise<{ success: boolean; results: any[] }> {
  const firebaseAdmin = initializeFirebaseAdmin();
  if (!firebaseAdmin) {
    throw new Error('Firebase Admin SDK not initialized');
  }

  const userIdArray = Array.isArray(userIds) ? userIds : [userIds];
  
  // Get FCM tokens
  const users = await User.find({
    _id: { $in: userIdArray }
  }).select('devices fcmToken');

  const tokens: string[] = [];
  users.forEach(user => {
    user.devices?.forEach(device => {
      if (device.fcmToken && device.isActive) {
        tokens.push(device.fcmToken);
      }
    });
    
    if (user.fcmToken) {
      tokens.push(user.fcmToken);
    }
  });

  if (tokens.length === 0) {
    throw new Error('No FCM tokens found');
  }

  try {
    const response = await firebaseAdmin.messaging().unsubscribeFromTopic(tokens, topic);
    
    return {
      success: response.failureCount < response.successCount,
      results: [{
        topic,
        successCount: response.successCount,
        failureCount: response.failureCount,
        errors: response.errors
      }]
    };
    
  } catch (error) {
    throw new Error(`Failed to unsubscribe from topic: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Function to clean up invalid FCM tokens
async function cleanupInvalidTokens(invalidTokens: string[]): Promise<void> {
  try {
    // Remove invalid tokens from users' devices
    await User.updateMany(
      {
        $or: [
          { 'devices.fcmToken': { $in: invalidTokens } },
          { fcmToken: { $in: invalidTokens } }
        ]
      },
      {
        $unset: {
          'devices.$[device].fcmToken': '',
          fcmToken: ''
        }
      },
      {
        arrayFilters: [
          { 'device.fcmToken': { $in: invalidTokens } }
        ]
      }
    );

    console.log(`Cleaned up ${invalidTokens.length} invalid FCM tokens`);
    
  } catch (error) {
    console.error('Error cleaning up invalid tokens:', error);
  }
}

// Function to create and queue notification
export async function createNotification(
  userId: string,
  type: 'KYC' | 'Withdrawal' | 'Loan' | 'Task' | 'Referral' | 'System' | 'Marketing',
  channel: 'email' | 'sms' | 'in_app' | 'push',
  title: string,
  message: string,
  data?: any,
  options?: {
    priority?: 'Low' | 'Medium' | 'High' | 'Urgent';
    scheduledAt?: Date;
    metadata?: any;
  }
): Promise<any> {
  const notification = await Notification.create({
    userId,
    type,
    channel,
    title,
    message,
    data,
    priority: options?.priority || 'Medium',
    scheduledAt: options?.scheduledAt,
    status: 'Pending',
    metadata: {
      ...options?.metadata,
      createdBy: 'system'
    }
  });

  // If it's a push notification and not scheduled, send immediately
  if (channel === 'push' && !options?.scheduledAt) {
    try {
      await sendPushNotification(userId, {
        title,
        body: message,
        data: data ? Object.keys(data).reduce((acc, key) => {
          acc[key] = String(data[key]);
          return acc;
        }, {} as Record<string, string>) : undefined
      });

      notification.status = 'Sent';
      notification.sentAt = new Date();
      await notification.save();

    } catch (error) {
      console.error('Failed to send immediate push notification:', error);
      notification.status = 'Failed';
      notification.failureReason = error instanceof Error ? error.message : 'Unknown error';
      await notification.save();
    }
  }

  return notification;
}

// Helper function to get Firebase Messaging instance
export function getMessaging() {
  const firebaseAdmin = initializeFirebaseAdmin();
  return firebaseAdmin ? firebaseAdmin.messaging() : null;
}

// Helper function to validate FCM token
export async function validateFCMToken(token: string): Promise<boolean> {
  const firebaseAdmin = initializeFirebaseAdmin();
  if (!firebaseAdmin) {
    return false;
  }

  try {
    await firebaseAdmin.messaging().send({
      token,
      data: { test: 'true' }
    }, true); // dry run
    
    return true;
  } catch (error) {
    return false;
  }
}

// Export types and constants
export const NOTIFICATION_TOPICS = {
  SYSTEM: 'system_notifications',
  TRANSACTIONS: 'transaction_notifications',
  LOANS: 'loan_notifications',
  REFERRALS: 'referral_notifications',
  TASKS: 'task_notifications',
  MARKETING: 'marketing_notifications',
  SECURITY: 'security_notifications'
} as const;

export const FCM_ERROR_CODES = {
  INVALID_REGISTRATION_TOKEN: 'messaging/invalid-registration-token',
  REGISTRATION_TOKEN_NOT_REGISTERED: 'messaging/registration-token-not-registered',
  INVALID_PACKAGE_NAME: 'messaging/invalid-package-name',
  MESSAGE_RATE_EXCEEDED: 'messaging/message-rate-exceeded',
  DEVICE_MESSAGE_RATE_EXCEEDED: 'messaging/device-message-rate-exceeded',
  TOPICS_MESSAGE_RATE_EXCEEDED: 'messaging/topics-message-rate-exceeded',
  INVALID_PARAMETERS: 'messaging/invalid-parameters',
  UNKNOWN_ERROR: 'messaging/unknown-error'
} as const;