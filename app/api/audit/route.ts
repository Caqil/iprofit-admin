import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { AuditLog } from '@/models/AuditLog';
import { Admin } from '@/models/Admin';
import { withErrorHandler } from '@/middleware/error-handler';
import { authMiddleware } from '@/middleware/auth';
import { ApiHandler } from '@/lib/api-helpers';
import { FilterParams, PaginationParams, ListResponse } from '@/types';
import { z } from 'zod';

// Audit filter validation schema
const auditFilterSchema = z.object({
  page: z.string().transform(Number).pipe(z.number().min(1)).optional(),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  adminId: z.string().optional(),
  action: z.string().optional(),
  entity: z.string().optional(),
  severity: z.enum(['Low', 'Medium', 'High', 'Critical']).optional(),
  status: z.enum(['Success', 'Failed', 'Partial']).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  search: z.string().optional()
});

async function getAuditLogs(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Check authentication and permissions
  const authResult = await authMiddleware(request, {
    requireAuth: true,
    allowedUserTypes: ['admin'],
    requiredPermission: 'audit.view'
  });
  if (authResult) return authResult;

  try {
    await connectToDatabase();

    // Parse and validate query parameters
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    const validationResult = auditFilterSchema.safeParse(queryParams);

    if (!validationResult.success) {
      return apiHandler.validationError(
        validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      );
    }

    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      adminId,
      action,
      entity,
      severity,
      status,
      dateFrom,
      dateTo,
      search
    } = validationResult.data;

    // Build filter query
    const filter: any = {};

    if (adminId) filter.adminId = adminId;
    if (action) filter.action = new RegExp(action, 'i');
    if (entity) filter.entity = new RegExp(entity, 'i');
    if (severity) filter.severity = severity;
    if (status) filter.status = status;

    // Date range filter
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    // Search filter
    if (search) {
      filter.$or = [
        { action: new RegExp(search, 'i') },
        { entity: new RegExp(search, 'i') },
        { entityId: new RegExp(search, 'i') },
        { errorMessage: new RegExp(search, 'i') }
      ];
    }

    // Get total count
    const total = await AuditLog.countDocuments(filter);

    // Get paginated results with admin info
    const auditLogs = await AuditLog.find(filter)
      .populate('adminId', 'name email role')
      .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Format response
    const formattedLogs = auditLogs.map(log => ({
      id: String(log._id),
      adminId: log.adminId?._id?.toString() || null,
      adminName: log.adminId?.name || 'System',
      adminEmail: log.adminId?.email || null,
      action: log.action,
      entity: log.entity,
      entityId: log.entityId,
      oldData: log.oldData,
      newData: log.newData,
      changes: log.changes,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      severity: log.severity,
      status: log.status,
      errorMessage: log.errorMessage,
      duration: log.duration,
      metadata: log.metadata,
      createdAt: log.createdAt
    }));

    const response: ListResponse<typeof formattedLogs[0]> = {
      success: true,
      data: formattedLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      },
      timestamp: new Date()
    };

    return apiHandler.success(response);

  } catch (error) {
    console.error('Audit logs fetch error:', error);
    return apiHandler.internalError('Failed to fetch audit logs');
  }
}

async function exportAuditLogs(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Check authentication and permissions
  const authResult = await authMiddleware(request, {
    requireAuth: true,
    allowedUserTypes: ['admin'],
    requiredPermission: 'audit.view'
  });
  if (authResult) return authResult;

  try {
    await connectToDatabase();

    // Parse filters (same as GET but without pagination)
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    const { dateFrom, dateTo, adminId, action, entity, severity, status } = queryParams;

    const filter: any = {};
    if (adminId) filter.adminId = adminId;
    if (action) filter.action = new RegExp(action, 'i');
    if (entity) filter.entity = new RegExp(entity, 'i');
    if (severity) filter.severity = severity;
    if (status) filter.status = status;

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    // Get all matching logs (limit to reasonable amount)
    const auditLogs = await AuditLog.find(filter)
      .populate('adminId', 'name email')
      .sort({ createdAt: -1 })
      .limit(10000) // Safety limit
      .lean();

    // Format for export
    const exportData = auditLogs.map(log => ({
      timestamp: log.createdAt,
      admin: log.adminId?.name || 'System',
      action: log.action,
      entity: log.entity,
      entityId: log.entityId,
      status: log.status,
      severity: log.severity,
      ipAddress: log.ipAddress,
      errorMessage: log.errorMessage || '',
      duration: log.duration || 0
    }));

    return apiHandler.success({
      data: exportData,
      count: exportData.length,
      exportedAt: new Date(),
      filters: { dateFrom, dateTo, adminId, action, entity, severity, status }
    });

  } catch (error) {
    console.error('Audit export error:', error);
    return apiHandler.internalError('Failed to export audit logs');
  }
}

export const GET = withErrorHandler(async (request: NextRequest) => {
  const url = new URL(request.url);
  const export_logs = url.searchParams.get('export');
  
  if (export_logs === 'true') {
    return exportAuditLogs(request);
  }
  
  return getAuditLogs(request);
});