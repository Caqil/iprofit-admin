import { Loan, LoanStatus, RepaymentSchedule, EMICalculation } from '@/types';
import { calculateEMI } from './helpers';
import { LOAN_ELIGIBILITY_REQUIREMENTS } from './constants';

// Enhanced EMI calculation with detailed breakdown
export function calculateDetailedEMI(
  principal: number,
  annualRate: number,
  tenureMonths: number
): EMICalculation {
  const monthlyRate = annualRate / 100 / 12;
  const emiAmount = (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) / 
                    (Math.pow(1 + monthlyRate, tenureMonths) - 1);

  let balance = principal;
  const schedule: {
    month: number;
    emi: number;
    principal: number;
    interest: number;
    balance: number;
  }[] = [];

  for (let month = 1; month <= tenureMonths; month++) {
    const interest = balance * monthlyRate;
    const principalPayment = emiAmount - interest;
    balance = balance - principalPayment;

    schedule.push({
      month,
      emi: Math.round(emiAmount * 100) / 100,
      principal: Math.round(principalPayment * 100) / 100,
      interest: Math.round(interest * 100) / 100,
      balance: Math.max(0, Math.round(balance * 100) / 100)
    });
  }

  const totalAmount = emiAmount * tenureMonths;
  const totalInterest = totalAmount - principal;

  return {
    loanAmount: principal,
    interestRate: annualRate,
    tenure: tenureMonths,
    emiAmount: Math.round(emiAmount * 100) / 100,
    totalInterest: Math.round(totalInterest * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
    schedule
  };
}

// Calculate loan affordability
export function calculateAffordability(
  monthlyIncome: number,
  monthlyExpenses: number,
  existingEMIs: number,
  requestedEMI: number
): {
  isAffordable: boolean;
  debtToIncomeRatio: number;
  availableIncome: number;
  recommendedMaxEMI: number;
  affordabilityScore: number;
} {
  const availableIncome = monthlyIncome - monthlyExpenses - existingEMIs;
  const totalEMIs = existingEMIs + requestedEMI;
  const debtToIncomeRatio = (totalEMIs / monthlyIncome) * 100;
  
  // Conservative DTI threshold of 40%
  const maxDebtRatio = 40;
  const recommendedMaxEMI = (monthlyIncome * maxDebtRatio / 100) - existingEMIs;
  
  const isAffordable = debtToIncomeRatio <= maxDebtRatio && availableIncome >= requestedEMI;
  
  // Affordability score (0-100)
  let affordabilityScore = 100;
  if (debtToIncomeRatio > 30) affordabilityScore -= (debtToIncomeRatio - 30) * 2;
  if (availableIncome < requestedEMI * 2) affordabilityScore -= 20;
  if (existingEMIs > monthlyIncome * 0.2) affordabilityScore -= 15;
  
  affordabilityScore = Math.max(0, Math.min(100, affordabilityScore));

  return {
    isAffordable,
    debtToIncomeRatio: Math.round(debtToIncomeRatio * 100) / 100,
    availableIncome: Math.round(availableIncome * 100) / 100,
    recommendedMaxEMI: Math.round(recommendedMaxEMI * 100) / 100,
    affordabilityScore: Math.round(affordabilityScore)
  };
}

// Enhanced risk assessment
export function assessLoanRisk(loan: Partial<Loan>): {
  riskScore: number;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Very High';
  riskFactors: string[];
  recommendation: 'Approve' | 'Review' | 'Reject';
} {
  let riskScore = 0;
  const riskFactors: string[] = [];

  // Credit score assessment (30% weight)
  if (loan.creditScore) {
    if (loan.creditScore < 550) {
      riskScore += 30;
      riskFactors.push('Poor credit score');
    } else if (loan.creditScore < 650) {
      riskScore += 20;
      riskFactors.push('Below average credit score');
    } else if (loan.creditScore < 750) {
      riskScore += 10;
    }
  }

  // Income vs loan amount (25% weight)
  if (loan.monthlyIncome && loan.amount) {
    const incomeToLoanRatio = (loan.amount / (loan.monthlyIncome * 12)) * 100;
    if (incomeToLoanRatio > 50) {
      riskScore += 25;
      riskFactors.push('High loan to annual income ratio');
    } else if (incomeToLoanRatio > 30) {
      riskScore += 15;
      riskFactors.push('Moderate loan to income ratio');
    }
  }

  // Employment stability (20% weight)
  if (loan.employmentStatus) {
    if (loan.employmentStatus.toLowerCase().includes('unemployed')) {
      riskScore += 20;
      riskFactors.push('Unemployed status');
    } else if (loan.employmentStatus.toLowerCase().includes('temporary') || 
               loan.employmentStatus.toLowerCase().includes('contract')) {
      riskScore += 15;
      riskFactors.push('Temporary or contract employment');
    } else if (loan.employmentStatus.toLowerCase().includes('self-employed')) {
      riskScore += 10;
      riskFactors.push('Self-employed (variable income)');
    }
  }

  // Loan amount assessment (15% weight)
  if (loan.amount) {
    if (loan.amount > 4000) {
      riskScore += 15;
      riskFactors.push('High loan amount');
    } else if (loan.amount > 2500) {
      riskScore += 8;
    }
  }

  // Tenure assessment (10% weight)
  if (loan.tenure) {
    if (loan.tenure > 48) {
      riskScore += 10;
      riskFactors.push('Long repayment tenure');
    } else if (loan.tenure < 12) {
      riskScore += 5;
      riskFactors.push('Very short repayment tenure');
    }
  }

  // Determine risk level and recommendation
  let riskLevel: 'Low' | 'Medium' | 'High' | 'Very High';
  let recommendation: 'Approve' | 'Review' | 'Reject';

  if (riskScore <= 20) {
    riskLevel = 'Low';
    recommendation = 'Approve';
  } else if (riskScore <= 40) {
    riskLevel = 'Medium';
    recommendation = 'Review';
  } else if (riskScore <= 70) {
    riskLevel = 'High';
    recommendation = 'Review';
  } else {
    riskLevel = 'Very High';
    recommendation = 'Reject';
  }

  return {
    riskScore: Math.min(100, riskScore),
    riskLevel,
    riskFactors,
    recommendation
  };
}

// Calculate next payment date
export function getNextPaymentDate(repaymentSchedule: RepaymentSchedule[]): Date | null {
  const pendingPayments = repaymentSchedule
    .filter(payment => payment.status === 'Pending')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  return pendingPayments.length > 0 ? new Date(pendingPayments[0].dueDate) : null;
}

// Calculate overdue amount
export function calculateOverdueAmount(repaymentSchedule: RepaymentSchedule[]): number {
  const currentDate = new Date();
  return repaymentSchedule
    .filter(payment => payment.status === 'Pending' && new Date(payment.dueDate) < currentDate)
    .reduce((total, payment) => total + payment.amount, 0);
}

// Get loan status color for UI
export function getLoanStatusColor(status: LoanStatus): string {
  const statusColors = {
    'Pending': 'bg-yellow-100 text-yellow-800',
    'Approved': 'bg-green-100 text-green-800',
    'Rejected': 'bg-red-100 text-red-800',
    'Active': 'bg-blue-100 text-blue-800',
    'Completed': 'bg-gray-100 text-gray-800',
    'Defaulted': 'bg-red-100 text-red-800'
  };

  return statusColors[status] || 'bg-gray-100 text-gray-800';
}

// Format loan amount with currency
export function formatLoanAmount(amount: number, currency: string = 'USD'): string {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });

  return formatter.format(amount);
}

// Calculate loan progress percentage
export function calculateLoanProgress(loan: Loan): number {
  if (loan.status === 'Completed') return 100;
  if (loan.status === 'Pending' || loan.status === 'Approved' || loan.status === 'Rejected') return 0;

  const totalInstallments = loan.repaymentSchedule.length;
  const paidInstallments = loan.repaymentSchedule.filter(inst => inst.status === 'Paid').length;

  return totalInstallments > 0 ? (paidInstallments / totalInstallments) * 100 : 0;
}

// Generate payment reminders
export function generatePaymentReminders(repaymentSchedule: RepaymentSchedule[]): {
  overdue: RepaymentSchedule[];
  dueSoon: RepaymentSchedule[];
  upcoming: RepaymentSchedule[];
} {
  const currentDate = new Date();
  const weekFromNow = new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000);

  const overdue = repaymentSchedule.filter(payment => 
    payment.status === 'Pending' && new Date(payment.dueDate) < currentDate
  );

  const dueSoon = repaymentSchedule.filter(payment => 
    payment.status === 'Pending' && 
    new Date(payment.dueDate) >= currentDate && 
    new Date(payment.dueDate) <= weekFromNow
  );

  const upcoming = repaymentSchedule.filter(payment => 
    payment.status === 'Pending' && 
    new Date(payment.dueDate) > weekFromNow
  ).slice(0, 5); // Next 5 payments

  return { overdue, dueSoon, upcoming };
}

export function validateLoanEligibility(user: {
  // Current user data
  walletBalance: number;
  totalDeposits: number;
  referralCount: number;
  activeReferralsWithDeposits: number; // NEW: count referrals who made deposits
  kycStatus: string;
  accountCreatedAt: Date;
  
  // Financial data
  monthlyIncome: number;
  creditScore: number;
  existingLoans: number;
}, requestedAmount: number): {
  isEligible: boolean;
  reasons: string[];
  progress: {
    completed: number;
    total: number;
    details: Array<{requirement: string; status: boolean; current?: any; needed?: any}>;
  };
} {
  const requirements = LOAN_ELIGIBILITY_REQUIREMENTS;
  const reasons: string[] = [];
  const progressDetails: any[] = [];
  
  // 1. Wallet Balance Check
  const hasMinBalance = user.walletBalance >= requirements.MIN_WALLET_BALANCE;
  progressDetails.push({
    requirement: `Maintain $${requirements.MIN_WALLET_BALANCE}+ in wallet`,
    status: hasMinBalance,
    current: user.walletBalance,
    needed: requirements.MIN_WALLET_BALANCE
  });
  if (!hasMinBalance) {
    reasons.push(`Wallet balance must be at least $${requirements.MIN_WALLET_BALANCE} (current: $${user.walletBalance})`);
  }
  
  // 2. Referral Check
  const hasMinReferrals = user.activeReferralsWithDeposits >= requirements.MIN_REFERRALS_WITH_DEPOSITS;
  progressDetails.push({
    requirement: `Refer ${requirements.MIN_REFERRALS_WITH_DEPOSITS} friends who make deposits`,
    status: hasMinReferrals,
    current: user.activeReferralsWithDeposits,
    needed: requirements.MIN_REFERRALS_WITH_DEPOSITS
  });
  if (!hasMinReferrals) {
    reasons.push(`Need ${requirements.MIN_REFERRALS_WITH_DEPOSITS} referrals with deposits (current: ${user.activeReferralsWithDeposits})`);
  }
  
  // 3. Total Deposits Check
  const hasMinDeposits = user.totalDeposits >= requirements.MIN_TOTAL_DEPOSITS;
  progressDetails.push({
    requirement: `Deposit total of $${requirements.MIN_TOTAL_DEPOSITS}+`,
    status: hasMinDeposits,
    current: user.totalDeposits,
    needed: requirements.MIN_TOTAL_DEPOSITS
  });
  if (!hasMinDeposits) {
    reasons.push(`Total deposits must be at least $${requirements.MIN_TOTAL_DEPOSITS} (current: $${user.totalDeposits})`);
  }
  
  // 4. KYC Check
  const hasKYC = user.kycStatus === requirements.REQUIRED_KYC_STATUS;
  progressDetails.push({
    requirement: 'Complete KYC verification',
    status: hasKYC,
    current: user.kycStatus
  });
  if (!hasKYC) {
    reasons.push(`KYC verification required (status: ${user.kycStatus})`);
  }
  
  // 5. Account Age Check
  const accountAgeDays = Math.floor((Date.now() - user.accountCreatedAt.getTime()) / (1000 * 60 * 60 * 24));
  const hasMinAge = accountAgeDays >= requirements.MIN_ACCOUNT_AGE_DAYS;
  progressDetails.push({
    requirement: `Be active for ${requirements.MIN_ACCOUNT_AGE_DAYS}+ days`,
    status: hasMinAge,
    current: accountAgeDays,
    needed: requirements.MIN_ACCOUNT_AGE_DAYS
  });
  if (!hasMinAge) {
    const remaining = requirements.MIN_ACCOUNT_AGE_DAYS - accountAgeDays;
    reasons.push(`Account must be ${remaining} more days old`);
  }
  
  // Traditional validations (existing logic)
  if (user.monthlyIncome < requirements.MIN_MONTHLY_INCOME) {
    reasons.push(`Monthly income below $${requirements.MIN_MONTHLY_INCOME}`);
  }
  
  if (user.creditScore < requirements.MIN_CREDIT_SCORE) {
    reasons.push(`Credit score below ${requirements.MIN_CREDIT_SCORE}`);
  }
  
  const estimatedEMI = calculateEMI(requestedAmount, 15, 36);
  const maxAffordableEMI = user.monthlyIncome * requirements.MAX_DEBT_TO_INCOME_RATIO;
  if (user.existingLoans + estimatedEMI > maxAffordableEMI) {
    reasons.push('Total EMI burden exceeds affordable limit');
  }
  
  const completedCount = progressDetails.filter(detail => detail.status).length;
  
  return {
    isEligible: reasons.length === 0,
    reasons,
    progress: {
      completed: completedCount,
      total: progressDetails.length,
      details: progressDetails
    }
  };
}