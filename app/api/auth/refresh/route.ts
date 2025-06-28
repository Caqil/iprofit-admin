import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Admin } from '@/models/Admin';
import { User } from '@/models/User';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import jwt from 'jsonwebtoken';
import { env } from '@/config/env';

async function refreshHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  try {
    await connectToDatabase();

    const { refreshToken } = await request.json();

    if (!refreshToken) {
      return apiHandler.badRequest('Refresh token is required');
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, env.JWT_SECRET) as any;

    if (decoded.type !== 'refresh') {
      return apiHandler.unauthorized('Invalid token type');
    }

    // Find user
    const userId = decoded.userId;
    let user = await Admin.findById(userId);
    let userType = 'admin';

    if (!user) {
      user = await User.findById(userId).populate('planId');
      userType = 'user';
    }

    if (!user) {
      return apiHandler.unauthorized('User not found');
    }

    // Generate new access token
    const accessTokenPayload = userType === 'admin' 
      ? {
          id: user._id.toString(),
          email: user.email,
          userType: 'admin',
          role: user.role,
          permissions: user.permissions
        }
      : {
          id: user._id.toString(),
          email: user.email,
          userType: 'user',
          planId: user.planId._id?.toString(),
          kycStatus: user.kycStatus
        };

    const accessToken = jwt.sign(accessTokenPayload, env.JWT_SECRET, {
      expiresIn: '1h',
      issuer: env.NEXTAUTH_URL,
      audience: 'financial-app'
    });

    return apiHandler.success({
      accessToken,
      expiresIn: 3600
    });

  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return apiHandler.unauthorized('Invalid refresh token');
    }
    return apiHandler.internalError('Token refresh failed');
  }
}

export const POST = withErrorHandler(refreshHandler);
