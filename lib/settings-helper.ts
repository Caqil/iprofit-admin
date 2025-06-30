import { Setting } from '@/models/Setting';
import { connectToDatabase } from '@/lib/db';
import { decrypt } from '@/lib/encryption';

class SettingsManager {
  private static cache = new Map<string, any>();
  private static cacheTimestamps = new Map<string, number>();
  private static CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private static isConnected = false;

  /**
   * Process setting value (decrypt if needed)
   */
  private static processSettingValue(setting: any): any {
    if (setting.isEncrypted && setting.value) {
      try {
        return decrypt(setting.value);
      } catch (error) {
        console.error('Failed to decrypt setting value:', error);
        return setting.value; // Return original value if decryption fails
      }
    }
    return setting.value;
  }

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
      const value = setting ? this.processSettingValue(setting) : fallback;

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
          const processedValue = this.processSettingValue(setting);
          result[setting.key] = processedValue;
          this.cache.set(setting.key, processedValue);
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
        result[setting.key] = this.processSettingValue(setting);
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
        // Also clear category caches that might contain these keys
        for (const cacheKey of this.cache.keys()) {
          if (cacheKey.startsWith('category:')) {
            this.cache.delete(cacheKey);
            this.cacheTimestamps.delete(cacheKey);
          }
        }
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
// BUSINESS RULES HELPER - Enhanced for new database structure
// ============================================================================

export class BusinessRules {
  /**
   * Get system configuration
   */
  static async getSystemConfig(): Promise<{
    appName: string;
    companyName: string;
    maintenanceMode: boolean;
  }> {
    const settings = await getSettings([
      'app_name',
      'company_name',
      'maintenance_mode'
    ]);

    return {
      appName: settings.app_name || 'IProfit Admin',
      companyName: settings.company_name || 'IProfit Technologies',
      maintenanceMode: settings.maintenance_mode || false
    };
  }

  /**
   * Get financial configuration
   */
  static async getFinancialConfig(): Promise<{
    primaryCurrency: string;
    usdToBdtRate: number;
    minDeposit: number;
    signupBonus: number;
    withdrawalBankFeePercentage: number;
    withdrawalMobileFeePercentage: number;
  }> {
    const settings = await getSettings([
      'primary_currency',
      'usd_to_bdt_rate',
      'min_deposit',
      'signup_bonus',
      'withdrawal_bank_fee_percentage',
      'withdrawal_mobile_fee_percentage'
    ]);

    return {
      primaryCurrency: settings.primary_currency || 'BDT',
      usdToBdtRate: settings.usd_to_bdt_rate || 110.50,
      minDeposit: settings.min_deposit || 100,
      signupBonus: settings.signup_bonus || 100,
      withdrawalBankFeePercentage: settings.withdrawal_bank_fee_percentage || 0.02,
      withdrawalMobileFeePercentage: settings.withdrawal_mobile_fee_percentage || 0.015
    };
  }

  /**
   * Get security configuration
   */
  static async getSecurityConfig(): Promise<{
    deviceLimitPerUser: number;
    enableDeviceLimiting: boolean;
    sessionTimeoutMinutes: number;
  }> {
    const settings = await getSettings([
      'device_limit_per_user',
      'enable_device_limiting',
      'session_timeout_minutes'
    ]);

    return {
      deviceLimitPerUser: settings.device_limit_per_user || 1,
      enableDeviceLimiting: settings.enable_device_limiting !== false, // Default true
      sessionTimeoutMinutes: settings.session_timeout_minutes || 30
    };
  }

  /**
   * Get email configuration
   */
  static async getEmailConfig(): Promise<{
    smtpHost: string;
    smtpPort: number;
  }> {
    const settings = await getSettings([
      'smtp_host',
      'smtp_port'
    ]);

    return {
      smtpHost: settings.smtp_host || 'smtp.gmail.com',
      smtpPort: settings.smtp_port || 587
    };
  }

  /**
   * Get business configuration
   */
  static async getBusinessConfig(): Promise<{
    autoKycApproval: boolean;
    enableReferralSystem: boolean;
  }> {
    const settings = await getSettings([
      'auto_kyc_approval',
      'enable_referral_system'
    ]);

    return {
      autoKycApproval: settings.auto_kyc_approval || false,
      enableReferralSystem: settings.enable_referral_system !== false // Default true
    };
  }

  /**
   * Get withdrawal configuration - updated to match actual database structure
   */
  static async getWithdrawalConfig(): Promise<{
    bankFeePercentage: number;
    mobileFeePercentage: number;
    processingTimes: {
      bank: string;
      mobile: string;
    };
  }> {
    const settings = await getSettings([
      'withdrawal_bank_fee_percentage',
      'withdrawal_mobile_fee_percentage'
    ]);

    return {
      bankFeePercentage: settings.withdrawal_bank_fee_percentage || 0.02, // 2%
      mobileFeePercentage: settings.withdrawal_mobile_fee_percentage || 0.015, // 1.5%
      processingTimes: {
        bank: '1-3 business days',
        mobile: '2-4 hours'
      }
    };
  }

  /**
   * Calculate withdrawal fees based on method and amount
   */
  static async calculateWithdrawalFee(
    method: 'bank' | 'mobile', 
    amount: number
  ): Promise<{ fee: number; netAmount: number; feePercentage: number }> {
    const config = await this.getWithdrawalConfig();
    
    let feePercentage = 0;
    switch (method) {
      case 'bank':
        feePercentage = config.bankFeePercentage;
        break;
      case 'mobile':
        feePercentage = config.mobileFeePercentage;
        break;
      default:
        feePercentage = 0;
    }

    const fee = amount * feePercentage;
    const netAmount = amount - fee;

    return {
      fee,
      netAmount,
      feePercentage
    };
  }

  /**
   * Get processing time estimate for withdrawal method
   */
  static async getWithdrawalProcessingTime(method: 'bank' | 'mobile'): Promise<string> {
    const config = await this.getWithdrawalConfig();
    
    switch (method) {
      case 'bank':
        return config.processingTimes.bank;
      case 'mobile':
        return config.processingTimes.mobile;
      default:
        return '1-3 business days';
    }
  }

  /**
   * Check if system is in maintenance mode
   */
  static async isMaintenanceMode(): Promise<boolean> {
    return await getSetting('maintenance_mode', false);
  }

  /**
   * Validate deposit amount against minimum
   */
  static async validateDeposit(amount: number): Promise<{ valid: boolean; error?: string; minAmount?: number }> {
    const minDeposit = await getSetting('min_deposit', 100);
    
    if (amount < minDeposit) {
      return {
        valid: false,
        error: `Minimum deposit amount is ${minDeposit} BDT`,
        minAmount: minDeposit
      };
    }

    return { valid: true };
  }

  /**
   * Get signup bonus amount
   */
  static async getSignupBonus(): Promise<number> {
    return await getSetting('signup_bonus', 100);
  }

  /**
   * Get device limit per user
   */
  static async getDeviceLimit(): Promise<number> {
    return await getSetting('device_limit_per_user', 1);
  }

  /**
   * Check if device limiting is enabled
   */
  static async isDeviceLimitingEnabled(): Promise<boolean> {
    return await getSetting('enable_device_limiting', true);
  }

  /**
   * Get session timeout in minutes
   */
  static async getSessionTimeout(): Promise<number> {
    return await getSetting('session_timeout_minutes', 30);
  }

  /**
   * Get all settings for a specific category
   */
  static async getCategorySettings(category: string): Promise<Record<string, any>> {
    return await getSettingsByCategory(category);
  }

  /**
   * Check if auto KYC approval is enabled
   */
  static async isAutoKycEnabled(): Promise<boolean> {
    return await getSetting('auto_kyc_approval', false);
  }

  /**
   * Check if referral system is enabled
   */
  static async isReferralSystemEnabled(): Promise<boolean> {
    return await getSetting('enable_referral_system', true);
  }

  /**
   * Get primary currency
   */
  static async getPrimaryCurrency(): Promise<string> {
    return await getSetting('primary_currency', 'BDT');
  }

  /**
   * Get USD to BDT exchange rate
   */
  static async getExchangeRate(): Promise<number> {
    return await getSetting('usd_to_bdt_rate', 110.50);
  }

  /**
   * Get application name
   */
  static async getAppName(): Promise<string> {
    return await getSetting('app_name', 'IProfit Admin');
  }

  /**
   * Get company name
   */
  static async getCompanyName(): Promise<string> {
    return await getSetting('company_name', 'IProfit Technologies');
  }

  /**
   * Convert currency amount
   */
  static async convertCurrency(
    amount: number, 
    fromCurrency: string, 
    toCurrency: string
  ): Promise<number> {
    if (fromCurrency === toCurrency) return amount;
    
    const exchangeRate = await this.getExchangeRate();
    
    if (fromCurrency === 'USD' && toCurrency === 'BDT') {
      return amount * exchangeRate;
    }
    
    if (fromCurrency === 'BDT' && toCurrency === 'USD') {
      return amount / exchangeRate;
    }
    
    return amount; // Default to original amount if conversion not supported
  }

  /**
   * Get minimum deposit in specific currency
   */
  static async getMinDepositInCurrency(currency: string): Promise<number> {
    const minDepositBDT = await getSetting('min_deposit', 100);
    
    if (currency === 'BDT') {
      return minDepositBDT;
    }
    
    if (currency === 'USD') {
      return await this.convertCurrency(minDepositBDT, 'BDT', 'USD');
    }
    
    return minDepositBDT;
  }

  /**
   * Get signup bonus in specific currency
   */
  static async getSignupBonusInCurrency(currency: string): Promise<number> {
    const signupBonusBDT = await getSetting('signup_bonus', 100);
    
    if (currency === 'BDT') {
      return signupBonusBDT;
    }
    
    if (currency === 'USD') {
      return await this.convertCurrency(signupBonusBDT, 'BDT', 'USD');
    }
    
    return signupBonusBDT;
  }

  /**
   * Validate if user can create more devices
   */
  static async validateDeviceLimit(currentDeviceCount: number): Promise<{ valid: boolean; error?: string; maxDevices?: number }> {
    const isEnabled = await this.isDeviceLimitingEnabled();
    
    if (!isEnabled) {
      return { valid: true };
    }
    
    const maxDevices = await this.getDeviceLimit();
    
    if (currentDeviceCount >= maxDevices) {
      return {
        valid: false,
        error: `Maximum ${maxDevices} device(s) allowed per user`,
        maxDevices
      };
    }
    
    return { valid: true, maxDevices };
  }

  /**
   * Get all financial settings formatted for transaction processing
   */
  static async getTransactionSettings(): Promise<{
    primaryCurrency: string;
    exchangeRate: number;
    minDeposit: number;
    signupBonus: number;
    fees: {
      bankWithdrawal: number;
      mobileWithdrawal: number;
    };
    autoKycApproval: boolean;
  }> {
    const [financial, business] = await Promise.all([
      this.getFinancialConfig(),
      this.getBusinessConfig()
    ]);

    return {
      primaryCurrency: financial.primaryCurrency,
      exchangeRate: financial.usdToBdtRate,
      minDeposit: financial.minDeposit,
      signupBonus: financial.signupBonus,
      fees: {
        bankWithdrawal: financial.withdrawalBankFeePercentage,
        mobileWithdrawal: financial.withdrawalMobileFeePercentage
      },
      autoKycApproval: business.autoKycApproval
    };
  }
}