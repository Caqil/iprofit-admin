import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Referral } from '@/models/Referral';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import { getUserFromRequest } from '@/lib/auth-helper';
import mongoose from 'mongoose';

async function getUserReferralStatsHandler(request: NextRequest) {
  const apiHandler = new ApiHandler(request);

  try {
    // Connect to database
    await connectToDatabase();

    // Get authenticated user
    const authResult = await getUserFromRequest(request);
    if (!authResult) {
      return apiHandler.unauthorized('Authentication required');
    }

    const userId = new mongoose.Types.ObjectId(authResult.userId);

    // Get user data
    const user = await User.findById(userId).select('referralCode name email createdAt');
    if (!user) {
      return apiHandler.notFound('User not found');
    }

    // Comprehensive referral statistics
    const [
      referralStats,
      earningsStats,
      monthlyStats,
      topReferrals,
      recentActivity
    ] = await Promise.all([
      // Overall referral statistics
      Referral.aggregate([
        {
          $facet: {
            referred_by_me: [
              { $match: { referrerId: userId } },
              {
                $group: {
                  _id: '$status',
                  count: { $sum: 1 },
                  totalAmount: { $sum: { $add: ['$bonusAmount', { $ifNull: ['$profitBonus', 0] }] } }
                }
              }
            ],
            referred_by_others: [
              { $match: { refereeId: userId } },
              {
                $group: {
                  _id: '$status',
                  count: { $sum: 1 },
                  totalAmount: { $sum: { $add: ['$bonusAmount', { $ifNull: ['$profitBonus', 0] }] } }
                }
              }
            ]
          }
        }
      ]),

      // Earnings breakdown
      Referral.aggregate([
        { $match: { referrerId: userId } },
        {
          $group: {
            _id: '$bonusType',
            count: { $sum: 1 },
            totalAmount: { $sum: { $add: ['$bonusAmount', { $ifNull: ['$profitBonus', 0] }] } },
            pendingAmount: {
              $sum: {
                $cond: [
                  { $eq: ['$status', 'Pending'] },
                  { $add: ['$bonusAmount', { $ifNull: ['$profitBonus', 0] }] },
                  0
                ]
              }
            },
            paidAmount: {
              $sum: {
                $cond: [
                  { $eq: ['$status', 'Paid'] },
                  { $add: ['$bonusAmount', { $ifNull: ['$profitBonus', 0] }] },
                  0
                ]
              }
            }
          }
        }
      ]),

      // Monthly referral trend (last 12 months)
      Referral.aggregate([
        {
          $match: {
            referrerId: userId,
            createdAt: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            referrals: { $sum: 1 },
            earnings: { $sum: { $add: ['$bonusAmount', { $ifNull: ['$profitBonus', 0] }] } }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]),

      // Top performing referrals
      Referral.aggregate([
        { $match: { referrerId: userId } },
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
          $group: {
            _id: '$refereeId',
            totalEarnings: { $sum: { $add: ['$bonusAmount', { $ifNull: ['$profitBonus', 0] }] } },
            referralCount: { $sum: 1 },
            refereeName: { $first: '$referee.name' },
            refereeEmail: { $first: '$referee.email' },
            joinedDate: { $first: '$referee.createdAt' },
            lastBonusDate: { $max: '$createdAt' }
          }
        },
        { $sort: { totalEarnings: -1 } },
        { $limit: 10 }
      ]),

      // Recent referral activity (last 30 days)
      Referral.aggregate([
        {
          $match: {
            $or: [{ referrerId: userId }, { refereeId: userId }],
            createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'referrerId',
            foreignField: '_id',
            as: 'referrer'
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
        { $unwind: '$referrer' },
        { $unwind: '$referee' },
        {
          $addFields: {
            activityType: {
              $cond: [
                { $eq: ['$referrerId', userId] },
                'referred_someone',
                'was_referred'
              ]
            }
          }
        },
        { $sort: { createdAt: -1 } },
        { $limit: 20 }
      ])
    ]);

    // Process statistics
    const stats = referralStats[0];
    const referredByMe = stats.referred_by_me.reduce((acc: any, curr: any) => {
      acc[curr._id.toLowerCase()] = { count: curr.count, amount: curr.totalAmount };
      return acc;
    }, {});

    const referredByOthers = stats.referred_by_others.reduce((acc: any, curr: any) => {
      acc[curr._id.toLowerCase()] = { count: curr.count, amount: curr.totalAmount };
      return acc;
    }, {});

    // Calculate totals
    const totalReferrals = (referredByMe.pending?.count || 0) + (referredByMe.paid?.count || 0) + (referredByMe.cancelled?.count || 0);
    const totalEarnings = (referredByMe.pending?.amount || 0) + (referredByMe.paid?.amount || 0);
    const pendingEarnings = referredByMe.pending?.amount || 0;
    const paidEarnings = referredByMe.paid?.amount || 0;

    // Calculate conversion rate
    const totalUsers = await User.countDocuments({ referredBy: user.referralCode });
    const conversionRate = totalUsers > 0 ? ((totalReferrals / totalUsers) * 100) : 0;

    // Format monthly trends
    const monthlyTrends = monthlyStats.map((stat: any) => ({
      year: stat._id.year,
      month: stat._id.month,
      monthName: new Date(stat._id.year, stat._id.month - 1).toLocaleString('default', { month: 'long' }),
      referrals: stat.referrals,
      earnings: stat.earnings
    }));

    // Format top referrals
    const topReferralsList = topReferrals.map((ref: any) => ({
      userId: ref._id,
      name: ref.refereeName,
      email: ref.refereeEmail,
      totalEarnings: ref.totalEarnings,
      referralCount: ref.referralCount,
      joinedDate: ref.joinedDate,
      lastBonusDate: ref.lastBonusDate,
      daysSinceJoined: Math.floor((Date.now() - ref.joinedDate.getTime()) / (1000 * 60 * 60 * 24))
    }));

    // Format recent activity
    const recentActivities = recentActivity.map((activity: any) => ({
      id: activity._id,
      type: activity.activityType,
      amount: activity.bonusAmount + (activity.profitBonus || 0),
      bonusType: activity.bonusType,
      status: activity.status,
      partnerName: activity.activityType === 'referred_someone' ? activity.referee.name : activity.referrer.name,
      partnerEmail: activity.activityType === 'referred_someone' ? activity.referee.email : activity.referrer.email,
      createdAt: activity.createdAt
    }));

    const response = {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        referralCode: user.referralCode,
        accountAge: Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24))
      },

      overview: {
        totalReferrals,
        totalEarnings,
        pendingEarnings,
        paidEarnings,
        conversionRate: parseFloat(conversionRate.toFixed(2)),
        averageEarningPerReferral: totalReferrals > 0 ? parseFloat((totalEarnings / totalReferrals).toFixed(2)) : 0
      },

      breakdown: {
        byStatus: {
          pending: { count: referredByMe.pending?.count || 0, amount: referredByMe.pending?.amount || 0 },
          paid: { count: referredByMe.paid?.count || 0, amount: referredByMe.paid?.amount || 0 },
          cancelled: { count: referredByMe.cancelled?.count || 0, amount: referredByMe.cancelled?.amount || 0 }
        },
        byType: earningsStats.reduce((acc: any, stat: any) => {
          acc[stat._id] = {
            count: stat.count,
            totalAmount: stat.totalAmount,
            pendingAmount: stat.pendingAmount,
            paidAmount: stat.paidAmount
          };
          return acc;
        }, {})
      },

      trends: {
        monthly: monthlyTrends,
        last30Days: {
          referrals: recentActivities.filter((a: any) => a.type === 'referred_someone').length,
          earnings: recentActivities
            .filter((a: any) => a.type === 'referred_someone')
            .reduce((sum: number, a: any) => sum + a.amount, 0)
        }
      },

      topReferrals: topReferralsList,
      recentActivity: recentActivities
    };

    return apiHandler.success(response);

  } catch (error) {
    console.error('Error fetching referral stats:', error);
    return apiHandler.internalError('Failed to fetch referral statistics');
  }
}

export const GET = withErrorHandler(getUserReferralStatsHandler);
