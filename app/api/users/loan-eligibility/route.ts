import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Loan } from '@/models/Loan';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import { getUserFromRequest } from '@/lib/auth-helper';
import { calculateCreditScore, calculateEMI } from '@/utils/helpers';
import { LOAN_CONFIG } from '@/utils/constants';
import mongoose from 'mongoose';

// Validation schema for eligibility check
const eligibilityCheckSchema = z.object({
  amount: z.number().min(LOAN_CONFIG.AMOUNTS.MINIMUM).max(LOAN_CONFIG.AMOUNTS.MAXIMUM),
  tenure: z.number().min(LOAN_CONFIG.TENURE.MINIMUM_MONTHS).max(LOAN_CONFIG.TENURE.MAXIMUM_MONTHS),
  monthlyIncome: z.number().min(0),
  monthlyExpenses: z.number().min(0).optional(),
  existingLoans: z.number().min(0).optional(),
  employmentMonths: z.number().min(0).optional(),
  bankBalance: z.number().min(0).optional()
});

async function checkLoanEligibilityHandler(request: NextRequest) {
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

    // Parse query parameters for GET or body for POST
    let eligibilityData;
    if (request.method === 'GET') {
      const url = new URL(request.url);
      eligibilityData = {
        amount: parseFloat(url.searchParams.get('amount') || '0'),
        tenure: parseInt(url.searchParams.get('tenure') || '0'),
        monthlyIncome: parseFloat(url.searchParams.get('monthlyIncome') || '0'),
        monthlyExpenses: parseFloat(url.searchParams.get('monthlyExpenses') || '0'),
        existingLoans: parseFloat(url.searchParams.get('existingLoans') || '0'),
        employmentMonths: parseInt(url.searchParams.get('employmentMonths') || '0'),
        bankBalance: parseFloat(url.searchParams.get('bankBalance') || '0')
      };
    } else {
      const body = await request.json();
      eligibilityData = body;
    }

    const validationResult = eligibilityCheckSchema.safeParse(eligibilityData);
    if (!validationResult.success) {
      return apiHandler.validationError(
        validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      );
    }

    const data = validationResult.data;

    // Get user information
    const user = await User.findById(userId);
    if (!user) {
      return apiHandler.notFound('User not found');
    }

    // Check for existing active loans
    const existingLoan = await Loan.findOne({
      userId: userId,
      status: { $in: ['Pending', 'Approved', 'Active'] }
    });

    // Calculate credit score
    const creditScore = calculateCreditScore({
      income: data.monthlyIncome,
      employmentStability: data.employmentMonths || 12,
      existingLoans: data.existingLoans || 0,
      bankBalance: data.bankBalance || 0,
      paymentHistory: 85, // Default good payment history
      age: user.dateOfBirth ? 
        Math.floor((Date.now() - user.dateOfBirth.getTime()) / (1000 * 60 * 60 * 24 * 365)) : 30
    });

    // Determine interest rate based on credit score
    const interestRate = creditScore >= 750 ? 12 : 
                        creditScore >= 700 ? 15 : 
                        creditScore >= 650 ? 18 : 20;

    // Calculate EMI and financial metrics
    const emiAmount = calculateEMI(data.amount, interestRate, data.tenure);
    const totalAmount = emiAmount * data.tenure;
    const totalInterest = totalAmount - data.amount;
    
    // Calculate debt-to-income ratio
    const totalMonthlyDebt = (data.existingLoans || 0) + emiAmount;
    const debtToIncomeRatio = (totalMonthlyDebt / data.monthlyIncome) * 100;
    const disposableIncome = data.monthlyIncome - (data.monthlyExpenses || 0) - totalMonthlyDebt;

    // Eligibility checks
    const checks = {
      kycVerified: {
        passed: user.kycStatus === 'Approved',
        message: user.kycStatus === 'Approved' ? 'KYC verified' : 'KYC verification required',
        required: true
      },
      noActiveLoans: {
        passed: !existingLoan,
        message: existingLoan ? 'You have an active loan. Complete it before applying for a new one.' : 'No active loans found',
        required: true
      },
      minimumIncome: {
        passed: data.monthlyIncome >= LOAN_CONFIG.ELIGIBILITY.MIN_MONTHLY_INCOME,
        message: `Monthly income must be at least ${LOAN_CONFIG.ELIGIBILITY.MIN_MONTHLY_INCOME}`,
        required: true
      },
      creditScore: {
        passed: creditScore >= LOAN_CONFIG.ELIGIBILITY.MIN_CREDIT_SCORE,
        message: `Credit score ${creditScore} (minimum required: ${LOAN_CONFIG.ELIGIBILITY.MIN_CREDIT_SCORE})`,
        required: true
      },
      debtToIncome: {
        passed: debtToIncomeRatio <= LOAN_CONFIG.ELIGIBILITY.MAX_DEBT_TO_INCOME_RATIO * 100,
        message: `Debt-to-income ratio: ${debtToIncomeRatio.toFixed(1)}% (maximum allowed: ${LOAN_CONFIG.ELIGIBILITY.MAX_DEBT_TO_INCOME_RATIO * 100}%)`,
        required: true
      },
      ageRequirement: {
        passed: user.dateOfBirth ? 
          Math.floor((Date.now() - user.dateOfBirth.getTime()) / (1000 * 60 * 60 * 24 * 365)) >= LOAN_CONFIG.ELIGIBILITY.MIN_AGE : true,
        message: `Age requirement: ${LOAN_CONFIG.ELIGIBILITY.MIN_AGE} years minimum`,
        required: true
      }
    };

    // Calculate overall eligibility
    const passedRequiredChecks = Object.values(checks).filter(check => check.required && check.passed).length;
    const totalRequiredChecks = Object.values(checks).filter(check => check.required).length;
    const isEligible = passedRequiredChecks === totalRequiredChecks;

    // Risk assessment
    const riskFactors: string[] = [];
    let riskScore = 0;

    if (creditScore < 650) {
      riskFactors.push('Low credit score');
      riskScore += 30;
    }
    if (debtToIncomeRatio > 30) {
      riskFactors.push('High debt-to-income ratio');
      riskScore += 20;
    }
    if (disposableIncome < emiAmount * 2) {
      riskFactors.push('Low disposable income');
      riskScore += 15;
    }
    if ((data.employmentMonths || 0) < 12) {
      riskFactors.push('Short employment history');
      riskScore += 10;
    }

    const riskLevel = riskScore <= 15 ? 'Low' : riskScore <= 35 ? 'Medium' : 'High';

    // Calculate maximum eligible amount
    const maxAffordableEMI = (data.monthlyIncome * LOAN_CONFIG.ELIGIBILITY.MAX_DEBT_TO_INCOME_RATIO) - (data.existingLoans || 0);
    const maxEligibleAmount = maxAffordableEMI > 0 ? 
      Math.min(
        LOAN_CONFIG.AMOUNTS.MAXIMUM,
        Math.floor((maxAffordableEMI * data.tenure) / (1 + (interestRate / 100 / 12) * data.tenure))
      ) : 0;

    // Recommendations
    const recommendations: string[] = [];
    if (!isEligible) {
      if (!checks.kycVerified.passed) recommendations.push('Complete KYC verification');
      if (!checks.minimumIncome.passed) recommendations.push(`Increase monthly income to at least ${LOAN_CONFIG.ELIGIBILITY.MIN_MONTHLY_INCOME}`);
      if (!checks.creditScore.passed) recommendations.push('Improve credit score by maintaining good payment history');
      if (!checks.debtToIncome.passed) recommendations.push('Reduce existing debts or consider a smaller loan amount');
      if (existingLoan) recommendations.push('Complete your existing loan before applying for a new one');
    } else {
      if (riskLevel === 'High') recommendations.push('Consider a smaller loan amount to reduce risk');
      if (creditScore < 700) recommendations.push('Maintain good payment history to improve credit score for better rates');
      recommendations.push('Ensure you have emergency funds before taking a loan');
    }

    const response = {
      eligibility: {
        isEligible,
        score: Math.round((passedRequiredChecks / totalRequiredChecks) * 100),
        message: isEligible ? 'Congratulations! You are eligible for this loan.' : 'You do not meet all eligibility criteria.',
        checks
      },

      loanDetails: {
        requestedAmount: data.amount,
        tenure: data.tenure,
        interestRate,
        emiAmount: Math.round(emiAmount * 100) / 100,
        totalAmount: Math.round(totalAmount * 100) / 100,
        totalInterest: Math.round(totalInterest * 100) / 100,
        currency: 'BDT'
      },

      financialAnalysis: {
        creditScore,
        debtToIncomeRatio: Math.round(debtToIncomeRatio * 100) / 100,
        disposableIncome: Math.round(disposableIncome * 100) / 100,
        maxEligibleAmount,
        recommendedAmount: Math.min(data.amount, maxEligibleAmount * 0.8), // 80% of max for safety
        affordabilityRating: disposableIncome >= emiAmount * 3 ? 'Excellent' :
                            disposableIncome >= emiAmount * 2 ? 'Good' :
                            disposableIncome >= emiAmount * 1.5 ? 'Fair' : 'Poor'
      },

      riskAssessment: {
        riskLevel,
        riskScore,
        riskFactors,
        approval_probability: isEligible ? 
          (riskLevel === 'Low' ? 95 : riskLevel === 'Medium' ? 75 : 45) : 0
      },

      recommendations,

      nextSteps: isEligible ? [
        'Prepare required documents (ID, income proof, bank statements)',
        'Submit your loan application',
        'Wait for approval (typically 3-5 business days)',
        'Loan disbursement upon approval'
      ] : [
        'Address the eligibility issues mentioned above',
        'Recheck your eligibility once requirements are met',
        'Contact support if you need assistance'
      ]
    };

    return apiHandler.success(response);

  } catch (error) {
    console.error('Error checking loan eligibility:', error);
    return apiHandler.internalError('Failed to check loan eligibility');
  }
}

// Support both GET and POST methods
export const GET = withErrorHandler(checkLoanEligibilityHandler);
export const POST = withErrorHandler(checkLoanEligibilityHandler);