import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Notification, INotification } from '@/models/Notification';
import { User } from '@/models/User';
import { AuditLog } from '@/models/AuditLog';
import { authMiddleware } from '@/middleware/auth';
import { apiRateLimit } from '@/middleware/rate-limit';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler, createPaginatedResponse, createSortStage, createPaginationStages } from '@/lib/api-helpers';
import { notificationValidator } from '@/utils/validators';
import { NOTIFICATION_CONFIG } from '@/utils/constants';
import { z } from 'zod';
import mongoose from 'mongoose';

// Notification list query validation
const notificationListQuerySchema = z.object({
  page: z.string().optional().default('1').transform(val => {
    const num = parseInt(val, 10);
    return isNaN(num) || num < 1 ? 1 : num;
  }),
  limit: z.string().optional().default('10').transform(val => {
    const num = parseInt(val, 10);
    return isNaN(num) || num < 1 ? 10 : Math.min(num, 100);
  }),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  
  // Filters
  type: z.enum(['KYC', 'Withdrawal', 'Loan', 'Task', 'Referral', 'System', 'Marketing']).optional(),
  channel: z.enum(['email', 'sms', 'in_app', 'push']).optional(),
  status: z.enum(['Pending', 'Sent', 'Delivered', 'Failed', 'Read']).optional(),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).optional(),
  userId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  search: z.string().optional(),
  
  // Date filters
  dateFrom: z.string().optional().transform(val => {
    if (!val || val === '') return undefined;
    const date = new Date(val);
    return isNaN(date.getTime()) ? undefined : date;
  }),
  dateTo: z.string().optional().transform(val => {
    if (!val || val === '') return undefined;
    const date = new Date(val);
    return isNaN(date.getTime()) ? undefined : date;
  })
});

// Bulk notification schema
const bulkNotificationSchema = z.object({
  type: z.enum(['KYC', 'Withdrawal', 'Loan', 'Task', 'Referral', 'System', 'Marketing']),
  channel: z.enum(['email', 'sms', 'in_app', 'push']),
  title: z.string().min(1, 'Title is required'),
  message: z.string().min(1, 'Message is required'),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).optional().default('Medium'),
  scheduledAt: z.string().datetime().optional(),
  recipients: z.array(z.object({
    userId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID'),
    variables: z.record(z.any()).optional()
  })).min(1, 'At least one recipient is required'),
  templateId: z.string().optional(),
  sendImmediately: z.boolean().optional().default(false)
});

// GET /api/notifications - List notifications
async function getNotificationsHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Apply middleware
  const authResult = await authMiddleware(request, {
    requireAuth: true,
    allowedUserTypes: ['admin'],
    requiredPermission: 'notifications.view'
  });
  if (authResult) return authResult;

  const rateLimitResult = await apiRateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    await connectToDatabase();

    // Parse and validate query parameters
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    const validationResult = notificationListQuerySchema.safeParse(queryParams);

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
      page,
      limit,
      sortBy,
      sortOrder,
      type,
      channel,
      status,
      priority,
      userId,
      search,
      dateFrom,
      dateTo
    } = validationResult.data;

    console.log('📋 Notifications API - Request params:', validationResult.data);

    // Build aggregation pipeline
    const pipeline: mongoose.PipelineStage[] = [];

    // Match stage
    const matchConditions: any = {};

    if (type) matchConditions.type = type;
    if (channel) matchConditions.channel = channel;
    if (status) matchConditions.status = status;
    if (priority) matchConditions.priority = priority;
    if (userId) matchConditions.userId = new mongoose.Types.ObjectId(userId);

    // Date range filter
    if (dateFrom || dateTo) {
      matchConditions.createdAt = {};
      if (dateFrom) matchConditions.createdAt.$gte = dateFrom;
      if (dateTo) matchConditions.createdAt.$lte = dateTo;
    }

    if (Object.keys(matchConditions).length > 0) {
      pipeline.push({ $match: matchConditions });
    }

    // Lookup user details
    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user'
      }
    });

    // Unwind user (optional)
    pipeline.push({
      $unwind: { path: '$user', preserveNullAndEmptyArrays: true }
    });

    // Search filter
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { title: { $regex: search, $options: 'i' } },
            { message: { $regex: search, $options: 'i' } },
            { 'user.name': { $regex: search, $options: 'i' } },
            { 'user.email': { $regex: search, $options: 'i' } }
          ]
        }
      });
    }

    // Project required fields
    pipeline.push({
      $project: {
        _id: 1,
        userId: 1,
        type: 1,
        channel: 1,
        title: 1,
        message: 1,
        status: 1,
        priority: 1,
        scheduledAt: 1,
        sentAt: 1,
        deliveredAt: 1,
        readAt: 1,
        failureReason: 1,
        retryCount: 1,
        maxRetries: 1,
        createdAt: 1,
        updatedAt: 1,
        user: {
          _id: '$user._id',
          name: '$user.name',
          email: '$user.email'
        }
      }
    });

    // Sort stage
    const sortStage = createSortStage(sortBy, sortOrder);
    pipeline.push(sortStage);

    // Get total count
    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await Notification.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    // Add pagination
    const paginationStages = createPaginationStages(page, limit);
    pipeline.push(...paginationStages);

    // Execute aggregation
    const notifications = await Notification.aggregate(pipeline);

    console.log('📋 Notifications API - Found notifications:', notifications.length);

    // Log audit
    await AuditLog.create({
      adminId: request.headers.get('x-user-id'),
      action: 'notifications.list',
      entity: 'Notification',
      status: 'Success',
      metadata: {
        filters: { type, channel, status, priority, userId, search },
        resultCount: notifications.length,
        totalCount: total
      },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    // Create paginated response
    const response = createPaginatedResponse(notifications, total, page, limit);

    return apiHandler.success(response);

  } catch (error) {
    console.error('❌ Notifications API - Error:', error);
    return apiHandler.internalError('Failed to fetch notifications');
  }
}

// POST /api/notifications - Create bulk notifications
async function createNotificationsHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Apply middleware
  const authResult = await authMiddleware(request, {
    requireAuth: true,
    allowedUserTypes: ['admin'],
    requiredPermission: 'notifications.create'
  });
  if (authResult) return authResult;

  const rateLimitResult = await apiRateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    await connectToDatabase();

    const adminId = request.headers.get('x-user-id');
    const body = await request.json();

    console.log('📝 Notifications API - Create request:', body);

    // Validate request body
    const validationResult = bulkNotificationSchema.safeParse(body);
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
      channel,
      title,
      message,
      priority,
      scheduledAt,
      recipients,
      templateId,
      sendImmediately
    } = validationResult.data;

    // Validate recipients exist
    const userIds = recipients.map(r => r.userId);
    const existingUsers = await User.find({ _id: { $in: userIds } }).select('_id');
    const existingUserIds = existingUsers.map(u => u._id.toString());
    const invalidUserIds = userIds.filter(id => !existingUserIds.includes(id));

    if (invalidUserIds.length > 0) {
      return apiHandler.badRequest(`Invalid user IDs: ${invalidUserIds.join(', ')}`);
    }

    // Create notifications
    const notifications: InstanceType<typeof Notification>[] = [];
    const currentTime = new Date();

    for (const recipient of recipients) {
      const notification = new Notification({
        userId: recipient.userId,
        type,
        channel,
        title,
        message,
        priority,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : (sendImmediately ? currentTime : null),
        status: sendImmediately ? 'Pending' : 'Pending',
        metadata: {
          templateId,
          variables: recipient.variables,
          createdBy: adminId
        }
      });

      notifications.push(notification);
    }

    // Bulk insert notifications
    const createdNotifications = await Notification.insertMany(notifications);

    console.log(`✅ Created ${createdNotifications.length} notifications`);

    // Log audit
    await AuditLog.create({
      adminId,
      action: 'notifications.bulk_create',
      entity: 'Notification',
      status: 'Success',
      metadata: {
        type,
        channel,
        priority,
        recipientCount: recipients.length,
        scheduledAt: scheduledAt || null,
        sendImmediately
      },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return apiHandler.created({
      created: createdNotifications.length,
      notifications: createdNotifications.map(n => ({
        id: n._id,
        userId: n.userId,
        status: n.status,
        scheduledAt: n.scheduledAt
      })),
      message: `${createdNotifications.length} notifications created successfully`
    });

  } catch (error) {
    console.error('❌ Notifications API - Create error:', error);
    return apiHandler.handleError(error);
  }
}

// Main route handlers for notifications
export async function GET(request: NextRequest) {
  return withErrorHandler(getNotificationsHandler)(request);
}

export async function POST(request: NextRequest) {
  return withErrorHandler(createNotificationsHandler)(request);
}