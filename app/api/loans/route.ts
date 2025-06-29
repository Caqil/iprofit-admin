// app/api/loans/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Loan, ILoan } from '@/models/Loan';
import { User, IUser } from '@/models/User';
import { AuditLog } from '@/models/AuditLog';
import { authMiddleware } from '@/middleware/auth';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler, createPaginatedResponse } from '@/lib/api-helpers';
import { sendEmail } from '@/lib/email';
import { calculateCreditScore, calculateEMI, generateRepaymentSchedule } from '@/utils/helpers';
import { z } from 'zod';
import mongoose from 'mongoose';
import { loanListQuerySchema, loanApplicationSchema } from '@/lib/validation';


// GET /api/loans - Get loans list with filtering and pagination
async function getLoansHandler(request: NextRequest): Promise<NextResponse> {
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

    const userType = request.headers.get('x-user-type');
    const requestingUserId = request.headers.get('x-user-id');

    // Build aggregation pipeline
    const pipeline: any[] = [];

    // Match stage for filtering
    const matchConditions: any = {};

    // Users can only view their own loans
    if (userType === 'user') {
      if (requestingUserId) {
        matchConditions.userId = new mongoose.Types.ObjectId(requestingUserId);
      } else {
        return apiHandler.badRequest('Missing or invalid user ID in request headers');
      }
    } else if (userId) {
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
      matchConditions.overdueAmount = { $gt: 0 };
    }

    if (search) {
      matchConditions.$or = [
        { purpose: { $regex: search, $options: 'i' } },
        { 'employmentDetails.company': { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } }
      ];
    }

    if (Object.keys(matchConditions).length > 0) {
      pipeline.push({ $match: matchConditions });
    }

    // Lookup user details
    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user'
      }
    });

    pipeline.push({
      $unwind: '$user'
    });

    // Get total count
    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await Loan.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    // Add sorting
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

// POST /api/loans - Create new loan application (Admin only)
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

    // Calculate credit score if not provided
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

    // Calculate EMI
    const emiAmount = calculateEMI(loanData.amount, loanData.interestRate, loanData.tenure);
    
    // Generate repayment schedule
    const repaymentSchedule = await generateRepaymentSchedule(
      loanData.amount, 
      loanData.interestRate, 
      loanData.tenure
    );

    // Create loan
    const newLoan = await Loan.create({
      ...loanData,
      emiAmount,
      creditScore,
      totalAmount: emiAmount * loanData.tenure,
      remainingAmount: loanData.amount,
      totalPaid: 0,
      overdueAmount: 0,
      repaymentSchedule,
      currency: 'USD',
      status: 'Pending',
      analytics: {
        creditScore,
        recommendation: creditScore >= 650 ? 'Approve' : creditScore >= 550 ? 'Review' : 'Reject'
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

    // Send email notification to user
    try {
      await sendEmail({
        to: user.email,
        subject: 'Loan Application Created',
        templateId: 'loan-application-received',
        variables: {
          userName: user.name,
          loanAmount: loanData.amount,
          applicationId: newLoan._id.toString(),
          expectedProcessingTime: '3-5 business days'
        }
      });
    } catch (emailError) {
      console.error('Failed to send loan creation email:', emailError);
      // Don't fail the request if email fails
    }

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