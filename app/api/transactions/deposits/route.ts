import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Transaction } from '@/models/Transaction';
import { User } from '@/models/User';
import { Plan } from '@/models/Plan';
import { Setting } from '@/models/Setting';
import { AuditLog } from '@/models/AuditLog';
import { authMiddleware } from '@/middleware/auth';
import { apiRateLimit } from '@/middleware/rate-limit';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import { z } from 'zod';
import mongoose from 'mongoose';
import { depositRequestSchema } from '@/lib/validation';

async function getSettings(keys: string[]): Promise<Record<string, any>> {
  try {
    const settings = await Setting.find({ key: { $in: keys } }).lean();
    const result: Record<string, any> = {};
    
    settings.forEach(setting => {
      result[setting.key] = setting.value;
    });
    
    return result;
  } catch (error) {
    console.error('Failed to get settings:', error);
    return {};
  }
}

// GET /api/transactions/deposits - List deposit transactions (unchanged)
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

    // ✅ UPDATED: Add settings-based fee calculation in aggregation
    const settings = await getSettings(['coingate_fee_percentage', 'uddoktapay_fee_percentage']);
    const coingateFee = settings.coingate_fee_percentage || 0.025;
    const uddoktaPayFee = settings.uddoktapay_fee_percentage || 0.035;

    // Build aggregation pipeline
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
          // ✅ UPDATED: Use dynamic fee rates
          gatewayFee: {
            $switch: {
              branches: [
                { case: { $eq: ['$gateway', 'CoinGate'] }, then: { $multiply: ['$amount', coingateFee] } },
                { case: { $eq: ['$gateway', 'UddoktaPay'] }, then: { $multiply: ['$amount', uddoktaPayFee] } },
                { case: { $eq: ['$gateway', 'Manual'] }, then: 0 }
              ],
              default: 0
            }
          }
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
    const settings = await getSettings([
      'min_deposit',
      'max_deposit',
      'max_daily_deposit',
      'auto_deposit_approval',
      'coingate_fee_percentage',
      'uddoktapay_fee_percentage',
      'manual_deposit_fee',
      'require_kyc_for_deposit',
      'usd_to_bdt_rate'
    ]);

    // Extract settings with fallbacks
    const minDeposit = settings.min_deposit || 10;
    const maxDeposit = settings.max_deposit || 1000000;
    const maxDailyDeposit = settings.max_daily_deposit || 100000;
    const autoApproval = settings.auto_deposit_approval || false;
    const coingateFeeRate = settings.coingate_fee_percentage || 0.025;
    const uddoktaPayFeeRate = settings.uddoktapay_fee_percentage || 0.035;
    const manualDepositFee = settings.manual_deposit_fee || 0;
    const requireKycForDeposit = settings.require_kyc_for_deposit !== false; // default true
    const usdToBdtRate = settings.usd_to_bdt_rate || 110;

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

    // Convert amount to BDT if needed
    let finalAmount = amount;
    if (currency === 'USD') {
      finalAmount = amount * usdToBdtRate;
    }

    if (finalAmount < minDeposit) {
      return apiHandler.badRequest(`Minimum deposit amount is ${minDeposit} BDT (${currency} ${currency === 'USD' ? amount : finalAmount})`);
    }

    if (finalAmount > maxDeposit) {
      return apiHandler.badRequest(`Maximum deposit amount is ${maxDeposit} BDT (${currency} ${currency === 'USD' ? amount : finalAmount})`);
    }

    // Verify user exists and get user with plan information
    const user = await User.findById(userId).populate('planId');
    if (!user) {
      return apiHandler.notFound('User not found');
    }

    if (requireKycForDeposit && gateway !== 'Manual') {
      if (user.status !== 'Active') {
        return apiHandler.badRequest('User account is not active');
      }
      
      if (user.kycStatus !== 'Approved') {
        return apiHandler.badRequest('User KYC must be approved for deposits');
      }
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const todayDeposits = await Transaction.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          type: 'deposit',
          status: { $in: ['Pending', 'Approved', 'Processing'] },
          createdAt: { $gte: startOfDay, $lte: endOfDay }
        }
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    const todayTotal = todayDeposits[0]?.totalAmount || 0;
    if ((todayTotal + finalAmount) > maxDailyDeposit) {
      return apiHandler.badRequest(`Daily deposit limit exceeded. Current: ${todayTotal} BDT, Limit: ${maxDailyDeposit} BDT`);
    }

    let fees = 0;
    switch (gateway) {
      case 'CoinGate':
        fees = finalAmount * coingateFeeRate;
        break;
      case 'UddoktaPay':
        fees = finalAmount * uddoktaPayFeeRate;
        break;
      case 'Manual':
        fees = manualDepositFee;
        break;
    }

    const netAmount = finalAmount - fees;

    // Generate transaction ID
    const transactionId = `DEP-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // ✅ UPDATED: Determine initial status based on settings
    let initialStatus: string;
    let gatewayResponse: any = null;

    switch (gateway) {
      case 'Manual':
        initialStatus = autoApproval ? 'Approved' : 'Pending'; // ✅ Settings-based approval
        break;
      case 'CoinGate':
      case 'UddoktaPay':
        initialStatus = 'Processing'; // Gateway processing
        // Here you would integrate with actual payment gateway APIs
        gatewayResponse = {
          gateway,
          orderId: gatewayData?.orderId || `${gateway}-${Date.now()}`,
          paymentUrl: `https://${gateway.toLowerCase()}.com/pay/${transactionId}`,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
        };
        break;
      default:
        initialStatus = autoApproval ? 'Approved' : 'Pending'; // ✅ Settings-based approval
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
        // ✅ UPDATED: Store settings used for audit
        settingsUsed: {
          minDeposit,
          maxDeposit,
          maxDailyDeposit,
          autoApproval,
          feeRates: {
            coingate: coingateFeeRate,
            uddoktaPay: uddoktaPayFeeRate,
            manual: manualDepositFee
          },
          exchangeRate: usdToBdtRate,
          requireKyc: requireKycForDeposit
        }
      }
    });

    // ✅ UPDATED: Auto-approve and update balance if settings allow
    if (initialStatus === 'Approved') {
      await User.findByIdAndUpdate(userId, {
        $inc: { 
          balance: netAmount,
          totalDeposited: finalAmount
        }
      });
      
      console.log(`✅ Auto-approved deposit: User ${userId} credited ${netAmount} BDT`);
    }

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
        autoApproved: initialStatus === 'Approved',
        settingsUsed: {
          minDeposit,
          maxDeposit,
          autoApproval
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
        maxDeposit,
        maxDailyDeposit,
        exchangeRate: currency === 'USD' ? usdToBdtRate : 1,
        autoApproval,
        feeRate: fees / finalAmount
      },
      message: initialStatus === 'Approved' 
        ? `Deposit automatically approved and ${netAmount} BDT credited to balance`
        : `Deposit request created successfully via ${gateway}`
    });

  } catch (error) {
    console.error('Create deposit error:', error);
    return apiHandler.handleError(error);
  }
}

// Export handlers with error wrapper
export const GET = withErrorHandler(getDepositsHandler);
export const POST = withErrorHandler(createDepositHandler);