import { BaseEntity, Currency } from './index';

export type LoanStatus = 'Pending' | 'Approved' | 'Rejected' | 'Active' | 'Completed' | 'Defaulted';
export type RepaymentStatus = 'Pending' | 'Paid' | 'Overdue';
export type PaymentMethod = 'Bank Transfer' | 'Mobile Banking' | 'Cash' | 'Cheque' | 'Online';

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
  employmentDetails?: EmploymentDetails;
  personalDetails?: PersonalDetails;
  financialDetails?: FinancialDetails;
  adminNotes?: string;
  conditions?: string;
  lastModifiedBy?: string;
  lastModifiedAt?: Date;
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

export interface EmploymentDetails {
  company: string;
  position: string;
  workingSince: Date;
  salary: number;
}

export interface PersonalDetails {
  maritalStatus: 'Single' | 'Married' | 'Divorced' | 'Widowed';
  dependents: number;
  education: string;
}

export interface FinancialDetails {
  bankBalance: number;
  monthlyExpenses: number;
  existingLoans: number;
  assets: Asset[];
}

export interface Asset {
  type: string;
  value: number;
  description: string;
}

export interface LoanApplication {
  userId: string;
  amount: number;
  purpose: string;
  tenure: number;
  monthlyIncome: number;
  employmentStatus: string;
  employmentDetails?: EmploymentDetails;
  personalDetails?: PersonalDetails;
  financialDetails: FinancialDetails;
  collateral?: LoanCollateral;
  documents?: LoanDocument[];
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
  search?: string;
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
  monthlyTrends: {
    month: string;
    applications: number;
    approved: number;
    disbursed: number;
    collected: number;
  }[];
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
    veryHigh: number;
  };
}

export interface RepaymentRecord {
  installmentNumber: number;
  amount: number;
  paymentMethod: PaymentMethod;
  transactionReference?: string;
  notes?: string;
  paidAt?: Date;
}

export interface LoanSummary {
  id: string;
  amount: number;
  status: LoanStatus;
  emiAmount: number;
  nextPaymentDate?: Date;
  nextPaymentAmount?: number;
  totalPaid: number;
  remainingAmount: number;
  overdueAmount: number;
  completionPercentage: number;
  daysUntilNextPayment?: number;
  isOverdue: boolean;
}

export interface AffordabilityCheck {
  isAffordable: boolean;
  debtToIncomeRatio: number;
  availableIncome: number;
  recommendedMaxEMI: number;
  affordabilityScore: number;
  suggestions: string[];
}

export interface LoanEligibility {
  isEligible: boolean;
  reasons: string[];
  suggestions: string[];
  minimumRequirements: {
    minIncome: number;
    minCreditScore: number;
    maxDebtRatio: number;
  };
}

// Loan application form data interface
export interface LoanApplicationForm {
  // Basic loan details
  amount: number;
  purpose: string;
  tenure: number;

  // Personal information
  monthlyIncome: number;
  employmentStatus: string;
  
  // Employment details
  employmentDetails: {
    company: string;
    position: string;
    workingSince: string; // ISO date string
    salary: number;
  };

  // Personal details
  personalDetails: {
    maritalStatus: 'Single' | 'Married' | 'Divorced' | 'Widowed';
    dependents: number;
    education: string;
  };

  // Financial details
  financialDetails: {
    bankBalance: number;
    monthlyExpenses: number;
    existingLoans: number;
    assets: {
      type: string;
      value: number;
      description: string;
    }[];
  };

  // Supporting documents
  documents: {
    type: string;
    url: string;
  }[];

  // Optional collateral
  collateral?: {
    type: string;
    value: number;
    description: string;
  };
}

// Response interfaces
export interface LoanApplicationResponse {
  application: {
    id: string;
    amount: number;
    status: LoanStatus;
    creditScore: number;
    emiAmount: number;
    createdAt: Date;
  };
  message: string;
}

export interface LoanDetailsResponse {
  loan: Loan;
  analytics: {
    overdueInstallments: number;
    overdueAmount: number;
    nextPaymentDate?: Date;
    nextPaymentAmount?: number;
    completionPercentage: number;
    remainingInstallments: number;
  };
}

export interface RepaymentHistoryResponse {
  repaymentSchedule: RepaymentSchedule[];
  transactions: any[]; // Transaction interface should be imported
  upcomingPayments: RepaymentSchedule[];
  overduePayments: RepaymentSchedule[];
  analytics: {
    totalInstallments: number;
    paidInstallments: number;
    overdueInstallments: number;
    remainingInstallments: number;
    completionPercentage: number;
    totalPaid: number;
    remainingAmount: number;
    overdueAmount: number;
    averagePaymentDelay: number;
    nextPaymentDate?: Date;
    nextPaymentAmount?: number;
  };
}