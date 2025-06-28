import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Loan, ILoan } from '@/models/Loan';
import { Transaction } from '@/models/Transaction';
import { AuditLog } from '@/models/AuditLog';
import { authMiddleware } from '@/middleware/auth';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import { sendEmail } from '@/lib/email';
import { z } from 'zod';

// Repayment validation schema
const repaymentSchema = z.object({
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  paymentMethod: z.string().min(1, 'Payment method is required'),
  transactionId: z.string().optional(),
  notes: z.string().optional()
});

// POST /api/loans/[id]/repayment - Record loan repayment
async function recordRepaymentHandler(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Apply middleware
  const authResult = await authMiddleware(request, {
    requireAuth: true,
    allowedUserTypes: ['admin'],
  });
  if (authResult) return authResult;

  try {
    await connectToDatabase();

    const { id } = params;
    const adminId = request.headers.get('x-user-id');

    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return apiHandler.badRequest('Invalid loan ID format');
    }

    const body = await request.json();
    const validationResult = repaymentSchema.safeParse(body);

    if (!validationResult.success) {
      return apiHandler.validationError(
        validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      );
    }

    const { amount, paymentMethod, transactionId, notes } = validationResult.data;

    const loan = await Loan.findById(id).populate('userId', 'name email') as ILoan | null;
    if (!loan) {
      return apiHandler.notFound('Loan not found');
    }

    if (!['Approved', 'Active'].includes(loan.status)) {
      return apiHandler.badRequest('Loan is not in a repayable state');
    }

    if (amount > loan.remainingAmount) {
      return apiHandler.badRequest('Payment amount exceeds remaining loan balance');
    }

    // Create transaction record
    const transaction = await Transaction.create({
      userId: loan.userId,
      type: 'loan_repayment',
      amount,
      currency: loan.currency,
      gateway: 'Manual',
      status: 'Approved',
      description: `Loan repayment for loan ${id}`,
      transactionId,
      approvedBy: adminId,
      netAmount: amount,
      fees: 0,
      metadata: {
        loanId: id,
        paymentMethod,
        notes
      }
    });

    // Update loan repayment schedule
    const updatedSchedule = loan.repaymentSchedule.map(installment => {
      if (installment.status === 'Pending' && amount >= installment.amount) {
        return {
          ...installment,
          status: 'Paid' as const,
          paidAt: new Date(),
          paidAmount: installment.amount
        };
      }
      return installment;
    });

    // Update loan totals
    const newTotalPaid = loan.totalPaid + amount;
    const newRemainingAmount = loan.remainingAmount - amount;
    const newStatus = newRemainingAmount <= 0 ? 'Completed' : 'Active';

    await Loan.findByIdAndUpdate(id, {
      repaymentSchedule: updatedSchedule,
      totalPaid: newTotalPaid,
      remainingAmount: Math.max(0, newRemainingAmount),
      status: newStatus,
      ...(newStatus === 'Completed' && { completedAt: new Date() })
    });

    // Log audit trail
    await AuditLog.create({
      adminId,
      action: 'LOAN_PAYMENT_RECORDED',
      entity: 'loan',
      entityId: id,
      newData: {
        paymentAmount: amount,
        totalPaid: newTotalPaid,
        remainingAmount: newRemainingAmount,
        transactionId: transaction._id.toString()
      },
      ipAddress: apiHandler.getClientIP(),
      userAgent: request.headers.get('user-agent') || 'Unknown',
      severity: 'Medium'
    });

    // Send payment confirmation email
    try {
      await sendEmail({
        to: (loan.userId as any).email,
        subject: 'Loan Payment Received',
        templateId: 'loan_payment_received',
        variables: {
          userName: (loan.userId as any).name,
          paymentAmount: `$${amount}`,
          remainingAmount: `$${newRemainingAmount}`,
          paymentDate: new Date().toLocaleDateString(),
          loanUrl: `${process.env.NEXTAUTH_URL}/user/loans/${id}`
        }
      });
    } catch (emailError) {
      console.error('Failed to send payment confirmation email:', emailError);
    }

    return apiHandler.success({
      message: 'Payment recorded successfully',
      payment: {
        amount,
        transactionId: transaction._id.toString(),
        remainingAmount: newRemainingAmount,
        loanStatus: newStatus
      }
    });

  } catch (error) {
    console.error('Record repayment error:', error);
    return apiHandler.internalError('Failed to record loan repayment');
  }
}

// GET /api/loans/[id]/repayment - Get loan repayment schedule
async function getRepaymentScheduleHandler(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
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

    const { id } = params;

    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return apiHandler.badRequest('Invalid loan ID format');
    }

    const loan = await Loan.findById(id)
      .select('repaymentSchedule totalPaid remainingAmount overdueAmount')
      .populate('userId', 'name email') as ILoan | null;

    if (!loan) {
      return apiHandler.notFound('Loan not found');
    }

    // Calculate overdue installments
    const now = new Date();
    const overdueInstallments = loan.repaymentSchedule.filter(
      installment => installment.status === 'Pending' && installment.dueDate < now
    );

    const response = {
      schedule: loan.repaymentSchedule,
      summary: {
        totalPaid: loan.totalPaid,
        remainingAmount: loan.remainingAmount,
        overdueAmount: loan.overdueAmount,
        overdueInstallments: overdueInstallments.length,
        nextDueDate: loan.repaymentSchedule.find(i => i.status === 'Pending')?.dueDate
      }
    };

    return apiHandler.success(response);

  } catch (error) {
    console.error('Get repayment schedule error:', error);
    return apiHandler.internalError('Failed to fetch repayment schedule');
  }
}

export const POST = withErrorHandler(recordRepaymentHandler);
export const GET = withErrorHandler(getRepaymentScheduleHandler);