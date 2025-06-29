// app/api/audit/route.ts - COMPLETE IMPLEMENTATION
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { AuditLog } from '@/models/AuditLog';
import { Admin } from '@/models/Admin';
import { withErrorHandler } from '@/middleware/error-handler';
import { authMiddleware } from '@/middleware/auth';
import { apiRateLimit } from '@/middleware/rate-limit';
import { ApiHandler } from '@/lib/api-helpers';
import { FilterParams, PaginationParams, ListResponse as BaseListResponse } from '@/types';

// Extend ListResponse to include optional stats property for audit logs
type ListResponse<T> = BaseListResponse<T> & {
  stats?: Awaited<ReturnType<typeof getAuditStats>>;
};
import { z } from 'zod';
import mongoose from 'mongoose';

// Audit filter validation schema
const auditFilterSchema = z.object({
  page: z.string().transform(Number).pipe(z.number().min(1)).optional().default('1'),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).optional().default('10'),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  adminId: z.string().optional(),
  action: z.string().optional(),
  entity: z.string().optional(),
  severity: z.enum(['Low', 'Medium', 'High', 'Critical']).optional(),
  status: z.enum(['Success', 'Failed', 'Partial']).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  search: z.string().optional(),
  entityId: z.string().optional(),
  ipAddress: z.string().optional(),
  export: z.enum(['true', 'false']).optional()
});

// Audit log creation schema for manual entries
const auditLogCreateSchema = z.object({
  action: z.string().min(1, 'Action is required'),
  entity: z.string().min(1, 'Entity is required'),
  entityId: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
  severity: z.enum(['Low', 'Medium', 'High', 'Critical']).default('Medium'),
  metadata: z.object({
    context: z.any().optional(),
    affectedUsers: z.array(z.string()).optional(),
    relatedEntities: z.array(z.object({
      type: z.string(),
      id: z.string()
    })).optional()
  }).optional()
});

// Helper function to build audit filter query
function buildAuditFilter(params: any) {
  const filter: any = {};

  if (params.adminId) {
    filter.adminId = mongoose.Types.ObjectId.isValid(params.adminId) 
      ? new mongoose.Types.ObjectId(params.adminId) 
      : null;
  }
  
  if (params.action) filter.action = new RegExp(params.action, 'i');
  if (params.entity) filter.entity = new RegExp(params.entity, 'i');
  if (params.severity) filter.severity = params.severity;
  if (params.status) filter.status = params.status;
  if (params.entityId) filter.entityId = new RegExp(params.entityId, 'i');
  if (params.ipAddress) filter.ipAddress = new RegExp(params.ipAddress, 'i');

  // Date range filter
  if (params.dateFrom || params.dateTo) {
    filter.createdAt = {};
    if (params.dateFrom) filter.createdAt.$gte = new Date(params.dateFrom);
    if (params.dateTo) filter.createdAt.$lte = new Date(params.dateTo);
  }

  // Search filter across multiple fields
  if (params.search) {
    filter.$or = [
      { action: { $regex: params.search, $options: 'i' } },
      { entity: { $regex: params.search, $options: 'i' } },
      { entityId: { $regex: params.search, $options: 'i' } },
      { errorMessage: { $regex: params.search, $options: 'i' } },
      { ipAddress: { $regex: params.search, $options: 'i' } }
    ];
  }

  return filter;
}

// Helper function to format audit log response
function formatAuditLog(log: any) {
  return {
    id: String(log._id),
    adminId: log.adminId?._id?.toString() || null,
    adminName: log.adminId?.name || 'System',
    adminEmail: log.adminId?.email || null,
    adminRole: log.adminId?.role || null,
    action: log.action,
    entity: log.entity,
    entityId: log.entityId,
    oldData: log.oldData,
    newData: log.newData,
    changes: log.changes || [],
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    severity: log.severity,
    status: log.status,
    errorMessage: log.errorMessage,
    duration: log.duration,
    metadata: log.metadata,
    createdAt: log.createdAt,
    formattedDate: log.createdAt?.toISOString(),
    timeAgo: getTimeAgo(log.createdAt)
  };
}

// Helper function to calculate time ago
function getTimeAgo(date: Date): string {
  if (!date) return 'Unknown';
  
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return `${seconds} second${seconds !== 1 ? 's' : ''} ago`;
}

// GET /api/audit - List audit logs with filtering and pagination
async function getAuditLogs(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Check authentication and permissions
  const authResult = await authMiddleware(request, {
    requireAuth: true,
    allowedUserTypes: ['admin'],
    requiredPermission: 'audit.view'
  });
  if (authResult) return authResult;

  // Apply rate limiting
  const rateLimitResult = await apiRateLimit(request);
  if (rateLimitResult) return rateLimitResult;

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
      export: exportLogs,
      ...filterParams
    } = validationResult.data;

    // Handle export request
    if (exportLogs === 'true') {
      return exportAuditLogs(request, filterParams);
    }

    // Build filter query
    const filter = buildAuditFilter(filterParams);

    // Get total count for pagination
    const total = await AuditLog.countDocuments(filter);

    // Build aggregation pipeline for enhanced data
    const pipeline: mongoose.PipelineStage[] = [
      { $match: filter },
      
      // Lookup admin information
      {
        $lookup: {
          from: 'admins',
          localField: 'adminId',
          foreignField: '_id',
          as: 'adminId',
          pipeline: [
            {
              $project: {
                _id: 1,
                name: 1,
                email: 1,
                role: 1
              }
            }
          ]
        }
      },
      
      // Unwind admin array to object
      {
        $unwind: {
          path: '$adminId',
          preserveNullAndEmptyArrays: true
        }
      },
      
      // Sort stage
      {
        $sort: { [sortBy]: sortOrder === 'asc' ? 1 : -1 }
      },
      
      // Pagination
      {
        $skip: (page - 1) * limit
      },
      {
        $limit: limit
      }
    ];

    // Execute aggregation
    const auditLogs = await AuditLog.aggregate(pipeline);

    // Format response data
    const formattedLogs = auditLogs.map(formatAuditLog);

    // Get additional statistics for dashboard
    const stats = await getAuditStats(filter);

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
      stats,
      timestamp: new Date()
    };

    // Log the audit view action
    await AuditLog.create({
      adminId: request.headers.get('x-user-id') || null,
      action: 'audit.list',
      entity: 'AuditLog',
      status: 'Success',
      metadata: {
        filters: filterParams,
        resultCount: formattedLogs.length
      },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return apiHandler.success(response);

  } catch (error) {
    console.error('Audit logs fetch error:', error);
    
    // Log the error
    await AuditLog.create({
      adminId: request.headers.get('x-user-id') || null,
      action: 'audit.list',
      entity: 'AuditLog',
      status: 'Failed',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      severity: 'High',
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return apiHandler.internalError('Failed to fetch audit logs');
  }
}

// POST /api/audit - Create manual audit log entry
async function createAuditLog(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Check authentication and permissions
  const authResult = await authMiddleware(request, {
    requireAuth: true,
    allowedUserTypes: ['admin'],
  });
  if (authResult) return authResult;

  // Apply rate limiting
  const rateLimitResult = await apiRateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    await connectToDatabase();

    const body = await request.json();
    const adminId = request.headers.get('x-user-id');

    // Validate request body
    const validationResult = auditLogCreateSchema.safeParse(body);
    if (!validationResult.success) {
      return apiHandler.validationError(
        validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      );
    }

    const { action, entity, entityId, description, severity, metadata } = validationResult.data;

    // Create audit log entry
    const auditLog = await AuditLog.create({
      adminId: adminId || null,
      action,
      entity,
      entityId,
      newData: { description },
      severity,
      status: 'Success',
      metadata,
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    // Populate admin information
    await auditLog.populate('adminId', 'name email role');

    const response = formatAuditLog(auditLog);

    return apiHandler.success(response);

  } catch (error) {
    console.error('Error creating audit log:', error);
    return apiHandler.internalError('Failed to create audit log');
  }
}

// Helper function to get audit statistics
async function getAuditStats(filter: any) {
  try {
    const pipeline: mongoose.PipelineStage[] = [
      { $match: filter },
      {
        $group: {
          _id: null,
          totalActions: { $sum: 1 },
          successfulActions: {
            $sum: { $cond: [{ $eq: ['$status', 'Success'] }, 1, 0] }
          },
          failedActions: {
            $sum: { $cond: [{ $eq: ['$status', 'Failed'] }, 1, 0] }
          },
          criticalSeverity: {
            $sum: { $cond: [{ $eq: ['$severity', 'Critical'] }, 1, 0] }
          },
          highSeverity: {
            $sum: { $cond: [{ $eq: ['$severity', 'High'] }, 1, 0] }
          },
          uniqueAdmins: { $addToSet: '$adminId' },
          uniqueEntities: { $addToSet: '$entity' },
          averageDuration: { $avg: '$duration' }
        }
      }
    ];

    const [stats] = await AuditLog.aggregate(pipeline);

    if (!stats) {
      return {
        totalActions: 0,
        successfulActions: 0,
        failedActions: 0,
        criticalSeverity: 0,
        highSeverity: 0,
        uniqueAdmins: 0,
        uniqueEntities: 0,
        averageDuration: 0,
        successRate: 0
      };
    }

    return {
      totalActions: stats.totalActions,
      successfulActions: stats.successfulActions,
      failedActions: stats.failedActions,
      criticalSeverity: stats.criticalSeverity,
      highSeverity: stats.highSeverity,
      uniqueAdmins: stats.uniqueAdmins.filter(Boolean).length,
      uniqueEntities: stats.uniqueEntities.length,
      averageDuration: Math.round(stats.averageDuration || 0),
      successRate: stats.totalActions > 0 
        ? Math.round((stats.successfulActions / stats.totalActions) * 100) 
        : 0
    };
  } catch (error) {
    console.error('Error calculating audit stats:', error);
    return null;
  }
}

// Export audit logs function
async function exportAuditLogs(request: NextRequest, filterParams: any): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  try {
    const filter = buildAuditFilter(filterParams);

    // Get all matching logs (with reasonable limit for performance)
    const auditLogs = await AuditLog.find(filter)
      .populate('adminId', 'name email role')
      .sort({ createdAt: -1 })
      .limit(10000) // Safety limit
      .lean();

    // Format for export
    const exportData = auditLogs.map(log => ({
      timestamp: log.createdAt?.toISOString(),
      date: log.createdAt?.toLocaleDateString(),
      time: log.createdAt?.toLocaleTimeString(),
      admin: log.adminId?.name || 'System',
      adminEmail: log.adminId?.email || '',
      adminRole: log.adminId?.role || '',
      action: log.action,
      entity: log.entity,
      entityId: log.entityId || '',
      status: log.status,
      severity: log.severity,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      errorMessage: log.errorMessage || '',
      duration: log.duration || 0,
      changes: log.changes?.length || 0,
      hasOldData: !!log.oldData,
      hasNewData: !!log.newData
    }));

    // Log the export action
    await AuditLog.create({
      adminId: request.headers.get('x-user-id') || null,
      action: 'audit.export',
      entity: 'AuditLog',
      status: 'Success',
      metadata: {
        exportedCount: exportData.length,
        filters: filterParams
      },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return apiHandler.success({
      data: exportData,
      count: exportData.length,
      exportedAt: new Date().toISOString(),
      filters: filterParams,
      filename: `audit-logs-${new Date().toISOString().split('T')[0]}.csv`
    });

  } catch (error) {
    console.error('Audit export error:', error);
    
    // Log the export error
    await AuditLog.create({
      adminId: request.headers.get('x-user-id') || null,
      action: 'audit.export',
      entity: 'AuditLog',
      status: 'Failed',
      errorMessage: error instanceof Error ? error.message : 'Export failed',
      severity: 'High',
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return apiHandler.internalError('Failed to export audit logs');
  }
}

// DELETE /api/audit - Bulk delete audit logs (SuperAdmin only)
async function deleteAuditLogs(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Check authentication and permissions
  const authResult = await authMiddleware(request, {
    requireAuth: true,
    allowedUserTypes: ['admin'],
    requiredPermission: 'audit.delete'
  });
  if (authResult) return authResult;

  try {
    await connectToDatabase();

    const body = await request.json();
    const { ids, olderThan } = body;
    const adminId = request.headers.get('x-user-id');

    let deleteFilter: any = {};
    let deletedCount = 0;

    if (ids && Array.isArray(ids)) {
      // Delete specific audit logs by IDs
      deleteFilter._id = { $in: ids.map(id => new mongoose.Types.ObjectId(id)) };
    } else if (olderThan) {
      // Delete audit logs older than specified date
      deleteFilter.createdAt = { $lt: new Date(olderThan) };
    } else {
      return apiHandler.badRequest('Either ids array or olderThan date is required');
    }

    // Get count before deletion for logging
    const countBeforeDelete = await AuditLog.countDocuments(deleteFilter);

    // Perform deletion
    const deleteResult = await AuditLog.deleteMany(deleteFilter);
    deletedCount = deleteResult.deletedCount || 0;

    // Log the deletion action
    await AuditLog.create({
      adminId: adminId || null,
      action: 'audit.delete',
      entity: 'AuditLog',
      status: 'Success',
      metadata: {
        deletedCount,
        criteria: ids ? 'specific_ids' : 'date_range',
        filter: deleteFilter
      },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return apiHandler.success({
      message: `Successfully deleted ${deletedCount} audit log(s)`,
      deletedCount,
      requestedCount: countBeforeDelete
    });

  } catch (error) {
    console.error('Error deleting audit logs:', error);
    
    // Log the deletion error
    await AuditLog.create({
      adminId: request.headers.get('x-user-id') || null,
      action: 'audit.delete',
      entity: 'AuditLog',
      status: 'Failed',
      errorMessage: error instanceof Error ? error.message : 'Deletion failed',
      severity: 'High',
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return apiHandler.internalError('Failed to delete audit logs');
  }
}

// Export handlers with error handling
export const GET = withErrorHandler(getAuditLogs);
export const POST = withErrorHandler(createAuditLog);
export const DELETE = withErrorHandler(deleteAuditLogs);