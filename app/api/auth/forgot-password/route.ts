// app/api/auth/forgot-password/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { AuditLog } from '@/models/AuditLog';
import { generateSecureToken } from '@/lib/encryption';
import { sendEmail } from '@/lib/email';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import { emailValidator } from '@/utils/validators';

// Forgot password validation schema
const forgotPasswordSchema = z.object({
  email: emailValidator,
  deviceId: z.string().min(1, 'Device ID is required')
});

async function forgotPasswordHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  try {
    await connectToDatabase();

    const body = await request.json();
    const validationResult = forgotPasswordSchema.safeParse(body);

    if (!validationResult.success) {
      return apiHandler.validationError(
        validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      );
    }

    const { email, deviceId } = validationResult.data;
    const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    // Find user by email
    const user = await User.findOne({
      email: email.toLowerCase(),
      status: 'Active'
    });

    // Always return success message for security (don't reveal if email exists)
    const successMessage = 'If an account with this email exists, we have sent password reset instructions.';

    if (!user) {
      await logPasswordResetAttempt(email, false, 'User not found', clientIP, userAgent);
      // Return success to prevent email enumeration
      return apiHandler.success({ message: successMessage });
    }

    // Check if user is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await logPasswordResetAttempt(email, false, 'Account locked', clientIP, userAgent);
      return apiHandler.forbidden('Account is temporarily locked. Please try again later.');
    }

    // Rate limiting: Check recent reset requests
    const recentResetTime = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
    if (user.passwordResetRequestedAt && user.passwordResetRequestedAt > recentResetTime) {
      await logPasswordResetAttempt(email, false, 'Rate limited', clientIP, userAgent);
      return apiHandler.tooManyRequests('Password reset was recently requested. Please wait 5 minutes before requesting again.');
    }

    // Generate reset token
    const resetToken = generateSecureToken(32);
    const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Update user with reset token
    await User.findByIdAndUpdate(user._id, {
      passwordResetToken: resetToken,
      passwordResetExpires: resetTokenExpires,
      passwordResetRequestedAt: new Date(),
      passwordResetAttempts: 0
    });

    await logPasswordResetAttempt(email, true, 'Reset token generated', clientIP, userAgent);

    // Send reset email
    try {
      const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;
      
      await sendEmail({
        to: email,
        subject: 'Password Reset Request',
        templateId: 'password_reset',
        variables: {
          userName: user.name,
          resetUrl,
          expiresIn: '1 hour',
          deviceInfo: userAgent,
          ipAddress: clientIP,
          supportEmail: process.env.SUPPORT_EMAIL || 'support@iprofit.com',
          securityUrl: `${process.env.NEXTAUTH_URL}/security`
        }
      });
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      return apiHandler.internalError('Failed to send password reset email');
    }

    return apiHandler.success({ message: successMessage });

  } catch (error) {
    console.error('Forgot password error:', error);
    return apiHandler.internalError('Password reset request failed');
  }
}

async function logPasswordResetAttempt(
  email: string,
  success: boolean,
  reason: string,
  ipAddress: string,
  userAgent: string
) {
  try {
    await AuditLog.create({
      adminId: null,
      action: 'PASSWORD_RESET_REQUEST',
      entity: 'User',
      entityId: email,
      status: success ? 'Success' : 'Failed',
      errorMessage: success ? null : reason,
      ipAddress,
      userAgent,
      severity: success ? 'Low' : 'Medium'
    });
  } catch (error) {
    console.error('Failed to log password reset attempt:', error);
  }
}

export const POST = withErrorHandler(forgotPasswordHandler);