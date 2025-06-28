import { BaseEntity, Currency } from './index';

export type LoanStatus = 'Pending' | 'Approved' | 'Rejected' | 'Active' | 'Completed' | 'Defaulted';
export type RepaymentStatus = 'Pending' | 'Paid' | 'Overdue';

export interface Loan extends BaseEntity {
  userId: string;
  amount: number;
  currency: Currency;
  interestRate: number;
  tenure: number;
  emiAmount: number;
  creditScore: number;
  status: LoanStatus;
  purpose: string;
  monthlyIncome: number;
  employmentStatus: string;
  collateral?: LoanCollateral;
  documents: LoanDocument[];
  repaymentSchedule: RepaymentSchedule[];
  approvedBy?: string;
  approvedAt?: Date;
  rejectionReason?: string;
  disbursedAt?: Date;
  completedAt?: Date;
  totalPaid: number;
  remainingAmount: number;
  overdueAmount: number;
  penaltyAmount: number;
  metadata?: LoanMetadata;
}

export interface LoanCollateral {
  type: string;
  value: number;
  description: string;
}

export interface LoanDocument {
  type: string;
  url: string;
  uploadedAt: Date;
}

export interface RepaymentSchedule {
  installmentNumber: number;
  dueDate: Date;
  amount: number;
  principal: number;
  interest: number;
  status: RepaymentStatus;
  paidAt?: Date;
  paidAmount?: number;
}

export interface LoanMetadata {
  applicationSource?: string;
  riskAssessment?: RiskAssessment;
  creditHistory?: CreditHistory;
}

export interface RiskAssessment {
  score: number;
  factors: {
    income: number;
    creditScore: number;
    employmentStability: number;
    debtToIncomeRatio: number;
    collateralValue: number;
  };
  recommendation: 'Approve' | 'Reject' | 'Review';
  notes?: string;
}

export interface CreditHistory {
  previousLoans: number;
  defaultHistory: boolean;
  creditUtilization: number;
  paymentHistory: number;
  accountAge: number;
}

export interface LoanApplication {
  userId: string;
  amount: number;
  purpose: string;
  tenure: number;
  monthlyIncome: number;
  employmentStatus: string;
  employmentDetails: {
    company: string;
    position: string;
    workingSince: Date;
    salary: number;
  };
  personalDetails: {
    maritalStatus: string;
    dependents: number;
    education: string;
  };
  financialDetails: {
    bankBalance: number;
    monthlyExpenses: number;
    existingLoans: number;
    assets: Asset[];
  };
  documents: LoanDocument[];
}

export interface Asset {
  type: string;
  value: number;
  description: string;
}

export interface EMICalculation {
  loanAmount: number;
  interestRate: number;
  tenure: number;
  emiAmount: number;
  totalInterest: number;
  totalAmount: number;
  schedule: {
    month: number;
    emi: number;
    principal: number;
    interest: number;
    balance: number;
  }[];
}

export interface LoanFilter {
  userId?: string;
  status?: LoanStatus;
  amountMin?: number;
  amountMax?: number;
  creditScoreMin?: number;
  creditScoreMax?: number;
  dateFrom?: string;
  dateTo?: string;
  isOverdue?: boolean;
}
export interface LoanApprovalRequest {
  loanId: string;
  action: 'approve' | 'reject';
  rejectionReason?: string;
  interestRate?: number;
  conditions?: string;
  adminNotes?: string;
}
export interface LoanAnalytics {
  totalLoans: number;
  approvedLoans: number;
  rejectedLoans: number;
  activeLoans: number;
  completedLoans: number;
  defaultedLoans: number;
  totalDisbursed: number;
  totalCollected: number;
  overdueAmount: number;
  averageLoanAmount: number;
  averageCreditScore: number;
  approvalRate: number;
  defaultRate: number;
}
