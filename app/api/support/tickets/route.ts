import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { SupportTicket, ISupportTicket } from '@/models/SupportTicket';
import { User } from '@/models/User';
import { Admin } from '@/models/Admin';
import { AuditLog } from '@/models/AuditLog';
import { authMiddleware } from '@/middleware/auth';
import { apiRateLimit } from '@/middleware/rate-limit';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler, createPaginatedResponse, createMatchStage, createSortStage, createPaginationStages } from '@/lib/api-helpers';
import { generateTicketNumber } from '@/utils/helpers';
import { sendEmail } from '@/lib/email';
import { objectIdValidator } from '@/utils/validators';
import { TicketFilter, PaginationParams } from '@/types';
import { z } from 'zod';
import mongoose from 'mongoose';

// Validation schemas
const ticketListQuerySchema = z.object({
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
  status: z.enum(['Open', 'In Progress', 'Waiting for User', 'Resolved', 'Closed']).optional(),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).optional(),
  category: z.string().optional(),
  assignedTo: z.string().optional().refine(val => !val || /^[0-9a-fA-F]{24}$/.test(val), 'Invalid admin ID'),
  userId: z.string().optional().refine(val => !val || /^[0-9a-fA-F]{24}$/.test(val), 'Invalid user ID'),
  search: z.string().optional(),
  
  // Date filters
  dateFrom: z.string().optional().transform(val => {
    if (!val) return undefined;
    const date = new Date(val);
    return isNaN(date.getTime()) ? undefined : date;
  }),
  dateTo: z.string().optional().transform(val => {
    if (!val) return undefined;
    const date = new Date(val);
    return isNaN(date.getTime()) ? undefined : date;
  }),
  
  isOverdue: z.string().optional().transform(val => {
    if (!val || val === '') return undefined;
    return val === 'true';
  })
});

const ticketCreateSchema = z.object({
  userId: z.string().refine(val => /^[0-9a-fA-F]{24}$/.test(val), 'Invalid user ID'),
  subject: z.string().min(5, 'Subject must be at least 5 characters').max(200, 'Subject too long'),
  message: z.string().min(10, 'Message must be at least 10 characters').max(5000, 'Message too long'),
  category: z.string().min(1, 'Category is required'),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).optional().default('Medium'),
  attachments: z.array(z.object({
    filename: z.string(),
    url: z.string().url(),
    mimeType: z.string(),
    size: z.number().positive()
  })).optional().default([]),
  metadata: z.object({
    ipAddress: z.string().optional(),
    userAgent: z.string().optional(),
    source: z.string().optional().default('admin')
  }).optional()
});

// GET /api/support/tickets - List support tickets
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
    const validationResult = ticketListQuerySchema.safeParse(queryParams);

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
      status,
      priority,
      category,
      assignedTo,
      userId,
      search,
      dateFrom,
      dateTo,
      isOverdue
    } = validationResult.data;

    // Build match criteria
    const matchCriteria: any = {};

    // Status filter
    if (status) {
      matchCriteria.status = status;
    }

    // Priority filter
    if (priority) {
      matchCriteria.priority = priority;
    }

    // Category filter
    if (category) {
      matchCriteria.category = category;
    }

    // Assigned admin filter
    if (assignedTo) {
      matchCriteria.assignedTo = new mongoose.Types.ObjectId(assignedTo);
    }

    // User filter
    if (userId) {
      matchCriteria.userId = new mongoose.Types.ObjectId(userId);
    }

    // Search functionality
    if (search) {
      matchCriteria.$or = [
        { subject: { $regex: search, $options: 'i' } },
        { ticketNumber: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } }
      ];
    }

    // Date range filter
    if (dateFrom || dateTo) {
      matchCriteria.createdAt = {};
      if (dateFrom) matchCriteria.createdAt.$gte = dateFrom;
      if (dateTo) matchCriteria.createdAt.$lte = dateTo;
    }

    // Overdue filter (tickets older than 24 hours without response)
    if (isOverdue) {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      matchCriteria.$and = [
        { status: { $in: ['Open', 'In Progress'] } },
        { lastResponseAt: { $lt: twentyFourHoursAgo } }
      ];
    }

    // Build aggregation pipeline
    const pipeline = [
      createMatchStage(matchCriteria),
      
      // Lookup user data
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
          pipeline: [
            { $project: { name: 1, email: 1, phone: 1, profilePicture: 1 } }
          ]
        }
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      
      // Lookup assigned admin data
      {
        $lookup: {
          from: 'admins',
          localField: 'assignedTo',
          foreignField: '_id',
          as: 'assignedAdmin',
          pipeline: [
            { $project: { name: 1, email: 1, avatar: 1 } }
          ]
        }
      },
      { $unwind: { path: '$assignedAdmin', preserveNullAndEmptyArrays: true } },
      
      // Add computed fields
      {
        $addFields: {
          responsesCount: { $size: '$responses' },
          isOverdue: {
            $and: [
              { $in: ['$status', ['Open', 'In Progress']] },
              { $lt: ['$lastResponseAt', new Date(Date.now() - 24 * 60 * 60 * 1000)] }
            ]
          },
          hasUnreadResponses: {
            $anyElementTrue: {
              $map: {
                input: '$responses',
                as: 'response',
                in: { $eq: ['$$response.isRead', false] }
              }
            }
          }
        }
      },
      
      createSortStage(sortBy, sortOrder),
      ...createPaginationStages(page, limit)
    ];

    // Execute aggregation
    const result = await SupportTicket.aggregate(pipeline);
    const total = await SupportTicket.countDocuments(matchCriteria);

    // Create audit log
    await AuditLog.create({
      adminId: (request as any).admin?.id,
      action: 'tickets.list',
      resourceType: 'SupportTicket',
      details: {
        filters: validationResult.data,
        resultCount: result.length
      },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
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

    // Create audit log
    await AuditLog.create({
      adminId: (request as any).admin?.id,
      action: 'tickets.create',
      resourceType: 'SupportTicket',
      resourceId: ticket._id,
      details: {
        ticketNumber,
        subject,
        category,
        priority,
        userId
      },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
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