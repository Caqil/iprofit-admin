import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Loan, ILoan } from '@/models/Loan';
import { User, IUser } from '@/models/User';
import { AuditLog } from '@/models/AuditLog';
import { authMiddleware } from '@/middleware/auth';
import { apiRateLimit } from '@/middleware/rate-limit';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import { createPaginatedResponse, createMatchStage, createSortStage, createPaginationStages } from '@/lib/api-helpers';
import { LoanFilter, LoanAnalytics, PaginationParams } from '@/types';
import { z } from 'zod';

// Loan list query validation
const loanListQuerySchema = z.object({
  page: z.string().transform(Number).pipe(z.number().min(1)).optional().default('1'),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).optional().default('10'),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  
  // Filters
  userId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  status: z.enum(['Pending', 'Approved', 'Rejected', 'Active', 'Completed', 'Defaulted']).optional(),
  amountMin: z.string().transform(Number).pipe(z.number().min(0)).optional(),
  amountMax: z.string().transform(Number).pipe(z.number().max(5500)).optional(),
  creditScoreMin: z.string().transform(Number).pipe(z.number().min(300)).optional(),
  creditScoreMax: z.string().transform(Number).pipe(z.number().max(850)).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  isOverdue: z.string().transform(Boolean).optional(),
  search: z.string().optional()
});

// GET /api/loans - List all loans with filtering and pagination
async function getLoansHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Apply middleware
  const authResult = await authMiddleware(request, {
    requireAuth: true,
    allowedUserTypes: ['admin'],
    requiredPermission: 'loans.view'
  });
  if (authResult) return authResult;

  const rateLimitResult = await apiRateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    await connectToDatabase();

    // Parse and validate query parameters
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

    if (userId) matchConditions.userId = userId;
    if (status) matchConditions.status = status;
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
      matchConditions['repaymentSchedule.dueDate'] = { $lt: new Date() };
      matchConditions['repaymentSchedule.status'] = 'Pending';
    }

    if (Object.keys(matchConditions).length > 0) {
      pipeline.push({ $match: matchConditions });
    }

    // Add user lookup
    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user',
        pipeline: [
          { $project: { name: 1, email: 1, phone: 1, kycStatus: 1 } }
        ]
      }
    });

    pipeline.push({
      $unwind: '$user'
    });

    // Search functionality
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { 'user.name': { $regex: search, $options: 'i' } },
            { 'user.email': { $regex: search, $options: 'i' } },
            { purpose: { $regex: search, $options: 'i' } }
          ]
        }
      });
    }

    // Get total count
    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await Loan.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    // Add sorting and pagination
    pipeline.push({ $sort: { [sortBy]: sortOrder === 'asc' ? 1 : -1 } });
    pipeline.push({ $skip: (page - 1) * limit });
    pipeline.push({ $limit: limit });

    // Execute query
    const loans = await Loan.aggregate(pipeline);

    // Create paginated response
    const response = createPaginatedResponse(loans, total, page, limit);

    return apiHandler.success(response);

  } catch (error) {
    console.error('Get loans error:', error);
    return apiHandler.internalError('Failed to fetch loans');
  }
}

// POST /api/loans - Create a new loan application
async function createLoanHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Apply middleware
  const authResult = await authMiddleware(request, {
    requireAuth: true,
    allowedUserTypes: ['admin'],
  });
  if (authResult) return authResult;

  try {
    await connectToDatabase();

    const body = await request.json();
    const { loanApplicationSchema } = await import('@/lib/validation');
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

    // Check if user exists and is eligible
    const user = await User.findById(loanData.userId) as IUser | null;
    if (!user) {
      return apiHandler.notFound('User not found');
    }

    if (user.kycStatus !== 'Approved') {
      return apiHandler.badRequest('KYC verification required for loan application');
    }

    // Check for existing active loans
    const existingLoan = await Loan.findOne({
      userId: loanData.userId,
      status: { $in: ['Pending', 'Approved', 'Active'] }
    });

    if (existingLoan) {
      return apiHandler.conflict('User already has an active loan application');
    }

    // Calculate credit score
    const { calculateCreditScore } = await import('@/utils/helpers');
    const creditScore = calculateCreditScore({
      income: loanData.monthlyIncome,
      employmentStability: Math.floor(
        (Date.now() - loanData.employmentDetails.workingSince.getTime()) / (1000 * 60 * 60 * 24 * 30)
      ),
      existingLoans: loanData.financialDetails.existingLoans,
      bankBalance: loanData.financialDetails.bankBalance,
      paymentHistory: 85, // Default good payment history
      age: user.dateOfBirth ? 
        Math.floor((Date.now() - user.dateOfBirth.getTime()) / (1000 * 60 * 60 * 24 * 365)) : 30
    });

    // Calculate EMI
    const { calculateEMI, generateRepaymentSchedule } = await import('@/utils/helpers');
    const interestRate = 12; // Default 12% annual interest rate
    const emiAmount = calculateEMI(loanData.amount, interestRate, loanData.tenure);
    const repaymentSchedule = generateRepaymentSchedule(
      loanData.amount,
      interestRate,
      loanData.tenure
    );

    // Create loan application
    const newLoan = await Loan.create({
      ...loanData,
      creditScore,
      interestRate,
      emiAmount,
      repaymentSchedule,
      status: 'Pending',
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
            employmentStability: Math.floor(
              (Date.now() - loanData.employmentDetails.workingSince.getTime()) / (1000 * 60 * 60 * 24 * 30)
            ),
            debtToIncomeRatio: loanData.financialDetails.existingLoans / loanData.monthlyIncome,
            collateralValue: 0
          },
          recommendation: creditScore >= 650 ? 'Approve' : creditScore >= 550 ? 'Review' : 'Reject'
        }
      }
    }) as ILoan;

    // Log audit trail
    const adminId = request.headers.get('x-user-id');
    await AuditLog.create({
      adminId,
      action: 'LOAN_APPLICATION_CREATED',
      entity: 'loan',
      entityId: newLoan._id.toString(),
      newData: {
        amount: newLoan.amount,
        userId: newLoan.userId,
        creditScore: newLoan.creditScore
      },
      ipAddress: apiHandler.getClientIP(),
      userAgent: request.headers.get('user-agent') || 'Unknown',
      severity: 'Medium'
    });

    return apiHandler.created({
      loan: newLoan,
      message: 'Loan application created successfully'
    });

  } catch (error) {
    console.error('Create loan error:', error);
    return apiHandler.internalError('Failed to create loan application');
  }
}

export const GET = withErrorHandler(getLoansHandler);
export const POST = withErrorHandler(createLoanHandler);
