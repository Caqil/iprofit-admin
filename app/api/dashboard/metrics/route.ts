import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Transaction } from '@/models/Transaction';
import { Loan } from '@/models/Loan';
import { Referral } from '@/models/Referral';
import { SupportTicket } from '@/models/SupportTicket';
import { withErrorHandler } from '@/middleware/error-handler';
import { authMiddleware } from '@/middleware/auth';
import { ApiHandler } from '@/lib/api-helpers';
import { DashboardMetrics, DashboardFilter } from '@/types';
import { z } from 'zod';
import { dashboardFilterSchema } from '@/lib/validation';

async function getDashboardMetrics(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Check authentication
  const authResult = await authMiddleware(request, {
    requireAuth: true,
    allowedUserTypes: ['admin'],
    requiredPermission: 'dashboard.view'
  });
  if (authResult) return authResult;

  try {
    await connectToDatabase();

    // Parse and validate query parameters
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    const validationResult = dashboardFilterSchema.safeParse(queryParams);

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
      dateRange = 'month',
      startDate,
      endDate,
      currency = 'BDT',
      userSegment,
      planId
    } = validationResult.data;

    // Calculate date range
    const now = new Date();
    let dateFilter: { $gte?: Date; $lte?: Date } = {};

    switch (dateRange) {
      case 'today':
        dateFilter = {
          $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          $lte: now
        };
        break;
      case 'week':
        const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateFilter = { $gte: weekStart, $lte: now };
        break;
      case 'month':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        dateFilter = { $gte: monthStart, $lte: now };
        break;
      case 'quarter':
        const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        dateFilter = { $gte: quarterStart, $lte: now };
        break;
      case 'year':
        const yearStart = new Date(now.getFullYear(), 0, 1);
        dateFilter = { $gte: yearStart, $lte: now };
        break;
      case 'custom':
        if (startDate) dateFilter.$gte = new Date(startDate);
        if (endDate) dateFilter.$lte = new Date(endDate);
        break;
    }

    // Build user filter
    const userFilter: any = {};
    if (planId) userFilter.planId = planId;
    if (userSegment) {
      switch (userSegment) {
        case 'new':
          userFilter.createdAt = dateFilter;
          break;
        case 'active':
          userFilter.status = 'Active';
          break;
        case 'kyc_approved':
          userFilter.kycStatus = 'Approved';
          break;
      }
    }

    // Parallel aggregation queries for better performance
    const [
      userMetrics,
      transactionMetrics,
      loanMetrics,
      referralMetrics,
      supportMetrics
    ] = await Promise.all([
      // User metrics
      User.aggregate([
        { $match: userFilter },
        {
          $facet: {
            total: [{ $count: "count" }],
            active: [{ $match: { status: 'Active' } }, { $count: "count" }],
            newToday: [
              { $match: { createdAt: { $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) } } },
              { $count: "count" }
            ],
            newThisWeek: [
              { $match: { createdAt: { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } } },
              { $count: "count" }
            ],
            newThisMonth: [
              { $match: { createdAt: { $gte: new Date(now.getFullYear(), now.getMonth(), 1) } } },
              { $count: "count" }
            ],
            kycPending: [{ $match: { kycStatus: 'Pending' } }, { $count: "count" }],
            kycApproved: [{ $match: { kycStatus: 'Approved' } }, { $count: "count" }],
            suspended: [{ $match: { status: 'Suspended' } }, { $count: "count" }]
          }
        }
      ]),

      // Transaction metrics
      Transaction.aggregate([
        { $match: { createdAt: dateFilter, currency } },
        {
          $facet: {
            totalVolume: [
              { $group: { _id: null, total: { $sum: "$amount" } } }
            ],
            totalFees: [
              { $group: { _id: null, total: { $sum: "$fees" } } }
            ],
            depositsToday: [
              { 
                $match: { 
                  type: 'deposit',
                  createdAt: { $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) }
                }
              },
              { $group: { _id: null, total: { $sum: "$amount" } } }
            ],
            withdrawalsToday: [
              { 
                $match: { 
                  type: 'withdrawal',
                  createdAt: { $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) }
                }
              },
              { $group: { _id: null, total: { $sum: "$amount" } } }
            ],
            pendingApprovals: [
              { $match: { status: 'Pending' } },
              { $count: "count" }
            ],
            successRate: [
              {
                $group: {
                  _id: null,
                  total: { $sum: 1 },
                  successful: { $sum: { $cond: [{ $eq: ["$status", "Approved"] }, 1, 0] } }
                }
              }
            ],
            averageAmount: [
              { $group: { _id: null, avg: { $avg: "$amount" } } }
            ]
          }
        }
      ]),

      // Loan metrics
      Loan.aggregate([
        { $match: { createdAt: dateFilter } },
        {
          $facet: {
            totalLoans: [{ $count: "count" }],
            activeLoans: [{ $match: { status: 'Active' } }, { $count: "count" }],
            totalDisbursed: [
              { $match: { status: { $in: ['Active', 'Completed'] } } },
              { $group: { _id: null, total: { $sum: "$amount" } } }
            ],
            totalCollected: [
              { $group: { _id: null, total: { $sum: "$totalPaid" } } }
            ],
            overdueAmount: [
              { $group: { _id: null, total: { $sum: "$overdueAmount" } } }
            ],
            pendingApplications: [
              { $match: { status: 'Pending' } },
              { $count: "count" }
            ],
            approvalRate: [
              {
                $group: {
                  _id: null,
                  total: { $sum: 1 },
                  approved: { $sum: { $cond: [{ $eq: ["$status", "Approved"] }, 1, 0] } }
                }
              }
            ],
            defaultRate: [
              {
                $group: {
                  _id: null,
                  total: { $sum: 1 },
                  defaulted: { $sum: { $cond: [{ $eq: ["$status", "Defaulted"] }, 1, 0] } }
                }
              }
            ]
          }
        }
      ]),

      // Referral metrics
      Referral.aggregate([
        { $match: { createdAt: dateFilter } },
        {
          $facet: {
            totalReferrals: [{ $count: "count" }],
            activeReferrals: [{ $match: { status: 'Paid' } }, { $count: "count" }],
            totalBonusPaid: [
              { $match: { status: 'Paid' } },
              { $group: { _id: null, total: { $sum: { $add: ["$bonusAmount", "$profitBonus"] } } } }
            ],
            pendingBonuses: [
              { $match: { status: 'Pending' } },
              { $group: { _id: null, total: { $sum: { $add: ["$bonusAmount", "$profitBonus"] } } } }
            ],
            conversionRate: [
              {
                $group: {
                  _id: null,
                  total: { $sum: 1 },
                  converted: { $sum: { $cond: [{ $eq: ["$status", "Paid"] }, 1, 0] } }
                }
              }
            ],
            averageBonusPerReferral: [
              { $group: { _id: null, avg: { $avg: { $add: ["$bonusAmount", "$profitBonus"] } } } }
            ]
          }
        }
      ]),

      // Support metrics
      SupportTicket.aggregate([
        { $match: { createdAt: dateFilter } },
        {
          $facet: {
            openTickets: [{ $match: { status: { $in: ['Open', 'In Progress'] } } }, { $count: "count" }],
            resolvedToday: [
              { 
                $match: { 
                  status: 'Resolved',
                  resolvedAt: { $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) }
                }
              },
              { $count: "count" }
            ],
            averageResponseTime: [
              { $match: { responseTime: { $exists: true } } },
              { $group: { _id: null, avg: { $avg: "$responseTime" } } }
            ],
            satisfactionScore: [
              { $match: { satisfactionRating: { $exists: true } } },
              { $group: { _id: null, avg: { $avg: "$satisfactionRating" } } }
            ],
            escalatedTickets: [
              { $match: { priority: 'Urgent' } },
              { $count: "count" }
            ]
          }
        }
      ])
    ]);

    // Format metrics response
    const metrics: DashboardMetrics = {
      users: {
        total: userMetrics[0]?.total[0]?.count || 0,
        active: userMetrics[0]?.active[0]?.count || 0,
        newToday: userMetrics[0]?.newToday[0]?.count || 0,
        newThisWeek: userMetrics[0]?.newThisWeek[0]?.count || 0,
        newThisMonth: userMetrics[0]?.newThisMonth[0]?.count || 0,
        kycPending: userMetrics[0]?.kycPending[0]?.count || 0,
        kycApproved: userMetrics[0]?.kycApproved[0]?.count || 0,
        suspended: userMetrics[0]?.suspended[0]?.count || 0,
        growthRate: calculateGrowthRate(
          userMetrics[0]?.newThisMonth[0]?.count || 0,
          userMetrics[0]?.total[0]?.count || 1
        )
      },
      transactions: {
        totalVolume: transactionMetrics[0]?.totalVolume[0]?.total || 0,
        totalFees: transactionMetrics[0]?.totalFees[0]?.total || 0,
        depositsToday: transactionMetrics[0]?.depositsToday[0]?.total || 0,
        withdrawalsToday: transactionMetrics[0]?.withdrawalsToday[0]?.total || 0,
        pendingApprovals: transactionMetrics[0]?.pendingApprovals[0]?.count || 0,
        successRate: calculateSuccessRate(transactionMetrics[0]?.successRate[0]),
        averageAmount: transactionMetrics[0]?.averageAmount[0]?.avg || 0,
        growthRate: 0 // Would need historical data
      },
      loans: {
        totalLoans: loanMetrics[0]?.totalLoans[0]?.count || 0,
        activeLoans: loanMetrics[0]?.activeLoans[0]?.count || 0,
        totalDisbursed: loanMetrics[0]?.totalDisbursed[0]?.total || 0,
        totalCollected: loanMetrics[0]?.totalCollected[0]?.total || 0,
        overdueAmount: loanMetrics[0]?.overdueAmount[0]?.total || 0,
        pendingApplications: loanMetrics[0]?.pendingApplications[0]?.count || 0,
        approvalRate: calculateSuccessRate(loanMetrics[0]?.approvalRate[0]),
        defaultRate: calculateSuccessRate(loanMetrics[0]?.defaultRate[0])
      },
      referrals: {
        totalReferrals: referralMetrics[0]?.totalReferrals[0]?.count || 0,
        activeReferrals: referralMetrics[0]?.activeReferrals[0]?.count || 0,
        totalBonusPaid: referralMetrics[0]?.totalBonusPaid[0]?.total || 0,
        pendingBonuses: referralMetrics[0]?.pendingBonuses[0]?.total || 0,
        conversionRate: calculateSuccessRate(referralMetrics[0]?.conversionRate[0]),
        averageBonusPerReferral: referralMetrics[0]?.averageBonusPerReferral[0]?.avg || 0
      },
      support: {
        openTickets: supportMetrics[0]?.openTickets[0]?.count || 0,
        resolvedToday: supportMetrics[0]?.resolvedToday[0]?.count || 0,
        averageResponseTime: supportMetrics[0]?.averageResponseTime[0]?.avg || 0,
        satisfactionScore: supportMetrics[0]?.satisfactionScore[0]?.avg || 0,
        escalatedTickets: supportMetrics[0]?.escalatedTickets[0]?.count || 0,
        agentsOnline: 0 // Would need real-time data
      },
      revenue: {
        totalRevenue: (transactionMetrics[0]?.totalFees[0]?.total || 0),
        monthlyRevenue: (transactionMetrics[0]?.totalFees[0]?.total || 0), // Same for the period
        revenueGrowth: 0, // Would need historical comparison
        revenueBySource: [
          { source: 'Transaction Fees', amount: transactionMetrics[0]?.totalFees[0]?.total || 0, percentage: 100, growth: 0 }
        ],
        projectedRevenue: (transactionMetrics[0]?.totalFees[0]?.total || 0) * 1.1, // Simple projection
        profitMargin: 0.85 // 85% profit margin assumption
      }
    };

    return apiHandler.success({
      metrics,
      filters: { dateRange, startDate, endDate, currency, userSegment, planId },
      generatedAt: new Date()
    });

  } catch (error) {
    console.error('Dashboard metrics error:', error);
    return apiHandler.internalError('Failed to fetch dashboard metrics');
  }
}

// Helper functions
function calculateGrowthRate(current: number, total: number): number {
  return total > 0 ? (current / total) * 100 : 0;
}

function calculateSuccessRate(data: { total: number; successful?: number; approved?: number; converted?: number } | undefined): number {
  if (!data || data.total === 0) return 0;
  const successful = data.successful || data.approved || data.converted || 0;
  return (successful / data.total) * 100;
}

export const GET = withErrorHandler(getDashboardMetrics);
