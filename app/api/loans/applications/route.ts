import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Loan, ILoan } from '@/models/Loan';
import { User, IUser } from '@/models/User';
import { authMiddleware } from '@/middleware/auth';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import { sendEmail } from '@/lib/email';
import { z } from 'zod';

// User loan application schema
const userLoanApplicationSchema = z.object({
  amount: z.number().min(500, 'Minimum loan amount is $500').max(5500, 'Maximum loan amount is $5,500'),
  purpose: z.string().min(10, 'Purpose must be at least 10 characters').max(500, 'Purpose too long'),
  tenure: z.number().min(6, 'Minimum tenure is 6 months').max(60, 'Maximum tenure is 60 months'),
  monthlyIncome: z.number().min(1000, 'Monthly income must be at least $1,000'),
  employmentStatus: z.string().min(1, 'Employment status is required'),
  employmentDetails: z.object({
    company: z.string().min(1, 'Company name is required'),
    position: z.string().min(1, 'Position is required'),
    workingSince: z.string().transform(str => new Date(str)),
    salary: z.number().min(0)
  }),
  personalDetails: z.object({
    maritalStatus: z.enum(['Single', 'Married', 'Divorced', 'Widowed']),
    dependents: z.number().min(0).max(10),
    education: z.string().min(1, 'Education is required')
  }),
  financialDetails: z.object({
    bankBalance: z.number().min(0),
    monthlyExpenses: z.number().min(0),
    existingLoans: z.number().min(0),
    assets: z.array(z.object({
      type: z.string(),
      value: z.number().min(0),
      description: z.string()
    })).optional().default([])
  }),
  documents: z.array(z.object({
    type: z.string(),
    url: z.string().url(),
    uploadedAt: z.string().optional().default(() => new Date().toISOString()).transform(str => new Date(str))
  })).optional().default([])
});

// POST /api/loans/applications - Submit loan application (for authenticated users)
async function submitLoanApplicationHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Apply middleware
  const authResult = await authMiddleware(request, {
    requireAuth: true,
    allowedUserTypes: ['user'],
   // requireVerifiedEmail: true
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

    // Verify user exists and is eligible
    const user = await User.findById(userId) as IUser | null;
    if (!user) {
      return apiHandler.badRequest('User not found');
    }

    if (user.kycStatus !== 'Approved') {
      return apiHandler.badRequest('KYC verification required before applying for a loan');
    }

    // Check if user has pending loans
    const existingPendingLoan = await Loan.findOne({
      userId,
      status: { $in: ['Pending', 'Approved', 'Active'] }
    });

    if (existingPendingLoan) {
      return apiHandler.badRequest('You already have an active or pending loan application');
    }

    // Calculate credit score
    const { calculateCreditScore, calculateEMI, generateRepaymentSchedule } = await import('@/utils/helpers');
    
    const creditScore = calculateCreditScore({
      income: loanData.monthlyIncome,
      employmentStability: Math.floor(
        (Date.now() - loanData.employmentDetails.workingSince.getTime()) / (1000 * 60 * 60 * 24 * 30)
      ),
      existingLoans: loanData.financialDetails.existingLoans,
      bankBalance: loanData.financialDetails.bankBalance,
      paymentHistory: 80, // Default for new applicants
      age: user.dateOfBirth ? 
        Math.floor((Date.now() - user.dateOfBirth.getTime()) / (1000 * 60 * 60 * 24 * 365)) : 30
    });

    // Calculate EMI with base rate
    const baseInterestRate = 15; // Higher rate for user applications (admin can adjust)
    const emiAmount = calculateEMI(loanData.amount, baseInterestRate, loanData.tenure);
    const repaymentSchedule = await generateRepaymentSchedule(
      loanData.amount,
      baseInterestRate,
      loanData.tenure
    );

    // Transform schedule
    const transformedSchedule = repaymentSchedule.map((item, index) => ({
      installmentNumber: item.installmentNumber,
      dueDate: new Date(Date.now() + (index + 1) * 30 * 24 * 60 * 60 * 1000),
      amount: item.amount,
      principal: item.principal,
      interest: item.interest,
      status: 'Pending' as const
    }));

    // Create loan application
    const newLoan = await Loan.create({
      userId,
      amount: loanData.amount,
      currency: 'USD',
      interestRate: baseInterestRate,
      tenure: loanData.tenure,
      emiAmount,
      creditScore,
      status: 'Pending',
      purpose: loanData.purpose,
      monthlyIncome: loanData.monthlyIncome,
      employmentStatus: loanData.employmentStatus,
      documents: loanData.documents,
      repaymentSchedule: transformedSchedule,
      totalPaid: 0,
      remainingAmount: loanData.amount,
      overdueAmount: 0,
      penaltyAmount: 0,
      metadata: {
        applicationSource: 'user_portal',
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
        },
        employmentDetails: loanData.employmentDetails,
        personalDetails: loanData.personalDetails,
        financialDetails: loanData.financialDetails
      }
    }) as ILoan;

    // Send confirmation email
    try {
      await sendEmail({
        to: user.email,
        subject: 'Loan Application Received',
        templateId: 'loan-application-received',
        data: {
          userName: user.name,
          loanAmount: loanData.amount,
          applicationId: newLoan._id.toString(),
          expectedProcessingTime: '3-5 business days'
        }
      });
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
      // Don't fail the request if email fails
    }

    return apiHandler.created({
      application: {
        id: newLoan._id,
        amount: newLoan.amount,
        status: newLoan.status,
        creditScore: newLoan.creditScore,
        emiAmount: newLoan.emiAmount,
        createdAt: newLoan.createdAt
      },
      message: 'Loan application submitted successfully'
    });

  } catch (error) {
    console.error('Submit loan application error:', error);
    return apiHandler.internalError('Failed to submit loan application');
  }
}

export const POST = withErrorHandler(submitLoanApplicationHandler);

