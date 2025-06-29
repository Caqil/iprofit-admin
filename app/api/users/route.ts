// app/api/users/route.ts - Fixed to use existing validation schemas

import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Plan } from '@/models/Plan';
import { Referral } from '@/models/Referral';
import { AuditLog } from '@/models/AuditLog';
import { authMiddleware } from '@/middleware/auth';
import { apiRateLimit } from '@/middleware/rate-limit';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler, createPaginatedResponse, createPaginationStages } from '@/lib/api-helpers';
import { sendEmail } from '@/lib/email';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

// ✅ USE EXISTING SCHEMAS FROM lib/validation.ts
import { 
  adminUserCreateSchema,     // For admin user creation
  urlPaginationSchema, 
  userCreateExtendedSchema,
  userListQuerySchema
} from '@/lib/validation';

// Utility function to generate unique referral code
async function generateUniqueReferralCode(): Promise<string> {
  let referralCode: string;
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 10;

  while (!isUnique && attempts < maxAttempts) {
    referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const existing = await User.findOne({ referralCode });
    if (!existing) {
      isUnique = true;
    }
    attempts++;
  }

  if (!isUnique) {
    throw new Error('Failed to generate unique referral code');
  }

  return referralCode!;
}

// Utility function to generate secure password
function generateSecurePassword(): string {
  const length = 12;
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  
  // Ensure at least one of each required character type
  password += "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 26)]; // uppercase
  password += "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)]; // lowercase
  password += "0123456789"[Math.floor(Math.random() * 10)]; // number
  password += "!@#$%^&*"[Math.floor(Math.random() * 8)]; // special
  
  // Fill the rest randomly
  for (let i = 4; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

// POST /api/users - Create a new user (Admin only)
async function createUserHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Apply middleware
  const authResult = await authMiddleware(request, {
    requireAuth: true,
    allowedUserTypes: ['admin'],
    requiredPermission: 'users.create'
  });
  if (authResult) return authResult;

  const rateLimitResult = await apiRateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    await connectToDatabase();

    const adminId = request.headers.get('x-user-id');
    const body = await request.json();
    
    // Determine which schema to use based on the request
    let validationResult;
    
    if (body.isAdminCreated === true || body.isAdminCreated === undefined) {
      // Use adminUserCreateSchema for admin-created users
      validationResult = adminUserCreateSchema.safeParse({
        ...body,
        isAdminCreated: true // Ensure this is set
      });
    } else {
      // Use userCreateExtendedSchema for the discriminated union
      validationResult = userCreateExtendedSchema.safeParse(body);
    }

    if (!validationResult.success) {
      return apiHandler.validationError(
        validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      );
    }

    // Extract fields from validated data
    const {
      name,
      email,
      phone,
      planId,
      deviceId,
      referralCode,
      isAdminCreated = true,
      generatePassword = true,
      initialBalance = 0,
      address,
      dateOfBirth,
      password
    } = validationResult.data;

    // Check for existing user by email or phone
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { phone }]
    });

    if (existingUser) {
      return apiHandler.conflict(
        existingUser.email === email.toLowerCase() 
          ? 'Email already registered' 
          : 'Phone number already registered'
      );
    }

    // Check for existing device ID (required field, must be unique)
    const existingDeviceUser = await User.findOne({ deviceId });
    if (existingDeviceUser) {
      return apiHandler.conflict('Device ID already registered');
    }

    // Handle device limitation for user registration
    if (!isAdminCreated) {
      const fingerprint = 'fingerprint' in validationResult.data ? validationResult.data.fingerprint : undefined;
      
      if (fingerprint) {
        const existingFingerprintUser = await User.findOne({ 
          $or: [{ deviceId }, { fingerprint }]
        });

        if (existingFingerprintUser) {
          return apiHandler.forbidden(
            'A user account already exists on this device. Please contact support if you need assistance.'
          );
        }
      }
    }

    // Get or validate plan
    let userPlan;
    if (planId) {
      userPlan = await Plan.findById(planId);
      if (!userPlan) {
        return apiHandler.notFound('Plan not found');
      }
    } else {
      // Find default free plan
      userPlan = await Plan.findOne({ 
        name: { $in: ['Free', 'Free Plan'] },
        isActive: { $ne: false }
      });
      
      if (!userPlan) {
        return apiHandler.internalError('Default plan not found');
      }
    }

    // Handle referral if provided
    let referrerUser: (typeof User.prototype) | null = null;
    const referredBy = 'referredBy' in validationResult.data ? validationResult.data.referredBy : undefined;
    
    if (referredBy) {
      referrerUser = await User.findOne({
        $or: [
          { referralCode: referredBy },
          { _id: mongoose.Types.ObjectId.isValid(referredBy) ? referredBy : null }
        ]
      });

      if (!referrerUser) {
        return apiHandler.badRequest('Invalid referral code');
      }
    }

    // Generate or validate password
    let finalPassword = password;
    if (isAdminCreated && generatePassword && !password) {
      finalPassword = generateSecurePassword();
    }

    if (!finalPassword) {
      return apiHandler.badRequest('Password is required');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(finalPassword, 12);

    // Generate unique referral code if not provided
    const userReferralCode = referralCode || await generateUniqueReferralCode();

    // Create new user with ALL required fields
    const newUser = new User({
      name: name.trim(),
      email: email.toLowerCase(),
      phone,
      password: hashedPassword,        // ✅ Required field
      planId: userPlan._id,           // ✅ Required field 
      deviceId,                       // ✅ Required field from validation
      referralCode: userReferralCode, // ✅ Required field
      referredBy: referrerUser?.id,  // ✅ Optional referrer
      balance: initialBalance,        // ✅ Initial balance
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      address,                        // ✅ Optional address
      status: 'Active',              // ✅ Required field
      kycStatus: 'Pending',          // ✅ Required field
      emailVerified: isAdminCreated, // ✅ Auto-verify for admin created
      phoneVerified: false,          // ✅ Default phone verification
      twoFactorEnabled: false,       // ✅ Default 2FA
      loginAttempts: 0,              // ✅ Default login attempts
      // Add fingerprint only for user registrations
      ...('fingerprint' in validationResult.data && { 
        fingerprint: validationResult.data.fingerprint 
      })
    });

    // Save the user
    await newUser.save();

    // Create referral bonus if user was referred
    if (referrerUser) {
      await Referral.create({
        referrerId: referrerUser._id,
        refereeId: newUser._id,
        bonusAmount: 100, // 100 BDT signup bonus
        bonusType: 'signup',
        status: 'Pending',
        createdAt: new Date()
      });
    }

    // Log audit trail
    await AuditLog.create({
      adminId: isAdminCreated ? adminId : null,
      action: 'users.create',
      entity: 'User',
      entityId: newUser._id.toString(),
      status: 'Success',
      metadata: {
        userName: newUser.name,
        userEmail: newUser.email,
        planId: userPlan._id,
        deviceId: deviceId,
        initialBalance: initialBalance,
        hasReferrer: !!referrerUser,
        hasAddress: !!address,
        creationType: isAdminCreated ? 'admin' : 'registration'
      },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    // Send welcome email
    if (process.env.SEND_WELCOME_EMAIL !== 'false') {
      try {
        await sendEmail({
          to: newUser.email,
          subject: 'Welcome to Our Platform',
          templateId: 'welcome',
          variables: {
            name: newUser.name,
            email: newUser.email,
            password: isAdminCreated && generatePassword ? finalPassword : undefined,
            referralCode: newUser.referralCode,
            loginUrl: `${process.env.NEXTAUTH_URL}/login`
          }
        });
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
        // Don't fail the request for email errors
      }
    }

    // Return success response
    return apiHandler.created({
      user: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        planId: newUser.planId,
        deviceId: newUser.deviceId,
        referralCode: newUser.referralCode,
        balance: newUser.balance,
        status: newUser.status,
        kycStatus: newUser.kycStatus,
        emailVerified: newUser.emailVerified,
        phoneVerified: newUser.phoneVerified,
        twoFactorEnabled: newUser.twoFactorEnabled,
        createdAt: newUser.createdAt,
        // Include generated password only for admin-created users
        ...(isAdminCreated && generatePassword && { temporaryPassword: finalPassword })
      }
    });

  } catch (error) {
    console.error('Create user error:', error);
    return apiHandler.internalError('Failed to create user');
  }
}

// GET /api/users - List users with filtering and pagination
async function getUsersHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Apply middleware
  const authResult = await authMiddleware(request, {
    requireAuth: true,
    allowedUserTypes: ['admin'],
    requiredPermission: 'users.create'
  });
  if (authResult) return authResult;

  try {
    await connectToDatabase();

    const url = new URL(request.url);
    const searchParams = Object.fromEntries(url.searchParams.entries());
    
    const validationResult = userListQuerySchema.safeParse(searchParams);
    
    if (!validationResult.success) {
      return apiHandler.validationError(
        validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      );
    }

    const { page, limit, sortBy = 'createdAt', sortOrder = 'desc' } = validationResult.data;

    // Build filter
    const filter: any = {};
    if (searchParams.search) {
      filter.$or = [
        { name: { $regex: searchParams.search, $options: 'i' } },
        { email: { $regex: searchParams.search, $options: 'i' } },
        { phone: { $regex: searchParams.search, $options: 'i' } }
      ];
    }

    // Get total count
    const total = await User.countDocuments(filter);

    // Get users with pagination
    const users = await User.find(filter)
      .select('-password') // Exclude password field
      .populate('planId', 'name price features')
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const paginatedResponse = createPaginatedResponse(users, total, page, limit);

    return apiHandler.success(paginatedResponse);

  } catch (error) {
    console.error('Get users error:', error);
    return apiHandler.internalError('Failed to fetch users');
  }
}

// Export handlers wrapped with error handling
export const GET = withErrorHandler(getUsersHandler);
export const POST = withErrorHandler(createUserHandler);