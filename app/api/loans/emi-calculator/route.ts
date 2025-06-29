// app/api/loans/emi-calculator/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import { calculateEMI, generateRepaymentSchedule } from '@/utils/helpers';
import { sendEmail } from '@/lib/email';
import { authMiddleware } from '@/middleware/auth';
import { AuditLog } from '@/models/AuditLog';
import { connectToDatabase } from '@/lib/db';
import { z } from 'zod';
import mongoose from 'mongoose';

// EMI calculation validation schema
const emiCalculatorSchema = z.object({
  loanAmount: z.number().min(500, 'Minimum loan amount is $500').max(50000, 'Maximum loan amount is $50,000'),
  interestRate: z.number().min(8, 'Minimum interest rate is 8%').max(25, 'Maximum interest rate is 25%'),
  tenure: z.number().min(6, 'Minimum tenure is 6 months').max(60, 'Maximum tenure is 60 months'),
  sendCalculation: z.boolean().optional().default(false) // Option to send calculation via email
});

// POST /api/loans/emi-calculator - Calculate EMI for given parameters
async function emiCalculatorHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  try {
    await connectToDatabase();

    const body = await request.json();
    const validationResult = emiCalculatorSchema.safeParse(body);

    if (!validationResult.success) {
      return apiHandler.validationError(
        validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      );
    }

    const { loanAmount, interestRate, tenure, sendCalculation } = validationResult.data;

    // Calculate EMI
    const emiAmount = calculateEMI(loanAmount, interestRate, tenure);
    const totalAmount = emiAmount * tenure;
    const totalInterest = totalAmount - loanAmount;

    // Generate repayment schedule
    const schedule = await generateRepaymentSchedule(loanAmount, interestRate, tenure);

    const calculationResult = {
      loanAmount,
      interestRate,
      tenure,
      emiAmount: Math.round(emiAmount * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100,
      totalInterest: Math.round(totalInterest * 100) / 100,
      monthlyPayment: Math.round(emiAmount * 100) / 100,
      schedule: schedule.map(item => ({
        month: item.installmentNumber,
        emi: Math.round(item.amount * 100) / 100,
        principal: Math.round(item.principal * 100) / 100,
        interest: Math.round(item.interest * 100) / 100,
        balance: Math.round(item.remainingBalance * 100) / 100
      })),
      calculatedAt: new Date().toISOString()
    };

    // If user is authenticated and wants to send calculation via email
    if (sendCalculation) {
      const authResult = await authMiddleware(request, {
        requireAuth: true,
        allowedUserTypes: ['user', 'admin']
      });

      if (!authResult) { // User is authenticated
        const userId = request.headers.get('x-user-id');
        const userEmail = request.headers.get('x-user-email');
        const userName = request.headers.get('x-user-name');

        if (userId && userEmail) {
          try {
            // Send EMI calculation email
            await sendEmail({
              to: userEmail,
              subject: 'EMI Calculation Results',
              templateId: 'emi-calculation-results',
              variables: {
                userName: userName || 'User',
                loanAmount: loanAmount,
                interestRate: interestRate,
                tenure: tenure,
                emiAmount: Math.round(emiAmount * 100) / 100,
                totalAmount: Math.round(totalAmount * 100) / 100,
                totalInterest: Math.round(totalInterest * 100) / 100,
                calculationDate: new Date().toLocaleDateString(),
                applyUrl: `${process.env.NEXTAUTH_URL}/user/loans/apply?amount=${loanAmount}&tenure=${tenure}`
              }
            });

            // Log audit trail for email sent
            await AuditLog.create({
              userId: new mongoose.Types.ObjectId(userId),
              action: 'EMI_CALCULATION_EMAILED',
              entity: 'emi_calculator',
              entityId: null,
              newData: {
                loanAmount,
                interestRate,
                tenure,
                emiAmount: Math.round(emiAmount * 100) / 100
              },
              ipAddress: apiHandler.getClientIP(),
              userAgent: request.headers.get('user-agent') || 'Unknown',
              severity: 'Low'
            });

          } catch (emailError) {
            console.error('Failed to send EMI calculation email:', emailError);
            // Don't fail the request if email fails
          }
        }
      }
    }

    // Log EMI calculation for analytics
    try {
      await AuditLog.create({
        userId: request.headers.get('x-user-id') ? 
          new mongoose.Types.ObjectId(request.headers.get('x-user-id')!) : null,
        action: 'EMI_CALCULATED',
        entity: 'emi_calculator',
        entityId: null,
        newData: {
          loanAmount,
          interestRate,
          tenure,
          emiAmount: Math.round(emiAmount * 100) / 100,
          calculatedAt: new Date()
        },
        ipAddress: apiHandler.getClientIP(),
        userAgent: request.headers.get('user-agent') || 'Unknown',
        severity: 'Low'
      });
    } catch (auditError) {
      console.error('Failed to log EMI calculation audit:', auditError);
    }

    return apiHandler.success(calculationResult);

  } catch (error) {
    console.error('EMI calculation error:', error);
    return apiHandler.internalError('EMI calculation failed');
  }
}

// GET /api/loans/emi-calculator - Calculate EMI with query parameters
async function emiCalculatorGetHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  try {
    const url = new URL(request.url);
    const queryParams = {
      loanAmount: parseFloat(url.searchParams.get('loanAmount') || '0'),
      interestRate: parseFloat(url.searchParams.get('interestRate') || '0'),
      tenure: parseInt(url.searchParams.get('tenure') || '0', 10),
      preview: url.searchParams.get('preview') === 'true' // Only show first 5 months
    };

    const validationResult = emiCalculatorSchema.omit({ sendCalculation: true }).safeParse(queryParams);

    if (!validationResult.success) {
      return apiHandler.validationError(
        validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      );
    }

    const { loanAmount, interestRate, tenure } = validationResult.data;

    // Calculate EMI
    const emiAmount = calculateEMI(loanAmount, interestRate, tenure);
    const totalAmount = emiAmount * tenure;
    const totalInterest = totalAmount - loanAmount;

    // Generate basic schedule (first 5 months for preview if requested)
    const scheduleLength = queryParams.preview ? Math.min(tenure, 5) : tenure;
    const schedule = await generateRepaymentSchedule(loanAmount, interestRate, scheduleLength);

    const response = {
      loanAmount,
      interestRate,
      tenure,
      emiAmount: Math.round(emiAmount * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100,
      totalInterest: Math.round(totalInterest * 100) / 100,
      monthlyPayment: Math.round(emiAmount * 100) / 100,
      preview: queryParams.preview,
      schedule: schedule.map(item => ({
        month: item.installmentNumber,
        emi: Math.round(item.amount * 100) / 100,
        principal: Math.round(item.principal * 100) / 100,
        interest: Math.round(item.interest * 100) / 100,
        balance: Math.round(item.remainingBalance * 100) / 100
      }))
    };

    return apiHandler.success(response);

  } catch (error) {
    console.error('EMI calculation error:', error);
    return apiHandler.internalError('EMI calculation failed');
  }
}

export const POST = withErrorHandler(emiCalculatorHandler);
export const GET = withErrorHandler(emiCalculatorGetHandler);