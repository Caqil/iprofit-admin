// lib/auth-helper.ts (FIXED VERSION)
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { getToken } from 'next-auth/jwt';
import { authConfig } from '@/config/auth';
import jwt from 'jsonwebtoken';
import { env } from '@/config/env';

export interface AuthResult {
  userId: string;
  userType: 'admin' | 'user';
  email: string;
  role?: string;
  method: 'bearer' | 'session';
}

/**
 * Unified authentication helper that supports both Bearer tokens and NextAuth sessions
 */
export async function getUserFromRequest(request: NextRequest): Promise<AuthResult | null> {
  try {
    // Method 1: Try Bearer Token first (for API clients, mobile apps)
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        const decoded = jwt.verify(token, env.JWT_SECRET) as any;
        
        // 🔥 FIXED: Check for all possible user ID fields (id, userId, sub)
        if (!decoded.id && !decoded.userId && !decoded.sub) {
          console.log('❌ Invalid JWT: missing id/userId/sub');
          throw new Error('Invalid token structure');
        }

        console.log('✅ Bearer token verified:', {
          id: decoded.id,
          userId: decoded.userId, 
          sub: decoded.sub,
          userType: decoded.userType,
          email: decoded.email
        });

        return {
          userId: decoded.id || decoded.userId || decoded.sub, // 🔥 FIXED: Check id first
          userType: decoded.userType || 'user',
          email: decoded.email,
          role: decoded.role,
          method: 'bearer'
        };
      } catch (jwtError: any) {
        console.log('❌ JWT verification failed:', jwtError.message);
        // Don't return error here, try session method
      }
    }

    // Method 2: Try NextAuth Session (for web app)
    const session = await getServerSession(authConfig);
    if (session?.user?.id) {
      console.log('✅ Session auth verified:', {
        userId: session.user.id,
        userType: session.user.userType
      });

      return {
        userId: session.user.id,
        userType: session.user.userType || 'user',
        email: session.user.email || '',
        role: session.user.role,
        method: 'session'
      };
    }

    // Method 3: Try NextAuth JWT token from cookies (alternative session method)
    const nextAuthToken = await getToken({
      req: request,
      secret: env.NEXTAUTH_SECRET,
      cookieName: env.NODE_ENV === 'production' 
        ? '__Secure-next-auth.session-token' 
        : 'next-auth.session-token'
    });

    if (nextAuthToken?.sub) {
      console.log('✅ NextAuth JWT verified:', {
        sub: nextAuthToken.sub,
        userType: nextAuthToken.userType
      });

      return {
        userId: nextAuthToken.sub,
        userType: nextAuthToken.userType as 'admin' | 'user' || 'user',
        email: nextAuthToken.email || '',
        role: nextAuthToken.role as string,
        method: 'session'
      };
    }

    console.log('❌ No valid authentication found');
    return null;
  } catch (error) {
    console.error('❌ Authentication error:', error);
    return null;
  }
}

/**
 * Middleware-compatible auth check
 */
export async function requireAuth(
  request: NextRequest, 
  allowedTypes: ('admin' | 'user')[] = ['admin', 'user']
): Promise<{ success: true; user: AuthResult } | { success: false; error: string; status: number }> {
  
  const authResult = await getUserFromRequest(request);
  
  if (!authResult) {
    return {
      success: false,
      error: 'Authentication required. Provide valid Bearer token or session cookie.',
      status: 401
    };
  }

  if (!allowedTypes.includes(authResult.userType)) {
    return {
      success: false,
      error: `Access denied. Required user type: ${allowedTypes.join(' or ')}`,
      status: 403
    };
  }

  return {
    success: true,
    user: authResult
  };
}

/**
 * Extract user ID from request (convenience function)
 */
export async function getUserId(request: NextRequest): Promise<string | null> {
  const authResult = await getUserFromRequest(request);
  return authResult?.userId || null;
}

/**
 * Check if user is admin
 */
export async function isAdmin(request: NextRequest): Promise<boolean> {
  const authResult = await getUserFromRequest(request);
  return authResult?.userType === 'admin';
}

/**
 * Check if user can access resource (own resource or admin)
 */
export async function canAccessResource(
  request: NextRequest, 
  resourceUserId: string
): Promise<boolean> {
  const authResult = await getUserFromRequest(request);
  
  if (!authResult) return false;
  
  // Admin can access any resource
  if (authResult.userType === 'admin') return true;
  
  // User can access their own resource
  return authResult.userId === resourceUserId;
}