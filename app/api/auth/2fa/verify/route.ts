import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/config/auth';
import { connectToDatabase } from '@/lib/db';
import { Admin } from '@/models/Admin';
import { verifyTwoFactorToken } from '@/lib/auth';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import { getUserFromRequest } from '@/lib/auth-helper';

async function verify2FAHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  try {
    await connectToDatabase();

     const authResult = await getUserFromRequest(request);
     if (!authResult) {
       return apiHandler.unauthorized('Authentication required');
     }

    const { token } = await request.json();

    if (!token) {
      return apiHandler.badRequest('2FA token is required');
    }

    const admin = await Admin.findById(authResult.userId);
    if (!admin || !admin.twoFactorSecret) {
      return apiHandler.badRequest('2FA not set up');
    }

    // Verify token
    const isValid = await verifyTwoFactorToken(admin.twoFactorSecret, token);

    if (!isValid) {
      return apiHandler.unauthorized('Invalid 2FA token');
    }

    // Enable 2FA
    await Admin.findByIdAndUpdate(admin._id, {
      twoFactorEnabled: true
    });

    return apiHandler.success({
      message: '2FA enabled successfully'
    });

  } catch (error) {
    console.error('2FA verification error:', error);
    return apiHandler.internalError('2FA verification failed');
  }
}

export const POST = withErrorHandler(verify2FAHandler);