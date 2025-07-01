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
import { ApiHandler, createPaginatedResponse } from '@/lib/api-helpers';
import mongoose from 'mongoose';
import { getUserFromRequest } from '@/lib/auth-helper';

// Validation schema for rewards query
const rewardsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.enum(['amount', 'date', 'type', 'status']).default('date'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  type: z.enum(['task', 'referral', 'bonus', 'all']).default('all'),
  status: z.enum(['pending', 'approved', 'paid', 'all']).default('all'),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional()
});

async function getUserRewardsHandler(request: NextRequest) {
  const apiHandler = new ApiHandler(request);

  try {
    // Connect to database
    await connectToDatabase();
 const authResult = await getUserFromRequest(request);
        if (!authResult) {
          return apiHandler.unauthorized('Authentication required');
        }

    const userId = new mongoose.Types.ObjectId(authResult.userId);

    // Validate query parameters
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    
    const validationResult = rewardsQuerySchema.safeParse(queryParams);
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
      type,
      status,
      dateFrom,
      dateTo
    } = validationResult.data;

    // Build aggregation pipeline for rewards
    const pipeline: any[] = [];

    // Task rewards pipeline
    const taskRewardsPipeline: any[] = [
      {
        $match: {
          userId: userId,
          ...(status !== 'all' && {
            status: status === 'pending' ? 'Pending' : status === 'approved' ? 'Approved' : 'Approved'
          }),
          ...(dateFrom && { createdAt: { $gte: dateFrom } }),
          ...(dateTo && { createdAt: { $lte: dateTo } })
        }
      },
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
        $lookup: {
          from: 'transactions',
          localField: 'transactionId',
          foreignField: '_id',
          as: 'transaction'
        }
      },
      {
        $addFields: {
          rewardType: 'task',
          amount: '$reward',
          title: '$task.title',
          description: { $concat: ['Task completion: ', '$task.title'] },
          status: {
            $switch: {
              branches: [
                { case: { $eq: ['$status', 'Pending'] }, then: 'pending' },
                { case: { $eq: ['$status', 'Approved'] }, then: { $cond: [{ $gt: [{ $size: '$transaction' }, 0] }, 'paid', 'approved'] } },
                { case: { $eq: ['$status', 'Rejected'] }, then: 'rejected' }
              ],
              default: 'pending'
            }
          },
          metadata: {
            taskId: '$taskId',
            taskCategory: '$task.category',
            taskDifficulty: '$task.difficulty',
            submissionDate: '$createdAt',
            reviewDate: '$reviewedAt'
          }
        }
      }
    ];

    // Referral rewards pipeline
    const referralRewardsPipeline: any[] = [
      {
        $match: {
          referrerId: userId,
          ...(status !== 'all' && {
            status: status === 'pending' ? 'Pending' : status === 'approved' ? 'Paid' : 'Paid'
          }),
          ...(dateFrom && { createdAt: { $gte: dateFrom } }),
          ...(dateTo && { createdAt: { $lte: dateTo } })
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'refereeId',
          foreignField: '_id',
          as: 'referee'
        }
      },
      { $unwind: '$referee' },
      {
        $lookup: {
          from: 'transactions',
          localField: 'transactionId',
          foreignField: '_id',
          as: 'transaction'
        }
      },
      {
        $addFields: {
          rewardType: 'referral',
          amount: { $add: ['$bonusAmount', { $ifNull: ['$profitBonus', 0] }] },
          title: { $concat: ['Referral bonus from ', '$referee.name'] },
          description: {
            $concat: [
              'Referral reward (',
              '$bonusType',
              ') from user: ',
              '$referee.email'
            ]
          },
          status: {
            $switch: {
              branches: [
                { case: { $eq: ['$status', 'Pending'] }, then: 'pending' },
                { case: { $eq: ['$status', 'Paid'] }, then: 'paid' },
                { case: { $eq: ['$status', 'Cancelled'] }, then: 'cancelled' }
              ],
              default: 'pending'
            }
          },
          metadata: {
            refereeId: '$refereeId',
            refereeName: '$referee.name',
            refereeEmail: '$referee.email',
            bonusType: '$bonusType',
            bonusAmount: '$bonusAmount',
            profitBonus: '$profitBonus'
          }
        }
      }
    ];

    // Combine pipelines based on type filter
    let combinedPipeline: any[] = [];

    if (type === 'task') {
      combinedPipeline = [
        { $unionWith: { coll: 'task_submissions', pipeline: taskRewardsPipeline } }
      ];
    } else if (type === 'referral') {
      combinedPipeline = [
        { $unionWith: { coll: 'referrals', pipeline: referralRewardsPipeline } }
      ];
    } else {
      // type === 'all' - combine both
      combinedPipeline = [
        { $unionWith: { coll: 'task_submissions', pipeline: taskRewardsPipeline } },
        { $unionWith: { coll: 'referrals', pipeline: referralRewardsPipeline } }
      ];
    }

    // Start with empty collection and union with reward sources
    const finalPipeline: any[] = [
      { $match: { _id: { $exists: false } } }, // Empty match
      ...combinedPipeline,
      {
        $sort: {
          [sortBy === 'date' ? 'createdAt' : sortBy === 'amount' ? 'amount' : sortBy]: sortOrder === 'desc' ? -1 : 1
        }
      }
    ];

    // Get rewards with pagination
    const skip = (page - 1) * limit;
    const rewardsPipeline: any[] = [
      ...finalPipeline,
      { $skip: skip },
      { $limit: limit }
    ];

    const countPipeline: any[] = [
      ...finalPipeline,
      { $count: 'total' }
    ];

    // Execute queries
    const [rewards, countResult] = await Promise.all([
      TaskSubmission.aggregate(rewardsPipeline),
      TaskSubmission.aggregate(countPipeline)
    ]);

    const total = countResult[0]?.total || 0;

    // Get summary statistics
    const summaryPipeline: any[] = [
      ...finalPipeline,
      {
        $group: {
          _id: null,
          totalRewards: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          pendingAmount: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$amount', 0] }
          },
          approvedAmount: {
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, '$amount', 0] }
          },
          paidAmount: {
            $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$amount', 0] }
          },
          taskRewards: {
            $sum: { $cond: [{ $eq: ['$rewardType', 'task'] }, 1, 0] }
          },
          referralRewards: {
            $sum: { $cond: [{ $eq: ['$rewardType', 'referral'] }, 1, 0] }
          }
        }
      }
    ];

    const [summary] = await TaskSubmission.aggregate(summaryPipeline);

    // Format response
    const response = createPaginatedResponse(rewards, total, page, limit);

    return apiHandler.success({
      ...response,
      summary: {
        totalRewards: summary?.totalRewards || 0,
        totalAmount: summary?.totalAmount || 0,
        pendingAmount: summary?.pendingAmount || 0,
        approvedAmount: summary?.approvedAmount || 0,
        paidAmount: summary?.paidAmount || 0,
        breakdown: {
          taskRewards: summary?.taskRewards || 0,
          referralRewards: summary?.referralRewards || 0
        }
      },
      filters: {
        type,
        status,
        dateFrom,
        dateTo
      }
    });

  } catch (error) {
    console.error('Error fetching user rewards:', error);
    return apiHandler.internalError('Failed to fetch user rewards');
  }
}

export const GET = withErrorHandler(getUserRewardsHandler);
