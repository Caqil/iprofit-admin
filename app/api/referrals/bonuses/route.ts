// app/api/referrals/bonuses/route.ts - FIXED VERSION
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
import { BusinessRules } from '@/lib/settings-helper';

/**
 * Process bonus with auto-approval if eligible
 */
async function processBonusWithAutoApproval(
  referral: any,
  session: any
): Promise<{
  processed: boolean;
  status: 'Approved' | 'Pending';
  reason?: string;
}> {
  try {
    // Get referrer user data with necessary fields
    const referrer = await User.findById(referral.referrerId)
      .select('name email balance status kycStatus emailVerified phoneVerified createdAt totalDeposits')
      .session(session);
    
    if (!referrer) {
      return { processed: false, status: 'Pending', reason: 'Referrer not found' };
    }

    // Calculate total bonus amount
    const totalBonusAmount = (referral.bonusAmount || 0) + (referral.profitBonus || 0);

    // Check eligibility for auto approval
    const eligibilityCheck = await BusinessRules.isUserEligibleForAutoBonusApproval(
      referrer,
      totalBonusAmount
    );

    if (!eligibilityCheck.eligible) {
      // Log why auto approval was not eligible
      console.log(`Auto approval not eligible for referral ${referral._id}:`, eligibilityCheck.reasons);
      return { 
        processed: false, 
        status: 'Pending', 
        reason: eligibilityCheck.reasons.join('; ') 
      };
    }

    // Auto approve the bonus
    await autoApproveBonusTransaction(referral, session, totalBonusAmount);
    
    return { processed: true, status: 'Approved' };

  } catch (error) {
    console.error('Error in auto bonus processing:', error);
    return { 
      processed: false, 
      status: 'Pending', 
      reason: 'Auto processing failed - requires manual review' 
    };
  }
}

/**
 * Auto approve bonus and create transaction
 */
async function autoApproveBonusTransaction(
  referral: any,
  session: any,
  totalBonusAmount: number
): Promise<void> {
  // Update referral status to approved
  await Referral.findByIdAndUpdate(
    referral._id,
    {
      status: 'Paid', // Change from Pending to Paid
      paidAt: new Date(),
      updatedAt: new Date(),
      approvedBy: 'system', // Mark as system approved
      approvalMethod: 'automatic',
      metadata: {
        ...referral.metadata,
        autoApproved: true,
        autoApprovalTimestamp: new Date()
      }
    },
    { session }
  );

  // Create bonus transaction
  const transactionId = `AUTO-BONUS-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  
  const bonusTransaction = await Transaction.create([{
    userId: referral.referrerId,
    type: 'bonus',
    amount: totalBonusAmount,
    currency: 'BDT',
    gateway: 'System',
    status: 'Approved',
    description: `Auto-approved ${referral.bonusType} bonus - ${totalBonusAmount} BDT`,
    transactionId,
    fees: 0,
    netAmount: totalBonusAmount,
    metadata: {
      referralId: referral._id,
      bonusType: referral.bonusType,
      source: 'auto_approval',
      autoProcessed: true,
      processedAt: new Date()
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    processedAt: new Date()
  }], { session });

  // Update referrer balance
  await User.findByIdAndUpdate(
    referral.referrerId,
    { 
      $inc: { balance: totalBonusAmount },
      $set: { updatedAt: new Date() }
    },
    { session }
  );

  // Create audit log for auto approval
  const AuditLog = mongoose.model('AuditLog');
  await AuditLog.create([{
    userId: 'system',
    userType: 'system',
    action: 'bonus.auto_approve',
    resource: 'Referral',
    resourceId: referral._id,
    details: {
      referralId: referral._id,
      referrerId: referral.referrerId,
      bonusAmount: totalBonusAmount,
      bonusType: referral.bonusType,
      transactionId: bonusTransaction[0]._id,
      autoApprovalReason: 'User met all auto approval criteria'
    },
    status: 'Success',
    severity: 'Low',
    ipAddress: '127.0.0.1',
    userAgent: 'System',
    createdAt: new Date()
  }], { session });

  console.log(`✅ Auto-approved bonus: ${totalBonusAmount} BDT for referral ${referral._id}`);
}

/**
 * Create referral bonus with auto-processing attempt
 * This function should be called when creating new referral bonuses
 */
export async function createReferralBonusWithAutoProcess(
  bonusData: any,
  session?: any
): Promise<any> {
  const useSession = session || await mongoose.startSession();
  let shouldEndSession = !session;

  try {
    if (shouldEndSession) {
      await useSession.startTransaction();
    }

    // Create the referral record
    const referral = await Referral.create([bonusData], { session: useSession });
    
    // Try to auto-process if settings allow
    const autoProcessResult = await processBonusWithAutoApproval(referral[0], useSession);
    
    if (autoProcessResult.processed) {
      console.log(`✅ Auto-approved bonus for referral ${referral[0]._id}`);
    } else {
      console.log(`⏳ Bonus requires manual approval: ${autoProcessResult.reason}`);
    }

    if (shouldEndSession) {
      await useSession.commitTransaction();
    }
    
    return referral[0];

  } catch (error) {
    if (shouldEndSession) {
      await useSession.abortTransaction();
    }
    throw error;
  } finally {
    if (shouldEndSession) {
      await useSession.endSession();
    }
  }
}
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

    // FIXED: Comprehensive bonus overview statistics
    const overviewPipeline: mongoose.PipelineStage[] = [
      {
        $group: {
          _id: null,
          // Total counts
          totalReferrals: { $sum: 1 },
          activeReferrals: {
            $sum: { $cond: [{ $eq: ['$status', 'Paid'] }, 1, 0] }
          },
          
          // Total amounts (including profit bonuses)
          totalBonusPaid: {
            $sum: { 
              $cond: [
                { $eq: ['$status', 'Paid'] }, 
                { $add: ['$bonusAmount', { $ifNull: ['$profitBonus', 0] }] },
                0
              ] 
            }
          },
          pendingBonuses: {
            $sum: { 
              $cond: [
                { $eq: ['$status', 'Pending'] }, 
                { $add: ['$bonusAmount', { $ifNull: ['$profitBonus', 0] }] },
                0
              ] 
            }
          },
          
          // Count breakdowns
          totalBonusCount: { $sum: 1 },
          paidBonusCount: {
            $sum: { $cond: [{ $eq: ['$status', 'Paid'] }, 1, 0] }
          },
          pendingBonusCount: {
            $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] }
          },
          
          // Base amounts only (excluding profit bonuses)
          baseBonusPaid: {
            $sum: { $cond: [{ $eq: ['$status', 'Paid'] }, '$bonusAmount', 0] }
          },
          baseBonusPending: {
            $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, '$bonusAmount', 0] }
          },
          
          // Profit bonuses
          profitBonusPaid: {
            $sum: { 
              $cond: [
                { $eq: ['$status', 'Paid'] }, 
                { $ifNull: ['$profitBonus', 0] },
                0
              ] 
            }
          },
          profitBonusPending: {
            $sum: { 
              $cond: [
                { $eq: ['$status', 'Pending'] }, 
                { $ifNull: ['$profitBonus', 0] },
                0
              ] 
            }
          }
        }
      },
      {
        $addFields: {
          averageBonusPerReferral: {
            $cond: [
              { $gt: ['$activeReferrals', 0] },
              { $divide: ['$totalBonusPaid', '$activeReferrals'] },
              0
            ]
          },
          conversionRate: {
            $cond: [
              { $gt: ['$totalReferrals', 0] },
              { $multiply: [{ $divide: ['$activeReferrals', '$totalReferrals'] }, 100] },
              0
            ]
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
          totalEarnings: { $sum: { $add: ['$bonusAmount', { $ifNull: ['$profitBonus', 0] }] } },
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
        $addFields: {
          conversionRate: {
            $cond: [
              { $gt: ['$totalReferrals', 0] },
              { $multiply: [{ $divide: ['$signupBonuses', '$totalReferrals'] }, 100] },
              0
            ]
          }
        }
      },
      {
        $project: {
          userId: '$_id',
          userName: '$user.name',
          userEmail: '$user.email',
          referralCode: '$user.referralCode',
          totalReferrals: 1,
          totalEarnings: 1,
          signupBonuses: 1,
          profitShares: 1,
          conversionRate: 1
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

    // FIXED: Return properly structured overview data matching ReferralOverview interface
    const overview = {
      totalReferrals: overviewResult?.totalReferrals || 0,
      activeReferrals: overviewResult?.activeReferrals || 0,
      totalBonusPaid: overviewResult?.totalBonusPaid || 0,
      pendingBonuses: overviewResult?.pendingBonuses || 0,
      averageBonusPerReferral: overviewResult?.averageBonusPerReferral || 0,
      conversionRate: overviewResult?.conversionRate || 0,
      topReferrers: topReferrers
    };

    return apiHandler.success({
      overview,
      pendingBonuses,
      topReferrers,
      // Additional detailed stats for admin dashboard
      detailedStats: {
        totalBonusCount: overviewResult?.totalBonusCount || 0,
        paidBonusCount: overviewResult?.paidBonusCount || 0,
        pendingBonusCount: overviewResult?.pendingBonusCount || 0,
        baseBonusPaid: overviewResult?.baseBonusPaid || 0,
        baseBonusPending: overviewResult?.baseBonusPending || 0,
        profitBonusPaid: overviewResult?.profitBonusPaid || 0,
        profitBonusPending: overviewResult?.profitBonusPending || 0
      }
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

    const session = await mongoose.startSession();
    
    // Declare variables outside the transaction scope
    let processedReferrals: { id: any; status: string; amount: any }[] = [];
    
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

        // Reset arrays for this transaction
        processedReferrals = [];
        const failedReferrals: { id: any; error: string }[] = [];

        for (const referral of referrals) {
          try {
            if (action === 'approve') {
              // Calculate final bonus amount (base + profit bonus)
              const baseAmount = adjustedAmount !== undefined ? adjustedAmount : referral.bonusAmount;
              const finalAmount = baseAmount + (referral.profitBonus || 0);

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
                  bonusType: referral.bonusType,
                  baseAmount: baseAmount,
                  profitBonus: referral.profitBonus || 0
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
              if (adminNotes) referral.adminNotes = adminNotes;
              
              await referral.save({ session });

              processedReferrals.push({
                id: referral._id,
                status: 'Paid',
                amount: finalAmount
              });

            } else if (action === 'reject') {
              // Update referral status to rejected
              referral.status = 'Cancelled';
              referral.rejectedAt = new Date();
              referral.rejectionReason = reason;
              if (adminNotes) referral.adminNotes = adminNotes;
              
              await referral.save({ session });

              processedReferrals.push({
                id: referral._id,
                status: 'Cancelled',
                amount: 0
              });
            }

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
          processedReferrals.reduce((sum, r) => sum + r.amount, 0) : 0
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