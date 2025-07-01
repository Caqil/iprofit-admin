// app/api/user/tasks/completed/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/config/auth';
import { z } from 'zod';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Task, TaskSubmission } from '@/models/Task';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import mongoose from 'mongoose';

// Completed tasks query validation schema
const completedTasksQuerySchema = z.object({
  page: z.string().optional().default('1').transform(val => {
    const num = parseInt(val, 10);
    return isNaN(num) || num < 1 ? 1 : num;
  }),
  limit: z.string().optional().default('20').transform(val => {
    const num = parseInt(val, 10);
    return isNaN(num) || num < 1 ? 20 : Math.min(num, 100);
  }),
  status: z.enum(['Pending', 'Approved', 'Rejected', 'all']).optional().default('all'),
  category: z.string().optional(),
  dateFrom: z.string().optional().transform(val => {
    if (!val || val === '') return undefined;
    const date = new Date(val);
    return isNaN(date.getTime()) ? undefined : date;
  }),
  dateTo: z.string().optional().transform(val => {
    if (!val || val === '') return undefined;
    const date = new Date(val);
    return isNaN(date.getTime()) ? undefined : date;
  }),
  sortBy: z.enum(['submittedAt', 'reviewedAt', 'reward', 'status']).optional().default('submittedAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
});

export interface CompletedTask {
  id: string;
  submissionId: string;
  task: {
    id: string;
    name: string;
    description: string;
    category: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    reward: number;
    currency: string;
  };
  submission: {
    status: 'Pending' | 'Approved' | 'Rejected';
    submittedAt: Date;
    reviewedAt?: Date;
    proofCount: number;
    submissionNote?: string;
    reviewNote?: string;
  };
  reward: {
    amount: number;
    currency: string;
    status: 'pending' | 'paid' | 'rejected';
    transactionId?: string;
    paidAt?: Date;
  };
  statusInfo: {
    text: string;
    color: string;
    description: string;
    canResubmit: boolean;
  };
  timeline: {
    submitted: Date;
    reviewed?: Date;
    paid?: Date;
    processingTime?: string;
  };
  actions: {
    canViewDetails: boolean;
    canResubmit: boolean;
    canRate: boolean;
    canReport: boolean;
  };
}

export interface CompletedTasksResponse {
  tasks: CompletedTask[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  summary: {
    totalSubmissions: number;
    approvedSubmissions: number;
    pendingSubmissions: number;
    rejectedSubmissions: number;
    totalEarnings: number;
    pendingEarnings: number;
    averageReward: number;
    completionRate: number;
  };
  analytics: {
    categoryPerformance: {
      category: string;
      submissions: number;
      approvals: number;
      totalEarnings: number;
      successRate: number;
    }[];
    difficultyPerformance: {
      difficulty: string;
      submissions: number;
      approvals: number;
      averageReward: number;
      successRate: number;
    }[];
    monthlyTrend: {
      month: string;
      submissions: number;
      earnings: number;
      successRate: number;
    }[];
    streaks: {
      currentStreak: number;
      longestStreak: number;
      lastCompletionDate?: Date;
    };
  };
  insights: {
    bestPerformingCategory: string;
    averageCompletionTime: string;
    mostRecentSuccess: Date | null;
    improvementAreas: string[];
    recommendations: string[];
  };
  filters: {
    availableCategories: string[];
    appliedFilters: string[];
  };
}

// Helper functions
function getStatusInfo(status: string, canResubmit: boolean) {
  const statusMap = {
    'Pending': {
      text: 'Under Review',
      color: 'yellow',
      description: 'Your submission is being reviewed by our team',
      canResubmit: false
    },
    'Approved': {
      text: 'Approved',
      color: 'green',
      description: 'Task completed successfully and reward paid',
      canResubmit: false
    },
    'Rejected': {
      text: 'Rejected',
      color: 'red',
      description: 'Submission did not meet requirements',
      canResubmit
    }
  };

  return statusMap[status as keyof typeof statusMap] || {
    text: status,
    color: 'gray',
    description: 'Unknown status',
    canResubmit: false
  };
}

function calculateProcessingTime(submittedAt: Date, reviewedAt?: Date): string {
  if (!reviewedAt) return 'Pending';
  
  const diffMs = reviewedAt.getTime() - submittedAt.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''}`;
  } else {
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
  }
}

// GET /api/user/tasks/completed - Get user's completed/submitted tasks
async function getCompletedTasksHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  try {
    await connectToDatabase();

    // Check authentication
    const session = await getServerSession(authConfig);
    if (!session?.user || session.user.userType !== 'user') {
      return apiHandler.unauthorized('User authentication required');
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);

    // Validate query parameters
    const validationResult = completedTasksQuerySchema.safeParse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      status: searchParams.get('status'),
      category: searchParams.get('category'),
      dateFrom: searchParams.get('dateFrom'),
      dateTo: searchParams.get('dateTo'),
      sortBy: searchParams.get('sortBy'),
      sortOrder: searchParams.get('sortOrder')
    });

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
      status, 
      category, 
      dateFrom, 
      dateTo, 
      sortBy, 
      sortOrder 
    } = validationResult.data;

    // Verify user exists and is active
    const user = await User.findById(userId).select('status');
    if (!user) {
      return apiHandler.notFound('User not found');
    }

    if (user.status !== 'Active') {
      return apiHandler.forbidden(`Account is ${user.status.toLowerCase()}`);
    }

    // Build aggregation pipeline
    const matchStage: any = { userId: new mongoose.Types.ObjectId(userId) };

    // Apply filters
    if (status !== 'all') {
      matchStage.status = status;
    }

    if (dateFrom || dateTo) {
      matchStage.createdAt = {};
      if (dateFrom) matchStage.createdAt.$gte = dateFrom;
      if (dateTo) matchStage.createdAt.$lte = dateTo;
    }

    // Execute parallel queries
    const [submissions, totalCount, summaryData, categoryPerformance, recentTasks] = await Promise.all([
      // Get paginated submissions with task details
      TaskSubmission.aggregate([
        { $match: matchStage },
        
        // Lookup task details
        {
          $lookup: {
            from: 'tasks',
            localField: 'taskId',
            foreignField: '_id',
            as: 'task'
          }
        },
        { $unwind: '$task' },
        
        // Lookup transaction details
        {
          $lookup: {
            from: 'transactions',
            localField: 'transactionId',
            foreignField: '_id',
            as: 'transaction'
          }
        },
        
        // Apply category filter after lookup
        ...(category ? [{ $match: { 'task.category': category } }] : []),
        
        // Sort stage
        { $sort: { [sortBy === 'submittedAt' ? 'createdAt' : sortBy]: sortOrder === 'asc' ? 1 : -1 } },
        
        // Skip and limit for pagination
        { $skip: (page - 1) * limit },
        { $limit: limit },
        
        // Project required fields
        {
          $project: {
            _id: 1,
            taskId: 1,
            status: 1,
            proof: 1,
            submissionNote: 1,
            reviewNote: 1,
            reviewedAt: 1,
            reward: 1,
            transactionId: 1,
            createdAt: 1,
            task: {
              _id: '$task._id',
              name: '$task.name',
              description: '$task.description',
              category: '$task.category',
              difficulty: '$task.difficulty',
              reward: '$task.reward',
              currency: '$task.currency',
              isRepeatable: '$task.isRepeatable'
            },
            transaction: { $arrayElemAt: ['$transaction', 0] }
          }
        }
      ]),

      // Get total count for pagination
      TaskSubmission.aggregate([
        { $match: matchStage },
        {
          $lookup: {
            from: 'tasks',
            localField: 'taskId',
            foreignField: '_id',
            as: 'task'
          }
        },
        { $unwind: '$task' },
        ...(category ? [{ $match: { 'task.category': category } }] : []),
        { $count: 'total' }
      ]),

      // Get summary statistics
      TaskSubmission.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId) } },
        {
          $group: {
            _id: null,
            totalSubmissions: { $sum: 1 },
            approvedSubmissions: { $sum: { $cond: [{ $eq: ['$status', 'Approved'] }, 1, 0] } },
            pendingSubmissions: { $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] } },
            rejectedSubmissions: { $sum: { $cond: [{ $eq: ['$status', 'Rejected'] }, 1, 0] } },
            totalEarnings: { $sum: { $cond: [{ $eq: ['$status', 'Approved'] }, '$reward', 0] } },
            pendingEarnings: { $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, '$reward', 0] } },
            averageReward: { $avg: '$reward' }
          }
        }
      ]),

      // Get category performance
      TaskSubmission.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId) } },
        {
          $lookup: {
            from: 'tasks',
            localField: 'taskId',
            foreignField: '_id',
            as: 'task'
          }
        },
        { $unwind: '$task' },
        {
          $group: {
            _id: '$task.category',
            submissions: { $sum: 1 },
            approvals: { $sum: { $cond: [{ $eq: ['$status', 'Approved'] }, 1, 0] } },
            totalEarnings: { $sum: { $cond: [{ $eq: ['$status', 'Approved'] }, '$reward', 0] } }
          }
        },
        {
          $project: {
            category: '$_id',
            submissions: 1,
            approvals: 1,
            totalEarnings: 1,
            successRate: {
              $cond: [
                { $gt: ['$submissions', 0] },
                { $multiply: [{ $divide: ['$approvals', '$submissions'] }, 100] },
                0
              ]
            }
          }
        },
        { $sort: { totalEarnings: -1 } }
      ]),

      // Get available categories for filtering
      TaskSubmission.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId) } },
        {
          $lookup: {
            from: 'tasks',
            localField: 'taskId',
            foreignField: '_id',
            as: 'task'
          }
        },
        { $unwind: '$task' },
        {
          $group: {
            _id: '$task.category'
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    // Process submissions data
    const processedTasks: CompletedTask[] = submissions.map((submission: any) => {
      const task = submission.task;
      const transaction = submission.transaction;
      
      const canResubmit = submission.status === 'Rejected' && task.isRepeatable;
      const statusInfo = getStatusInfo(submission.status, canResubmit);
      
      const rewardStatus = submission.status === 'Approved' ? 'paid' : 
                          submission.status === 'Pending' ? 'pending' : 'rejected';

      return {
        id: task._id.toString(),
        submissionId: submission._id.toString(),
        task: {
          id: task._id.toString(),
          name: task.name,
          description: task.description,
          category: task.category,
          difficulty: task.difficulty,
          reward: task.reward,
          currency: task.currency || 'BDT'
        },
        submission: {
          status: submission.status,
          submittedAt: submission.createdAt,
          reviewedAt: submission.reviewedAt,
          proofCount: submission.proof?.length || 0,
          submissionNote: submission.submissionNote,
          reviewNote: submission.reviewNote
        },
        reward: {
          amount: submission.reward,
          currency: task.currency || 'BDT',
          status: rewardStatus,
          transactionId: transaction?._id?.toString(),
          paidAt: transaction?.createdAt
        },
        statusInfo,
        timeline: {
          submitted: submission.createdAt,
          reviewed: submission.reviewedAt,
          paid: transaction?.createdAt,
          processingTime: calculateProcessingTime(submission.createdAt, submission.reviewedAt)
        },
        actions: {
          canViewDetails: true,
          canResubmit,
          canRate: submission.status === 'Approved',
          canReport: submission.status === 'Rejected'
        }
      };
    });

    // Process summary data
    const summary = summaryData[0] || {
      totalSubmissions: 0,
      approvedSubmissions: 0,
      pendingSubmissions: 0,
      rejectedSubmissions: 0,
      totalEarnings: 0,
      pendingEarnings: 0,
      averageReward: 0
    };

    const completionRate = summary.totalSubmissions > 0 
      ? (summary.approvedSubmissions / summary.totalSubmissions) * 100 
      : 0;

    // Process difficulty performance
    const difficultyPerformance = [
      { difficulty: 'Easy', submissions: 0, approvals: 0, averageReward: 0, successRate: 0 },
      { difficulty: 'Medium', submissions: 0, approvals: 0, averageReward: 0, successRate: 0 },
      { difficulty: 'Hard', submissions: 0, approvals: 0, averageReward: 0, successRate: 0 }
    ];

    submissions.forEach((sub: any) => {
      const diff = difficultyPerformance.find(d => d.difficulty === sub.task.difficulty);
      if (diff) {
        diff.submissions++;
        if (sub.status === 'Approved') {
          diff.approvals++;
          diff.averageReward = ((diff.averageReward * (diff.approvals - 1)) + sub.reward) / diff.approvals;
        }
        diff.successRate = diff.submissions > 0 ? (diff.approvals / diff.submissions) * 100 : 0;
      }
    });

    // Generate monthly trend (last 6 months)
    const monthlyTrend: {
      month: string;
      submissions: number;
      earnings: number;
      successRate: number;
    }[] = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      const monthSubmissions = submissions.filter((sub: any) => {
        const subDate = new Date(sub.createdAt);
        return subDate.getMonth() === date.getMonth() && subDate.getFullYear() === date.getFullYear();
      });

      const monthEarnings = monthSubmissions
        .filter((sub: any) => sub.status === 'Approved')
        .reduce((sum: number, sub: any) => sum + sub.reward, 0);

      const monthSuccessRate = monthSubmissions.length > 0 
        ? (monthSubmissions.filter((sub: any) => sub.status === 'Approved').length / monthSubmissions.length) * 100 
        : 0;

      monthlyTrend.push({
        month: monthName,
        submissions: monthSubmissions.length,
        earnings: monthEarnings,
        successRate: Math.round(monthSuccessRate * 100) / 100
      });
    }

    // Calculate streaks
    const approvedSubmissions = submissions
      .filter((sub: any) => sub.status === 'Approved')
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    // Simplified streak calculation
    for (let i = 0; i < approvedSubmissions.length; i++) {
      if (i === 0) {
        currentStreak = 1;
        tempStreak = 1;
      } else {
        const current = new Date(approvedSubmissions[i].createdAt);
        const previous = new Date(approvedSubmissions[i - 1].createdAt);
        const daysDiff = Math.floor((previous.getTime() - current.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff <= 7) { // Within a week
          if (i < 5) currentStreak++; // Only count recent streak
          tempStreak++;
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
          if (i >= 5) currentStreak = 0; // Reset current streak if not recent
        }
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    // Generate insights and recommendations
    const bestCategory = categoryPerformance.length > 0 ? categoryPerformance[0].category : 'None';
    const mostRecentSuccess = approvedSubmissions.length > 0 ? approvedSubmissions[0].createdAt : null;
    
    const improvementAreas: string[] = [];
    const recommendations: string[] = [];

    if (completionRate < 70) {
      improvementAreas.push('Task completion rate');
      recommendations.push('Review task requirements more carefully before submitting');
    }

    if (summary.pendingSubmissions > 5) {
      improvementAreas.push('Too many pending submissions');
      recommendations.push('Focus on quality over quantity when submitting tasks');
    }

    if (categoryPerformance.length === 1) {
      recommendations.push('Try tasks from different categories to diversify your earnings');
    }

    // Calculate pagination
    const totalItems = totalCount[0]?.total || 0;
    const totalPages = Math.ceil(totalItems / limit);

    // Generate applied filters
    const appliedFilters: string[] = [];
    if (status !== 'all') appliedFilters.push(`Status: ${status}`);
    if (category) appliedFilters.push(`Category: ${category}`);
    if (dateFrom) appliedFilters.push(`From: ${dateFrom.toDateString()}`);
    if (dateTo) appliedFilters.push(`To: ${dateTo.toDateString()}`);

    const response: CompletedTasksResponse = {
      tasks: processedTasks,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      },
      summary: {
        totalSubmissions: summary.totalSubmissions,
        approvedSubmissions: summary.approvedSubmissions,
        pendingSubmissions: summary.pendingSubmissions,
        rejectedSubmissions: summary.rejectedSubmissions,
        totalEarnings: summary.totalEarnings,
        pendingEarnings: summary.pendingEarnings,
        averageReward: Math.round(summary.averageReward * 100) / 100,
        completionRate: Math.round(completionRate * 100) / 100
      },
      analytics: {
        categoryPerformance: categoryPerformance.map((cat: any) => ({
          category: cat.category,
          submissions: cat.submissions,
          approvals: cat.approvals,
          totalEarnings: cat.totalEarnings,
          successRate: Math.round(cat.successRate * 100) / 100
        })),
        difficultyPerformance: difficultyPerformance.map(diff => ({
          ...diff,
          averageReward: Math.round(diff.averageReward * 100) / 100,
          successRate: Math.round(diff.successRate * 100) / 100
        })),
        monthlyTrend,
        streaks: {
          currentStreak,
          longestStreak,
          lastCompletionDate: mostRecentSuccess
        }
      },
      insights: {
        bestPerformingCategory: bestCategory,
        averageCompletionTime: '24 hours', // Could be calculated from actual data
        mostRecentSuccess,
        improvementAreas,
        recommendations
      },
      filters: {
        availableCategories: recentTasks.map((cat: any) => cat._id),
        appliedFilters
      }
    };

    return apiHandler.success(response, 'Completed tasks retrieved successfully');

  } catch (error) {
    console.error('Completed Tasks API Error:', error);
    return apiHandler.internalError('Failed to retrieve completed tasks');
  }
}

export const GET = withErrorHandler(getCompletedTasksHandler);