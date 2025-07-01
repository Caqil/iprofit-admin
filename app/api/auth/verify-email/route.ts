// app/api/auth/verify-email/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { AuditLog } from '@/models/AuditLog';
import { sendEmail } from '@/lib/email';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import { emailValidator } from '@/utils/validators';

// Email verification validation schema
const verifyEmailSchema = z.object({
  email: emailValidator,
  token: z.string().min(1, 'Verification token is required'),
  deviceId: z.string().min(1, 'Device ID is required')
});

async function verifyEmailHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  try {
    await connectToDatabase();

    const body = await request.json();
    const validationResult = verifyEmailSchema.safeParse(body);

    if (!validationResult.success) {
      return apiHandler.validationError(
        validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      );
    }

    const { email, token, deviceId } = validationResult.data;
    const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    // Find user with valid verification token
    const user = await User.findOne({
      email: email.toLowerCase(),
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() },
      status: 'Active'
    });

    if (!user) {
      await logEmailVerificationAttempt(email, false, 'Invalid or expired token', clientIP, userAgent);
      return apiHandler.unauthorized('Invalid or expired verification token');
    }

    // Check if email is already verified
    if (user.emailVerified) {
      await logEmailVerificationAttempt(email, true, 'Email already verified', clientIP, userAgent);
      return apiHandler.success({
        message: 'Email address is already verified'
      });
    }

    // Check verification attempts
    const maxAttempts = 5;
    if (user.emailVerificationAttempts >= maxAttempts) {
      await logEmailVerificationAttempt(email, false, 'Too many verification attempts', clientIP, userAgent);
      
      // Clear verification token after too many attempts
      await User.findByIdAndUpdate(user._id, {
        emailVerificationToken: undefined,
        emailVerificationExpires: undefined,
        emailVerificationAttempts: 0
      });
      
      return apiHandler.tooManyRequests('Too many verification attempts. Please request a new verification email.');
    }

    // Mark email as verified and clear verification fields
    await User.findByIdAndUpdate(user._id, {
      emailVerified: true,
      emailVerificationToken: undefined,
      emailVerificationExpires: undefined,
      emailVerificationAttempts: 0,
      emailVerifiedAt: new Date(),
      deviceId // Update device ID
    });

    await logEmailVerificationAttempt(email, true, 'Email verified successfully', clientIP, userAgent);

    // Send welcome confirmation email
    try {
      await sendEmail({
        to: email,
        subject: 'Email Verification Successful',
        templateId: 'email_verified',
        variables: {
          userName: user.name,
          verificationDate: new Date().toLocaleDateString(),
          loginUrl: `${process.env.NEXTAUTH_URL}/login`,
          dashboardUrl: `${process.env.NEXTAUTH_URL}/user/dashboard`,
          supportEmail: process.env.SUPPORT_EMAIL || 'support@iprofit.com'
        }
      });
    } catch (emailError) {
      console.error('Failed to send email verification confirmation:', emailError);
      // Don't fail the verification if email fails
    }

    // Check if user can now access premium features
    const kycRequired = user.kycStatus !== 'Approved';
    const phoneRequired = !user.phoneVerified;

    let nextSteps: string[] = [];
    if (phoneRequired) {
      nextSteps.push('Verify your phone number');
    }
    if (kycRequired) {
      nextSteps.push('Complete KYC verification');
    }

    return apiHandler.success({
      message: 'Email verified successfully!',
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        emailVerified: true,
        phoneVerified: user.phoneVerified,
        kycStatus: user.kycStatus
      },
      nextSteps: nextSteps.length > 0 ? nextSteps : ['You can now access all features']
    });

  } catch (error) {
    console.error('Email verification error:', error);
    return apiHandler.internalError('Email verification failed');
  }
}

async function logEmailVerificationAttempt(
  email: string,
  success: boolean,
  reason: string,
  ipAddress: string,
  userAgent: string
) {
  try {
    await AuditLog.create({
      adminId: null,
      action: 'EMAIL_VERIFICATION',
      entity: 'User',
      entityId: email,
      status: success ? 'Success' : 'Failed',
      errorMessage: success ? null : reason,
      ipAddress,
      userAgent,
      severity: success ? 'Low' : 'Medium'
    });
  } catch (error) {
    console.error('Failed to log email verification attempt:', error);
  }
}

export const POST = withErrorHandler(verifyEmailHandler);