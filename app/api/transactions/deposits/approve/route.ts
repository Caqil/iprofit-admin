import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Transaction } from '@/models/Transaction';
import { User } from '@/models/User';
import { AuditLog } from '@/models/AuditLog';
import { authMiddleware } from '@/middleware/auth';
import { apiRateLimit } from '@/middleware/rate-limit';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import { sendEmail } from '@/lib/email';
import { TransactionApproval } from '@/types/transaction';
import { z } from 'zod';
import mongoose from 'mongoose';
import { batchApprovalSchema, depositApprovalSchema } from '@/lib/validation';



// POST /api/transactions/deposits/approve - Approve or reject a deposit
async function approveDepositHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Apply middleware
  const authResult = await authMiddleware(request, {
    requireAuth: true,
    allowedUserTypes: ['admin'],
    requiredPermission: 'transactions.approve'
  });
  if (authResult) return authResult;

  const rateLimitResult = await apiRateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    await connectToDatabase();

    const adminId = request.headers.get('x-user-id');
    const body = await request.json();
    
    // Check if this is a batch operation
    const isBatch = Array.isArray(body.transactionIds);
    const validationResult = isBatch 
      ? batchApprovalSchema.safeParse(body)
      : depositApprovalSchema.safeParse(body);

    if (!validationResult.success) {
      return apiHandler.validationError(
        validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      );
    }

    if (isBatch) {
      // TypeScript: validationResult.data is batchApprovalSchema type here
      return handleBatchApproval(apiHandler, validationResult.data as z.infer<typeof batchApprovalSchema>, adminId!);
    } else {
      // TypeScript: validationResult.data is depositApprovalSchema type here
      return handleSingleApproval(apiHandler, validationResult.data as z.infer<typeof depositApprovalSchema>, adminId!);
    }

  } catch (error) {
    console.error('Approve deposit error:', error);
    return apiHandler.handleError(error);
  }
}

// Handle single deposit approval
async function handleSingleApproval(
  apiHandler: ApiHandler, 
  data: z.infer<typeof depositApprovalSchema>, 
  adminId: string
): Promise<NextResponse> {
  const { transactionId, action, reason, adminNotes, adjustedAmount, bonusAmount } = data;

  try {
    // Find the deposit transaction
    const transaction = await Transaction.findOne({
      _id: new mongoose.Types.ObjectId(transactionId),
      type: 'deposit',
      status: { $in: ['Pending', 'Processing'] }
    }).populate('userId');

    if (!transaction) {
      return apiHandler.notFound('Deposit transaction not found or already processed');
    }

    const user = transaction.userId as any;

    // Update transaction status and details
    const updateData: any = {
      status: action === 'approve' ? 'Approved' : 'Rejected',
      approvedBy: new mongoose.Types.ObjectId(adminId),
      processedAt: new Date(),
      rejectionReason: action === 'reject' ? reason : undefined,
      adminNotes: adminNotes || transaction.adminNotes
    };

    // Handle amount adjustment if provided for approval
    let finalAmount = transaction.amount;
    if (action === 'approve' && adjustedAmount !== undefined && adjustedAmount !== transaction.amount) {
      if (adjustedAmount < 0) {
        return apiHandler.badRequest('Adjusted amount cannot be negative');
      }
      finalAmount = adjustedAmount;
      updateData.amount = adjustedAmount;
      updateData.netAmount = adjustedAmount - transaction.fees;
    }

    // Update the transaction
    const updatedTransaction = await Transaction.findByIdAndUpdate(
      transaction._id,
      updateData,
      { new: true }
    ).populate('userId', 'name email');

    // Handle user balance updates for approved deposits
    if (action === 'approve') {
      let balanceIncrease = finalAmount;
      
      // Add bonus amount if provided
      if (bonusAmount && bonusAmount > 0) {
        balanceIncrease += bonusAmount;
        
        // Create bonus transaction record
        await Transaction.create({
          userId: user._id,
          type: 'bonus',
          amount: bonusAmount,
          currency: transaction.currency,
          gateway: 'System',
          status: 'Approved',
          description: `Deposit bonus for transaction ${transaction.transactionId}`,
          transactionId: `BONUS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          fees: 0,
          netAmount: bonusAmount,
          approvedBy: new mongoose.Types.ObjectId(adminId),
          processedAt: new Date(),
          metadata: {
            relatedTransactionId: transaction._id.toString(),
            bonusType: 'deposit_bonus'
          }
        });
      }

      // Update user balance
      await User.findByIdAndUpdate(
        user._id,
        { $inc: { balance: balanceIncrease } }
      );
    }

    // Create audit log
    await AuditLog.create({
      adminId: new mongoose.Types.ObjectId(adminId),
      action: `transactions.${action}`,
      entity: 'Transaction',
      entityId: transaction._id.toString(),
      oldData: { status: transaction.status },
      newData: { status: updateData.status },
      changes: [{
        field: 'status',
        oldValue: transaction.status,
        newValue: updateData.status
      }],
      ipAddress: apiHandler.getClientIP(),
      userAgent: 'deposit-approval',
      status: 'Success',
      severity: transaction.amount >= 10000 ? 'High' : 'Medium',
      metadata: {
        adjustedAmount: adjustedAmount !== transaction.amount ? adjustedAmount : undefined,
        bonusAmount: bonusAmount || undefined,
        reason
      }
    });

    // Send notification email
    try {
      if (action === 'approve') {
        await sendEmail({
          to: user.email,
          subject: 'Deposit Approved',
          templateId: 'deposit-approved',
          variables: {
            userName: user.name,
            amount: finalAmount,
            currency: updatedTransaction!.currency,
            transactionId: updatedTransaction!.transactionId,
            bonusAmount: bonusAmount || 0,
            totalCredited: finalAmount + (bonusAmount || 0)
          }
        });
      } else {
        await sendEmail({
          to: user.email,
          subject: 'Deposit Rejected',
          templateId: 'deposit-rejected',
          variables: {
            userName: user.name,
            amount: updatedTransaction!.amount,
            currency: updatedTransaction!.currency,
            transactionId: updatedTransaction!.transactionId,
            reason: reason || 'No specific reason provided'
          }
        });
      }
    } catch (emailError) {
      console.error('Failed to send notification email:', emailError);
      // Don't fail the API call if email fails
    }

    return apiHandler.success({
      transaction: updatedTransaction,
      message: `Deposit ${action}d successfully`
    });

  } catch (error) {
    console.error('Single deposit approval error:', error);
    return apiHandler.handleError(error);
  }
}


// Handle batch approval

async function handleBatchApproval(
  apiHandler: ApiHandler, 
  data: z.infer<typeof batchApprovalSchema>, 
  adminId: string
): Promise<NextResponse> {
  const { transactionIds, action, reason, adminNotes } = data;

  const results = {
    successful: [] as string[],
    failed: [] as { id: string; error: string }[]
  };

  try {
    // Process each transaction individually (without session)
    for (const transactionId of transactionIds) {
      try {
        // Find and validate transaction
        const transaction = await Transaction.findOne({
          _id: new mongoose.Types.ObjectId(transactionId),
          type: 'deposit',
          status: { $in: ['Pending', 'Processing'] }
        }).populate('userId');

        if (!transaction) {
          results.failed.push({ 
            id: transactionId, 
            error: 'Transaction not found or already processed' 
          });
          continue;
        }

        const user = transaction.userId as any;

        // Update transaction
        const updatedTransaction = await Transaction.findByIdAndUpdate(
          transaction._id,
          {
            status: action === 'approve' ? 'Approved' : 'Rejected',
            approvedBy: new mongoose.Types.ObjectId(adminId),
            processedAt: new Date(),
            rejectionReason: action === 'reject' ? reason : undefined,
            adminNotes: adminNotes || transaction.adminNotes
          },
          { new: true }
        );

        if (!updatedTransaction) {
          results.failed.push({ 
            id: transactionId, 
            error: 'Failed to update transaction' 
          });
          continue;
        }

        // Handle balance update for approved deposits
        if (action === 'approve') {
          await User.findByIdAndUpdate(
            user._id,
            { $inc: { balance: transaction.amount } }
          );
        }

        results.successful.push(transactionId);

        // Send individual notification emails (optional - you might want to batch these)
        try {
          if (action === 'approve') {
            await sendEmail({
              to: user.email,
              subject: 'Deposit Approved',
              templateId: 'deposit-approved',
              variables: {
                userName: user.name,
                amount: transaction.amount,
                currency: transaction.currency,
                transactionId: transaction.transactionId,
                bonusAmount: 0,
                totalCredited: transaction.amount
              }
            });
          } else {
            await sendEmail({
              to: user.email,
              subject: 'Deposit Rejected',
              templateId: 'deposit-rejected',
              variables: {
                userName: user.name,
                amount: transaction.amount,
                currency: transaction.currency,
                transactionId: transaction.transactionId,
                reason: reason || 'No specific reason provided'
              }
            });
          }
        } catch (emailError) {
          console.error(`Failed to send email for transaction ${transactionId}:`, emailError);
          // Don't fail the batch operation for email errors
        }

      } catch (transactionError) {
        console.error(`Error processing transaction ${transactionId}:`, transactionError);
        results.failed.push({ 
          id: transactionId, 
          error: transactionError instanceof Error ? transactionError.message : 'Unknown error' 
        });
      }
    }

    // Create batch audit log
    await AuditLog.create({
      adminId: new mongoose.Types.ObjectId(adminId),
      action: `transactions.batch_${action}`,
      entity: 'Transaction',
      metadata: {
        transactionIds,
        batchSize: transactionIds.length,
        successfulCount: results.successful.length,
        failedCount: results.failed.length,
        reason,
        adminNotes,
        successfulIds: results.successful,
        failedIds: results.failed.map(f => f.id)
      },
      ipAddress: apiHandler.getClientIP(),
      userAgent: 'batch-operation',
      status: 'Success',
      severity: transactionIds.length >= 10 ? 'High' : 'Medium'
    });

    return apiHandler.success({
      results,
      message: `Batch deposit ${action} completed. ${results.successful.length} successful, ${results.failed.length} failed.`
    });

  } catch (error) {
    console.error('Batch deposit approval error:', error);
    return apiHandler.handleError(error);
  }
}

// Export handler with error wrapper
export const POST = withErrorHandler(approveDepositHandler);