import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Loan } from '@/models/Loan';
import { AuditLog } from '@/models/AuditLog';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import { getUserFromRequest } from '@/lib/auth-helper';
import { sendEmail } from '@/lib/email';
import { calculateCreditScore, calculateEMI } from '@/utils/helpers';
import { LOAN_CONFIG, EMPLOYMENT_STATUSES } from '@/utils/constants';
import mongoose from 'mongoose';

// Enhanced loan application validation schema
const loanApplicationSchema = z.object({
  amount: z.number()
    .min(LOAN_CONFIG.AMOUNTS.MINIMUM, `Minimum loan amount is ${LOAN_CONFIG.AMOUNTS.MINIMUM}`)
    .max(LOAN_CONFIG.AMOUNTS.MAXIMUM, `Maximum loan amount is ${LOAN_CONFIG.AMOUNTS.MAXIMUM}`),
  purpose: z.string().min(10, 'Purpose must be at least 10 characters').max(500),
  tenure: z.number()
    .min(LOAN_CONFIG.TENURE.MINIMUM_MONTHS, `Minimum tenure is ${LOAN_CONFIG.TENURE.MINIMUM_MONTHS} months`)
    .max(LOAN_CONFIG.TENURE.MAXIMUM_MONTHS, `Maximum tenure is ${LOAN_CONFIG.TENURE.MAXIMUM_MONTHS} months`),
  monthlyIncome: z.number().min(LOAN_CONFIG.ELIGIBILITY.MIN_MONTHLY_INCOME, 'Insufficient monthly income'),
  employmentStatus: z.enum(EMPLOYMENT_STATUSES as [string, ...string[]]),
  employmentDetails: z.object({
    companyName: z.string().min(2, 'Company name required'),
    designation: z.string().min(2, 'Designation required'),
    workingSince: z.coerce.date(),
    officialEmail: z.string().email().optional(),
    companyAddress: z.string().min(10, 'Company address required')
  }),
  financialDetails: z.object({
    bankBalance: z.number().min(0),
    existingLoans: z.number().min(0),
    monthlyExpenses: z.number().min(0),
    otherIncome: z.number().min(0).optional()
  }),
  collateral: z.object({
    type: z.string().optional(),
    value: z.number().min(0).optional(),
    description: z.string().optional()
  }).optional(),
  documents: z.array(z.object({
    type: z.string(),
    url: z.string().url(),
    filename: z.string()
  })).min(1, 'At least one document is required'),
  agreeToTerms: z.boolean().refine(val => val === true, 'You must agree to terms and conditions')
});

// Generate repayment schedule
type RepaymentInstallment = {
  installmentNumber: number;
  dueDate: Date;
  amount: number;
  principal: number;
  interest: number;
  status: string;
};

async function generateRepaymentSchedule(
  principal: number,
  annualRate: number,
  tenureMonths: number
): Promise<RepaymentInstallment[]> {
  const monthlyRate = annualRate / 100 / 12;
  const emiAmount = calculateEMI(principal, annualRate, tenureMonths);
  
  let balance = principal;
  const schedule: RepaymentInstallment[] = [];
  
  for (let i = 1; i <= tenureMonths; i++) {
    const interest = balance * monthlyRate;
    const principalPayment = emiAmount - interest;
    balance = Math.max(0, balance - principalPayment);
    
    const dueDate = new Date();
    dueDate.setMonth(dueDate.getMonth() + i);
    
    schedule.push({
      installmentNumber: i,
      dueDate: dueDate,
      amount: Math.round(emiAmount * 100) / 100,
      principal: Math.round(principalPayment * 100) / 100,
      interest: Math.round(interest * 100) / 100,
      status: 'Pending'
    });
  }
  
  return schedule;
}

async function applyForLoanHandler(request: NextRequest) {
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

    // Parse request body
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

    // Get user data
    const user = await User.findById(userId);
    if (!user) {
      return apiHandler.notFound('User not found');
    }

    // Check KYC status
    if (user.kycStatus !== 'Approved') {
      return apiHandler.badRequest('KYC verification required before loan application');
    }

    // Check for existing pending/active loans
    const existingLoan = await Loan.findOne({
      userId: userId,
      status: { $in: ['Pending', 'Approved', 'Active'] }
    });

    if (existingLoan) {
      return apiHandler.badRequest('You already have a pending or active loan. Please complete it before applying for a new one.');
    }

    // Calculate credit score
    const employmentMonths = Math.floor(
      (Date.now() - loanData.employmentDetails.workingSince.getTime()) / (1000 * 60 * 60 * 24 * 30)
    );
    
    const creditScore = calculateCreditScore({
      income: loanData.monthlyIncome,
      employmentStability: employmentMonths,
      existingLoans: loanData.financialDetails.existingLoans,
      bankBalance: loanData.financialDetails.bankBalance,
      paymentHistory: 85, // Default for new users
      age: user.dateOfBirth ? 
        Math.floor((Date.now() - user.dateOfBirth.getTime()) / (1000 * 60 * 60 * 24 * 365)) : 30
    });

    // Check minimum credit score requirement
    if (creditScore < LOAN_CONFIG.ELIGIBILITY.MIN_CREDIT_SCORE) {
      return apiHandler.badRequest(`Credit score too low. Minimum required: ${LOAN_CONFIG.ELIGIBILITY.MIN_CREDIT_SCORE}, Your score: ${creditScore}`);
    }

    // Determine interest rate based on credit score
    const interestRate = creditScore >= 750 ? 12 : 
                        creditScore >= 700 ? 15 : 
                        creditScore >= 650 ? 18 : 20;

    // Calculate EMI and validate affordability
    const emiAmount = calculateEMI(loanData.amount, interestRate, loanData.tenure);
    const debtToIncomeRatio = ((loanData.financialDetails.existingLoans + emiAmount) / loanData.monthlyIncome) * 100;
    
    if (debtToIncomeRatio > LOAN_CONFIG.ELIGIBILITY.MAX_DEBT_TO_INCOME_RATIO * 100) {
      return apiHandler.badRequest(`Debt-to-income ratio too high: ${debtToIncomeRatio.toFixed(1)}%. Maximum allowed: ${LOAN_CONFIG.ELIGIBILITY.MAX_DEBT_TO_INCOME_RATIO * 100}%`);
    }

    // Generate repayment schedule
    const repaymentSchedule = await generateRepaymentSchedule(
      loanData.amount,
      interestRate,
      loanData.tenure
    );

    // Create loan application
    const newLoan = await Loan.create({
      userId: userId,
      amount: loanData.amount,
      currency: 'BDT',
      interestRate: interestRate,
      tenure: loanData.tenure,
      emiAmount: emiAmount,
      creditScore: creditScore,
      status: 'Pending',
      purpose: loanData.purpose,
      monthlyIncome: loanData.monthlyIncome,
      employmentStatus: loanData.employmentStatus,
      collateral: loanData.collateral,
      documents: loanData.documents.map(doc => ({
        type: doc.type,
        url: doc.url,
        uploadedAt: new Date()
      })),
      repaymentSchedule: repaymentSchedule,
      totalPaid: 0,
      remainingAmount: loanData.amount,
      overdueAmount: 0,
      penaltyAmount: 0,
      metadata: {
        applicationSource: 'user_portal',
        employmentDetails: loanData.employmentDetails,
        financialDetails: loanData.financialDetails,
        debtToIncomeRatio: debtToIncomeRatio,
        riskAssessment: {
          creditScore: creditScore,
          employmentStability: employmentMonths,
          riskLevel: creditScore >= 700 ? 'Low' : creditScore >= 600 ? 'Medium' : 'High'
        }
      }
    });

    // Send application confirmation email using existing template system
    try {
      await sendEmail({
        to: user.email,
        subject: 'Loan Application Received',
        templateId: 'loan_application_received',
        variables: {
          userName: user.name,
          loanAmount: loanData.amount,
          applicationId: newLoan._id.toString(),
          expectedProcessingTime: '3-5 business days',
          emiAmount: emiAmount.toFixed(2),
          interestRate: interestRate,
          tenure: loanData.tenure,
          creditScore: creditScore,
          trackingUrl: `${process.env.NEXTAUTH_URL}/user/loans/${newLoan._id}`
        }
      });
    } catch (emailError) {
      console.error('Failed to send application confirmation email:', emailError);
    }

    // Send admin notification using existing template system
    try {
      await sendEmail({
        to: process.env.ADMIN_EMAIL || 'admin@platform.com',
        subject: 'New Loan Application Received',
        templateId: 'admin_loan_application_notification',
        variables: {
          adminName: 'Admin',
          userName: user.name,
          userEmail: user.email,
          loanAmount: loanData.amount,
          applicationId: newLoan._id.toString(),
          creditScore: creditScore,
          riskLevel: creditScore >= 700 ? 'Low' : creditScore >= 600 ? 'Medium' : 'High',
          recommendation: creditScore >= 650 ? 'Approve' : creditScore >= 550 ? 'Review' : 'Reject',
          debtToIncomeRatio: debtToIncomeRatio.toFixed(1),
          interestRate: interestRate,
          emiAmount: emiAmount.toFixed(2),
          reviewUrl: `${process.env.NEXTAUTH_URL}/admin/loans/${newLoan._id}`
        }
      });
    } catch (emailError) {
      console.error('Failed to send admin notification:', emailError);
    }

    // Log audit
    await AuditLog.create({
      adminId: null,
      action: 'LOAN_APPLICATION_SUBMITTED',
      entity: 'Loan',
      entityId: newLoan._id.toString(),
      newData: {
        amount: loanData.amount,
        purpose: loanData.purpose,
        creditScore: creditScore,
        interestRate: interestRate
      },
      status: 'Success',
      metadata: {
        userSelfAction: true,
        debtToIncomeRatio: debtToIncomeRatio
      },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return apiHandler.created({
      loanId: newLoan._id,
      applicationId: newLoan._id,
      status: 'Pending',
      amount: loanData.amount,
      interestRate: interestRate,
      emiAmount: emiAmount,
      tenure: loanData.tenure,
      creditScore: creditScore,
      expectedProcessingTime: '3-5 business days',
      nextSteps: [
        'Our team will review your application',
        'We may contact you for additional information',
        'You will be notified via email once processed',
        'If approved, funds will be disbursed within 24 hours'
      ],
      repaymentSchedule: repaymentSchedule.slice(0, 3), // Show first 3 payments as preview
      message: 'Your loan application has been submitted successfully'
    });

  } catch (error) {
    console.error('Error applying for loan:', error);
    return apiHandler.internalError('Failed to submit loan application');
  }
}


export const POST = withErrorHandler(applyForLoanHandler);
