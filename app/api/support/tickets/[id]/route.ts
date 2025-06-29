// app/api/support/tickets/[id]/route.ts - COMPLETE FIX
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
import { objectIdValidator, ticketResponseSchema, ticketUpdateSchema } from '@/lib/validation';
import { z } from 'zod';
import mongoose from 'mongoose';

// Helper function to create audit log entry
async function createAuditLog(data: {
  adminId?: string | null;
  action: string;
  entityId: string;
  oldData?: any;
  newData?: any;
  changes?: any;
  request: NextRequest;
  severity?: 'Low' | 'Medium' | 'High' | 'Critical';
  status?: 'Success' | 'Failed' | 'Partial';
  errorMessage?: string;
}) {
  try {
    await AuditLog.create({
      adminId: data.adminId ? new mongoose.Types.ObjectId(data.adminId) : null,
      action: data.action,
      entity: 'SupportTicket', // FIXED: Always use 'entity'
      entityId: data.entityId, // FIXED: Always use 'entityId'
      oldData: data.oldData,
      newData: data.newData,
      changes: data.changes,
      ipAddress: data.request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: data.request.headers.get('user-agent') || 'unknown',
      severity: data.severity || 'Low',
      status: data.status || 'Success',
      errorMessage: data.errorMessage
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw error to avoid failing the main operation
  }
}

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
      ]);

    if (!ticket) {
      return apiHandler.notFound('Support ticket not found');
    }

    // Type-safe way to access responses with proper null checking
    const responses = ticket.responses || [];
    const responsesCount = responses.length;
    const hasUnreadResponses = responses.some((response: any) => !response.isRead);

    // Add response metadata
    const enrichedTicket = {
      ...ticket.toJSON(),
      responsesCount,
      isOverdue: ticket.status === 'Open' && 
                 new Date(ticket.lastResponseAt) < new Date(Date.now() - 24 * 60 * 60 * 1000),
      hasUnreadResponses
    };

    // FIXED: Create audit log with correct field mapping
    await createAuditLog({
      adminId: (request as any).admin?.id,
      action: 'tickets.view',
      entityId: ticket._id.toString(),
      newData: {
        ticketNumber: ticket.ticketNumber,
        status: ticket.status
      },
      request
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

    // Store old data for audit log
    const oldData = {
      status: existingTicket.status,
      priority: existingTicket.priority,
      assignedTo: existingTicket.assignedTo,
      category: existingTicket.category,
      tags: existingTicket.tags
    };

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

    // FIXED: Create audit log with correct field mapping
    await createAuditLog({
      adminId: (request as any).admin?.id,
      action: 'tickets.update',
      entityId: id,
      oldData,
      newData: updateData,
      changes: Object.keys(updates).map(field => ({
        field,
        oldValue: oldData[field as keyof typeof oldData],
        newValue: updates[field as keyof typeof updates]
      })),
      request,
      severity: 'Medium'
    });

    return apiHandler.success(updatedTicket, 'Ticket updated successfully');

  } catch (error) {
    console.error('Update ticket error:', error);
    return apiHandler.internalError('Failed to update support ticket');
  }
}

// POST /api/support/tickets/[id] - Add response to ticket
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

    // Add response to ticket
    const newResponse = {
      message,
      isAdminResponse,
      adminId: isAdminResponse ? (request as any).admin?.id : null,
      attachments: attachments || [],
      createdAt: new Date()
    };

    const updatedTicket = await SupportTicket.findByIdAndUpdate(
      id,
      {
        $push: { responses: newResponse },
        $set: { 
          lastResponseAt: new Date(),
          status: ticket.status === 'Waiting for User' ? 'In Progress' : ticket.status
        }
      },
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

    // Send email notification to user if admin response
    if (isAdminResponse) {
      try {
        await sendEmail({
          to: ticket.userId.email,
          subject: `New Response - Ticket ${ticket.ticketNumber}`,
          templateId: 'support-ticket-response',
          variables: {
            userName: ticket.userId.name,
            ticketNumber: ticket.ticketNumber,
            subject: ticket.subject,
            response: message
          }
        });
      } catch (emailError) {
        console.error('Failed to send response email:', emailError);
      }
    }

    // FIXED: Create audit log with correct field mapping
    await createAuditLog({
      adminId: (request as any).admin?.id,
      action: 'tickets.respond',
      entityId: id,
      newData: {
        responseMessage: message,
        isAdminResponse,
        ticketNumber: ticket.ticketNumber
      },
      request,
      severity: 'Low'
    });

    return apiHandler.success(updatedTicket, 'Response added successfully');

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

    // FIXED: Create audit log with correct field mapping
    await createAuditLog({
      adminId: (request as any).admin?.id,
      action: 'tickets.delete',
      entityId: id,
      oldData: {
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        status: ticket.status
      },
      request,
      severity: 'High'
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
