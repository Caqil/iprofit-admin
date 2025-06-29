import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { AdminUser, AdminRole } from '@/types';
import { hasPermission, canAccessRoute, Permission } from '@/lib/permissions';
import { env } from '@/config/env';

interface AuthMiddlewareOptions {
  requireAuth?: boolean;
  requiredRole?: AdminRole;
  requiredPermission?: Permission;
  allowedUserTypes?: ('admin' | 'user')[];
  redirectUrl?: string;
}

export async function authMiddleware(
  request: NextRequest,
  options: AuthMiddlewareOptions = {}
): Promise<NextResponse | null> {
  const {
    requireAuth = true,
    requiredRole,
    requiredPermission,
    allowedUserTypes = ['admin'],
    redirectUrl = '/login'
  } = options;

  const { pathname } = request.nextUrl;
  try {
    // Get the session token
    const token = await getToken({
      req: request,
      secret: env.NEXTAUTH_SECRET,
      cookieName: env.NODE_ENV === 'production' 
        ? '__Secure-next-auth.session-token' 
        : 'next-auth.session-token'
    });

    // Public routes that don't require authentication
    const publicRoutes = [
      '/',
      '/login',
      '/signup',
      '/forgot-password',
      '/reset-password',
      '/verify-email',
      '/about',
      '/contact',
      '/privacy',
      '/terms',
      '/api/auth',
      '/api/public'
    ];

    // Check if route is public
    const isPublicRoute = publicRoutes.some(route => 
      pathname.startsWith(route) || pathname === route
    );

    // API routes that don't require authentication
    const publicApiRoutes = [
      '/api/auth/',
      '/api/public/',
      '/api/health',
      '/api/oauth/device'
    ];

    const isPublicApiRoute = publicApiRoutes.some(route => 
      pathname.startsWith(route)
    );

    // Skip authentication for public routes
    if (isPublicRoute || isPublicApiRoute) {
      return null;
    }

    // Check if authentication is required
    if (requireAuth && !token) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Authentication required',
            code: 401,
            timestamp: new Date().toISOString()
          },
          { status: 401 }
        );
      }

      // Redirect to login with return URL
      const loginUrl = new URL(redirectUrl, request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // If no token but auth not required, proceed
    if (!token) {
      return null;
    }

    // Validate user type
    const userType = token.userType as string;
    if (allowedUserTypes.length > 0 && !allowedUserTypes.includes(userType as any)) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid user type for this endpoint',
            code: 403,
            timestamp: new Date().toISOString()
          },
          { status: 403 }
        );
      }

      // Redirect based on user type
      const redirectPath = userType === 'admin' ? '/dashboard' : '/user/dashboard';
      return NextResponse.redirect(new URL(redirectPath, request.url));
    }

    // For admin users, check role and permissions
    if (userType === 'admin') {
      const adminRole = token.role as AdminRole;
      
      // Check required role
      if (requiredRole && adminRole !== requiredRole && adminRole !== 'SuperAdmin') {
        if (pathname.startsWith('/api/')) {
          return NextResponse.json(
            { 
              success: false, 
              error: 'Insufficient role privileges',
              code: 403,
              timestamp: new Date().toISOString()
            },
            { status: 403 }
          );
        }
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }

      // Check required permission
      if (requiredPermission && !hasPermission(adminRole, requiredPermission)) {
        if (pathname.startsWith('/api/')) {
          return NextResponse.json(
            { 
              success: false, 
              error: 'Insufficient permissions',
              code: 403,
              timestamp: new Date().toISOString()
            },
            { status: 403 }
          );
        }
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }

      // Check route access for page routes
      if (!pathname.startsWith('/api/') && !canAccessRoute(adminRole, pathname)) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }

    // Check session expiry
    if (token.exp && Date.now() >= Number(token.exp) * 1000) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Session expired',
            code: 401,
            timestamp: new Date().toISOString()
          },
          { status: 401 }
        );
      }

      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      loginUrl.searchParams.set('error', 'SessionExpired');
      return NextResponse.redirect(loginUrl);
    }

    // For API routes, we don't need to modify the request
    // The middleware will proceed to the actual handler
    // IMPORTANT: Remove NextResponse.next() call - it's not supported in App Router
    return null;

  } catch (error) {
    console.error('Auth middleware error:', error);
    
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Authentication service unavailable',
          code: 503,
          timestamp: new Date().toISOString()
        },
        { status: 503 }
      );
    }

    return NextResponse.redirect(new URL('/login', request.url));
  }
}

// Helper function to create auth middleware with specific options
export function createAuthMiddleware(options: AuthMiddlewareOptions) {
  return (request: NextRequest) => authMiddleware(request, options);
}

// Predefined middleware for common use cases
export const requireAdmin = createAuthMiddleware({
  requireAuth: true,
  allowedUserTypes: ['admin']
});

export const requireSuperAdmin = createAuthMiddleware({
  requireAuth: true,
  allowedUserTypes: ['admin'],
  requiredRole: 'SuperAdmin'
});

export const requireUser = createAuthMiddleware({
  requireAuth: true,
  allowedUserTypes: ['user']
});

export const requireAnyAuth = createAuthMiddleware({
  requireAuth: true,
  allowedUserTypes: ['admin', 'user']
});