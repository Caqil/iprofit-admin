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
  console.log('🚀 Registration handler started');
  console.log('📝 Request method:', request.method);
  console.log('🔗 Request URL:', request.url);
  
  // Create a fallback response function to ensure we always return JSON
  const createErrorResponse = (message: string, status: number = 500) => {
    console.error('❌ Creating error response:', message, 'Status:', status);
    return NextResponse.json(
      { 
        success: false, 
        error: message,
        timestamp: new Date().toISOString()
      },
      { status }
    );
  };

  try {
    console.log('🔧 Creating API handler...');
    const apiHandler = ApiHandler.create(request);
    console.log('✅ API handler created successfully');

    console.log('🔌 Connecting to database...');
    await connectToDatabase();
    console.log('✅ Database connected successfully');

    console.log('📋 Parsing request body...');
    let body;
    try {
      body = await request.json();
      console.log('✅ Request body parsed successfully');
      console.log('📊 Body keys:', Object.keys(body));
    } catch (jsonError) {
      console.error('❌ JSON parsing failed:', jsonError);
      return createErrorResponse('Invalid JSON in request body', 400);
    }

    console.log('🔍 Validating request data...');
    const validationResult = registrationSchema.safeParse(body);

    if (!validationResult.success) {
      console.error('❌ Validation failed:', validationResult.error.errors);
      const errors = validationResult.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code
      }));
      
      // Use direct NextResponse instead of apiHandler for validation errors
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          errors
        },
        { status: 400 }
      );
    }

    console.log('✅ Validation passed');

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

    console.log('🔍 Checking for existing email:', email);
    // Check if email already exists
    const existingEmailUser = await User.findOne({
      email: email.toLowerCase()
    });

    if (existingEmailUser) {
      console.log('❌ Email already exists');
      await logRegistrationAttempt(email, false, 'Email already registered', clientIP, userAgent);
      return createErrorResponse('Email address is already registered', 409);
    }

    console.log('🔍 Checking for existing phone:', phone);
    // Check if phone already exists
    const existingPhoneUser = await User.findOne({ phone });
    if (existingPhoneUser) {
      console.log('❌ Phone already exists');
      await logRegistrationAttempt(email, false, 'Phone already registered', clientIP, userAgent);
      return createErrorResponse('Phone number is already registered', 409);
    }

    console.log('🔍 Checking for existing device:', deviceId);
    // Check if device ID already exists
    const existingDeviceUser = await User.findOne({ deviceId });
    if (existingDeviceUser) {
      console.log('❌ Device already exists');
      await logRegistrationAttempt(email, false, 'Device already registered', clientIP, userAgent);
      return createErrorResponse('This device is already registered. Contact support if you need assistance.', 409);
    }

    console.log('📋 Finding user plan...');
    // Get plan (use provided planId or find default free plan)
    let userPlan;
    if (planId) {
      userPlan = await Plan.findById(planId);
      if (!userPlan) {
        console.log('❌ Plan not found');
        return createErrorResponse('Plan not found', 404);
      }
    } else {
      userPlan = await Plan.findOne({
        name: { $in: ['Free', 'Free Plan', 'Basic'] },
        isActive: { $ne: false }
      });
      
      if (!userPlan) {
        console.log('❌ Default plan not found');
        return createErrorResponse('Default plan not found', 500);
      }
    }
    console.log('✅ Plan found:', userPlan.name);

    console.log('🔍 Checking referral code...');
    // Handle referral if provided
    let referrerUser: typeof User.prototype | null = null;
    if (referralCode) {
      referrerUser = await User.findOne({
        referralCode: referralCode.toUpperCase()
      });

      if (!referrerUser) {
        console.log('❌ Invalid referral code');
        return createErrorResponse('Invalid referral code', 400);
      }
      console.log('✅ Valid referral code');
    }

    console.log('🔐 Hashing password...');
    // Hash password
    const passwordHash = await hashPassword(password);
    console.log('✅ Password hashed');

    console.log('🎲 Generating referral code...');
    // Generate unique referral code
    const userReferralCode = await generateUniqueReferralCode();
    console.log('✅ Referral code generated:', userReferralCode);

    console.log('🔑 Generating email verification token...');
    // Generate email verification token
    const emailVerificationToken = generateSecureToken(32);
    console.log('✅ Email verification token generated');

    console.log('👤 Creating new user...');
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
    console.log('✅ User saved to database');

    console.log('🎁 Processing referral bonus...');
    // Create referral bonus if referred
    if (referrerUser) {
      try {
        const { Referral } = await import('@/models/Referral');
        await Referral.create({
          referrerId: referrerUser._id,
          refereeId: newUser._id,
          bonusAmount: 50, // Default signup bonus
          bonusType: 'signup',
          status: 'Pending'
        });
        console.log('✅ Referral bonus created');
      } catch (referralError) {
        console.error('❌ Failed to create referral bonus:', referralError);
        // Don't fail registration for referral errors
      }
    }

    await logRegistrationAttempt(email, true, 'User registered successfully', clientIP, userAgent);

    console.log('📧 Sending verification email...');
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
      console.log('✅ Verification email sent');
    } catch (emailError) {
      console.error('❌ Failed to send verification email:', emailError);
      // Don't fail registration if email fails
    }

    console.log('📧 Sending welcome email...');
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
      console.log('✅ Welcome email sent');
    } catch (emailError) {
      console.error('❌ Failed to send welcome email:', emailError);
    }

    console.log('🎉 Registration completed successfully');

    // Return success response directly with NextResponse
    return NextResponse.json(
      {
        success: true,
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
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('💥 Registration handler error:', error);
    console.error('📍 Error stack:', error);
    
    // Always return a JSON response, even for unexpected errors
    return NextResponse.json(
      { 
        success: false, 
        error: 'Registration failed',
        details: process.env.NODE_ENV === 'development' ? error : 'Internal server error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
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

// Option 1: Export without withErrorHandler to test
export const POST = registerHandler;

//export const POST = withErrorHandler(registerHandler);