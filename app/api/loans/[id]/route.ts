import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Loan, ILoan } from '@/models/Loan';
import { User, IUser } from '@/models/User';
import { AuditLog } from '@/models/AuditLog';
import { authMiddleware } from '@/middleware/auth';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import { sendEmail } from '@/lib/email';
import { z } from 'zod';

// Loan approval validation schema
const loanApprovalSchema = z.object({
  action: z.enum(['approve', 'reject'], { required_error: 'Action is required' }),
  rejectionReason: z.string().optional(),
  interestRate: z.number().min(8).max(25).optional(),
  conditions: z.string().optional()
}).refine(
  (data) => {
    if (data.action === 'reject' && !data.rejectionReason) {
      return false;
    }
    if (data.action === 'approve' && !data.interestRate) {
      return false;
    }
    return true;
  },
  {
    message: 'Rejection reason is required for rejection, interest rate is required for approval'
  }
);

// GET /api/loans/[id] - Get specific loan details
async function getLoanHandler(
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
      .populate('userId', 'name email phone kycStatus planId')
      .populate('approvedBy', 'name email') as ILoan | null;

    if (!loan) {
      return apiHandler.notFound('Loan not found');
    }

    return apiHandler.success({ loan });

  } catch (error) {
    console.error('Get loan error:', error);
    return apiHandler.internalError('Failed to fetch loan details');
  }
}

// POST /api/loans/[id] - Approve or reject loan application
async function approveLoanHandler(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Apply middleware
  const authResult = await authMiddleware(request, {
    requireAuth: true,
    allowedUserTypes: ['admin'],
    requiredPermission: 'loans.approve'
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
    const validationResult = loanApprovalSchema.safeParse(body);

    if (!validationResult.success) {
      return apiHandler.validationError(
        validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      );
    }

    const { action, rejectionReason, interestRate, conditions } = validationResult.data;

    const loan = await Loan.findById(id).populate('userId', 'name email') as ILoan | null;
    if (!loan) {
      return apiHandler.notFound('Loan not found');
    }

    if (loan.status !== 'Pending') {
      return apiHandler.badRequest('Loan has already been processed');
    }

    if (action === 'approve') {
      // Approve the loan
      const { calculateEMI, generateRepaymentSchedule } = await import('@/utils/helpers');
      const emiAmount = calculateEMI(loan.amount, interestRate!, loan.tenure);
      const repaymentSchedule = generateRepaymentSchedule(loan.amount, interestRate!, loan.tenure);

      await Loan.findByIdAndUpdate(id, {
        status: 'Approved',
        interestRate: interestRate!,
        emiAmount,
        repaymentSchedule,
        approvedBy: adminId,
        approvedAt: new Date(),
        disbursedAt: new Date(), // Automatically disburse on approval
        conditions
      });

      // Update user balance
      await User.findByIdAndUpdate(loan.userId, {
        $inc: { balance: loan.amount }
      });

      // Send approval email
      try {
        await sendEmail({
          to: (loan.userId as any).email,
          subject: 'Loan Application Approved',
          templateId: 'loan_approved',
          variables: {
            userName: (loan.userId as any).name,
            loanAmount: `$${loan.amount}`,
            emiAmount: `$${emiAmount}`,
            approvalDate: new Date().toLocaleDateString(),
            loanUrl: `${process.env.NEXTAUTH_URL}/user/loans`
          }
        });
      } catch (emailError) {
        console.error('Failed to send approval email:', emailError);
      }

      // Log audit trail
      await AuditLog.create({
        adminId,
        action: 'LOAN_APPROVED',
        entity: 'loan',
        entityId: id,
        oldData: { status: 'Pending' },
        newData: { 
          status: 'Approved', 
          interestRate: interestRate!,
          emiAmount 
        },
        ipAddress: apiHandler.getClientIP(),
        userAgent: request.headers.get('user-agent') || 'Unknown',
        severity: 'High'
      });

      return apiHandler.success({
        message: 'Loan approved successfully',
        loan: {
          id,
          status: 'Approved',
          emiAmount,
          interestRate: interestRate!
        }
      });

    } else {
      // Reject the loan
      await Loan.findByIdAndUpdate(id, {
        status: 'Rejected',
        rejectionReason,
        approvedBy: adminId,
        approvedAt: new Date()
      });

      // Send rejection email
      try {
        await sendEmail({
          to: (loan.userId as any).email,
          subject: 'Loan Application Rejected',
          templateId: 'loan_rejected',
          variables: {
            userName: (loan.userId as any).name,
            rejectionReason: rejectionReason!,
            reapplyUrl: `${process.env.NEXTAUTH_URL}/user/loans/apply`,
            supportEmail: process.env.SUPPORT_EMAIL
          }
        });
      } catch (emailError) {
        console.error('Failed to send rejection email:', emailError);
      }

      // Log audit trail
      await AuditLog.create({
        adminId,
        action: 'LOAN_REJECTED',
        entity: 'loan',
        entityId: id,
        oldData: { status: 'Pending' },
        newData: { 
          status: 'Rejected', 
          rejectionReason 
        },
        ipAddress: apiHandler.getClientIP(),
        userAgent: request.headers.get('user-agent') || 'Unknown',
        severity: 'Medium'
      });

      return apiHandler.success({
        message: 'Loan rejected successfully',
        loan: {
          id,
          status: 'Rejected',
          rejectionReason
        }
      });
    }

  } catch (error) {
    console.error('Loan approval error:', error);
    return apiHandler.internalError('Failed to process loan application');
  }
}

export const GET = withErrorHandler(getLoanHandler);
export const POST = withErrorHandler(approveLoanHandler);
