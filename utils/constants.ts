export const APP_INFO = {
  NAME: 'Financial Admin Panel',
  VERSION: '1.0.0',
  DESCRIPTION: 'Comprehensive financial management system with loan features',
  AUTHOR: 'Financial Team',
  LICENSE: 'MIT',
  GITHUB: 'https://github.com/company/financial-admin-panel',
  SUPPORT_EMAIL: 'support@financialapp.com',
  COMPANY: 'Financial Solutions Inc.'
} as const;

// Environment Configuration
export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  MONGODB_URI: process.env.MONGODB_URI || '',
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || '',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
} as const;

// Currency Configuration
export const CURRENCY = {
  PRIMARY: 'BDT' as const,
  SECONDARY: 'USD' as const,
  EXCHANGE_RATE: {
    USD_TO_BDT: 120,
    BDT_TO_USD: 1/120
  },
  SYMBOLS: {
    BDT: '৳',
    USD: '$'
  },
  DECIMALS: {
    BDT: 0,
    USD: 2
  }
} as const;

// Plan Configuration
export const PLANS = {
  FREE: {
    id: 'free',
    name: 'Free',
    price: 0,
    currency: 'BDT' as const,
    depositLimit: 10000,
    withdrawalLimit: 5000,
    profitLimit: 1000,
    minimumDeposit: 100,
    minimumWithdrawal: 100,
    dailyWithdrawalLimit: 1000,
    monthlyWithdrawalLimit: 10000,
    color: '#6b7280',
    priority: 0
  },
  SILVER: {
    id: 'silver',
    name: 'Silver',
    price: 1000,
    currency: 'BDT' as const,
    depositLimit: 50000,
    withdrawalLimit: 25000,
    profitLimit: 5000,
    minimumDeposit: 500,
    minimumWithdrawal: 100,
    dailyWithdrawalLimit: 5000,
    monthlyWithdrawalLimit: 50000,
    color: '#9ca3af',
    priority: 1
  },
  GOLD: {
    id: 'gold',
    name: 'Gold',
    price: 5000,
    currency: 'BDT' as const,
    depositLimit: 200000,
    withdrawalLimit: 100000,
    profitLimit: 20000,
    minimumDeposit: 1000,
    minimumWithdrawal: 100,
    dailyWithdrawalLimit: 20000,
    monthlyWithdrawalLimit: 200000,
    color: '#f59e0b',
    priority: 2
  },
  PLATINUM: {
    id: 'platinum',
    name: 'Platinum',
    price: 15000,
    currency: 'BDT' as const,
    depositLimit: 500000,
    withdrawalLimit: 250000,
    profitLimit: 50000,
    minimumDeposit: 2000,
    minimumWithdrawal: 100,
    dailyWithdrawalLimit: 50000,
    monthlyWithdrawalLimit: 500000,
    color: '#6366f1',
    priority: 3
  },
  DIAMOND: {
    id: 'diamond',
    name: 'Diamond',
    price: 50000,
    currency: 'BDT' as const,
    depositLimit: 2000000,
    withdrawalLimit: 1000000,
    profitLimit: 200000,
    minimumDeposit: 5000,
    minimumWithdrawal: 100,
    dailyWithdrawalLimit: 200000,
    monthlyWithdrawalLimit: 2000000,
    color: '#8b5cf6',
    priority: 4
  }
} as const;

// Transaction Configuration
export const TRANSACTION_CONFIG = {
  MINIMUM_AMOUNTS: {
    DEPOSIT: 10,
    WITHDRAWAL: 100
  },
  MAXIMUM_AMOUNTS: {
    DAILY_WITHDRAWAL: 100000,
    MONTHLY_WITHDRAWAL: 500000,
    SINGLE_TRANSACTION: 1000000
  },
  FEES: {
    WITHDRAWAL_PERCENTAGE: 0.02, // 2%
    MINIMUM_WITHDRAWAL_FEE: 10,
    MAXIMUM_WITHDRAWAL_FEE: 500,
    DEPOSIT_FEE: 0
  },
  PROCESSING_TIMES: {
    MANUAL_DEPOSIT: '2-24 hours',
    AUTOMATIC_DEPOSIT: 'Instant',
    WITHDRAWAL: '2-3 business days'
  }
} as const;

// Loan Configuration
export const LOAN_CONFIG = {
  AMOUNTS: {
    MINIMUM: 500,
    MAXIMUM: 5500, // $5,500 as per requirement
    DEFAULT: 1000
  },
  INTEREST_RATES: {
    MINIMUM: 8,
    MAXIMUM: 25,
    DEFAULT: 12
  },
  TENURE: {
    MINIMUM_MONTHS: 6,
    MAXIMUM_MONTHS: 60,
    DEFAULT_MONTHS: 12
  },
  CREDIT_SCORE: {
    MINIMUM: 300,
    MAXIMUM: 850,
    EXCELLENT: 750,
    GOOD: 650,
    FAIR: 550,
    POOR: 450
  },
  PROCESSING_FEE: 2, // 2% of loan amount
  EARLY_PAYMENT_PENALTY: 3, // 3% of remaining amount
  LATE_PAYMENT_PENALTY: 5 // 5% of overdue amount
} as const;

// Referral Configuration
export const REFERRAL_CONFIG = {
  SIGNUP_BONUS: 100, // BDT
  PROFIT_SHARE_PERCENTAGE: 10, // 10%
  MINIMUM_REFEREE_DEPOSIT: 50,
  MAXIMUM_REFERRALS_PER_USER: 100,
  REFERRAL_CODE_LENGTH: 8,
  BONUS_EXPIRY_DAYS: 30
} as const;

// KYC Configuration
export const KYC_CONFIG = {
  DOCUMENT_TYPES: [
    'national_id',
    'passport',
    'driving_license',
    'utility_bill',
    'bank_statement',
    'selfie_with_id'
  ],
  MAXIMUM_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_FORMATS: ['jpg', 'jpeg', 'png', 'pdf'],
  VERIFICATION_LEVELS: {
    BASIC: 'Basic verification with ID',
    ADVANCED: 'Advanced verification with address proof',
    PREMIUM: 'Premium verification with income proof'
  }
} as const;

// Task Configuration
export const TASK_CONFIG = {
  CATEGORIES: [
    'Social Media',
    'App Installation', 
    'Survey',
    'Review',
    'Referral',
    'Video Watch',
    'Article Read',
    'Registration'
  ],
  DIFFICULTIES: ['Easy', 'Medium', 'Hard'],
  REWARD_RANGES: {
    EASY: { min: 10, max: 50 },
    MEDIUM: { min: 50, max: 150 },
    HARD: { min: 150, max: 500 }
  },
  TIME_ESTIMATES: {
    EASY: 5, // 5 minutes
    MEDIUM: 15, // 15 minutes
    HARD: 30 // 30 minutes
  }
} as const;

// Notification Configuration
export const NOTIFICATION_CONFIG = {
  TYPES: [
    'KYC',
    'Withdrawal',
    'Loan',
    'Task',
    'Referral',
    'System',
    'Marketing'
  ],
  CHANNELS: ['email', 'sms', 'in_app', 'push'],
  PRIORITIES: ['Low', 'Medium', 'High', 'Urgent'],
  DEFAULT_RETRY_COUNT: 3,
  RETRY_INTERVALS: [5, 15, 60], // minutes
  BATCH_SIZE: 100
} as const;

// API Configuration
export const API_CONFIG = {
  BASE_URL: '/api',
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
  RATE_LIMITS: {
    AUTH: { requests: 5, window: 15 * 60 * 1000 }, // 5 requests per 15 minutes
    API: { requests: 100, window: 60 * 1000 }, // 100 requests per minute
    UPLOAD: { requests: 10, window: 60 * 1000 } // 10 uploads per minute
  }
} as const;

// File Upload Configuration
export const UPLOAD_CONFIG = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ],
  STORAGE: {
    BUCKET: 'uploads',
    PATH: '/uploads',
    CDN_URL: process.env.CDN_URL || ''
  }
} as const;

// Validation Rules
export const VALIDATION_RULES = {
  PASSWORD: {
    MIN_LENGTH: 8,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBER: true,
    REQUIRE_SPECIAL: true
  },
  EMAIL: {
    MAX_LENGTH: 254,
    REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  PHONE: {
    MIN_LENGTH: 10,
    MAX_LENGTH: 15,
    REGEX: /^\+?[1-9]\d{1,14}$/
  },
  NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 50,
    REGEX: /^[a-zA-Z\s]+$/
  }
} as const;

// Date/Time Configuration
export const DATE_CONFIG = {
  FORMATS: {
    SHORT: 'MMM dd, yyyy',
    LONG: 'MMMM dd, yyyy',
    DATETIME: 'MMM dd, yyyy HH:mm',
    TIME: 'HH:mm:ss'
  },
  TIMEZONES: {
    DEFAULT: 'Asia/Dhaka',
    UTC: 'UTC'
  },
  BUSINESS_HOURS: {
    START: 9, // 9 AM
    END: 17, // 5 PM
    TIMEZONE: 'Asia/Dhaka'
  }
} as const;

// Status and State Constants
export const STATUS = {
  USER: ['Active', 'Suspended', 'Banned'] as const,
  KYC: ['Pending', 'Approved', 'Rejected'] as const,
  TRANSACTION: ['Pending', 'Approved', 'Rejected', 'Processing', 'Failed'] as const,
  LOAN: ['Pending', 'Approved', 'Rejected', 'Active', 'Completed', 'Defaulted'] as const,
  TASK: ['Active', 'Inactive', 'Paused'] as const,
  NOTIFICATION: ['Pending', 'Sent', 'Delivered', 'Failed', 'Read'] as const,
  SUPPORT_TICKET: ['Open', 'In Progress', 'Waiting for User', 'Resolved', 'Closed'] as const
} as const;

// Color Themes
export const COLORS = {
  STATUS: {
    SUCCESS: '#22c55e',
    WARNING: '#f59e0b',
    ERROR: '#ef4444',
    INFO: '#3b82f6',
    NEUTRAL: '#6b7280'
  },
  PLAN: {
    FREE: '#6b7280',
    SILVER: '#9ca3af',
    GOLD: '#f59e0b',
    PLATINUM: '#6366f1',
    DIAMOND: '#8b5cf6'
  },
  CHART: [
    '#3b82f6', '#ef4444', '#22c55e', '#f59e0b',
    '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
  ]
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  GENERIC: 'An unexpected error occurred',
  NETWORK: 'Network connection failed',
  UNAUTHORIZED: 'Authentication required',
  FORBIDDEN: 'Insufficient permissions',
  NOT_FOUND: 'Resource not found',
  VALIDATION: 'Invalid input data',
  TIMEOUT: 'Request timeout',
  SERVER_ERROR: 'Internal server error',
  DEVICE_LIMIT: 'Multiple accounts detected. Contact support.',
  INVALID_2FA: 'Invalid 2FA token',
  EXPIRED_TOKEN: 'Token has expired'
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  LOGIN: 'Login successful',
  LOGOUT: 'Logged out successfully',
  CREATED: 'Created successfully',
  UPDATED: 'Updated successfully',
  DELETED: 'Deleted successfully',
  APPROVED: 'Approved successfully',
  REJECTED: 'Rejected successfully',
  EMAIL_SENT: 'Email sent successfully',
  PASSWORD_RESET: 'Password reset successfully',
  TWO_FA_ENABLED: '2FA enabled successfully'
} as const;