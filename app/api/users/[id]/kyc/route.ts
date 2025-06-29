import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { User, IUser } from '@/models/User';
import { AuditLog } from '@/models/AuditLog';
import { authMiddleware } from '@/middleware/auth';
import { apiRateLimit } from '@/middleware/rate-limit';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import { sendEmail } from '@/lib/email';
import { kycApprovalSchema } from '@/lib/validation';
import { objectIdValidator } from '@/utils/validators';
import { KYCApprovalRequest } from '@/types';
import mongoose from 'mongoose';
import { Permission } from '@/lib/permissions';

// GET /api/users/[id]/kyc - Get user KYC details
async function getKYCHandler(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Apply middleware
  const authResult = await authMiddleware(request, {
    requireAuth: true,
    allowedUserTypes: ['admin'],
  });
  if (authResult) return authResult;

  const rateLimitResult = await apiRateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    await connectToDatabase();

    const { id } = params;

    // Validate user ID
    const idValidation = objectIdValidator.safeParse(id);
    if (!idValidation.success) {
      return apiHandler.badRequest('Invalid user ID format');
    }

    const user = await User.findById(id).select(
      'name email kycStatus kycDocuments kycRejectionReason createdAt updatedAt'
    );

    if (!user) {
      return apiHandler.notFound('User not found');
    }

    // Log audit
    await AuditLog.create({
      adminId: request.headers.get('x-user-id'),
      action: 'kyc.view',
      entity: 'KYC',
      entityId: id,
      status: 'Success',
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return apiHandler.success({
      userId: user._id,
      userName: user.name,
      userEmail: user.email,
      kycStatus: user.kycStatus,
      kycDocuments: user.kycDocuments,
      kycRejectionReason: user.kycRejectionReason,
      submittedAt: user.createdAt,
      lastUpdated: user.updatedAt
    });

  } catch (error) {
    return apiHandler.handleError(error);
  }
}

// POST /api/users/[id]/kyc - Process KYC approval/rejection
async function processKYCHandler(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Apply middleware
  const authResult = await authMiddleware(request, {
    requireAuth: true,
    allowedUserTypes: ['admin'],
  });
  if (authResult) return authResult;

  const rateLimitResult = await apiRateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    await connectToDatabase();

    const { id } = params;
    const adminId = request.headers.get('x-user-id');

    // Validate user ID
    const idValidation = objectIdValidator.safeParse(id);
    if (!idValidation.success) {
      return apiHandler.badRequest('Invalid user ID format');
    }

    const body = await request.json();
    const validationResult = kycApprovalSchema.safeParse({
      ...body,
      userId: id
    });

    if (!validationResult.success) {
      return apiHandler.validationError(
        validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      );
    }

    const { action, rejectionReason } = validationResult.data;

    const user = await User.findById(id);
    if (!user) {
      return apiHandler.notFound('User not found');
    }

    if (user.kycStatus !== 'Pending') {
      return apiHandler.badRequest(`KYC is already ${user.kycStatus.toLowerCase()}`);
    }

    const updateData: any = {
      kycStatus: action === 'approve' ? 'Approved' : 'Rejected',
      updatedAt: new Date()
    };

    if (action === 'reject' && rejectionReason) {
      updateData.kycRejectionReason = rejectionReason;
    } else if (action === 'approve') {
      updateData.kycRejectionReason = undefined;
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).select('name email kycStatus kycRejectionReason');

    if (!updatedUser) {
      return apiHandler.notFound('User not found');
    }

    // Send notification email
    try {
      const emailTemplate = action === 'approve' ? 'kyc_approved' : 'kyc_rejected';
      const emailSubject = action === 'approve' ? 'KYC Approved' : 'KYC Rejected';
      
      await sendEmail({
        to: updatedUser.email,
        templateId: emailTemplate,
        subject: emailSubject,
        variables: {
          name: updatedUser.name,
          rejectionReason: rejectionReason || '',
          supportEmail: process.env.SUPPORT_EMAIL,
          resubmitUrl: process.env.NEXTAUTH_URL + '/user/kyc'
        }
      });
    } catch (emailError) {
      console.error('Failed to send KYC notification email:', emailError);
    }

    // Log audit
    await AuditLog.create({
      adminId,
      action: `kyc.${action}`,
      entity: 'KYC',
      entityId: id,
      status: 'Success',
      metadata: {
        userName: updatedUser.name,
        userEmail: updatedUser.email,
        kycStatus: updatedUser.kycStatus,
        rejectionReason: rejectionReason || null
      },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return apiHandler.success({
      userId: updatedUser._id,
      kycStatus: updatedUser.kycStatus,
      message: `KYC ${action}d successfully`,
      emailSent: true
    });

  } catch (error) {
    return apiHandler.handleError(error);
  }
}

export async function GET(request: NextRequest, context: { params: { id: string } }) {
  return withErrorHandler(getKYCHandler)(request, context);
}

export async function POST(request: NextRequest, context: { params: { id: string } }) {
  return withErrorHandler(processKYCHandler)(request, context);
}