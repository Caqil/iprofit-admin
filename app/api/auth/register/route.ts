// app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Plan } from '@/models/Plan';
import { AuditLog } from '@/models/AuditLog';
import { hashPassword, generateSecureToken } from '@/lib/encryption';
import { sendEmail } from '@/lib/email';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import { emailValidator, phoneValidator, passwordValidator, nameValidator } from '@/utils/validators';
import mongoose from 'mongoose';

// Registration validation schema
const registrationSchema = z.object({
  name: nameValidator,
  email: emailValidator,
  phone: phoneValidator,
  password: passwordValidator,
  confirmPassword: z.string(),
  deviceId: z.string().min(1, 'Device ID is required'),
  planId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid plan ID').optional(),
  referralCode: z.string().optional(),
  dateOfBirth: z.string().optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    zipCode: z.string().optional()
  }).optional(),
  acceptTerms: z.boolean().refine(val => val === true, 'You must accept terms and conditions'),
  acceptPrivacy: z.boolean().refine(val => val === true, 'You must accept privacy policy')
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

async function registerHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  try {
    await connectToDatabase();

    const body = await request.json();
    const validationResult = registrationSchema.safeParse(body);

    if (!validationResult.success) {
      return apiHandler.validationError(
        validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      );
    }

    const {
      name,
      email,
      phone,
      password,
      deviceId,
      planId,
      referralCode,
      dateOfBirth,
      address
    } = validationResult.data;

    const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    // Check if email already exists
    const existingEmailUser = await User.findOne({
      email: email.toLowerCase()
    });

    if (existingEmailUser) {
      await logRegistrationAttempt(email, false, 'Email already registered', clientIP, userAgent);
      return apiHandler.conflict('Email address is already registered');
    }

    // Check if phone already exists
    const existingPhoneUser = await User.findOne({ phone });
    if (existingPhoneUser) {
      await logRegistrationAttempt(email, false, 'Phone already registered', clientIP, userAgent);
      return apiHandler.conflict('Phone number is already registered');
    }

    // Check if device ID already exists
    const existingDeviceUser = await User.findOne({ deviceId });
    if (existingDeviceUser) {
      await logRegistrationAttempt(email, false, 'Device already registered', clientIP, userAgent);
      return apiHandler.conflict('This device is already registered. Contact support if you need assistance.');
    }

    // Get plan (use provided planId or find default free plan)
    let userPlan;
    if (planId) {
      userPlan = await Plan.findById(planId);
      if (!userPlan) {
        return apiHandler.notFound('Plan not found');
      }
    } else {
      userPlan = await Plan.findOne({
        name: { $in: ['Free', 'Free Plan', 'Basic'] },
        isActive: { $ne: false }
      });
      
      if (!userPlan) {
        return apiHandler.internalError('Default plan not found');
      }
    }

    // Handle referral if provided
    let referrerUser: typeof User.prototype | null = null;
    if (referralCode) {
      referrerUser = await User.findOne({
        referralCode: referralCode.toUpperCase()
      });

      if (!referrerUser) {
        return apiHandler.badRequest('Invalid referral code');
      }
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Generate unique referral code
    const userReferralCode = await generateUniqueReferralCode();

    // Generate email verification token
    const emailVerificationToken = generateSecureToken(32);

    // Create new user
    const newUser = new User({
      name: name.trim(),
      email: email.toLowerCase(),
      phone,
      passwordHash,
      planId: userPlan._id,
      deviceId,
      referralCode: userReferralCode,
      referredBy: referrerUser?._id,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      address: address || undefined,
      balance: 0,
      status: 'Active',
      kycStatus: 'Pending',
      emailVerified: false,
      phoneVerified: false,
      loginAttempts: 0,
      emailVerificationToken,
      emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    });

    await newUser.save();

    // Create referral bonus if referred
    if (referrerUser) {
      const { Referral } = await import('@/models/Referral');
      await Referral.create({
        referrerId: referrerUser._id,
        refereeId: newUser._id,
        bonusAmount: 50, // Default signup bonus
        bonusType: 'signup',
        status: 'Pending'
      });
    }

    await logRegistrationAttempt(email, true, 'User registered successfully', clientIP, userAgent);

    // Send verification email
    try {
      const verificationUrl = `${process.env.NEXTAUTH_URL}/verify-email?token=${emailVerificationToken}&email=${encodeURIComponent(email)}`;
      
      await sendEmail({
        to: email,
        subject: 'Verify Your Email Address',
        templateId: 'email_verification',
        variables: {
          userName: name,
          verificationUrl,
          expiresIn: '24 hours',
          supportEmail: process.env.SUPPORT_EMAIL || 'support@iprofit.com'
        }
      });
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Don't fail registration if email fails
    }

    // Send welcome email
    try {
      await sendEmail({
        to: email,
        subject: 'Welcome to IProfit Platform',
        templateId: 'welcome',
        variables: {
          userName: name,
          planName: userPlan.name,
          referralCode: userReferralCode,
          loginUrl: `${process.env.NEXTAUTH_URL}/login`,
          supportEmail: process.env.SUPPORT_EMAIL || 'support@iprofit.com'
        }
      });
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
    }

    return apiHandler.created({
      user: {
        id: newUser._id.toString(),
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        emailVerified: newUser.emailVerified,
        phoneVerified: newUser.phoneVerified,
        kycStatus: newUser.kycStatus,
        referralCode: newUser.referralCode,
        planId: userPlan._id.toString()
      },
      message: 'Registration successful. Please check your email to verify your account.'
    });

  } catch (error) {
    console.error('Registration error:', error);
    return apiHandler.internalError('Registration failed');
  }
}

// Helper functions
async function generateUniqueReferralCode(): Promise<string> {
  let code: string;
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 10;

  while (!isUnique && attempts < maxAttempts) {
    code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const existingUser = await User.findOne({ referralCode: code });
    
    if (!existingUser) {
      isUnique = true;
      return code;
    }
    
    attempts++;
  }

  // Fallback: use timestamp-based code
  return `USER${Date.now().toString().slice(-6)}`;
}

async function logRegistrationAttempt(
  email: string,
  success: boolean,
  reason: string,
  ipAddress: string,
  userAgent: string
) {
  try {
    await AuditLog.create({
      adminId: null,
      action: 'USER_REGISTRATION',
      entity: 'User',
      entityId: email,
      status: success ? 'Success' : 'Failed',
      errorMessage: success ? null : reason,
      ipAddress,
      userAgent,
      severity: success ? 'Low' : 'Medium'
    });
  } catch (error) {
    console.error('Failed to log registration attempt:', error);
  }
}

export const POST = withErrorHandler(registerHandler);