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

// Withdrawal approval validation schema
const withdrawalApprovalSchema = z.object({
  transactionId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid transaction ID'),
  action: z.enum(['approve', 'reject']),
  reason: z.string().optional(),
  adminNotes: z.string().optional(),
  adjustedAmount: z.number().min(0).optional(), // Allow admin to adjust amount during approval
  paymentReference: z.string().optional(), // Bank reference, transaction hash, etc.
  estimatedDelivery: z.string().datetime().optional() // When funds will be available
});

// Batch approval schema for withdrawals
const batchWithdrawalApprovalSchema = z.object({
  transactionIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid transaction ID')).min(1).max(50), // Lower limit for withdrawals due to manual processing
  action: z.enum(['approve', 'reject']),
  reason: z.string().optional(),
  adminNotes: z.string().optional(),
  batchPaymentReference: z.string().optional() // For batch payment processing
});

// POST /api/transactions/withdrawals/approve - Approve or reject a withdrawal
async function approveWithdrawalHandler(request: NextRequest): Promise<NextResponse> {
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
    const batchResult = isBatch ? batchWithdrawalApprovalSchema.safeParse(body) : undefined;
    const singleResult = !isBatch ? withdrawalApprovalSchema.safeParse(body) : undefined;

    if (isBatch && (!batchResult || !batchResult.success)) {
      return apiHandler.validationError(
        batchResult?.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        })) || []
      );
    }
    if (!isBatch && (!singleResult || !singleResult.success)) {
      return apiHandler.validationError(
        singleResult?.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        })) || []
      );
    }

    if (isBatch && batchResult && batchResult.success) {
      return handleBatchWithdrawalApproval(apiHandler, batchResult.data, adminId!);
    } else if (!isBatch && singleResult && singleResult.success) {
      return handleSingleWithdrawalApproval(apiHandler, singleResult.data, adminId!, request);
    } else {
      // Should not reach here, but just in case
      return apiHandler.validationError([{ field: '', message: 'Invalid request data', code: 'invalid_type' }]);
    }

  } catch (error) {
    console.error('Approve withdrawal error:', error);
    return apiHandler.handleError(error);
  }
}

// Handle single withdrawal approval
async function handleSingleWithdrawalApproval(
  apiHandler: ApiHandler, 
  data: z.infer<typeof withdrawalApprovalSchema>, 
  adminId: string,
  request: NextRequest
): Promise<NextResponse> {
  const { transactionId, action, reason, adminNotes, adjustedAmount, paymentReference, estimatedDelivery } = data;

  // Start MongoDB session for transaction
  const session = await mongoose.startSession();
  
  try {
    await session.withTransaction(async () => {
      // Find the withdrawal transaction
      const transaction = await Transaction.findOne({
        _id: new mongoose.Types.ObjectId(transactionId),
        type: 'withdrawal',
        status: 'Pending'
      }).populate('userId').session(session);

      if (!transaction) {
        throw new Error('Withdrawal transaction not found or already processed');
      }

      const user = transaction.userId as any;

      // Calculate refund amount if rejected
      let refundAmount = 0;
      if (action === 'reject') {
        refundAmount = transaction.amount; // Full refund including fees
      }

      // Handle amount adjustment if provided for approval
      let finalAmount = transaction.amount;
      let finalNetAmount = transaction.netAmount;
      let adjustmentRefund = 0;

      if (action === 'approve' && adjustedAmount !== undefined && adjustedAmount !== transaction.amount) {
        if (adjustedAmount > transaction.amount) {
          throw new Error('Adjusted amount cannot be greater than original amount');
        }
        
        adjustmentRefund = transaction.amount - adjustedAmount;
        finalAmount = adjustedAmount;
        finalNetAmount = adjustedAmount - transaction.fees;
      }

      // Update transaction status and details
      const updateData: any = {
        status: action === 'approve' ? 'Approved' : 'Rejected',
        approvedBy: new mongoose.Types.ObjectId(adminId),
        processedAt: new Date(),
        rejectionReason: action === 'reject' ? reason : undefined
      };

      // Add payment details for approved withdrawals
      if (action === 'approve') {
        updateData.gatewayResponse = {
          paymentReference,
          estimatedDelivery,
          processedBy: adminId,
          processingMethod: transaction.metadata?.withdrawalMethod
        };

        if (adjustedAmount !== undefined) {
          updateData.amount = finalAmount;
          updateData.netAmount = finalNetAmount;
          updateData.metadata = {
            ...transaction.metadata,
            originalAmount: transaction.amount,
            adjustedBy: adminId,
            adjustmentReason: reason || 'Amount adjusted during approval',
            adjustmentRefund
          };
        }
      }

      await Transaction.findByIdAndUpdate(transaction._id, updateData, { session });

      // Handle balance adjustments
      if (action === 'reject') {
        // Refund the full amount to user balance
        await User.findByIdAndUpdate(
          transaction.userId,
          { $inc: { balance: refundAmount } },
          { session }
        );
      } else if (action === 'approve' && adjustmentRefund > 0) {
        // Refund the adjustment amount
        await User.findByIdAndUpdate(
          transaction.userId,
          { $inc: { balance: adjustmentRefund } },
          { session }
        );
      }

      // Log audit trail
      await AuditLog.create([{
        userId: adminId,
        userType: 'admin',
        action: `withdrawal.${action}`,
        resource: 'Transaction',
        resourceId: transaction._id,
        details: {
          transactionId: transaction.transactionId,
          amount: finalAmount,
          originalAmount: transaction.amount,
          currency: transaction.currency,
          withdrawalMethod: transaction.metadata?.withdrawalMethod,
          targetUserId: transaction.userId,
          reason,
          adminNotes,
          paymentReference,
          estimatedDelivery,
          refundAmount: action === 'reject' ? refundAmount : adjustmentRefund
        },
        ipAddress: apiHandler.getClientIP(),
        userAgent: request.headers.get('user-agent') || undefined,
        status: 'Success'
      }], { session });

      // Create a system transaction for tracking if this is a large withdrawal
      if (action === 'approve' && finalAmount >= 10000) {
        await AuditLog.create([{
          userId: adminId,
          userType: 'admin',
          action: 'withdrawal.large_amount_approved',
          resource: 'Transaction',
          resourceId: transaction._id,
          details: {
            amount: finalAmount,
            currency: transaction.currency,
            requiresCompliance: true,
            approvedBy: adminId
          },
          ipAddress: apiHandler.getClientIP(),
          status: 'Success',
          severity: 'High'
        }], { session });
      }
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
          subject: 'Withdrawal Approved',
          templateId: 'withdrawal-approved',
          variables: {
            userName: user.name,
            amount: updatedTransaction!.amount,
            currency: updatedTransaction!.currency,
            transactionId: updatedTransaction!.transactionId,
            withdrawalMethod: updatedTransaction!.metadata?.withdrawalMethod,
            paymentReference: paymentReference || 'Will be provided when processed',
            estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery).toLocaleDateString() : 'Within 1-3 business days'
          }
        });
      } else {
        await sendEmail({
          to: user.email,
          subject: 'Withdrawal Rejected',
          templateId: 'withdrawal-rejected',
          variables: {
            userName: user.name,
            amount: updatedTransaction!.amount,
            currency: updatedTransaction!.currency,
            transactionId: updatedTransaction!.transactionId,
            reason: reason || 'No specific reason provided',
            refundAmount: updatedTransaction!.amount
          }
        });
      }
    } catch (emailError) {
      console.error('Failed to send notification email:', emailError);
      // Don't fail the API call if email fails
    }

    return apiHandler.success({
      transaction: updatedTransaction,
      message: `Withdrawal ${action}d successfully`
    });

  } finally {
    await session.endSession();
  }
}

// Handle batch withdrawal approval
async function handleBatchWithdrawalApproval(
  apiHandler: ApiHandler, 
  data: z.infer<typeof batchWithdrawalApprovalSchema>, 
  adminId: string
): Promise<NextResponse> {
  const { transactionIds, action, reason, adminNotes, batchPaymentReference } = data;

  const session = await mongoose.startSession();
  const results = {
    successful: [] as string[],
    failed: [] as { id: string; error: string }[],
    totalAmount: 0,
    totalRefunded: 0
  };

  try {
    await session.withTransaction(async () => {
      for (const transactionId of transactionIds) {
        try {
          // Find and validate transaction
          const transaction = await Transaction.findOne({
            _id: new mongoose.Types.ObjectId(transactionId),
            type: 'withdrawal',
            status: 'Pending'
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
              rejectionReason: action === 'reject' ? reason : undefined,
              gatewayResponse: action === 'approve' ? {
                batchPaymentReference,
                processedBy: adminId,
                batchOperation: true,
                processingMethod: transaction.metadata?.withdrawalMethod
              } : undefined
            },
            { session }
          );

          // Handle balance adjustments for rejections
          if (action === 'reject') {
            await User.findByIdAndUpdate(
              transaction.userId,
              { $inc: { balance: transaction.amount } },
              { session }
            );
            results.totalRefunded += transaction.amount;
          } else {
            results.totalAmount += transaction.amount;
          }

          // Log audit
          await AuditLog.create([{
            userId: adminId,
            userType: 'admin',
            action: `withdrawal.${action}.batch`,
            resource: 'Transaction',
            resourceId: transaction._id,
            details: {
              transactionId: transaction.transactionId,
              amount: transaction.amount,
              currency: transaction.currency,
              withdrawalMethod: transaction.metadata?.withdrawalMethod,
              targetUserId: transaction.userId,
              reason,
              adminNotes,
              batchOperation: true,
              batchPaymentReference
            },
            ipAddress: apiHandler.getClientIP(),
            status: 'Success'
          }], { session });

          results.successful.push(transactionId);

        } catch (error) {
          console.error(`Batch withdrawal approval failed for transaction ${transactionId}:`, error);
          results.failed.push({ 
            id: transactionId, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      }

      // Create batch operation audit log
      if (results.successful.length > 0) {
        await AuditLog.create([{
          userId: adminId,
          userType: 'admin',
          action: `withdrawal.batch_${action}`,
          resource: 'Transaction',
          details: {
            transactionCount: results.successful.length,
            totalAmount: action === 'approve' ? results.totalAmount : results.totalRefunded,
            batchPaymentReference,
            reason,
            adminNotes,
            successfulIds: results.successful,
            failedIds: results.failed.map(f => f.id)
          },
          ipAddress: apiHandler.getClientIP(),
          status: 'Success',
          severity: results.totalAmount >= 50000 ? 'High' : 'Medium' // Flag large batch operations
        }], { session });
      }
    });

    return apiHandler.success({
      results,
      message: `Batch withdrawal ${action} completed. ${results.successful.length} successful, ${results.failed.length} failed.`,
      summary: {
        totalProcessed: results.successful.length,
        totalAmount: action === 'approve' ? results.totalAmount : results.totalRefunded,
        batchPaymentReference
      }
    });

  } finally {
    await session.endSession();
  }
}

// PUT /api/transactions/withdrawals/approve - Update withdrawal status (for processing tracking)
const withdrawalStatusUpdateSchema = z.object({
  transactionId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid transaction ID'),
  status: z.enum(['Processing', 'Completed', 'Failed']),
  paymentReference: z.string().optional(),
  failureReason: z.string().optional(),
  actualDeliveryDate: z.string().datetime().optional()
});

async function updateWithdrawalStatusHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Apply middleware
  const authResult = await authMiddleware(request, {
    requireAuth: true,
    allowedUserTypes: ['admin'],
    requiredPermission: 'transactions.update'
  });
  if (authResult) return authResult;

  try {
    await connectToDatabase();

    const adminId = request.headers.get('x-user-id');
    const body = await request.json();
    const validationResult = withdrawalStatusUpdateSchema.safeParse(body);

    if (!validationResult.success) {
      return apiHandler.validationError(
        validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      );
    }

    const { transactionId, status, paymentReference, failureReason, actualDeliveryDate } = validationResult.data;

    // Find the approved withdrawal transaction
    const transaction = await Transaction.findOne({
      _id: new mongoose.Types.ObjectId(transactionId),
      type: 'withdrawal',
      status: { $in: ['Approved', 'Processing'] }
    }).populate('userId');

    if (!transaction) {
      return apiHandler.notFound('Approved withdrawal transaction not found');
    }

    // Update transaction with new status
    const updateData: any = {
      status,
      updatedAt: new Date()
    };

    // Update gateway response with tracking info
    updateData.gatewayResponse = {
      ...transaction.gatewayResponse,
      paymentReference: paymentReference || transaction.gatewayResponse?.paymentReference,
      actualDeliveryDate,
      failureReason,
      lastUpdatedBy: adminId,
      statusHistory: [
        ...(transaction.gatewayResponse?.statusHistory || []),
        {
          status,
          timestamp: new Date(),
          updatedBy: adminId,
          reference: paymentReference
        }
      ]
    };

    // If failed, refund the amount to user
    if (status === 'Failed') {
      const session = await mongoose.startSession();
      
      try {
        await session.withTransaction(async () => {
          await Transaction.findByIdAndUpdate(transaction._id, updateData, { session });
          
          // Refund the amount
          await User.findByIdAndUpdate(
            transaction.userId,
            { $inc: { balance: transaction.amount } },
            { session }
          );
        });
      } finally {
        await session.endSession();
      }
    } else {
      await Transaction.findByIdAndUpdate(transaction._id, updateData);
    }

    // Log audit trail
    await AuditLog.create({
      userId: adminId,
      userType: 'admin',
      action: `withdrawal.status_update`,
      resource: 'Transaction',
      resourceId: transaction._id,
      details: {
        transactionId: transaction.transactionId,
        newStatus: status,
        paymentReference,
        failureReason,
        refunded: status === 'Failed'
      },
      ipAddress: apiHandler.getClientIP(),
      status: 'Success'
    });

    // Send notification for completed or failed withdrawals
    const user = transaction.userId as any;
    try {
      if (status === 'Completed') {
        await sendEmail({
          to: user.email,
          subject: 'Withdrawal Completed',
          templateId: 'withdrawal-completed',
          variables: {
            userName: user.name,
            amount: transaction.amount,
            currency: transaction.currency,
            transactionId: transaction.transactionId,
            paymentReference: paymentReference || 'N/A',
            deliveryDate: actualDeliveryDate ? new Date(actualDeliveryDate).toLocaleDateString() : 'Today'
          }
        });
      } else if (status === 'Failed') {
        await sendEmail({
          to: user.email,
          subject: 'Withdrawal Failed - Funds Refunded',
          templateId: 'withdrawal-failed',
          variables: {
            userName: user.name,
            amount: transaction.amount,
            currency: transaction.currency,
            transactionId: transaction.transactionId,
            failureReason: failureReason || 'Technical error during processing',
            refundAmount: transaction.amount
          }
        });
      }
    } catch (emailError) {
      console.error('Failed to send status notification email:', emailError);
    }

    const updatedTransaction = await Transaction.findById(transaction._id)
      .populate('userId', 'name email')
      .populate('approvedBy', 'name email');

    return apiHandler.success({
      transaction: updatedTransaction,
      message: `Withdrawal status updated to ${status}`
    });

  } catch (error) {
    console.error('Update withdrawal status error:', error);
    return apiHandler.handleError(error);
  }
}

// Export handlers with error wrapper
export const POST = withErrorHandler(approveWithdrawalHandler);
export const PUT = withErrorHandler(updateWithdrawalStatusHandler);