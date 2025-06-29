import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Task, TaskSubmission, ITaskSubmission } from '@/models/Task';
import { User } from '@/models/User';
import { Transaction } from '@/models/Transaction';
import { AuditLog } from '@/models/AuditLog';
import { authMiddleware } from '@/middleware/auth';
import { apiRateLimit } from '@/middleware/rate-limit';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler, createPaginatedResponse, createSortStage, createPaginationStages } from '@/lib/api-helpers';
import { sendEmail } from '@/lib/email';
import { TASK_CONFIG } from '@/utils/constants';
import { z } from 'zod';
import mongoose from 'mongoose';

// Task submission list query validation
const submissionListQuerySchema = z.object({
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
  
  // Filters
  taskId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  userId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  status: z.enum(['Pending', 'Approved', 'Rejected']).optional(),
  search: z.string().optional()
});

// Task submission validation schema
const taskSubmissionSchema = z.object({
  submissionId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid submission ID'),
  action: z.enum(['approve', 'reject']),
  reviewNote: z.string().optional(),
  adjustedReward: z.number().min(0).optional()
});

// GET /api/tasks/submissions - List task submissions
async function getSubmissionsHandler(request: NextRequest): Promise<NextResponse> {
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
    const validationResult = submissionListQuerySchema.safeParse(queryParams);

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
      taskId,
      userId,
      status,
      search
    } = validationResult.data;

    console.log('📋 Task Submissions API - Request params:', validationResult.data);

    // Build aggregation pipeline
    const pipeline: mongoose.PipelineStage[] = [];

    // Match stage
    const matchConditions: any = {};

    if (taskId) {
      matchConditions.taskId = new mongoose.Types.ObjectId(taskId);
    }

    if (userId) {
      matchConditions.userId = new mongoose.Types.ObjectId(userId);
    }

    if (status) {
      matchConditions.status = status;
    }

    if (Object.keys(matchConditions).length > 0) {
      pipeline.push({ $match: matchConditions });
    }

    // Lookup task details
    pipeline.push({
      $lookup: {
        from: 'tasks',
        localField: 'taskId',
        foreignField: '_id',
        as: 'task'
      }
    });

    // Lookup user details
    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user'
      }
    });

    // Lookup reviewer details
    pipeline.push({
      $lookup: {
        from: 'admins',
        localField: 'reviewedBy',
        foreignField: '_id',
        as: 'reviewer'
      }
    });

    // Unwind lookups
    pipeline.push(
      { $unwind: { path: '$task', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$reviewer', preserveNullAndEmptyArrays: true } }
    );

    // Search filter
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { 'task.name': { $regex: search, $options: 'i' } },
            { 'user.name': { $regex: search, $options: 'i' } },
            { 'user.email': { $regex: search, $options: 'i' } },
            { submissionNote: { $regex: search, $options: 'i' } }
          ]
        }
      });
    }

    // Project required fields
    pipeline.push({
      $project: {
        _id: 1,
        taskId: 1,
        userId: 1,
        status: 1,
        proof: 1,
        submissionNote: 1,
        reviewNote: 1,
        reviewedAt: 1,
        reward: 1,
        transactionId: 1,
        createdAt: 1,
        updatedAt: 1,
        task: {
          _id: '$task._id',
          name: '$task.name',
          category: '$task.category',
          difficulty: '$task.difficulty'
        },
        user: {
          _id: '$user._id',
          name: '$user.name',
          email: '$user.email'
        },
        reviewer: {
          _id: '$reviewer._id',
          name: '$reviewer.name',
          email: '$reviewer.email'
        }
      }
    });

    // Sort stage
    const sortStage = createSortStage(sortBy, sortOrder);
    pipeline.push(sortStage);

    // Get total count
    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await TaskSubmission.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    // Add pagination
    const paginationStages = createPaginationStages(page, limit);
    pipeline.push(...paginationStages);

    // Execute aggregation
    const submissions = await TaskSubmission.aggregate(pipeline);

    console.log('📋 Task Submissions API - Found submissions:', submissions.length);

    // Log audit
    await AuditLog.create({
      adminId: request.headers.get('x-user-id'),
      action: 'task_submissions.list',
      entity: 'TaskSubmission',
      status: 'Success',
      metadata: {
        filters: { taskId, userId, status, search },
        resultCount: submissions.length,
        totalCount: total
      },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    // Create paginated response
    const response = createPaginatedResponse(submissions, total, page, limit);

    return apiHandler.success(response);

  } catch (error) {
    console.error('❌ Task Submissions API - Error:', error);
    return apiHandler.internalError('Failed to fetch task submissions');
  }
}

// POST /api/tasks/submissions - Process task submission (approve/reject)
async function processSubmissionHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Apply middleware
  const authResult = await authMiddleware(request, {
    requireAuth: true,
    allowedUserTypes: ['admin'],
    requiredPermission: 'tasks.read'
  });
  if (authResult) return authResult;

  const rateLimitResult = await apiRateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    await connectToDatabase();

    const adminId = request.headers.get('x-user-id');
    const body = await request.json();

    console.log('📝 Task Submissions API - Process request:', body);

    // Validate request body
    const validationResult = taskSubmissionSchema.safeParse(body);
    if (!validationResult.success) {
      return apiHandler.validationError(
        validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      );
    }

    const { submissionId, action, reviewNote, adjustedReward } = validationResult.data;

    // Find submission with task and user details
    const submission = await TaskSubmission.findById(submissionId)
      .populate('taskId', 'name reward category difficulty maxCompletions currentCompletions')
      .populate('userId', 'name email balance');

    if (!submission) {
      return apiHandler.notFound('Task submission not found');
    }

    if (submission.status !== 'Pending') {
      return apiHandler.badRequest('Submission has already been processed');
    }

    const task = submission.taskId as any;
    const user = submission.userId as any;

    // Start session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Update submission
      submission.status = action === 'approve' ? 'Approved' : 'Rejected';
      submission.reviewNote = reviewNote;
      if (!adminId) {
        throw new Error('Missing adminId in request headers');
      }
      submission.reviewedBy = new mongoose.Types.ObjectId(adminId);
      submission.reviewedAt = new Date();

      // If approved, process reward
      if (action === 'approve') {
        const rewardAmount = adjustedReward || submission.reward;

        // Create reward transaction
        const transaction = new Transaction({
          userId: user._id,
          type: 'bonus', // Using the correct transaction type for task rewards
          amount: rewardAmount,
          currency: 'BDT',
          status: 'Approved',
          gateway: 'System',
          description: `Task reward: ${task.name}`,
          fees: 0,
          netAmount: rewardAmount,
          metadata: {
            taskId: task._id,
            submissionId: submission._id,
            taskName: task.name,
            originalReward: submission.reward,
            adjustedReward: rewardAmount
          }
        });

        await transaction.save({ session });

        // Update user balance
        await User.findByIdAndUpdate(
          user._id,
          { $inc: { balance: rewardAmount } },
          { session }
        );

        // Update task completion count
        await Task.findByIdAndUpdate(
          task._id,
          { $inc: { currentCompletions: 1 } },
          { session }
        );

        // Link transaction to submission
        submission.transactionId = transaction._id;
        submission.reward = rewardAmount;

        console.log(`✅ Task reward processed: ${rewardAmount} BDT for user ${user.name}`);
      }

      await submission.save({ session });

      // Commit transaction
      await session.commitTransaction();

      // Send email notification
      try {
        const templateId = action === 'approve' ? 'taskApproved' : 'taskRejected';
        
        await sendEmail({
          to: user.email,
          templateId,
          subject: action === 'approve' ? 'Task Approved' : 'Task Rejected',
          variables: {
            userName: user.name,
            taskName: task.name,
            reward: action === 'approve' ? `${submission.reward} BDT` : null,
            rejectionReason: action === 'reject' ? reviewNote : null,
            completedDate: action === 'approve' ? new Date().toLocaleDateString() : null,
            accountUrl: `${process.env.NEXTAUTH_URL}/user/account`,
            resubmitUrl: action === 'reject' ? `${process.env.NEXTAUTH_URL}/user/tasks/${task._id}` : null
          }
        });
      } catch (emailError) {
        console.error('Failed to send task notification email:', emailError);
      }

      // Log audit
      await AuditLog.create({
        adminId,
        action: `task_submissions.${action}`,
        entity: 'TaskSubmission',
        entityId: submission._id.toString(),
        status: 'Success',
        metadata: {
          taskName: task.name,
          userName: user.name,
          userEmail: user.email,
          reward: action === 'approve' ? submission.reward : null,
          reviewNote: reviewNote || null
        },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      });

      return apiHandler.success({
        submissionId: submission._id,
        status: submission.status,
        message: `Task submission ${action}d successfully`,
        rewardProcessed: action === 'approve',
        emailSent: true
      });

    } catch (sessionError) {
      await session.abortTransaction();
      throw sessionError;
    } finally {
      session.endSession();
    }

  } catch (error) {
    console.error('❌ Task Submissions API - Process error:', error);
    return apiHandler.handleError(error);
  }
}

// Main route handlers for submissions
export async function GET(request: NextRequest) {
  return withErrorHandler(getSubmissionsHandler)(request);
}

export async function POST(request: NextRequest) {
  return withErrorHandler(processSubmissionHandler)(request);
}