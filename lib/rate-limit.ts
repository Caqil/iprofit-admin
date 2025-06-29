import { NextRequest, NextResponse } from 'next/server';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: NextRequest) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// In-memory store (use Redis in production)
const store: RateLimitStore = {};

export function createRateLimit(config: RateLimitConfig) {
  const {
    windowMs,
    maxRequests,
    keyGenerator = (req) => getClientIP(req),
    skipSuccessfulRequests = false,
    skipFailedRequests = false
  } = config;

  return async (req: NextRequest): Promise<{
    success: boolean;
    limit: number;
    remaining: number;
    resetTime: number;
  }> => {
    const key = keyGenerator(req);
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean up expired entries
    Object.keys(store).forEach(k => {
      if (store[k].resetTime < now) {
        delete store[k];
      }
    });

    // Get or create entry
    let entry = store[key];
    if (!entry || entry.resetTime < now) {
      entry = {
        count: 0,
        resetTime: now + windowMs
      };
      store[key] = entry;
    }

    // Check if limit exceeded
    if (entry.count >= maxRequests) {
      return {
        success: false,
        limit: maxRequests,
        remaining: 0,
        resetTime: entry.resetTime
      };
    }

    // Increment counter
    entry.count++;

    return {
      success: true,
      limit: maxRequests,
      remaining: maxRequests - entry.count,
      resetTime: entry.resetTime
    };
  };
}

// Helper function to convert rate limit result to NextResponse
export function createRateLimitResponse(result: {
  success: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
}, message = 'Too many requests'): NextResponse | null {
  if (result.success) {
    return null; // Allow request to continue
  }

  const response = NextResponse.json(
    {
      success: false,
      error: message,
      code: 429,
      details: {
        limit: result.limit,
        remaining: result.remaining,
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
      },
      timestamp: new Date().toISOString()
    },
    { status: 429 }
  );

  // Add standard rate limit headers
  response.headers.set('RateLimit-Limit', result.limit.toString());
  response.headers.set('RateLimit-Remaining', result.remaining.toString());
  response.headers.set('RateLimit-Reset', new Date(result.resetTime).toISOString());
  response.headers.set('Retry-After', Math.ceil((result.resetTime - Date.now()) / 1000).toString());

  return response;
}

// Predefined rate limiters that return NextResponse | null
export async function authRateLimit(req: NextRequest): Promise<NextResponse | null> {
  const rateLimiter = createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5 // 5 login attempts per 15 minutes
  });
  
  const result = await rateLimiter(req);
  return createRateLimitResponse(result, 'Too many authentication attempts');
}

export async function apiRateLimit(req: NextRequest): Promise<NextResponse | null> {
  const rateLimiter = createRateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100 // 100 API calls per minute
  });
  
  const result = await rateLimiter(req);
  return createRateLimitResponse(result, 'API rate limit exceeded');
}

export async function uploadRateLimit(req: NextRequest): Promise<NextResponse | null> {
  const rateLimiter = createRateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10 // 10 uploads per minute
  });
  
  const result = await rateLimiter(req);
  return createRateLimitResponse(result, 'Upload rate limit exceeded');
}

export async function strictRateLimit(req: NextRequest): Promise<NextResponse | null> {
  const rateLimiter = createRateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20 // 20 requests per minute for sensitive operations
  });
  
  const result = await rateLimiter(req);
  return createRateLimitResponse(result, 'Rate limit exceeded for sensitive operation');
}

function getClientIP(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0] ||
    req.headers.get('x-real-ip') ||
    '127.0.0.1'
  );
}