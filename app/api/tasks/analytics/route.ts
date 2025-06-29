// app/api/tasks/analytics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Task, TaskSubmission } from '@/models/Task';
import { authMiddleware } from '@/middleware/auth';
import { apiRateLimit } from '@/middleware/rate-limit';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import mongoose from 'mongoose';

// GET /api/tasks/analytics - Get task analytics
async function getTaskAnalyticsHandler(request: NextRequest): Promise<NextResponse> {
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

    // Get task counts
    const totalTasks = await Task.countDocuments();
    const activeTasks = await Task.countDocuments({ status: 'Active' });

    // Get submission statistics
    const totalSubmissions = await TaskSubmission.countDocuments();
    const approvedSubmissions = await TaskSubmission.countDocuments({ status: 'Approved' });
    const rejectedSubmissions = await TaskSubmission.countDocuments({ status: 'Rejected' });

    // Calculate total rewards paid
    const rewardsPipeline = [
      { $match: { status: 'Approved' } },
      { $group: { _id: null, totalRewards: { $sum: '$reward' } } }
    ];
    const rewardsResult = await TaskSubmission.aggregate(rewardsPipeline);
    const totalRewardsPaid = rewardsResult[0]?.totalRewards || 0;

    // Get popular categories
    const categoriesPipeline = [
      {
        $group: {
          _id: '$category',
          taskCount: { $sum: 1 },
          totalRewards: { $sum: '$reward' }
        }
      },
      { $sort: { taskCount: -1 as const } },
      { $limit: 10 }
    ];
    const categoriesResult = await Task.aggregate(categoriesPipeline);
    
    const popularCategories = categoriesResult.map(cat => ({
      name: cat._id,
      description: `${cat._id} category tasks`,
      icon: 'target',
      color: '#3b82f6',
      taskCount: cat.taskCount,
      totalRewards: cat.totalRewards
    }));

    // Calculate average completion time (placeholder - would need actual tracking)
    const averageCompletionTime = 24; // hours

    const analytics = {
      totalTasks,
      activeTasks,
      totalSubmissions,
      approvedSubmissions,
      rejectedSubmissions,
      totalRewardsPaid,
      averageCompletionTime,
      popularCategories
    };

    return apiHandler.success({
      data: analytics,
      message: 'Task analytics retrieved successfully'
    });

  } catch (error) {
    console.error('❌ Task Analytics API - Error:', error);
    return apiHandler.internalError('Failed to fetch task analytics');
  }
}

export async function GET(request: NextRequest) {
  return withErrorHandler(getTaskAnalyticsHandler)(request);
}

// ========================================
// Fixed utils/constants.ts (missing LOAN_CONFIG properties)

// Add these missing properties to your utils/constants.ts file:

export const LOAN_CONFIG = {
  MAX_AMOUNT: 5500,
  MIN_AMOUNT: 500,
  MIN_TENURE: 6,
  MAX_TENURE: 60,
  DEFAULT_INTEREST_RATE: 12,
  MIN_CREDIT_SCORE: 500,
  // Add missing credit score properties
  CREDIT_SCORE: {
    MINIMUM: 300,
    MAXIMUM: 850,
    MINIMUM_REQUIRED: 500,
    EXCELLENT: 750,
    GOOD: 700,
    FAIR: 650,
    POOR: 600
  },
  // Add other missing properties that might be referenced
  LOAN_PURPOSES: [
    'Personal',
    'Business',
    'Education',
    'Medical',
    'Home Improvement',
    'Debt Consolidation',
    'Emergency',
    'Other'
  ],
  EMPLOYMENT_TYPES: [
    'Full-time',
    'Part-time',
    'Self-employed',
    'Contract',
    'Unemployed',
    'Retired',
    'Student'
  ],
  LOAN_STATUS: {
    DRAFT: 'Draft',
    PENDING: 'Pending',
    UNDER_REVIEW: 'Under Review', 
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    DISBURSED: 'Disbursed',
    ACTIVE: 'Active',
    COMPLETED: 'Completed',
    DEFAULTED: 'Defaulted',
    CANCELLED: 'Cancelled'
  },
  INSTALLMENT_STATUS: {
    PENDING: 'Pending',
    PAID: 'Paid',
    OVERDUE: 'Overdue',
    PARTIAL: 'Partial',
    WAIVED: 'Waived'
  }
} as const;
