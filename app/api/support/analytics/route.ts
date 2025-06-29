import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { SupportTicket } from '@/models/SupportTicket';
import { FAQ } from '@/models/SupportTicket';
import { authMiddleware } from '@/middleware/auth';
import { apiRateLimit } from '@/middleware/rate-limit';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import { z } from 'zod';
import { LiveChat } from '@/models/LiveChat';

const analyticsQuerySchema = z.object({
  period: z.enum(['7d', '30d', '90d', '1y']).optional().default('30d'),
  startDate: z.string().optional().transform(val => {
    if (!val) return undefined;
    const date = new Date(val);
    return isNaN(date.getTime()) ? undefined : date;
  }),
  endDate: z.string().optional().transform(val => {
    if (!val) return undefined;
    const date = new Date(val);
    return isNaN(date.getTime()) ? undefined : date;
  })
});

// GET /api/support/analytics - Get support analytics
async function getSupportAnalyticsHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Apply middleware
  const authResult = await authMiddleware(request, {
    requireAuth: true,
    allowedUserTypes: ['admin'],
    requiredPermission: 'support.analytics'
  });
  if (authResult) return authResult;

  const rateLimitResult = await apiRateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    await connectToDatabase();

    // Parse and validate query parameters
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

    const { period, startDate, endDate } = validationResult.data;

    // Calculate date range
    let dateFilter: any = {};
    if (startDate && endDate) {
      dateFilter = {
        createdAt: { $gte: startDate, $lte: endDate }
      };
    } else {
      const now = new Date();
      const daysMap = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };
      const days = daysMap[period];
      const startPeriod = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      
      dateFilter = {
        createdAt: { $gte: startPeriod, $lte: now }
      };
    }

    // Ticket analytics
    const [
      ticketStats,
      ticketsByStatus,
      ticketsByPriority,
      ticketsByCategory,
      resolutionTimes,
      agentPerformance
    ] = await Promise.all([
      // Overall ticket statistics
      SupportTicket.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: null,
            totalTickets: { $sum: 1 },
            openTickets: {
              $sum: { $cond: [{ $eq: ['$status', 'Open'] }, 1, 0] }
            },
            inProgressTickets: {
              $sum: { $cond: [{ $eq: ['$status', 'In Progress'] }, 1, 0] }
            },
            resolvedTickets: {
              $sum: { $cond: [{ $eq: ['$status', 'Resolved'] }, 1, 0] }
            },
            closedTickets: {
              $sum: { $cond: [{ $eq: ['$status', 'Closed'] }, 1, 0] }
            },
            averageResponseTime: {
              $avg: { $ifNull: ['$responseTime', 0] }
            },
            averageResolutionTime: {
              $avg: { $ifNull: ['$resolutionTime', 0] }
            }
          }
        }
      ]),

      // Tickets by status
      SupportTicket.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]),

      // Tickets by priority
      SupportTicket.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: '$priority',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]),

      // Tickets by category
      SupportTicket.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            averageResolutionTime: {
              $avg: { $ifNull: ['$resolutionTime', 0] }
            }
          }
        },
        { $sort: { count: -1 } }
      ]),

      // Resolution time distribution
      SupportTicket.aggregate([
        { 
          $match: { 
            ...dateFilter,
            resolutionTime: { $exists: true, $ne: null }
          }
        },
        {
          $bucket: {
            groupBy: '$resolutionTime',
            boundaries: [0, 60, 240, 480, 1440, 2880, Infinity], // 0-1h, 1-4h, 4-8h, 8-24h, 24-48h, 48h+
            default: 'Other',
            output: {
              count: { $sum: 1 },
              averageTime: { $avg: '$resolutionTime' }
            }
          }
        }
      ]),

      // Agent performance
      SupportTicket.aggregate([
        { 
          $match: { 
            ...dateFilter,
            assignedTo: { $ne: null }
          }
        },
        {
          $lookup: {
            from: 'admins',
            localField: 'assignedTo',
            foreignField: '_id',
            as: 'admin'
          }
        },
        { $unwind: '$admin' },
        {
          $group: {
            _id: '$assignedTo',
            adminName: { $first: '$admin.name' },
            adminEmail: { $first: '$admin.email' },
            assignedTickets: { $sum: 1 },
            resolvedTickets: {
              $sum: { $cond: [{ $in: ['$status', ['Resolved', 'Closed']] }, 1, 0] }
            },
            averageResponseTime: {
              $avg: { $ifNull: ['$responseTime', 0] }
            },
            averageResolutionTime: {
              $avg: { $ifNull: ['$resolutionTime', 0] }
            }
          }
        },
        {
          $addFields: {
            resolutionRate: {
              $multiply: [
                { $divide: ['$resolvedTickets', '$assignedTickets'] },
                100
              ]
            }
          }
        },
        { $sort: { assignedTickets: -1 } }
      ])
    ]);

    // FAQ analytics
    const [faqStats, popularFAQs] = await Promise.all([
      FAQ.aggregate([
        {
          $group: {
            _id: null,
            totalFAQs: { $sum: 1 },
            activeFAQs: {
              $sum: { $cond: ['$isActive', 1, 0] }
            },
            totalViews: { $sum: '$viewCount' },
            totalHelpfulVotes: { $sum: '$helpfulCount' },
            totalNotHelpfulVotes: { $sum: '$notHelpfulCount' }
          }
        }
      ]),

      FAQ.aggregate([
        { $match: { isActive: true } },
        {
          $addFields: {
            helpfulPercentage: {
              $cond: {
                if: { $eq: [{ $add: ['$helpfulCount', '$notHelpfulCount'] }, 0] },
                then: 0,
                else: {
                  $multiply: [
                    { $divide: ['$helpfulCount', { $add: ['$helpfulCount', '$notHelpfulCount'] }] },
                    100
                  ]
                }
              }
            }
          }
        },
        { $sort: { viewCount: -1 } },
        { $limit: 10 },
        {
          $project: {
            question: 1,
            category: 1,
            viewCount: 1,
            helpfulCount: 1,
            notHelpfulCount: 1,
            helpfulPercentage: 1
          }
        }
      ])
    ]);

    // Live chat analytics
    const chatStats = await LiveChat.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          totalChats: { $sum: 1 },
          activeChats: {
            $sum: { $cond: [{ $eq: ['$status', 'Active'] }, 1, 0] }
          },
          waitingChats: {
            $sum: { $cond: [{ $eq: ['$status', 'Waiting'] }, 1, 0] }
          },
          endedChats: {
            $sum: { $cond: [{ $eq: ['$status', 'Ended'] }, 1, 0] }
          },
          averageRating: {
            $avg: { $ifNull: ['$rating', 0] }
          },
          averageDuration: {
            $avg: {
              $cond: {
                if: '$endedAt',
                then: { $subtract: ['$endedAt', '$startedAt'] },
                else: null
              }
            }
          }
        }
      }
    ]);

    // Response time trends (daily)
    const responseTimeTrends = await SupportTicket.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          averageResponseTime: {
            $avg: { $ifNull: ['$responseTime', 0] }
          },
          ticketCount: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // Compile analytics data
    const analytics = {
      tickets: {
        overview: ticketStats[0] || {
          totalTickets: 0,
          openTickets: 0,
          inProgressTickets: 0,
          resolvedTickets: 0,
          closedTickets: 0,
          averageResponseTime: 0,
          averageResolutionTime: 0
        },
        byStatus: ticketsByStatus,
        byPriority: ticketsByPriority,
        byCategory: ticketsByCategory,
        resolutionTimeDistribution: resolutionTimes,
        agentPerformance,
        responseTimeTrends
      },
      faq: {
        overview: faqStats[0] || {
          totalFAQs: 0,
          activeFAQs: 0,
          totalViews: 0,
          totalHelpfulVotes: 0,
          totalNotHelpfulVotes: 0
        },
        popularFAQs
      },
      liveChat: {
        overview: chatStats[0] || {
          totalChats: 0,
          activeChats: 0,
          waitingChats: 0,
          endedChats: 0,
          averageRating: 0,
          averageDuration: 0
        }
      },
      period: {
        type: period,
        startDate: dateFilter.createdAt?.$gte,
        endDate: dateFilter.createdAt?.$lte
      }
    };

    return apiHandler.success(analytics);

  } catch (error) {
    console.error('Support analytics error:', error);
    return apiHandler.internalError('Failed to fetch support analytics');
  }
}

export const GET = withErrorHandler(getSupportAnalyticsHandler);