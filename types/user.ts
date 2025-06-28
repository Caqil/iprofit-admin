import { BaseEntity, Currency, Plan, Transaction } from './index';

export type UserStatus = 'Active' | 'Suspended' | 'Banned';
export type KYCStatus = 'Pending' | 'Approved' | 'Rejected';

export interface User extends BaseEntity {
  name: string;
  email: string;
  phone: string;
  planId: string;
  balance: number;
  kycStatus: KYCStatus;
  kycDocuments: KYCDocument[];
  kycRejectionReason?: string;
  referralCode: string;
  referredBy?: string;
  deviceId: string;
  profilePicture?: string;
  dateOfBirth?: Date;
  address?: UserAddress;
  status: UserStatus;
  lastLogin?: Date;
  loginAttempts: number;
  lockedUntil?: Date;
  emailVerified: boolean;
  phoneVerified: boolean;
  twoFactorEnabled: boolean;
}

export interface UserAddress {
  street: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
}

export interface KYCDocument {
  type: string;
  url: string;
  uploadedAt: Date;
}

export interface UserProfile {
  user: User;
  plan: Plan;
  statistics: UserStatistics;
  recentTransactions: Transaction[];
  referrals: UserReferral[];
}

export interface UserStatistics {
  totalDeposits: number;
  totalWithdrawals: number;
  totalProfit: number;
  totalReferrals: number;
  referralEarnings: number;
  accountAge: number;
  lastActivity: Date;
}

export interface UserReferral {
  refereeId: string;
  refereeName: string;
  refereeEmail: string;
  joinedAt: Date;
  bonusEarned: number;
  status: string;
}

export interface UserFilter {
  search?: string;
  status?: UserStatus;
  kycStatus?: KYCStatus;
  planId?: string;
  dateFrom?: string;
  dateTo?: string;
  hasReferrals?: boolean;
  minBalance?: number;
  maxBalance?: number;
}

export interface UserBulkAction {
  userIds: string[];
  action: 'activate' | 'suspend' | 'ban' | 'approve_kyc' | 'reject_kyc' | 'upgrade_plan';
  metadata?: {
    reason?: string;
    planId?: string;
    rejectionReason?: string;
  };
}

export interface UserCreateRequest {
  name: string;
  email: string;
  phone: string;
  planId: string;
  deviceId: string;
  referralCode?: string;
}
export interface KYCApprovalRequest {
  userId: string;
  action: 'approve' | 'reject';
  rejectionReason?: string;
  adminNotes?: string;
  documentsVerified?: string[];
}
export interface UserUpdateRequest {
  name?: string;
  email?: string;
  phone?: string;
  status?: UserStatus;
  planId?: string;
  address?: UserAddress;
  dateOfBirth?: Date;
}