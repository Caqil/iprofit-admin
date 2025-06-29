// app/api/loans/applications/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Loan, ILoan } from '@/models/Loan';
import { User, IUser } from '@/models/User';
import { AuditLog } from '@/models/AuditLog';
import { authMiddleware } from '@/middleware/auth';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import { sendEmail } from '@/lib/email';
import { calculateCreditScore, calculateEMI, generateRepaymentSchedule } from '@/utils/helpers';
import { z } from 'zod';
import mongoose from 'mongoose';
import { userLoanApplicationSchema } from '@/lib/validation';

// POST /api/loans/applications - Submit loan application (for authenticated users)
async function submitLoanApplicationHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Apply middleware
  const authResult = await authMiddleware(request, {
    requireAuth: true,
    allowedUserTypes: ['user']
  });
  if (authResult) return authResult;

  try {
    await connectToDatabase();

    const body = await request.json();
    const validationResult = userLoanApplicationSchema.safeParse(body);

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
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return apiHandler.unauthorized('User ID not found');
    }

    // Get user details
    const user = await User.findById(userId) as IUser | null;
    if (!user) {
      return apiHandler.badRequest('User not found');
    }

    // Check if user KYC is verified
    if (user.kycStatus !== 'Verified') {
      return apiHandler.badRequest('KYC verification required before loan application');
    }

    // Check if user has pending loans
    const existingPendingLoan = await Loan.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      status: { $in: ['Pending', 'Approved'] }
    });

    if (existingPendingLoan) {
      return apiHandler.badRequest('You already have a pending or approved loan application');
    }

    // Calculate credit score
    const creditScore = calculateCreditScore({
      income: loanData.monthlyIncome,
      employmentStability: Math.floor((Date.now() - loanData.employmentDetails.workingSince.getTime()) / (1000 * 60 * 60 * 24 * 30)),
      existingLoans: loanData.financialDetails.existingLoans,
      bankBalance: loanData.financialDetails.bankBalance,
      paymentHistory: 85, // Default good payment history for new users
      age: user.dateOfBirth ? 
        Math.floor((Date.now() - user.dateOfBirth.getTime()) / (1000 * 60 * 60 * 24 * 365)) : 30
    });

    // Default interest rate based on credit score
    const interestRate = creditScore >= 700 ? 12 : 
                        creditScore >= 650 ? 15 : 
                        creditScore >= 600 ? 18 : 20;

    // Calculate EMI
    const emiAmount = calculateEMI(loanData.amount, interestRate, loanData.tenure);
    
    // Generate repayment schedule
    const repaymentSchedule = await generateRepaymentSchedule(
      loanData.amount, 
      interestRate, 
      loanData.tenure
    );

    // Create loan application
    const newLoan = await Loan.create({
      userId: new mongoose.Types.ObjectId(userId),
      amount: loanData.amount,
      purpose: loanData.purpose,
      tenure: loanData.tenure,
      interestRate,
      emiAmount,
      totalAmount: emiAmount * loanData.tenure,
      remainingAmount: loanData.amount,
      totalPaid: 0,
      overdueAmount: 0,
      repaymentSchedule,
      currency: 'USD',
      status: 'Pending',
      creditScore,
      employmentStatus: loanData.employmentStatus,
      monthlyIncome: loanData.monthlyIncome,
      documents: loanData.documents,
      analytics: {
        creditScore,
        recommendation: creditScore >= 650 ? 'Approve' : creditScore >= 550 ? 'Review' : 'Reject'
      },
      employmentDetails: loanData.employmentDetails,
      personalDetails: loanData.personalDetails,
      financialDetails: loanData.financialDetails
    }) as ILoan;

    // Log audit trail
    await AuditLog.create({
      userId: new mongoose.Types.ObjectId(userId),
      action: 'LOAN_APPLICATION_SUBMITTED',
      entity: 'loan',
      entityId: newLoan._id.toString(),
      newData: {
        amount: newLoan.amount,
        creditScore: newLoan.creditScore,
        status: newLoan.status
      },
      ipAddress: apiHandler.getClientIP(),
      userAgent: request.headers.get('user-agent') || 'Unknown',
      severity: 'Medium'
    });

    // Send confirmation email to user
    try {
      await sendEmail({
        to: user.email,
        subject: 'Loan Application Received',
        templateId: 'loan-application-received',
        variables: {
          userName: user.name,
          loanAmount: loanData.amount,
          applicationId: newLoan._id.toString(),
          expectedProcessingTime: '3-5 business days',
          emiAmount: emiAmount,
          interestRate: interestRate,
          tenure: loanData.tenure
        }
      });
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
      // Don't fail the request if email fails
    }

    // Send notification email to admin team
    try {
      await sendEmail({
        to: process.env.ADMIN_EMAIL || 'admin@yourplatform.com',
        subject: 'New Loan Application Received',
        templateId: 'admin-loan-application-notification',
        variables: {
          userName: user.name,
          userEmail: user.email,
          loanAmount: loanData.amount,
          applicationId: newLoan._id.toString(),
          creditScore: creditScore,
          recommendation: creditScore >= 650 ? 'Approve' : creditScore >= 550 ? 'Review' : 'Reject',
          adminUrl: `${process.env.NEXTAUTH_URL}/admin/loans/${newLoan._id}`
        }
      });
    } catch (emailError) {
      console.error('Failed to send admin notification email:', emailError);
    }

    return apiHandler.created({
      application: {
        id: newLoan._id,
        amount: newLoan.amount,
        status: newLoan.status,
        creditScore: newLoan.creditScore,
        emiAmount: newLoan.emiAmount,
        interestRate: interestRate,
        tenure: loanData.tenure,
        createdAt: newLoan.createdAt
      },
      message: 'Loan application submitted successfully'
    });

  } catch (error) {
    console.error('Submit loan application error:', error);
    return apiHandler.internalError('Failed to submit loan application');
  }
}

// GET /api/loans/applications - Get user's loan applications
async function getUserLoanApplicationsHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Apply middleware
  const authResult = await authMiddleware(request, {
    requireAuth: true,
    allowedUserTypes: ['user']
  });
  if (authResult) return authResult;

  try {
    await connectToDatabase();

    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return apiHandler.unauthorized('User ID not found');
    }

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '10', 10), 50);
    const status = url.searchParams.get('status');

    // Build query
    const query: any = { userId: new mongoose.Types.ObjectId(userId) };
    if (status) {
      query.status = status;
    }

    // Get total count
    const total = await Loan.countDocuments(query);

    // Get loans with pagination
    const skip = (page - 1) * limit;
    const loans = await Loan.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('amount status creditScore emiAmount interestRate tenure purpose createdAt updatedAt')
      .lean();

    return apiHandler.success({
      applications: loans,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get user loan applications error:', error);
    return apiHandler.internalError('Failed to fetch loan applications');
  }
}

export const POST = withErrorHandler(submitLoanApplicationHandler);
export const GET = withErrorHandler(getUserLoanApplicationsHandler);