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
      const value = (setting && !Array.isArray(setting)) ? setting.value : fallback;

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
// BUSINESS RULES HELPER - Based on actual settings data
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
  }> {
    const settings = await getSettings([
      'primary_currency',
      'usd_to_bdt_rate',
      'min_deposit',
      'signup_bonus'
    ]);

    return {
      primaryCurrency: settings.primary_currency || 'BDT',
      usdToBdtRate: settings.usd_to_bdt_rate || 110.50,
      minDeposit: settings.min_deposit || 100,
      signupBonus: settings.signup_bonus || 100
    };
  }

  /**
   * Get security configuration
   */
  static async getSecurityConfig(): Promise<{
    deviceLimitPerUser: number;
    sessionTimeoutMinutes: number;
    maxFailedLoginAttempts: number;
  }> {
    const settings = await getSettings([
      'device_limit_per_user',
      'session_timeout_minutes',
      'max_failed_login_attempts'
    ]);

    return {
      deviceLimitPerUser: settings.device_limit_per_user || 1,
      sessionTimeoutMinutes: settings.session_timeout_minutes || 30,
      maxFailedLoginAttempts: settings.max_failed_login_attempts || 5
    };
  }

  /**
   * Get email configuration
   */
  static async getEmailConfig(): Promise<{
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
  }> {
    const settings = await getSettings([
      'smtp_host',
      'smtp_port',
      'smtp_user'
    ]);

    return {
      smtpHost: settings.smtp_host || 'smtp.gmail.com',
      smtpPort: settings.smtp_port || 587,
      smtpUser: settings.smtp_user || ''
    };
  }

  /**
   * Get upload configuration
   */
  static async getUploadConfig(): Promise<{
    maxFileSizeMb: number;
    allowedFileTypes: string[];
  }> {
    const settings = await getSettings([
      'max_file_size_mb',
      'allowed_file_types'
    ]);

    return {
      maxFileSizeMb: settings.max_file_size_mb || 10,
      allowedFileTypes: settings.allowed_file_types || ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx']
    };
  }

  /**
   * Get business configuration
   */
  static async getBusinessConfig(): Promise<{
    autoKycApproval: boolean;
    maxTasksPerUser: number;
  }> {
    const settings = await getSettings([
      'auto_kyc_approval',
      'max_tasks_per_user'
    ]);

    return {
      autoKycApproval: settings.auto_kyc_approval || false,
      maxTasksPerUser: settings.max_tasks_per_user || 10
    };
  }

  /**
   * Get withdrawal configuration
   */
  static async getWithdrawalConfig(): Promise<{
    bankTransferFeePercentage: number;
    bankTransferMinFee: number;
    mobileBankingFeePercentage: number;
    cryptoWalletFeePercentage: number;
    checkFlatFee: number;
    urgentProcessingFeePercentage: number;
    processingTimes: {
      bankTransfer: string;
      mobileBanking: string;
      cryptoWallet: string;
      check: string;
      urgent: string;
    };
  }> {
    const settings = await getSettings([
      'withdrawal_bank_fee_percentage',
      'withdrawal_bank_min_fee',
      'withdrawal_mobile_fee_percentage',
      'withdrawal_crypto_fee_percentage',
      'withdrawal_check_flat_fee',
      'withdrawal_urgent_fee_percentage',
      'withdrawal_processing_time_bank',
      'withdrawal_processing_time_mobile',
      'withdrawal_processing_time_crypto',
      'withdrawal_processing_time_check',
      'withdrawal_processing_time_urgent'
    ]);

    return {
      bankTransferFeePercentage: settings.withdrawal_bank_fee_percentage || 0.02, // 2%
      bankTransferMinFee: settings.withdrawal_bank_min_fee || 5, // $5 minimum
      mobileBankingFeePercentage: settings.withdrawal_mobile_fee_percentage || 0.015, // 1.5%
      cryptoWalletFeePercentage: settings.withdrawal_crypto_fee_percentage || 0.01, // 1%
      checkFlatFee: settings.withdrawal_check_flat_fee || 10, // $10 flat fee
      urgentProcessingFeePercentage: settings.withdrawal_urgent_fee_percentage || 0.005, // 0.5%
      processingTimes: {
        bankTransfer: settings.withdrawal_processing_time_bank || '1-3 business days',
        mobileBanking: settings.withdrawal_processing_time_mobile || '2-4 hours',
        cryptoWallet: settings.withdrawal_processing_time_crypto || '4-6 hours',
        check: settings.withdrawal_processing_time_check || '5-7 business days',
        urgent: settings.withdrawal_processing_time_urgent || '1-2 hours'
      }
    };
  }

  /**
   * Calculate withdrawal fees based on method and amount
   */
  static async calculateWithdrawalFee(
    method: string, 
    amount: number, 
    isUrgent: boolean = false
  ): Promise<{ fee: number; netAmount: number; breakdown: any }> {
    const config = await this.getWithdrawalConfig();
    let baseFee = 0;

    switch (method) {
      case 'bank_transfer':
        baseFee = Math.max(amount * config.bankTransferFeePercentage, config.bankTransferMinFee);
        break;
      case 'mobile_banking':
        baseFee = amount * config.mobileBankingFeePercentage;
        break;
      case 'crypto_wallet':
        baseFee = amount * config.cryptoWalletFeePercentage;
        break;
      case 'check':
        baseFee = config.checkFlatFee;
        break;
      default:
        baseFee = 0;
    }

    const urgentFee = isUrgent ? amount * config.urgentProcessingFeePercentage : 0;
    const totalFee = baseFee + urgentFee;
    const netAmount = amount - totalFee;

    return {
      fee: totalFee,
      netAmount,
      breakdown: {
        baseFee,
        urgentFee,
        method,
        isUrgent,
        feeRates: {
          base: method === 'bank_transfer' ? config.bankTransferFeePercentage : 
                method === 'mobile_banking' ? config.mobileBankingFeePercentage :
                method === 'crypto_wallet' ? config.cryptoWalletFeePercentage : 0,
          urgent: config.urgentProcessingFeePercentage
        }
      }
    };
  }

  /**
   * Get processing time estimate for withdrawal method
   */
  static async getWithdrawalProcessingTime(method: string, isUrgent: boolean = false): Promise<string> {
    const config = await this.getWithdrawalConfig();
    
    if (isUrgent) {
      return config.processingTimes.urgent;
    }

    switch (method) {
      case 'bank_transfer':
        return config.processingTimes.bankTransfer;
      case 'mobile_banking':
        return config.processingTimes.mobileBanking;
      case 'crypto_wallet':
        return config.processingTimes.cryptoWallet;
      case 'check':
        return config.processingTimes.check;
      default:
        return '1-3 business days';
    }
  }

  /**
   * Get API configuration
   */
  static async getApiConfig(): Promise<{
    apiTimeoutSeconds: number;
  }> {
    const settings = await getSettings([
      'api_timeout_seconds'
    ]);

    return {
      apiTimeoutSeconds: settings.api_timeout_seconds || 30
    };
  }

  /**
   * Get maintenance configuration
   */
  static async getMaintenanceConfig(): Promise<{
    autoBackupEnabled: boolean;
  }> {
    const settings = await getSettings([
      'auto_backup_enabled'
    ]);

    return {
      autoBackupEnabled: settings.auto_backup_enabled || true
    };
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
   * Check if user can upload file
   */
  static async validateFileUpload(
    fileName: string, 
    fileSizeMb: number
  ): Promise<{ valid: boolean; error?: string }> {
    const uploadConfig = await this.getUploadConfig();
    
    // Check file size
    if (fileSizeMb > uploadConfig.maxFileSizeMb) {
      return {
        valid: false,
        error: `File size exceeds maximum limit of ${uploadConfig.maxFileSizeMb}MB`
      };
    }

    // Check file type
    const fileExtension = fileName.split('.').pop()?.toLowerCase();
    if (!fileExtension || !uploadConfig.allowedFileTypes.includes(fileExtension)) {
      return {
        valid: false,
        error: `File type not allowed. Allowed types: ${uploadConfig.allowedFileTypes.join(', ')}`
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
   * Get session timeout in minutes
   */
  static async getSessionTimeout(): Promise<number> {
    return await getSetting('session_timeout_minutes', 30);
  }

  /**
   * Get max failed login attempts
   */
  static async getMaxFailedLogins(): Promise<number> {
    return await getSetting('max_failed_login_attempts', 5);
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
   * Get max tasks per user
   */
  static async getMaxTasksPerUser(): Promise<number> {
    return await getSetting('max_tasks_per_user', 10);
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
}