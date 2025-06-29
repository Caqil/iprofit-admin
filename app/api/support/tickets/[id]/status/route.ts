import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { SupportTicket } from '@/models/SupportTicket';
import { AuditLog } from '@/models/AuditLog';
import { authMiddleware } from '@/middleware/auth';
import { apiRateLimit } from '@/middleware/rate-limit';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import { sendEmail } from '@/lib/email';
import { objectIdValidator } from '@/utils/validators';
import { z } from 'zod';

const statusUpdateSchema = z.object({
  status: z.enum(['Open', 'In Progress', 'Waiting for User', 'Resolved', 'Closed']),
  resolution: z.string().optional(),
  internalNotes: z.string().optional()
});

// PATCH /api/support/tickets/[id]/status - Update ticket status
async function updateTicketStatusHandler(
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
    const validationResult = statusUpdateSchema.safeParse(body);

    if (!validationResult.success) {
      return apiHandler.validationError(
        validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      );
    }

    const { status, resolution, internalNotes } = validationResult.data;

    // Find ticket
    const ticket = await SupportTicket.findById(id).populate('userId', 'name email');
    if (!ticket) {
      return apiHandler.notFound('Support ticket not found');
    }

    const previousStatus = ticket.status;

    // Update status and related fields
    ticket.status = status;

    if (status === 'Resolved') {
      ticket.resolvedAt = new Date();
      if (resolution) {
        ticket.resolution = resolution;
      }
      
      // Calculate resolution time
      const createdTime = new Date(ticket.createdAt).getTime();
      const resolvedTime = new Date().getTime();
      ticket.resolutionTime = Math.round((resolvedTime - createdTime) / (1000 * 60)); // in minutes
      
    } else if (status === 'Closed') {
      ticket.closedAt = new Date();
      if (!ticket.resolvedAt) {
        ticket.resolvedAt = new Date();
      }
    }

    // Add status update as response
    const statusMessage = `Ticket status changed from "${previousStatus}" to "${status}"${resolution ? `. Resolution: ${resolution}` : ''}`;
    ticket.responses.push({
      message: statusMessage,
      isAdminResponse: true,
      adminId: (request as any).admin?.id,
      createdAt: new Date()
    });

    await ticket.save();

    // Send email notification to user for significant status changes
    if (['Resolved', 'Closed'].includes(status)) {
      try {
        await sendEmail({
          to: ticket.userId.email,
          subject: `Ticket ${status} - ${ticket.ticketNumber}`,
          templateId: 'support-ticket-resolved',
          variables: {
            userName: ticket.userId.name,
            ticketNumber: ticket.ticketNumber,
            status,
            resolution: resolution || 'No specific resolution provided',
            subject: ticket.subject
          }
        });
      } catch (emailError) {
        console.error('Failed to send status update email:', emailError);
      }
    }

    // Create audit log
    await AuditLog.create({
      adminId: (request as any).admin?.id,
      action: 'tickets.status_update',
      resourceType: 'SupportTicket',
      resourceId: id,
      details: {
        ticketNumber: ticket.ticketNumber,
        previousStatus,
        newStatus: status,
        resolution,
        internalNotes,
        resolutionTime: ticket.resolutionTime
      },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return apiHandler.success(ticket, 'Ticket status updated successfully');

  } catch (error) {
    console.error('Update ticket status error:', error);
    return apiHandler.internalError('Failed to update ticket status');
  }
}

export const PATCH = withErrorHandler(updateTicketStatusHandler);