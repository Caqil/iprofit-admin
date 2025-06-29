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
import { assignTicketSchema, objectIdValidator } from '@/lib/validation';
import { z } from 'zod';
import mongoose from 'mongoose';



// POST /api/support/tickets/[id]/assign - Assign ticket to admin
async function assignTicketHandler(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Apply middleware
  const authResult = await authMiddleware(request, {
    requireAuth: true,
    allowedUserTypes: ['admin'],
    requiredPermission: 'support.assign'
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
    const validationResult = assignTicketSchema.safeParse(body);

    if (!validationResult.success) {
      return apiHandler.validationError(
        validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      );
    }

    const { adminId, notes } = validationResult.data;

    // Find ticket
    const ticket = await SupportTicket.findById(id).populate('userId', 'name email');
    if (!ticket) {
      return apiHandler.notFound('Support ticket not found');
    }

    // Verify admin exists
    const admin = await Admin.findById(adminId).select('name email');
    if (!admin) {
      return apiHandler.notFound('Admin not found');
    }

    const previousAdmin = ticket.assignedTo;

    // Update ticket assignment
    ticket.assignedTo = new mongoose.Types.ObjectId(adminId);
    ticket.status = ticket.status === 'Open' ? 'In Progress' : ticket.status;
    
    // Add assignment note as response if provided
    if (notes) {
      ticket.responses.push({
        message: `Ticket assigned to ${admin.name}. Notes: ${notes}`,
        isAdminResponse: true,
        adminId: (request as any).admin?.id,
        createdAt: new Date()
      });
    }

    await ticket.save();

    // Send email notification to assigned admin
    try {
      await sendEmail({
        to: admin.email,
        subject: `Ticket Assigned - ${ticket.ticketNumber}`,
        templateId: 'support-ticket-assigned',
        variables: {
          adminName: admin.name,
          ticketNumber: ticket.ticketNumber,
          subject: ticket.subject,
          priority: ticket.priority,
          userName: ticket.userId.name,
          notes: notes || ''
        }
      });
    } catch (emailError) {
      console.error('Failed to send assignment email:', emailError);
    }

    // Create audit log
    await AuditLog.create({
      adminId: (request as any).admin?.id,
      action: 'tickets.assign',
      resourceType: 'SupportTicket',
      resourceId: id,
      details: {
        ticketNumber: ticket.ticketNumber,
        assignedTo: adminId,
        assignedToName: admin.name,
        previousAdmin: previousAdmin?.toString(),
        notes
      },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return apiHandler.success(ticket, 'Ticket assigned successfully');

  } catch (error) {
    console.error('Assign ticket error:', error);
    return apiHandler.internalError('Failed to assign ticket');
  }
}

export const POST = withErrorHandler(assignTicketHandler);