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
import { getToken } from 'next-auth/jwt';
import { env } from '@/config/env';



// Next.js 15 Route Handler with proper params typing
interface RouteContext {
  params: Promise<{ id: string }>;
}
export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  try {
    // Apply basic rate limiting
    const rateLimitResult = await apiRateLimit(request);
    if (rateLimitResult) return rateLimitResult;

    await connectToDatabase();

    // ✅ CRITICAL FIX: Get user info directly from JWT token instead of relying on middleware headers
    const token = await getToken({
      req: request,
      secret: env.NEXTAUTH_SECRET,
      cookieName: env.NODE_ENV === 'production' 
        ? '__Secure-next-auth.session-token' 
        : 'next-auth.session-token'
    });

    console.log('🔐 JWT Token Debug:', {
      hasToken: !!token,
      userType: token?.userType,
      userId: token?.id,
      role: token?.role,
      email: token?.email
    });

    // Check if user is authenticated
    if (!token) {
      return apiHandler.unauthorized('Authentication required');
    }

    // Extract user info from token
    const requestingUserId = token.id as string;
    const userType = token.userType as string;
    const userRole = token.role as string;

    // Await the params Promise (Next.js 15 requirement)
    const { id } = await context.params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return apiHandler.badRequest('Invalid user ID format');
    }

    // ✅ FIXED: Authorization logic using token data
    const isAdmin = userType === 'admin';
    const isOwnKYC = requestingUserId === id;
    
    console.log('🔐 Authorization Check:', {
      requestingUserId,
      userType,
      userRole,
      targetUserId: id,
      isAdmin,
      isOwnKYC
    });

    if (!isAdmin && !isOwnKYC) {
      console.error('❌ Authorization failed');
      return apiHandler.forbidden('You can only access your own KYC information or you need admin permissions');
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
      isVerified: user.kycStatus === 'Approved',
    };

    console.log('✅ KYC data retrieved successfully for user:', user.name);

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

    // ✅ CRITICAL FIX: Convert lowercase API values to capitalized User model values
    const convertStatusToUserModel = (apiStatus: string): string => {
      switch (apiStatus) {
        case 'approved':
          return 'Approved';
        case 'rejected':
          return 'Rejected';
        case 'pending':
          return 'Pending';
        default:
          throw new Error(`Invalid status: ${apiStatus}`);
      }
    };

    const userModelStatus = convertStatusToUserModel(status);

    // Prevent unnecessary status changes
    if (user.kycStatus === userModelStatus) {
      return apiHandler.badRequest(`KYC status is already ${userModelStatus}`);
    }

    // Validate rejection reason for rejected status
    if (status === 'rejected' && !rejectionReason) {
      return apiHandler.badRequest('Rejection reason is required when rejecting KYC');
    }

    // ✅ FIXED: Prepare update data with properly converted status
    const updateData: any = {
      kycStatus: userModelStatus, // Use converted capitalized value
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

    console.log('🔧 KYC Update Data:', {
      originalStatus: status,
      convertedStatus: userModelStatus,
      updateData
    });

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('name email kycStatus kycRejectionReason kycApprovedAt kycRejectedAt');

    console.log('✅ User updated successfully:', {
      userId: updatedUser?._id,
      newKycStatus: updatedUser?.kycStatus
    });

    // Log admin action
    await AuditLog.create({
  adminId: adminId, // Ensure it's an ObjectId
  action: 'KYC_STATUS_UPDATE',
  entity: 'User', // ✅ FIXED: Use 'entity' instead of 'target'
  entityId: id, // ✅ FIXED: Use 'entityId' instead of 'targetId'
  oldData: {
    kycStatus: user.kycStatus,
    kycRejectionReason: user.kycRejectionReason
  },
  newData: {
    kycStatus: userModelStatus,
    kycRejectionReason: status === 'rejected' ? rejectionReason : undefined
  },
  changes: [
    {
      field: 'kycStatus',
      oldValue: user.kycStatus,
      newValue: userModelStatus
    }
  ],
  severity: 'Medium',
  status: 'Success',
  metadata: {
    previousStatus: user.kycStatus,
    newStatus: userModelStatus,
    rejectionReason,
    adminNotes,
    documentsRequired,
    context: 'KYC_APPROVAL_PROCESS'
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
      message: `KYC status updated to ${userModelStatus} successfully`
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