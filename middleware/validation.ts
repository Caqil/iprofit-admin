
import { NextRequest, NextResponse } from 'next/server';
import { ZodSchema, ZodError } from 'zod';

interface ValidationOptions {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
  headers?: ZodSchema;
  skipOnError?: boolean;
  customErrorMessage?: string;
}

export async function validationMiddleware(
  request: NextRequest,
  options: ValidationOptions
): Promise<{ isValid: boolean; errors?: any; data?: any }> {
  const { body, query, params, headers, customErrorMessage } = options;
  const errors: any = {};
  const validatedData: any = {};

  try {
    // Validate request body
    if (body && (request.method === 'POST' || request.method === 'PUT' || request.method === 'PATCH')) {
      try {
        const bodyData = await request.json();
        validatedData.body = body.parse(bodyData);
      } catch (error) {
        if (error instanceof ZodError) {
          errors.body = error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          }));
        } else {
          errors.body = [{ field: 'body', message: 'Invalid JSON format', code: 'invalid_json' }];
        }
      }
    }

    // Validate query parameters
    if (query) {
      try {
        const queryData = Object.fromEntries(new URL(request.url).searchParams.entries());
        validatedData.query = query.parse(queryData);
      } catch (error) {
        if (error instanceof ZodError) {
          errors.query = error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          }));
        }
      }
    }

    // Validate route parameters (would need to be extracted from route context)
    if (params && request.url.includes('[')) {
      // This would typically be handled by the route handler with proper param extraction
      // For now, we'll skip params validation in middleware
    }

    // Validate headers
    if (headers) {
      try {
        const headerData = Object.fromEntries(request.headers.entries());
        validatedData.headers = headers.parse(headerData);
      } catch (error) {
        if (error instanceof ZodError) {
          errors.headers = error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          }));
        }
      }
    }

    // Check if there are any validation errors
    const hasErrors = Object.keys(errors).length > 0;

    return {
      isValid: !hasErrors,
      errors: hasErrors ? errors : undefined,
      data: validatedData
    };

  } catch (error) {
    console.error('Validation middleware error:', error);
    return {
      isValid: false,
      errors: {
        general: [{ 
          field: 'validation', 
          message: customErrorMessage || 'Validation failed', 
          code: 'validation_error' 
        }]
      }
    };
  }
}

// Helper function to create validation middleware
export function createValidation(options: ValidationOptions) {
  return (request: NextRequest) => validationMiddleware(request, options);
}

// Validation response helper
export function createValidationResponse(
  errors: any,
  customMessage?: string
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: customMessage || 'Validation failed',
      code: 422,
      details: {
        errors,
        message: 'Please check the provided data and try again'
      },
      timestamp: new Date().toISOString()
    },
    { status: 422 }
  );
}
