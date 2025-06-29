import { BaseEntity, Currency } from './index';

export type TransactionType = 'deposit' | 'withdrawal' | 'bonus' | 'profit' | 'penalty';
export type TransactionStatus = 'Pending' | 'Approved' | 'Rejected' | 'Processing' | 'Failed' | 'Cancelled';
export type PaymentGateway = 'CoinGate' | 'UddoktaPay' | 'Manual' | 'System' | 'Bank' | 'Mobile';

export interface Transaction extends BaseEntity {
  userId: string;
  type: TransactionType;
  amount: number;
  currency: Currency;
  gateway: PaymentGateway;
  status: TransactionStatus;
  description?: string;
  transactionId?: string;
  gatewayTransactionId?: string;
  gatewayResponse?: any;
  approvedBy?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  fees: number;
  netAmount: number;
  metadata?: TransactionMetadata;
  processedAt?: Date;
  balanceBefore?: number;
  balanceAfter?: number;
  adminNotes?: string;
  userNotes?: string;
  attachments?: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  riskScore?: number;
  flagged?: boolean;
  flagReason?: string;
}

export interface TransactionMetadata {
  ipAddress?: string;
  userAgent?: string;
  location?: string;
  deviceInfo?: string;
  riskScore?: number;
  fraudFlags?: string[];
  verificationLevel?: 'basic' | 'enhanced' | 'manual';
  complianceChecks?: {
    aml: boolean;
    sanctionsList: boolean;
    pep: boolean;
  };
}

export interface TransactionSummary {
  totalCount: number;
  totalDeposits: number;
  totalWithdrawals: number;
  totalFees: number;
  pendingAmount: number;
  approvedAmount: number;
  rejectedAmount: number;
  successRate: number;
  averageProcessingTime: number;
  averageAmount: number;
  byStatus: Record<TransactionStatus, { count: number; amount: number }>;
  byType: Record<TransactionType, { count: number; amount: number }>;
  byGateway: Record<PaymentGateway, { count: number; amount: number }>;
  byCurrency: Record<Currency, { count: number; amount: number }>;
  timeMetrics: {
    lastHour: { count: number; amount: number };
    last24Hours: { count: number; amount: number };
    last7Days: { count: number; amount: number };
    last30Days: { count: number; amount: number };
  };
}

export interface TransactionFilter {
  userId?: string;
  type?: TransactionType;
  status?: TransactionStatus;
  gateway?: PaymentGateway;
  currency?: Currency;
  amountMin?: number;
  amountMax?: number;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  flagged?: boolean;
  riskScoreMin?: number;
  riskScoreMax?: number;
  priority?: string;
  approvedBy?: string;
}

export interface TransactionApproval {
  transactionId: string;
  action: 'approve' | 'reject' | 'cancel';
  reason?: string;
  adminNotes?: string;
  notifyUser?: boolean;
}

export interface BulkTransactionAction {
  transactionIds: string[];
  action: 'approve' | 'reject' | 'flag' | 'unflag' | 'export';
  reason?: string;
  adminNotes?: string;
}