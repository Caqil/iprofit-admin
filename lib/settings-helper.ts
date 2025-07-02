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
 * Get complete email configuration
 */
static async getEmailConfig(): Promise<{
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  emailFromName: string;
  emailFromAddress?: string;
  smtpSecure: boolean;
  smtpMaxConnections: number;
  smtpMaxMessages: number;
  emailMaxRetries: number;
  emailRetryDelay: number;
}> {
  const settings = await getSettings([
    'smtp_host',
    'smtp_port',
    'smtp_user',
    'smtp_pass',
    'email_from_name',
    'email_from_address',
    'smtp_secure',
    'smtp_max_connections',
    'smtp_max_messages',
    'email_max_retries',
    'email_retry_delay'
  ]);

  return {
    smtpHost: settings.smtp_host || process.env.SMTP_HOST || 'smtp.gmail.com',
    smtpPort: settings.smtp_port || parseInt(process.env.SMTP_PORT || '587'),
    smtpUser: settings.smtp_user || process.env.SMTP_USER || '',
    smtpPass: settings.smtp_pass || process.env.SMTP_PASS || '',
    emailFromName: settings.email_from_name || process.env.EMAIL_FROM_NAME || 'IProfit Platform',
    emailFromAddress: settings.email_from_address || process.env.EMAIL_FROM_ADDRESS,
    smtpSecure: settings.smtp_secure !== undefined ? Boolean(settings.smtp_secure) : (process.env.SMTP_SECURE === 'true'),
    smtpMaxConnections: settings.smtp_max_connections || parseInt(process.env.SMTP_MAX_CONNECTIONS || '5'),
    smtpMaxMessages: settings.smtp_max_messages || parseInt(process.env.SMTP_MAX_MESSAGES || '100'),
    emailMaxRetries: settings.email_max_retries || parseInt(process.env.EMAIL_MAX_RETRIES || '3'),
    emailRetryDelay: settings.email_retry_delay || parseInt(process.env.EMAIL_RETRY_DELAY || '5000')
  };
}

/**
 * Update email configuration
 */
static async updateEmailConfig(config: {
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  emailFromName?: string;
  emailFromAddress?: string;
  smtpSecure?: boolean;
  smtpMaxConnections?: number;
  smtpMaxMessages?: number;
  emailMaxRetries?: number;
  emailRetryDelay?: number;
}): Promise<void> {
  const updates: { [key: string]: any } = {};

  if (config.smtpHost !== undefined) updates.smtp_host = config.smtpHost;
  if (config.smtpPort !== undefined) updates.smtp_port = config.smtpPort;
  if (config.smtpUser !== undefined) updates.smtp_user = config.smtpUser;
  if (config.smtpPass !== undefined) updates.smtp_pass = config.smtpPass;
  if (config.emailFromName !== undefined) updates.email_from_name = config.emailFromName;
  if (config.emailFromAddress !== undefined) updates.email_from_address = config.emailFromAddress;
  if (config.smtpSecure !== undefined) updates.smtp_secure = config.smtpSecure;
  if (config.smtpMaxConnections !== undefined) updates.smtp_max_connections = config.smtpMaxConnections;
  if (config.smtpMaxMessages !== undefined) updates.smtp_max_messages = config.smtpMaxMessages;
  if (config.emailMaxRetries !== undefined) updates.email_max_retries = config.emailMaxRetries;
  if (config.emailRetryDelay !== undefined) updates.email_retry_delay = config.emailRetryDelay;

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
 * Get bonus auto approval configuration
 */
static async getBonusAutoApprovalConfig(): Promise<{
  autoBonusApproval: boolean;
  maxAutoApprovalAmount: number;
  minAccountAgeDays: number;
  minTotalDeposits: number;
}> {
  const settings = await getSettings([
    'auto_bonus_approval',
    'auto_bonus_max_amount',
    'auto_bonus_min_account_age_days',
    'auto_bonus_min_total_deposits'
  ]);

  return {
    autoBonusApproval: settings.auto_bonus_approval || false,
    maxAutoApprovalAmount: settings.auto_bonus_max_amount || 1000,
    minAccountAgeDays: settings.auto_bonus_min_account_age_days || 30,
    minTotalDeposits: settings.auto_bonus_min_total_deposits || 1000
  };
}

/**
 * Check if user is eligible for auto bonus approval
 */
static async isUserEligibleForAutoBonusApproval(
  user: any,
  bonusAmount: number
): Promise<{
  eligible: boolean;
  reasons: string[];
}> {
  const config = await this.getBonusAutoApprovalConfig();
  
  if (!config.autoBonusApproval) {
    return {
      eligible: false,
      reasons: ['Auto bonus approval is disabled']
    };
  }

  const reasons: string[] = [];

  // Check bonus amount limit
  if (bonusAmount > config.maxAutoApprovalAmount) {
    reasons.push(`Bonus amount ${bonusAmount} BDT exceeds maximum auto approval limit of ${config.maxAutoApprovalAmount} BDT`);
  }

  // Check user account status
  if (user.status !== 'Active') {
    reasons.push('User account is not active');
  }

  // Check KYC status
  if (user.kycStatus !== 'Approved') {
    reasons.push('User KYC verification is not approved');
  }

  // Check email verification
  if (!user.emailVerified) {
    reasons.push('User email is not verified');
  }

  // Check phone verification
  if (!user.phoneVerified) {
    reasons.push('User phone is not verified');
  }

  // Check account age
  const accountAgeDays = Math.floor(
    (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  );
  if (accountAgeDays < config.minAccountAgeDays) {
    reasons.push(`Account age ${accountAgeDays} days is below minimum ${config.minAccountAgeDays} days`);
  }

  // Check total deposits (user should have totalDeposits field)
  const userTotalDeposits = user.totalDeposits || 0;
  if (userTotalDeposits < config.minTotalDeposits) {
    reasons.push(`Total deposits ${userTotalDeposits} BDT below minimum ${config.minTotalDeposits} BDT`);
  }

  return {
    eligible: reasons.length === 0,
    reasons
  };
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
 * Get bonus auto-approval configuration
 */
static async getBonusApprovalConfig(): Promise<{
  autoApproval: boolean;
  maxAutoAmount: number;
  autoSignupBonus: boolean;
  autoProfitBonus: boolean;
  dailyLimit: number;
}> {
  const settings = await getSettings([
    'auto_bonus_approval',
    'max_auto_bonus_amount',
    'auto_signup_bonus',
    'auto_profit_bonus',
    'bonus_daily_limit'
  ]);

  return {
    autoApproval: settings.auto_bonus_approval || false,
    maxAutoAmount: settings.max_auto_bonus_amount || 1000,
    autoSignupBonus: settings.auto_signup_bonus || true,
    autoProfitBonus: settings.auto_profit_bonus || true,
    dailyLimit: settings.bonus_daily_limit || 5000
  };
}

/**
 * Check if bonus is eligible for auto-approval
 */
static async isBonusEligibleForAutoApproval(
  bonusAmount: number,
  bonusType: 'signup' | 'profit_share'
): Promise<{ eligible: boolean; reason?: string }> {
  const config = await this.getBonusApprovalConfig();
  
  if (!config.autoApproval) {
    return { eligible: false, reason: 'Auto-approval disabled' };
  }

  if (bonusAmount > config.maxAutoAmount) {
    return { eligible: false, reason: 'Amount exceeds auto-approval limit' };
  }

  if (bonusType === 'signup' && !config.autoSignupBonus) {
    return { eligible: false, reason: 'Signup bonus auto-approval disabled' };
  }
  
  if (bonusType === 'profit_share' && !config.autoProfitBonus) {
    return { eligible: false, reason: 'Profit bonus auto-approval disabled' };
  }

  return { eligible: true };
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
