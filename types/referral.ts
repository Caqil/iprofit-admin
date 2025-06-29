import { BaseEntity } from './index';

export type ReferralStatus = 'Pending' | 'Paid' | 'Cancelled';
export type BonusType = 'signup' | 'profit_share';

export interface Referral extends BaseEntity {
  referrerId: string;
  refereeId: string;
  bonusAmount: number;
  profitBonus: number;
  status: ReferralStatus;
  bonusType: BonusType;
  transactionId?: string;
  metadata?: ReferralMetadata;
  paidAt?: Date;
  // Extended fields for API responses with populated data
  referrer?: {
    id: string;
    name: string;
    email: string;
    referralCode: string;
  };
  referee?: {
    id: string;
    name: string;
    email: string;
    kycStatus: string;
    status: string;
  };
  transaction?: {
    id: string;
    transactionId: string;
    status: string;
    processedAt?: Date;
  };
}

export interface ReferralMetadata {
  refereeFirstDeposit?: number;
  refereeFirstDepositDate?: Date;
  totalRefereeProfit?: number;
  campaignId?: string;
}

export interface ReferralOverview {
  totalReferrals: number;
  activeReferrals: number;
  totalBonusPaid: number;
  pendingBonuses: number;
  averageBonusPerReferral: number;
  conversionRate: number;
  topReferrers: TopReferrer[];
}

export interface TopReferrer {
  userId: string;
  userName: string;
  totalReferrals: number;
  totalEarnings: number;
  conversionRate: number;
}

// MISSING TYPE - Add ReferralFilter interface
export interface ReferralFilter {
  status?: ReferralStatus;
  bonusType?: BonusType;
  referrerId?: string;
  refereeId?: string;
  amountMin?: number;
  amountMax?: number;
  startDate?: string;
  endDate?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface ReferralCommission {
  signupBonus: number;
  profitSharePercentage: number;
  maxProfitShare?: number;
  tierBonuses?: {
    tier: number;
    minReferrals: number;
    bonusPercentage: number;
  }[];
}

export interface ReferralCode {
  code: string;
  userId: string;
  isActive: boolean;
  usageCount: number;
  maxUsage?: number;
  expiresAt?: Date;
}

export interface ReferralStats {
  userId: string;
  totalReferrals: number;
  successfulReferrals: number;
  totalEarnings: number;
  pendingEarnings: number;
  conversionRate: number;
  referralHistory: ReferralHistory[];
}

export interface ReferralHistory {
  refereeId: string;
  refereeName: string;
  joinedAt: Date;
  firstDepositAt?: Date;
  totalProfit: number;
  bonusEarned: number;
  status: string;
}

// Additional types for referral management
export interface ReferralBulkAction {
  referralIds: string[];
  action: 'approve' | 'reject' | 'recalculate';
  reason?: string;
  adjustedAmount?: number;
  newProfitAmount?: number;
}

export interface ReferralApprovalRequest {
  referralIds: string[];
  action: 'approve' | 'reject';
  reason?: string;
  adminNotes?: string;
  adjustedAmount?: number;
}

export interface ReferralRecalculationRequest {
  refereeId: string;
  newProfitAmount: number;
  profitSharePercentage?: number;
}