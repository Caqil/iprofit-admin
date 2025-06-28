import { NextRequest, NextResponse } from 'next/server';

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (request: NextRequest) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  message?: string;
  headers?: boolean;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
    hits: number[];
  };
}

// In-memory store (use Redis in production)
const store: RateLimitStore = {};

// Cleanup expired entries periodically
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach(key => {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  });
}, 60000); // Cleanup every minute

export async function rateLimitMiddleware(
  request: NextRequest,
  options: RateLimitOptions
): Promise<NextResponse | null> {
  const {
    windowMs,
    maxRequests,
    keyGenerator = getDefaultKey,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    message = 'Too many requests',
    headers = true,
    standardHeaders = true,
    legacyHeaders = false
  } = options;

  const key = keyGenerator(request);
  const now = Date.now();
  const windowStart = now - windowMs;

  // Clean up expired entries for this key
  if (store[key] && store[key].resetTime < now) {
    delete store[key];
  }

  // Get or create entry
  let entry = store[key];
  if (!entry) {
    entry = {
      count: 0,
      resetTime: now + windowMs,
      hits: []
    };
    store[key] = entry;
  }

  // Remove old hits outside the window
  entry.hits = entry.hits.filter(hit => hit > windowStart);
  entry.count = entry.hits.length;

  // Check if limit exceeded
  if (entry.count >= maxRequests) {
    const response = NextResponse.json(
      {
        success: false,
        error: message,
        code: 429,
        details: {
          limit: maxRequests,
          windowMs,
          retryAfter: Math.ceil((entry.resetTime - now) / 1000)
        },
        timestamp: new Date().toISOString()
      },
      { status: 429 }
    );

    // Add rate limit headers
    if (headers) {
      if (standardHeaders) {
        response.headers.set('RateLimit-Limit', maxRequests.toString());
        response.headers.set('RateLimit-Remaining', '0');
        response.headers.set('RateLimit-Reset', new Date(entry.resetTime).toISOString());
      }

      if (legacyHeaders) {
        response.headers.set('X-RateLimit-Limit', maxRequests.toString());
        response.headers.set('X-RateLimit-Remaining', '0');
        response.headers.set('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000).toString());
      }

      response.headers.set('Retry-After', Math.ceil((entry.resetTime - now) / 1000).toString());
    }

    return response;
  }

  // Record this hit
  entry.hits.push(now);
  entry.count = entry.hits.length;

  // Create response to add headers
  const response = NextResponse.next();

  // Add rate limit headers to successful requests
  if (headers) {
    const remaining = maxRequests - entry.count;
    
    if (standardHeaders) {
      response.headers.set('RateLimit-Limit', maxRequests.toString());
      response.headers.set('RateLimit-Remaining', remaining.toString());
      response.headers.set('RateLimit-Reset', new Date(entry.resetTime).toISOString());
    }

    if (legacyHeaders) {
      response.headers.set('X-RateLimit-Limit', maxRequests.toString());
      response.headers.set('X-RateLimit-Remaining', remaining.toString());
      response.headers.set('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000).toString());
    }
  }

  return response;
}

// Default key generator
function getDefaultKey(request: NextRequest): string {
  return getClientIP(request);
}

// Get client IP address
function getClientIP(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1'
  );
}

// Helper function to create rate limit middleware
export function createRateLimit(options: RateLimitOptions) {
  return (request: NextRequest) => rateLimitMiddleware(request, options);
}

// Import environment variables (adjust the import path as needed)
const env = {
  RATE_LIMIT_AUTH_WINDOW: Number(process.env.RATE_LIMIT_AUTH_WINDOW) || 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_AUTH_REQUESTS: Number(process.env.RATE_LIMIT_AUTH_REQUESTS) || 5,
  RATE_LIMIT_API_WINDOW: Number(process.env.RATE_LIMIT_API_WINDOW) || 60 * 1000, // 1 minute
  RATE_LIMIT_API_REQUESTS: Number(process.env.RATE_LIMIT_API_REQUESTS) || 100,
  RATE_LIMIT_UPLOAD_WINDOW: Number(process.env.RATE_LIMIT_UPLOAD_WINDOW) || 60 * 1000, // 1 minute
  RATE_LIMIT_UPLOAD_REQUESTS: Number(process.env.RATE_LIMIT_UPLOAD_REQUESTS) || 10,
};

 // Predefined rate limiters
export const authRateLimit = createRateLimit({
  windowMs: env.RATE_LIMIT_AUTH_WINDOW, // 15 minutes
  maxRequests: env.RATE_LIMIT_AUTH_REQUESTS, // 5 attempts
  message: 'Too many authentication attempts',
  keyGenerator: (req) => `auth:${getClientIP(req)}`
});

export const apiRateLimit = createRateLimit({
  windowMs: env.RATE_LIMIT_API_WINDOW, // 1 minute
  maxRequests: env.RATE_LIMIT_API_REQUESTS, // 100 requests
  message: 'API rate limit exceeded',
  keyGenerator: (req) => `api:${getClientIP(req)}`
});

export const uploadRateLimit = createRateLimit({
  windowMs: env.RATE_LIMIT_UPLOAD_WINDOW, // 1 minute  
  maxRequests: env.RATE_LIMIT_UPLOAD_REQUESTS, // 10 uploads
  message: 'Upload rate limit exceeded',
  keyGenerator: (req) => `upload:${getClientIP(req)}`
});

export const strictRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 20, // 20 requests per minute for sensitive operations
  message: 'Rate limit exceeded for sensitive operation',
  keyGenerator: (req) => `strict:${getClientIP(req)}`
});

// Per-user rate limiting (requires authentication)
export const userRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60, // 60 requests per minute per user
  message: 'User rate limit exceeded',
  keyGenerator: (req) => {
    const userId = req.headers.get('x-user-id');
    return userId ? `user:${userId}` : `ip:${getClientIP(req)}`;
  }
});
