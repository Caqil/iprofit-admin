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
import { withdrawalRequestSchema } from '@/lib/validation';


// GET /api/transactions/withdrawals - List withdrawal transactions
async function getWithdrawalsHandler(request: NextRequest): Promise<NextResponse> {
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

    // Build match stage for withdrawals only
    const matchStage: any = { type: 'withdrawal' };

    // Apply additional filters
    if (filters.status) matchStage.status = filters.status;
    if (filters.currency) matchStage.currency = filters.currency;
    if (filters.userId) matchStage.userId = new mongoose.Types.ObjectId(filters.userId);
    if (filters.urgent === 'true') matchStage['metadata.urgentWithdrawal'] = true;

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
            { $project: { name: 1, email: 1, phone: 1, kycStatus: 1, planId: 1, balance: 1 } }
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
            { 
              $project: { 
                name: 1, 
                withdrawalLimit: 1, 
                minimumWithdrawal: 1,
                dailyWithdrawalLimit: 1,
                monthlyWithdrawalLimit: 1
              } 
            }
          ]
        }
      },
      { $unwind: { path: '$userPlan', preserveNullAndEmptyArrays: true } },
      
      // Add computed fields
      {
        $addFields: {
          isOverLimit: {
            $gt: ['$amount', '$userPlan.withdrawalLimit']
          },
          isBelowMinimum: {
            $lt: ['$amount', '$userPlan.minimumWithdrawal']
          },
          processingFee: {
            $switch: {
              branches: [
                { 
                  case: { $eq: ['$metadata.withdrawalMethod', 'bank_transfer'] }, 
                  then: { $max: [{ $multiply: ['$amount', 0.02] }, 5] } // 2% or minimum $5
                },
                { 
                  case: { $eq: ['$metadata.withdrawalMethod', 'mobile_banking'] }, 
                  then: { $multiply: ['$amount', 0.015] } // 1.5%
                },
                { 
                  case: { $eq: ['$metadata.withdrawalMethod', 'crypto_wallet'] }, 
                  then: { $multiply: ['$amount', 0.01] } // 1%
                },
                { 
                  case: { $eq: ['$metadata.withdrawalMethod', 'check'] }, 
                  then: 10 // Flat $10 fee
                }
              ],
              default: 0
            }
          },
          isUrgent: '$metadata.urgentWithdrawal',
          estimatedProcessingTime: {
            $switch: {
              branches: [
                { case: '$metadata.urgentWithdrawal', then: '1-2 hours' },
                { case: { $eq: ['$metadata.withdrawalMethod', 'mobile_banking'] }, then: '2-4 hours' },
                { case: { $eq: ['$metadata.withdrawalMethod', 'crypto_wallet'] }, then: '4-6 hours' },
                { case: { $eq: ['$metadata.withdrawalMethod', 'bank_transfer'] }, then: '1-3 business days' },
                { case: { $eq: ['$metadata.withdrawalMethod', 'check'] }, then: '5-7 business days' }
              ],
              default: '1-3 business days'
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
    const [withdrawals, totalDocs] = await Promise.all([
      Transaction.aggregate(pipeline),
      Transaction.countDocuments(matchStage)
    ]);

    return apiHandler.success({
      data: withdrawals,
      pagination: {
        page,
        limit,
        total: totalDocs,
        pages: Math.ceil(totalDocs / limit)
      }
    });

  } catch (error) {
    console.error('Get withdrawals error:', error);
    return apiHandler.handleError(error);
  }
}

// POST /api/transactions/withdrawals - Create a new withdrawal request
async function createWithdrawalHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Apply middleware - Allow both admin and user
  const authResult = await authMiddleware(request, {
    requireAuth: true,
    allowedUserTypes: ['admin', 'user']
  });
  if (authResult) return authResult;

  const rateLimitResult = await apiRateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    await connectToDatabase();

    const currentUserId = request.headers.get('x-user-id');
    const userType = request.headers.get('x-user-type');
    const body = await request.json();
    const validationResult = withdrawalRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return apiHandler.validationError(
        validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      );
    }

    const { userId, amount, currency, withdrawalMethod, accountDetails, reason, urgentWithdrawal } = validationResult.data;

    // Permission check: users can only create withdrawals for themselves
    if (userType === 'user' && userId !== currentUserId) {
      return apiHandler.forbidden('Users can only create withdrawals for themselves');
    }

    // Verify user exists and get user with plan information
    const user = await User.findById(userId).populate('planId');
    if (!user) {
      return apiHandler.notFound('User not found');
    }

    // Check if user is active and KYC approved
    if (user.status !== 'Active') {
      return apiHandler.badRequest('User account is not active');
    }
    
    if (user.kycStatus !== 'Approved') {
      return apiHandler.badRequest('User KYC must be approved for withdrawals');
    }

    // Check user balance
    if (user.balance < amount) {
      return apiHandler.badRequest(`Insufficient balance. Available: ${user.balance}, Requested: ${amount}`);
    }

    // Calculate processing fees
    let processingFee = 0;
    switch (withdrawalMethod) {
      case 'bank_transfer':
        processingFee = Math.max(amount * 0.02, 5); // 2% or minimum $5
        break;
      case 'mobile_banking':
        processingFee = amount * 0.015; // 1.5%
        break;
      case 'crypto_wallet':
        processingFee = amount * 0.01; // 1%
        break;
      case 'check':
        processingFee = 10; // Flat $10 fee
        break;
    }

    // Add urgent processing fee
    if (urgentWithdrawal) {
      processingFee += amount * 0.005; // Additional 0.5% for urgent processing
    }

    const netAmount = amount - processingFee;

    // Check plan limits
    const plan = user.planId as any;
    if (plan) {
      if (amount < plan.minimumWithdrawal) {
        return apiHandler.badRequest(`Minimum withdrawal amount is ${currency} ${plan.minimumWithdrawal}`);
      }
      
      if (amount > plan.withdrawalLimit) {
        return apiHandler.badRequest(`Maximum withdrawal amount is ${currency} ${plan.withdrawalLimit}`);
      }
    }

    // Check daily withdrawal limit
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const todayWithdrawals = await Transaction.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          type: 'withdrawal',
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

    const todayTotal = todayWithdrawals[0]?.totalAmount || 0;
    if (plan?.dailyWithdrawalLimit && (todayTotal + amount) > plan.dailyWithdrawalLimit) {
      return apiHandler.badRequest(`Daily withdrawal limit exceeded. Current: ${todayTotal}, Limit: ${plan.dailyWithdrawalLimit}`);
    }

    // Check monthly withdrawal limit
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlyWithdrawals = await Transaction.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          type: 'withdrawal',
          status: { $in: ['Pending', 'Approved', 'Processing'] },
          createdAt: { $gte: startOfMonth }
        }
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    const monthlyTotal = monthlyWithdrawals[0]?.totalAmount || 0;
    if (plan?.monthlyWithdrawalLimit && (monthlyTotal + amount) > plan.monthlyWithdrawalLimit) {
      return apiHandler.badRequest(`Monthly withdrawal limit exceeded. Current: ${monthlyTotal}, Limit: ${plan.monthlyWithdrawalLimit}`);
    }

    // Validate account details based on withdrawal method
    const validationErrors = validateAccountDetails(withdrawalMethod, accountDetails);
    if (validationErrors.length > 0) {
      return apiHandler.validationError(validationErrors);
    }

    // Generate transaction ID
    const transactionId = `WDL-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Start transaction to ensure atomicity
    const session = await mongoose.startSession();
    
    try {
      await session.withTransaction(async () => {
        // Create withdrawal transaction
        const transaction = await Transaction.create([{
          userId: new mongoose.Types.ObjectId(userId),
          type: 'withdrawal',
          amount,
          currency,
          gateway: 'Manual', // Withdrawals are manually processed
          status: 'Pending',
          transactionId,
          fees: processingFee,
          netAmount,
          description: `Withdrawal via ${withdrawalMethod}${urgentWithdrawal ? ' (Urgent)' : ''}`,
          metadata: {
            withdrawalMethod,
            accountDetails,
            reason,
            urgentWithdrawal,
            ipAddress: apiHandler.getClientIP(),
            userAgent: request.headers.get('user-agent'),
            planLimits: {
              minimum: plan?.minimumWithdrawal,
              maximum: plan?.withdrawalLimit,
              dailyLimit: plan?.dailyWithdrawalLimit,
              monthlyLimit: plan?.monthlyWithdrawalLimit
            }
          }
        }], { session });

        // Reserve the amount from user balance (deduct immediately)
        await User.findByIdAndUpdate(
          userId,
          { $inc: { balance: -amount } },
          { session }
        );

        // Log audit trail
        await AuditLog.create([{
          userId: currentUserId,
          userType,
          action: 'withdrawal.create',
          resource: 'Transaction',
          resourceId: transaction[0]._id,
          details: {
            amount,
            currency,
            withdrawalMethod,
            targetUserId: userId,
            transactionId,
            urgentWithdrawal,
            processingFee
          },
          ipAddress: apiHandler.getClientIP(),
          userAgent: request.headers.get('user-agent'),
          status: 'Success'
        }], { session });
      });

      // Populate transaction with user data
      const populatedTransaction = await Transaction.findOne({
        transactionId
      }).populate('userId', 'name email phone kycStatus');

      return apiHandler.created({
        transaction: populatedTransaction,
        message: `Withdrawal request created successfully${urgentWithdrawal ? ' with urgent processing' : ''}`
      });

    } finally {
      await session.endSession();
    }

  } catch (error) {
    console.error('Create withdrawal error:', error);
    return apiHandler.handleError(error);
  }
}

// Validate account details based on withdrawal method
function validateAccountDetails(method: string, details: any): Array<{field: string, message: string, code: string}> {
  const errors: Array<{field: string, message: string, code: string}> = [];

  switch (method) {
    case 'bank_transfer':
      if (!details.accountNumber) {
        errors.push({ field: 'accountDetails.accountNumber', message: 'Account number is required for bank transfer', code: 'required' });
      }
      if (!details.bankName) {
        errors.push({ field: 'accountDetails.bankName', message: 'Bank name is required for bank transfer', code: 'required' });
      }
      if (!details.accountHolderName) {
        errors.push({ field: 'accountDetails.accountHolderName', message: 'Account holder name is required for bank transfer', code: 'required' });
      }
      break;

    case 'mobile_banking':
      if (!details.mobileNumber) {
        errors.push({ field: 'accountDetails.mobileNumber', message: 'Mobile number is required for mobile banking', code: 'required' });
      }
      if (!details.mobileProvider) {
        errors.push({ field: 'accountDetails.mobileProvider', message: 'Mobile provider is required for mobile banking', code: 'required' });
      }
      break;

    case 'crypto_wallet':
      if (!details.walletAddress) {
        errors.push({ field: 'accountDetails.walletAddress', message: 'Wallet address is required for crypto withdrawal', code: 'required' });
      }
      if (!details.walletType) {
        errors.push({ field: 'accountDetails.walletType', message: 'Wallet type is required for crypto withdrawal', code: 'required' });
      }
      break;

    case 'check':
      if (!details.mailingAddress) {
        errors.push({ field: 'accountDetails.mailingAddress', message: 'Mailing address is required for check withdrawal', code: 'required' });
      }
      break;
  }

  return errors;
}

// Export handlers with error wrapper
export const GET = withErrorHandler(getWithdrawalsHandler);
export const POST = withErrorHandler(createWithdrawalHandler);