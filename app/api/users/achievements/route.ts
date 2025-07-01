import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/config/auth';
import { z } from 'zod';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { TaskSubmission } from '@/models/Task';
import { Referral } from '@/models/Referral';
import { Transaction } from '@/models/Transaction';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import mongoose from 'mongoose';
import { getUserFromRequest } from '@/lib/auth-helper';

// Validation schema for achievements query
const achievementsQuerySchema = z.object({
  category: z.enum(['all', 'tasks', 'referrals', 'financial', 'milestones']).default('all'),
  status: z.enum(['all', 'completed', 'locked']).default('all'),
  includeProgress: z.coerce.boolean().default(true)
});

// Achievement definitions
const ACHIEVEMENTS = {
  tasks: [
    {
      id: 'first_task',
      title: 'Task Rookie',
      description: 'Complete your first task',
      category: 'tasks',
      requirement: 1,
      reward: 10,
      icon: '🎯'
    },
    {
      id: 'task_champion',
      title: 'Task Champion',
      description: 'Complete 10 tasks',
      category: 'tasks',
      requirement: 10,
      reward: 50,
      icon: '🏆'
    },
    {
      id: 'task_master',
      title: 'Task Master',
      description: 'Complete 50 tasks',
      category: 'tasks',
      requirement: 50,
      reward: 200,
      icon: '🌟'
    },
    {
      id: 'task_legend',
      title: 'Task Legend',
      description: 'Complete 100 tasks',
      category: 'tasks',
      requirement: 100,
      reward: 500,
      icon: '👑'
    }
  ],
  referrals: [
    {
      id: 'first_referral',
      title: 'Referral Starter',
      description: 'Refer your first user',
      category: 'referrals',
      requirement: 1,
      reward: 25,
      icon: '👥'
    },
    {
      id: 'referral_expert',
      title: 'Referral Expert',
      description: 'Refer 5 users',
      category: 'referrals',
      requirement: 5,
      reward: 100,
      icon: '🎖️'
    },
    {
      id: 'referral_master',
      title: 'Referral Master',
      description: 'Refer 25 users',
      category: 'referrals',
      requirement: 25,
      reward: 500,
      icon: '💎'
    },
    {
      id: 'referral_legend',
      title: 'Referral Legend',
      description: 'Refer 100 users',
      category: 'referrals',
      requirement: 100,
      reward: 2000,
      icon: '🌟'
    }
  ],
  financial: [
    {
      id: 'first_earning',
      title: 'First Earnings',
      description: 'Earn your first BDT 100',
      category: 'financial',
      requirement: 100,
      reward: 20,
      icon: '💰'
    },
    {
      id: 'big_earner',
      title: 'Big Earner',
      description: 'Earn BDT 1,000 in total',
      category: 'financial',
      requirement: 1000,
      reward: 50,
      icon: '💵'
    },
    {
      id: 'wealth_builder',
      title: 'Wealth Builder',
      description: 'Earn BDT 10,000 in total',
      category: 'financial',
      requirement: 10000,
      reward: 250,
      icon: '🏦'
    },
    {
      id: 'financial_guru',
      title: 'Financial Guru',
      description: 'Earn BDT 50,000 in total',
      category: 'financial',
      requirement: 50000,
      reward: 1000,
      icon: '📈'
    }
  ],
  milestones: [
    {
      id: 'early_adopter',
      title: 'Early Adopter',
      description: 'Join the platform',
      category: 'milestones',
      requirement: 1,
      reward: 50,
      icon: '🎉'
    },
    {
      id: 'verified_user',
      title: 'Verified User',
      description: 'Complete email and phone verification',
      category: 'milestones',
      requirement: 1,
      reward: 30,
      icon: '✅'
    },
    {
      id: 'active_member',
      title: 'Active Member',
      description: 'Stay active for 30 days',
      category: 'milestones',
      requirement: 30,
      reward: 100,
      icon: '📅'
    },
    {
      id: 'loyal_member',
      title: 'Loyal Member',
      description: 'Stay active for 90 days',
      category: 'milestones',
      requirement: 90,
      reward: 300,
      icon: '🎖️'
    }
  ]
};

async function getUserAchievementsHandler(request: NextRequest) {
  const apiHandler = new ApiHandler(request);

  try {
    // Connect to database
    await connectToDatabase();

    // Get user session
    const authResult = await getUserFromRequest(request);
        if (!authResult) {
          return apiHandler.unauthorized('Authentication required');
        }

    const userId = new mongoose.Types.ObjectId(authResult.userId);

    // Validate query parameters
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    
    const validationResult = achievementsQuerySchema.safeParse(queryParams);
    if (!validationResult.success) {
      return apiHandler.validationError(
        validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      );
    }

    const { category, status, includeProgress } = validationResult.data;

    // Get user data
    const user = await User.findById(userId);
    if (!user) {
      return apiHandler.notFound('User not found');
    }

    // Get user statistics for achievement calculation
    const [taskStats, referralStats, transactionStats] = await Promise.all([
      // Task statistics
      TaskSubmission.aggregate([
        { $match: { userId: userId, status: 'Approved' } },
        {
          $group: {
            _id: null,
            totalTasks: { $sum: 1 },
            totalEarnings: { $sum: '$reward' }
          }
        }
      ]),

      // Referral statistics
      Referral.aggregate([
        { $match: { referrerId: userId, status: 'Paid' } },
        {
          $group: {
            _id: null,
            totalReferrals: { $sum: 1 },
            totalEarnings: { $sum: { $add: ['$bonusAmount', { $ifNull: ['$profitBonus', 0] }] } }
          }
        }
      ]),

      // Financial statistics
      Transaction.aggregate([
        { 
          $match: { 
            userId: userId, 
            status: 'Approved',
            type: { $in: ['bonus', 'profit'] }
          } 
        },
        {
          $group: {
            _id: null,
            totalEarnings: { $sum: '$amount' }
          }
        }
      ])
    ]);

    const userStats = {
      totalTasks: taskStats[0]?.totalTasks || 0,
      totalReferrals: referralStats[0]?.totalReferrals || 0,
      totalEarnings: transactionStats[0]?.totalEarnings || 0,
      accountAge: Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
      isVerified: user.emailVerified && user.phoneVerified
    };

    // Calculate achievement progress
    const calculateProgress = (achievement: any, currentValue: number) => {
      const progress = Math.min(currentValue / achievement.requirement, 1);
      const isCompleted = progress >= 1;
      
      return {
        ...achievement,
        progress: Math.round(progress * 100),
        isCompleted,
        currentValue,
        remainingValue: Math.max(0, achievement.requirement - currentValue),
        completedAt: isCompleted ? new Date().toISOString() : null
      };
    };

    // Process all achievements
    let allAchievements: any[] = [];

    // Task achievements
    if (category === 'all' || category === 'tasks') {
      const taskAchievements = ACHIEVEMENTS.tasks.map(achievement => 
        calculateProgress(achievement, userStats.totalTasks)
      );
      allAchievements.push(...taskAchievements);
    }

    // Referral achievements
    if (category === 'all' || category === 'referrals') {
      const referralAchievements = ACHIEVEMENTS.referrals.map(achievement => 
        calculateProgress(achievement, userStats.totalReferrals)
      );
      allAchievements.push(...referralAchievements);
    }

    // Financial achievements
    if (category === 'all' || category === 'financial') {
      const financialAchievements = ACHIEVEMENTS.financial.map(achievement => 
        calculateProgress(achievement, userStats.totalEarnings)
      );
      allAchievements.push(...financialAchievements);
    }

    // Milestone achievements
    if (category === 'all' || category === 'milestones') {
      const milestoneAchievements = ACHIEVEMENTS.milestones.map(achievement => {
        let currentValue = 0;
        switch (achievement.id) {
          case 'early_adopter':
            currentValue = 1; // Always completed once user exists
            break;
          case 'verified_user':
            currentValue = userStats.isVerified ? 1 : 0;
            break;
          case 'active_member':
          case 'loyal_member':
            currentValue = userStats.accountAge;
            break;
        }
        return calculateProgress(achievement, currentValue);
      });
      allAchievements.push(...milestoneAchievements);
    }

    // Filter by status
    if (status !== 'all') {
      allAchievements = allAchievements.filter(achievement => 
        status === 'completed' ? achievement.isCompleted : !achievement.isCompleted
      );
    }

    // Calculate summary statistics
    const summary = {
      totalAchievements: allAchievements.length,
      completedAchievements: allAchievements.filter(a => a.isCompleted).length,
      totalRewards: allAchievements.filter(a => a.isCompleted).reduce((sum, a) => sum + a.reward, 0),
      overallProgress: allAchievements.length > 0 
        ? Math.round(allAchievements.reduce((sum, a) => sum + a.progress, 0) / allAchievements.length)
        : 0,
      categories: {
        tasks: allAchievements.filter(a => a.category === 'tasks').length,
        referrals: allAchievements.filter(a => a.category === 'referrals').length,
        financial: allAchievements.filter(a => a.category === 'financial').length,
        milestones: allAchievements.filter(a => a.category === 'milestones').length
      }
    };

    return apiHandler.success({
      achievements: allAchievements,
      summary,
      userStats,
      filters: {
        category,
        status,
        includeProgress
      }
    });

  } catch (error) {
    console.error('Error fetching user achievements:', error);
    return apiHandler.internalError('Failed to fetch user achievements');
  }
}

export const GET = withErrorHandler(getUserAchievementsHandler);