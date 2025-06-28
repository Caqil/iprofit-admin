
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/config/auth';
import { connectToDatabase } from '@/lib/db';
import { Admin } from '@/models/Admin';
import { generateTwoFactorSecret } from '@/lib/auth';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';

async function setup2FAHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  try {
    await connectToDatabase();

    const session = await getServerSession(authConfig);

    if (!session?.user || session.user.userType !== 'admin') {
      return apiHandler.unauthorized('Admin authentication required');
    }

    const admin = await Admin.findById(session.user.id);
    if (!admin) {
      return apiHandler.notFound('Admin not found');
    }

    // Generate 2FA secret
    const { secret, qrCode } = await generateTwoFactorSecret();

    // Save secret to admin (but don't enable 2FA yet)
    await Admin.findByIdAndUpdate(admin._id, {
      twoFactorSecret: secret
    });

    return apiHandler.success({
      secret,
      qrCode,
      message: 'Scan the QR code with your authenticator app and verify with a token to enable 2FA'
    });

  } catch (error) {
    console.error('2FA setup error:', error);
    return apiHandler.internalError('2FA setup failed');
  }
}

export const POST = withErrorHandler(setup2FAHandler);