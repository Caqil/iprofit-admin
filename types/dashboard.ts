import { Currency } from './index';

export interface DashboardMetrics {
  users: UserMetrics;
  transactions: TransactionMetrics;
  loans: LoanMetrics;
  referrals: ReferralMetrics;
  support: SupportMetrics;
  revenue: RevenueMetrics;
}

export interface UserMetrics {
  total: number;
  active: number;
  newToday: number;
  newThisWeek: number;
  newThisMonth: number;
  kycPending: number;
  kycApproved: number;
  suspended: number;
  growthRate: number;
}

export interface TransactionMetrics {
  totalVolume: number;
  totalFees: number;
  depositsToday: number;
  withdrawalsToday: number;
  pendingApprovals: number;
  successRate: number;
  averageAmount: number;
  growthRate: number;
}

export interface LoanMetrics {
  totalLoans: number;
  activeLoans: number;
  totalDisbursed: number;
  totalCollected: number;
  overdueAmount: number;
  pendingApplications: number;
  approvalRate: number;
  defaultRate: number;
}

export interface ReferralMetrics {
  totalReferrals: number;
  activeReferrals: number;
  totalBonusPaid: number;
  pendingBonuses: number;
  conversionRate: number;
  averageBonusPerReferral: number;
}

export interface SupportMetrics {
  openTickets: number;
  resolvedToday: number;
  averageResponseTime: number;
  satisfactionScore: number;
  escalatedTickets: number;
  agentsOnline: number;
}

export interface RevenueMetrics {
  totalRevenue: number;
  monthlyRevenue: number;
  revenueGrowth: number;
  revenueBySource: RevenueSource[];
  projectedRevenue: number;
  profitMargin: number;
}

export interface RevenueSource {
  source: string;
  amount: number;
  percentage: number;
  growth: number;
}

export interface ChartData {
  userGrowth: TimeSeriesData[];
  transactionVolume: TimeSeriesData[];
  revenueChart: TimeSeriesData[];
  loanPerformance: TimeSeriesData[];
  supportMetrics: TimeSeriesData[];
}

export interface TimeSeriesData {
  date: string;
  value: number;
  label?: string;
  category?: string;
}

export interface DashboardFilter {
  dateRange: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
  startDate?: string;
  endDate?: string;
  currency?: Currency;
  userSegment?: string;
  planId?: string;
}

export interface AlertConfig {
  id: string;
  name: string;
  description: string;
  metric: string;
  condition: 'greater_than' | 'less_than' | 'equals' | 'not_equals';
  threshold: number;
  isActive: boolean;
  notificationChannels: string[];
  lastTriggered?: Date;
}

export interface SystemAlert {
  id: string;
  type: 'warning' | 'error' | 'info' | 'success';
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  isRead: boolean;
  createdAt: Date;
  metadata?: any;
}