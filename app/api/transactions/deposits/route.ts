import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Transaction } from '@/models/Transaction';
import { User } from '@/models/User';
import { Plan } from '@/models/Plan';
import { AuditLog } from '@/models/AuditLog';
import { authMiddleware } from '@/middleware/auth';
import { apiRateLimit } from '@/middleware/rate-limit';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import { z } from 'zod';
import mongoose from 'mongoose';
import { depositRequestSchema } from '@/lib/validation';
import { BusinessRules, getSetting } from '@/lib/settings-helper';

// GET /api/transactions/deposits - List deposit transactions
async function getDepositsHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Apply middleware
  const authResult = await authMiddleware(request, {
    requireAuth: true,
    allowedUserTypes: ['admin'],
    requiredPermission: 'transactions.view'
  });
  if (authResult) return authResult;

  const rateLimitResult = await apiRateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    await connectToDatabase();

    const { page, limit, sortBy, sortOrder } = apiHandler.getPaginationParams();
    const filters = apiHandler.getFilterParams();

    // Build match stage for deposits only
    const matchStage: any = { type: 'deposit' };

    // Apply additional filters
    if (filters.status) matchStage.status = filters.status;
    if (filters.gateway) matchStage.gateway = filters.gateway;
    if (filters.currency) matchStage.currency = filters.currency;
    if (filters.userId) matchStage.userId = new mongoose.Types.ObjectId(filters.userId);

    // Date range filter
    if (filters.dateFrom || filters.dateTo) {
      matchStage.createdAt = {};
      if (filters.dateFrom) matchStage.createdAt.$gte = new Date(filters.dateFrom);
      if (filters.dateTo) matchStage.createdAt.$lte = new Date(filters.dateTo);
    }

    // Amount range filter
    if (filters.amountMin || filters.amountMax) {
      matchStage.amount = {};
      if (filters.amountMin) matchStage.amount.$gte = parseFloat(filters.amountMin);
      if (filters.amountMax) matchStage.amount.$lte = parseFloat(filters.amountMax);
    }

    // Build aggregation pipeline (removed hardcoded fees since we don't have those settings)
    const pipeline: mongoose.PipelineStage[] = [
      { $match: matchStage },
      
      // Lookup user information
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
          pipeline: [
            { $project: { name: 1, email: 1, phone: 1, kycStatus: 1, planId: 1 } }
          ]
        }
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      
      // Lookup user's plan
      {
        $lookup: {
          from: 'plans',
          localField: 'user.planId',
          foreignField: '_id',
          as: 'userPlan',
          pipeline: [
            { $project: { name: 1, depositLimit: 1, minimumDeposit: 1 } }
          ]
        }
      },
      { $unwind: { path: '$userPlan', preserveNullAndEmptyArrays: true } },
      
      // Add computed fields
      {
        $addFields: {
          isOverLimit: {
            $gt: ['$amount', '$userPlan.depositLimit']
          },
          isBelowMinimum: {
            $lt: ['$amount', '$userPlan.minimumDeposit']
          },
          // Use existing fees from transaction record
          gatewayFee: '$fees'
        }
      },
      
      // Sort
      { $sort: { [sortBy]: sortOrder === 'asc' ? 1 : -1 } },
      
      // Pagination
      { $skip: (page - 1) * limit },
      { $limit: limit }
    ];

    // Execute aggregation
    const [deposits, totalDocs] = await Promise.all([
      Transaction.aggregate(pipeline),
      Transaction.countDocuments(matchStage)
    ]);

    return apiHandler.success({
      data: deposits,
      pagination: {
        page,
        limit,
        total: totalDocs,
        pages: Math.ceil(totalDocs / limit)
      }
    });

  } catch (error) {
    console.error('Get deposits error:', error);
    return apiHandler.handleError(error);
  }
}

async function createDepositHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);
  const authResult = await authMiddleware(request, {
    requireAuth: true,
    allowedUserTypes: ['admin', 'user']
  });
  if (authResult) return authResult;

  const rateLimitResult = await apiRateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    await connectToDatabase();

    // Get configuration from existing settings-helper
    const [financialConfig, businessConfig] = await Promise.all([
      BusinessRules.getFinancialConfig(),
      BusinessRules.getBusinessConfig()
    ]);

    // Extract settings with fallbacks to existing defaults
    const minDeposit = financialConfig.minDeposit; // Uses existing 'min_deposit' setting
    const usdToBdtRate = financialConfig.usdToBdtRate; // Uses existing 'usd_to_bdt_rate' setting
    const autoKycApproval = businessConfig.autoKycApproval; // Uses existing 'auto_kyc_approval' setting

    const currentUserId = request.headers.get('x-user-id');
    const userType = request.headers.get('x-user-type');
    const body = await request.json();
    const validationResult = depositRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return apiHandler.validationError(
        validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      );
    }

    const { userId, amount, currency, gateway, gatewayData } = validationResult.data;

    if (userType === 'user' && userId !== currentUserId) {
      return apiHandler.forbidden('Users can only create deposits for themselves');
    }

    // Convert amount to BDT if needed using settings
let finalAmount = amount;
if (currency === 'USD') {
  finalAmount = await BusinessRules.convertCurrency(amount, 'USD', 'BDT');  // ✅ DYNAMIC
}

    // Use settings-based minimum deposit validation
    const depositValidation = await BusinessRules.validateDeposit(finalAmount);
    if (!depositValidation.valid) {
      return apiHandler.badRequest(depositValidation.error!);
    }

    // Verify user exists and get user with plan information
    const user = await User.findById(userId).populate('planId');
    if (!user) {
      return apiHandler.notFound('User not found');
    }

    // Check KYC requirements - use auto KYC setting logic
    if (gateway !== 'Manual') {
      if (user.status !== 'Active') {
        return apiHandler.badRequest('User account is not active');
      }
      
      // If auto KYC approval is disabled, require manual KYC approval
      if (!autoKycApproval && user.kycStatus !== 'Approved') {
        return apiHandler.badRequest('User KYC must be approved for deposits');
      }
    }

    // Check plan limits
    if (user.planId && finalAmount > user.planId.depositLimit) {
      return apiHandler.badRequest(`Amount exceeds plan deposit limit of ${user.planId.depositLimit} BDT`);
    }

    if (user.planId && finalAmount < user.planId.minimumDeposit) {
      return apiHandler.badRequest(`Amount below plan minimum deposit of ${user.planId.minimumDeposit} BDT`);
    }

    // Calculate fees (simplified - no settings for gateway fees yet)
    let fees = 0;
    switch (gateway) {
      case 'CoinGate':
        fees = finalAmount * 0.025; // 2.5% default
        break;
      case 'UddoktaPay':
        fees = finalAmount * 0.035; // 3.5% default
        break;
      case 'Manual':
        fees = 0; // No fees for manual deposits
        break;
    }

    const netAmount = finalAmount - fees;

    // Generate transaction ID
    const transactionId = `DEP-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Determine initial status (simplified - no auto approval setting yet)
    let initialStatus: string;
    let gatewayResponse: any = null;

    switch (gateway) {
      case 'Manual':
        initialStatus = 'Pending'; // Manual deposits always require approval
        break;
      case 'CoinGate':
      case 'UddoktaPay':
        initialStatus = 'Processing'; // Gateway processing
        gatewayResponse = {
          gateway,
          orderId: gatewayData?.orderId || `${gateway}-${Date.now()}`,
          paymentUrl: `https://${gateway.toLowerCase()}.com/pay/${transactionId}`,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
        };
        break;
      default:
        initialStatus = 'Pending';
    }

    // Create transaction
    const transaction = await Transaction.create({
      userId: new mongoose.Types.ObjectId(userId),
      type: 'deposit',
      amount: finalAmount, // Store in BDT
      originalAmount: amount, // Store original amount
      originalCurrency: currency, // Store original currency
      currency: 'BDT', // Always store as BDT
      exchangeRate: currency === 'USD' ? usdToBdtRate : 1,
      gateway,
      status: initialStatus,
      transactionId,
      gatewayTransactionId: gatewayResponse?.orderId,
      gatewayResponse,
      fees,
      netAmount,
      description: `Deposit via ${gateway}`,
      metadata: {
        ...gatewayData,
        ipAddress: apiHandler.getClientIP(),
        userAgent: request.headers.get('user-agent'),
        // Store settings used for audit
        settingsUsed: {
          minDeposit,
          exchangeRate: usdToBdtRate,
          autoKycApproval,
          gateway
        }
      }
    });

    // Log audit trail
    await AuditLog.create({
      userId: currentUserId,
      userType,
      action: 'deposit.create',
      resource: 'Transaction',
      resourceId: transaction._id,
      details: {
        amount: finalAmount,
        originalAmount: amount,
        currency,
        gateway,
        targetUserId: userId,
        transactionId,
        settingsUsed: {
          minDeposit,
          usdToBdtRate,
          autoKycApproval
        }
      },
      ipAddress: apiHandler.getClientIP(),
      userAgent: request.headers.get('user-agent'),
      status: 'Success'
    });

    // Populate transaction with user data
    const populatedTransaction = await Transaction.findById(transaction._id)
      .populate('userId', 'name email phone kycStatus');

    return apiHandler.created({
      transaction: populatedTransaction,
      paymentUrl: gatewayResponse?.paymentUrl,
      settings: {
        minDeposit,
        exchangeRate: currency === 'USD' ? usdToBdtRate : 1,
        autoKycApproval,
        feeRate: fees / finalAmount
      },
      message: `Deposit request created successfully via ${gateway}`
    });

  } catch (error) {
    console.error('Create deposit error:', error);
    return apiHandler.handleError(error);
  }
}

// Export handlers with error wrapper
export const GET = withErrorHandler(getDepositsHandler);
export const POST = withErrorHandler(createDepositHandler);