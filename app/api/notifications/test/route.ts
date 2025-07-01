import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Notification } from '@/models/Notification';
import { AuditLog } from '@/models/AuditLog';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import { getUserFromRequest } from '@/lib/auth-helper';
import { sendEmail } from '@/lib/email';
import mongoose from 'mongoose';

// Test notification validation schema
const testNotificationSchema = z.object({
  type: z.enum(['push', 'email', 'sms', 'all']).default('push'),
  title: z.string().min(1).max(100).default('Test Notification'),
  message: z.string().min(1).max(500).default('This is a test notification to verify your settings.'),
  deviceId: z.string().optional(), // For testing specific device
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).optional().default('Medium'),
  data: z.record(z.any()).optional(),
  customPayload: z.object({
    title: z.string().optional(),
    body: z.string().optional(),
    icon: z.string().optional(),
    image: z.string().optional(),
    sound: z.string().optional(),
    badge: z.number().optional()
  }).optional()
});

async function testNotificationHandler(request: NextRequest) {
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
    const validationResult = testNotificationSchema.safeParse(body);
    
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
      type, 
      title, 
      message, 
      deviceId, 
      priority, 
      data, 
      customPayload 
    } = validationResult.data;

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      return apiHandler.notFound('User not found');
    }

    const results = {
      push: null as any,
      email: null as any,
      sms: null as any,
      inApp: null as any
    };

    // Test push notification
    if (type === 'push' || type === 'all') {
      results.push = await testPushNotification(user, title, message, deviceId, customPayload);
    }

    // Test email notification
    if (type === 'email' || type === 'all') {
      results.email = await testEmailNotification(user, title, message);
    }

    // Test SMS notification
    if (type === 'sms' || type === 'all') {
      results.sms = await testSMSNotification(user, title, message);
    }

    // Create in-app notification for all test types
    const inAppNotification = await Notification.create({
      userId: userId,
      type: 'System',
      channel: 'in_app',
      title: title,
      message: message,
      status: 'Delivered',
      priority: priority,
      sentAt: new Date(),
      deliveredAt: new Date(),
      data: {
        testNotification: true,
        originalType: type,
        ...data
      },
      metadata: {
        isTest: true,
        requestedBy: userId.toString(),
        testType: type
      }
    });

    results.inApp = {
      success: true,
      notificationId: inAppNotification._id,
      message: 'In-app notification created'
    };

    // Log test notification
    await AuditLog.create({
      adminId: null,
      action: 'TEST_NOTIFICATION_SENT',
      entity: 'Notification',
      entityId: inAppNotification._id.toString(),
      status: 'Success',
      metadata: {
        userSelfAction: true,
        userId: userId.toString(),
        userName: user.name,
        testType: type,
        deviceId: deviceId,
        title: title,
        results: {
          push: results.push?.success || false,
          email: results.email?.success || false,
          sms: results.sms?.success || false,
          inApp: results.inApp?.success || false
        }
      },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      severity: 'Low'
    });

    // Calculate overall success
    const successCount = Object.values(results).filter(r => r && r.success).length;
    const totalCount = Object.values(results).filter(r => r !== null).length;

    return apiHandler.success({
      message: `Test notification(s) sent. ${successCount}/${totalCount} successful.`,
      type: type,
      results: results,
      summary: {
        totalSent: totalCount,
        successful: successCount,
        failed: totalCount - successCount,
        timestamp: new Date().toISOString()
      },
      inAppNotification: {
        id: inAppNotification._id,
        status: inAppNotification.status
      }
    });

  } catch (error) {
    console.error('Error sending test notification:', error);
    return apiHandler.internalError('Failed to send test notification');
  }
}

// Helper function to test push notification
async function testPushNotification(user: any, title: string, message: string, deviceId?: string, customPayload?: any) {
  try {
    if (!process.env.FIREBASE_ADMIN_SDK_KEY) {
      return { success: false, message: 'Firebase Admin SDK not configured' };
    }

    const admin = require('firebase-admin');
    
    // Get FCM tokens
    let fcmTokens: string[] = [];
    
    if (deviceId) {
      // Send to specific device
      const device = user.devices?.find((d: any) => d.deviceId === deviceId);
      if (device?.fcmToken) {
        fcmTokens = [device.fcmToken];
      } else {
        return { success: false, message: 'Device not found or no FCM token' };
      }
    } else {
      // Send to all active devices
      fcmTokens = user.devices
        ?.filter((d: any) => d.fcmToken && d.isActive)
        .map((d: any) => d.fcmToken) || [];
      
      // Fallback to legacy FCM token
      if (fcmTokens.length === 0 && user.fcmToken) {
        fcmTokens = [user.fcmToken];
      }
    }

    if (fcmTokens.length === 0) {
      return { success: false, message: 'No FCM tokens found' };
    }

    const defaultPayload = {
      title: title,
      body: message,
      icon: '/icons/notification-icon.png',
      badge: 1
    };

    const payload = { ...defaultPayload, ...customPayload };

    const notificationMessage = {
      notification: payload,
      data: {
        type: 'test_notification',
        timestamp: new Date().toISOString(),
        userId: user._id.toString()
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
              title: payload.title,
              body: payload.body
            },
            sound: payload.sound || 'default',
            badge: payload.badge || 1
          }
        }
      }
    };

    const results: Array<{ token: string; success: boolean; messageId?: any; error?: string }> = [];
    
    // Send to each token individually to track failures
    for (const token of fcmTokens) {
      try {
        const response = await admin.messaging().send({
          ...notificationMessage,
          token: token
        });
        results.push({ token: token.slice(-6), success: true, messageId: response });
      } catch (error) {
        results.push({ 
          token: token.slice(-6), 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    
    return {
      success: successCount > 0,
      message: `Sent to ${successCount}/${fcmTokens.length} devices`,
      results: results,
      totalDevices: fcmTokens.length,
      successfulDeliveries: successCount
    };

  } catch (error) {
    console.error('Push notification test error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Helper function to test email notification
async function testEmailNotification(user: any, title: string, message: string) {
  try {
    const success = await sendEmail({
      to: user.email,
      subject: `🧪 Test: ${title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Test Email Notification</h2>
          <p>Dear ${user.name},</p>
          <p>This is a test email notification to verify your email notification settings.</p>
          <div style="background: #f0f9ff; border: 1px solid #2563eb; padding: 16px; margin: 20px 0; border-radius: 6px;">
            <strong>Test Message:</strong><br>
            ${message}
          </div>
          <p>If you received this email, your email notifications are working correctly!</p>
          <p style="font-size: 12px; color: #9ca3af;">
            This is a test notification sent at ${new Date().toLocaleString()}
          </p>
        </div>
      `
    });

    return {
      success: success,
      message: success ? 'Test email sent successfully' : 'Failed to send test email',
      recipient: user.email
    };

  } catch (error) {
    console.error('Email test error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Helper function to test SMS notification
async function testSMSNotification(user: any, title: string, message: string) {
  try {
    // SMS implementation would go here
    // For now, we'll return a placeholder response
    console.log(`📱 Test SMS to ${user.phone}: ${title} - ${message}`);
    
    return {
      success: true,
      message: 'SMS test completed (SMS gateway not configured)',
      recipient: user.phone,
      note: 'SMS functionality requires SMS gateway integration'
    };

  } catch (error) {
    console.error('SMS test error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export const POST = withErrorHandler(testNotificationHandler);