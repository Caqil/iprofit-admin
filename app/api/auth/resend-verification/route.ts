// app/api/auth/resend-verification/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { AuditLog } from '@/models/AuditLog';
import { generateSecureToken } from '@/lib/encryption';
import { sendEmail } from '@/lib/email';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import { emailValidator, phoneValidator } from '@/utils/validators';

// Resend verification validation schema
const resendVerificationSchema = z.object({
  type: z.enum(['email', 'phone'], { required_error: 'Verification type is required' }),
  email: emailValidator.optional(),
  phone: phoneValidator.optional(),
  deviceId: z.string().min(1, 'Device ID is required')
}).refine(data => {
  if (data.type === 'email' && !data.email) {
    return false;
  }
  if (data.type === 'phone' && !data.phone) {
    return false;
  }
  return true;
}, {
  message: 'Email is required for email verification, phone is required for phone verification'
});

async function resendVerificationHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  try {
    await connectToDatabase();

    const body = await request.json();
    const validationResult = resendVerificationSchema.safeParse(body);

    if (!validationResult.success) {
      return apiHandler.validationError(
        validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      );
    }

    const { type, email, phone, deviceId } = validationResult.data;
    const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    if (type === 'email') {
      return await handleResendEmailVerification(email!, deviceId, apiHandler, clientIP, userAgent);
    } else {
      return await handleResendPhoneVerification(phone!, deviceId, apiHandler, clientIP, userAgent);
    }

  } catch (error) {
    console.error('Resend verification error:', error);
    return apiHandler.internalError('Failed to resend verification');
  }
}

// Handle resending email verification
async function handleResendEmailVerification(
  email: string,
  deviceId: string,
  apiHandler: any,
  clientIP: string,
  userAgent: string
) {
  // Find user by email
  const user = await User.findOne({
    email: email.toLowerCase(),
    status: 'Active'
  });

  // Always return success message for security (don't reveal if email exists)
  const successMessage = 'If an account with this email exists and is not verified, a new verification email has been sent.';

  if (!user) {
    await logResendAttempt(email, 'email', false, 'User not found', clientIP, userAgent);
    return apiHandler.success({ message: successMessage });
  }

  // Check if email is already verified
  if (user.emailVerified) {
    await logResendAttempt(email, 'email', true, 'Email already verified', clientIP, userAgent);
    return apiHandler.success({ message: 'Email address is already verified' });
  }

  // Rate limiting: Check recent verification requests
  const recentVerificationTime = new Date(Date.now() - 2 * 60 * 1000); // 2 minutes ago
  if (user.emailVerificationRequestedAt && user.emailVerificationRequestedAt > recentVerificationTime) {
    await logResendAttempt(email, 'email', false, 'Rate limited', clientIP, userAgent);
    return apiHandler.tooManyRequests('Verification email was recently sent. Please wait 2 minutes before requesting again.');
  }

  // Generate new verification token
  const verificationToken = generateSecureToken(32);
  const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // Update user with new verification token
  await User.findByIdAndUpdate(user._id, {
    emailVerificationToken: verificationToken,
    emailVerificationExpires: tokenExpires,
    emailVerificationRequestedAt: new Date(),
    emailVerificationAttempts: 0,
    deviceId
  });

  await logResendAttempt(email, 'email', true, 'Verification email resent', clientIP, userAgent);

  // Send verification email
  try {
    const verificationUrl = `${process.env.NEXTAUTH_URL}/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`;
    
    await sendEmail({
      to: email,
      subject: 'Verify Your Email Address',
      templateId: 'email_verification',
      variables: {
        userName: user.name,
        verificationUrl,
        expiresIn: '24 hours',
        supportEmail: process.env.SUPPORT_EMAIL || 'support@iprofit.com'
      }
    });
  } catch (emailError) {
    console.error('Failed to send verification email:', emailError);
    return apiHandler.internalError('Failed to send verification email');
  }

  return apiHandler.success({ message: successMessage });
}

// Handle resending phone verification
async function handleResendPhoneVerification(
  phone: string,
  deviceId: string,
  apiHandler: any,
  clientIP: string,
  userAgent: string
) {
  // Find user by phone
  const user = await User.findOne({
    phone,
    status: 'Active'
  });

  // Always return success message for security (don't reveal if phone exists)
  const successMessage = 'If this phone number is registered and not verified, a new verification code has been sent.';

  if (!user) {
    await logResendAttempt(phone, 'phone', false, 'User not found', clientIP, userAgent);
    return apiHandler.success({ message: successMessage });
  }

  // Check if phone is already verified
  if (user.phoneVerified) {
    await logResendAttempt(phone, 'phone', true, 'Phone already verified', clientIP, userAgent);
    return apiHandler.success({ message: 'Phone number is already verified' });
  }

  // Rate limiting: Check recent code requests
  const recentCodeTime = new Date(Date.now() - 2 * 60 * 1000); // 2 minutes ago
  if (user.phoneCodeRequestedAt && user.phoneCodeRequestedAt > recentCodeTime) {
    await logResendAttempt(phone, 'phone', false, 'Rate limited', clientIP, userAgent);
    return apiHandler.tooManyRequests('Verification code was recently sent. Please wait 2 minutes before requesting again.');
  }

  // Generate new 6-digit verification code
  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
  const codeExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Update user with new verification code
  await User.findByIdAndUpdate(user._id, {
    phoneVerificationCode: verificationCode,
    phoneVerificationExpires: codeExpires,
    phoneCodeRequestedAt: new Date(),
    phoneVerificationAttempts: 0,
    deviceId
  });

  await logResendAttempt(phone, 'phone', true, 'Verification code resent', clientIP, userAgent);

  // Send SMS (implement your SMS provider here)
  try {
    await sendSMSVerificationCode(phone, verificationCode, user.name);
  } catch (smsError) {
    console.error('Failed to send SMS verification code:', smsError);
    // For now, we'll log the code for testing purposes
    console.log(`📱 SMS Code for ${phone}: ${verificationCode}`);
  }

  return apiHandler.success({
    message: successMessage,
    expiresIn: '10 minutes'
  });
}

// Placeholder SMS function - implement with your SMS provider
async function sendSMSVerificationCode(phone: string, code: string, userName: string): Promise<void> {
  // TODO: Implement SMS sending with your preferred provider
  console.log(`📱 Would send SMS to ${phone}: Hi ${userName}, your verification code is ${code}. Valid for 10 minutes.`);
}

async function logResendAttempt(
  identifier: string,
  type: string,
  success: boolean,
  reason: string,
  ipAddress: string,
  userAgent: string
) {
  try {
    await AuditLog.create({
      adminId: null,
      action: `RESEND_${type.toUpperCase()}_VERIFICATION`,
      entity: 'User',
      entityId: identifier,
      status: success ? 'Success' : 'Failed',
      errorMessage: success ? null : reason,
      ipAddress,
      userAgent,
      severity: success ? 'Low' : 'Medium'
    });
  } catch (error) {
    console.error('Failed to log resend attempt:', error);
  }
}

export const POST = withErrorHandler(resendVerificationHandler);