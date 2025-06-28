import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Transaction } from '@/models/Transaction';
import { Loan } from '@/models/Loan';
import { SupportTicket } from '@/models/SupportTicket';
import { withErrorHandler } from '@/middleware/error-handler';
import { authMiddleware } from '@/middleware/auth';
import { ApiHandler } from '@/lib/api-helpers';
import { ChartData, TimeSeriesData } from '@/types';
import { z } from 'zod';

// Chart filter validation schema
const chartFilterSchema = z.object({
  dateRange: z.enum(['today', 'week', 'month', 'quarter', 'year']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  currency: z.enum(['USD', 'BDT']).optional(),
  groupBy: z.enum(['day', 'week', 'month']).optional()
});

async function getDashboardCharts(request: NextRequest): Promise<NextResponse> {
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
    const validationResult = chartFilterSchema.safeParse(queryParams);

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
      groupBy = 'day'
    } = validationResult.data;

    // Calculate date range and grouping
    const now = new Date();
    let dateFilter: { $gte: Date; $lte: Date };
    let dateFormat: string;

    switch (dateRange) {
      case 'today':
        dateFilter = {
          $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          $lte: now
        };
        dateFormat = '%H'; // Group by hour
        break;
      case 'week':
        dateFilter = {
          $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
          $lte: now
        };
        dateFormat = '%Y-%m-%d'; // Group by day
        break;
      case 'month':
        dateFilter = {
          $gte: new Date(now.getFullYear(), now.getMonth(), 1),
          $lte: now
        };
        dateFormat = '%Y-%m-%d'; // Group by day
        break;
      case 'quarter':
        dateFilter = {
          $gte: new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1),
          $lte: now
        };
        dateFormat = '%Y-%U'; // Group by week
        break;
      case 'year':
        dateFilter = {
          $gte: new Date(now.getFullYear(), 0, 1),
          $lte: now
        };
        dateFormat = '%Y-%m'; // Group by month
        break;
      default:
        dateFilter = {
          $gte: startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1),
          $lte: endDate ? new Date(endDate) : now
        };
        dateFormat = '%Y-%m-%d';
    }

    // Parallel aggregation for chart data
    const [userGrowthData, transactionVolumeData, revenueData, loanPerformanceData, supportMetricsData] = await Promise.all([
      // User growth chart
      User.aggregate([
        { $match: { createdAt: dateFilter } },
        {
          $group: {
            _id: { $dateToString: { format: dateFormat, date: "$createdAt" } },
            count: { $sum: 1 },
            date: { $first: "$createdAt" }
          }
        },
        { $sort: { "_id": 1 } }
      ]),

      // Transaction volume chart
      Transaction.aggregate([
        { $match: { createdAt: dateFilter, currency } },
        {
          $group: {
            _id: { 
              date: { $dateToString: { format: dateFormat, date: "$createdAt" } },
              type: "$type"
            },
            volume: { $sum: "$amount" },
            count: { $sum: 1 },
            date: { $first: "$createdAt" }
          }
        },
        { $sort: { "_id.date": 1 } }
      ]),

      // Revenue chart (fees)
      Transaction.aggregate([
        { $match: { createdAt: dateFilter, currency, fees: { $gt: 0 } } },
        {
          $group: {
            _id: { $dateToString: { format: dateFormat, date: "$createdAt" } },
            revenue: { $sum: "$fees" },
            date: { $first: "$createdAt" }
          }
        },
        { $sort: { "_id": 1 } }
      ]),

      // Loan performance chart
      Loan.aggregate([
        { $match: { createdAt: dateFilter } },
        {
          $group: {
            _id: { 
              date: { $dateToString: { format: dateFormat, date: "$createdAt" } },
              status: "$status"
            },
            amount: { $sum: "$amount" },
            count: { $sum: 1 },
            date: { $first: "$createdAt" }
          }
        },
        { $sort: { "_id.date": 1 } }
      ]),

      // Support metrics chart
      SupportTicket.aggregate([
        { $match: { createdAt: dateFilter } },
        {
          $group: {
            _id: { 
              date: { $dateToString: { format: dateFormat, date: "$createdAt" } },
              status: "$status"
            },
            count: { $sum: 1 },
            avgResponseTime: { $avg: "$responseTime" },
            date: { $first: "$createdAt" }
          }
        },
        { $sort: { "_id.date": 1 } }
      ])
    ]);

    // Format chart data
    const chartData: ChartData = {
      userGrowth: userGrowthData.map(item => ({
        date: item._id,
        value: item.count,
        label: `${item.count} users`
      })),

      transactionVolume: formatTransactionVolumeData(transactionVolumeData),

      revenueChart: revenueData.map(item => ({
        date: item._id,
        value: item.revenue,
        label: `${currency} ${item.revenue.toLocaleString()}`
      })),

      loanPerformance: formatLoanPerformanceData(loanPerformanceData),

      supportMetrics: formatSupportMetricsData(supportMetricsData)
    };

    return apiHandler.success({
      chartData,
      filters: { dateRange, startDate, endDate, currency, groupBy },
      generatedAt: new Date()
    });

  } catch (error) {
    console.error('Dashboard charts error:', error);
    return apiHandler.internalError('Failed to fetch dashboard charts');
  }
}

// Helper functions for formatting chart data
function formatTransactionVolumeData(data: any[]): TimeSeriesData[] {
  const grouped = data.reduce((acc, item) => {
    const date = item._id.date;
    if (!acc[date]) {
      acc[date] = { date, deposits: 0, withdrawals: 0, total: 0 };
    }
    
    if (item._id.type === 'deposit') {
      acc[date].deposits = item.volume;
    } else if (item._id.type === 'withdrawal') {
      acc[date].withdrawals = item.volume;
    }
    
    acc[date].total += item.volume;
    return acc;
  }, {});

  return Object.values(grouped).map((item: any) => ({
    date: item.date,
    value: item.total,
    label: `Total: ${item.total.toLocaleString()}`,
    category: 'volume'
  }));
}

function formatLoanPerformanceData(data: any[]): TimeSeriesData[] {
  const grouped = data.reduce((acc, item) => {
    const date = item._id.date;
    if (!acc[date]) {
      acc[date] = { date, approved: 0, active: 0, completed: 0, defaulted: 0 };
    }
    
    acc[date][item._id.status.toLowerCase()] = item.amount;
    return acc;
  }, {});

  return Object.values(grouped).map((item: any) => ({
    date: item.date,
    value: item.approved + item.active + item.completed,
    label: `Active: ${item.active.toLocaleString()}`,
    category: 'loans'
  }));
}

function formatSupportMetricsData(data: any[]): TimeSeriesData[] {
  const grouped = data.reduce((acc, item) => {
    const date = item._id.date;
    if (!acc[date]) {
      acc[date] = { date, open: 0, resolved: 0, total: 0 };
    }
    
    if (item._id.status === 'Open') {
      acc[date].open = item.count;
    } else if (item._id.status === 'Resolved') {
      acc[date].resolved = item.count;
    }
    
    acc[date].total += item.count;
    return acc;
  }, {});

  return Object.values(grouped).map((item: any) => ({
    date: item.date,
    value: item.total,
    label: `Open: ${item.open}, Resolved: ${item.resolved}`,
    category: 'support'
  }));
}

export const GET = withErrorHandler(getDashboardCharts);