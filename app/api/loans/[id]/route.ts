import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Loan, ILoan } from '@/models/Loan';
import { User } from '@/models/User';
import { AuditLog } from '@/models/AuditLog';
import { authMiddleware } from '@/middleware/auth';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import { sendEmail } from '@/lib/email';
import { z } from 'zod';
import mongoose from 'mongoose';

// Loan update validation schema
const loanUpdateSchema = z.object({
  interestRate: z.number().min(8).max(25).optional(),
  status: z.enum(['Pending', 'Approved', 'Rejected', 'Active', 'Completed', 'Defaulted']).optional(),
  rejectionReason: z.string().optional(),
  approvedBy: z.string().optional(),
  disbursedAt: z.string().transform(str => new Date(str)).optional(),
  completedAt: z.string().transform(str => new Date(str)).optional(),
  metadata: z.object({
    adminNotes: z.string().optional(),
    conditions: z.string().optional()
  }).optional()
});

// GET /api/loans/[id] - Get specific loan details
async function getLoanHandler(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
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

    const { id } = params;

    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return apiHandler.badRequest('Invalid loan ID format');
    }

    const userType = request.headers.get('x-user-type');
    const userId = request.headers.get('x-user-id');

    // Build query based on user type
    let query: any = { _id: id };
    
    // Users can only view their own loans
    if (userType === 'user') {
      query.userId = userId;
    }

    const loan = await Loan.findOne(query)
      .populate('userId', 'name email phone kycStatus planId')
      .populate('approvedBy', 'name email') as ILoan | null;

    if (!loan) {
      return apiHandler.notFound('Loan not found');
    }

    // Calculate additional metrics
    const overdueInstallments = loan.repaymentSchedule.filter(
      installment => installment.status === 'Overdue'
    );

    const nextPayment = loan.repaymentSchedule.find(
      installment => installment.status === 'Pending'
    );

    const paidInstallments = loan.repaymentSchedule.filter(
      installment => installment.status === 'Paid'
    ).length;

    const response = {
      ...loan.toObject(),
      analytics: {
        overdueInstallments: overdueInstallments.length,
        overdueAmount: overdueInstallments.reduce((sum, inst) => sum + inst.amount, 0),
        nextPaymentDate: nextPayment?.dueDate,
        nextPaymentAmount: nextPayment?.amount,
        completionPercentage: (paidInstallments / loan.repaymentSchedule.length) * 100,
        remainingInstallments: loan.repaymentSchedule.length - paidInstallments
      }
    };

    return apiHandler.success({ loan: response });

  } catch (error) {
    console.error('Get loan error:', error);
    return apiHandler.internalError('Failed to fetch loan details');
  }
}

// PUT /api/loans/[id] - Update loan details (admin only)
async function updateLoanHandler(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Apply middleware
  const authResult = await authMiddleware(request, {
    requireAuth: true,
    allowedUserTypes: ['admin'],
    requiredPermission: 'loans.update'
  });
  if (authResult) return authResult;

  try {
    await connectToDatabase();

    const { id } = params;
    const body = await request.json();

    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return apiHandler.badRequest('Invalid loan ID format');
    }

    const validationResult = loanUpdateSchema.safeParse(body);
    if (!validationResult.success) {
      return apiHandler.validationError(
        validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      );
    }

    const updateData = validationResult.data;
    const adminId = request.headers.get('x-user-id');

    // Find existing loan
    const existingLoan = await Loan.findById(id) as ILoan | null;
    if (!existingLoan) {
      return apiHandler.notFound('Loan not found');
    }

    // Track changes for audit
    const oldData = existingLoan.toObject();
    const changes: any[] = [];

    // Build update object
    const updateObject: any = {};

    if (updateData.interestRate !== undefined) {
      updateObject.interestRate = updateData.interestRate;
      changes.push({
        field: 'interestRate',
        oldValue: existingLoan.interestRate,
        newValue: updateData.interestRate
      });

      // Recalculate EMI and schedule if interest rate changes
      const { calculateEMI, generateRepaymentSchedule } = await import('@/utils/helpers');
      const newEmiAmount = calculateEMI(existingLoan.amount, updateData.interestRate, existingLoan.tenure);
      const newSchedule = await generateRepaymentSchedule(
        existingLoan.amount,
        updateData.interestRate,
        existingLoan.tenure
      );

      updateObject.emiAmount = newEmiAmount;
      updateObject.repaymentSchedule = newSchedule.map((item, index) => ({
        installmentNumber: item.installmentNumber,
        dueDate: new Date(existingLoan.createdAt.getTime() + (index + 1) * 30 * 24 * 60 * 60 * 1000),
        amount: item.amount,
        principal: item.principal,
        interest: item.interest,
        status: 'Pending' as const
      }));
      updateObject.remainingAmount = existingLoan.amount;
    }

    if (updateData.status !== undefined) {
      updateObject.status = updateData.status;
      changes.push({
        field: 'status',
        oldValue: existingLoan.status,
        newValue: updateData.status
      });

      // Set additional fields based on status
      if (updateData.status === 'Approved') {
        updateObject.approvedBy = adminId;
        updateObject.approvedAt = new Date();
      } else if (updateData.status === 'Rejected' && updateData.rejectionReason) {
        updateObject.rejectionReason = updateData.rejectionReason;
      } else if (updateData.status === 'Active') {
        updateObject.disbursedAt = updateData.disbursedAt || new Date();
      } else if (updateData.status === 'Completed') {
        updateObject.completedAt = updateData.completedAt || new Date();
      }
    }

    if (updateData.metadata) {
      updateObject.metadata = {
        ...existingLoan.metadata,
        ...updateData.metadata,
        lastModifiedBy: adminId,
        lastModifiedAt: new Date()
      };
    }

    // Update loan
    const updatedLoan = await Loan.findByIdAndUpdate(
      id,
      { $set: updateObject },
      { new: true, runValidators: true }
    ).populate('userId', 'name email phone') as ILoan;

    // Log audit trail
    await AuditLog.create({
      adminId: adminId ? new mongoose.Types.ObjectId(adminId) : null,
      action: 'LOAN_UPDATED',
      entity: 'loan',
      entityId: id,
      oldData: {
        status: oldData.status,
        interestRate: oldData.interestRate
      },
      newData: {
        status: updatedLoan.status,
        interestRate: updatedLoan.interestRate
      },
      changes,
      ipAddress: apiHandler.getClientIP(),
      userAgent: request.headers.get('user-agent') || 'Unknown',
      severity: 'High'
    });

    // Send notification email if status changed
    if (updateData.status && updateData.status !== existingLoan.status) {
      try {
        const user = await User.findById(existingLoan.userId);
        if (user) {
          let emailTemplate = '';
          let subject = '';

          switch (updateData.status) {
            case 'Approved':
              emailTemplate = 'loan-approved';
              subject = 'Loan Application Approved';
              break;
            case 'Rejected':
              emailTemplate = 'loan-rejected';
              subject = 'Loan Application Update';
              break;
            case 'Active':
              emailTemplate = 'loan-disbursed';
              subject = 'Loan Disbursed';
              break;
            case 'Completed':
              emailTemplate = 'loan-completed';
              subject = 'Loan Completed';
              break;
          }

          if (emailTemplate) {
            await sendEmail({
              to: user.email,
              subject,
              templateId: emailTemplate,
              data: {
                userName: user.name,
                loanAmount: updatedLoan.amount,
                loanId: updatedLoan._id.toString(),
                rejectionReason: updateData.rejectionReason,
                emiAmount: updatedLoan.emiAmount,
                interestRate: updatedLoan.interestRate,
                tenure: updatedLoan.tenure
              }
            });
          }
        }
      } catch (emailError) {
        console.error('Failed to send notification email:', emailError);
        // Don't fail the request if email fails
      }
    }

    return apiHandler.success({
      loan: updatedLoan,
      message: 'Loan updated successfully'
    });

  } catch (error) {
    console.error('Update loan error:', error);
    return apiHandler.internalError('Failed to update loan');
  }
}

// DELETE /api/loans/[id] - Delete loan (admin only, only if pending)
async function deleteLoanHandler(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Apply middleware
  const authResult = await authMiddleware(request, {
    requireAuth: true,
    allowedUserTypes: ['admin'],
    requiredPermission: 'loans.delete'
  });
  if (authResult) return authResult;

  try {
    await connectToDatabase();

    const { id } = params;

    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return apiHandler.badRequest('Invalid loan ID format');
    }

    const loan = await Loan.findById(id) as ILoan | null;
    if (!loan) {
      return apiHandler.notFound('Loan not found');
    }

    // Only allow deletion of pending loans
    if (loan.status !== 'Pending') {
      return apiHandler.badRequest('Can only delete pending loan applications');
    }

    await Loan.findByIdAndDelete(id);

    // Log audit trail
    const adminId = request.headers.get('x-user-id');
    await AuditLog.create({
      adminId: adminId ? new mongoose.Types.ObjectId(adminId) : null,
      action: 'LOAN_DELETED',
      entity: 'loan',
      entityId: id,
      oldData: {
        amount: loan.amount,
        userId: loan.userId,
        status: loan.status
      },
      ipAddress: apiHandler.getClientIP(),
      userAgent: request.headers.get('user-agent') || 'Unknown',
      severity: 'High'
    });

    return apiHandler.success({
      message: 'Loan application deleted successfully'
    });

  } catch (error) {
    console.error('Delete loan error:', error);
    return apiHandler.internalError('Failed to delete loan');
  }
}

export const GET = withErrorHandler(getLoanHandler);
export const PUT = withErrorHandler(updateLoanHandler);
export const DELETE = withErrorHandler(deleteLoanHandler);