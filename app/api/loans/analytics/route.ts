// app/api/loans/analytics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Loan } from '@/models/Loan';
import { authMiddleware } from '@/middleware/auth';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import { z } from 'zod';
import mongoose from 'mongoose';
import { analyticsQuerySchema } from '@/lib/validation';

// GET /api/loans/analytics - Get loan analytics and metrics
async function getLoansAnalyticsHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Apply middleware
  const authResult = await authMiddleware(request, {
    requireAuth: true,
    allowedUserTypes: ['admin', 'user'],
    requiredPermission: 'loans.view'
  });
  if (authResult) return authResult;

  try {
    await connectToDatabase();

    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    
    const validationResult = analyticsQuerySchema.safeParse(queryParams);
    if (!validationResult.success) {
      return apiHandler.validationError(
        validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      );
    }

    const { period, userId } = validationResult.data;
    const userType = request.headers.get('x-user-type');
    const requestingUserId = request.headers.get('x-user-id');

    // Build base match conditions
    let matchConditions: any = {};

    // Users can only view their own analytics
    if (userType === 'user') {
      if (requestingUserId) {
        matchConditions.userId = new mongoose.Types.ObjectId(requestingUserId);
      }
    } else if (userId) {
      matchConditions.userId = new mongoose.Types.ObjectId(userId);
    }

    // Add date filter based on period
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(0); // All time
    }

    if (period !== 'all_time') {
      matchConditions.createdAt = { $gte: startDate };
    }

    // Basic counts aggregation
    const basicStats = await Loan.aggregate([
      { $match: matchConditions },
      {
        $group: {
          _id: null,
          totalLoans: { $sum: 1 },
          pendingLoans: {
            $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] }
          },
          approvedLoans: {
            $sum: { $cond: [{ $eq: ['$status', 'Approved'] }, 1, 0] }
          },
          rejectedLoans: {
            $sum: { $cond: [{ $eq: ['$status', 'Rejected'] }, 1, 0] }
          },
          activeLoans: {
            $sum: { $cond: [{ $eq: ['$status', 'Active'] }, 1, 0] }
          },
          completedLoans: {
            $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] }
          },
          defaultedLoans: {
            $sum: { $cond: [{ $eq: ['$status', 'Defaulted'] }, 1, 0] }
          },
          totalAmount: { $sum: '$amount' },
          totalDisbursed: {
            $sum: {
              $cond: [
                { $in: ['$status', ['Active', 'Completed', 'Defaulted']] },
                '$amount',
                0
              ]
            }
          },
          totalPaid: { $sum: '$totalPaid' },
          totalOverdue: { $sum: '$overdueAmount' },
          averageLoanAmount: { $avg: '$amount' },
          averageCreditScore: { $avg: '$creditScore' },
          averageInterestRate: { $avg: '$interestRate' }
        }
      }
    ]);

    const stats = basicStats[0] || {
      totalLoans: 0,
      pendingLoans: 0,
      approvedLoans: 0,
      rejectedLoans: 0,
      activeLoans: 0,
      completedLoans: 0,
      defaultedLoans: 0,
      totalAmount: 0,
      totalDisbursed: 0,
      totalPaid: 0,
      totalOverdue: 0,
      averageLoanAmount: 0,
      averageCreditScore: 0,
      averageInterestRate: 0
    };

    // Calculate rates
    const approvalRate = stats.totalLoans > 0 ? 
      (stats.approvedLoans + stats.activeLoans + stats.completedLoans) / stats.totalLoans : 0;
    
    const defaultRate = stats.totalLoans > 0 ? 
      stats.defaultedLoans / stats.totalLoans : 0;

    // Monthly trends (last 12 months)
    const monthlyTrends = await Loan.aggregate([
      {
        $match: {
          ...matchConditions,
          createdAt: { $gte: new Date(now.getFullYear(), now.getMonth() - 11, 1) }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          applications: { $sum: 1 },
          approved: {
            $sum: {
              $cond: [
                { $in: ['$status', ['Approved', 'Active', 'Completed']] },
                1,
                0
              ]
            }
          },
          disbursed: {
            $sum: {
              $cond: [
                { $in: ['$status', ['Active', 'Completed', 'Defaulted']] },
                '$amount',
                0
              ]
            }
          },
          collected: { $sum: '$totalPaid' }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      },
      {
        $project: {
          month: {
            $concat: [
              { $toString: '$_id.year' },
              '-',
              {
                $cond: [
                  { $lt: ['$_id.month', 10] },
                  { $concat: ['0', { $toString: '$_id.month' }] },
                  { $toString: '$_id.month' }
                ]
              }
            ]
          },
          applications: 1,
          approved: 1,
          disbursed: 1,
          collected: 1
        }
      }
    ]);

    // Risk distribution
    const riskDistribution = await Loan.aggregate([
      { $match: matchConditions },
      {
        $group: {
          _id: {
            $switch: {
              branches: [
                { case: { $gte: ['$creditScore', 750] }, then: 'Low Risk' },
                { case: { $gte: ['$creditScore', 650] }, then: 'Medium Risk' },
                { case: { $gte: ['$creditScore', 550] }, then: 'High Risk' }
              ],
              default: 'Very High Risk'
            }
          },
          count: { $sum: 1 }
        }
      }
    ]);

    const riskCounts = riskDistribution.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {} as Record<string, number>);

    // Amount range distribution
    const amountRanges = await Loan.aggregate([
      { $match: matchConditions },
      {
        $group: {
          _id: {
            $switch: {
              branches: [
                { case: { $lt: ['$amount', 1000] }, then: '$0-$999' },
                { case: { $lt: ['$amount', 5000] }, then: '$1K-$4.9K' },
                { case: { $lt: ['$amount', 10000] }, then: '$5K-$9.9K' },
                { case: { $lt: ['$amount', 25000] }, then: '$10K-$24.9K' },
                { case: { $lt: ['$amount', 50000] }, then: '$25K-$49.9K' }
              ],
              default: '$50K+'
            }
          },
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    // Performance metrics by status
    const performanceMetrics = await Loan.aggregate([
      { $match: matchConditions },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          avgProcessingTime: {
            $avg: {
              $cond: [
                { $ne: ['$approvedAt', null] },
                { $subtract: ['$approvedAt', '$createdAt'] },
                null
              ]
            }
          }
        }
      }
    ]);

    // Build final analytics object
    const analytics = {
      // Basic metrics
      totalLoans: stats.totalLoans,
      approvedLoans: stats.approvedLoans,
      rejectedLoans: stats.rejectedLoans,
      activeLoans: stats.activeLoans,
      completedLoans: stats.completedLoans,
      defaultedLoans: stats.defaultedLoans,
      pendingLoans: stats.pendingLoans,

      // Financial metrics
      totalDisbursed: Math.round(stats.totalDisbursed * 100) / 100,
      totalCollected: Math.round(stats.totalPaid * 100) / 100,
      overdueAmount: Math.round(stats.totalOverdue * 100) / 100,
      averageLoanAmount: Math.round(stats.averageLoanAmount * 100) / 100,
      averageCreditScore: Math.round(stats.averageCreditScore),
      averageInterestRate: Math.round(stats.averageInterestRate * 100) / 100,

      // Calculated rates
      approvalRate: Math.round(approvalRate * 10000) / 100, // Percentage with 2 decimals
      defaultRate: Math.round(defaultRate * 10000) / 100,

      // Trends and distributions
      monthlyTrends: monthlyTrends.map(trend => ({
        month: trend.month,
        applications: trend.applications,
        approved: trend.approved,
        disbursed: Math.round(trend.disbursed * 100) / 100,
        collected: Math.round(trend.collected * 100) / 100
      })),

      riskDistribution: riskCounts,
      
      amountRanges: amountRanges.map(range => ({
        range: range._id,
        count: range.count,
        totalAmount: Math.round(range.totalAmount * 100) / 100
      })),

      // Performance metrics
      performance: {
        collectionRate: stats.totalDisbursed > 0 ? 
          Math.round((stats.totalPaid / stats.totalDisbursed) * 10000) / 100 : 0,
        overdueRate: stats.totalDisbursed > 0 ? 
          Math.round((stats.totalOverdue / stats.totalDisbursed) * 10000) / 100 : 0,
        portfolioAtRisk: stats.totalDisbursed > 0 ? 
          Math.round((stats.totalOverdue / stats.totalDisbursed) * 10000) / 100 : 0
      },

      // Additional insights
      insights: {
        mostCommonLoanRange: amountRanges.reduce((max, current) => 
          current.count > (max?.count || 0) ? current : max, null)?._id || 'N/A',
        dominantRiskCategory: Object.entries(riskCounts).reduce(
          (max: [string, number], [key, value]) =>
            (typeof value === 'number' && value > max[1]) ? [key, value] : max,
          ['unknown', 0]
        )[0],
        growthTrend: monthlyTrends.length >= 2 ? 
          monthlyTrends[monthlyTrends.length - 1].applications > monthlyTrends[monthlyTrends.length - 2].applications ? 'growing' : 'declining' : 'stable'
      },

      // Metadata
      period,
      generatedAt: new Date().toISOString(),
      totalRecords: stats.totalLoans
    };

    return apiHandler.success(analytics);

  } catch (error) {
    console.error('Get loans analytics error:', error);
    return apiHandler.internalError('Failed to fetch loan analytics');
  }
}

export const GET = withErrorHandler(getLoansAnalyticsHandler);