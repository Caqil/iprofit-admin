import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Loan } from '@/models/Loan';
import { Transaction } from '@/models/Transaction';
import { AuditLog } from '@/models/AuditLog';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import { getUserFromRequest } from '@/lib/auth-helper';
import { sendEmail } from '@/lib/email';
import mongoose from 'mongoose';

// Validation schema for loan payment
const loanPaymentSchema = z.object({
  amount: z.number().min(1, 'Payment amount must be greater than 0'),
  paymentType: z.enum(['full_emi', 'partial', 'prepayment', 'penalty_only']).default('full_emi'),
  installmentNumbers: z.array(z.number()).optional(), // For paying specific installments
  paymentMethod: z.enum(['balance', 'card', 'bank_transfer']).default('balance'),
  paymentNote: z.string().max(500).optional()
});

async function makeLoanPaymentHandler(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const loanId = params.id;

    // Validate loan ID
    if (!mongoose.Types.ObjectId.isValid(loanId)) {
      return apiHandler.badRequest('Invalid loan ID');
    }

    // Parse request body
    const body = await request.json();
    const validationResult = loanPaymentSchema.safeParse(body);
    
    if (!validationResult.success) {
      return apiHandler.validationError(
        validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      );
    }

    const paymentData = validationResult.data;

    // Get user and loan
    const [user, loan] = await Promise.all([
      User.findById(userId),
      Loan.findOne({
        _id: new mongoose.Types.ObjectId(loanId),
        userId: userId
      })
    ]);

    if (!user) {
      return apiHandler.notFound('User not found');
    }

    if (!loan) {
      return apiHandler.notFound('Loan not found');
    }

    // Check loan status
    if (loan.status !== 'Active') {
      return apiHandler.badRequest('Loan is not active. Cannot make payments.');
    }

    // Check user balance for balance payments
    if (paymentData.paymentMethod === 'balance' && user.balance < paymentData.amount) {
      return apiHandler.badRequest(`Insufficient balance. Available: ${user.balance}, Required: ${paymentData.amount}`);
    }

    // Find pending payments
    const pendingPayments = loan.repaymentSchedule.filter(payment => payment.status === 'Pending');
    if (pendingPayments.length === 0) {
      return apiHandler.badRequest('No pending payments found for this loan');
    }

    // Calculate payment allocation
    let remainingAmount = paymentData.amount;
    const paymentsToUpdate: any[] = [];
    let penaltyPaid = 0;

    // First, pay any penalties
    if (loan.penaltyAmount > 0 && remainingAmount > 0) {
      penaltyPaid = Math.min(remainingAmount, loan.penaltyAmount);
      remainingAmount -= penaltyPaid;
    }

    // Then allocate to EMIs based on payment type
    if (paymentData.paymentType === 'full_emi' || paymentData.paymentType === 'partial') {
      // Sort pending payments by due date (oldest first)
      const sortedPending = [...pendingPayments].sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
      
      for (const payment of sortedPending) {
        if (remainingAmount <= 0) break;
        
        const paymentAmount = Math.min(remainingAmount, payment.amount - (payment.paidAmount || 0));
        if (paymentAmount > 0) {
          paymentsToUpdate.push({
            installmentNumber: payment.installmentNumber,
            amount: paymentAmount,
            isFullPayment: paymentAmount >= (payment.amount - (payment.paidAmount || 0))
          });
          remainingAmount -= paymentAmount;
        }
      }
    } else if (paymentData.paymentType === 'prepayment') {
      // For prepayment, calculate how much of the principal can be paid
      const totalOutstanding = loan.remainingAmount;
      const prepaymentAmount = Math.min(remainingAmount, totalOutstanding);
      
      if (prepaymentAmount > 0) {
        // This would require recalculating the entire schedule
        return apiHandler.badRequest('Prepayment functionality requires schedule recalculation. Please contact support.');
      }
    }

    if (paymentsToUpdate.length === 0 && penaltyPaid === 0) {
      return apiHandler.badRequest('No valid payments could be processed with the given amount');
    }

    // Start database transaction
    const session = await mongoose.startSession();
    
    try {
      await session.withTransaction(async () => {
        // Update loan payments
        for (const paymentUpdate of paymentsToUpdate) {
          const paymentIndex = loan.repaymentSchedule.findIndex(
            p => p.installmentNumber === paymentUpdate.installmentNumber
          );
          
          if (paymentIndex !== -1) {
            loan.repaymentSchedule[paymentIndex].paidAmount = 
              (loan.repaymentSchedule[paymentIndex].paidAmount || 0) + paymentUpdate.amount;
            
            if (paymentUpdate.isFullPayment) {
              loan.repaymentSchedule[paymentIndex].status = 'Paid';
              loan.repaymentSchedule[paymentIndex].paidAt = new Date();
            }
          }
        }

        // Update loan totals
        const totalPaid = paymentsToUpdate.reduce((sum, p) => sum + p.amount, 0) + penaltyPaid;
        loan.totalPaid += totalPaid - penaltyPaid; // Don't count penalty as principal payment
        loan.remainingAmount = Math.max(0, loan.remainingAmount - (totalPaid - penaltyPaid));
        loan.penaltyAmount = Math.max(0, loan.penaltyAmount - penaltyPaid);
        
        // Check if loan is completed
        const allPaid = loan.repaymentSchedule.every(p => p.status === 'Paid');
        if (allPaid) {
          loan.status = 'Completed';
          loan.completedAt = new Date();
        }

        await loan.save({ session });

        // Create transaction record
        const transaction = await Transaction.create([{
          userId: userId,
          type: 'loan_payment',
          amount: paymentData.amount,
          currency: loan.currency,
          gateway: paymentData.paymentMethod,
          status: 'Approved',
          description: `Loan payment for loan ${loanId}`,
          transactionId: `LOAN_PAY_${Date.now()}_${userId.toString().slice(-6)}`,
          balanceBefore: user.balance,
          balanceAfter: paymentData.paymentMethod === 'balance' ? user.balance - paymentData.amount : user.balance,
          metadata: {
            loanId: loanId,
            paymentType: paymentData.paymentType,
            installmentNumbers: paymentsToUpdate.map(p => p.installmentNumber),
            penaltyPaid: penaltyPaid,
            paymentNote: paymentData.paymentNote,
            paymentBreakdown: paymentsToUpdate
          }
        }], { session });

        // Update user balance if paid from balance
        if (paymentData.paymentMethod === 'balance') {
          await User.findByIdAndUpdate(
            userId,
            { 
              $inc: { balance: -paymentData.amount },
              lastActiveAt: new Date()
            },
            { session }
          );
        }
      });

      // Send payment confirmation email
      try {
        const nextPayment = loan.repaymentSchedule.find(p => p.status === 'Pending');
        
        await sendEmail({
          to: user.email,
          subject: 'Loan Payment Confirmed',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #22c55e;">Payment Confirmed</h2>
              <p>Dear ${user.name},</p>
              <p>Your loan payment has been successfully processed.</p>
              <div style="background: #f0fdf4; border: 1px solid #22c55e; padding: 16px; margin: 20px 0; border-radius: 6px;">
                <strong>Payment Details:</strong><br>
                <strong>Amount Paid:</strong> ${paymentData.amount} ${loan.currency}<br>
                <strong>Loan ID:</strong> ${loanId}<br>
                <strong>Payment Date:</strong> ${new Date().toLocaleDateString()}<br>
                <strong>Remaining Balance:</strong> ${loan.remainingAmount} ${loan.currency}<br>
                ${nextPayment ? `<strong>Next Payment Due:</strong> ${nextPayment.dueDate.toLocaleDateString()} (${nextPayment.amount} ${loan.currency})` : '<strong>Status:</strong> Loan Completed! 🎉'}
              </div>
              ${loan.status === 'Completed' ? 
                '<p style="color: #22c55e; font-weight: bold;">Congratulations! You have successfully completed your loan repayment.</p>' :
                '<p>Thank you for your payment. Keep up the good work!</p>'
              }
            </div>
          `
        });
      } catch (emailError) {
        console.error('Failed to send payment confirmation email:', emailError);
      }

      // Log audit
      await AuditLog.create({
        adminId: null,
        action: 'LOAN_PAYMENT_MADE',
        entity: 'Loan',
        entityId: loanId,
        newData: {
          paymentAmount: paymentData.amount,
          paymentType: paymentData.paymentType,
          newBalance: loan.remainingAmount,
          loanStatus: loan.status
        },
        status: 'Success',
        metadata: {
          userSelfAction: true,
          paymentMethod: paymentData.paymentMethod,
          installmentsPaid: paymentsToUpdate.length,
          penaltyPaid: penaltyPaid
        },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      });

      return apiHandler.success({
        message: loan.status === 'Completed' ? 
          'Payment successful! Congratulations on completing your loan!' : 
          'Payment processed successfully',
        payment: {
          amount: paymentData.amount,
          currency: loan.currency,
          processedAt: new Date(),
          installmentsPaid: paymentsToUpdate.length,
          penaltyPaid: penaltyPaid
        },
        loan: {
          id: loan._id,
          status: loan.status,
          totalPaid: loan.totalPaid,
          remainingAmount: loan.remainingAmount,
          penaltyAmount: loan.penaltyAmount,
          isCompleted: loan.status === 'Completed',
          nextPaymentDate: loan.repaymentSchedule.find(p => p.status === 'Pending')?.dueDate,
          nextPaymentAmount: loan.repaymentSchedule.find(p => p.status === 'Pending')?.amount
        },
        newBalance: paymentData.paymentMethod === 'balance' ? user.balance - paymentData.amount : user.balance
      });

    } catch (error) {
      console.error('Transaction error:', error);
      throw error;
    } finally {
      await session.endSession();
    }

  } catch (error) {
    console.error('Error processing loan payment:', error);
    return apiHandler.internalError('Failed to process loan payment');
  }
}

export const POST = withErrorHandler(makeLoanPaymentHandler);