import { z } from 'zod';

// User schemas
export const userCreateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits').max(20),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  planId: z.string().optional(),
  referredBy: z.string().optional()
});

export const userUpdateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(10).max(20).optional(),
  status: z.enum(['Active', 'Suspended', 'Banned'] as const).optional(),
  kycStatus: z.enum(['Pending', 'Approved', 'Rejected'] as const).optional(),
  planId: z.string().optional(),
  balance: z.number().min(0).optional(),
  emailVerified: z.boolean().optional(),
  phoneVerified: z.boolean().optional(),
  twoFactorEnabled: z.boolean().optional()
});

export const userRegistrationValidator = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(8),
  deviceId: z.string().min(1),
  fingerprint: z.string().min(1),
  referralCode: z.string().optional(),
  terms: z.boolean().refine(val => val === true, 'You must accept the terms and conditions')
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

// Admin schemas
export const adminCreateSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['SuperAdmin', 'Admin', 'Moderator', 'Support'] as const),
  permissions: z.array(z.string()).optional(),
  isActive: z.boolean().default(true)
});

export const adminUpdateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  role: z.enum(['SuperAdmin', 'Admin', 'Moderator', 'Support'] as const).optional(),
  permissions: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8).optional()
});

// Authentication schemas
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  userType: z.enum(['admin', 'user'] as const),
  twoFactorToken: z.string().optional(),
  rememberMe: z.boolean().optional(),
  deviceId: z.string().optional(),
  fingerprint: z.string().optional()
});

export const passwordResetSchema = z.object({
  email: z.string().email('Invalid email address')
});

export const passwordUpdateSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  confirmPassword: z.string().min(8)
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "New passwords don't match",
  path: ["confirmPassword"]
});

// Transaction schemas
export const transactionCreateSchema = z.object({
  userId: z.string().min(1),
  type: z.enum(['deposit', 'withdrawal', 'bonus', 'profit', 'penalty'] as const),
  amount: z.number().positive('Amount must be positive'),
  currency: z.enum(['USD', 'BDT'] as const).default('BDT'),
  gateway: z.enum(['CoinGate', 'UddoktaPay', 'Manual', 'System'] as const),
  description: z.string().min(1).max(500),
  reference: z.string().optional(),
  metadata: z.any().optional()
});

export const transactionUpdateSchema = z.object({
  status: z.enum(['Pending', 'Approved', 'Rejected', 'Processing', 'Failed'] as const),
  adminNotes: z.string().max(1000).optional(),
  processedAt: z.coerce.date().optional()
});

// Plan schemas
export const planCreateSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().min(10).max(1000),
  type: z.enum(['Free', 'Basic', 'Premium', 'Enterprise'] as const),
  price: z.number().min(0),
  currency: z.enum(['USD', 'BDT'] as const).default('BDT'),
  duration: z.number().positive(), // in days
  features: z.array(z.string()),
  limitations: z.object({
    maxTransactions: z.number().optional(),
    maxWithdrawal: z.number().optional(),
    dailyLimit: z.number().optional()
  }).optional(),
  isActive: z.boolean().default(true)
});

export const planUpdateSchema = planCreateSchema.partial();

// Loan schemas
export const loanCreateSchema = z.object({
  userId: z.string().min(1),
  amount: z.number().positive().max(5500, 'Maximum loan amount is $5,500'),
  purpose: z.string().min(10).max(500),
  termMonths: z.number().min(1).max(60),
  interestRate: z.number().min(0).max(100),
  collateral: z.string().optional(),
  guarantorInfo: z.object({
    name: z.string().min(2),
    phone: z.string().min(10),
    email: z.string().email(),
    relationship: z.string().min(2)
  }).optional()
});

export const loanUpdateSchema = z.object({
  status: z.enum(['Pending', 'Approved', 'Rejected', 'Active', 'Completed', 'Defaulted'] as const),
  approvedAmount: z.number().positive().optional(),
  approvedRate: z.number().min(0).max(100).optional(),
  rejectionReason: z.string().max(500).optional(),
  adminNotes: z.string().max(1000).optional()
});

// KYC schemas
export const kycSubmissionSchema = z.object({
  documentType: z.enum(['passport', 'national_id', 'driving_license'] as const),
  documentNumber: z.string().min(5).max(50),
  frontImage: z.string().url(),
  backImage: z.string().url().optional(),
  selfieImage: z.string().url(),
  address: z.object({
    street: z.string().min(5),
    city: z.string().min(2),
    state: z.string().min(2),
    country: z.string().min(2),
    zipCode: z.string().min(3)
  })
});

export const kycApprovalSchema = z.object({
  status: z.enum(['Approved', 'Rejected'] as const),
  rejectionReason: z.string().max(500).optional(),
  adminNotes: z.string().max(1000).optional()
});

// Notification schemas
export const notificationCreateSchema = z.object({
  type: z.enum(['system', 'promotion', 'alert', 'reminder'] as const),
  channel: z.enum(['email', 'sms', 'in_app', 'push'] as const),
  title: z.string().min(1),
  message: z.string().min(1),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent'] as const).optional(),
  scheduledAt: z.coerce.date().optional(),
  data: z.any().optional()
});

// News schemas
export const newsCreateSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  content: z.string().min(50, 'Content must be at least 50 characters'),
  excerpt: z.string().optional(),
  category: z.string().min(1),
  tags: z.array(z.string()),
  featuredImage: z.string().url().optional(),
  status: z.enum(['Draft', 'Published', 'Archived'] as const),
  isSticky: z.boolean().optional(),
  publishedAt: z.coerce.date().optional()
});

// Support schemas
export const ticketCreateSchema = z.object({
  userId: z.string().min(1),
  subject: z.string().min(5, 'Subject must be at least 5 characters'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
  category: z.string().min(1),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent'] as const).optional()
});

export const ticketResponseSchema = z.object({
  ticketId: z.string().min(1),
  message: z.string().min(1),
  isAdminResponse: z.boolean(),
  attachments: z.array(z.object({
    filename: z.string(),
    url: z.string(),
    mimeType: z.string(),
    size: z.number()
  })).optional()
});

// FIXED: Pagination and filtering schemas for URL query parameters
// URL parameters are always strings, so we need to transform them
export const paginationSchema = z.object({
  page: z.string().transform(Number).pipe(z.number().positive()).default('1').or(z.number().positive().default(1)),
  limit: z.string().transform(Number).pipe(z.number().positive().max(100)).default('10').or(z.number().positive().max(100).default(10)),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
});

export const dateRangeSchema = z.object({
  dateFrom: z.string().optional().transform(val => val ? new Date(val) : undefined),
  dateTo: z.string().optional().transform(val => val ? new Date(val) : undefined)
});

// File upload schema
export const fileUploadSchema = z.object({
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  size: z.number().positive().max(10 * 1024 * 1024), // 10MB max
  content: z.string() // base64 content
});

// Device validation
export const deviceInfoSchema = z.object({
  deviceId: z.string().min(1),
  fingerprint: z.string().min(1),
  userAgent: z.string().min(1),
  ipAddress: z.string().ip()
});

// Enhanced pagination schema that properly handles string inputs from URL
export const urlPaginationSchema = z.object({
  page: z.string().optional().default('1').transform(val => {
    const num = parseInt(val, 10);
    return isNaN(num) || num < 1 ? 1 : num;
  }),
  limit: z.string().optional().default('10').transform(val => {
    const num = parseInt(val, 10);
    return isNaN(num) || num < 1 ? 10 : Math.min(num, 100);
  }),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
});

// Enhanced date range schema for URL parameters
export const urlDateRangeSchema = z.object({
  dateFrom: z.string().optional().transform(val => {
    if (!val) return undefined;
    const date = new Date(val);
    return isNaN(date.getTime()) ? undefined : date;
  }),
  dateTo: z.string().optional().transform(val => {
    if (!val) return undefined;
    const date = new Date(val);
    return isNaN(date.getTime()) ? undefined : date;
  })
});