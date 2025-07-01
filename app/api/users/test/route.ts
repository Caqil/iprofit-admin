// app/api/test-auth/route.ts - CREATE THIS FILE FIRST FOR TESTING
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Test auth route called');
    
    // Get Authorization header
    const authHeader = request.headers.get('authorization');
    console.log('📋 Auth header:', authHeader ? 'Present' : 'Missing');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({
        success: false,
        error: 'No Bearer token provided',
        debug: {
          authHeader: authHeader ? 'Present but invalid format' : 'Missing'
        }
      }, { status: 401 });
    }

    const token = authHeader.substring(7);
    console.log('🎫 Token length:', token.length);
    console.log('🎫 Token start:', token.substring(0, 20) + '...');

    // Get JWT secret from environment
    const jwtSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
    console.log('🔑 JWT Secret available:', !!jwtSecret);
    
    if (!jwtSecret) {
      return NextResponse.json({
        success: false,
        error: 'JWT_SECRET not configured',
        debug: {
          hasJWT_SECRET: !!process.env.JWT_SECRET,
          hasNEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET
        }
      }, { status: 500 });
    }

    // Try to verify the token
    const decoded = jwt.verify(token, jwtSecret) as any;
    console.log('✅ Token decoded successfully:', {
      userId: decoded.id,
      email: decoded.email,
      userType: decoded.userType
    });

    return NextResponse.json({
      success: true,
      message: 'Bearer token authentication working!',
      user: {
        id: decoded.id,
        email: decoded.email,
        userType: decoded.userType,
        kycStatus: decoded.kycStatus
      },
      debug: {
        tokenValid: true,
        secretFound: true,
        method: 'bearer'
      }
    });

  } catch (error: any) {
    console.error('❌ Token verification failed:', error.message);
    
    return NextResponse.json({
      success: false,
      error: 'Token verification failed',
      debug: {
        errorMessage: error.message,
        errorType: error.name
      }
    }, { status: 401 });
  }
}