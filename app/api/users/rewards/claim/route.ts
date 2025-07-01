import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/config/auth';
import { z } from 'zod';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { TaskSubmission } from '@/models/Task';
import { Referral } from '@/models/Referral';
import { Transaction } from '@/models/Transaction';
import { AuditLog } from '@/models/AuditLog';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import mongoose from 'mongoose';
import { getUserFromRequest } from '@/lib/auth-helper';

// Validation schema for claim request
const claimRewardSchema = z.object({
  rewardType: z.enum(['task', 'referral']),
  rewardId: z.string().min(1, 'Reward ID is required'),
  claimNote: z.string().optional()
});

async function claimRewardHandler(request: NextRequest) {
  const apiHandler = new ApiHandler(request);

  try {
    // Connect to database
    await connectToDatabase();

    // Get user session
   const authResult = await getUserFromRequest(request);
          if (!authResult) {
            return apiHandler.unauthorized('Authentication required');
          }

    const userId = new mongoose.Types.ObjectId(authResult.userId);

    // Parse request body
    const body = await request.json();
    const validationResult = claimRewardSchema.safeParse(body);
    
    if (!validationResult.success) {
      return apiHandler.validationError(
        validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      );
    }

    const { rewardType, rewardId, claimNote } = validationResult.data;

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      return apiHandler.notFound('User not found');
    }

    const session_tx = await mongoose.startSession();
    let claimedReward: any = null;
    let transaction: any = null;

    try {
      await session_tx.withTransaction(async () => {
        if (rewardType === 'task') {
          // Handle task reward claim
          const taskSubmission = await TaskSubmission.findOne({
            _id: new mongoose.Types.ObjectId(rewardId),
            userId: userId,
            status: 'Approved',
            transactionId: null // Not yet paid
          }).populate('taskId').session(session_tx);

          if (!taskSubmission) {
            throw new Error('Task reward not found or already claimed');
          }

          // Create transaction for task reward
          transaction = await Transaction.create([{
            userId: userId,
            type: 'bonus',
            amount: taskSubmission.reward,
            currency: 'BDT',
            gateway: 'System',
            status: 'Approved',
            description: `Task completion reward: ${taskSubmission.taskId.title}`,
            transactionId: `TASK_${Date.now()}_${userId.toString().slice(-6)}`,
            balanceBefore: user.balance,
            balanceAfter: user.balance + taskSubmission.reward,
            metadata: {
              rewardType: 'task',
              taskId: taskSubmission.taskId._id,
              taskTitle: taskSubmission.taskId.title,
              submissionId: taskSubmission._id,
              claimNote: claimNote || null
            }
          }], { session: session_tx });

          // Update task submission with transaction ID
          await TaskSubmission.findByIdAndUpdate(
            taskSubmission._id,
            { transactionId: transaction[0]._id },
            { session: session_tx }
          );

          claimedReward = {
            type: 'task',
            id: taskSubmission._id,
            amount: taskSubmission.reward,
            title: taskSubmission.taskId.title,
            transactionId: transaction[0]._id
          };

        } else if (rewardType === 'referral') {
          // Handle referral reward claim
          const referral = await Referral.findOne({
            _id: new mongoose.Types.ObjectId(rewardId),
            referrerId: userId,
            status: 'Pending'
          }).populate('refereeId').session(session_tx);

          if (!referral) {
            throw new Error('Referral reward not found or already claimed');
          }

          const totalBonus = referral.bonusAmount + (referral.profitBonus || 0);

          // Create transaction for referral reward
          transaction = await Transaction.create([{
            userId: userId,
            type: 'bonus',
            amount: totalBonus,
            currency: 'BDT',
            gateway: 'System',
            status: 'Approved',
            description: `Referral bonus from ${referral.refereeId.name}`,
            transactionId: `REF_${Date.now()}_${userId.toString().slice(-6)}`,
            balanceBefore: user.balance,
            balanceAfter: user.balance + totalBonus,
            metadata: {
              rewardType: 'referral',
              referralId: referral._id,
              refereeId: referral.refereeId._id,
              refereeName: referral.refereeId.name,
              bonusType: referral.bonusType,
              bonusAmount: referral.bonusAmount,
              profitBonus: referral.profitBonus || 0,
              claimNote: claimNote || null
            }
          }], { session: session_tx });

          // Update referral status and transaction ID
          await Referral.findByIdAndUpdate(
            referral._id,
            { 
              status: 'Paid',
              transactionId: transaction[0]._id,
              paidAt: new Date()
            },
            { session: session_tx }
          );

          claimedReward = {
            type: 'referral',
            id: referral._id,
            amount: totalBonus,
            title: `Referral bonus from ${referral.refereeId.name}`,
            transactionId: transaction[0]._id
          };
        }

        // Update user balance
        await User.findByIdAndUpdate(
          userId,
          { 
            $inc: { balance: claimedReward.amount },
            lastActiveAt: new Date()
          },
          { session: session_tx }
        );
      });

      // Log audit
      await AuditLog.create({
        adminId: null,
        action: 'REWARD_CLAIM',
        entity: rewardType === 'task' ? 'TaskSubmission' : 'Referral',
        entityId: rewardId,
        status: 'Success',
        metadata: {
          userSelfAction: true,
          rewardType,
          amount: claimedReward.amount,
          transactionId: transaction[0]._id,
          claimNote: claimNote || null
        },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      });

      return apiHandler.success({
        message: 'Reward claimed successfully',
        reward: claimedReward,
        newBalance: user.balance + claimedReward.amount,
        transaction: {
          id: transaction[0]._id,
          transactionId: transaction[0].transactionId,
          amount: transaction[0].amount,
          status: transaction[0].status
        }
      });

    } catch (error) {
      console.error('Transaction error:', error);
      throw error;
    } finally {
      await session_tx.endSession();
    }

  } catch (error) {
    console.error('Error claiming reward:', error);
    if (error instanceof Error && (error.message.includes('not found') || error.message.includes('already claimed'))) {
      return apiHandler.badRequest(error.message);
    }
    return apiHandler.internalError('Failed to claim reward');
  }
}

export const POST = withErrorHandler(claimRewardHandler);
