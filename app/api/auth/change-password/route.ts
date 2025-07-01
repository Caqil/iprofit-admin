// app/api/auth/change-password/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/config/auth';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { AuditLog } from '@/models/AuditLog';
import { hashPassword, verifyPassword } from '@/lib/encryption';
import { sendEmail } from '@/lib/email';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import { passwordValidator } from '@/utils/validators';

// Change password validation schema
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordValidator,
  confirmPassword: z.string(),
  deviceId: z.string().min(1, 'Device ID is required')
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "New passwords don't match",
  path: ["confirmPassword"]
}).refine(data => data.currentPassword !== data.newPassword, {
  message: "New password must be different from current password",
  path: ["newPassword"]
});

async function changePasswordHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  try {
    await connectToDatabase();

    // Check authentication
    const session = await getServerSession(authConfig);
    if (!session?.user || session.user.userType !== 'user') {
      return apiHandler.unauthorized('Authentication required');
    }

    const body = await request.json();
    const validationResult = changePasswordSchema.safeParse(body);

    if (!validationResult.success) {
      return apiHandler.validationError(
        validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      );
    }

    const { currentPassword, newPassword, deviceId } = validationResult.data;
    const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    // Find user
    const user = await User.findById(session.user.id);
    if (!user) {
      return apiHandler.notFound('User not found');
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await logPasswordChangeAttempt(user.email, false, 'Account locked', clientIP, userAgent);
      return apiHandler.forbidden('Account is temporarily locked. Please try again later.');
    }

    // Verify current password
    let currentPasswordValid = false;
    if (user.passwordHash) {
      try {
        currentPasswordValid = await verifyPassword(currentPassword, user.passwordHash);
      } catch (error) {
        console.error('Password verification error:', error);
        currentPasswordValid = false;
      }
    }

    if (!currentPasswordValid) {
      // Increment login attempts and potentially lock account
      const newAttempts = (user.loginAttempts || 0) + 1;
      const maxAttempts = 5;
      
      const updateData: any = {
        loginAttempts: newAttempts
      };

      if (newAttempts >= maxAttempts) {
        updateData.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // Lock for 15 minutes
      }

      await User.findByIdAndUpdate(user._id, updateData);

      await logPasswordChangeAttempt(user.email, false, 'Invalid current password', clientIP, userAgent);
      
      if (newAttempts >= maxAttempts) {
        return apiHandler.forbidden('Account locked due to multiple failed attempts. Please try again in 15 minutes.');
      }
      
      return apiHandler.unauthorized('Current password is incorrect');
    }

    // Check password history (prevent reusing recent passwords)
    const recentPasswords = user.passwordHistory || [];
    for (const oldPasswordHash of recentPasswords.slice(-5)) { // Check last 5 passwords
      if (await verifyPassword(newPassword, oldPasswordHash)) {
        await logPasswordChangeAttempt(user.email, false, 'Password recently used', clientIP, userAgent);
        return apiHandler.badRequest('Cannot reuse a recently used password. Please choose a different password.');
      }
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password history
    const updatedPasswordHistory = [
      ...(recentPasswords || []),
      user.passwordHash
    ].slice(-5); // Keep only last 5 passwords

    // Update user with new password
    await User.findByIdAndUpdate(user._id, {
      passwordHash: newPasswordHash,
      passwordHistory: updatedPasswordHistory,
      lastPasswordChange: new Date(),
      loginAttempts: 0, // Reset login attempts
      lockedUntil: undefined, // Clear any account locks
      deviceId, // Update device ID
      passwordChangedFromDevice: deviceId
    });

    await logPasswordChangeAttempt(user.email, true, 'Password changed successfully', clientIP, userAgent);

    // Send confirmation email
    try {
      await sendEmail({
        to: user.email,
        subject: 'Password Changed Successfully',
        templateId: 'password_changed',
        variables: {
          userName: user.name,
          changeTime: new Date().toLocaleString(),
          deviceInfo: userAgent,
          ipAddress: clientIP,
          loginUrl: `${process.env.NEXTAUTH_URL}/login`,
          supportEmail: process.env.SUPPORT_EMAIL || 'support@iprofit.com',
          securityUrl: `${process.env.NEXTAUTH_URL}/user/security`
        }
      });
    } catch (emailError) {
      console.error('Failed to send password change confirmation email:', emailError);
      // Don't fail the password change if email fails
    }

    return apiHandler.success({
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    return apiHandler.internalError('Password change failed');
  }
}

async function logPasswordChangeAttempt(
  email: string,
  success: boolean,
  reason: string,
  ipAddress: string,
  userAgent: string
) {
  try {
    await AuditLog.create({
      adminId: null,
      action: 'PASSWORD_CHANGE',
      entity: 'User',
      entityId: email,
      status: success ? 'Success' : 'Failed',
      errorMessage: success ? null : reason,
      ipAddress,
      userAgent,
      severity: success ? 'Low' : 'High'
    });
  } catch (error) {
    console.error('Failed to log password change attempt:', error);
  }
}

export const POST = withErrorHandler(changePasswordHandler);