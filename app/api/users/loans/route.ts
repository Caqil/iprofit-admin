import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Loan } from '@/models/Loan';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler, createPaginatedResponse } from '@/lib/api-helpers';
import { getUserFromRequest } from '@/lib/auth-helper';
import mongoose from 'mongoose';

// Validation schema for loans query
const loansQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.enum(['date', 'amount', 'status', 'dueDate']).default('date'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  status: z.enum(['all', 'pending', 'approved', 'rejected', 'active', 'completed', 'defaulted']).default('all'),
  search: z.string().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional()
});

async function getUserLoansHandler(request: NextRequest) {
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

    // Validate query parameters
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    
    const validationResult = loansQuerySchema.safeParse(queryParams);
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
      status,
      search,
      dateFrom,
      dateTo
    } = validationResult.data;

    // Build aggregation pipeline
    const pipeline: mongoose.PipelineStage[] = [];

    // Match stage for user's loans
    const matchConditions: any = { userId: userId };

    // Status filter
    if (status !== 'all') {
      const statusMapping = {
        pending: 'Pending',
        approved: 'Approved', 
        rejected: 'Rejected',
        active: 'Active',
        completed: 'Completed',
        defaulted: 'Defaulted'
      };
      matchConditions.status = statusMapping[status];
    }

    // Date range filter
    if (dateFrom || dateTo) {
      matchConditions.createdAt = {};
      if (dateFrom) matchConditions.createdAt.$gte = dateFrom;
      if (dateTo) matchConditions.createdAt.$lte = dateTo;
    }

    // Search filter
    if (search) {
      matchConditions.$or = [
        { purpose: { $regex: search, $options: 'i' } },
        { employmentStatus: { $regex: search, $options: 'i' } }
      ];
    }

    pipeline.push({ $match: matchConditions });

    // Add computed fields for enhanced data
    pipeline.push({
      $addFields: {
        nextPaymentDate: {
          $arrayElemAt: [
            {
              $map: {
                input: {
                  $filter: {
                    input: '$repaymentSchedule',
                    cond: { $eq: ['$$this.status', 'Pending'] }
                  }
                },
                as: 'payment',
                in: '$$payment.dueDate'
              }
            },
            0
          ]
        },
        nextPaymentAmount: {
          $arrayElemAt: [
            {
              $map: {
                input: {
                  $filter: {
                    input: '$repaymentSchedule',
                    cond: { $eq: ['$$this.status', 'Pending'] }
                  }
                },
                as: 'payment',
                in: '$$payment.amount'
              }
            },
            0
          ]
        },
        paidInstallments: {
          $size: {
            $filter: {
              input: '$repaymentSchedule',
              cond: { $eq: ['$$this.status', 'Paid'] }
            }
          }
        },
        overdueInstallments: {
          $size: {
            $filter: {
              input: '$repaymentSchedule',
              cond: { 
                $and: [
                  { $eq: ['$$this.status', 'Pending'] },
                  { $lt: ['$$this.dueDate', new Date()] }
                ]
              }
            }
          }
        },
        progressPercentage: {
          $multiply: [
            { $divide: ['$totalPaid', '$amount'] },
            100
          ]
        },
        daysRemaining: {
          $cond: [
            { $eq: ['$status', 'Active'] },
            {
              $floor: {
                $divide: [
                  {
                    $subtract: [
                      {
                        $arrayElemAt: [
                          {
                            $map: {
                              input: {
                                $filter: {
                                  input: '$repaymentSchedule',
                                  cond: { $eq: ['$$this.status', 'Pending'] }
                                }
                              },
                              as: 'payment',
                              in: '$$payment.dueDate'
                            }
                          },
                          -1
                        ]
                      },
                      new Date()
                    ]
                  },
                  1000 * 60 * 60 * 24
                ]
              }
            },
            null
          ]
        }
      }
    });

    // Count total documents
    const countPipeline = [...pipeline, { $count: 'total' }];

    // Sort and paginate
    const sortField = sortBy === 'date' ? 'createdAt' : 
                     sortBy === 'amount' ? 'amount' : 
                     sortBy === 'dueDate' ? 'nextPaymentDate' : 'createdAt';

    pipeline.push(
      { $sort: { [sortField]: sortOrder === 'desc' ? -1 : 1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit }
    );

    // Execute queries
    const [loans, countResult] = await Promise.all([
      Loan.aggregate(pipeline),
      Loan.aggregate(countPipeline)
    ]);

    const total = countResult[0]?.total || 0;

    // Get summary statistics
    const summaryStats = await Loan.aggregate([
      { $match: { userId: userId } },
      {
        $group: {
          _id: null,
          totalLoans: { $sum: 1 },
          totalBorrowed: { $sum: '$amount' },
          totalRepaid: { $sum: '$totalPaid' },
          activeLoans: {
            $sum: { $cond: [{ $eq: ['$status', 'Active'] }, 1, 0] }
          },
          pendingLoans: {
            $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] }
          },
          completedLoans: {
            $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] }
          },
          totalOverdue: { $sum: '$overdueAmount' },
          totalPenalty: { $sum: '$penaltyAmount' }
        }
      }
    ]);

    const summary = summaryStats[0] || {
      totalLoans: 0,
      totalBorrowed: 0,
      totalRepaid: 0,
      activeLoans: 0,
      pendingLoans: 0,
      completedLoans: 0,
      totalOverdue: 0,
      totalPenalty: 0
    };

    // Format loan data
    const formattedLoans = loans.map(loan => ({
      id: loan._id,
      amount: loan.amount,
      currency: loan.currency,
      interestRate: loan.interestRate,
      tenure: loan.tenure,
      emiAmount: loan.emiAmount,
      status: loan.status,
      purpose: loan.purpose,
      creditScore: loan.creditScore,
      totalPaid: loan.totalPaid,
      remainingAmount: loan.remainingAmount,
      overdueAmount: loan.overdueAmount,
      penaltyAmount: loan.penaltyAmount,
      nextPaymentDate: loan.nextPaymentDate,
      nextPaymentAmount: loan.nextPaymentAmount,
      paidInstallments: loan.paidInstallments,
      overdueInstallments: loan.overdueInstallments,
      progressPercentage: Math.round(loan.progressPercentage || 0),
      daysRemaining: loan.daysRemaining,
      approvedAt: loan.approvedAt,
      disbursedAt: loan.disbursedAt,
      completedAt: loan.completedAt,
      createdAt: loan.createdAt,
      updatedAt: loan.updatedAt
    }));

    // Create paginated response
    const response = createPaginatedResponse(formattedLoans, total, page, limit);

    return apiHandler.success({
      ...response,
      summary,
      filters: {
        status,
        search,
        dateFrom,
        dateTo
      }
    });

  } catch (error) {
    console.error('Error fetching user loans:', error);
    return apiHandler.internalError('Failed to fetch user loans');
  }
}

export const GET = withErrorHandler(getUserLoansHandler);