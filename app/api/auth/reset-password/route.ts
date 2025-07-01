// app/api/auth/reset-password/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { AuditLog } from '@/models/AuditLog';
import { hashPassword } from '@/lib/encryption';
import { sendEmail } from '@/lib/email';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import { emailValidator, passwordValidator } from '@/utils/validators';

// Reset password validation schema
const resetPasswordSchema = z.object({
  email: emailValidator,
  token: z.string().min(1, 'Reset token is required'),
  password: passwordValidator,
  confirmPassword: z.string(),
  deviceId: z.string().min(1, 'Device ID is required')
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

async function resetPasswordHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  try {
    await connectToDatabase();

    const body = await request.json();
    const validationResult = resetPasswordSchema.safeParse(body);

    if (!validationResult.success) {
      return apiHandler.validationError(
        validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      );
    }

    const { email, token, password, deviceId } = validationResult.data;
    const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    // Find user with valid reset token
    const user = await User.findOne({
      email: email.toLowerCase(),
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() },
      status: 'Active'
    });

    if (!user) {
      await logPasswordResetAttempt(email, false, 'Invalid or expired token', clientIP, userAgent);
      return apiHandler.unauthorized('Invalid or expired reset token');
    }

    // Check reset attempts
    if (user.passwordResetAttempts >= 5) {
      await logPasswordResetAttempt(email, false, 'Too many reset attempts', clientIP, userAgent);
      
      // Clear reset token after too many attempts
      await User.findByIdAndUpdate(user._id, {
        passwordResetToken: undefined,
        passwordResetExpires: undefined,
        passwordResetAttempts: 0
      });
      
      return apiHandler.tooManyRequests('Too many reset attempts. Please request a new password reset.');
    }

    // Hash new password
    const passwordHash = await hashPassword(password);

    // Update user with new password and clear reset fields
    await User.findByIdAndUpdate(user._id, {
      passwordHash,
      passwordResetToken: undefined,
      passwordResetExpires: undefined,
      passwordResetAttempts: 0,
      passwordResetRequestedAt: undefined,
      deviceId, // Update device ID
      loginAttempts: 0, // Reset login attempts
      lockedUntil: undefined, // Clear any account locks
      lastPasswordChange: new Date()
    });

    await logPasswordResetAttempt(email, true, 'Password reset successful', clientIP, userAgent);

    // Send confirmation email
    try {
      await sendEmail({
        to: email,
        subject: 'Password Reset Confirmation',
        templateId: 'password_reset_confirmation',
        variables: {
          userName: user.name,
          resetTime: new Date().toLocaleString(),
          deviceInfo: userAgent,
          ipAddress: clientIP,
          loginUrl: `${process.env.NEXTAUTH_URL}/login`,
          supportEmail: process.env.SUPPORT_EMAIL || 'support@iprofit.com',
          securityUrl: `${process.env.NEXTAUTH_URL}/security`
        }
      });
    } catch (emailError) {
      console.error('Failed to send password reset confirmation email:', emailError);
      // Don't fail the reset if email fails
    }

    return apiHandler.success({
      message: 'Password reset successful. You can now log in with your new password.'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    return apiHandler.internalError('Password reset failed');
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
      action: 'PASSWORD_RESET',
      entity: 'User',
      entityId: email,
      status: success ? 'Success' : 'Failed',
      errorMessage: success ? null : reason,
      ipAddress,
      userAgent,
      severity: success ? 'Low' : 'High'
    });
  } catch (error) {
    console.error('Failed to log password reset attempt:', error);
  }
}

export const POST = withErrorHandler(resetPasswordHandler);