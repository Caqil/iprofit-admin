import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Task, ITask } from '@/models/Task';
import { User } from '@/models/User';
import { AuditLog } from '@/models/AuditLog';
import { authMiddleware } from '@/middleware/auth';
import { apiRateLimit } from '@/middleware/rate-limit';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler, createPaginatedResponse, createMatchStage, createSortStage, createPaginationStages } from '@/lib/api-helpers';
import { taskValidator } from '@/utils/validators';
import { TASK_CONFIG } from '@/utils/constants';
import { TaskFilter, PaginationParams } from '@/types';
import { z } from 'zod';
import mongoose from 'mongoose';

// Task list query validation schema
const taskListQuerySchema = z.object({
  page: z.string().optional().default('1').transform(val => {
    const num = parseInt(val, 10);
    return isNaN(num) || num < 1 ? 1 : num;
  }),
  limit: z.string().optional().default('10').transform(val => {
    const num = parseInt(val, 10);
    return isNaN(num) || num < 1 ? 10 : Math.min(num, 100);
  }),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  
  // Search and filters
  search: z.string().optional(),
  status: z.enum(['Active', 'Inactive', 'Paused']).optional(),
  category: z.string().optional(),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']).optional(),
  rewardMin: z.string().optional().transform(val => {
    if (!val || val === '') return undefined;
    const num = parseFloat(val);
    return isNaN(num) ? undefined : num;
  }),
  rewardMax: z.string().optional().transform(val => {
    if (!val || val === '') return undefined;
    const num = parseFloat(val);
    return isNaN(num) ? undefined : num;
  }),
  hasSubmissions: z.string().optional().transform(val => {
    if (!val || val === '') return undefined;
    return val === 'true';
  }),
  validityPeriod: z.enum(['active', 'expired', 'upcoming']).optional()
});

// GET /api/tasks - List tasks with filtering and pagination
async function getTasksHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Apply middleware
  const authResult = await authMiddleware(request, {
    requireAuth: true,
    allowedUserTypes: ['admin'],
    requiredPermission: 'tasks.view'
  });
  if (authResult) return authResult;

  const rateLimitResult = await apiRateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    await connectToDatabase();

    // Parse and validate query parameters
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    const validationResult = taskListQuerySchema.safeParse(queryParams);

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
      page,
      limit,
      sortBy,
      sortOrder,
      search,
      status,
      category,
      difficulty,
      rewardMin,
      rewardMax,
      hasSubmissions,
      validityPeriod
    } = validationResult.data;

    console.log('📋 Tasks API - Request params:', validationResult.data);

    // Build aggregation pipeline
    const pipeline: mongoose.PipelineStage[] = [];

    // Match stage for filtering
    const matchConditions: any = {};

    if (search) {
      matchConditions.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) {
      matchConditions.status = status;
    }

    if (category) {
      matchConditions.category = category;
    }

    if (difficulty) {
      matchConditions.difficulty = difficulty;
    }

    if (rewardMin !== undefined || rewardMax !== undefined) {
      matchConditions.reward = {};
      if (rewardMin !== undefined) matchConditions.reward.$gte = rewardMin;
      if (rewardMax !== undefined) matchConditions.reward.$lte = rewardMax;
    }

    // Validity period filter
    if (validityPeriod) {
      const now = new Date();
      if (validityPeriod === 'active') {
        matchConditions.validFrom = { $lte: now };
        matchConditions.$or = [
          { validUntil: null },
          { validUntil: { $gte: now } }
        ];
      } else if (validityPeriod === 'expired') {
        matchConditions.validUntil = { $lt: now };
      } else if (validityPeriod === 'upcoming') {
        matchConditions.validFrom = { $gt: now };
      }
    }

    if (Object.keys(matchConditions).length > 0) {
      pipeline.push({ $match: matchConditions });
    }

    // Lookup submissions for hasSubmissions filter and stats
    pipeline.push({
      $lookup: {
        from: 'task_submissions',
        localField: '_id',
        foreignField: 'taskId',
        as: 'submissions'
      }
    });

    // Add submission stats
    pipeline.push({
      $addFields: {
        totalSubmissions: { $size: '$submissions' },
        approvedSubmissions: {
          $size: {
            $filter: {
              input: '$submissions',
              cond: { $eq: ['$$this.status', 'Approved'] }
            }
          }
        },
        pendingSubmissions: {
          $size: {
            $filter: {
              input: '$submissions',
              cond: { $eq: ['$$this.status', 'Pending'] }
            }
          }
        },
        rejectedSubmissions: {
          $size: {
            $filter: {
              input: '$submissions',
              cond: { $eq: ['$$this.status', 'Rejected'] }
            }
          }
        }
      }
    });

    // Filter by hasSubmissions
    if (hasSubmissions !== undefined) {
      pipeline.push({
        $match: {
          totalSubmissions: hasSubmissions ? { $gt: 0 } : { $eq: 0 }
        }
      });
    }

    // Remove submissions array (no longer needed)
    pipeline.push({
      $project: {
        submissions: 0
      }
    });

    // Sort stage
    const sortStage = createSortStage(sortBy, sortOrder);
    pipeline.push(sortStage);

    console.log('🔄 Tasks API - Aggregation pipeline:', JSON.stringify(pipeline, null, 2));

    // Get total count for pagination
    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await Task.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    console.log('📈 Tasks API - Total count:', total);

    // Add pagination
    const paginationStages = createPaginationStages(page, limit);
    pipeline.push(...paginationStages);

    // Execute the aggregation
    const tasks = await Task.aggregate(pipeline);

    console.log('📋 Tasks API - Found tasks:', tasks.length);

    // Log audit
    await AuditLog.create({
      adminId: request.headers.get('x-user-id'),
      action: 'tasks.list',
      entity: 'Task',
      status: 'Success',
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      metadata: {
        filters: { status, category, difficulty, search },
        resultCount: tasks.length,
        totalCount: total
      }
    });

    // Create paginated response
    const response = createPaginatedResponse(tasks, total, page, limit);

    return apiHandler.success(response);

  } catch (error) {
    console.error('❌ Tasks API - Error:', error);
    return apiHandler.internalError('Failed to fetch tasks');
  }
}

// POST /api/tasks - Create a new task
async function createTaskHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Apply middleware
  const authResult = await authMiddleware(request, {
    requireAuth: true,
    allowedUserTypes: ['admin'],
    requiredPermission: 'tasks.create'
  });
  if (authResult) return authResult;

  const rateLimitResult = await apiRateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    await connectToDatabase();

    const adminId = request.headers.get('x-user-id');
    const body = await request.json();

    console.log('📝 Tasks API - Create request body:', body);

    // Validate request body
    const validationResult = taskValidator.safeParse(body);
    if (!validationResult.success) {
      return apiHandler.validationError(
        validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      );
    }

    const taskData = validationResult.data;

    // Check if task name already exists
    const existingTask = await Task.findOne({ 
      name: taskData.name,
      status: { $ne: 'Inactive' }
    });

    if (existingTask) {
      return apiHandler.badRequest('Task with this name already exists');
    }

    // Validate dates
    if (taskData.validUntil && taskData.validUntil <= taskData.validFrom) {
      return apiHandler.badRequest('End date must be after start date');
    }

    // Create the task
    const newTask = new Task({
      ...taskData,
      currentCompletions: 0
    });

    await newTask.save();

    console.log('✅ Tasks API - Task created:', newTask._id);

    // Log audit
    await AuditLog.create({
      adminId,
      action: 'tasks.create',
      entity: 'Task',
      entityId: newTask._id.toString(),
      status: 'Success',
      metadata: {
        taskName: newTask.name,
        category: newTask.category,
        reward: newTask.reward,
        difficulty: newTask.difficulty
      },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return apiHandler.created({
      id: newTask._id,
      name: newTask.name,
      message: 'Task created successfully'
    });

  } catch (error) {
    console.error('❌ Tasks API - Create error:', error);
    return apiHandler.handleError(error);
  }
}

// Main route handlers
export async function GET(request: NextRequest) {
  return withErrorHandler(getTasksHandler)(request);
}

export async function POST(request: NextRequest) {
  return withErrorHandler(createTaskHandler)(request);
}