import { IUser } from '@/models/User';
import { ITransaction } from '@/models/Transaction';
import { PaymentGateway, TransactionType } from '@/types/transaction';
import { Plan } from '@/types/plan';
import { Currency } from '@/types';
import { BusinessRules } from '@/lib/settings-helper';
import { getSetting } from '../lib/settings-helper';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface FeeCalculation {
  baseFee: number;
  percentageFee: number;
  totalFee: number;
  netAmount: number;
}

export interface TransactionLimits {
  minimum: number;
  maximum: number;
  daily: number;
  monthly: number;
  remaining: {
    daily: number;
    monthly: number;
  };
}

export class TransactionUtils {
  
  /**
   * Calculate fees based on gateway and transaction type
   */
  static calculateFees(
    amount: number, 
    gateway: PaymentGateway, 
    type: TransactionType,
    isUrgent = false
  ): FeeCalculation {
    let baseFee = 0;
    let percentageFee = 0;

    switch (type) {
      case 'deposit':
        switch (gateway) {
          case 'CoinGate':
            percentageFee = 0.025; // 2.5%
            baseFee = 0;
            break;
          case 'UddoktaPay':
            percentageFee = 0.035; // 3.5%
            baseFee = 2; // $2 base fee
            break;
          case 'Manual':
            percentageFee = 0;
            baseFee = 0;
            break;
          case 'System':
            percentageFee = 0;
            baseFee = 0;
            break;
        }
        break;

      case 'withdrawal':
        switch (gateway) {
          case 'Manual': // Manual withdrawals (different methods)
            // Fee calculation will be handled by withdrawal method
            percentageFee = 0;
            baseFee = 0;
            break;
          default:
            percentageFee = 0;
            baseFee = 0;
        }
        break;

      default:
        percentageFee = 0;
        baseFee = 0;
    }

    // Calculate fees
    const calculatedPercentageFee = amount * percentageFee;
    const totalFee = baseFee + calculatedPercentageFee;

    // Add urgent processing fee
    const urgentFee = isUrgent ? amount * 0.005 : 0; // 0.5% for urgent

    const finalTotalFee = totalFee + urgentFee;
    const netAmount = amount - finalTotalFee;

    return {
      baseFee,
      percentageFee: calculatedPercentageFee + urgentFee,
      totalFee: finalTotalFee,
      netAmount: Math.max(0, netAmount)
    };
  }
static async calculateDepositFees(
  amount: number,
  gateway: PaymentGateway,
  isUrgent = false
): Promise<FeeCalculation> {
  // ✅ You can add deposit fee settings later if needed
  // For now, keep the existing logic but make it async
  
  let baseFee = 0;
  let percentageFee = 0;

  switch (gateway) {
    case 'CoinGate':
      percentageFee = 0.025; // 2.5%
      baseFee = 0;
      break;
    case 'UddoktaPay':
      percentageFee = 0.035; // 3.5%
      baseFee = 2; // $2 base fee
      break;
    case 'Manual':
    case 'System':
      percentageFee = 0;
      baseFee = 0;
      break;
  }

  const calculatedPercentageFee = amount * percentageFee;
  const urgentFee = isUrgent ? amount * 0.005 : 0; // 0.5% for urgent
  const totalFee = baseFee + calculatedPercentageFee + urgentFee;
  const netAmount = amount - totalFee;

  return {
    baseFee,
    percentageFee: calculatedPercentageFee + urgentFee,
    totalFee,
    netAmount: Math.max(0, netAmount)
  };
}
  /**
   * Calculate withdrawal processing fees by method
   */
static async calculateWithdrawalFees(
  amount: number,
  withdrawalMethod: string,
  isUrgent = false
): Promise<FeeCalculation> {
  try {
    // ✅ GET DYNAMIC SETTINGS FROM DATABASE (like other APIs do)
    const financialConfig = await BusinessRules.getFinancialConfig();
    
    let baseFee = 0;
    let percentageFee = 0;

    switch (withdrawalMethod) {
      case 'bank_transfer':
        // ✅ BEFORE: percentageFee = 0.02; // ❌ HARDCODED
        // ✅ AFTER: Use database setting
        percentageFee = financialConfig.withdrawalBankFeePercentage / 100;
        baseFee = Math.max(5, amount * percentageFee);
        break;
      case 'mobile_banking':
        // ✅ BEFORE: percentageFee = 0.015; // ❌ HARDCODED
        // ✅ AFTER: Use database setting  
        percentageFee = financialConfig.withdrawalMobileFeePercentage / 100;
        baseFee = 0;
        break;
      case 'crypto_wallet':
        percentageFee = 0.01; // 1%
        baseFee = 0;
        break;
      case 'check':
        percentageFee = 0;
        baseFee = 10; // Flat $10 fee
        break;
      default:
        // ✅ Use database setting for default
        percentageFee = financialConfig.withdrawalBankFeePercentage / 100;
        baseFee = 5;
    }

    const calculatedPercentageFee = amount * percentageFee;
    const urgentFee = isUrgent ? amount * 0.005 : 0; // 0.5% for urgent
    const totalFee = baseFee + calculatedPercentageFee + urgentFee;
    const netAmount = amount - totalFee;

    return {
      baseFee,
      percentageFee: calculatedPercentageFee + urgentFee,
      totalFee,
      netAmount: Math.max(0, netAmount)
    };
  } catch (error) {
    console.error('Error calculating withdrawal fees:', error);
    // Fallback to prevent API breakage
    const totalFee = amount * 0.02; // 2% fallback
    return {
      baseFee: 0,
      percentageFee: totalFee,
      totalFee,
      netAmount: Math.max(0, amount - totalFee)
    };
  }
}
  /**
   * Validate transaction against user limits and plan restrictions
   */
static async validateTransactionLimits(
  user: IUser,
  amount: number,
  type: TransactionType,
  existingTransactions: ITransaction[]
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // ✅ GET DYNAMIC SETTINGS FROM DATABASE (like other APIs do)
    const financialConfig = await BusinessRules.getFinancialConfig();
    const plan = user.planId as any; // Assume populated

    if (!plan) {
      errors.push('User plan not found');
      return { isValid: false, errors, warnings };
    }

    // Basic amount validation
    if (amount <= 0) {
      errors.push('Amount must be greater than 0');
    }

    // ✅ UPDATE Plan-specific limits with database settings
    switch (type) {
      case 'deposit':
        // ✅ BEFORE: if (amount < plan.minimumDeposit) // Only plan limit
        // ✅ AFTER: Use both plan limit AND database setting
        const minDeposit = Math.max(plan.minimumDeposit || 0, financialConfig.minDeposit);
        if (amount < minDeposit) {
          errors.push(`Minimum deposit amount is ${minDeposit} BDT`);
        }
        if (amount > (plan.depositLimit || 1000000)) {
          errors.push(`Maximum deposit amount is ${plan.depositLimit || 1000000} BDT`);
        }
        break;

      case 'withdrawal':
        // ✅ BEFORE: if (amount < plan.minimumWithdrawal) // Only plan limit
        // ✅ AFTER: Use database settings for withdrawal limits
        const minWithdrawal = await getSetting('min_withdrawal_amount', 100);
        const maxWithdrawal = await getSetting('max_withdrawal_amount', 100000);
        
        if (amount < Math.max(plan.minimumWithdrawal || 0, minWithdrawal)) {
          errors.push(`Minimum withdrawal amount is ${minWithdrawal} BDT`);
        }
        if (amount > Math.min(plan.withdrawalLimit || maxWithdrawal, maxWithdrawal)) {
          errors.push(`Maximum withdrawal amount is ${maxWithdrawal} BDT`);
        }
        if (amount > user.balance) {
          errors.push(`Insufficient balance. Available: ${user.balance} BDT`);
        }
        break;
    }

    // ✅ KEEP existing daily/monthly logic but enhance with database limits
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const todayTransactions = existingTransactions.filter(t => 
      t.type === type && 
      t.createdAt >= startOfDay &&
      ['Pending', 'Approved', 'Processing'].includes(t.status)
    );

    const monthTransactions = existingTransactions.filter(t => 
      t.type === type && 
      t.createdAt >= startOfMonth &&
      ['Pending', 'Approved', 'Processing'].includes(t.status)
    );

    const todayTotal = todayTransactions.reduce((sum, t) => sum + t.amount, 0);
    const monthTotal = monthTransactions.reduce((sum, t) => sum + t.amount, 0);

    // ✅ GET SYSTEM-WIDE LIMITS FROM DATABASE
    const maxDailyWithdrawal = await getSetting('max_daily_withdrawal', 50000);
    const maxMonthlyWithdrawal = await getSetting('max_monthly_withdrawal', 500000);

    // ✅ COMBINE plan limits with system limits (use the LOWER of the two)
    const dailyLimit = type === 'deposit' 
      ? (plan.dailyDepositLimit || plan.depositLimit) 
      : Math.min(plan.dailyWithdrawalLimit || maxDailyWithdrawal, maxDailyWithdrawal);
      
    const monthlyLimit = type === 'deposit' 
      ? (plan.monthlyDepositLimit || plan.depositLimit) 
      : Math.min(plan.monthlyWithdrawalLimit || maxMonthlyWithdrawal, maxMonthlyWithdrawal);

    if (dailyLimit && (todayTotal + amount) > dailyLimit) {
      errors.push(`Daily ${type} limit exceeded. Current: ${todayTotal}, Limit: ${dailyLimit}`);
    }

    if (monthlyLimit && (monthTotal + amount) > monthlyLimit) {
      errors.push(`Monthly ${type} limit exceeded. Current: ${monthTotal}, Limit: ${monthlyLimit}`);
    }

    // Warnings for approaching limits
    if (dailyLimit && (todayTotal + amount) > dailyLimit * 0.8) {
      warnings.push(`Approaching daily ${type} limit`);
    }

    if (monthlyLimit && (monthTotal + amount) > monthlyLimit * 0.8) {
      warnings.push(`Approaching monthly ${type} limit`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };

  } catch (error) {
    console.error('Error validating transaction limits:', error);
    // ✅ Fallback to prevent API breakage
    return {
      isValid: false,
      errors: ['Unable to validate transaction limits. Please try again.'],
      warnings: []
    };
  }
}

  /**
   * Generate unique transaction ID
   */
  static generateTransactionId(type: TransactionType): string {
    const prefix = {
      deposit: 'DEP',
      withdrawal: 'WDL',
      bonus: 'BON',
      profit: 'PRF',
      penalty: 'PEN'
    }[type];

    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substr(2, 9).toUpperCase();
    
    return `${prefix}-${timestamp}-${randomSuffix}`;
  }

  /**
   * Get estimated processing time for different gateways/methods
   */
  static getProcessingTime(gateway: PaymentGateway, withdrawalMethod?: string, isUrgent = false): string {
    if (isUrgent) {
      return '1-2 hours';
    }

    switch (gateway) {
      case 'CoinGate':
        return '10-30 minutes';
      case 'UddoktaPay':
        return '5-15 minutes';
      case 'Manual':
        if (withdrawalMethod) {
          switch (withdrawalMethod) {
            case 'mobile_banking':
              return '2-4 hours';
            case 'crypto_wallet':
              return '4-6 hours';
            case 'bank_transfer':
              return '1-3 business days';
            case 'check':
              return '5-7 business days';
            default:
              return '1-3 business days';
          }
        }
        return '1-2 business days';
      case 'System':
        return 'Instant';
      default:
        return '1-3 business days';
    }
  }

  /**
   * Calculate risk score for fraud detection
   */
  static calculateRiskScore(
    transaction: Partial<ITransaction>,
    user: IUser,
    recentTransactions: ITransaction[]
  ): number {
    let riskScore = 0;

    // Base risk factors
    const amount = transaction.amount || 0;
    const userAge = user.createdAt ? Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)) : 0;

    // High amount risk
    if (amount > 10000) riskScore += 30;
    else if (amount > 5000) riskScore += 20;
    else if (amount > 1000) riskScore += 10;

    // New user risk
    if (userAge < 7) riskScore += 25;
    else if (userAge < 30) riskScore += 15;

    // KYC status risk
    if (user.kycStatus !== 'Approved') riskScore += 40;

    // Velocity checks
    const last24h = recentTransactions.filter(t => 
      t.createdAt > new Date(Date.now() - 24 * 60 * 60 * 1000)
    );

    if (last24h.length > 5) riskScore += 20;
    if (last24h.length > 10) riskScore += 30;

    // Same amount transactions (potential duplicate)
    const sameAmount = recentTransactions.filter(t => 
      t.amount === amount && t.createdAt > new Date(Date.now() - 60 * 60 * 1000)
    );
    if (sameAmount.length > 0) riskScore += 25;

    // Weekend/holiday transactions
    const now = new Date();
    if (now.getDay() === 0 || now.getDay() === 6) { // Weekend
      riskScore += 10;
    }

    return Math.min(100, riskScore); // Cap at 100
  }

  /**
   * Get transaction limits summary for user
   */
  static async getTransactionLimits(
    user: IUser,
    type: TransactionType,
    existingTransactions: ITransaction[]
  ): Promise<TransactionLimits> {
    const plan = user.planId as any;
    
    if (!plan) {
      throw new Error('User plan not found');
    }

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const todayTransactions = existingTransactions.filter(t => 
      t.type === type && 
      t.createdAt >= startOfDay &&
      ['Pending', 'Approved', 'Processing'].includes(t.status)
    );

    const monthTransactions = existingTransactions.filter(t => 
      t.type === type && 
      t.createdAt >= startOfMonth &&
      ['Pending', 'Approved', 'Processing'].includes(t.status)
    );

    const todayTotal = todayTransactions.reduce((sum, t) => sum + t.amount, 0);
    const monthTotal = monthTransactions.reduce((sum, t) => sum + t.amount, 0);

    const limits = type === 'deposit' ? {
      minimum: plan.minimumDeposit,
      maximum: plan.depositLimit,
      daily: plan.dailyDepositLimit || plan.depositLimit,
      monthly: plan.monthlyDepositLimit || plan.depositLimit * 30
    } : {
      minimum: plan.minimumWithdrawal,
      maximum: Math.min(plan.withdrawalLimit, user.balance),
      daily: plan.dailyWithdrawalLimit || plan.withdrawalLimit,
      monthly: plan.monthlyWithdrawalLimit || plan.withdrawalLimit * 30
    };

    return {
      ...limits,
      remaining: {
        daily: Math.max(0, limits.daily - todayTotal),
        monthly: Math.max(0, limits.monthly - monthTotal)
      }
    };
  }

  /**
   * Format transaction status for display
   */
  static formatTransactionStatus(status: string): { 
    text: string; 
    color: string; 
    description: string;
  } {
    const statusMap = {
      'Pending': {
        text: 'Pending',
        color: 'yellow',
        description: 'Awaiting admin approval'
      },
      'Approved': {
        text: 'Approved',
        color: 'green',
        description: 'Transaction approved and processed'
      },
      'Rejected': {
        text: 'Rejected',
        color: 'red',
        description: 'Transaction rejected by admin'
      },
      'Processing': {
        text: 'Processing',
        color: 'blue',
        description: 'Transaction is being processed'
      },
      'Failed': {
        text: 'Failed',
        color: 'red',
        description: 'Transaction failed during processing'
      }
    };

    return statusMap[status as keyof typeof statusMap] || {
      text: status,
      color: 'gray',
      description: 'Unknown status'
    };
  }

  /**
   * Check if transaction is editable/cancelable
   */
  static isTransactionEditable(transaction: ITransaction): boolean {
    return transaction.status === 'Pending' && 
           transaction.type !== 'bonus' && 
           transaction.type !== 'profit' &&
           transaction.type !== 'penalty';
  }

  /**
   * Get recommended withdrawal method for user
   */
  static getRecommendedWithdrawalMethod(
    amount: number,
    currency: Currency,
    userLocation?: string
  ): string {
    // Bangladesh-specific recommendations
    if (currency === 'BDT' || userLocation?.includes('BD')) {
      if (amount <= 1000) return 'mobile_banking';
      if (amount <= 10000) return 'bank_transfer';
      return 'bank_transfer'; // Large amounts via bank
    }

    // USD/International recommendations
    if (amount <= 100) return 'crypto_wallet';
    if (amount <= 5000) return 'bank_transfer';
    return 'bank_transfer'; // Large amounts via bank
  }
}

export default TransactionUtils;