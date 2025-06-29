import { BaseEntity, Currency } from './index';

export interface Plan extends BaseEntity {
  name: string;
  description: string;
  depositLimit: number;
  withdrawalLimit: number;
  profitLimit: number;
  minimumDeposit: number;
  minimumWithdrawal: number;
  dailyWithdrawalLimit: number;
  monthlyWithdrawalLimit: number;
  features: string[];
  color: string;
  icon?: string;
  price: number;
  currency: Currency;
  duration?: number;
  isActive: boolean;
  priority: number;
  metadata?: PlanMetadata;
}

export interface PlanMetadata {
  benefits?: string[];
  restrictions?: string[];
  recommendedFor?: string[];
  upgradePrice?: number;
  downgradeRestrictions?: string[];
}

export interface PlanLimits {
  deposits: {
    minimum: number;
    maximum: number;
    daily: number;
    monthly: number;
  };
  withdrawals: {
    minimum: number;
    maximum: number;
    daily: number;
    monthly: number;
  };
  profits: {
    maximum: number;
    percentage: number;
  };
}

export interface PlanComparison {
  plans: Plan[];
  features: string[];
  comparison: {
    [planId: string]: {
      [feature: string]: boolean | string | number;
    };
  };
}

export interface PlanUsage {
  planId: string;
  totalUsers: number;
  activeUsers: number;
  revenue: number;
  averageUserValue: number;
  churnRate: number;
}

export interface PlanUpgrade {
  fromPlanId: string;
  toPlanId: string;
  userId: string;
  priceDifference: number;
  effectiveDate: Date;
  prorationAmount?: number;
}

export interface PlanCreateRequest {
  name: string;
  description: string;
  price: number;
  currency: Currency;
  limits: PlanLimits;
  features: string[];
  duration?: number;
  color?: string;
  icon?: string;
}

export interface PlanUpdateRequest {
  name?: string;
  description?: string;
  price?: number;
  limits?: Partial<PlanLimits>;
  features?: string[];
  isActive?: boolean;
  priority?: number;
}
export interface PlanWithStats extends Plan {
  userCount?: number;
  userStats?: {
    total: number;
    active: number;
    suspended: number;
    banned: number;
    kycApproved: number;
  };
}

// Plan filter type for the plans page
export interface PlanFilter {
  search?: string;
  isActive?: boolean;
  minPrice?: number;
  maxPrice?: number;
}