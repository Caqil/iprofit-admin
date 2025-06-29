
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { TaskSubmission, Task } from '@/models/Task';
import { User } from '@/models/User';
import { Transaction } from '@/models/Transaction';
import { AuditLog } from '@/models/AuditLog';
import { authMiddleware } from '@/middleware/auth';
import { apiRateLimit } from '@/middleware/rate-limit';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import { sendEmail } from '@/lib/email';
import { z } from 'zod';
import mongoose from 'mongoose';

// Bulk submission processing schema
const bulkSubmissionSchema = z.object({
  submissionIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid submission ID')).min(1),
  action: z.enum(['approve', 'reject']),
  reviewNote: z.string().optional()
});

// POST /api/tasks/submissions/bulk - Bulk process task submissions
async function bulkProcessSubmissionsHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Apply middleware
  const authResult = await authMiddleware(request, {
    requireAuth: true,
    allowedUserTypes: ['admin'],
    requiredPermission: 'tasks.approve'
  });
  if (authResult) return authResult;

  const rateLimitResult = await apiRateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    await connectToDatabase();

    const adminId = request.headers.get('x-user-id');
    const body = await request.json();

    console.log('📝 Task Submissions Bulk API - Process request:', body);

    // Validate request body
    const validationResult = bulkSubmissionSchema.safeParse(body);
    if (!validationResult.success) {
      return apiHandler.validationError(
        validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      );
    }

    const { submissionIds, action, reviewNote } = validationResult.data;

    // Find submissions with task and user details
    const submissions = await TaskSubmission.find({
      _id: { $in: submissionIds },
      status: 'Pending'
    })
    .populate('taskId', 'name reward category')
    .populate('userId', 'name email balance');

    if (submissions.length === 0) {
      return apiHandler.badRequest('No pending submissions found');
    }

    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [] as any[]
    };

    // Start session for transaction
    const session = await mongoose.startSession();
    
    try {
      await session.withTransaction(async () => {
        for (const submission of submissions) {
          try {
            results.processed++;

            const task = submission.taskId as any;
            const user = submission.userId as any;

            // Update submission
            submission.status = action === 'approve' ? 'Approved' : 'Rejected';
            submission.reviewNote = reviewNote;
            submission.reviewedBy = adminId ? new mongoose.Types.ObjectId(adminId) : undefined;
            submission.reviewedAt = new Date();

            // If approved, process reward
            if (action === 'approve') {
              // Create reward transaction
              const transaction = new Transaction({
                userId: user._id,
                type: 'bonus',
                amount: submission.reward,
                currency: 'BDT',
                status: 'Approved',
                gateway: 'System',
                description: `Task reward: ${task.name}`,
                fees: 0,
                netAmount: submission.reward,
                metadata: {
                  taskId: task._id,
                  submissionId: submission._id,
                  taskName: task.name,
                  bulkProcessed: true
                }
              });

              await transaction.save({ session });

              // Update user balance
              await User.findByIdAndUpdate(
                user._id,
                { $inc: { balance: submission.reward } },
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
            }

            await submission.save({ session });

            // Send email notification (async, don't await)
            setImmediate(async () => {
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
                console.error('Failed to send bulk notification email:', emailError);
              }
            });

            results.successful++;

          } catch (error) {
            results.failed++;
            results.errors.push({
              submissionId: submission._id,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
      });

    } finally {
      session.endSession();
    }

    // Log audit
    await AuditLog.create({
      adminId,
      action: `task_submissions.bulk_${action}`,
      entity: 'TaskSubmission',
      status: 'Success',
      metadata: {
        totalRequested: submissionIds.length,
        processed: results.processed,
        successful: results.successful,
        failed: results.failed,
        reviewNote: reviewNote || null
      },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return apiHandler.success({
      message: `Bulk ${action} completed`,
      results
    });

  } catch (error) {
    console.error('❌ Task Submissions Bulk API - Error:', error);
    return apiHandler.handleError(error);
  }
}

export async function POST(request: NextRequest) {
  return withErrorHandler(bulkProcessSubmissionsHandler)(request);
}