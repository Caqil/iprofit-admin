import { BaseEntity, Currency } from './index';

export type TransactionType = 'deposit' | 'withdrawal' | 'bonus' | 'profit' | 'penalty';
export type TransactionStatus = 'Pending' | 'Approved' | 'Rejected' | 'Processing' | 'Failed';
export type PaymentGateway = 'CoinGate' | 'UddoktaPay' | 'Manual' | 'System';

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
  rejectionReason?: string;
  fees: number;
  netAmount: number;
  metadata?: TransactionMetadata;
  processedAt?: Date;
}

export interface TransactionMetadata {
  ipAddress?: string;
  userAgent?: string;
  location?: string;
  riskScore?: number;
  fraudFlags?: string[];
}

export interface TransactionSummary {
  totalDeposits: number;
  totalWithdrawals: number;
  totalFees: number;
  pendingAmount: number;
  successRate: number;
  averageProcessingTime: number;
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
}

export interface TransactionApproval {
  transactionId: string;
  action: 'approve' | 'reject';
  reason?: string;
  adminNotes?: string;
}

export interface DepositRequest {
  userId: string;
  amount: number;
  currency: Currency;
  gateway: PaymentGateway;
  gatewayData?: any;
}

export interface WithdrawalRequest {
  userId: string;
  amount: number;
  currency: Currency;
  withdrawalMethod: string;
  accountDetails: {
    accountNumber?: string;
    routingNumber?: string;
    bankName?: string;
    walletAddress?: string;
  };
}

export interface GatewayConfig {
  name: string;
  isActive: boolean;
  currencies: Currency[];
  minAmount: number;
  maxAmount: number;
  fees: {
    percentage: number;
    fixed: number;
  };
  settings: {
    apiKey?: string;
    secretKey?: string;
    webhookUrl?: string;
    testMode?: boolean;
  };
}