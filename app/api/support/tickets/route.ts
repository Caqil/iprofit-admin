// app/api/support/tickets/route.ts - FIXED VERSION
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { SupportTicket } from '@/models/SupportTicket';
import { User } from '@/models/User';
import { AuditLog } from '@/models/AuditLog';
import { authMiddleware } from '@/middleware/auth';
import { apiRateLimit } from '@/middleware/rate-limit';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import { sendEmail } from '@/lib/email';
import { z } from 'zod';
import mongoose from 'mongoose';

// Validation schemas
const ticketFilterSchema = z.object({
  page: z.string().transform(Number).pipe(z.number().min(1)).optional(),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  status: z.enum(['Open', 'In Progress', 'Waiting for User', 'Resolved', 'Closed']).optional(),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).optional(),
  category: z.string().optional(),
  assignedTo: z.string().optional(),
  userId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  search: z.string().optional(),
  isOverdue: z.boolean().optional()
});

const ticketCreateSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  subject: z.string().min(1, 'Subject is required').max(200, 'Subject too long'),
  message: z.string().min(1, 'Message is required').max(5000, 'Message too long'),
  category: z.string().min(1, 'Category is required'),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).default('Medium'),
  attachments: z.array(z.object({
    filename: z.string(),
    url: z.string().url(),
    mimeType: z.string(),
    size: z.number().positive()
  })).optional().default([]),
  metadata: z.object({
    source: z.string().optional(),
    relatedTickets: z.array(z.string()).optional()
  }).optional()
});

// Helper function to generate ticket number
function generateTicketNumber(): string {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TKT-${timestamp}-${random}`;
}

// Helper function to create pagination response
function createPaginatedResponse<T>(data: T[], total: number, page: number, limit: number) {
  return {
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1
    },
    timestamp: new Date()
  };
}

// GET /api/support/tickets - Get support tickets with filters
async function getTicketsHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Apply middleware
  const authResult = await authMiddleware(request, {
    requireAuth: true,
    allowedUserTypes: ['admin'],
    requiredPermission: 'support.view'
  });
  if (authResult) return authResult;

  const rateLimitResult = await apiRateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    await connectToDatabase();

    // Parse and validate query parameters
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    const validationResult = ticketFilterSchema.safeParse(queryParams);

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
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      status,
      priority,
      category,
      assignedTo,
      userId,
      dateFrom,
      dateTo,
      search,
      isOverdue
    } = validationResult.data;

    // Build match criteria for aggregation
    const matchCriteria: any = {};

    if (status) matchCriteria.status = status;
    if (priority) matchCriteria.priority = priority;
    if (category) matchCriteria.category = new RegExp(category, 'i');
    if (assignedTo) matchCriteria.assignedTo = new mongoose.Types.ObjectId(assignedTo);
    if (userId) matchCriteria.userId = new mongoose.Types.ObjectId(userId);

    // Date range filter
    if (dateFrom || dateTo) {
      matchCriteria.createdAt = {};
      if (dateFrom) matchCriteria.createdAt.$gte = new Date(dateFrom);
      if (dateTo) matchCriteria.createdAt.$lte = new Date(dateTo);
    }

    // Search filter
    if (search) {
      matchCriteria.$or = [
        { ticketNumber: new RegExp(search, 'i') },
        { subject: new RegExp(search, 'i') },
        { message: new RegExp(search, 'i') }
      ];
    }

    // Overdue filter
    if (isOverdue) {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      matchCriteria.status = 'Open';
      matchCriteria.lastResponseAt = { $lt: oneDayAgo };
    }

    // Build aggregation pipeline
    const pipeline = [
      { $match: matchCriteria },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
          pipeline: [
            { $project: { name: 1, email: 1, phone: 1, profilePicture: 1, kycStatus: 1 } }
          ]
        }
      },
      {
        $lookup: {
          from: 'admins',
          localField: 'assignedTo',
          foreignField: '_id',
          as: 'assignedAdmin',
          pipeline: [
            { $project: { name: 1, email: 1, avatar: 1, role: 1 } }
          ]
        }
      },
      {
        $addFields: {
          userId: { $arrayElemAt: ['$user', 0] },
          assignedTo: { $arrayElemAt: ['$assignedAdmin', 0] },
          responsesCount: { $size: '$responses' },
          isOverdue: {
            $and: [
              { $eq: ['$status', 'Open'] },
              { $lt: ['$lastResponseAt', new Date(Date.now() - 24 * 60 * 60 * 1000)] }
            ]
          }
        }
      },
      { $sort: { [sortBy]: sortOrder === 'asc' ? 1 : -1 } as Record<string, 1 | -1> },
      { $skip: (page - 1) * limit },
      { $limit: limit }
    ];

    // Execute aggregation
    const result = await SupportTicket.aggregate(pipeline);
    const total = await SupportTicket.countDocuments(matchCriteria);

    // FIXED: Create audit log with correct field mapping
    await AuditLog.create({
      adminId: (request as any).admin?.id || null,
      action: 'tickets.list',
      entity: 'SupportTicket', // FIXED: Use 'entity' instead of 'resourceType'
      entityId: null, // FIXED: Use 'entityId' instead of 'resourceId'
      newData: {
        filters: validationResult.data,
        resultCount: result.length
      },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      severity: 'Low',
      status: 'Success'
    });

    return NextResponse.json(createPaginatedResponse(result, total, page, limit), { status: 200 });

  } catch (error) {
    console.error('Get tickets error:', error);
    return apiHandler.internalError('Failed to fetch support tickets');
  }
}

// POST /api/support/tickets - Create new support ticket
async function createTicketHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Apply middleware
  const authResult = await authMiddleware(request, {
    requireAuth: true,
    allowedUserTypes: ['admin'],
    requiredPermission: 'support.create'
  });
  if (authResult) return authResult;

  const rateLimitResult = await apiRateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    await connectToDatabase();

    // Parse and validate request body
    const body = await request.json();
    const validationResult = ticketCreateSchema.safeParse(body);

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
      userId,
      subject,
      message,
      category,
      priority,
      attachments,
      metadata
    } = validationResult.data;

    // Verify user exists
    const user = await User.findById(userId).select('name email phone');
    if (!user) {
      return apiHandler.notFound('User not found');
    }

    // Generate ticket number
    const ticketNumber = generateTicketNumber();

    // Create ticket
    const ticket = await SupportTicket.create({
      userId: new mongoose.Types.ObjectId(userId),
      ticketNumber,
      subject,
      message,
      category,
      priority,
      status: 'Open',
      attachments: attachments?.map(att => ({
        ...att,
        uploadedAt: new Date()
      })) || [],
      responses: [],
      tags: [],
      lastResponseAt: new Date(),
      metadata: {
        ...metadata,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    });

    // Populate ticket with user data
    await ticket.populate([
      {
        path: 'userId',
        select: 'name email phone profilePicture'
      }
    ]);

    // Send email notification to user
    try {
      await sendEmail({
        to: user.email,
        subject: `Support Ticket Created - ${ticketNumber}`,
        templateId: 'support-ticket-created',
        variables: {
          userName: user.name,
          ticketNumber,
          subject,
          category,
          priority,
          message
        }
      });
    } catch (emailError) {
      console.error('Failed to send ticket creation email:', emailError);
      // Don't fail the request if email fails
    }

    // FIXED: Create audit log with correct field mapping
    await AuditLog.create({
      adminId: (request as any).admin?.id || null,
      action: 'tickets.create',
      entity: 'SupportTicket', // FIXED: Use 'entity' instead of 'resourceType'
      entityId: ticket._id.toString(), // FIXED: Use 'entityId' instead of 'resourceId'
      newData: {
        ticketNumber,
        subject,
        category,
        priority,
        userId
      },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      severity: 'Medium',
      status: 'Success'
    });

    return apiHandler.created(ticket, 'Support ticket created successfully');

  } catch (error) {
    console.error('Create ticket error:', error);
    return apiHandler.internalError('Failed to create support ticket');
  }
}

// Export handlers
export const GET = withErrorHandler(getTicketsHandler);
export const POST = withErrorHandler(createTicketHandler);
