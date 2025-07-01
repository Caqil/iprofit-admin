// app/api/user/tasks/[id]/submit/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/config/auth';
import { z } from 'zod';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Task, TaskSubmission } from '@/models/Task';
import { AuditLog } from '@/models/AuditLog';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import { objectIdValidator } from '@/utils/validators';
import { sendEmail } from '@/lib/email';
import mongoose from 'mongoose';
import { getUserFromRequest } from '@/lib/auth-helper';

// Next.js 15 Route Handler with proper params typing
interface RouteContext {
  params: Promise<{ id: string }>;
}

// Task submission validation schema
const taskSubmissionSchema = z.object({
  proof: z.array(z.object({
    type: z.string().min(1, 'Proof type is required'),
    content: z.string().min(1, 'Proof content is required')
  })).min(1, 'At least one proof is required'),
  submissionNote: z.string().max(1000, 'Submission note too long').optional(),
  deviceId: z.string().min(1, 'Device ID is required'),
  
  // Additional validation fields
  confirmGuidelines: z.boolean().refine(val => val === true, 'You must confirm you have followed the task guidelines'),
  acceptTerms: z.boolean().refine(val => val === true, 'You must accept the terms and conditions')
});

export interface TaskSubmissionResponse {
  success: boolean;
  submissionId: string;
  taskId: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  reward: number;
  estimatedReviewTime: string;
  message: string;
  nextSteps: string[];
  submissionDetails: {
    submittedAt: Date;
    proofCount: number;
    taskName: string;
    category: string;
    difficulty: string;
  };
  timeline: {
    submitted: Date;
    estimatedReview: Date;
    estimatedApproval: Date;
  };
  tips: string[];
  relatedTasks: {
    id: string;
    name: string;
    reward: number;
    difficulty: string;
  }[];
}

// POST /api/user/tasks/[id]/submit - Submit task for review
async function submitTaskHandler(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  try {
    await connectToDatabase();

    // Check authentication
  const authResult = await getUserFromRequest(request);
     if (!authResult) {
       return apiHandler.unauthorized('Authentication required');
     }
    const userId = authResult.userId;
    
    // Await the params Promise (Next.js 15 requirement)
    const { id } = await context.params;

    // Validate task ID
    const idValidation = objectIdValidator.safeParse(id);
    if (!idValidation.success) {
      return apiHandler.badRequest('Invalid task ID format');
    }

    const taskId = id;

    // Parse and validate request body
    const body = await request.json();
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

    const { proof, submissionNote, deviceId } = validationResult.data;
    const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    // Get user and task details
    const [user, task] = await Promise.all([
      User.findById(userId).select('status emailVerified name email balance'),
      Task.findById(taskId).select('name description reward currency category difficulty status validFrom validUntil maxCompletions currentCompletions isRepeatable cooldownPeriod requiredProof')
    ]);

    if (!user) {
      return apiHandler.notFound('User not found');
    }

    if (!task) {
      return apiHandler.notFound('Task not found');
    }

    // Check user account status
    if (user.status !== 'Active') {
      return apiHandler.forbidden(`Account is ${user.status.toLowerCase()}`);
    }

    if (!user.emailVerified) {
      return apiHandler.forbidden('Email verification required to submit tasks');
    }

    // Check task availability
    const now = new Date();
    if (task.status !== 'Active') {
      return apiHandler.badRequest('Task is not currently active');
    }

    if (task.validFrom > now) {
      return apiHandler.badRequest('Task is not yet available');
    }

    if (task.validUntil && task.validUntil < now) {
      return apiHandler.badRequest('Task has expired');
    }

    if (task.maxCompletions && task.currentCompletions >= task.maxCompletions) {
      return apiHandler.badRequest('Task has reached maximum completions');
    }

    // Check user's previous submissions for this task
    const existingSubmissions = await TaskSubmission.find({
      taskId: task._id,
      userId: user._id
    }).sort({ createdAt: -1 });

    // Check submission eligibility
    if (existingSubmissions.length > 0) {
      const latestSubmission = existingSubmissions[0];

      if (!task.isRepeatable) {
        if (latestSubmission.status === 'Approved') {
          return apiHandler.badRequest('You have already completed this task');
        }
        if (latestSubmission.status === 'Pending') {
          return apiHandler.badRequest('You have a pending submission for this task');
        }
        // Allow resubmission only if previous was rejected
      } else {
        // For repeatable tasks, check cooldown
        if (latestSubmission.status === 'Pending') {
          return apiHandler.badRequest('You have a pending submission for this task');
        }
        
        if (task.cooldownPeriod && latestSubmission.status === 'Approved') {
          const cooldownEnd = new Date(latestSubmission.createdAt.getTime() + task.cooldownPeriod * 60 * 60 * 1000);
          if (now < cooldownEnd) {
            return apiHandler.badRequest(`Task is in cooldown period until ${cooldownEnd.toLocaleString()}`);
          }
        }
      }
    }

    // Validate proof requirements
    if (proof.length < task.requiredProof.length) {
      return apiHandler.badRequest(`This task requires ${task.requiredProof.length} proof items`);
    }

    // Check proof types match requirements
    const requiredProofTypes = task.requiredProof || [];
    const submittedProofTypes = proof.map(p => p.type.toLowerCase());
    
    for (const requiredType of requiredProofTypes) {
      const isProvided = submittedProofTypes.some(submitted => 
        submitted.includes(requiredType.toLowerCase()) || 
        requiredType.toLowerCase().includes(submitted)
      );
      
      if (!isProvided) {
        return apiHandler.badRequest(`Missing required proof type: ${requiredType}`);
      }
    }

    // Start database transaction
    const session_db = await mongoose.startSession();

    try {
      const result = await session_db.withTransaction(async () => {
        // Create task submission
        const submission = await TaskSubmission.create([{
          taskId: task._id,
          userId: user._id,
          status: 'Pending',
          proof: proof.map(p => ({
            type: p.type,
            content: p.content,
            uploadedAt: new Date()
          })),
          submissionNote: submissionNote || null,
          reward: task.reward
        }], { session: session_db });

        const submissionDoc = submission[0];

        // Create audit log
        await AuditLog.create([{
          userId: user._id,
          action: 'task.submit',
          entity: 'TaskSubmission',
          entityId: submissionDoc._id.toString(),
          changes: [{
            field: 'status',
            oldValue: null,
            newValue: 'Pending'
          }],
          ipAddress: clientIP,
          userAgent,
          status: 'Success',
          severity: 'Medium',
          metadata: {
            taskId: task._id.toString(),
            taskName: task.name,
            taskCategory: task.category,
            taskReward: task.reward,
            proofCount: proof.length,
            deviceId
          }
        }], { session: session_db });

        // Calculate timeline estimates
        const submittedAt = new Date();
        const estimatedReviewTime = getEstimatedReviewTime(task.difficulty);
        const estimatedReview = new Date(submittedAt.getTime() + estimatedReviewTime * 60 * 60 * 1000);
        const estimatedApproval = new Date(estimatedReview.getTime() + 2 * 60 * 60 * 1000); // 2 hours for processing

        // Get related tasks for recommendations
        const relatedTasks = await Task.find({
          _id: { $ne: task._id },
          category: task.category,
          status: 'Active',
          validFrom: { $lte: now },
          $or: [
            { validUntil: { $exists: false } },
            { validUntil: null },
            { validUntil: { $gt: now } }
          ]
        })
          .select('name reward difficulty')
          .limit(3)
          .lean();

        // Generate next steps and tips
        const nextSteps = [
          'Your submission has been received and is pending review',
          'You will receive an email notification when it\'s reviewed',
          'Check back in 24-48 hours for the review result',
          'Complete other available tasks while waiting'
        ];

        const tips = [
          'Ensure all proof materials are clear and complete',
          'Double-check that you\'ve followed all task instructions',
          'Keep your proof materials until the task is approved',
          'Be patient - quality reviews take time'
        ];

        // Send notification email
        try {
          await sendEmail({
            to: user.email,
            subject: `Task Submission Received - ${task.name}`,
            templateId: 'task_submission_received',
            variables: {
              userName: user.name,
              taskName: task.name,
              reward: `${task.reward} ${task.currency}`,
              estimatedReviewTime: `${estimatedReviewTime} hours`,
              submissionId: submissionDoc._id.toString(),
              submissionDate: submittedAt.toLocaleDateString()
            }
          });
        } catch (emailError) {
          console.error('Failed to send task submission email:', emailError);
          // Don't fail the submission if email fails
        }

        const response: TaskSubmissionResponse = {
          success: true,
          submissionId: submissionDoc._id.toString(),
          taskId: task._id.toString(),
          status: 'Pending',
          reward: task.reward,
          estimatedReviewTime: `${estimatedReviewTime} hours`,
          message: 'Task submission received successfully and is pending review',
          nextSteps,
          submissionDetails: {
            submittedAt,
            proofCount: proof.length,
            taskName: task.name,
            category: task.category,
            difficulty: task.difficulty
          },
          timeline: {
            submitted: submittedAt,
            estimatedReview,
            estimatedApproval
          },
          tips,
          relatedTasks: relatedTasks.map(t => ({
            id: t.id.toString(),
            name: t.name,
            reward: t.reward,
            difficulty: t.difficulty
          }))
        };

        return response;
      });

      return apiHandler.success(result, 'Task submitted successfully');

    } finally {
      await session_db.endSession();
    }

  } catch (error) {
    console.error('Task Submit API Error:', error);
    return apiHandler.internalError('Failed to submit task');
  }
}

// Helper function to estimate review time based on task difficulty
function getEstimatedReviewTime(difficulty: string): number {
  switch (difficulty) {
    case 'Easy':
      return 12; // 12 hours
    case 'Medium':
      return 24; // 24 hours
    case 'Hard':
      return 48; // 48 hours
    default:
      return 24;
  }
}

export const POST = withErrorHandler(submitTaskHandler);