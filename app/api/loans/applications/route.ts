import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Loan, ILoan } from '@/models/Loan';
import { User, IUser } from '@/models/User';
import { authMiddleware } from '@/middleware/auth';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';

// GET /api/loans/applications - Get pending loan applications
async function getLoanApplicationsHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Apply middleware
  const authResult = await authMiddleware(request, {
    requireAuth: true,
    allowedUserTypes: ['admin'],
    requiredPermission: 'loans.view'
  });
  if (authResult) return authResult;

  try {
    await connectToDatabase();

    const { page, limit, sortBy, sortOrder } = apiHandler.getPaginationParams();

    // Get pending applications with user details
    const pipeline = [
      { $match: { status: 'Pending' } },
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
      { $unwind: { path: '$user' } },
      { $sort: { [sortBy]: sortOrder === 'asc' ? 1 : -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit }
    ] as import('mongoose').PipelineStage[];

    const applications = await Loan.aggregate(pipeline);
    const total = await Loan.countDocuments({ status: 'Pending' });

    const response = {
      data: applications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    };

    return apiHandler.success(response);

  } catch (error) {
    console.error('Get loan applications error:', error);
    return apiHandler.internalError('Failed to fetch loan applications');
  }
}

export const GET = withErrorHandler(getLoanApplicationsHandler);
