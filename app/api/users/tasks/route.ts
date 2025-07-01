// app/api/user/tasks/route.ts
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

// Available tasks query validation schema
const availableTasksQuerySchema = z.object({
  page: z.string().optional().default('1').transform(val => {
    const num = parseInt(val, 10);
    return isNaN(num) || num < 1 ? 1 : num;
  }),
  limit: z.string().optional().default('20').transform(val => {
    const num = parseInt(val, 10);
    return isNaN(num) || num < 1 ? 20 : Math.min(num, 50);
  }),
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
  sortBy: z.enum(['reward', 'difficulty', 'estimatedTime', 'createdAt']).optional().default('reward'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
});

export interface AvailableTask {
  id: string;
  name: string;
  description: string;
  criteria: string;
  reward: number;
  currency: string;
  category: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  estimatedTime: number; // in minutes
  instructions: string[];
  requiredProof: string[];
  maxCompletions?: number;
  currentCompletions: number;
  validUntil?: Date;
  isRepeatable: boolean;
  cooldownPeriod?: number; // in hours
  metadata?: {
    externalUrl?: string;
    imageUrl?: string;
    tags?: string[];
  };
  userStatus: {
    canSubmit: boolean;
    hasSubmitted: boolean;
    submissionStatus?: 'Pending' | 'Approved' | 'Rejected';
    lastSubmissionDate?: Date;
    nextAvailableDate?: Date; // For repeatable tasks with cooldown
    reasonsForRestriction: string[];
  };
  taskInfo: {
    completionRate: number; // Percentage of users who completed
    averageRating: number;
    isPopular: boolean;
    remainingSlots?: number;
    urgency: 'low' | 'medium' | 'high';
  };
}

export interface TasksResponse {
  tasks: AvailableTask[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  summary: {
    totalAvailableTasks: number;
    totalRewardValue: number;
    categoryBreakdown: {
      category: string;
      count: number;
      totalReward: number;
    }[];
    difficultyBreakdown: {
      difficulty: string;
      count: number;
      averageReward: number;
    }[];
  };
  userStats: {
    totalSubmissions: number;
    approvedSubmissions: number;
    pendingSubmissions: number;
    totalEarnings: number;
    completionRate: number;
    favoriteCategory: string;
  };
  recommendations: {
    taskId: string;
    reason: string;
    priority: number;
  }[];
  filters: {
    availableCategories: string[];
    rewardRange: { min: number; max: number };
    appliedFilters: string[];
  };
}

// GET /api/user/tasks - Get available tasks for user
async function getAvailableTasksHandler(request: NextRequest): Promise<NextResponse> {
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
    const validationResult = availableTasksQuerySchema.safeParse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      category: searchParams.get('category'),
      difficulty: searchParams.get('difficulty'),
      rewardMin: searchParams.get('rewardMin'),
      rewardMax: searchParams.get('rewardMax'),
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
      category, 
      difficulty, 
      rewardMin, 
      rewardMax, 
      sortBy, 
      sortOrder 
    } = validationResult.data;

    // Get user details
    const user = await User.findById(userId).select('status kycStatus emailVerified');
    if (!user) {
      return apiHandler.notFound('User not found');
    }

    if (user.status !== 'Active') {
      return apiHandler.forbidden(`Account is ${user.status.toLowerCase()}`);
    }

    // Build task query for available tasks
    const now = new Date();
    const taskMatchStage: any = {
      status: 'Active',
      validFrom: { $lte: now },
      $or: [
        { validUntil: { $exists: false } },
        { validUntil: null },
        { validUntil: { $gt: now } }
      ]
    };

    // Apply filters
    if (category) {
      taskMatchStage.category = category;
    }

    if (difficulty) {
      taskMatchStage.difficulty = difficulty;
    }

    if (rewardMin || rewardMax) {
      taskMatchStage.reward = {};
      if (rewardMin) taskMatchStage.reward.$gte = rewardMin;
      if (rewardMax) taskMatchStage.reward.$lte = rewardMax;
    }

    // Get user's submissions to filter out completed non-repeatable tasks
    const userSubmissions = await TaskSubmission.find({ userId })
      .select('taskId status createdAt')
      .lean();

    const submissionsByTask = new Map();
    userSubmissions.forEach(submission => {
      const taskId = submission.taskId.toString();
      if (!submissionsByTask.has(taskId)) {
        submissionsByTask.set(taskId, []);
      }
      submissionsByTask.get(taskId).push(submission);
    });

    // Execute parallel queries
    const [tasks, userStats, taskAnalytics] = await Promise.all([
      // Get tasks with pagination
      Task.aggregate([
        { $match: taskMatchStage },
        
        // Add fields for sorting and filtering
        {
          $addFields: {
            urgency: {
              $cond: [
                { $lt: ['$validUntil', new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)] },
                'high',
                { $cond: [
                  { $lt: ['$validUntil', new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)] },
                  'medium',
                  'low'
                ]}
              ]
            },
            remainingSlots: {
              $cond: [
                { $and: [{ $ne: ['$maxCompletions', null] }, { $gt: ['$maxCompletions', 0] }] },
                { $subtract: ['$maxCompletions', '$currentCompletions'] },
                null
              ]
            }
          }
        },
        
        // Filter out full tasks (if they have max completions)
        {
          $match: {
            $or: [
              { maxCompletions: { $exists: false } },
              { maxCompletions: null },
              { remainingSlots: { $gt: 0 } }
            ]
          }
        },
        
        // Sort stage
        { $sort: { [sortBy]: sortOrder === 'asc' ? 1 : -1 } },
        
        // Skip and limit for pagination
        { $skip: (page - 1) * limit },
        { $limit: limit },
        
        // Project final fields
        {
          $project: {
            name: 1,
            description: 1,
            criteria: 1,
            reward: 1,
            currency: 1,
            category: 1,
            difficulty: 1,
            estimatedTime: 1,
            instructions: 1,
            requiredProof: 1,
            maxCompletions: 1,
            currentCompletions: 1,
            validUntil: 1,
            isRepeatable: 1,
            cooldownPeriod: 1,
            metadata: 1,
            urgency: 1,
            remainingSlots: 1
          }
        }
      ]),

      // Get user task statistics
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
            _id: null,
            totalSubmissions: { $sum: 1 },
            approvedSubmissions: { $sum: { $cond: [{ $eq: ['$status', 'Approved'] }, 1, 0] } },
            pendingSubmissions: { $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] } },
            totalEarnings: { $sum: { $cond: [{ $eq: ['$status', 'Approved'] }, '$reward', 0] } },
            categoryStats: {
              $push: {
                category: '$task.category',
                status: '$status'
              }
            }
          }
        }
      ]),

      // Get task analytics for completion rates
      Task.aggregate([
        { $match: { status: 'Active' } },
        {
          $lookup: {
            from: 'task_submissions',
            localField: '_id',
            foreignField: 'taskId',
            as: 'submissions'
          }
        },
        {
          $group: {
            _id: null,
            totalTasks: { $sum: 1 },
            totalReward: { $sum: '$reward' },
            categoryBreakdown: {
              $push: {
                category: '$category',
                reward: '$reward'
              }
            },
            difficultyBreakdown: {
              $push: {
                difficulty: '$difficulty',
                reward: '$reward'
              }
            }
          }
        }
      ])
    ]);

    // Process tasks with user-specific information
    const processedTasks: AvailableTask[] = tasks.map((task: any) => {
      const taskId = task._id.toString();
      const userTaskSubmissions = submissionsByTask.get(taskId) || [];
      
      // Check user submission status
      let hasSubmitted = userTaskSubmissions.length > 0;
      let submissionStatus: 'Pending' | 'Approved' | 'Rejected' | undefined;
      let lastSubmissionDate: Date | undefined;
      let canSubmit = true;
      let nextAvailableDate: Date | undefined;
      const reasonsForRestriction: string[] = [];

      if (hasSubmitted) {
        const latestSubmission = userTaskSubmissions.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0];
        
        submissionStatus = latestSubmission.status;
        lastSubmissionDate = latestSubmission.createdAt;

        // Check if can submit again for repeatable tasks
        if (task.isRepeatable) {
          if (latestSubmission.status === 'Pending') {
            canSubmit = false;
            reasonsForRestriction.push('Previous submission is pending review');
          } else if (task.cooldownPeriod && latestSubmission.status === 'Approved') {
            const cooldownEnd = new Date(latestSubmission.createdAt.getTime() + task.cooldownPeriod * 60 * 60 * 1000);
            if (now < cooldownEnd) {
              canSubmit = false;
              nextAvailableDate = cooldownEnd;
              reasonsForRestriction.push(`Cooldown period active until ${cooldownEnd.toLocaleDateString()}`);
            }
          }
        } else {
          // Non-repeatable task
          if (latestSubmission.status === 'Approved') {
            canSubmit = false;
            reasonsForRestriction.push('Task already completed');
          } else if (latestSubmission.status === 'Pending') {
            canSubmit = false;
            reasonsForRestriction.push('Submission pending review');
          }
        }
      }

      // Additional restrictions
      if (!user.emailVerified) {
        canSubmit = false;
        reasonsForRestriction.push('Email verification required');
      }

      if (task.maxCompletions && task.currentCompletions >= task.maxCompletions) {
        canSubmit = false;
        reasonsForRestriction.push('Maximum completions reached');
      }

      // Calculate completion rate (simplified)
      const completionRate = task.maxCompletions 
        ? (task.currentCompletions / task.maxCompletions) * 100 
        : Math.min((task.currentCompletions / 100) * 100, 90); // Cap at 90% if no max

      return {
        id: taskId,
        name: task.name,
        description: task.description,
        criteria: task.criteria,
        reward: task.reward,
        currency: task.currency || 'BDT',
        category: task.category,
        difficulty: task.difficulty,
        estimatedTime: task.estimatedTime,
        instructions: task.instructions || [],
        requiredProof: task.requiredProof || [],
        maxCompletions: task.maxCompletions,
        currentCompletions: task.currentCompletions,
        validUntil: task.validUntil,
        isRepeatable: task.isRepeatable,
        cooldownPeriod: task.cooldownPeriod,
        metadata: task.metadata,
        userStatus: {
          canSubmit,
          hasSubmitted,
          submissionStatus,
          lastSubmissionDate,
          nextAvailableDate,
          reasonsForRestriction
        },
        taskInfo: {
          completionRate: Math.round(completionRate * 100) / 100,
          averageRating: 4.2, // Could be calculated from user feedback
          isPopular: task.currentCompletions > 50,
          remainingSlots: task.remainingSlots,
          urgency: task.urgency || 'low'
        }
      };
    });

    // Process user statistics
    const userStatsData = userStats[0] || {
      totalSubmissions: 0,
      approvedSubmissions: 0,
      pendingSubmissions: 0,
      totalEarnings: 0,
      categoryStats: []
    };

    const completionRate = userStatsData.totalSubmissions > 0 
      ? (userStatsData.approvedSubmissions / userStatsData.totalSubmissions) * 100 
      : 0;

    // Find favorite category
    const categoryCount = new Map();
    userStatsData.categoryStats?.forEach((stat: any) => {
      if (stat.status === 'Approved') {
        categoryCount.set(stat.category, (categoryCount.get(stat.category) || 0) + 1);
      }
    });
    
    const favoriteCategory = categoryCount.size > 0 
      ? Array.from(categoryCount.entries()).sort((a, b) => b[1] - a[1])[0][0] 
      : 'None';

    // Process analytics data
    const analyticsData = taskAnalytics[0] || {
      totalTasks: 0,
      totalReward: 0,
      categoryBreakdown: [],
      difficultyBreakdown: []
    };

    // Calculate category breakdown
    const categoryMap = new Map();
    analyticsData.categoryBreakdown?.forEach((item: any) => {
      const category = item.category;
      if (!categoryMap.has(category)) {
        categoryMap.set(category, { count: 0, totalReward: 0 });
      }
      const data = categoryMap.get(category);
      data.count++;
      data.totalReward += item.reward;
    });

    const categoryBreakdown = Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      count: data.count,
      totalReward: data.totalReward
    }));

    // Calculate difficulty breakdown
    const difficultyMap = new Map();
    analyticsData.difficultyBreakdown?.forEach((item: any) => {
      const difficulty = item.difficulty;
      if (!difficultyMap.has(difficulty)) {
        difficultyMap.set(difficulty, { count: 0, totalReward: 0 });
      }
      const data = difficultyMap.get(difficulty);
      data.count++;
      data.totalReward += item.reward;
    });

    const difficultyBreakdown = Array.from(difficultyMap.entries()).map(([difficulty, data]) => ({
      difficulty,
      count: data.count,
      averageReward: data.count > 0 ? data.totalReward / data.count : 0
    }));

    // Generate recommendations
    const recommendations: {
      taskId: string;
      reason: string;
      priority: number;
    }[] = [];
    
    // Recommend high-reward tasks
    const highRewardTasks = processedTasks
      .filter(task => task.userStatus.canSubmit && task.reward > 100)
      .sort((a, b) => b.reward - a.reward)
      .slice(0, 2);

    highRewardTasks.forEach(task => {
      recommendations.push({
        taskId: task.id,
        reason: `High reward task: ${task.reward} BDT`,
        priority: 1
      });
    });

    // Recommend tasks in user's favorite category
    if (favoriteCategory !== 'None') {
      const favoriteCategoryTasks = processedTasks
        .filter(task => task.userStatus.canSubmit && task.category === favoriteCategory)
        .slice(0, 1);

      favoriteCategoryTasks.forEach(task => {
        recommendations.push({
          taskId: task.id,
          reason: `Matches your favorite category: ${favoriteCategory}`,
          priority: 2
        });
      });
    }

    // Calculate total count for pagination
    const totalCount = await Task.countDocuments(taskMatchStage);
    const totalPages = Math.ceil(totalCount / limit);

    // Get available filters
    const availableCategories = await Task.distinct('category', { status: 'Active' });
    const rewardRange = await Task.aggregate([
      { $match: { status: 'Active' } },
      {
        $group: {
          _id: null,
          min: { $min: '$reward' },
          max: { $max: '$reward' }
        }
      }
    ]);

    const appliedFilters: string[] = [];
    if (category) appliedFilters.push(`Category: ${category}`);
    if (difficulty) appliedFilters.push(`Difficulty: ${difficulty}`);
    if (rewardMin) appliedFilters.push(`Min Reward: ${rewardMin}`);
    if (rewardMax) appliedFilters.push(`Max Reward: ${rewardMax}`);

    const response: TasksResponse = {
      tasks: processedTasks,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalCount,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      },
      summary: {
        totalAvailableTasks: processedTasks.filter(t => t.userStatus.canSubmit).length,
        totalRewardValue: processedTasks.reduce((sum, task) => sum + task.reward, 0),
        categoryBreakdown,
        difficultyBreakdown
      },
      userStats: {
        totalSubmissions: userStatsData.totalSubmissions,
        approvedSubmissions: userStatsData.approvedSubmissions,
        pendingSubmissions: userStatsData.pendingSubmissions,
        totalEarnings: userStatsData.totalEarnings,
        completionRate: Math.round(completionRate * 100) / 100,
        favoriteCategory
      },
      recommendations,
      filters: {
        availableCategories,
        rewardRange: rewardRange[0] ? { min: rewardRange[0].min, max: rewardRange[0].max } : { min: 0, max: 1000 },
        appliedFilters
      }
    };

    return apiHandler.success(response, 'Available tasks retrieved successfully');

  } catch (error) {
    console.error('Available Tasks API Error:', error);
    return apiHandler.internalError('Failed to retrieve available tasks');
  }
}

export const GET = withErrorHandler(getAvailableTasksHandler);