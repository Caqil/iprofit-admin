import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Notification } from '@/models/Notification';
import { User } from '@/models/User';
import { AuditLog } from '@/models/AuditLog';
import { authMiddleware } from '@/middleware/auth';
import { apiRateLimit } from '@/middleware/rate-limit';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import { sendEmail } from '@/lib/email';
import { NOTIFICATION_CONFIG } from '@/utils/constants';
import { z } from 'zod';
import mongoose from 'mongoose';

// Manual send notifications schema
const sendNotificationsSchema = z.object({
  notificationIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid notification ID')).min(1),
  forceResend: z.boolean().optional().default(false)
});

// Process pending notifications schema
const processPendingSchema = z.object({
  batchSize: z.number().min(1).max(100).optional().default(50),
  channel: z.enum(['email', 'sms', 'in_app', 'push']).optional(),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).optional()
});

// POST /api/notifications/send - Send notifications manually or process pending
async function sendNotificationsHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Apply middleware
  const authResult = await authMiddleware(request, {
    requireAuth: true,
    allowedUserTypes: ['admin'],
    requiredPermission: 'notifications.send'
  });
  if (authResult) return authResult;

  const rateLimitResult = await apiRateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    await connectToDatabase();

    const adminId = request.headers.get('x-user-id') ?? '';
    const body = await request.json();

    console.log('📤 Send Notifications API - Request:', body);

    // Check if this is manual send or process pending
    if (body.notificationIds) {
      return await handleManualSend(body, adminId, apiHandler, request);
    } else {
      return await handleProcessPending(body, adminId, apiHandler, request);
    }

  } catch (error) {
    console.error('❌ Send Notifications API - Error:', error);
    return apiHandler.handleError(error);
  }
}

// Handle manual send of specific notifications
async function handleManualSend(body: any, adminId: string, apiHandler: any, request: NextRequest) {
  const validationResult = sendNotificationsSchema.safeParse(body);
  if (!validationResult.success) {
    return apiHandler.validationError(
      validationResult.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code
      }))
    );
  }

  const { notificationIds, forceResend } = validationResult.data;

  // Find notifications
  const notifications = await Notification.find({
    _id: { $in: notificationIds }
  }).populate('userId', 'name email phone');

  if (notifications.length === 0) {
    return apiHandler.notFound('No notifications found');
  }

  // Filter notifications that can be sent
  const sendableNotifications = notifications.filter(n => {
    if (forceResend) return true;
    return n.status === 'Pending' || n.status === 'Failed';
  });

  if (sendableNotifications.length === 0) {
    return apiHandler.badRequest('No sendable notifications found');
  }

  const results = {
    sent: 0,
    failed: 0,
    errors: [] as any[]
  };

  // Process each notification
  for (const notification of sendableNotifications) {
    try {
      const success = await processNotification(notification);
      if (success) {
        results.sent++;
      } else {
        results.failed++;
      }
    } catch (error) {
      results.failed++;
      results.errors.push({
        notificationId: notification._id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Log audit
  await AuditLog.create({
    adminId,
    action: 'notifications.manual_send',
    entity: 'Notification',
    status: 'Success',
    metadata: {
      totalRequested: notificationIds.length,
      totalSendable: sendableNotifications.length,
      sent: results.sent,
      failed: results.failed,
      forceResend
    },
    ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown'
  });

  return apiHandler.success({
    message: `Processed ${sendableNotifications.length} notifications`,
    results
  });
}

// Handle processing pending notifications
async function handleProcessPending(body: any, adminId: string, apiHandler: any, request: NextRequest) {
  const validationResult = processPendingSchema.safeParse(body);
  if (!validationResult.success) {
    return apiHandler.validationError(
      validationResult.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err,
        code: err.code
      }))
    );
  }

  const { batchSize, channel, priority } = validationResult.data;

  // Build query for pending notifications
  const query: any = {
    status: 'Pending',
    $or: [
      { scheduledAt: null },
      { scheduledAt: { $lte: new Date() } }
    ]
  };

  if (channel) query.channel = channel;
  if (priority) query.priority = priority;

  // Find pending notifications
  const pendingNotifications = await Notification.find(query)
    .populate('userId', 'name email phone')
    .sort({ priority: -1, scheduledAt: 1 })
    .limit(batchSize);

  if (pendingNotifications.length === 0) {
    return apiHandler.success({
      message: 'No pending notifications to process',
      processed: 0
    });
  }

  const results = {
    processed: 0,
    sent: 0,
    failed: 0,
    errors: [] as any[]
  };

  // Process notifications in batches
  for (const notification of pendingNotifications) {
    try {
      results.processed++;
      const success = await processNotification(notification);
      if (success) {
        results.sent++;
      } else {
        results.failed++;
      }
    } catch (error) {
      results.failed++;
      results.errors.push({
        notificationId: notification._id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Log audit
  await AuditLog.create({
    adminId,
    action: 'notifications.process_pending',
    entity: 'Notification',
    status: 'Success',
    metadata: {
      batchSize,
      channel: channel || 'all',
      priority: priority || 'all',
      processed: results.processed,
      sent: results.sent,
      failed: results.failed
    },
    ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown'
  });

  return apiHandler.success({
    message: `Processed ${results.processed} pending notifications`,
    results
  });
}

// Process individual notification
async function processNotification(notification: any): Promise<boolean> {
  try {
    const user = notification.userId;
    if (!user) {
      throw new Error('User not found');
    }

    let success = false;

    // Update notification status to sending
    notification.status = 'Sent';
    notification.sentAt = new Date();

    switch (notification.channel) {
      case 'email':
        success = await sendEmailNotification(notification, user);
        break;
      case 'sms':
        success = await sendSMSNotification(notification, user);
        break;
      case 'in_app':
        success = await sendInAppNotification(notification, user);
        break;
      case 'push':
        success = await sendPushNotification(notification, user);
        break;
      default:
        throw new Error(`Unsupported channel: ${notification.channel}`);
    }

    if (success) {
      notification.status = 'Delivered';
      notification.deliveredAt = new Date();
    } else {
      notification.status = 'Failed';
      notification.failureReason = 'Delivery failed';
      notification.retryCount += 1;
    }

    await notification.save();
    return success;

  } catch (error) {
    notification.status = 'Failed';
    notification.failureReason = error instanceof Error ? error.message : 'Unknown error';
    notification.retryCount += 1;
    await notification.save();
    return false;
  }
}

// Send email notification
async function sendEmailNotification(notification: any, user: any): Promise<boolean> {
  return await sendEmail({
    to: user.email,
    subject: notification.title,
    templateId: notification.metadata?.templateId || 'generic',
    variables: {
      userName: user.name,
      title: notification.title,
      message: notification.message,
      ...notification.metadata?.variables
    }
  });
}

// Send SMS notification (placeholder implementation)
async function sendSMSNotification(notification: any, user: any): Promise<boolean> {
  // Implement SMS sending logic here
  console.log(`📱 SMS to ${user.phone}: ${notification.message}`);
  return true; // Placeholder return
}

// Send in-app notification
async function sendInAppNotification(notification: any, user: any): Promise<boolean> {
  // In-app notifications are already stored in database
  // This could trigger real-time updates via WebSocket
  console.log(`📱 In-app notification for ${user.name}: ${notification.title}`);
  return true;
}

// Send push notification (placeholder implementation)
async function sendPushNotification(notification: any, user: any): Promise<boolean> {
  // Implement push notification logic here
  console.log(`🔔 Push to ${user.name}: ${notification.title}`);
  return true; // Placeholder return
}

// Main route handler
export async function POST(request: NextRequest) {
  return withErrorHandler(sendNotificationsHandler)(request);
}