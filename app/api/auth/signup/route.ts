// app/api/auth/signup/route.ts - Complete Fixed Version

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Plan } from '@/models/Plan';
import { AuditLog } from '@/models/AuditLog';
import { hashPassword } from '@/lib/encryption';
import { checkDeviceLimit } from '@/lib/device-detection';
import { generateReferralCode } from '@/utils/helpers';
import { sendEmail } from '@/lib/email';
import { withErrorHandler } from '@/middleware/error-handler';
import { authRateLimit } from '@/middleware/rate-limit';
import { ApiHandler } from '@/lib/api-helpers';
import { userRegistrationValidator } from '@/lib/validation';
import { BusinessRules, getSetting, getSettings } from '@/lib/settings-helper';

interface SignupRequest {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  deviceId: string;
  fingerprint: string;
  planId?: string;  // ✅ Added planId support
  referralCode?: string;
  dateOfBirth?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };
}

interface SignupResponse {
  success: boolean;
  user: {
    id: string;
    email: string;
    name: string;
    referralCode: string;
  };
  message: string;
}

async function signupHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Apply rate limiting
  const rateLimitResult = await authRateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  // Get client info
  const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                   request.headers.get('x-real-ip') || 
                   '127.0.0.1';
  const userAgent = request.headers.get('user-agent') || 'Unknown';

  try {
    await connectToDatabase();

    // Parse and validate request body
    const body = await request.json();
    const validationResult = userRegistrationValidator.safeParse(body);

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
      confirmPassword,
      deviceId, 
      fingerprint, 
      planId,  // ✅ Extract planId from validated data
      referralCode,
      dateOfBirth,
      address 
    } = validationResult.data as SignupRequest;

    // Get settings for signup process
    const [
      securityConfig,
      signupSettings,
      emailConfig,
      systemConfig
    ] = await Promise.all([
      BusinessRules.getSecurityConfig(),
      getSettings([
        'enable_device_limiting',
        'enable_referral_system',
        'signup_bonus',
        'default_plan_name',
        'auto_kyc_approval',
        'email_verification_required',
        'phone_verification_required',
        'max_referral_code_attempts'
      ]),
      BusinessRules.getEmailConfig(),
      BusinessRules.getSystemConfig()
    ]);

    // ✅ UPDATED PLAN LOGIC - Handle provided planId or get default
    let defaultPlan;
    if (planId) {
      // Use provided planId
      console.log('🔍 Using provided planId:', planId);
      defaultPlan = await Plan.findById(planId);
      if (!defaultPlan) {
        return apiHandler.badRequest(`Plan with ID '${planId}' not found.`);
      }
      if (!defaultPlan.isActive) {
        return apiHandler.badRequest(`Plan '${defaultPlan.name}' is not active.`);
      }
    } else {
      // Get default plan from settings
      console.log('🔍 No planId provided, using default plan from settings');
      const defaultPlanName = signupSettings.default_plan_name || 'Free';
      defaultPlan = await Plan.findOne({ 
        name: defaultPlanName,
        isActive: true 
      });
      
      if (!defaultPlan) {
        // Try to find any active plan as fallback
        defaultPlan = await Plan.findOne({ isActive: true });
        if (!defaultPlan) {
          return apiHandler.internalError('No active plans available. Please contact support.');
        }
        console.log(`🔍 Default plan '${defaultPlanName}' not found, using fallback plan: ${defaultPlan.name}`);
      }
    }

    console.log('✅ Selected plan:', { id: defaultPlan._id, name: defaultPlan.name });

    // Check if device limiting is enabled first
    const isDeviceLimitingEnabled = signupSettings.enable_device_limiting !== false;

    if (isDeviceLimitingEnabled) {
      console.log('Device limiting enabled, checking device limits...');
      const deviceCheck = await checkDeviceLimit(deviceId, fingerprint);
      if (!deviceCheck.isAllowed) {
        await logSignupAttempt(email, false, deviceCheck.reason || 'Device limit exceeded', clientIP, userAgent);
        return apiHandler.forbidden('Multiple accounts detected. Contact support.');
      }
    } else {
      console.log('Device limiting disabled in settings, skipping device check');
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { phone: phone },
        { deviceId: deviceId }
      ]
    });

    if (existingUser) {
      let reason = 'Account already exists';
      if (existingUser.email === email.toLowerCase()) reason = 'Email already registered';
      else if (existingUser.phone === phone) reason = 'Phone number already registered';
      else if (existingUser.deviceId === deviceId) reason = 'Device already registered';

      await logSignupAttempt(email, false, reason, clientIP, userAgent);
      return apiHandler.conflict(reason);
    }

    // Validate referral code if provided and referral system is enabled
    let referrerUser: any = null;
    if (referralCode && signupSettings.enable_referral_system !== false) {
      referrerUser = await User.findOne({ 
        referralCode: referralCode.toUpperCase(),
        status: 'Active' 
      });

      if (!referrerUser) {
        return apiHandler.badRequest('Invalid referral code');
      }
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Generate unique referral code
    let userReferralCode;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = signupSettings.max_referral_code_attempts || 5;

    while (!isUnique && attempts < maxAttempts) {
      userReferralCode = generateReferralCode();
      const existingCode = await User.findOne({ referralCode: userReferralCode });
      if (!existingCode) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      return apiHandler.internalError('Failed to generate unique referral code');
    }

    // Determine KYC and verification status from settings
    const kycStatus = signupSettings.auto_kyc_approval ? 'Approved' : 'Pending';
    const emailVerified = !signupSettings.email_verification_required;
    const phoneVerified = !signupSettings.phone_verification_required;

    // Create user
    const newUser = await User.create({
      name: name.trim(),
      email: email.toLowerCase(),
      phone: phone,
      passwordHash,
      planId: defaultPlan._id,
      deviceId,
      referralCode: userReferralCode,
      referredBy: referrerUser?._id,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      address,
      status: 'Active',
      kycStatus,
      emailVerified,
      phoneVerified
    });

    // Create referral bonus if referred and referral system is enabled
    if (referrerUser && signupSettings.enable_referral_system !== false) {
      const { Referral } = await import('@/models/Referral');
      const signupBonus = signupSettings.signup_bonus || 100;
      
      await Referral.create({
        referrerId: referrerUser._id,
        refereeId: newUser._id,
        bonusAmount: signupBonus,
        bonusType: 'signup',
        status: 'Pending'
      });
    }

    await logSignupAttempt(email, true, 'User created successfully', clientIP, userAgent);

    // Send welcome email if SMTP is configured
    if (emailConfig.smtpHost && emailConfig.smtpPort) {
      try {
        const supportEmail = await getSetting('support_email', 'support@example.com');
        const loginUrl = await getSetting('login_url', `${process.env.NEXTAUTH_URL}/login`);
        
        await sendEmail({
          to: newUser.email,
          subject: `Welcome to ${systemConfig.appName}`,
          templateId: 'welcome',
          variables: {
            userName: newUser.name,
            planName: defaultPlan.name,
            referralCode: newUser.referralCode,
            loginUrl,
            supportEmail,
            companyName: systemConfig.companyName,
            appName: systemConfig.appName
          }
        });
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
        // Don't fail signup if email fails
      }
    }

    // Prepare response message based on settings
    let message = 'Account created successfully.';
    if (kycStatus === 'Pending') {
      message += ' Please complete KYC verification to access all features.';
    }
    if (!emailVerified && signupSettings.email_verification_required) {
      message += ' Please verify your email address.';
    }
    if (!phoneVerified && signupSettings.phone_verification_required) {
      message += ' Please verify your phone number.';
    }

    const response: SignupResponse = {
      success: true,
      user: {
        id: newUser._id.toString(),
        email: newUser.email,
        name: newUser.name,
        referralCode: newUser.referralCode
      },
      message
    };

    return apiHandler.created(response);

  } catch (error) {
    console.error('Signup error:', error);
    return apiHandler.internalError('Account creation failed');
  }
}

async function logSignupAttempt(
  email: string,
  success: boolean,
  reason: string,
  ipAddress: string,
  userAgent: string
) {
  try {
    await AuditLog.create({
      adminId: null,
      action: 'SIGNUP_ATTEMPT',
      entity: 'user',
      entityId: email,
      status: success ? 'Success' : 'Failed',
      errorMessage: success ? null : reason,
      ipAddress,
      userAgent,
      severity: success ? 'Low' : 'Medium'
    });
  } catch (error) {
    console.error('Failed to log signup attempt:', error);
  }
}

export const POST = withErrorHandler(signupHandler);