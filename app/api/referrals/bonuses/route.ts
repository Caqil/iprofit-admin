import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Referral, IReferral } from '@/models/Referral';
import { User } from '@/models/User';
import { Transaction } from '@/models/Transaction';
import { AuditLog } from '@/models/AuditLog';
import { Notification } from '@/models/Notification';
import { authMiddleware } from '@/middleware/auth';
import { apiRateLimit } from '@/middleware/rate-limit';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import { sendEmail } from '@/lib/email';
import { z } from 'zod';
import mongoose from 'mongoose';
import { bonusApprovalSchema, bonusRecalculationSchema } from '@/lib/validation';


// GET /api/referrals/bonuses - Get bonus overview and pending approvals
async function getBonusesHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Apply middleware
  const authResult = await authMiddleware(request, {
    requireAuth: true,
    allowedUserTypes: ['admin'],
    requiredPermission: 'referrals.view'
  });
  if (authResult) return authResult;

  const rateLimitResult = await apiRateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    await connectToDatabase();

    const url = new URL(request.url);
    const status = url.searchParams.get('status') || 'Pending';
    const bonusType = url.searchParams.get('bonusType');

    // Build match conditions
    const matchConditions: any = { status };
    if (bonusType) matchConditions.bonusType = bonusType;

    // Get bonus overview statistics
    const overviewPipeline: mongoose.PipelineStage[] = [
      {
        $group: {
          _id: null,
          totalBonuses: { $sum: 1 },
          totalAmount: { $sum: '$bonusAmount' },
          totalProfitBonus: { $sum: '$profitBonus' },
          pendingBonuses: {
            $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] }
          },
          pendingAmount: {
            $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, '$bonusAmount', 0] }
          },
          paidBonuses: {
            $sum: { $cond: [{ $eq: ['$status', 'Paid'] }, 1, 0] }
          },
          paidAmount: {
            $sum: { $cond: [{ $eq: ['$status', 'Paid'] }, '$bonusAmount', 0] }
          }
        }
      }
    ];

    const [overviewResult] = await Referral.aggregate(overviewPipeline);

    // Get pending bonuses for approval
    const pendingBonusesPipeline: mongoose.PipelineStage[] = [
      { $match: matchConditions },
      {
        $lookup: {
          from: 'users',
          localField: 'referrerId',
          foreignField: '_id',
          as: 'referrer',
          pipeline: [{ $project: { name: 1, email: 1, referralCode: 1 } }]
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'refereeId',
          foreignField: '_id',
          as: 'referee',
          pipeline: [{ $project: { name: 1, email: 1, kycStatus: 1 } }]
        }
      },
      { $unwind: '$referrer' },
      { $unwind: '$referee' },
      { $sort: { createdAt: -1 } },
      { $limit: 50 }, // Limit to 50 most recent pending bonuses
      {
        $project: {
          _id: 1,
          bonusAmount: 1,
          profitBonus: 1,
          bonusType: 1,
          status: 1,
          metadata: 1,
          createdAt: 1,
          referrer: {
            id: '$referrer._id',
            name: '$referrer.name',
            email: '$referrer.email',
            referralCode: '$referrer.referralCode'
          },
          referee: {
            id: '$referee._id',
            name: '$referee.name',
            email: '$referee.email',
            kycStatus: '$referee.kycStatus'
          }
        }
      }
    ];

    const pendingBonuses = await Referral.aggregate(pendingBonusesPipeline);

    // Get top referrers
    const topReferrersPipeline: mongoose.PipelineStage[] = [
      { $match: { status: 'Paid' } },
      {
        $group: {
          _id: '$referrerId',
          totalReferrals: { $sum: 1 },
          totalEarnings: { $sum: { $add: ['$bonusAmount', '$profitBonus'] } },
          signupBonuses: {
            $sum: { $cond: [{ $eq: ['$bonusType', 'signup'] }, 1, 0] }
          },
          profitShares: {
            $sum: { $cond: [{ $eq: ['$bonusType', 'profit_share'] }, 1, 0] }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
          pipeline: [{ $project: { name: 1, email: 1, referralCode: 1 } }]
        }
      },
      { $unwind: '$user' },
      { $sort: { totalEarnings: -1 } },
      { $limit: 10 },
      {
        $project: {
          userId: '$_id',
          userName: '$user.name',
          userEmail: '$user.email',
          referralCode: '$user.referralCode',
          totalReferrals: 1,
          totalEarnings: 1,
          signupBonuses: 1,
          profitShares: 1
        }
      }
    ];

    const topReferrers = await Referral.aggregate(topReferrersPipeline);

    // Log audit
    await AuditLog.create({
      adminId: request.headers.get('x-user-id'),
      action: 'referrals.bonuses.view',
      entity: 'ReferralBonus',
      status: 'Success',
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    });

    return apiHandler.success({
      overview: {
        totalBonuses: overviewResult?.totalBonuses || 0,
        totalAmount: overviewResult?.totalAmount || 0,
        totalProfitBonus: overviewResult?.totalProfitBonus || 0,
        pendingBonuses: overviewResult?.pendingBonuses || 0,
        pendingAmount: overviewResult?.pendingAmount || 0,
        paidBonuses: overviewResult?.paidBonuses || 0,
        paidAmount: overviewResult?.paidAmount || 0
      },
      pendingBonuses,
      topReferrers
    });

  } catch (error) {
    console.error('Error fetching bonuses:', error);
    return apiHandler.internalError('Failed to fetch bonuses');
  }
}

// POST /api/referrals/bonuses - Process bonus approvals or rejections
async function processBonusesHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Apply middleware
  const authResult = await authMiddleware(request, {
    requireAuth: true,
    allowedUserTypes: ['admin'],
    requiredPermission: 'referrals.approve'
  });
  if (authResult) return authResult;

  const rateLimitResult = await apiRateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    await connectToDatabase();

    const adminId = request.headers.get('x-user-id');
    const body = await request.json();

    // Check if this is a bonus recalculation request
    if (body.refereeId && body.newProfitAmount !== undefined) {
      return handleBonusRecalculation(apiHandler, body, adminId!);
    }

    // Validate approval request
    const validationResult = bonusApprovalSchema.safeParse(body);
    if (!validationResult.success) {
      return apiHandler.validationError(
        validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      );
    }

    const { referralIds, action, reason, adminNotes, adjustedAmount } = validationResult.data;

    // Start transaction
    const session = await mongoose.startSession();
    
    try {
      await session.withTransaction(async () => {
        // Get all referrals to process
        const referrals = await Referral.find({
          _id: { $in: referralIds.map(id => new mongoose.Types.ObjectId(id)) },
          status: 'Pending'
        }).populate([
          { path: 'referrerId', select: 'name email balance' },
          { path: 'refereeId', select: 'name email' }
        ]).session(session);

        if (referrals.length !== referralIds.length) {
          throw new Error('Some referrals not found or already processed');
        }

        const processedReferrals: { id: any; status: string; amount: any }[] = [];
        const failedReferrals: { id: any; error: string }[] = [];

        for (const referral of referrals) {
          try {
            if (action === 'approve') {
              // Calculate final bonus amount
              const finalAmount = adjustedAmount !== undefined ? adjustedAmount : referral.bonusAmount;

              // Create bonus transaction
              const transaction = new Transaction({
                userId: referral.referrerId,
                type: 'bonus',
                amount: finalAmount,
                currency: 'BDT',
                gateway: 'System',
                status: 'Approved',
                description: `Referral bonus - ${referral.bonusType}`,
                netAmount: finalAmount,
                processedAt: new Date(),
                metadata: {
                  referralId: referral._id,
                  refereeId: referral.refereeId,
                  bonusType: referral.bonusType
                }
              });

              await transaction.save({ session });

              // Update user balance
              await User.findByIdAndUpdate(
                referral.referrerId,
                { $inc: { balance: finalAmount } },
                { session }
              );

              // Update referral status
              referral.status = 'Paid';
              referral.transactionId = transaction._id;
              referral.paidAt = new Date();
              if (adjustedAmount !== undefined) {
                referral.bonusAmount = adjustedAmount;
              }
              await referral.save({ session });

              // Send notification email
              const referrer = referral.referrerId as any;
              await sendEmail({
                to: referrer.email,
                subject: 'Referral Bonus Approved',
                templateId: 'referral-bonus-approved',
                variables: {
                  userName: referrer.name,
                  bonusAmount: finalAmount,
                  bonusType: referral.bonusType,
                  transactionId: transaction.transactionId
                }
              });

              // Create in-app notification
              await Notification.create([{
                userId: referral.referrerId,
                type: 'Referral',
                channel: 'in_app',
                title: 'Referral Bonus Approved',
                message: `Your ${referral.bonusType} bonus of ${finalAmount} BDT has been approved and added to your balance.`,
                priority: 'Medium',
                data: {
                  referralId: referral._id,
                  transactionId: transaction._id,
                  amount: finalAmount
                }
              }], { session });

            } else {
              // Reject the referral
              referral.status = 'Cancelled';
              await referral.save({ session });

              // Send rejection notification
              const referrer = referral.referrerId as any;
              await sendEmail({
                to: referrer.email,
                subject: 'Referral Bonus Rejected',
                templateId: 'referral-bonus-rejected',
                variables: {
                  userName: referrer.name,
                  bonusType: referral.bonusType,
                  reason: reason || 'Not specified'
                }
              });
            }

            processedReferrals.push({
              id: referral._id,
              status: action === 'approve' ? 'Paid' : 'Cancelled',
              amount: action === 'approve' ? (adjustedAmount || referral.bonusAmount) : 0
            });

          } catch (error) {
            console.error(`Error processing referral ${referral._id}:`, error);
            failedReferrals.push({
              id: referral._id,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }

        // Log audit
        await AuditLog.create([{
          adminId,
          action: `referrals.bonuses.${action}`,
          entity: 'ReferralBonus',
          status: failedReferrals.length === 0 ? 'Success' : 'Partial',
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
          metadata: {
            processedCount: processedReferrals.length,
            failedCount: failedReferrals.length,
            totalAmount: processedReferrals.reduce((sum, r) => sum + r.amount, 0),
            reason,
            adminNotes
          }
        }], { session });

        if (failedReferrals.length > 0) {
          throw new Error(`Failed to process ${failedReferrals.length} referrals`);
        }
      });

      return apiHandler.success({
        message: `Successfully ${action}ed ${referralIds.length} referral bonuses`,
        processedCount: referralIds.length,
        totalAmount: action === 'approve' ? 
          (adjustedAmount ? adjustedAmount * referralIds.length : 0) : 0
      });

    } finally {
      await session.endSession();
    }

  } catch (error) {
    console.error('Error processing bonuses:', error);
    return apiHandler.internalError(
      error instanceof Error ? error.message : 'Failed to process bonuses'
    );
  }
}

// Helper function to handle bonus recalculation
async function handleBonusRecalculation(
  apiHandler: ApiHandler,
  body: any,
  adminId: string
): Promise<NextResponse> {
  const validationResult = bonusRecalculationSchema.safeParse(body);
  if (!validationResult.success) {
    return apiHandler.validationError(
      validationResult.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code
      }))
    );
  }

  const { refereeId, newProfitAmount, profitSharePercentage } = validationResult.data;

  // Find all profit-share referrals for this referee
  const referrals = await Referral.find({
    refereeId: new mongoose.Types.ObjectId(refereeId),
    bonusType: 'profit_share',
    status: { $in: ['Pending', 'Paid'] }
  }).populate('referrerId', 'name email');

  if (referrals.length === 0) {
    return apiHandler.notFound('No profit-share referrals found for this user');
  }

  // Calculate new profit bonus
  const newProfitBonus = (newProfitAmount * profitSharePercentage) / 100;

  const updatePromises = referrals.map(async (referral) => {
    const oldProfitBonus = referral.profitBonus;
    referral.profitBonus = newProfitBonus;
    referral.metadata = {
      ...referral.metadata,
      totalRefereeProfit: newProfitAmount,
      lastRecalculatedAt: new Date()
    };
    await referral.save();

    return {
      referralId: referral._id,
      oldProfitBonus,
      newProfitBonus,
      difference: newProfitBonus - oldProfitBonus
    };
  });

  const updates = await Promise.all(updatePromises);

  // Log audit
  await AuditLog.create({
    adminId,
    action: 'referrals.bonuses.recalculate',
    entity: 'ReferralBonus',
    entityId: refereeId,
    oldData: { totalProfit: updates[0]?.oldProfitBonus },
    newData: { totalProfit: newProfitAmount, profitBonus: newProfitBonus },
    status: 'Success',
    ipAddress: '',
    userAgent: '',
    metadata: {
      affectedReferrals: updates.length,
      profitSharePercentage
    }
  });

  return apiHandler.success({
    message: 'Profit bonuses recalculated successfully',
    refereeId,
    newProfitAmount,
    newProfitBonus,
    affectedReferrals: updates.length,
    updates
  });
}

// Export handlers with error wrapper
export const GET = withErrorHandler(getBonusesHandler);
export const POST = withErrorHandler(processBonusesHandler);
