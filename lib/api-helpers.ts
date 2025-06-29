import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { connectToDatabase } from './db';
import { AuditLog } from '@/models/AuditLog';
import { ApiResponse, ApiError, ValidationError, AdminUser } from '@/types';
import { ZodError, ZodSchema } from 'zod';
import { hasPermission, Permission } from './permissions';

export class ApiHandler {
  private req: NextRequest;
  private context: any;

  constructor(req: NextRequest, context?: any) {
    this.req = req;
    this.context = context;
  }

  static create(req: NextRequest, context?: any) {
    return new ApiHandler(req, context);
  }

  async withAuth<T>(
    handler: (user: AdminUser, req: NextRequest) => Promise<T>
  ): Promise<NextResponse> {
    try {
      await connectToDatabase();
      
      const session = await getServerSession(authOptions);
      if (!session?.user) {
        return this.unauthorized('Authentication required');
      }

      const user = session.user as unknown as AdminUser;
      const result = await handler(user, this.req);
      
      return this.success(result);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async withPermission<T>(
    permission: Permission,
    handler: (user: AdminUser, req: NextRequest) => Promise<T>
  ): Promise<NextResponse> {
    return this.withAuth(async (user, req) => {
      if (!hasPermission(user.role, permission)) {
        throw new Error('Insufficient permissions');
      }
      return handler(user, req);
    });
  }

  async withValidation<T, U>(
    schema: ZodSchema<T>,
    handler: (data: T, user: AdminUser, req: NextRequest) => Promise<U>
  ): Promise<NextResponse> {
    return this.withAuth(async (user, req) => {
      const body = await req.json();
      const validatedData = schema.parse(body);
      return handler(validatedData, user, req);
    });
  }

  async withAudit<T>(
    action: string,
    entity: string,
    handler: (user: AdminUser, req: NextRequest) => Promise<T>
  ): Promise<NextResponse> {
    return this.withAuth(async (user, req) => {
      const startTime = Date.now();
      
      try {
        const result = await handler(user, req);
        
        // Log successful audit
        await this.logAudit({
          adminId: user._id,
          action,
          entity,
          status: 'Success',
          duration: Date.now() - startTime,
          ipAddress: this.getClientIP(),
          userAgent: req.headers.get('user-agent') || 'Unknown'
        });
        
        return result;
      } catch (error) {
        // Log failed audit
        await this.logAudit({
          adminId: user._id,
          action,
          entity,
          status: 'Failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          duration: Date.now() - startTime,
          ipAddress: this.getClientIP(),
          userAgent: req.headers.get('user-agent') || 'Unknown'
        });
        
        throw error;
      }
    });
  }

  // Response helpers
  success<T>(data: T, message?: string): NextResponse {
    const response: ApiResponse<T> = {
      success: true,
      data,
      message,
      timestamp: new Date()
    };
    return NextResponse.json(response);
  }

  created<T>(data: T, message?: string): NextResponse {
    const response: ApiResponse<T> = {
      success: true,
      data,
      message: message || 'Resource created successfully',
      timestamp: new Date()
    };
    return NextResponse.json(response, { status: 201 });
  }

  badRequest(message: string, details?: any): NextResponse {
    const response: ApiResponse = {
      success: false,
      error: message,
      code: 400,
      timestamp: new Date()
    };
    if (details) response.data = details;
    return NextResponse.json(response, { status: 400 });
  }

  unauthorized(message: string = 'Unauthorized'): NextResponse {
    const response: ApiResponse = {
      success: false,
      error: message,
      code: 401,
      timestamp: new Date()
    };
    return NextResponse.json(response, { status: 401 });
  }

  forbidden(message: string = 'Forbidden'): NextResponse {
    const response: ApiResponse = {
      success: false,
      error: message,
      code: 403,
      timestamp: new Date()
    };
    return NextResponse.json(response, { status: 403 });
  }

  notFound(message: string = 'Resource not found'): NextResponse {
    const response: ApiResponse = {
      success: false,
      error: message,
      code: 404,
      timestamp: new Date()
    };
    return NextResponse.json(response, { status: 404 });
  }

  conflict(message: string = 'Resource already exists'): NextResponse {
    const response: ApiResponse = {
      success: false,
      error: message,
      code: 409,
      timestamp: new Date()
    };
    return NextResponse.json(response, { status: 409 });
  }

  validationError(errors: ValidationError[]): NextResponse {
    const response: ApiResponse = {
      success: false,
      error: 'Validation failed',
      code: 422,
      data: { errors },
      timestamp: new Date()
    };
    return NextResponse.json(response, { status: 422 });
  }

  tooManyRequests(message: string = 'Too many requests'): NextResponse {
    const response: ApiResponse = {
      success: false,
      error: message,
      code: 429,
      timestamp: new Date()
    };
    return NextResponse.json(response, { status: 429 });
  }

  internalError(message: string = 'Internal server error'): NextResponse {
    const response: ApiResponse = {
      success: false,
      error: message,
      code: 500,
      timestamp: new Date()
    };
    return NextResponse.json(response, { status: 500 });
  }

  // Error handling
  handleError(error: unknown): NextResponse {
    console.error('API Error:', error);

    if (error instanceof ZodError) {
      const validationErrors: ValidationError[] = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code
      }));
      return this.validationError(validationErrors);
    }

    if (error instanceof Error) {
      switch (error.message) {
        case 'Authentication required':
          return this.unauthorized();
        case 'Insufficient permissions':
          return this.forbidden();
        case 'Resource not found':
          return this.notFound();
        case 'Resource already exists':
          return this.conflict();
        case 'Too many requests':
          return this.tooManyRequests();
        default:
          return this.internalError(error.message);
      }
    }

    return this.internalError();
  }

  // Utility methods
  getClientIP(): string {
    return (
      this.req.headers.get('x-forwarded-for')?.split(',')[0] ||
      this.req.headers.get('x-real-ip') ||
      '127.0.0.1'
    );
  }

  async getRequestBody<T>(): Promise<T> {
    try {
      return await this.req.json();
    } catch {
      throw new Error('Invalid JSON body');
    }
  }

  getQueryParams(): URLSearchParams {
    return new URL(this.req.url).searchParams;
  }

  getPaginationParams() {
    const params = this.getQueryParams();
    return {
      page: Math.max(1, parseInt(params.get('page') || '1')),
      limit: Math.min(100, Math.max(1, parseInt(params.get('limit') || '10'))),
      sortBy: params.get('sortBy') || 'createdAt',
      sortOrder: (params.get('sortOrder') === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc'
    };
  }

  getFilterParams(): Record<string, any> {
    const params = this.getQueryParams();
    const filters: Record<string, any> = {};
    
    for (const [key, value] of params.entries()) {
      if (!['page', 'limit', 'sortBy', 'sortOrder'].includes(key)) {
        filters[key] = value;
      }
    }
    
    return filters;
  }

  private async logAudit(auditData: Partial<any>) {
    try {
      await AuditLog.create({
        ...auditData,
        severity: auditData.status === 'Success' ? 'Low' : 'Medium'
      });
    } catch (error) {
      console.error('Failed to log audit:', error);
    }
  }
}

// Helper functions for common API patterns
export async function handleGET<T>(
  req: NextRequest,
  handler: (params: any) => Promise<T>
): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(req);
  
  try {
    await connectToDatabase();
    const params = apiHandler.getPaginationParams();
    const filters = apiHandler.getFilterParams();
    const result = await handler({ ...params, ...filters });
    return apiHandler.success(result);
  } catch (error) {
    return apiHandler.handleError(error);
  }
}

export async function handlePOST<T, U>(
  req: NextRequest,
  schema: ZodSchema<T>,
  handler: (data: T) => Promise<U>
): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(req);
  
  return apiHandler.withValidation(schema, async (data) => {
    const result = await handler(data);
    return result;
  });
}

export async function handlePUT<T, U>(
  req: NextRequest,
  schema: ZodSchema<T>,
  handler: (data: T, id: string) => Promise<U>
): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(req);
  
  return apiHandler.withValidation(schema, async (data) => {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const id = pathParts[pathParts.length - 1];
    
    if (!id || id === 'undefined') {
      throw new Error('Resource ID is required');
    }
    
    const result = await handler(data, id);
    return result;
  });
}

export async function handleDELETE<T>(
  req: NextRequest,
  handler: (id: string) => Promise<T>
): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(req);
  
  return apiHandler.withAuth(async () => {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const id = pathParts[pathParts.length - 1];
    
    if (!id || id === 'undefined') {
      throw new Error('Resource ID is required');
    }
    
    const result = await handler(id);
    return result;
  });
}

// Pagination helper
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
) {
  const totalPages = Math.ceil(total / limit);
  
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  };
}

// MongoDB aggregation helpers
export function createMatchStage(filters: Record<string, any>) {
  const match: Record<string, any> = {};
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (key.includes('Date')) {
        // Handle date range filters
        if (key.endsWith('From')) {
          const field = key.replace('From', '');
          match[field] = { ...match[field], $gte: new Date(value) };
        } else if (key.endsWith('To')) {
          const field = key.replace('To', '');
          match[field] = { ...match[field], $lte: new Date(value) };
        }
      } else if (key === 'search') {
        // Handle text search
        match.$or = [
          { name: { $regex: value, $options: 'i' } },
          { email: { $regex: value, $options: 'i' } }
        ];
      } else if (typeof value === 'string' && value.includes(',')) {
        // Handle array filters
        match[key] = { $in: value.split(',') };
      } else {
        match[key] = value;
      }
    }
  });
  
  return { $match: match };
}

export function createSortStage(sortBy: string, sortOrder: string) {
  return {
    $sort: {
      [sortBy]: (sortOrder === 'asc' ? 1 : -1) as 1 | -1
    }
  };
}
export function createPaginationStages(page: number, limit: number) {
  return [
    { $skip: (page - 1) * limit },
    { $limit: limit }
  ];
}

// File upload helpers
export async function saveFileToGridFS(
  file: File,
  bucketName: string = 'uploads'
): Promise<string> {
  const { getGridFSBucket } = await import('./mongodb');
  const bucket = await getGridFSBucket(bucketName);
  
  const uploadStream = bucket.openUploadStream(file.name, {
    metadata: {
      contentType: file.type,
      uploadedAt: new Date()
    }
  });
  
  const buffer = Buffer.from(await file.arrayBuffer());
  uploadStream.end(buffer);
  
  return new Promise((resolve, reject) => {
    uploadStream.on('finish', () => {
      resolve(uploadStream.id.toString());
    });
    uploadStream.on('error', reject);
  });
}

export async function deleteFileFromGridFS(
  fileId: string,
  bucketName: string = 'uploads'
): Promise<void> {
  const { getGridFSBucket } = await import('./mongodb');
  const { ObjectId } = await import('mongodb');
  const bucket = await getGridFSBucket(bucketName);
  
  await bucket.delete(new ObjectId(fileId));
}

// WebSocket helpers for real-time updates
export function broadcastUpdate(event: string, data: any) {
  // This would integrate with Socket.IO in a real implementation
  console.log(`Broadcasting ${event}:`, data);
}

// Device detection helpers
export function parseUserAgent(userAgent: string) {
  return {
    browser: extractBrowser(userAgent),
    os: extractOS(userAgent),
    device: extractDevice(userAgent),
    isMobile: /Mobile|Android|iPhone|iPad/.test(userAgent),
    isBot: /bot|crawler|spider/i.test(userAgent)
  };
}

function extractBrowser(userAgent: string): string {
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Safari')) return 'Safari';
  if (userAgent.includes('Edge')) return 'Edge';
  return 'Unknown';
}

function extractOS(userAgent: string): string {
  if (userAgent.includes('Windows')) return 'Windows';
  if (userAgent.includes('Mac')) return 'macOS';
  if (userAgent.includes('Linux')) return 'Linux';
  if (userAgent.includes('Android')) return 'Android';
  if (userAgent.includes('iOS')) return 'iOS';
  return 'Unknown';
}

function extractDevice(userAgent: string): string {
  if (userAgent.includes('iPhone')) return 'iPhone';
  if (userAgent.includes('iPad')) return 'iPad';
  if (userAgent.includes('Android')) return 'Android';
  return 'Desktop';
}

// Cache helpers
export class MemoryCache {
  private static instance: MemoryCache;
  private cache = new Map<string, { value: any; expiry: number }>();

  static getInstance(): MemoryCache {
    if (!MemoryCache.instance) {
      MemoryCache.instance = new MemoryCache();
    }
    return MemoryCache.instance;
  }

  set(key: string, value: any, ttlSeconds: number = 300): void {
    const expiry = Date.now() + ttlSeconds * 1000;
    this.cache.set(key, { value, expiry });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }
}

// Background job helpers
export class JobQueue {
  private static jobs: Array<() => Promise<void>> = [];
  private static processing = false;

  static add(job: () => Promise<void>): void {
    this.jobs.push(job);
    this.process();
  }

  private static async process(): Promise<void> {
    if (this.processing || this.jobs.length === 0) return;
    
    this.processing = true;
    
    while (this.jobs.length > 0) {
      const job = this.jobs.shift();
      if (job) {
        try {
          await job();
        } catch (error) {
          console.error('Job failed:', error);
        }
      }
    }
    
    this.processing = false;
  }
}

// Email queue for better performance
export function queueEmail(emailData: any): void {
  JobQueue.add(async () => {
    const { sendEmail } = await import('./email');
    await sendEmail(emailData);
  });
}

// Notification queue
export function queueNotification(notificationData: any): void {
  JobQueue.add(async () => {
    const { Notification } = await import('@/models/Notification');
    await Notification.create(notificationData);
  });
}
