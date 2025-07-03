
export const APP_CONFIG = {
  name: 'Financial Admin Panel',
  version: '1.0.0',
  description: 'Comprehensive financial management system',
  url: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  supportEmail: process.env.SUPPORT_EMAIL || 'support@example.com'
} as const;

export const PLAN_NAMES = {
  FREE: 'Free',
  SILVER: 'Silver', 
  GOLD: 'Gold',
  PLATINUM: 'Platinum',
  DIAMOND: 'Diamond'
} as const;

export const TRANSACTION_LIMITS = {
  MIN_DEPOSIT: 10,
  MIN_WITHDRAWAL: 100,
  MAX_DAILY_WITHDRAWAL: 100000,
  MAX_MONTHLY_WITHDRAWAL: 500000
} as const;


export const REFERRAL_CONFIG = {
  SIGNUP_BONUS: 100,
  PROFIT_SHARE_PERCENTAGE: 10,
  MIN_REFEREE_DEPOSIT: 50
} as const;

export const KYC_DOCUMENT_TYPES = [
  'national_id',
  'passport',
  'driving_license',
  'utility_bill',
  'bank_statement',
  'selfie_with_id'
] as const;

export const TASK_CATEGORIES = [
  'Social Media',
  'App Installation',
  'Survey',
  'Review',
  'Referral',
  'Video Watch',
  'Article Read',
  'Registration'
] as const;

export const NOTIFICATION_TEMPLATES = {
  KYC_APPROVED: 'kyc_approved',
  KYC_REJECTED: 'kyc_rejected',
  WITHDRAWAL_APPROVED: 'withdrawal_approved',
  WITHDRAWAL_REJECTED: 'withdrawal_rejected',
  LOAN_APPROVED: 'loan_approved',
  LOAN_REJECTED: 'loan_rejected',
  REFERRAL_BONUS: 'referral_bonus',
  TASK_APPROVED: 'task_approved'
} as const;

export const SUPPORT_CATEGORIES = [
  'Account Issues',
  'Payment Problems',
  'KYC Verification',
  'Loan Inquiry',
  'Technical Support',
  'Feature Request',
  'Complaint',
  'General Inquiry'
] as const;

export const FILE_UPLOAD_CONFIG = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ],
  UPLOAD_PATH: '/uploads'
} as const;

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    REFRESH: '/api/auth/refresh'
  },
  USERS: {
    LIST: '/api/users',
    CREATE: '/api/users',
    GET: '/api/users/[id]',
    UPDATE: '/api/users/[id]',
    DELETE: '/api/users/[id]',
    KYC: '/api/users/[id]/kyc'
  },
  TRANSACTIONS: {
    LIST: '/api/transactions',
    CREATE: '/api/transactions',
    APPROVE: '/api/transactions/approve'
  },
  LOANS: {
    LIST: '/api/loans',
    CREATE: '/api/loans',
    EMI_CALCULATOR: '/api/loans/emi-calculator'
  }
} as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500
} as const;

export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^\+?[1-9]\d{1,14}$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
  MONGO_ID: /^[0-9a-fA-F]{24}$/,
  REFERRAL_CODE: /^[A-Z0-9]{6,10}$/,
  TICKET_NUMBER: /^TKT-[A-Z0-9]+-[A-Z0-9]+$/
} as const;