import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Loan, ILoan } from '@/models/Loan';
import { User, IUser } from '@/models/User';
import { AuditLog } from '@/models/AuditLog';
import { authMiddleware } from '@/middleware/auth';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler, createPaginatedResponse, createMatchStage, createSortStage, createPaginationStages } from '@/lib/api-helpers';
import { loanApplicationSchema } from '@/lib/validation';
import { calculateCreditScore, calculateEMI, generateRepaymentSchedule } from '@/utils/helpers';
import { LoanFilter, PaginationParams } from '@/types';
import { z } from 'zod';
import mongoose from 'mongoose';

// Loan list query validation schema
const loanListQuerySchema = z.object({
  page: z.string().optional().default('1').transform(val => {
    const num = parseInt(val, 10);
    return isNaN(num) || num < 1 ? 1 : num;
  }),
  limit: z.string().optional().default('10').transform(val => {
    const num = parseInt(val, 10);
    return isNaN(num) || num < 1 ? 10 : Math.min(num, 100);
  }),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  
  // Filters
  userId: z.string().optional().refine(val => !val || /^[0-9a-fA-F]{24}$/.test(val), 'Invalid user ID'),
  status: z.enum(['Pending', 'Approved', 'Rejected', 'Active', 'Completed', 'Defaulted']).optional(),
  amountMin: z.string().optional().transform(val => {
    if (!val || val === '') return undefined;
    const num = parseFloat(val);
    return isNaN(num) ? undefined : num;
  }),
  amountMax: z.string().optional().transform(val => {
    if (!val || val === '') return undefined;
    const num = parseFloat(val);
    return isNaN(num) ? undefined : num;
  }),
  creditScoreMin: z.string().optional().transform(val => {
    if (!val || val === '') return undefined;
    const num = parseInt(val, 10);
    return isNaN(num) ? undefined : num;
  }),
  creditScoreMax: z.string().optional().transform(val => {
    if (!val || val === '') return undefined;
    const num = parseInt(val, 10);
    return isNaN(num) ? undefined : num;
  }),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  isOverdue: z.string().optional().transform(val => {
    if (!val || val === '') return undefined;
    return val === 'true';
  }),
  search: z.string().optional()
});

// GET /api/loans - Get loans list with filtering and pagination
async function getLoansHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Apply middleware
  const authResult = await authMiddleware(request, {
    requireAuth: true,
    allowedUserTypes: ['admin'],
    requiredPermission: 'loans.view'
  });
  if (authResult) return authResult;

  try {
    await connectToDatabase();

    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    
    const validationResult = loanListQuerySchema.safeParse(queryParams);
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
      userId,
      status,
      amountMin,
      amountMax,
      creditScoreMin,
      creditScoreMax,
      dateFrom,
      dateTo,
      isOverdue,
      search
    } = validationResult.data;

    // Build aggregation pipeline
    const pipeline: any[] = [];

    // Match stage for filtering
    const matchConditions: any = {};

    if (userId) {
      matchConditions.userId = new mongoose.Types.ObjectId(userId);
    }

    if (status) {
      matchConditions.status = status;
    }

    if (amountMin !== undefined || amountMax !== undefined) {
      matchConditions.amount = {};
      if (amountMin !== undefined) matchConditions.amount.$gte = amountMin;
      if (amountMax !== undefined) matchConditions.amount.$lte = amountMax;
    }

    if (creditScoreMin !== undefined || creditScoreMax !== undefined) {
      matchConditions.creditScore = {};
      if (creditScoreMin !== undefined) matchConditions.creditScore.$gte = creditScoreMin;
      if (creditScoreMax !== undefined) matchConditions.creditScore.$lte = creditScoreMax;
    }

    if (dateFrom || dateTo) {
      matchConditions.createdAt = {};
      if (dateFrom) matchConditions.createdAt.$gte = new Date(dateFrom);
      if (dateTo) matchConditions.createdAt.$lte = new Date(dateTo);
    }

    if (isOverdue) {
      matchConditions['repaymentSchedule'] = {
        $elemMatch: {
          status: 'Overdue'
        }
      };
    }

    if (search) {
      matchConditions.$or = [
        { purpose: { $regex: search, $options: 'i' } },
        { employmentStatus: { $regex: search, $options: 'i' } },
        { 'metadata.applicationSource': { $regex: search, $options: 'i' } }
      ];
    }

    pipeline.push({ $match: matchConditions });

    // Lookup user details
    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user',
        pipeline: [
          {
            $project: {
              name: 1,
              email: 1,
              phone: 1,
              kycStatus: 1,
              planId: 1
            }
          }
        ]
      }
    });

    pipeline.push({
      $unwind: {
        path: '$user',
        preserveNullAndEmptyArrays: true
      }
    });

    // Lookup approved by admin details
    pipeline.push({
      $lookup: {
        from: 'admins',
        localField: 'approvedBy',
        foreignField: '_id',
        as: 'approvedByAdmin',
        pipeline: [
          {
            $project: {
              name: 1,
              email: 1
            }
          }
        ]
      }
    });

    pipeline.push({
      $unwind: {
        path: '$approvedByAdmin',
        preserveNullAndEmptyArrays: true
      }
    });

    // Add computed fields
    pipeline.push({
      $addFields: {
        hasOverduePayments: {
          $gt: [
            {
              $size: {
                $filter: {
                  input: '$repaymentSchedule',
                  cond: { $eq: ['$$this.status', 'Overdue'] }
                }
              }
            },
            0
          ]
        },
        nextPaymentDate: {
          $min: {
            $map: {
              input: {
                $filter: {
                  input: '$repaymentSchedule',
                  cond: { $eq: ['$$this.status', 'Pending'] }
                }
              },
              in: '$$this.dueDate'
            }
          }
        }
      }
    });

    // Count total documents
    const countPipeline = [...pipeline, { $count: 'total' }];
    const totalResult = await Loan.aggregate(countPipeline);
    const total = totalResult[0]?.total || 0;

    // Sort and paginate
    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    pipeline.push({ $sort: { [sortBy]: sortDirection } });
    
    const skip = (page - 1) * limit;
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limit });

    // Execute query
    const loans = await Loan.aggregate(pipeline);

    const response = createPaginatedResponse(loans, total, page, limit);

    return apiHandler.success(response);

  } catch (error) {
    console.error('Get loans error:', error);
    return apiHandler.internalError('Failed to fetch loans');
  }
}

// POST /api/loans - Create new loan application
async function createLoanHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Apply middleware
  const authResult = await authMiddleware(request, {
    requireAuth: true,
    allowedUserTypes: ['admin'],
    requiredPermission: 'loans.create'
  });
  if (authResult) return authResult;

  try {
    await connectToDatabase();

    const body = await request.json();
    const validationResult = loanApplicationSchema.safeParse(body);

    if (!validationResult.success) {
      return apiHandler.validationError(
        validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      );
    }

    const loanData = validationResult.data;

    // Verify user exists
    const user = await User.findById(loanData.userId) as IUser | null;
    if (!user) {
      return apiHandler.badRequest('User not found');
    }

    // Check if user has pending loans
    const existingPendingLoan = await Loan.findOne({
      userId: loanData.userId,
      status: { $in: ['Pending', 'Approved'] }
    });

    if (existingPendingLoan) {
      return apiHandler.badRequest('User already has a pending or approved loan application');
    }

    // Calculate credit score
    const creditScore = calculateCreditScore({
      income: loanData.monthlyIncome,
      employmentStability: loanData.employmentDetails ? 
        Math.floor((Date.now() - loanData.employmentDetails.workingSince.getTime()) / (1000 * 60 * 60 * 24 * 30)) : 24,
      existingLoans: loanData.financialDetails.existingLoans,
      bankBalance: loanData.financialDetails.bankBalance,
      paymentHistory: 85, // Default good payment history
      age: user.dateOfBirth ? 
        Math.floor((Date.now() - user.dateOfBirth.getTime()) / (1000 * 60 * 60 * 24 * 365)) : 30
    });

    // Calculate EMI with default interest rate
    const interestRate = 12; // Default 12% annual interest rate
    const emiAmount = calculateEMI(loanData.amount, interestRate, loanData.tenure);
    const repaymentSchedule = await generateRepaymentSchedule(
      loanData.amount,
      interestRate,
      loanData.tenure
    );

    // Transform schedule to match schema
    const transformedSchedule = repaymentSchedule.map((item, index) => ({
      installmentNumber: item.installmentNumber,
      dueDate: new Date(Date.now() + (index + 1) * 30 * 24 * 60 * 60 * 1000), // Monthly intervals
      amount: item.amount,
      principal: item.principal,
      interest: item.interest,
      status: 'Pending' as const
    }));

    // Create loan application
    const newLoan = await Loan.create({
      userId: loanData.userId,
      amount: loanData.amount,
      currency: 'USD',
      interestRate,
      tenure: loanData.tenure,
      emiAmount,
      creditScore,
      status: 'Pending',
      purpose: loanData.purpose,
      monthlyIncome: loanData.monthlyIncome,
      employmentStatus: loanData.employmentStatus,
      collateral: loanData.collateral,
      documents: loanData.documents || [],
      repaymentSchedule: transformedSchedule,
      totalPaid: 0,
      remainingAmount: loanData.amount,
      overdueAmount: 0,
      penaltyAmount: 0,
      metadata: {
        applicationSource: 'admin_panel',
        riskAssessment: {
          score: creditScore,
          factors: {
            income: loanData.monthlyIncome,
            creditScore,
            employmentStability: loanData.employmentDetails ? 
              Math.floor((Date.now() - loanData.employmentDetails.workingSince.getTime()) / (1000 * 60 * 60 * 24 * 30)) : 24,
            debtToIncomeRatio: loanData.financialDetails.existingLoans / loanData.monthlyIncome,
            collateralValue: loanData.collateral?.value || 0
          },
          recommendation: creditScore >= 650 ? 'Approve' : creditScore >= 550 ? 'Review' : 'Reject'
        }
      }
    }) as ILoan;

    // Log audit trail
    const adminId = request.headers.get('x-user-id');
    await AuditLog.create({
      adminId: adminId ? new mongoose.Types.ObjectId(adminId) : null,
      action: 'LOAN_APPLICATION_CREATED',
      entity: 'loan',
      entityId: newLoan._id.toString(),
      newData: {
        amount: newLoan.amount,
        userId: newLoan.userId,
        creditScore: newLoan.creditScore,
        status: newLoan.status
      },
      ipAddress: apiHandler.getClientIP(),
      userAgent: request.headers.get('user-agent') || 'Unknown',
      severity: 'Medium'
    });

    // Populate user details for response
    const populatedLoan = await Loan.findById(newLoan._id)
      .populate('userId', 'name email phone kycStatus planId')
      .exec();

    return apiHandler.created({
      loan: populatedLoan,
      message: 'Loan application created successfully'
    });

  } catch (error) {
    console.error('Create loan error:', error);
    return apiHandler.internalError('Failed to create loan application');
  }
}

export const GET = withErrorHandler(getLoansHandler);
export const POST = withErrorHandler(createLoanHandler);