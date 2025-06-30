// middleware.ts - UPDATED VERSION to fix redirects
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default withAuth(
  function middleware(req: NextRequest & { token?: any }) {
    const token = (req as any).token;
    const pathname = req.nextUrl.pathname;

    // Public routes that don't require authentication
    const publicRoutes = [
      '/',
      '/about',
      '/contact',
      '/privacy',
      '/terms',
      '/login',
      '/signup',
      '/forgot-password',
      '/reset-password',
      '/verify-email'
    ];

    // Check if the current path is a public route
    const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith(route));

    // If it's a public route, allow access
    if (isPublicRoute) {
      return NextResponse.next();
    }

    // If user is not authenticated and trying to access protected route
    if (!token) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Handle different user types and route access
    const userType = token.userType;

    // FIXED: Be more specific about when to redirect
    // Only redirect if user is clearly in wrong section
    
    // Admin routes - only redirect non-admins from /dashboard root
    if (pathname === '/dashboard' && userType !== 'admin') {
      return NextResponse.redirect(new URL('/user/dashboard', req.url));
    }

    // User routes - only redirect non-users from /user root  
    if (pathname === '/user' && userType !== 'user') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    // Redirect authenticated users away from auth pages
    if (pathname === '/login' || pathname === '/signup') {
      if (userType === 'admin') {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      } else if (userType === 'user') {
        return NextResponse.redirect(new URL('/user/dashboard', req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname;
        
        // Allow all public routes
        const publicRoutes = [
          '/',
          '/about',
          '/contact',
          '/privacy',
          '/terms',
          '/login',
          '/signup',
          '/forgot-password',
          '/reset-password',
          '/verify-email'
        ];

        const isPublicRoute = publicRoutes.some(route => 
          pathname === route || pathname.startsWith(route)
        );

        if (isPublicRoute) {
          return true;
        }

        // API routes - allow if authenticated
        if (pathname.startsWith('/api/')) {
          return !!token;
        }

        // Protected routes require authentication
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};