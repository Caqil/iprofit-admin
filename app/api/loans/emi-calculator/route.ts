
import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import { calculateEMI, generateRepaymentSchedule } from '@/utils/helpers';
import { z } from 'zod';

// EMI calculation validation schema
const emiCalculatorSchema = z.object({
  loanAmount: z.number().min(500, 'Minimum loan amount is $500').max(5500, 'Maximum loan amount is $5,500'),
  interestRate: z.number().min(8, 'Minimum interest rate is 8%').max(25, 'Maximum interest rate is 25%'),
  tenure: z.number().min(6, 'Minimum tenure is 6 months').max(60, 'Maximum tenure is 60 months')
});

// POST /api/loans/emi-calculator - Calculate EMI for given parameters
async function emiCalculatorHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  try {
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

    const { loanAmount, interestRate, tenure } = validationResult.data;

    // Calculate EMI
    const emiAmount = calculateEMI(loanAmount, interestRate, tenure);
    const totalAmount = emiAmount * tenure;
    const totalInterest = totalAmount - loanAmount;

    // Generate repayment schedule
    const schedule = await generateRepaymentSchedule(loanAmount, interestRate, tenure);

    const response = {
      loanAmount,
      interestRate,
      tenure,
      emiAmount: Math.round(emiAmount * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100,
      totalInterest: Math.round(totalInterest * 100) / 100,
      schedule: schedule.map(item => ({
        month: item.installmentNumber,
        emi: item.amount,
        principal: item.principal,
        interest: item.interest,
        balance: item.remainingBalance || (loanAmount - (item.principal * item.installmentNumber))
      }))
    };

    return apiHandler.success(response);

  } catch (error) {
    console.error('EMI calculation error:', error);
    return apiHandler.internalError('EMI calculation failed');
  }
}

export const POST = withErrorHandler(emiCalculatorHandler);
