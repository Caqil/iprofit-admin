import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { SupportTicket } from '@/models/SupportTicket';
import { Admin } from '@/models/Admin';
import { AuditLog } from '@/models/AuditLog';
import { authMiddleware } from '@/middleware/auth';
import { apiRateLimit } from '@/middleware/rate-limit';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import { sendEmail } from '@/lib/email';
import { objectIdValidator } from '@/utils/validators';
import { z } from 'zod';
import mongoose from 'mongoose';

// Validation schemas
const ticketResponseSchema = z.object({
  message: z.string().min(1, 'Message is required').max(5000, 'Message too long'),
  isAdminResponse: z.boolean().default(true),
  attachments: z.array(z.object({
    filename: z.string(),
    url: z.string().url(),
    mimeType: z.string(),
    size: z.number().positive()
  })).optional().default([])
});

const ticketUpdateSchema = z.object({
  status: z.enum(['Open', 'In Progress', 'Waiting for User', 'Resolved', 'Closed']).optional(),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).optional(),
  assignedTo: z.string().optional().refine(val => !val || val === '' || /^[0-9a-fA-F]{24}$/.test(val), 'Invalid admin ID'),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  resolution: z.string().optional(),
  satisfactionRating: z.number().min(1).max(5).optional(),
  feedbackComment: z.string().optional()
});

// GET /api/support/tickets/[id] - Get specific ticket
async function getTicketHandler(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
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

    const { id } = params;

    // Validate ticket ID
    const idValidation = objectIdValidator.safeParse(id);
    if (!idValidation.success) {
      return apiHandler.badRequest('Invalid ticket ID format');
    }

    // Find ticket with populated data
    const ticket = await SupportTicket.findById(id)
      .populate([
        {
          path: 'userId',
          select: 'name email phone profilePicture kycStatus planId balance'
        },
        {
          path: 'assignedTo',
          select: 'name email avatar role'
        }
      ])
      .lean();

    if (!ticket) {
      return apiHandler.notFound('Support ticket not found');
    }

    // Add response metadata
    const enrichedTicket = {
      ...ticket,
      responsesCount: ticket.responses?.length || 0,
      isOverdue: ticket.status === 'Open' && 
                 new Date(ticket.lastResponseAt) < new Date(Date.now() - 24 * 60 * 60 * 1000),
      hasUnreadResponses: ticket.responses?.some((r: any) => !r.isRead) || false
    };

    // Create audit log
    await AuditLog.create({
      adminId: (request as any).admin?.id,
      action: 'tickets.view',
      resourceType: 'SupportTicket',
      resourceId: ticket._id,
      details: {
        ticketNumber: ticket.ticketNumber,
        status: ticket.status
      },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return apiHandler.success(enrichedTicket);

  } catch (error) {
    console.error('Get ticket error:', error);
    return apiHandler.internalError('Failed to fetch support ticket');
  }
}

// PUT /api/support/tickets/[id] - Update ticket
async function updateTicketHandler(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Apply middleware
  const authResult = await authMiddleware(request, {
    requireAuth: true,
    allowedUserTypes: ['admin'],
    requiredPermission: 'support.update'
  });
  if (authResult) return authResult;

  const rateLimitResult = await apiRateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    await connectToDatabase();

    const { id } = params;

    // Validate ticket ID
    const idValidation = objectIdValidator.safeParse(id);
    if (!idValidation.success) {
      return apiHandler.badRequest('Invalid ticket ID format');
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = ticketUpdateSchema.safeParse(body);

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

    // Find existing ticket
    const existingTicket = await SupportTicket.findById(id).populate('userId', 'name email');
    if (!existingTicket) {
      return apiHandler.notFound('Support ticket not found');
    }

    // Validate assigned admin if provided
    if (updates.assignedTo && updates.assignedTo !== '') {
      const admin = await Admin.findById(updates.assignedTo);
      if (!admin) {
        return apiHandler.badRequest('Invalid assigned admin');
      }
    }

    // Prepare update data
    const updateData: any = { ...updates };

    // Handle status changes
    if (updates.status && updates.status !== existingTicket.status) {
      if (updates.status === 'Resolved') {
        updateData.resolvedAt = new Date();
        if (!updates.resolution) {
          updateData.resolution = 'Ticket resolved by admin';
        }
      } else if (updates.status === 'Closed') {
        updateData.closedAt = new Date();
        if (!existingTicket.resolvedAt) {
          updateData.resolvedAt = new Date();
        }
      }
    }

    // Handle assignment changes
    if (updates.assignedTo !== undefined) {
      if (updates.assignedTo === '' || updates.assignedTo === null) {
        updateData.assignedTo = null;
      } else {
        updateData.assignedTo = new mongoose.Types.ObjectId(updates.assignedTo);
      }
    }

    // Update ticket
    const updatedTicket = await SupportTicket.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate([
      {
        path: 'userId',
        select: 'name email phone profilePicture'
      },
      {
        path: 'assignedTo',
        select: 'name email avatar role'
      }
    ]);

    // Send email notification for status changes
    if (updates.status && updates.status !== existingTicket.status) {
      try {
        await sendEmail({
          to: existingTicket.userId.email,
          subject: `Ticket ${existingTicket.ticketNumber} - Status Updated`,
          templateId: 'support-ticket-status-update',
          variables: {
            userName: existingTicket.userId.name,
            ticketNumber: existingTicket.ticketNumber,
            oldStatus: existingTicket.status,
            newStatus: updates.status,
            resolution: updates.resolution
          }
        });
      } catch (emailError) {
        console.error('Failed to send status update email:', emailError);
      }
    }

    // Create audit log
    await AuditLog.create({
      adminId: (request as any).admin?.id,
      action: 'tickets.update',
      resourceType: 'SupportTicket',
      resourceId: id,
      details: {
        changes: updates,
        previousStatus: existingTicket.status,
        ticketNumber: existingTicket.ticketNumber
      },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return apiHandler.success(updatedTicket, 'Ticket updated successfully');

  } catch (error) {
    console.error('Update ticket error:', error);
    return apiHandler.internalError('Failed to update support ticket');
  }
}

// POST /api/support/tickets/[id]/responses - Add response to ticket
async function addResponseHandler(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Apply middleware
  const authResult = await authMiddleware(request, {
    requireAuth: true,
    allowedUserTypes: ['admin'],
    requiredPermission: 'support.respond'
  });
  if (authResult) return authResult;

  const rateLimitResult = await apiRateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    await connectToDatabase();

    const { id } = params;

    // Validate ticket ID
    const idValidation = objectIdValidator.safeParse(id);
    if (!idValidation.success) {
      return apiHandler.badRequest('Invalid ticket ID format');
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = ticketResponseSchema.safeParse(body);

    if (!validationResult.success) {
      return apiHandler.validationError(
        validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      );
    }

    const { message, isAdminResponse, attachments } = validationResult.data;

    // Find ticket
    const ticket = await SupportTicket.findById(id).populate('userId', 'name email');
    if (!ticket) {
      return apiHandler.notFound('Support ticket not found');
    }

    // Create response
    const response = {
      message,
      isAdminResponse,
      adminId: isAdminResponse ? (request as any).admin?.id : null,
      attachments: attachments?.map(att => ({
        ...att,
        uploadedAt: new Date()
      })) || [],
      createdAt: new Date()
    };

    // Add response to ticket
    ticket.responses.push(response);
    ticket.lastResponseAt = new Date();

    // Update status if ticket was closed
    if (ticket.status === 'Closed' && isAdminResponse) {
      ticket.status = 'In Progress';
    }

    await ticket.save();

    // Send email notification to user
    if (isAdminResponse) {
      try {
        await sendEmail({
          to: ticket.userId.email,
          subject: `New Response - Ticket ${ticket.ticketNumber}`,
          templateId: 'support-ticket-response',
          variables: {
            userName: ticket.userId.name,
            ticketNumber: ticket.ticketNumber,
            adminMessage: message,
            ticketUrl: `${process.env.NEXTAUTH_URL}/support/tickets/${ticket._id}`
          }
        });
      } catch (emailError) {
        console.error('Failed to send response email:', emailError);
      }
    }

    // Create audit log
    await AuditLog.create({
      adminId: (request as any).admin?.id,
      action: 'tickets.respond',
      resourceType: 'SupportTicket',
      resourceId: id,
      details: {
        messageLength: message.length,
        attachmentsCount: attachments?.length || 0,
        ticketNumber: ticket.ticketNumber
      },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return apiHandler.success(response, 'Response added successfully');

  } catch (error) {
    console.error('Add response error:', error);
    return apiHandler.internalError('Failed to add response to ticket');
  }
}

// DELETE /api/support/tickets/[id] - Delete ticket
async function deleteTicketHandler(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Apply middleware
  const authResult = await authMiddleware(request, {
    requireAuth: true,
    allowedUserTypes: ['admin'],
    requiredPermission: 'support.delete'
  });
  if (authResult) return authResult;

  const rateLimitResult = await apiRateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    await connectToDatabase();

    const { id } = params;

    // Validate ticket ID
    const idValidation = objectIdValidator.safeParse(id);
    if (!idValidation.success) {
      return apiHandler.badRequest('Invalid ticket ID format');
    }

    // Find and delete ticket
    const ticket = await SupportTicket.findByIdAndDelete(id);
    if (!ticket) {
      return apiHandler.notFound('Support ticket not found');
    }

    // Create audit log
    await AuditLog.create({
      adminId: (request as any).admin?.id,
      action: 'tickets.delete',
      resourceType: 'SupportTicket',
      resourceId: id,
      details: {
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        status: ticket.status
      },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return apiHandler.success(null, 'Ticket deleted successfully');

  } catch (error) {
    console.error('Delete ticket error:', error);
    return apiHandler.internalError('Failed to delete support ticket');
  }
}

// Export handlers
export const GET = withErrorHandler(getTicketHandler);
export const PUT = withErrorHandler(updateTicketHandler);
export const POST = withErrorHandler(addResponseHandler);
export const DELETE = withErrorHandler(deleteTicketHandler);