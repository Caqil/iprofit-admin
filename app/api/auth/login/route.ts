import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Admin } from '@/models/Admin';
import { User } from '@/models/User';
import { AuditLog } from '@/models/AuditLog';
import { verifyPassword } from '@/lib/encryption';
import { checkDeviceLimit } from '@/lib/device-detection';
import { generateSecureToken } from '@/lib/encryption';
import { withErrorHandler } from '@/middleware/error-handler';
import { authRateLimit } from '@/middleware/rate-limit';
import { ApiHandler } from '@/lib/api-helpers';
import speakeasy from 'speakeasy';
import jwt from 'jsonwebtoken';
import { env } from '@/config/env';
import { loginSchema } from '@/lib/validation';
import { BusinessRules } from '@/lib/settings-helper';

interface LoginResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    userType: string;
    role?: string;
    permissions?: string[];
  };
  tokens?: {
    accessToken: string;
    refreshToken?: string;
    expiresIn: number;
  };
  requiresTwoFactor?: boolean;
  message?: string;
}

async function loginHandler(request: NextRequest): Promise<NextResponse> {
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
    const validationResult = loginSchema.safeParse(body);

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
      email, 
      password, 
      userType, 
      twoFactorToken, 
      rememberMe = false,
      deviceId,
      fingerprint 
    } = validationResult.data;

    // Get existing security configuration
    const securityConfig = await BusinessRules.getSecurityConfig();

    // Handle admin login
    if (userType === 'admin') {
      const admin = await Admin.findOne({ 
        email: email.toLowerCase(),
        isActive: true 
      });

      if (!admin) {
        await logAuthAttempt(email, userType, false, 'Admin not found', clientIP, userAgent);
        return apiHandler.unauthorized('Invalid credentials');
      }

      // Verify password
      const isValidPassword = await verifyPassword(password, admin.passwordHash);
      if (!isValidPassword) {
        await logAuthAttempt(email, userType, false, 'Invalid password', clientIP, userAgent);
        return apiHandler.unauthorized('Invalid credentials');
      }

      // Check 2FA if enabled for this admin
      if (admin.twoFactorEnabled) {
        if (!twoFactorToken) {
          return NextResponse.json({
            success: true,
            requiresTwoFactor: true,
            message: '2FA token required'
          });
        }

        const isValid2FA = speakeasy.totp.verify({
          secret: admin.twoFactorSecret!,
          encoding: 'base32',
          token: twoFactorToken,
          window: 2
        });

        if (!isValid2FA) {
          await logAuthAttempt(email, userType, false, 'Invalid 2FA token', clientIP, userAgent);
          return apiHandler.unauthorized('Invalid 2FA token');
        }
      }

      // Update last login
      await Admin.findByIdAndUpdate(admin._id, { lastLogin: new Date() });
      await logAuthAttempt(email, userType, true, 'Successful login', clientIP, userAgent);

      // Generate tokens
      const accessToken = generateAccessToken({
        id: admin._id.toString(),
        email: admin.email,
        userType: 'admin',
        role: admin.role,
        permissions: admin.permissions
      });

      const refreshToken = rememberMe ? generateRefreshToken(admin._id.toString()) : undefined;

      const response: LoginResponse = {
        success: true,
        user: {
          id: admin._id.toString(),
          email: admin.email,
          name: admin.name,
          userType: 'admin',
          role: admin.role,
          permissions: admin.permissions
        },
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: 3600 // 1 hour
        }
      };

      return apiHandler.success(response);
    }

    // Handle user login
    if (userType === 'user') {
      // Device info is required for user login
      if (!deviceId || !fingerprint) {
        return apiHandler.badRequest('Device identification required', {
          required: ['deviceId', 'fingerprint']
        });
      }

      // Check device limit using existing settings
      const deviceCheck = await checkDeviceLimit(deviceId, fingerprint);
      if (!deviceCheck.isAllowed) {
        await logAuthAttempt(email, userType, false, deviceCheck.reason || 'Device limit exceeded', clientIP, userAgent);
        return apiHandler.forbidden('Multiple accounts detected. Contact support.');
      }

      const user = await User.findOne({ 
        email: email.toLowerCase(),
        status: 'Active'
      }).populate('planId');

      if (!user) {
        await logAuthAttempt(email, userType, false, 'User not found', clientIP, userAgent);
        return apiHandler.unauthorized('Invalid credentials');
      }

      // For OAuth users, password might not be set
      if (password && user.passwordHash) {
        const isValidPassword = await verifyPassword(password, user.passwordHash);
        if (!isValidPassword) {
          await logAuthAttempt(email, userType, false, 'Invalid password', clientIP, userAgent);
          return apiHandler.unauthorized('Invalid credentials');
        }
      }

      // Update device info and last login
      await User.findByIdAndUpdate(user._id, { 
        deviceId,
        lastLogin: new Date() 
      });

      await logAuthAttempt(email, userType, true, 'Successful login', clientIP, userAgent);

      // Generate tokens for OAuth 2.0 flow
      const accessToken = generateAccessToken({
        id: user._id.toString(),
        email: user.email,
        userType: 'user',
        planId: user.planId._id?.toString(),
        kycStatus: user.kycStatus
      });

      const refreshToken = generateRefreshToken(user._id.toString());

      const response: LoginResponse = {
        success: true,
        user: {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          userType: 'user'
        },
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: 3600 // 1 hour
        }
      };

      return apiHandler.success(response);
    }

    return apiHandler.badRequest('Invalid user type');

  } catch (error) {
    console.error('Login error:', error);
    return apiHandler.internalError('Login failed');
  }
}

// Helper functions
async function logAuthAttempt(
  email: string,
  userType: string,
  success: boolean,
  reason: string,
  ipAddress: string,
  userAgent: string
) {
  try {
    await AuditLog.create({
      adminId: null,
      action: 'LOGIN_ATTEMPT',
      entity: userType,
      entityId: email,
      status: success ? 'Success' : 'Failed',
      errorMessage: success ? null : reason,
      ipAddress,
      userAgent,
      severity: success ? 'Low' : 'Medium'
    });
  } catch (error) {
    console.error('Failed to log auth attempt:', error);
  }
}

function generateAccessToken(payload: any): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: '1h',
    issuer: env.NEXTAUTH_URL,
    audience: 'financial-app'
  });
}

function generateRefreshToken(userId: string): string {
  return jwt.sign(
    { userId, type: 'refresh' },
    env.JWT_SECRET,
    {
      expiresIn: '30d',
      issuer: env.NEXTAUTH_URL,
      audience: 'financial-app'
    }
  );
}

export const POST = withErrorHandler(loginHandler);