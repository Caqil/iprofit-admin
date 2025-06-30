// lib/settings-helper.ts - Centralized Settings Management
import { Setting } from '@/models/Setting';
import { connectToDatabase } from '@/lib/db';

class SettingsManager {
  private static cache = new Map<string, any>();
  private static cacheTimestamps = new Map<string, number>();
  private static CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private static isConnected = false;

  /**
   * Get a single setting value with caching
   */
  static async getSetting(key: string, fallback: any = null): Promise<any> {
    try {
      await this.ensureConnection();
      
      const now = Date.now();
      const cachedTimestamp = this.cacheTimestamps.get(key) || 0;

      // Return cached value if still fresh
      if (this.cache.has(key) && (now - cachedTimestamp) < this.CACHE_TTL) {
        return this.cache.get(key);
      }

      // Fetch from database
      const setting = await Setting.findOne({ key }).lean();
      const value = setting?.value ?? fallback;

      // Update cache
      this.cache.set(key, value);
      this.cacheTimestamps.set(key, now);

      return value;

    } catch (error) {
      console.error(`Failed to get setting ${key}:`, error);
      return fallback;
    }
  }

  /**
   * Get multiple settings at once with caching
   */
  static async getSettings(keys: string[]): Promise<Record<string, any>> {
    try {
      await this.ensureConnection();
      
      const now = Date.now();
      const result: Record<string, any> = {};
      const keysToFetch: string[] = [];

      // Check cache first
      for (const key of keys) {
        const cachedTimestamp = this.cacheTimestamps.get(key) || 0;
        
        if (this.cache.has(key) && (now - cachedTimestamp) < this.CACHE_TTL) {
          result[key] = this.cache.get(key);
        } else {
          keysToFetch.push(key);
        }
      }

      // Fetch uncached settings from database
      if (keysToFetch.length > 0) {
        const settings = await Setting.find({ 
          key: { $in: keysToFetch } 
        }).lean();

        // Process fetched settings
        const fetchedKeys = new Set();
        settings.forEach(setting => {
          result[setting.key] = setting.value;
          this.cache.set(setting.key, setting.value);
          this.cacheTimestamps.set(setting.key, now);
          fetchedKeys.add(setting.key);
        });

        // Set null for keys not found in database
        keysToFetch.forEach(key => {
          if (!fetchedKeys.has(key)) {
            result[key] = null;
            this.cache.set(key, null);
            this.cacheTimestamps.set(key, now);
          }
        });
      }

      return result;

    } catch (error) {
      console.error('Failed to get settings:', error);
      return {};
    }
  }

  /**
   * Get settings by category with caching
   */
  static async getSettingsByCategory(category: string): Promise<Record<string, any>> {
    try {
      await this.ensureConnection();
      
      const cacheKey = `category:${category}`;
      const now = Date.now();
      const cachedTimestamp = this.cacheTimestamps.get(cacheKey) || 0;

      // Return cached value if still fresh
      if (this.cache.has(cacheKey) && (now - cachedTimestamp) < this.CACHE_TTL) {
        return this.cache.get(cacheKey);
      }

      // Fetch from database
      const settings = await Setting.find({ category }).lean();
      const result: Record<string, any> = {};

      settings.forEach(setting => {
        result[setting.key] = setting.value;
      });

      // Update cache
      this.cache.set(cacheKey, result);
      this.cacheTimestamps.set(cacheKey, now);

      return result;

    } catch (error) {
      console.error(`Failed to get settings for category ${category}:`, error);
      return {};
    }
  }

  /**
   * Refresh cache for specific keys or all
   */
  static async refreshCache(keys?: string[]): Promise<void> {
    try {
      if (keys) {
        // Refresh specific keys
        keys.forEach(key => {
          this.cache.delete(key);
          this.cacheTimestamps.delete(key);
        });
      } else {
        // Clear entire cache
        this.cache.clear();
        this.cacheTimestamps.clear();
      }
    } catch (error) {
      console.error('Failed to refresh cache:', error);
    }
  }

  /**
   * Invalidate cache (call when settings are updated)
   */
  static invalidateCache(): void {
    this.cache.clear();
    this.cacheTimestamps.clear();
    console.log('Settings cache invalidated');
  }

  /**
   * Get cache statistics
   */
  static getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * Ensure database connection
   */
  private static async ensureConnection(): Promise<void> {
    if (!this.isConnected) {
      await connectToDatabase();
      this.isConnected = true;
    }
  }
}

// Export convenience functions
export const getSetting = SettingsManager.getSetting.bind(SettingsManager);
export const getSettings = SettingsManager.getSettings.bind(SettingsManager);
export const getSettingsByCategory = SettingsManager.getSettingsByCategory.bind(SettingsManager);
export const refreshSettingsCache = SettingsManager.refreshCache.bind(SettingsManager);
export const invalidateSettingsCache = SettingsManager.invalidateCache.bind(SettingsManager);
export const getSettingsCacheStats = SettingsManager.getCacheStats.bind(SettingsManager);

// Export the class for advanced usage
export { SettingsManager };

// ============================================================================
// BUSINESS RULES HELPER - Pre-built functions for common use cases
// ============================================================================

export class BusinessRules {
  /**
   * Get all financial limits
   */
  static async getFinancialLimits(): Promise<{
    minDeposit: number;
    maxDeposit: number;
    minWithdrawal: number;
    maxWithdrawal: number;
    maxDailyWithdrawal: number;
    maxMonthlyWithdrawal: number;
    usdToBdtRate: number;
  }> {
    const settings = await getSettings([
      'min_deposit',
      'max_deposit', 
      'min_withdrawal',
      'max_withdrawal',
      'max_daily_withdrawal',
      'max_monthly_withdrawal',
      'usd_to_bdt_rate'
    ]);

    return {
      minDeposit: settings.min_deposit || 10,
      maxDeposit: settings.max_deposit || 1000000,
      minWithdrawal: settings.min_withdrawal || 50,
      maxWithdrawal: settings.max_withdrawal || 100000,
      maxDailyWithdrawal: settings.max_daily_withdrawal || 50000,
      maxMonthlyWithdrawal: settings.max_monthly_withdrawal || 500000,
      usdToBdtRate: settings.usd_to_bdt_rate || 110
    };
  }

  /**
   * Validate deposit amount
   */
  static async validateDeposit(amount: number): Promise<{ valid: boolean; error?: string }> {
    const { minDeposit, maxDeposit } = await this.getFinancialLimits();

    if (amount < minDeposit) {
      return { valid: false, error: `Minimum deposit amount is ${minDeposit} BDT` };
    }

    if (amount > maxDeposit) {
      return { valid: false, error: `Maximum deposit amount is ${maxDeposit} BDT` };
    }

    return { valid: true };
  }

  /**
   * Validate withdrawal amount
   */
  static async validateWithdrawal(amount: number): Promise<{ valid: boolean; error?: string }> {
    const { minWithdrawal, maxWithdrawal } = await this.getFinancialLimits();

    if (amount < minWithdrawal) {
      return { valid: false, error: `Minimum withdrawal amount is ${minWithdrawal} BDT` };
    }

    if (amount > maxWithdrawal) {
      return { valid: false, error: `Maximum withdrawal amount is ${maxWithdrawal} BDT` };
    }

    return { valid: true };
  }

  /**
   * Calculate withdrawal fees
   */
  static async calculateWithdrawalFee(amount: number): Promise<number> {
    const settings = await getSettings([
      'withdrawal_fee_percentage',
      'min_withdrawal_fee',
      'max_withdrawal_fee'
    ]);

    const feePercentage = settings.withdrawal_fee_percentage || 0.02;
    const minFee = settings.min_withdrawal_fee || 10;
    const maxFee = settings.max_withdrawal_fee || 500;

    let fee = amount * (feePercentage / 100);
    fee = Math.max(minFee, Math.min(maxFee, fee));

    return fee;
  }

  /**
   * Calculate deposit fees
   */
  static async calculateDepositFee(amount: number, gateway: string): Promise<number> {
    const settings = await getSettings([
      'coingate_fee_percentage',
      'uddoktapay_fee_percentage',
      'manual_deposit_fee'
    ]);

    switch (gateway.toLowerCase()) {
      case 'coingate':
        return amount * (settings.coingate_fee_percentage || 0.025);
      case 'uddoktapay':
        return amount * (settings.uddoktapay_fee_percentage || 0.035);
      case 'manual':
        return settings.manual_deposit_fee || 0;
      default:
        return 0;
    }
  }

  /**
   * Convert currency using settings rate
   */
  static async convertCurrency(amount: number, from: string, to: string): Promise<number> {
    if (from === to) return amount;

    const { usdToBdtRate } = await this.getFinancialLimits();

    if (from === 'USD' && to === 'BDT') {
      return amount * usdToBdtRate;
    }

    if (from === 'BDT' && to === 'USD') {
      return amount / usdToBdtRate;
    }

    throw new Error(`Unsupported currency conversion: ${from} to ${to}`);
  }

  /**
   * Get bonus amounts
   */
  static async getBonusAmounts(): Promise<{
    signupBonus: number;
    referralBonus: number;
    profitSharePercentage: number;
  }> {
    const settings = await getSettings([
      'signup_bonus',
      'referral_bonus',
      'profit_share_percentage'
    ]);

    return {
      signupBonus: settings.signup_bonus || 0,
      referralBonus: settings.referral_bonus || 0,
      profitSharePercentage: settings.profit_share_percentage || 10
    };
  }

  /**
   * Check if auto-approval is enabled
   */
  static async getAutoApprovalSettings(): Promise<{
    autoDepositApproval: boolean;
    autoWithdrawalApproval: boolean;
    autoKycApproval: boolean;
  }> {
    const settings = await getSettings([
      'auto_deposit_approval',
      'auto_withdrawal_approval',
      'auto_kyc_approval'
    ]);

    return {
      autoDepositApproval: settings.auto_deposit_approval || false,
      autoWithdrawalApproval: settings.auto_withdrawal_approval || false,
      autoKycApproval: settings.auto_kyc_approval || false
    };
  }
}
