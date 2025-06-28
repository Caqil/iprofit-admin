import { NextRequest, NextResponse } from 'next/server';
import { ApiError } from '@/types';
import { ZodError } from 'zod';

interface ErrorHandlerOptions {
  includeStack?: boolean;
  logErrors?: boolean;
  customErrorMap?: Map<string, { status: number; message: string }>;
}

export function errorHandlerMiddleware(
  error: unknown,
  request: NextRequest,
  options: ErrorHandlerOptions = {}
): NextResponse {
  const {
    includeStack = process.env.NODE_ENV === 'development',
    logErrors = true,
    customErrorMap = new Map()
  } = options;

  const timestamp = new Date().toISOString();
  const requestId = request.headers.get('x-request-id') || generateRequestId();

  // Log error for monitoring
  if (logErrors) {
    console.error('API Error:', {
      requestId,
      method: request.method,
      url: request.url,
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp
    });
  }

  // Handle different error types
  if (error instanceof ZodError) {
    const validationErrors = error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code
    }));

    return NextResponse.json(
      {
        success: false,
        error: 'Validation failed',
        code: 422,
        details: {
          errors: validationErrors,
          count: validationErrors.length
        },
        requestId,
        timestamp
      },
      { status: 422 }
    );
  }

  if (error instanceof Error) {
    // Check for custom error mappings
    const customError = customErrorMap.get(error.constructor.name);
    if (customError) {
      return NextResponse.json(
        {
          success: false,
          error: customError.message,
          code: customError.status,
          requestId,
          timestamp,
          ...(includeStack && { stack: error.stack })
        },
        { status: customError.status }
      );
    }

    // Handle specific error types
    switch (error.name) {
      case 'MongoError':
      case 'MongooseError':
        return NextResponse.json(
          {
            success: false,
            error: 'Database operation failed',
            code: 500,
            requestId,
            timestamp,
            ...(includeStack && { details: error.message })
          },
          { status: 500 }
        );

      case 'ValidationError':
        return NextResponse.json(
          {
            success: false,
            error: 'Validation error',
            code: 400,
            details: error.message,
            requestId,
            timestamp
          },
          { status: 400 }
        );

      case 'CastError':
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid ID format',
            code: 400,
            details: 'The provided ID is not in a valid format',
            requestId,
            timestamp
          },
          { status: 400 }
        );

      case 'JsonWebTokenError':
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid token',
            code: 401,
            requestId,
            timestamp
          },
          { status: 401 }
        );

      case 'TokenExpiredError':
        return NextResponse.json(
          {
            success: false,
            error: 'Token expired',
            code: 401,
            requestId,
            timestamp
          },
          { status: 401 }
        );

      case 'MulterError':
        const multerErrorMap: Record<string, { status: number; message: string }> = {
          'LIMIT_FILE_SIZE': { status: 413, message: 'File too large' },
          'LIMIT_FILE_COUNT': { status: 400, message: 'Too many files' },
          'LIMIT_UNEXPECTED_FILE': { status: 400, message: 'Unexpected file field' }
        };

        const multerError = multerErrorMap[error.message] || { status: 400, message: 'File upload error' };
        return NextResponse.json(
          {
            success: false,
            error: multerError.message,
            code: multerError.status,
            requestId,
            timestamp
          },
          { status: multerError.status }
        );

      default:
        // Handle common HTTP errors
        if (error.message.includes('ENOTFOUND')) {
          return NextResponse.json(
            {
              success: false,
              error: 'External service unavailable',
              code: 503,
              requestId,
              timestamp
            },
            { status: 503 }
          );
        }

        if (error.message.includes('ECONNREFUSED')) {
          return NextResponse.json(
            {
              success: false,
              error: 'Service connection refused',
              code: 503,
              requestId,
              timestamp
            },
            { status: 503 }
          );
        }

        if (error.message.includes('timeout')) {
          return NextResponse.json(
            {
              success: false,
              error: 'Request timeout',
              code: 408,
              requestId,
              timestamp
            },
            { status: 408 }
          );
        }

        // Generic error response
        return NextResponse.json(
          {
            success: false,
            error: 'Internal server error',
            code: 500,
            requestId,
            timestamp,
            ...(includeStack && { 
              details: error.message,
              stack: error.stack 
            })
          },
          { status: 500 }
        );
    }
  }

  // Handle non-Error objects
  if (typeof error === 'string') {
    return NextResponse.json(
      {
        success: false,
        error: error,
        code: 500,
        requestId,
        timestamp
      },
      { status: 500 }
    );
  }

  // Fallback for unknown error types
  return NextResponse.json(
    {
      success: false,
      error: 'An unexpected error occurred',
      code: 500,
      requestId,
      timestamp,
      ...(includeStack && { details: JSON.stringify(error) })
    },
    { status: 500 }
  );
}

// Generate unique request ID
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Wrapper function for API route error handling
export function withErrorHandler(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>,
  options: ErrorHandlerOptions = {}
) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    try {
      return await handler(request, context);
    } catch (error) {
      return errorHandlerMiddleware(error, request, options);
    }
  };
}