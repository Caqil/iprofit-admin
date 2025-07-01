import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/config/auth';
import { AuditLog } from '@/models/AuditLog';
import { connectToDatabase } from '@/lib/db';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import { getUserFromRequest } from '@/lib/auth-helper';

async function logoutHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  try {
    await connectToDatabase();

     const authResult = await getUserFromRequest(request);
     if (!authResult) {
       return apiHandler.unauthorized('Authentication required');
     }
    if (authResult.userType !== 'admin' && authResult.userType !== 'user') {
      // Log logout activity
      await AuditLog.create({
        adminId: authResult.role === 'admin' ? authResult.userId : null,
        action: 'LOGOUT',
        entity: authResult,
        entityId: authResult.email,
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


