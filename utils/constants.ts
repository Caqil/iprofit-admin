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

export const LOAN_CONFIG = {
  AMOUNTS: {
    MINIMUM: 500,
    MAXIMUM: 5500,
    DEFAULT: 1000
  },
  INTEREST_RATES: {
    MINIMUM: 8,
    MAXIMUM: 25,
    DEFAULT_ADMIN: 12,
    DEFAULT_USER: 15
  },
  TENURE: {
    MINIMUM_MONTHS: 6,
    MAXIMUM_MONTHS: 60,
    DEFAULT_MONTHS: 24
  },
  ELIGIBILITY: {
    MIN_MONTHLY_INCOME: 1000,
    MIN_CREDIT_SCORE: 500,
    MAX_DEBT_TO_INCOME_RATIO: 0.4, // 40%
    MIN_AGE: 18,
    MAX_AGE: 65
  },
  PROCESSING: {
    EXPECTED_DAYS: 5,
    MAX_PENDING_DAYS: 30
  }
};

export const LOAN_STATUSES = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  DEFAULTED: 'Defaulted'
} as const;

export const REPAYMENT_STATUSES = {
  PENDING: 'Pending',
  PAID: 'Paid',
  OVERDUE: 'Overdue'
} as const;


export const EMPLOYMENT_STATUSES = [
  'Full-time Employee',
  'Part-time Employee',
  'Self-employed',
  'Business Owner',
  'Freelancer',
  'Contract Worker',
  'Retired',
  'Student',
  'Unemployed'
];

export const COLLATERAL_TYPES = [
  'Real Estate',
  'Vehicle',
  'Fixed Deposits',
  'Securities',
  'Jewelry',
  'Equipment',
  'Inventory',
  'Other'
];

export const CREDIT_SCORE_RANGES = {
  EXCELLENT: { min: 750, max: 850, label: 'Excellent' },
  GOOD: { min: 650, max: 749, label: 'Good' },
  FAIR: { min: 550, max: 649, label: 'Fair' },
  POOR: { min: 300, max: 549, label: 'Poor' }
};

export const RISK_LEVELS = {
  LOW: { score: 0, color: 'green', label: 'Low Risk' },
  MEDIUM: { score: 25, color: 'yellow', label: 'Medium Risk' },
  HIGH: { score: 50, color: 'orange', label: 'High Risk' },
  VERY_HIGH: { score: 75, color: 'red', label: 'Very High Risk' }
};

export const LOAN_MESSAGES = {
  APPLICATION_SUBMITTED: 'Your loan application has been submitted successfully. We will review it within 3-5 business days.',
  APPLICATION_APPROVED: 'Congratulations! Your loan application has been approved.',
  APPLICATION_REJECTED: 'We regret to inform you that your loan application has been rejected.',
  PAYMENT_RECORDED: 'Your payment has been recorded successfully.',
  PAYMENT_OVERDUE: 'Your payment is overdue. Please make the payment as soon as possible to avoid penalties.',
  LOAN_COMPLETED: 'Congratulations! You have successfully completed your loan repayment.'
};

// Validation messages
export const LOAN_VALIDATION_MESSAGES = {
  AMOUNT_REQUIRED: 'Loan amount is required',
  AMOUNT_MIN: `Minimum loan amount is ${LOAN_CONFIG.AMOUNTS.MINIMUM}`,
  AMOUNT_MAX: `Maximum loan amount is ${LOAN_CONFIG.AMOUNTS.MAXIMUM}`,
  PURPOSE_REQUIRED: 'Loan purpose is required',
  PURPOSE_MIN_LENGTH: 'Purpose must be at least 10 characters',
  TENURE_REQUIRED: 'Loan tenure is required',
  TENURE_MIN: `Minimum tenure is ${LOAN_CONFIG.TENURE.MINIMUM_MONTHS} months`,
  TENURE_MAX: `Maximum tenure is ${LOAN_CONFIG.TENURE.MAXIMUM_MONTHS} months`,
  INCOME_REQUIRED: 'Monthly income is required',
  INCOME_MIN: `Minimum monthly income is ${LOAN_CONFIG.ELIGIBILITY.MIN_MONTHLY_INCOME}`,
  EMPLOYMENT_REQUIRED: 'Employment status is required',
  DOCUMENTS_REQUIRED: 'At least one document is required'
};


export const LOAN_CONSTANTS = {
  // Loan limits
  MIN_LOAN_AMOUNT: 500,
  MAX_LOAN_AMOUNT: 50000,
  DEFAULT_MAX_AMOUNT: 5500, // For regular users
  
  // Interest rates
  MIN_INTEREST_RATE: 8,
  MAX_INTEREST_RATE: 25,
  DEFAULT_INTEREST_RATES: {
    EXCELLENT: 12, // Credit score >= 750
    GOOD: 15,      // Credit score >= 700
    FAIR: 18,      // Credit score >= 650
    POOR: 20       // Credit score < 650
  },
  
  // Tenure (in months)
  MIN_TENURE: 6,
  MAX_TENURE: 60,
  DEFAULT_TENURE: 12,
  
  // Credit score thresholds
  CREDIT_SCORE: {
    EXCELLENT: 750,
    GOOD: 700,
    FAIR: 650,
    POOR: 600,
    MINIMUM_REQUIRED: 550
  },
  
  // Income requirements
  MIN_MONTHLY_INCOME: 1000,
  DEBT_TO_INCOME_RATIO_MAX: 0.4, // 40%
  
  // Processing times
  PROCESSING_TIME: {
    STANDARD: '3-5 business days',
    EXPRESS: '24-48 hours',
    PREMIUM: '12-24 hours'
  },
  
  // Payment related
  LATE_PAYMENT_GRACE_DAYS: 3,
  PENALTY_RATE: 2, // 2% of overdue amount
  MAX_OVERDUE_DAYS: 90,
  
  // Email notification schedules (days before due date)
  REMINDER_SCHEDULE: {
    FIRST_REMINDER: 7,
    SECOND_REMINDER: 3,
    FINAL_REMINDER: 1,
    OVERDUE_NOTIFICATION: 0 // On due date
  }
} as const;

export const LOAN_STATUS = {
  PENDING: 'Pending',
  APPROVED: 'Approved', 
  REJECTED: 'Rejected',
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  DEFAULTED: 'Defaulted'
} as const;

export const INSTALLMENT_STATUS = {
  PENDING: 'Pending',
  PAID: 'Paid',
  OVERDUE: 'Overdue',
  PARTIAL: 'Partial'
} as const;

export const LOAN_PURPOSES = [
  'Personal Expenses',
  'Home Improvement',
  'Medical Emergency',
  'Education',
  'Business Investment',
  'Debt Consolidation',
  'Travel',
  'Wedding',
  'Vehicle Purchase',
  'Other'
] as const;

export const EMPLOYMENT_TYPES = [
  'Full-time Employee',
  'Part-time Employee',
  'Self-employed',
  'Business Owner',
  'Freelancer',
  'Retired',
  'Student',
  'Unemployed'
] as const;

export const MARITAL_STATUS = [
  'Single',
  'Married',
  'Divorced',
  'Widowed'
] as const;

export const EDUCATION_LEVELS = [
  'High School',
  'Bachelor\'s Degree',
  'Master\'s Degree',
  'PhD',
  'Professional Degree',
  'Trade School',
  'Other'
] as const;

export const PAYMENT_METHODS = [
  'Bank Transfer',
  'Credit Card',
  'Debit Card',
  'Mobile Wallet',
  'Cash',
  'Check',
  'Manual'
] as const;

export const DOCUMENT_TYPES = [
  'Identity Proof',
  'Address Proof',
  'Income Certificate',
  'Bank Statement',
  'Employment Letter',
  'Tax Return',
  'Other'
] as const;

export const LOAN_API_ENDPOINTS = {
  LIST: '/api/loans',
  CREATE: '/api/loans',
  GET_BY_ID: '/api/loans/[id]',
  UPDATE: '/api/loans/[id]',
  DELETE: '/api/loans/[id]',
  APPLICATIONS: '/api/loans/applications',
  EMI_CALCULATOR: '/api/loans/emi-calculator',
  REPAYMENT: '/api/loans/[id]/repayment',
  ANALYTICS: '/api/loans/analytics'
} as const;

export const LOAN_PERMISSIONS = {
  VIEW: 'loans.view',
  CREATE: 'loans.create',
  UPDATE: 'loans.update',
  DELETE: 'loans.delete',
  APPROVE: 'loans.approve',
  DISBURSE: 'loans.disburse',
  RECORD_PAYMENT: 'loans.record_payment'
} as const;

// Credit score calculation weights
export const CREDIT_SCORE_WEIGHTS = {
  INCOME: 0.25,
  EMPLOYMENT_STABILITY: 0.20,
  EXISTING_DEBT: 0.20,
  PAYMENT_HISTORY: 0.15,
  BANK_BALANCE: 0.10,
  AGE: 0.05,
  COLLATERAL: 0.05
} as const;

// Email template mappings
export const LOAN_EMAIL_EVENTS = {
  APPLICATION_RECEIVED: 'loan-application-received',
  APPLICATION_APPROVED: 'loan-approved',
  APPLICATION_REJECTED: 'loan-rejected',
  LOAN_DISBURSED: 'loan-disbursed',
  LOAN_COMPLETED: 'loan-completed',
  PAYMENT_CONFIRMED: 'loan-payment-confirmed',
  PAYMENT_REMINDER: 'loan-payment-reminder',
  PAYMENT_OVERDUE: 'loan-payment-overdue',
  EMI_CALCULATION: 'emi-calculation-results',
  SCHEDULE_UPDATED: 'repayment-schedule-updated',
  LOAN_CANCELLED: 'loan-cancelled',
  LOAN_DEFAULTED: 'loan-defaulted',
  
  // Admin notifications
  ADMIN_NEW_APPLICATION: 'admin-loan-application-notification',
  ADMIN_PAYMENT_RECEIVED: 'admin-payment-notification',
  ADMIN_STATUS_UPDATE: 'admin-loan-status-update'
} as const;

// Validation rules
export const LOAN_VALIDATION_RULES = {
  AMOUNT: {
    MIN: LOAN_CONSTANTS.MIN_LOAN_AMOUNT,
    MAX: LOAN_CONSTANTS.MAX_LOAN_AMOUNT
  },
  TENURE: {
    MIN: LOAN_CONSTANTS.MIN_TENURE,
    MAX: LOAN_CONSTANTS.MAX_TENURE
  },
  INTEREST_RATE: {
    MIN: LOAN_CONSTANTS.MIN_INTEREST_RATE,
    MAX: LOAN_CONSTANTS.MAX_INTEREST_RATE
  },
  INCOME: {
    MIN: LOAN_CONSTANTS.MIN_MONTHLY_INCOME
  },
  CREDIT_SCORE: {
    MIN: LOAN_CONSTANTS.CREDIT_SCORE.MINIMUM_REQUIRED,
    MAX: 850
  }
} as const;

// Loan analytics categories
export const LOAN_ANALYTICS = {
  METRICS: [
    'total_loans',
    'active_loans', 
    'completed_loans',
    'overdue_loans',
    'total_disbursed',
    'total_collected',
    'average_loan_amount',
    'average_interest_rate',
    'default_rate'
  ],
  TIME_PERIODS: [
    'today',
    'week',
    'month',
    'quarter',
    'year',
    'all_time'
  ],
  CHART_TYPES: [
    'loan_trends',
    'status_distribution',
    'amount_ranges',
    'interest_rate_distribution',
    'repayment_performance'
  ]
} as const;

// Risk assessment categories
export const RISK_CATEGORIES = {
  LOW: 'Low Risk',
  MEDIUM: 'Medium Risk', 
  HIGH: 'High Risk',
  VERY_HIGH: 'Very High Risk'
} as const;

// Auto-approval rules
export const AUTO_APPROVAL_RULES = {
  CREDIT_SCORE_THRESHOLD: 700,
  MAX_AUTO_APPROVAL_AMOUNT: 2000,
  DEBT_TO_INCOME_RATIO: 0.3,
  MIN_EMPLOYMENT_MONTHS: 12,
  MIN_BANK_BALANCE: 1000
} as const;

// Collection stages
export const COLLECTION_STAGES = {
  STAGE_1: { days: 1, action: 'FRIENDLY_REMINDER' },
  STAGE_2: { days: 7, action: 'FORMAL_NOTICE' },
  STAGE_3: { days: 15, action: 'FINAL_NOTICE' },
  STAGE_4: { days: 30, action: 'LEGAL_ACTION' },
  STAGE_5: { days: 60, action: 'ASSET_RECOVERY' }
} as const;

export type LoanStatus = typeof LOAN_STATUS[keyof typeof LOAN_STATUS];
export type InstallmentStatus = typeof INSTALLMENT_STATUS[keyof typeof INSTALLMENT_STATUS];
export type LoanPurpose = typeof LOAN_PURPOSES[number];
export type EmploymentType = typeof EMPLOYMENT_TYPES[number];
export type MaritalStatus = typeof MARITAL_STATUS[number];
export type EducationLevel = typeof EDUCATION_LEVELS[number];
export type PaymentMethod = typeof PAYMENT_METHODS[number];
export type DocumentType = typeof DOCUMENT_TYPES[number];
export type RiskCategory = typeof RISK_CATEGORIES[keyof typeof RISK_CATEGORIES];

export const LOAN_ELIGIBILITY_REQUIREMENTS = {
  // Gamified Requirements (from your UI)
  MIN_WALLET_BALANCE: 500, // USD
  MIN_TOTAL_DEPOSITS: 1000, // USD  
  MIN_REFERRALS_WITH_DEPOSITS: 3,
  REQUIRED_KYC_STATUS: 'Approved',
  MIN_ACCOUNT_AGE_DAYS: 7,
  
  // Traditional Requirements (keep existing)
  MIN_MONTHLY_INCOME: 1000, // USD
  MIN_CREDIT_SCORE: 550, // Standardize to 550 everywhere
  MAX_DEBT_TO_INCOME_RATIO: 0.4,
  
  // Loan Limits
  MIN_LOAN_AMOUNT: 500,
  MAX_LOAN_AMOUNT: 5500
};