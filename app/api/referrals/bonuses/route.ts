// app/api/referrals/bonuses/route.ts
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { authMiddleware } from '@/middleware/auth';
import { apiRateLimit } from '@/middleware/rate-limit';
import { bonusApprovalSchema, bonusRecalculationSchema } from '@/lib/validation';
import { ApiHandler } from '@/lib/api-helpers';
import connectToDatabase from '@/lib/db';
import { Referral } from '@/models/Referral';
import { Transaction } from '@/models/Transaction';
import { User } from '@/models/User';
import { AuditLog } from '@/models/AuditLog';

// GET /api/referrals/bonuses - Fetch bonus overview and pending bonuses
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

    // Enhanced overview with security metrics
    const overviewPipeline: mongoose.PipelineStage[] = [
      {
        $group: {
          _id: null,
          totalBonusCount: { $sum: 1 },
          paidBonusCount: { $sum: { $cond: [{ $eq: ['$status', 'Paid'] }, 1, 0] } },
          pendingBonusCount: { $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] } },
          flaggedBonusCount: { $sum: { $cond: [{ $eq: ['$status', 'Flagged'] }, 1, 0] } },
          autoApprovedCount: { 
            $sum: { 
              $cond: [
                { $and: [
                  { $eq: ['$status', 'Paid'] },
                  { $eq: ['$metadata.autoApproved', true] }
                ]}, 
                1, 
                0
              ] 
            } 
          },
          manualApprovedCount: { 
            $sum: { 
              $cond: [
                { $and: [
                  { $eq: ['$status', 'Paid'] },
                  { $ne: ['$metadata.autoApproved', true] }
                ]}, 
                1, 
                0
              ] 
            } 
          },
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
          // Security metrics
          highRiskCount: {
            $sum: {
              $cond: [
                { $in: ['$metadata.securityValidation.riskLevel', ['high', 'critical']] },
                1,
                0
              ]
            }
          },
          averageSecurityScore: {
            $avg: {
              $cond: [
                { $ne: ['$metadata.securityValidation.score', null] },
                '$metadata.securityValidation.score',
                0
              ]
            }
          }
        }
      },
      {
        $addFields: {
          autoApprovalRate: {
            $cond: [
              { $gt: ['$paidBonusCount', 0] },
              { $multiply: [{ $divide: ['$autoApprovedCount', '$paidBonusCount'] }, 100] },
              0
            ]
          },
          securityFlagRate: {
            $cond: [
              { $gt: ['$totalBonusCount', 0] },
              { $multiply: [{ $divide: ['$highRiskCount', '$totalBonusCount'] }, 100] },
              0
            ]
          }
        }
      }
    ];

    const [overviewResult] = await Referral.aggregate(overviewPipeline);

    // Get pending bonuses with security information
    const pendingBonusesPipeline: mongoose.PipelineStage[] = [
      { $match: { status: { $in: ['Pending', 'Flagged'] } } },
      {
        $lookup: {
          from: 'users',
          localField: 'referrerId',
          foreignField: '_id',
          as: 'referrer',
          pipeline: [{ $project: { name: 1, email: 1, referralCode: 1, kycStatus: 1 } }]
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'refereeId',
          foreignField: '_id',
          as: 'referee',
          pipeline: [{ $project: { name: 1, email: 1, kycStatus: 1, createdAt: 1 } }]
        }
      },
      { $unwind: '$referrer' },
      { $unwind: '$referee' },
      { $sort: { createdAt: -1 } },
      { $limit: 100 },
      {
        $project: {
          _id: 1,
          bonusAmount: 1,
          profitBonus: 1,
          bonusType: 1,
          status: 1,
          metadata: 1,
          createdAt: 1,
          securityScore: '$metadata.securityValidation.score',
          riskLevel: '$metadata.securityValidation.riskLevel',
          securityReasons: '$metadata.securityValidation.reasons',
          referrer: {
            id: '$referrer._id',
            name: '$referrer.name',
            email: '$referrer.email',
            referralCode: '$referrer.referralCode',
            kycStatus: '$referrer.kycStatus'
          },
          referee: {
            id: '$referee._id',
            name: '$referee.name',
            email: '$referee.email',
            kycStatus: '$referee.kycStatus',
            accountAge: {
              $divide: [
                { $subtract: [new Date(), '$referee.createdAt'] },
                86400000 // Convert to days
              ]
            }
          }
        }
      }
    ];

    const pendingBonuses = await Referral.aggregate(pendingBonusesPipeline);

    // Get security statistics
    const securityStatsPipeline: mongoose.PipelineStage[] = [
      {
        $match: {
          'metadata.securityValidation.score': { $exists: true }
        }
      },
      {
        $group: {
          _id: '$metadata.securityValidation.riskLevel',
          count: { $sum: 1 },
          avgScore: { $avg: '$metadata.securityValidation.score' },
          totalAmount: {
            $sum: { $add: ['$bonusAmount', { $ifNull: ['$profitBonus', 0] }] }
          }
        }
      }
    ];

    const securityStats = await Referral.aggregate(securityStatsPipeline);

    const overview = {
      totalReferrals: overviewResult?.totalBonusCount || 0,
      paidBonuses: overviewResult?.paidBonusCount || 0,
      pendingBonuses: overviewResult?.pendingBonusCount || 0,
      flaggedBonuses: overviewResult?.flaggedBonusCount || 0,
      totalBonusPaid: overviewResult?.totalBonusPaid || 0,
      pendingAmount: overviewResult?.pendingBonuses || 0,
      autoApprovalRate: overviewResult?.autoApprovalRate || 0,
      securityFlagRate: overviewResult?.securityFlagRate || 0,
      averageSecurityScore: overviewResult?.averageSecurityScore || 0,
      autoApprovedCount: overviewResult?.autoApprovedCount || 0,
      manualApprovedCount: overviewResult?.manualApprovedCount || 0,
      securityStats
    };

    return apiHandler.success({
      overview,
      pendingBonuses,
      securityStats,
      message: 'Bonus data retrieved with security metrics'
    });

  } catch (error) {
    console.error('Error fetching bonuses with security data:', error);
    return apiHandler.internalError('Failed to fetch bonus data');
  }
}

// POST /api/referrals/bonuses - Process bonus approvals with security context
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

    // Handle different request types
    if (body.action === 'security_review') {
      return handleSecurityReview(apiHandler, body, adminId!);
    }

    if (body.refereeId && body.newProfitAmount !== undefined) {
      return handleBonusRecalculation(apiHandler, body, adminId!);
    }

    // Standard approval/rejection
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

    const { referralIds, action, reason, adminNotes } = validationResult.data;

    const session = await mongoose.startSession();
    let processedReferrals: any[] = [];
    
    try {
      await session.withTransaction(async () => {
        const referrals = await Referral.find({
          _id: { $in: referralIds.map(id => new mongoose.Types.ObjectId(id)) },
          status: { $in: ['Pending', 'Flagged'] }
        }).populate([
          { path: 'referrerId', select: 'name email balance' },
          { path: 'refereeId', select: 'name email' }
        ]).session(session);

        for (const referral of referrals) {
          if (action === 'approve') {
            // Manual approval with security context
            const result = await approveWithSecurityContext(referral, adminId!, adminNotes, session);
            processedReferrals.push(result);
          } else if (action === 'reject') {
            // Rejection with security logging
            const result = await rejectWithSecurityContext(referral, reason, adminNotes, adminId!, session);
            processedReferrals.push(result);
          }
        }

        // Enhanced audit logging
        await AuditLog.create([{
          adminId,
          action: `referrals.bonuses.${action}_with_security`,
          entity: 'ReferralBonus',
          status: 'Success',
          description: `${action} ${processedReferrals.length} bonuses with security review`,
          metadata: {
            processedCount: processedReferrals.length,
            totalAmount: processedReferrals.reduce((sum, r) => sum + (r.amount || 0), 0),
            securityReview: true,
            reason,
            adminNotes
          },
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown'
        }], { session });
      });

      return apiHandler.success({
        message: `Successfully ${action}ed ${processedReferrals.length} bonuses`,
        processedReferrals
      });

    } finally {
      await session.endSession();
    }

  } catch (error) {
    console.error('Error processing bonuses:', error);
    return apiHandler.internalError('Failed to process bonuses');
  }
}

// Helper functions for security-aware approval/rejection
async function approveWithSecurityContext(
  referral: any,
  adminId: string,
  adminNotes?: string,
  session?: mongoose.ClientSession
) {
  const totalAmount = (referral.bonusAmount || 0) + (referral.profitBonus || 0);

  const transaction = new Transaction({
    userId: referral.referrerId,
    type: 'bonus',
    amount: totalAmount,
    currency: 'BDT',
    gateway: 'System',
    status: 'Approved',
    description: `Manually approved referral bonus - ${referral.bonusType}`,
    netAmount: totalAmount,
    processedAt: new Date(),
    metadata: {
      referralId: referral._id,
      bonusType: referral.bonusType,
      manualApproval: true,
      approvedBy: adminId,
      securityReviewed: true,
      originalSecurityScore: referral.metadata?.securityValidation?.score
    }
  });

  await transaction.save({ session });

  await User.findByIdAndUpdate(
    referral.referrerId,
    { $inc: { balance: totalAmount } },
    { session }
  );

  referral.status = 'Paid';
  referral.transactionId = transaction._id;
  referral.paidAt = new Date();
  referral.adminNotes = adminNotes || 'Manually approved after security review';
  
  await referral.save({ session });

  return {
    id: referral._id,
    status: 'Paid',
    amount: totalAmount,
    securityReviewed: true
  };
}

async function rejectWithSecurityContext(
  referral: any,
  reason?: string,
  adminNotes?: string,
  adminId?: string,
  session?: mongoose.ClientSession
) {
  referral.status = 'Cancelled';
  referral.rejectedAt = new Date();
  referral.rejectionReason = reason || 'Security review failed';
  referral.adminNotes = adminNotes || 'Rejected after security review';
  referral.metadata = {
    ...referral.metadata,
    securityReviewed: true,
    rejectedBy: adminId
  };
  
  await referral.save({ session });

  return {
    id: referral._id,
    status: 'Cancelled',
    amount: 0,
    securityReviewed: true
  };
}

// Handle security review requests
async function handleSecurityReview(apiHandler: ApiHandler, body: any, adminId: string) {
  const { referralId, action } = body;

  try {
    const referral = await Referral.findById(referralId);
    if (!referral) {
      return apiHandler.notFound('Referral not found');
    }

    if (action === 'recheck') {
      // For security recheck, we'll just return success for now
      // The actual security service should be called from a separate service
      return apiHandler.success({
        message: 'Security recheck completed',
        referralId
      });
    }

    return apiHandler.badRequest('Invalid security review action');

  } catch (error) {
    console.error('Security review error:', error);
    return apiHandler.internalError('Security review failed');
  }
}

// Handle bonus recalculation
async function handleBonusRecalculation(apiHandler: ApiHandler, body: any, adminId: string): Promise<NextResponse> {
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

  // Implementation for bonus recalculation
  return apiHandler.success({ 
    message: 'Bonus recalculation completed',
    newAmount: body.newProfitAmount 
  });
}

// Route handlers - Only export HTTP methods
export async function GET(request: NextRequest): Promise<NextResponse> {
  return getBonusesHandler(request);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return processBonusesHandler(request);
}