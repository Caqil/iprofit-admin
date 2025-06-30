// types/settings.ts
import { BaseEntity, Currency } from './index';

export type SettingCategory = 
  | 'system' 
  | 'financial' 
  | 'security' 
  | 'email' 
  | 'upload' 
  | 'business' 
  | 'maintenance'
  | 'api';

export type SettingDataType = 'string' | 'number' | 'boolean' | 'object' | 'array';

export interface Setting extends BaseEntity {
  category: SettingCategory;
  key: string;
  value: any;
  dataType: SettingDataType;
  description: string;
  isEditable: boolean;
  isEncrypted: boolean;
  defaultValue?: any;
  validation?: {
    required?: boolean;
    min?: number;
    max?: number;
    pattern?: string;
    enum?: string[];
  };
  updatedBy: string;
}

export interface SettingForm {
  category: SettingCategory;
  key: string;
  value: any;
  description: string;
  isEditable: boolean;
  validation?: {
    required?: boolean;
    min?: number;
    max?: number;
    pattern?: string;
    enum?: string[];
  };
}

export interface SettingUpdate {
  value: any;
  updatedBy: string;
}

// System Settings interfaces
export interface SystemSettings {
  appName: string;
  appVersion: string;
  appDescription: string;
  supportEmail: string;
  companyName: string;
  companyAddress?: string;
  maintenanceMode: boolean;
  maintenanceMessage?: string;
}

// Financial Settings interfaces
export interface FinancialSettings {
  primaryCurrency: Currency;
  secondaryCurrency: Currency;
  usdToBdtRate: number;
  bdtToUsdRate: number;
  minDeposit: number;
  minWithdrawal: number;
  maxDailyWithdrawal: number;
  maxMonthlyWithdrawal: number;
  signupBonus: number;
  profitSharePercentage: number;
  minRefereeDeposit: number;
}

// Security Settings interfaces
export interface SecuritySettings {
  enable2FA: boolean;
  enableDeviceLimiting: boolean;
  enableEmailVerification: boolean;
  sessionTimeout: number; // in minutes
  maxLoginAttempts: number;
  lockoutDuration: number; // in minutes
  passwordMinLength: number;
  passwordRequireUppercase: boolean;
  passwordRequireLowercase: boolean;
  passwordRequireNumbers: boolean;
  passwordRequireSpecialChars: boolean;
}

// Email Settings interfaces
export interface EmailSettings {
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPassword: string; // encrypted
  emailFromName: string;
  emailFromAddress: string;
  maxConnections: number;
  maxMessages: number;
  maxRetries: number;
  retryDelay: number;
  dailyEmailLimit: number;
  hourlyEmailLimit: number;
}

// Rate Limiting Settings interfaces
export interface RateLimitSettings {
  authRequests: number;
  authWindow: number; // in milliseconds
  apiRequests: number;
  apiWindow: number; // in milliseconds
  uploadRequests: number;
  uploadWindow: number; // in milliseconds
}

// Upload Settings interfaces
export interface UploadSettings {
  maxFileSize: number; // in bytes
  allowedFileTypes: string[];
  uploadPath: string;
  cdnUrl?: string;
  enableVirusScan: boolean;
}

// Business Settings interfaces
export interface BusinessSettings {
  kycDocumentTypes: string[];
  taskCategories: string[];
  supportCategories: string[];
  defaultPlanId?: string;
  autoKycApproval: boolean;
  autoWithdrawalApproval: boolean;
  maxTasksPerUser: number;
}

// Feature Flags interfaces
export interface FeatureFlags {
  enableLoanFeature: boolean;
  enableReferralSystem: boolean;
  enableTaskSystem: boolean;
  enableNewsModule: boolean;
  enableSupportChat: boolean;
  enableAnalytics: boolean;
  enableAuditLogs: boolean;
}

// API Settings interfaces
export interface ApiSettings {
  baseUrl: string;
  timeout: number; // in milliseconds
  retryAttempts: number;
  retryDelay: number; // in milliseconds
  enableSwagger: boolean;
  enableCors: boolean;
  corsOrigins: string[];
}

// Settings filters and queries
export interface SettingFilter {
  category?: SettingCategory;
  isEditable?: boolean;
  search?: string;
}

export type SettingsGroupedByCategory = {
  [key in SettingCategory]?: Setting[];
};

// Settings response types
export interface SettingsOverview {
  totalSettings: number;
  categories: {
    category: SettingCategory;
    count: number;
    lastUpdated?: Date;
  }[];
  recentUpdates: {
    setting: Setting;
    updatedBy: string;
    updatedAt: Date;
  }[];
}

export interface SettingHistory {
  id: string;
  settingId: string;
  oldValue: any;
  newValue: any;
  updatedBy: string;
  updatedAt: Date;
  reason?: string;
}

// Bulk operations
export interface BulkSettingUpdate {
  settings: {
    id: string;
    value: any;
  }[];
  updatedBy: string;
  reason?: string;
}

export interface SettingBackup {
  id: string;
  name: string;
  description?: string;
  settings: Setting[];
  createdBy: string;
  createdAt: Date;
}

export interface SettingRestore {
  backupId: string;
  restoredBy: string;
  reason?: string;
}