// app/api/auth/verify-phone/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { AuditLog } from '@/models/AuditLog';
import { sendEmail } from '@/lib/email';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import { phoneValidator } from '@/utils/validators';

// Phone verification validation schema
const verifyPhoneSchema = z.object({
  phone: phoneValidator,
  code: z.string().min(4, 'Verification code must be at least 4 digits').max(8, 'Verification code too long'),
  deviceId: z.string().min(1, 'Device ID is required')
});

// Send phone verification code schema
const sendPhoneCodeSchema = z.object({
  phone: phoneValidator,
  deviceId: z.string().min(1, 'Device ID is required')
});

async function verifyPhoneHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  try {
    await connectToDatabase();

    const body = await request.json();
    const method = request.method;

    if (method === 'POST') {
      return await handleVerifyPhone(body, apiHandler, request);
    } else if (method === 'PUT') {
      return await handleSendPhoneCode(body, apiHandler, request);
    }

    return apiHandler.badRequest('Method not allowed');

  } catch (error) {
    console.error('Phone verification error:', error);
    return apiHandler.internalError('Phone verification failed');
  }
}

// Handle phone verification
async function handleVerifyPhone(body: any, apiHandler: any, request: NextRequest) {
  const validationResult = verifyPhoneSchema.safeParse(body);

  if (!validationResult.success) {
    return apiHandler.validationError(
      validationResult.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code
      }))
    );
  }

  const { phone, code, deviceId } = validationResult.data;
  const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
  const userAgent = request.headers.get('user-agent') || 'Unknown';

  // Find user with matching phone and valid verification code
  const user = await User.findOne({
    phone,
    phoneVerificationCode: code,
    phoneVerificationExpires: { $gt: new Date() },
    status: 'Active'
  });

  if (!user) {
    await logPhoneVerificationAttempt(phone, false, 'Invalid or expired code', clientIP, userAgent);
    return apiHandler.unauthorized('Invalid or expired verification code');
  }

  // Check if phone is already verified
  if (user.phoneVerified) {
    await logPhoneVerificationAttempt(phone, true, 'Phone already verified', clientIP, userAgent);
    return apiHandler.success({
      message: 'Phone number is already verified'
    });
  }

  // Check verification attempts
  const maxAttempts = 5;
  if (user.phoneVerificationAttempts >= maxAttempts) {
    await logPhoneVerificationAttempt(phone, false, 'Too many verification attempts', clientIP, userAgent);
    
    // Clear verification code after too many attempts
    await User.findByIdAndUpdate(user._id, {
      phoneVerificationCode: undefined,
      phoneVerificationExpires: undefined,
      phoneVerificationAttempts: 0
    });
    
    return apiHandler.tooManyRequests('Too many verification attempts. Please request a new verification code.');
  }

  // Mark phone as verified and clear verification fields
  await User.findByIdAndUpdate(user._id, {
    phoneVerified: true,
    phoneVerificationCode: undefined,
    phoneVerificationExpires: undefined,
    phoneVerificationAttempts: 0,
    phoneVerifiedAt: new Date(),
    deviceId // Update device ID
  });

  await logPhoneVerificationAttempt(phone, true, 'Phone verified successfully', clientIP, userAgent);

  // Send confirmation email
  try {
    await sendEmail({
      to: user.email,
      subject: 'Phone Number Verified',
      templateId: 'phone_verified',
      variables: {
        userName: user.name,
        phoneNumber: phone,
        verificationDate: new Date().toLocaleDateString(),
        loginUrl: `${process.env.NEXTAUTH_URL}/login`,
        supportEmail: process.env.SUPPORT_EMAIL || 'support@iprofit.com'
      }
    });
  } catch (emailError) {
    console.error('Failed to send phone verification confirmation email:', emailError);
  }

  return apiHandler.success({
    message: 'Phone number verified successfully!',
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone,
      emailVerified: user.emailVerified,
      phoneVerified: true,
      kycStatus: user.kycStatus
    }
  });
}

// Handle sending phone verification code
async function handleSendPhoneCode(body: any, apiHandler: any, request: NextRequest) {
  const validationResult = sendPhoneCodeSchema.safeParse(body);

  if (!validationResult.success) {
    return apiHandler.validationError(
      validationResult.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code
      }))
    );
  }

  const { phone, deviceId } = validationResult.data;
  const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
  const userAgent = request.headers.get('user-agent') || 'Unknown';

  // Find user by phone
  const user = await User.findOne({
    phone,
    status: 'Active'
  });

  if (!user) {
    await logPhoneVerificationAttempt(phone, false, 'User not found', clientIP, userAgent);
    // Return success to prevent phone enumeration
    return apiHandler.success({
      message: 'If this phone number is registered, a verification code has been sent.'
    });
  }

  // Check if phone is already verified
  if (user.phoneVerified) {
    return apiHandler.success({
      message: 'Phone number is already verified'
    });
  }

  // Rate limiting: Check recent code requests
  const recentCodeTime = new Date(Date.now() - 2 * 60 * 1000); // 2 minutes ago
  if (user.phoneCodeRequestedAt && user.phoneCodeRequestedAt > recentCodeTime) {
    return apiHandler.tooManyRequests('Verification code was recently sent. Please wait 2 minutes before requesting again.');
  }

  // Generate 6-digit verification code
  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
  const codeExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Update user with verification code
  await User.findByIdAndUpdate(user._id, {
    phoneVerificationCode: verificationCode,
    phoneVerificationExpires: codeExpires,
    phoneCodeRequestedAt: new Date(),
    phoneVerificationAttempts: 0,
    deviceId
  });

  // Send SMS (implement your SMS provider here)
  try {
    await sendSMSVerificationCode(phone, verificationCode, user.name);
    await logPhoneVerificationAttempt(phone, true, 'Verification code sent', clientIP, userAgent);
  } catch (smsError) {
    console.error('Failed to send SMS verification code:', smsError);
    // For now, we'll log the code for testing purposes
    console.log(`📱 SMS Code for ${phone}: ${verificationCode}`);
  }

  return apiHandler.success({
    message: 'Verification code sent to your phone number',
    expiresIn: '10 minutes'
  });
}

// Placeholder SMS function - implement with your SMS provider (Twilio, AWS SNS, etc.)
async function sendSMSVerificationCode(phone: string, code: string, userName: string): Promise<void> {
  // TODO: Implement SMS sending with your preferred provider
  // Example with Twilio:
  /*
  const twilio = require('twilio');
  const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
  
  await client.messages.create({
    body: `Hi ${userName}, your verification code is: ${code}. Valid for 10 minutes.`,
    from: process.env.TWILIO_PHONE,
    to: phone
  });
  */
  
  console.log(`📱 Would send SMS to ${phone}: Your verification code is ${code}`);
}

async function logPhoneVerificationAttempt(
  phone: string,
  success: boolean,
  reason: string,
  ipAddress: string,
  userAgent: string
) {
  try {
    await AuditLog.create({
      adminId: null,
      action: 'PHONE_VERIFICATION',
      entity: 'User',
      entityId: phone,
      status: success ? 'Success' : 'Failed',
      errorMessage: success ? null : reason,
      ipAddress,
      userAgent,
      severity: success ? 'Low' : 'Medium'
    });
  } catch (error) {
    console.error('Failed to log phone verification attempt:', error);
  }
}

export const POST = withErrorHandler(verifyPhoneHandler);
export const PUT = withErrorHandler(verifyPhoneHandler);