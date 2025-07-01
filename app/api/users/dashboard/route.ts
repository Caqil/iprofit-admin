// app/api/user/dashboard/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/config/auth';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Transaction } from '@/models/Transaction';
import { Loan } from '@/models/Loan';
import { Referral } from '@/models/Referral';
import { Task } from '@/models/Task';
import { TaskSubmission } from '@/models/TaskSubmission';
import { Notification } from '@/models/Notification';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import { getUserFromRequest } from '@/lib/auth-helper';

// GET /api/user/dashboard - Get user dashboard data
async function getUserDashboardHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  try {
    await connectToDatabase();

    // Check authentication
    const authResult = await getUserFromRequest(request);
       if (!authResult) {
         return apiHandler.unauthorized('Authentication required');
       }

    const userId = authResult.userId;

    // Get user with plan details
    const user = await User.findById(userId)
      .populate('planId', 'name type dailyProfit monthlyProfit features')
      .select('-passwordHash -passwordHistory -emailVerificationToken -phoneVerificationCode -passwordResetToken -twoFactorSecret');

    if (!user) {
      return apiHandler.notFound('User not found');
    }

    if (user.status !== 'Active') {
      return apiHandler.forbidden(`Account is ${user.status.toLowerCase()}`);
    }

    // Parallel aggregations for dashboard data
    const [
      transactionStats,
      recentTransactions,
      loanStats,
      activeLoan,
      referralStats,
      recentReferrals,
      taskStats,
      availableTasks,
      unreadNotifications,
      recentNotifications
    ] = await Promise.all([
      // Transaction statistics
      Transaction.aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: null,
            totalDeposits: {
              $sum: {
                $cond: [
                  { $and: [{ $eq: ['$type', 'Deposit'] }, { $eq: ['$status', 'Approved'] }] },
                  '$amount',
                  0
                ]
              }
            },
            totalWithdrawals: {
              $sum: {
                $cond: [
                  { $and: [{ $eq: ['$type', 'Withdrawal'] }, { $eq: ['$status', 'Approved'] }] },
                  '$amount',
                  0
                ]
              }
            },
            pendingWithdrawals: {
              $sum: {
                $cond: [
                  { $and: [{ $eq: ['$type', 'Withdrawal'] }, { $eq: ['$status', 'Pending'] }] },
                  '$amount',
                  0
                ]
              }
            },
            totalTransactions: { $sum: 1 },
            thisMonthDeposits: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ['$type', 'Deposit'] },
                      { $eq: ['$status', 'Approved'] },
                      { $gte: ['$createdAt', new Date(new Date().getFullYear(), new Date().getMonth(), 1)] }
                    ]
                  },
                  '$amount',
                  0
                ]
              }
            }
          }
        }
      ]),

      // Recent transactions (last 5)
      Transaction.find({ userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('type amount status description createdAt'),

      // Loan statistics
      Loan.aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: null,
            totalLoans: { $sum: 1 },
            approvedLoans: {
              $sum: { $cond: [{ $eq: ['$status', 'Approved'] }, 1, 0] }
            },
            totalBorrowed: {
              $sum: {
                $cond: [{ $eq: ['$status', 'Approved'] }, '$amount', 0]
              }
            },
            totalRepaid: { $sum: '$repaidAmount' },
            pendingAmount: {
              $sum: {
                $cond: [
                  { $eq: ['$status', 'Active'] },
                  { $subtract: ['$amount', '$repaidAmount'] },
                  0
                ]
              }
            }
          }
        }
      ]),

      // Active loan
      Loan.findOne({ userId, status: 'Active' })
        .select('amount repaidAmount emi nextPaymentDate tenure createdAt'),

      // Referral statistics
      Referral.aggregate([
        { $match: { referrerId: userId } },
        {
          $group: {
            _id: null,
            totalReferrals: { $sum: 1 },
            paidReferrals: {
              $sum: { $cond: [{ $eq: ['$status', 'Paid'] }, 1, 0] }
            },
            totalEarnings: {
              $sum: {
                $cond: [
                  { $eq: ['$status', 'Paid'] },
                  { $add: ['$bonusAmount', '$profitBonus'] },
                  0
                ]
              }
            },
            pendingEarnings: {
              $sum: {
                $cond: [
                  { $eq: ['$status', 'Pending'] },
                  { $add: ['$bonusAmount', '$profitBonus'] },
                  0
                ]
              }
            }
          }
        }
      ]),

      // Recent referrals (last 5)
      Referral.find({ referrerId: userId })
        .populate('refereeId', 'name email')
        .sort({ createdAt: -1 })
        .limit(5)
        .select('bonusAmount profitBonus status createdAt'),

      // Task statistics
      TaskSubmission.aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: null,
            totalSubmissions: { $sum: 1 },
            approvedSubmissions: {
              $sum: { $cond: [{ $eq: ['$status', 'Approved'] }, 1, 0] }
            },
            totalEarnings: {
              $sum: {
                $cond: [{ $eq: ['$status', 'Approved'] }, '$rewardAmount', 0]
              }
            },
            pendingEarnings: {
              $sum: {
                $cond: [{ $eq: ['$status', 'Pending'] }, '$rewardAmount', 0]
              }
            }
          }
        }
      ]),

      // Available tasks (not submitted by user)
      Task.aggregate([
        {
          $lookup: {
            from: 'task_submissions',
            let: { taskId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$taskId', '$$taskId'] },
                      { $eq: ['$userId', userId] }
                    ]
                  }
                }
              }
            ],
            as: 'userSubmissions'
          }
        },
        {
          $match: {
            isActive: true,
            userSubmissions: { $size: 0 }
          }
        },
        {
          $sort: { createdAt: -1 }
        },
        {
          $limit: 3
        },
        {
          $project: {
            title: 1,
            category: 1,
            difficulty: 1,
            rewardAmount: 1,
            timeEstimate: 1,
            createdAt: 1
          }
        }
      ]),

      // Unread notifications count
      Notification.countDocuments({
        userId,
        status: { $ne: 'Read' }
      }),

      // Recent notifications (last 5)
      Notification.find({ userId })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('type title message status priority createdAt')
    ]);

    // Calculate profit based on plan and deposits
    const planProfitRate = user.planId?.dailyProfit || 0;
    const totalDeposits = transactionStats[0]?.totalDeposits || 0;
    const estimatedDailyProfit = (totalDeposits * planProfitRate) / 100;
    const estimatedMonthlyProfit = estimatedDailyProfit * 30;

    // Build dashboard response
    const dashboard = {
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        balance: user.balance,
        status: user.status,
        kycStatus: user.kycStatus,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        referralCode: user.referralCode,
        profilePicture: user.profilePicture,
        plan: user.planId ? {
          name: user.planId.name,
          type: user.planId.type,
          dailyProfit: user.planId.dailyProfit,
          monthlyProfit: user.planId.monthlyProfit,
          features: user.planId.features
        } : null
      },

      // Financial overview
      financial: {
        balance: user.balance,
        totalDeposits: transactionStats[0]?.totalDeposits || 0,
        totalWithdrawals: transactionStats[0]?.totalWithdrawals || 0,
        pendingWithdrawals: transactionStats[0]?.pendingWithdrawals || 0,
        thisMonthDeposits: transactionStats[0]?.thisMonthDeposits || 0,
        estimatedDailyProfit: estimatedDailyProfit,
        estimatedMonthlyProfit: estimatedMonthlyProfit,
        netProfit: (transactionStats[0]?.totalDeposits || 0) - (transactionStats[0]?.totalWithdrawals || 0)
      },

      // Loan overview
      loans: {
        totalLoans: loanStats[0]?.totalLoans || 0,
        approvedLoans: loanStats[0]?.approvedLoans || 0,
        totalBorrowed: loanStats[0]?.totalBorrowed || 0,
        totalRepaid: loanStats[0]?.totalRepaid || 0,
        pendingAmount: loanStats[0]?.pendingAmount || 0,
        activeLoan: activeLoan ? {
          id: activeLoan._id.toString(),
          amount: activeLoan.amount,
          repaidAmount: activeLoan.repaidAmount,
          remainingAmount: activeLoan.amount - activeLoan.repaidAmount,
          emi: activeLoan.emi,
          nextPaymentDate: activeLoan.nextPaymentDate,
          loanAge: Math.floor((Date.now() - activeLoan.createdAt.getTime()) / (1000 * 60 * 60 * 24))
        } : null
      },

      // Referral overview
      referrals: {
        totalReferrals: referralStats[0]?.totalReferrals || 0,
        paidReferrals: referralStats[0]?.paidReferrals || 0,
        totalEarnings: referralStats[0]?.totalEarnings || 0,
        pendingEarnings: referralStats[0]?.pendingEarnings || 0,
        recentReferrals: recentReferrals.map(ref => ({
          id: ref._id.toString(),
          refereeName: ref.refereeId?.name || 'Unknown',
          refereeEmail: ref.refereeId?.email || 'Unknown',
          bonusAmount: ref.bonusAmount,
          profitBonus: ref.profitBonus,
          totalBonus: ref.bonusAmount + ref.profitBonus,
          status: ref.status,
          createdAt: ref.createdAt
        }))
      },

      // Task overview
      tasks: {
        totalSubmissions: taskStats[0]?.totalSubmissions || 0,
        approvedSubmissions: taskStats[0]?.approvedSubmissions || 0,
        totalEarnings: taskStats[0]?.totalEarnings || 0,
        pendingEarnings: taskStats[0]?.pendingEarnings || 0,
        availableTasks: availableTasks.map(task => ({
          id: task._id.toString(),
          title: task.title,
          category: task.category,
          difficulty: task.difficulty,
          rewardAmount: task.rewardAmount,
          timeEstimate: task.timeEstimate
        }))
      },

      // Recent activity
      recentTransactions: recentTransactions.map(tx => ({
        id: tx._id.toString(),
        type: tx.type,
        amount: tx.amount,
        status: tx.status,
        description: tx.description,
        createdAt: tx.createdAt
      })),

      // Notifications
      notifications: {
        unreadCount: unreadNotifications,
        recent: recentNotifications.map(notif => ({
          id: notif._id.toString(),
          type: notif.type,
          title: notif.title,
          message: notif.message,
          status: notif.status,
          priority: notif.priority,
          createdAt: notif.createdAt
        }))
      },

      // Account status
      accountStatus: {
        completionPercentage: calculateAccountCompletion(user),
        requiresAttention: getAccountRequirements(user),
        isVerified: user.emailVerified && user.phoneVerified && user.kycStatus === 'Approved'
      },

      // Quick actions
      quickActions: getQuickActions(user),

      // Summary stats for widgets
      widgets: {
        totalEarnings: (referralStats[0]?.totalEarnings || 0) + (taskStats[0]?.totalEarnings || 0),
        activeInvestments: transactionStats[0]?.totalDeposits || 0,
        referralBonus: referralStats[0]?.totalEarnings || 0,
        taskRewards: taskStats[0]?.totalEarnings || 0
      },

      // Last updated
      lastUpdated: new Date().toISOString()
    };

    return apiHandler.success(dashboard);

  } catch (error) {
    console.error('Get user dashboard error:', error);
    return apiHandler.internalError('Failed to get dashboard data');
  }
}

// Helper functions
function calculateAccountCompletion(user: any): number {
  const fields = [
    user.name,
    user.email,
    user.phone,
    user.emailVerified,
    user.phoneVerified,
    user.dateOfBirth,
    user.address?.street,
    user.address?.city,
    user.kycStatus === 'Approved',
    user.profilePicture
  ];

  const completedFields = fields.filter(field => 
    field !== null && field !== undefined && field !== ''
  ).length;

  return Math.round((completedFields / fields.length) * 100);
}

function getAccountRequirements(user: any): string[] {
  const requirements: string[] = [];

  if (!user.emailVerified) {
    requirements.push('Email verification required');
  }

  if (!user.phoneVerified) {
    requirements.push('Phone verification required');
  }

  if (user.kycStatus === 'Pending') {
    requirements.push('KYC verification pending');
  }

  if (user.kycStatus === 'Rejected') {
    requirements.push('KYC verification rejected - resubmission required');
  }

  if (!user.dateOfBirth) {
    requirements.push('Date of birth required');
  }

  if (!user.address?.street || !user.address?.city) {
    requirements.push('Complete address required');
  }

  return requirements;
}

function getQuickActions(user: any): string[] {
  const actions: string[] = [];

  if (!user.emailVerified) {
    actions.push('verify_email');
  }

  if (!user.phoneVerified) {
    actions.push('verify_phone');
  }

  if (user.kycStatus === 'Pending') {
    actions.push('complete_kyc');
  }

  if (user.kycStatus === 'Rejected') {
    actions.push('resubmit_kyc');
  }

  if (user.balance > 100) {
    actions.push('withdraw_funds');
  }

  actions.push('deposit_funds', 'refer_friends', 'view_tasks');

  return actions;
}

export const GET = withErrorHandler(getUserDashboardHandler);