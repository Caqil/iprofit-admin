import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { Loan } from '@/models/Loan';
import { Transaction } from '@/models/Transaction';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import { getUserFromRequest } from '@/lib/auth-helper';
import mongoose from 'mongoose';

async function getUserLoanDetailsHandler(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const apiHandler = new ApiHandler(request);

  try {
    // Connect to database
    await connectToDatabase();

    // Get authenticated user
    const authResult = await getUserFromRequest(request);
    if (!authResult) {
      return apiHandler.unauthorized('Authentication required');
    }

    const userId = new mongoose.Types.ObjectId(authResult.userId);
    const loanId = params.id;

    // Validate loan ID
    if (!mongoose.Types.ObjectId.isValid(loanId)) {
      return apiHandler.badRequest('Invalid loan ID');
    }

    // Get loan with detailed information
    const loan = await Loan.findOne({
      _id: new mongoose.Types.ObjectId(loanId),
      userId: userId
    });

    if (!loan) {
      return apiHandler.notFound('Loan not found');
    }

    // Get related transactions
    const transactions = await Transaction.find({
      userId: userId,
      'metadata.loanId': loanId,
      type: { $in: ['loan_disbursement', 'loan_payment'] }
    }).sort({ createdAt: -1 }).limit(20);

    // Calculate loan analytics
    const analytics = {
      totalPaid: loan.totalPaid,
      remainingAmount: loan.remainingAmount,
      progressPercentage: Math.round((loan.totalPaid / loan.amount) * 100),
      
      // Payment statistics
      paidInstallments: loan.repaymentSchedule.filter(r => r.status === 'Paid').length,
      pendingInstallments: loan.repaymentSchedule.filter(r => r.status === 'Pending').length,
      overdueInstallments: loan.repaymentSchedule.filter(r => 
        r.status === 'Pending' && r.dueDate < new Date()
      ).length,
      
      // Next payment info
      nextPayment: loan.repaymentSchedule.find(r => r.status === 'Pending'),
      
      // Time calculations
      daysElapsed: Math.floor((Date.now() - loan.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
      daysRemaining: loan.status === 'Active' ? 
        Math.floor((loan.repaymentSchedule[loan.repaymentSchedule.length - 1].dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0,
      
      // Financial metrics
      totalInterest: (loan.emiAmount * loan.tenure) - loan.amount,
      averageMonthlyPayment: loan.emiAmount,
      effectiveInterestRate: loan.interestRate
    };

    // Format repayment schedule with enhanced info
    const formattedSchedule = loan.repaymentSchedule.map((payment, index) => ({
      installmentNumber: payment.installmentNumber,
      dueDate: payment.dueDate,
      amount: payment.amount,
      principal: payment.principal,
      interest: payment.interest,
      status: payment.status,
      paidAt: payment.paidAt,
      paidAmount: payment.paidAmount,
      daysOverdue: payment.status === 'Pending' && payment.dueDate < new Date() ? 
        Math.floor((Date.now() - payment.dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0,
      isUpcoming: payment.status === 'Pending' && payment.dueDate > new Date(),
      isCurrent: payment.status === 'Pending' && 
        payment.dueDate <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) && // Within 7 days
        payment.dueDate >= new Date()
    }));

    // Format transaction history
    const formattedTransactions = transactions.map(tx => ({
      id: tx._id,
      type: tx.type,
      amount: tx.amount,
      status: tx.status,
      description: tx.description,
      createdAt: tx.createdAt,
      transactionId: tx.transactionId,
      metadata: tx.metadata
    }));

    const response = {
      loan: {
        id: loan._id,
        amount: loan.amount,
        currency: loan.currency,
        interestRate: loan.interestRate,
        tenure: loan.tenure,
        emiAmount: loan.emiAmount,
        status: loan.status,
        purpose: loan.purpose,
        creditScore: loan.creditScore,
        monthlyIncome: loan.monthlyIncome,
        employmentStatus: loan.employmentStatus,
        collateral: loan.collateral,
        documents: loan.documents,
        
        // Amounts
        totalPaid: loan.totalPaid,
        remainingAmount: loan.remainingAmount,
        overdueAmount: loan.overdueAmount,
        penaltyAmount: loan.penaltyAmount,
        
        // Dates
        appliedAt: loan.createdAt,
        approvedAt: loan.approvedAt,
        disbursedAt: loan.disbursedAt,
        completedAt: loan.completedAt,
        
        // Additional info
        approvedBy: loan.approvedBy,
        rejectionReason: loan.rejectionReason,
        metadata: loan.metadata
      },
      
      analytics,
      repaymentSchedule: formattedSchedule,
      transactions: formattedTransactions,
      
      // Quick actions available
      availableActions: {
        canMakePayment: loan.status === 'Active' && analytics.nextPayment,
        canViewDocuments: loan.documents.length > 0,
        canDownloadSchedule: true,
        canContactSupport: true,
        canRequestStatement: loan.status !== 'Pending'
      }
    };

    return apiHandler.success(response);

  } catch (error) {
    console.error('Error fetching loan details:', error);
    return apiHandler.internalError('Failed to fetch loan details');
  }
}

export const GET = withErrorHandler(getUserLoanDetailsHandler);
