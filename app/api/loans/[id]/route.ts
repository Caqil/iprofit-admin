// app/api/loans/[id]/repayment/route.ts
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
import mongoose from 'mongoose';
import { repaymentSchema } from '@/lib/validation';


// POST /api/loans/[id]/repayment - Record loan repayment
async function recordRepaymentHandler(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Apply middleware
  const authResult = await authMiddleware(request, {
    requireAuth: true,
    allowedUserTypes: ['admin', 'user']
  });
  if (authResult) return authResult;

  try {
    await connectToDatabase();

    const { id } = params;
    const userType = request.headers.get('x-user-type');
    const userId = request.headers.get('x-user-id');

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

    const { amount, paymentMethod, transactionId, notes, penaltyAmount, installmentNumbers } = validationResult.data;

    // Build query based on user type
    let query: any = { _id: id };
    if (userType === 'user') {
      query.userId = userId;
    }

    const loan = await Loan.findOne(query).populate('userId', 'name email') as ILoan | null;
    if (!loan) {
      return apiHandler.notFound('Loan not found');
    }

    if (!['Approved', 'Active'].includes(loan.status)) {
      return apiHandler.badRequest('Loan is not in a repayable state');
    }

    const totalPaymentAmount = amount + (penaltyAmount || 0);

    if (totalPaymentAmount > loan.remainingAmount) {
      return apiHandler.badRequest('Payment amount exceeds remaining loan balance');
    }

    // Create transaction record
    const transaction = await Transaction.create({
      userId: loan.userId,
      type: 'loan_repayment',
      amount: totalPaymentAmount,
      currency: loan.currency,
      gateway: paymentMethod === 'Manual' ? 'Manual' : paymentMethod,
      status: 'Approved',
      description: `Loan repayment for loan ${id}`,
      transactionId: transactionId || `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      approvedBy: userType === 'admin' ? userId : null,
      netAmount: amount,
      fees: penaltyAmount || 0,
      metadata: {
        loanId: id,
        paymentMethod,
        notes,
        penaltyAmount: penaltyAmount || 0,
        installmentNumbers
      }
    });

    let remainingPayment = amount;
    let paidInstallments: any[] = [];

    // Update loan repayment schedule
    const updatedSchedule = loan.repaymentSchedule.map((installment, index) => {
      // If specific installments are specified, only pay those
      if (installmentNumbers && installmentNumbers.length > 0) {
        if (installmentNumbers.includes(installment.installmentNumber) && remainingPayment >= installment.amount) {
          remainingPayment -= installment.amount;
          paidInstallments.push({
            installmentNumber: installment.installmentNumber,
            amount: installment.amount,
            paidAt: new Date()
          });
          return {
            ...installment,
            status: 'Paid' as const,
            paidAt: new Date(),
            paidAmount: installment.amount,
            transactionId: transaction._id.toString()
          };
        }
      } else {
        // Pay installments in order
        if (installment.status === 'Pending' && remainingPayment >= installment.amount) {
          remainingPayment -= installment.amount;
          paidInstallments.push({
            installmentNumber: installment.installmentNumber,
            amount: installment.amount,
            paidAt: new Date()
          });
          return {
            ...installment,
            status: 'Paid' as const,
            paidAt: new Date(),
            paidAmount: installment.amount,
            transactionId: transaction._id.toString()
          };
        }
      }
      return installment;
    });

    // Calculate new totals
    const newTotalPaid = loan.totalPaid + amount;
    const newRemainingAmount = loan.remainingAmount - amount;
    const newStatus = newRemainingAmount <= 0 ? 'Completed' : 'Active';

    // Update overdue amount if penalty was paid
    const newOverdueAmount = Math.max(0, loan.overdueAmount - (penaltyAmount || 0));

    // Update loan
    const updateData: any = {
      repaymentSchedule: updatedSchedule,
      totalPaid: newTotalPaid,
      remainingAmount: Math.max(0, newRemainingAmount),
      overdueAmount: newOverdueAmount,
      status: newStatus,
      lastPaymentDate: new Date()
    };

    if (newStatus === 'Completed') {
      updateData.completedAt = new Date();
    }

    await Loan.findByIdAndUpdate(id, updateData);

    // Log audit trail
    await AuditLog.create({
      userId: userType === 'user' ? new mongoose.Types.ObjectId(userId!) : null,
      adminId: userType === 'admin' ? new mongoose.Types.ObjectId(userId!) : null,
      action: 'LOAN_PAYMENT_RECORDED',
      entity: 'loan',
      entityId: id,
      newData: {
        paymentAmount: totalPaymentAmount,
        principalAmount: amount,
        penaltyAmount: penaltyAmount || 0,
        totalPaid: newTotalPaid,
        remainingAmount: newRemainingAmount,
        transactionId: transaction._id.toString(),
        paidInstallments: paidInstallments.length,
        isCompleted: newStatus === 'Completed'
      },
      ipAddress: apiHandler.getClientIP(),
      userAgent: request.headers.get('user-agent') || 'Unknown',
      severity: 'Medium'
    });

    const user = loan.userId as any;

    // Send payment confirmation email
    try {
      await sendEmail({
        to: user.email,
        subject: 'Loan Payment Confirmed',
        templateId: 'loan-payment-confirmed',
        variables: {
          userName: user.name,
          loanId: id,
          paymentAmount: amount,
          penaltyAmount: penaltyAmount || 0,
          totalPaymentAmount: totalPaymentAmount,
          remainingAmount: newRemainingAmount,
          paidInstallments: paidInstallments.length,
          transactionId: transaction._id.toString(),
          paymentDate: new Date().toLocaleDateString(),
          paymentMethod: paymentMethod,
          isCompleted: newStatus === 'Completed',
          loanUrl: `${process.env.NEXTAUTH_URL}/user/loans/${id}`
        }
      });
    } catch (emailError) {
      console.error('Failed to send payment confirmation email:', emailError);
    }

    // Send loan completion email if loan is fully paid
    if (newStatus === 'Completed') {
      try {
        await sendEmail({
          to: user.email,
          subject: 'Congratulations! Loan Successfully Completed',
          templateId: 'loan-completed',
          variables: {
            userName: user.name,
            loanAmount: loan.amount,
            loanId: id,
            completionDate: new Date().toLocaleDateString(),
            totalInterestPaid: (loan.totalPaid ?? 0) - (loan.amount ?? 0),
            creditScoreImpact: '+50 points'
          }
        });
      } catch (emailError) {
        console.error('Failed to send loan completion email:', emailError);
      }
    }

    // Send admin notification for large payments or loan completion
    if (amount >= 1000 || newStatus === 'Completed') {
      try {
        await sendEmail({
          to: process.env.ADMIN_EMAIL || 'admin@yourplatform.com',
          subject: `Loan Payment Received: ${amount} - ${user.name}`,
          templateId: 'admin-payment-notification',
          variables: {
            adminName: 'Admin',
            userName: user.name,
            userEmail: user.email,
            loanId: id,
            paymentAmount: amount,
            remainingAmount: newRemainingAmount,
            isCompleted: newStatus === 'Completed',
            paymentMethod: paymentMethod,
            loanUrl: `${process.env.NEXTAUTH_URL}/admin/loans/${id}`
          }
        });
      } catch (emailError) {
        console.error('Failed to send admin payment notification:', emailError);
      }
    }

    return apiHandler.success({
      message: 'Payment recorded successfully',
      payment: {
        amount,
        penaltyAmount: penaltyAmount || 0,
        totalAmount: totalPaymentAmount,
        transactionId: transaction._id.toString(),
        remainingAmount: newRemainingAmount,
        loanStatus: newStatus,
        paidInstallments: paidInstallments.length,
        isCompleted: newStatus === 'Completed'
      }
    });

  } catch (error) {
    console.error('Record repayment error:', error);
    return apiHandler.internalError('Failed to record loan repayment');
  }
}

// GET /api/loans/[id]/repayment - Get loan repayment schedule and history
async function getRepaymentScheduleHandler(
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
    const userType = request.headers.get('x-user-type');
    const userId = request.headers.get('x-user-id');

    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return apiHandler.badRequest('Invalid loan ID format');
    }

    // Build query based on user type
    let query: any = { _id: id };
    if (userType === 'user') {
      query.userId = userId;
    }

    const loan = await Loan.findOne(query)
      .select('repaymentSchedule totalPaid remainingAmount overdueAmount amount emiAmount status lastPaymentDate')
      .populate('userId', 'name email') as ILoan | null;

    if (!loan) {
      return apiHandler.notFound('Loan not found');
    }

    // Get payment transactions for this loan
    const paymentTransactions = await Transaction.find({
      'metadata.loanId': id,
      type: 'loan_repayment',
      status: 'Approved'
    }).sort({ createdAt: -1 }).limit(50);

    // Calculate overdue installments
    const now = new Date();
    const overdueInstallments = loan.repaymentSchedule.filter(
      installment => installment.status === 'Pending' && installment.dueDate < now
    );

    const pendingInstallments = loan.repaymentSchedule.filter(
      installment => installment.status === 'Pending'
    );

    const paidInstallments = loan.repaymentSchedule.filter(
      installment => installment.status === 'Paid'
    );

    // Calculate upcoming payments (next 3 months)
    const upcomingPayments = loan.repaymentSchedule
      .filter(installment => installment.status === 'Pending')
      .slice(0, 3)
      .map(installment => ({
        installmentNumber: installment.installmentNumber,
        amount: installment.amount,
        dueDate: installment.dueDate,
        principal: installment.principal,
        interest: installment.interest,
        daysUntilDue: Math.ceil((installment.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      }));

    const response = {
      schedule: loan.repaymentSchedule.map(installment => ({
        ...installment,
        isOverdue: installment.status === 'Pending' && installment.dueDate < now,
        daysOverdue: installment.status === 'Pending' && installment.dueDate < now ? 
          Math.floor((now.getTime() - installment.dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0
      })),
      summary: {
        totalPaid: loan.totalPaid,
        remainingAmount: loan.remainingAmount,
        overdueAmount: loan.overdueAmount,
        overdueInstallments: overdueInstallments.length,
        pendingInstallments: pendingInstallments.length,
        paidInstallments: paidInstallments.length,
        totalInstallments: loan.repaymentSchedule.length,
        progressPercentage: Math.round((paidInstallments.length / loan.repaymentSchedule.length) * 100),
        nextDueDate: pendingInstallments[0]?.dueDate,
      },
      upcomingPayments,
      paymentHistory: paymentTransactions.map(transaction => ({
        id: transaction._id,
        amount: transaction.amount,
        netAmount: transaction.netAmount,
        fees: transaction.fees,
        paymentMethod: transaction.metadata?.paymentMethod,
        transactionId: transaction.transactionId,
        paidAt: transaction.createdAt,
        status: transaction.status
      }))
    };

    return apiHandler.success(response);

  } catch (error) {
    console.error('Get repayment schedule error:', error);
    return apiHandler.internalError('Failed to fetch repayment schedule');
  }
}

// PUT /api/loans/[id]/repayment - Update repayment schedule (Admin only)
async function updateRepaymentScheduleHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;
    const adminId = request.headers.get('x-user-id');

    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return apiHandler.badRequest('Invalid loan ID format');
    }

    const body = await request.json();
    const { scheduleUpdates, reason } = body;

    if (!scheduleUpdates || !Array.isArray(scheduleUpdates)) {
      return apiHandler.badRequest('Schedule updates are required');
    }

    const loan = await Loan.findById(id).populate('userId', 'name email') as ILoan | null;
    if (!loan) {
      return apiHandler.notFound('Loan not found');
    }

    // Update specific installments
    const updatedSchedule = loan.repaymentSchedule.map(installment => {
      const update = scheduleUpdates.find((u: any) => u.installmentNumber === installment.installmentNumber);
      if (update) {
        return {
          ...installment,
          dueDate: update.dueDate ? new Date(update.dueDate) : installment.dueDate,
          amount: update.amount !== undefined ? update.amount : installment.amount,
          status: update.status || installment.status
        };
      }
      return installment;
    });

    await Loan.findByIdAndUpdate(id, { repaymentSchedule: updatedSchedule });

    // Log audit trail
    await AuditLog.create({
      adminId: new mongoose.Types.ObjectId(adminId!),
      action: 'REPAYMENT_SCHEDULE_UPDATED',
      entity: 'loan',
      entityId: id,
      newData: {
        scheduleUpdates,
        reason,
        updatedInstallments: scheduleUpdates.length
      },
      ipAddress: apiHandler.getClientIP(),
      userAgent: request.headers.get('user-agent') || 'Unknown',
      severity: 'High'
    });

    // Send notification email to user
    try {
      const user = loan.userId as any;
      await sendEmail({
        to: user.email,
        subject: 'Loan Payment Schedule Updated',
        templateId: 'repayment-schedule-updated',
        variables: {
          userName: user.name,
          loanId: id,
          reason: reason || 'Administrative update',
          updatedInstallments: scheduleUpdates.length,
          loanUrl: `${process.env.NEXTAUTH_URL}/user/loans/${id}`
        }
      });
    } catch (emailError) {
      console.error('Failed to send schedule update email:', emailError);
    }

    return apiHandler.success({
      message: 'Repayment schedule updated successfully',
      updatedInstallments: scheduleUpdates.length
    });

  } catch (error) {
    console.error('Update repayment schedule error:', error);
    return apiHandler.internalError('Failed to update repayment schedule');
  }
}

export const POST = withErrorHandler(recordRepaymentHandler);
export const GET = withErrorHandler(getRepaymentScheduleHandler);
export const PUT = withErrorHandler(updateRepaymentScheduleHandler);