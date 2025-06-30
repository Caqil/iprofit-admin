// app/api/users/[id]/kyc/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { AuditLog } from '@/models/AuditLog';
import { authMiddleware } from '@/middleware/auth';
import { apiRateLimit } from '@/middleware/rate-limit';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import { 
  sendKYCApprovalEmail, 
  sendKYCRejectionEmail,
  sendEmail 
} from '@/lib/email';
import { z } from 'zod';
import mongoose from 'mongoose';
import { kycDocumentSchema, kycUpdateSchema } from '@/lib/validation';



// Next.js 15 Route Handler with proper params typing
interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/users/[id]/kyc - Get KYC status and documents
export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  try {
    // Apply middleware
    const authResult = await authMiddleware(request, {
      requireAuth: true,
      allowedUserTypes: ['admin', 'user'],
    });
    if (authResult) return authResult;

    const rateLimitResult = await apiRateLimit(request);
    if (rateLimitResult) return rateLimitResult;

    await connectToDatabase();

    // Await the params Promise (Next.js 15 requirement)
    const { id } = await context.params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return apiHandler.badRequest('Invalid user ID format');
    }

    // Check authorization - users can only view their own KYC, admins can view any
    const requestingUserId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');
    
    if (userRole !== 'admin' && requestingUserId !== id) {
      return apiHandler.forbidden('You can only access your own KYC information');
    }

    // Find user with KYC data
    const user = await User.findById(id).select(
      'name email phone kycStatus kycDocuments kycRejectionReason kycSubmittedAt kycApprovedAt kycRejectedAt'
    );

    if (!user) {
      return apiHandler.notFound('User not found');
    }

    // Format response
    const kycData = {
      userId: user._id,
      userName: user.name,
      userEmail: user.email,
      userPhone: user.phone,
      status: user.kycStatus,
      documents: user.kycDocuments || [],
      rejectionReason: user.kycRejectionReason,
      submittedAt: user.kycSubmittedAt,
      approvedAt: user.kycApprovedAt,
      rejectedAt: user.kycRejectedAt,
      isVerified: user.kycStatus === 'approved',
    };

    return apiHandler.success(kycData, 'KYC information retrieved successfully');

  } catch (error) {
    console.error('KYC GET Error:', error);
    return apiHandler.handleError('Failed to retrieve KYC information');
  }
}

// PUT /api/users/[id]/kyc - Update KYC status (Admin only)
export async function PUT(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  try {
    // Apply middleware
    const authResult = await authMiddleware(request, {
      requireAuth: true,
      allowedUserTypes: ['admin'],
      requiredPermission: 'users.update'
    });
    if (authResult) return authResult;

    const rateLimitResult = await apiRateLimit(request);
    if (rateLimitResult) return rateLimitResult;

    await connectToDatabase();

    // Await the params Promise (Next.js 15 requirement)
    const { id } = await context.params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return apiHandler.badRequest('Invalid user ID format');
    }

    const body = await request.json();
    const validationResult = kycUpdateSchema.safeParse(body);

    if (!validationResult.success) {
      return apiHandler.validationError(
        validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      );
    }

    const { status, rejectionReason, adminNotes, documentsRequired } = validationResult.data;
    const adminId = request.headers.get('x-user-id');

    // Find user
    const user = await User.findById(id);
    if (!user) {
      return apiHandler.notFound('User not found');
    }

    // Prevent unnecessary status changes
    if (user.kycStatus === status) {
      return apiHandler.badRequest(`KYC status is already ${status}`);
    }

    // Validate rejection reason for rejected status
    if (status === 'rejected' && !rejectionReason) {
      return apiHandler.badRequest('Rejection reason is required when rejecting KYC');
    }

    // Prepare update data
    const updateData: any = {
      kycStatus: status,
      kycRejectionReason: status === 'rejected' ? rejectionReason : undefined,
      kycAdminNotes: adminNotes,
      kycDocumentsRequired: documentsRequired,
    };

    // Set timestamp based on status
    switch (status) {
      case 'approved':
        updateData.kycApprovedAt = new Date();
        updateData.kycRejectedAt = undefined;
        break;
      case 'rejected':
        updateData.kycRejectedAt = new Date();
        updateData.kycApprovedAt = undefined;
        break;
      case 'pending':
        updateData.kycApprovedAt = undefined;
        updateData.kycRejectedAt = undefined;
        break;
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('name email kycStatus kycRejectionReason kycApprovedAt kycRejectedAt');

    // Log admin action
    await AuditLog.create({
      adminId,
      action: 'KYC_STATUS_UPDATE',
      target: 'User',
      targetId: id,
      details: {
        previousStatus: user.kycStatus,
        newStatus: status,
        rejectionReason,
        adminNotes,
        documentsRequired
      },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    // Send email notification using your existing email system
    try {
      let emailSent = false;

      switch (status) {
        case 'approved':
          // Use your existing sendKYCApprovalEmail function
          emailSent = await sendKYCApprovalEmail(user.email, user.name);
          break;
          
        case 'rejected':
          // Use your existing sendKYCRejectionEmail function
          emailSent = await sendKYCRejectionEmail(
            user.email, 
            user.name, 
            rejectionReason || 'Documents do not meet our requirements'
          );
          break;
          
        case 'pending':
          // Send pending review email using your template system
          emailSent = await sendEmail({
            to: user.email,
            subject: 'KYC Under Review',
            templateId: 'kyc_pending',
            variables: {
              userName: user.name,
              reviewDate: new Date().toLocaleDateString(),
              expectedTime: '1-3 business days',
              supportEmail: process.env.SUPPORT_EMAIL || 'support@example.com',
              loginUrl: `${process.env.NEXTAUTH_URL}/login`
            }
          });
          break;
      }

      console.log(`KYC ${status} email sent to ${user.email}: ${emailSent}`);
    } catch (emailError) {
      console.error('Failed to send KYC notification email:', emailError);
      // Don't fail the request if email fails
    }

    return apiHandler.success({
      user: updatedUser,
      message: `KYC status updated to ${status} successfully`
    });

  } catch (error) {
    console.error('KYC PUT Error:', error);
    return apiHandler.handleError('Failed to update KYC status');
  }
}

// POST /api/users/[id]/kyc - Submit KYC documents (User only)
export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  try {
    // Apply middleware
    const authResult = await authMiddleware(request, {
      requireAuth: true,
      allowedUserTypes: ['user']
    });
    if (authResult) return authResult;

    const rateLimitResult = await apiRateLimit(request);
    if (rateLimitResult) return rateLimitResult;

    await connectToDatabase();

    // Await the params Promise (Next.js 15 requirement)
    const { id } = await context.params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return apiHandler.badRequest('Invalid user ID format');
    }

    // Check authorization - users can only submit their own KYC
    const requestingUserId = request.headers.get('x-user-id');
    if (requestingUserId !== id) {
      return apiHandler.forbidden('You can only submit KYC for your own account');
    }

    const body = await request.json();
    const validationResult = kycDocumentSchema.safeParse(body);

    if (!validationResult.success) {
      return apiHandler.validationError(
        validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      );
    }

    const documentData = validationResult.data;

    // Find user
    const user = await User.findById(id);
    if (!user) {
      return apiHandler.notFound('User not found');
    }

    // Check if KYC is already approved
    if (user.kycStatus === 'approved') {
      return apiHandler.badRequest('KYC is already approved and cannot be modified');
    }

    // Add document to user's KYC documents
    const kycDocument = {
      ...documentData,
      uploadedAt: new Date(),
      status: 'pending'
    };

    // Update user with new document and set status to pending
    const updatedUser = await User.findByIdAndUpdate(
      id,
      {
        $push: { kycDocuments: kycDocument },
        $set: {
          kycStatus: 'pending',
          kycSubmittedAt: new Date()
        }
      },
      { new: true, runValidators: true }
    ).select('name email kycStatus kycDocuments kycSubmittedAt');

    // Send confirmation email using your template system
    try {
      const emailSent = await sendEmail({
        to: user.email,
        subject: 'KYC Document Submitted Successfully',
        templateId: 'kyc_document_submitted',
        variables: {
          userName: user.name,
          documentType: documentData.documentType.replace('_', ' ').toUpperCase(),
          submittedAt: new Date().toLocaleDateString(),
          expectedProcessingTime: '1-3 business days',
          trackingUrl: `${process.env.NEXTAUTH_URL}/user/kyc`,
          supportEmail: process.env.SUPPORT_EMAIL || 'support@example.com'
        }
      });

      console.log(`KYC document submission email sent to ${user.email}: ${emailSent}`);
    } catch (emailError) {
      console.error('Failed to send KYC submission confirmation email:', emailError);
    }

    return apiHandler.success({
      user: updatedUser,
      document: kycDocument,
      message: 'KYC document submitted successfully'
    }, 'KYC document submitted successfully');

  } catch (error) {
    console.error('KYC POST Error:', error);
    return apiHandler.handleError('Failed to submit KYC document');
  }
}

// DELETE /api/users/[id]/kyc - Reset KYC status (Admin only)
export async function DELETE(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  try {
    // Apply middleware
    const authResult = await authMiddleware(request, {
      requireAuth: true,
      allowedUserTypes: ['admin'],
    });
    if (authResult) return authResult;

    const rateLimitResult = await apiRateLimit(request);
    if (rateLimitResult) return rateLimitResult;

    await connectToDatabase();

    // Await the params Promise (Next.js 15 requirement)
    const { id } = await context.params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return apiHandler.badRequest('Invalid user ID format');
    }

    const adminId = request.headers.get('x-user-id');

    // Find user
    const user = await User.findById(id);
    if (!user) {
      return apiHandler.notFound('User not found');
    }

    // Reset KYC data
    const updatedUser = await User.findByIdAndUpdate(
      id,
      {
        $set: {
          kycStatus: 'pending',
          kycDocuments: [],
          kycRejectionReason: undefined,
          kycAdminNotes: undefined,
          kycDocumentsRequired: undefined,
          kycSubmittedAt: undefined,
          kycApprovedAt: undefined,
          kycRejectedAt: undefined
        }
      },
      { new: true, runValidators: true }
    ).select('name email kycStatus');

    // Log admin action
    await AuditLog.create({
      adminId,
      action: 'KYC_RESET',
      target: 'User',
      targetId: id,
      details: {
        previousStatus: user.kycStatus,
        reason: 'Admin reset KYC data'
      },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    // Send notification email using your template system
    try {
      const emailSent = await sendEmail({
        to: user.email,
        subject: 'KYC Verification Reset',
        templateId: 'kyc_reset',
        variables: {
          userName: user.name,
          resetDate: new Date().toLocaleDateString(),
          resubmitUrl: `${process.env.NEXTAUTH_URL}/user/kyc`,
          supportEmail: process.env.SUPPORT_EMAIL || 'support@example.com',
          loginUrl: `${process.env.NEXTAUTH_URL}/login`
        }
      });

      console.log(`KYC reset email sent to ${user.email}: ${emailSent}`);
    } catch (emailError) {
      console.error('Failed to send KYC reset notification email:', emailError);
    }

    return apiHandler.success({
      user: updatedUser,
      message: 'KYC data reset successfully'
    });

  } catch (error) {
    console.error('KYC DELETE Error:', error);
    return apiHandler.handleError('Failed to reset KYC data');
  }
}