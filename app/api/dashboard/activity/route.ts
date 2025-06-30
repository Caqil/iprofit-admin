// app/api/dashboard/activity/route.ts - CREATE THIS FILE
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { Transaction } from '@/models/Transaction';
import { User } from '@/models/User';
import { Loan } from '@/models/Loan';
import { SupportTicket } from '@/models/SupportTicket';
import { authMiddleware } from '@/middleware/auth';
import { apiRateLimit } from '@/middleware/rate-limit';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';

interface RecentActivity {
  id: string;
  user: string;
  action: string;
  amount?: number;
  time: string;
  status: "success" | "pending" | "failed";
  type: 'transaction' | 'user' | 'loan' | 'support';
}

async function getDashboardActivityHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Apply middleware
  const authResult = await authMiddleware(request, {
    requireAuth: true,
    allowedUserTypes: ['admin'],
    requiredPermission: 'dashboard.view'
  });
  if (authResult) return authResult;

  const rateLimitResult = await apiRateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    await connectToDatabase();

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);

    const activities: RecentActivity[] = [];

    // Get recent transactions
    const recentTransactions = await Transaction.find({})
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(Math.ceil(limit / 2))
      .lean();

    recentTransactions.forEach(transaction => {
      const user = transaction.userId as any;
      activities.push({
        id: transaction._id?.toString() || Math.random().toString(),
        user: user?.name || 'Unknown User',
        action: `${transaction.type || 'Transaction'} ${transaction.status || 'processed'}`,
        amount: transaction.amount || 0,
        time: transaction.createdAt?.toISOString() || new Date().toISOString(),
        status: transaction.status === 'completed' ? 'success' : 
                transaction.status === 'pending' ? 'pending' : 'failed',
        type: 'transaction'
      });
    });

    // Get recent user registrations
    const recentUsers = await User.find({})
      .sort({ createdAt: -1 })
      .limit(Math.ceil(limit / 4))
      .lean();

    recentUsers.forEach(user => {
      activities.push({
        id: user._id?.toString() || Math.random().toString(),
        user: user.name || 'Unknown User',
        action: 'New user registered',
        time: user.createdAt?.toISOString() || new Date().toISOString(),
        status: 'success',
        type: 'user'
      });
    });

    // Get recent loan applications
    try {
      const recentLoans = await Loan.find({})
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .limit(Math.ceil(limit / 4))
        .lean();

      recentLoans.forEach(loan => {
        const user = loan.userId as any;
        activities.push({
          id: loan._id?.toString() || Math.random().toString(),
          user: user?.name || 'Unknown User',
          action: `Loan application ${loan.status || 'submitted'}`,
          amount: loan.amount || 0,
          time: loan.createdAt?.toISOString() || new Date().toISOString(),
          status: loan.status === 'approved' ? 'success' : 
                  loan.status === 'pending' ? 'pending' : 'failed',
          type: 'loan'
        });
      });
    } catch (loanError) {
      console.warn('Loans collection not found or error:', loanError);
    }

    // Get recent support tickets
    try {
      const recentTickets = await SupportTicket.find({})
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .limit(Math.ceil(limit / 4))
        .lean();

      recentTickets.forEach(ticket => {
        const user = ticket.userId as any;
        activities.push({
          id: ticket._id?.toString() || Math.random().toString(),
          user: user?.name || 'Unknown User',
          action: `Support ticket ${ticket.status || 'created'}`,
          time: ticket.createdAt?.toISOString() || new Date().toISOString(),
          status: ticket.status === 'Resolved' ? 'success' : 
                  ticket.status === 'Open' ? 'pending' : 'failed',
          type: 'support'
        });
      });
    } catch (supportError) {
      console.warn('Support tickets collection not found or error:', supportError);
    }

    // Sort all activities by time and limit
    const sortedActivities = activities
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, limit);

    return apiHandler.success(sortedActivities);

  } catch (error) {
    console.error('Dashboard Activity API Error:', error);
    return apiHandler.handleError(error);
  }
}

export async function GET(request: NextRequest) {
  return withErrorHandler(getDashboardActivityHandler)(request);
}