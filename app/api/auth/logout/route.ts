import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/config/auth';
import { AuditLog } from '@/models/AuditLog';
import { connectToDatabase } from '@/lib/db';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';

async function logoutHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  try {
    await connectToDatabase();

    const session = await getServerSession(authConfig);

    if (session?.user) {
      // Log logout activity
      await AuditLog.create({
        adminId: session.user.userType === 'admin' ? session.user.id : null,
        action: 'LOGOUT',
        entity: session.user.userType,
        entityId: session.user.email,
        status: 'Success',
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1',
        userAgent: request.headers.get('user-agent') || 'Unknown',
        severity: 'Low'
      });
    }

    return apiHandler.success({ message: 'Logged out successfully' });

  } catch (error) {
    console.error('Logout error:', error);
    return apiHandler.internalError('Logout failed');
  }
}

export const POST = withErrorHandler(logoutHandler);


