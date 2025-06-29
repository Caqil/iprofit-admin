import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Plan } from '@/models/Plan';
import { AuditLog } from '@/models/AuditLog';
import { authMiddleware } from '@/middleware/auth';
import { apiRateLimit } from '@/middleware/rate-limit';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import { sendEmail } from '@/lib/email';
import { objectIdValidator } from '@/utils/validators';
import { z } from 'zod';
import mongoose from 'mongoose';

// Bulk action validation schema
const bulkActionSchema = z.object({
  userIds: z.array(objectIdValidator).min(1, 'At least one user ID is required').max(100, 'Maximum 100 users allowed'),
  action: z.enum(['activate', 'suspend', 'ban', 'approve_kyc', 'reject_kyc', 'upgrade_plan']),
  metadata: z.object({
    reason: z.string().optional(),
    planId: objectIdValidator.optional(),
    rejectionReason: z.string().optional()
  }).optional()
});

async function bulkActionsHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Apply middleware
  const authResult = await authMiddleware(request, {
    requireAuth: true,
    allowedUserTypes: ['admin'],
    //requiredPermission: 'users.bulk_actions'
  });
  if (authResult) return authResult;

  const rateLimitResult = await apiRateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    await connectToDatabase();

    const adminId = request.headers.get('x-user-id');
    const body = await request.json();
    const validationResult = bulkActionSchema.safeParse(body);

    if (!validationResult.success) {
      return apiHandler.validationError(
        validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      );
    }

    const { userIds, action, metadata = {} } = validationResult.data;

    // Check if all users exist
    const users = await User.find({ _id: { $in: userIds } }).select('_id name email status kycStatus planId');
    
    if (users.length !== userIds.length) {
      const foundIds = users.map(u => u._id.toString());
      const missingIds = userIds.filter(id => !foundIds.includes(id));
      return apiHandler.badRequest(`Users not found: ${missingIds.join(', ')}`);
    }

    const results = {
      successful: [] as string[],
      failed: [] as { userId: string; error: string }[],
      total: userIds.length
    };

    // Process each action
    switch (action) {
      case 'activate':
      case 'suspend':
      case 'ban':
        await processBulkStatusUpdate(users, action, metadata.reason, results, adminId);
        break;
        
      case 'approve_kyc':
      case 'reject_kyc':
        await processBulkKYCUpdate(users, action, metadata.rejectionReason, results, adminId);
        break;
        
      case 'upgrade_plan':
        if (!metadata.planId) {
          return apiHandler.badRequest('Plan ID is required for upgrade action');
        }
        await processBulkPlanUpgrade(users, metadata.planId, results, adminId);
        break;
        
      default:
        return apiHandler.badRequest('Invalid action');
    }

    // Log bulk audit
    await AuditLog.create({
      adminId,
      action: `users.bulk_${action}`,
      entity: 'User',
      status: results.failed.length === 0 ? 'Success' : 'Partial',
      metadata: {
        action,
        totalUsers: results.total,
        successful: results.successful.length,
        failed: results.failed.length,
        failedUsers: results.failed,
        reason: metadata.reason || null
      },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return apiHandler.success({
      message: `Bulk ${action} completed`,
      results: {
        total: results.total,
        successful: results.successful.length,
        failed: results.failed.length,
        failedUsers: results.failed
      }
    });

  } catch (error) {
    return apiHandler.handleError(error);
  }
}

// Helper function for bulk status updates
async function processBulkStatusUpdate(
  users: any[],
  action: string,
  reason: string | undefined,
  results: any,
  adminId: string | null
) {
  const statusMap = {
    activate: 'Active',
    suspend: 'Suspended',
    ban: 'Banned'
  };

  const newStatus = statusMap[action as keyof typeof statusMap];

  for (const user of users) {
    try {
      await User.findByIdAndUpdate(user._id, {
        status: newStatus,
        updatedAt: new Date()
      });

      results.successful.push(user._id.toString());

      // Send notification email
      try {
        await sendEmail({
          to: user.email,
          templateId: 'account_status_update',
          subject: `Account Status Update - ${newStatus}`,
          variables: {
            name: user.name,
            status: newStatus,
            reason: reason || 'Administrative action',
            supportEmail: process.env.SUPPORT_EMAIL
          }
        });
      } catch (emailError) {
        console.error(`Failed to send email to ${user.email}:`, emailError);
      }

    } catch (error) {
      results.failed.push({
        userId: user._id.toString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

// Helper function for bulk KYC updates
async function processBulkKYCUpdate(
  users: any[],
  action: string,
  rejectionReason: string | undefined,
  results: any,
  adminId: string | null
) {
  const kycStatus = action === 'approve_kyc' ? 'Approved' : 'Rejected';

  for (const user of users) {
    try {
      if (user.kycStatus !== 'Pending') {
        results.failed.push({
          userId: user._id.toString(),
          error: `KYC is already ${user.kycStatus.toLowerCase()}`
        });
        continue;
      }

      const updateData: any = {
        kycStatus,
        updatedAt: new Date()
      };

      if (action === 'reject_kyc' && rejectionReason) {
        updateData.kycRejectionReason = rejectionReason;
      } else if (action === 'approve_kyc') {
        updateData.kycRejectionReason = undefined;
      }

      await User.findByIdAndUpdate(user._id, updateData);
      results.successful.push(user._id.toString());

      // Send notification email
      try {
        const emailTemplate = action === 'approve_kyc' ? 'kyc_approved' : 'kyc_rejected';
        const emailSubject = action === 'approve_kyc' ? 'KYC Approved' : 'KYC Rejected';
        
        await sendEmail({
          to: user.email,
          templateId: emailTemplate,
          subject: emailSubject,
          variables: {
            name: user.name,
            rejectionReason: rejectionReason || '',
            supportEmail: process.env.SUPPORT_EMAIL,
            resubmitUrl: process.env.NEXTAUTH_URL + '/user/kyc'
          }
        });
      } catch (emailError) {
        console.error(`Failed to send KYC email to ${user.email}:`, emailError);
      }

    } catch (error) {
      results.failed.push({
        userId: user._id.toString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

// Helper function for bulk plan upgrades
async function processBulkPlanUpgrade(
  users: any[],
  planId: string,
  results: any,
  adminId: string | null
) {
  // Validate plan exists
  const plan = await Plan.findById(planId);
  if (!plan) {
    throw new Error('Invalid plan ID');
  }

  for (const user of users) {
    try {
      await User.findByIdAndUpdate(user._id, {
        planId: new mongoose.Types.ObjectId(planId),
        updatedAt: new Date()
      });

      results.successful.push(user._id.toString());

      // Send notification email
      try {
        await sendEmail({
          to: user.email,
          templateId: 'plan_upgrade',
          subject: `Plan Upgraded to ${plan.name}`,
          variables: {
            name: user.name,
            oldPlanName: 'Previous Plan',
            newPlanName: plan.name,
            planFeatures: plan.features || [],
            supportEmail: process.env.SUPPORT_EMAIL
          }
        });
      } catch (emailError) {
        console.error(`Failed to send plan upgrade email to ${user.email}:`, emailError);
      }

    } catch (error) {
      results.failed.push({
        userId: user._id.toString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export async function POST(request: NextRequest) {
  return withErrorHandler(bulkActionsHandler)(request);
}