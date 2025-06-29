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

  // Start MongoDB session for transaction
  const session = await mongoose.startSession();
  
  try {
    await session.withTransaction(async () => {
      // Find the deposit transaction
      const transaction = await Transaction.findOne({
        _id: new mongoose.Types.ObjectId(transactionId),
        type: 'deposit',
        status: { $in: ['Pending', 'Processing'] }
      }).populate('userId').session(session);

      if (!transaction) {
        throw new Error('Deposit transaction not found or already processed');
      }

      const user = transaction.userId as any;

      // Update transaction status and details
      const updateData: any = {
        status: action === 'approve' ? 'Approved' : 'Rejected',
        approvedBy: new mongoose.Types.ObjectId(adminId),
        processedAt: new Date(),
        rejectionReason: action === 'reject' ? reason : undefined
      };

      // Handle amount adjustment if provided
      if (action === 'approve' && adjustedAmount !== undefined && adjustedAmount !== transaction.amount) {
        updateData.amount = adjustedAmount;
        updateData.netAmount = adjustedAmount - transaction.fees;
        updateData.metadata = {
          ...transaction.metadata,
          originalAmount: transaction.amount,
          adjustedBy: adminId,
          adjustmentReason: reason || 'Amount adjusted during approval'
        };
      }

      await Transaction.findByIdAndUpdate(transaction._id, updateData, { session });

      // Handle approval actions
      if (action === 'approve') {
        const finalAmount = adjustedAmount || transaction.netAmount;
        let totalCreditAmount = finalAmount;

        // Add bonus if provided
        if (bonusAmount && bonusAmount > 0) {
          totalCreditAmount += bonusAmount;
          
          // Create bonus transaction
          await Transaction.create([{
            userId: transaction.userId,
            type: 'bonus',
            amount: bonusAmount,
            currency: transaction.currency,
            gateway: 'System',
            status: 'Approved',
            transactionId: `BONUS-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
            description: `Deposit bonus for transaction ${transaction.transactionId}`,
            fees: 0,
            netAmount: bonusAmount,
            approvedBy: new mongoose.Types.ObjectId(adminId),
            processedAt: new Date(),
            metadata: {
              relatedTransaction: transaction._id,
              bonusType: 'deposit_bonus'
            }
          }], { session });
        }

        // Update user balance
        await User.findByIdAndUpdate(
          transaction.userId,
          { $inc: { balance: totalCreditAmount } },
          { session }
        );

        // Check for referral bonus if this is user's first deposit
        const userDeposits = await Transaction.countDocuments({
          userId: transaction.userId,
          type: 'deposit',
          status: 'Approved',
          _id: { $ne: transaction._id }
        }).session(session);

        if (userDeposits === 0 && user.referredBy) {
          // Create referral bonus for the referrer
          const referralBonus = Math.min(finalAmount * 0.1, 100); // 10% up to 100 units
          
          await Transaction.create([{
            userId: user.referredBy,
            type: 'bonus',
            amount: referralBonus,
            currency: transaction.currency,
            gateway: 'System',
            status: 'Approved',
            transactionId: `REF-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
            description: `Referral bonus for ${user.name}'s first deposit`,
            fees: 0,
            netAmount: referralBonus,
            approvedBy: new mongoose.Types.ObjectId(adminId),
            processedAt: new Date(),
            metadata: {
              referralTransaction: transaction._id,
              referredUserId: transaction.userId,
              bonusType: 'referral_bonus'
            }
          }], { session });

          // Update referrer balance
          await User.findByIdAndUpdate(
            user.referredBy,
            { $inc: { balance: referralBonus } },
            { session }
          );
        }
      }

      // Log audit trail
      await AuditLog.create([{
        userId: adminId,
        userType: 'admin',
        action: `deposit.${action}`,
        resource: 'Transaction',
        resourceId: transaction._id,
        details: {
          transactionId: transaction.transactionId,
          amount: adjustedAmount || transaction.amount,
          originalAmount: transaction.amount,
          currency: transaction.currency,
          gateway: transaction.gateway,
          targetUserId: transaction.userId,
          reason,
          adminNotes,
          bonusAmount
        },
        ipAddress: apiHandler.getClientIP(),
        userAgent: apiHandler.getQueryParams().get('user-agent') || undefined,
        status: 'Success'
      }], { session });
    });

    // Send notification email (outside transaction)
    const updatedTransaction = await Transaction.findById(transactionId)
      .populate('userId', 'name email')
      .populate('approvedBy', 'name email');

    const user = updatedTransaction!.userId as any;
    
    try {
      if (action === 'approve') {
        await sendEmail({
          to: user.email,
          subject: 'Deposit Approved',
          templateId: 'deposit-approved',
          variables: {
            userName: user.name,
            amount: updatedTransaction!.amount,
            currency: updatedTransaction!.currency,
            transactionId: updatedTransaction!.transactionId,
            bonusAmount: bonusAmount || 0
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

  } finally {
    await session.endSession();
  }
}

// Handle batch approval
async function handleBatchApproval(
  apiHandler: ApiHandler, 
  data: z.infer<typeof batchApprovalSchema>, 
  adminId: string
): Promise<NextResponse> {
  const { transactionIds, action, reason, adminNotes } = data;

  const session = await mongoose.startSession();
  const results = {
    successful: [] as string[],
    failed: [] as { id: string; error: string }[]
  };

  try {
    await session.withTransaction(async () => {
      for (const transactionId of transactionIds) {
        try {
          // Find and validate transaction
          const transaction = await Transaction.findOne({
            _id: new mongoose.Types.ObjectId(transactionId),
            type: 'deposit',
            status: { $in: ['Pending', 'Processing'] }
          }).populate('userId').session(session);

          if (!transaction) {
            results.failed.push({ 
              id: transactionId, 
              error: 'Transaction not found or already processed' 
            });
            continue;
          }

          // Update transaction
          await Transaction.findByIdAndUpdate(
            transaction._id,
            {
              status: action === 'approve' ? 'Approved' : 'Rejected',
              approvedBy: new mongoose.Types.ObjectId(adminId),
              processedAt: new Date(),
              rejectionReason: action === 'reject' ? reason : undefined
            },
            { session }
          );

          // Update user balance if approved
          if (action === 'approve') {
            await User.findByIdAndUpdate(
              transaction.userId,
              { $inc: { balance: transaction.netAmount } },
              { session }
            );
          }

          // Log audit
          await AuditLog.create([{
            userId: adminId,
            userType: 'admin',
            action: `deposit.${action}.batch`,
            resource: 'Transaction',
            resourceId: transaction._id,
            details: {
              transactionId: transaction.transactionId,
              amount: transaction.amount,
              currency: transaction.currency,
              targetUserId: transaction.userId,
              reason,
              adminNotes,
              batchOperation: true
            },
            ipAddress: apiHandler.getClientIP(),
            status: 'Success'
          }], { session });

          results.successful.push(transactionId);

        } catch (error) {
          console.error(`Batch approval failed for transaction ${transactionId}:`, error);
          results.failed.push({ 
            id: transactionId, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      }
    });

    return apiHandler.success({
      results,
      message: `Batch ${action} completed. ${results.successful.length} successful, ${results.failed.length} failed.`
    });

  } finally {
    await session.endSession();
  }
}

// Export handler with error wrapper
export const POST = withErrorHandler(approveDepositHandler);