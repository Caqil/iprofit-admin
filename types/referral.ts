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
