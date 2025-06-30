// lib/validation.ts - COMPLETE CONSOLIDATED VALIDATION SCHEMAS

import { z } from 'zod';

// ============================================================================
// UTILITY SCHEMAS
// ============================================================================

// Object ID validation
export const objectIdValidator = z.string().refine((id) => {
  return /^[0-9a-fA-F]{24}$/.test(id);
}, {
  message: 'Invalid ObjectId format'
});

// URL validation
export const urlValidator = z.string().url('Invalid URL format');

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
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
});

// Standard pagination schema for direct object use
export const paginationSchema = z.object({
  page: z.number().positive().default(1),
  limit: z.number().positive().max(100).default(10),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
});

// Date range schema
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

// ============================================================================
// USER SCHEMAS
// ============================================================================

// Admin user creation schema
export const adminUserCreateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits').max(20),
  planId: z.string().min(1, 'Plan is required'),
  deviceId: z.string().min(1, 'Device ID is required'),
  referralCode: z.string().optional(),
  isAdminCreated: z.boolean().optional().default(true),
  generatePassword: z.boolean().optional().default(true),
  initialBalance: z.number().min(0).optional().default(0),
  password: z.string().min(8).optional(),
  address: z.object({
    street: z.string().min(5).max(200),
    city: z.string().min(2).max(100),
    state: z.string().min(2).max(100),
    country: z.string().min(2).max(100),
    zipCode: z.string().min(3).max(20)
  }).optional(),
  dateOfBirth: z.string().datetime().optional(),
});

// User registration schema for mobile app
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

// Enhanced user creation schema with discriminated union
export const userCreateExtendedSchema = z.discriminatedUnion("isAdminCreated", [
  // Admin creation
  z.object({
    isAdminCreated: z.literal(true),
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    email: z.string().email('Invalid email address'),
    phone: z.string().min(10, 'Phone number must be at least 10 digits').max(20),
    planId: z.string().min(1, 'Plan is required'),
    deviceId: z.string().min(1, 'Device ID is required'),
    referralCode: z.string().optional(),
    generatePassword: z.boolean().optional().default(true),
    password: z.string().min(8).optional(),
    initialBalance: z.number().min(0).optional().default(0),
    address: z.object({
      street: z.string().min(5).max(200),
      city: z.string().min(2).max(100),
      state: z.string().min(2).max(100),
      country: z.string().min(2).max(100),
      zipCode: z.string().min(3).max(20)
    }).optional(),
    dateOfBirth: z.string().datetime().optional(),
  }),
  // User registration
  z.object({
    isAdminCreated: z.literal(false),
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    email: z.string().email('Invalid email address'),
    phone: z.string().min(10, 'Phone number must be at least 10 digits').max(20),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    planId: z.string().optional(),
    referredBy: z.string().optional(),
    deviceId: z.string().min(1, 'Device ID is required'),
    fingerprint: z.string().min(1, 'Device fingerprint is required'),
    initialBalance: z.number().min(0).optional().default(0),
    address: z.object({
      street: z.string().min(5).max(200),
      city: z.string().min(2).max(100),
      state: z.string().min(2).max(100),
      country: z.string().min(2).max(100),
      zipCode: z.string().min(3).max(20)
    }).optional(),
    dateOfBirth: z.string().datetime().optional(),
  })
]);

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
  twoFactorEnabled: z.boolean().optional(),
  dateOfBirth: z.string().optional(),
  address: z.object({
    street: z.string().max(200).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    country: z.string().max(100).optional(),
    zipCode: z.string().max(20).optional()
  }).optional(),
  notes: z.string().max(1000).optional()
});

export type UserUpdateFormData = z.infer<typeof userUpdateSchema>;
// User list query schema
export const userListQuerySchema = urlPaginationSchema.extend({
  search: z.string().optional(),
  status: z.enum(['Active', 'Suspended', 'Banned']).optional(),
  kycStatus: z.enum(['Pending', 'Approved', 'Rejected']).optional(),
  planId: objectIdValidator.optional(),
  hasReferrals: z.enum(['true', 'false']).optional(),
  emailVerified: z.enum(['true', 'false']).optional(),
  minBalance: z.string().optional().transform(val => {
    if (!val || val === '') return undefined;
    const num = parseFloat(val);
    return isNaN(num) ? undefined : num;
  }),
  maxBalance: z.string().optional().transform(val => {
    if (!val || val === '') return undefined;
    const num = parseFloat(val);
    return isNaN(num) ? undefined : num;
  })
}).merge(dateRangeSchema);

// ============================================================================
// ADMIN SCHEMAS
// ============================================================================

export const adminCreateSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['SuperAdmin', 'Admin', 'Manager', 'Moderator', 'Support', 'Viewer'] as const).optional(),
  permissions: z.array(z.string()).optional(),
  isActive: z.boolean().default(true)
});

export const adminUpdateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  role: z.enum(['SuperAdmin', 'Admin', 'Manager', 'Moderator', 'Support', 'Viewer'] as const).optional(),
  permissions: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8).optional()
});

// ============================================================================
// AUTHENTICATION SCHEMAS
// ============================================================================

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

export const transactionListQuerySchema = urlPaginationSchema.extend({
  userId: objectIdValidator.optional(),
  type: z.enum(['deposit', 'withdrawal', 'bonus', 'profit', 'penalty']).optional(),
  status: z.enum(['Pending', 'Approved', 'Rejected', 'Processing', 'Failed']).optional(),
  gateway: z.enum(['CoinGate', 'UddoktaPay', 'Manual', 'System']).optional(),
  currency: z.enum(['USD', 'BDT']).optional(),
  amountMin: z.string().optional().transform(Number),
  amountMax: z.string().optional().transform(Number),
  search: z.string().optional()
}).merge(dateRangeSchema);

// ============================================================================
// REFERRAL SCHEMAS
// ============================================================================

export const referralCreateSchema = z.object({
  referrerId: objectIdValidator,
  refereeId: objectIdValidator,
  bonusAmount: z.number().min(0, 'Bonus amount must be positive'),
  bonusType: z.enum(['signup', 'profit_share']),
  profitBonus: z.number().min(0).optional().default(0),
  metadata: z.object({
    refereeFirstDeposit: z.number().optional(),
    refereeFirstDepositDate: z.string().datetime().optional(),
    totalRefereeProfit: z.number().optional(),
  }).optional()
});

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

export const loanApprovalSchema = z.object({
  action: z.enum(['approve', 'reject'], { required_error: 'Action is required' }),
  rejectionReason: z.string().optional(),
  interestRate: z.number().min(8).max(25).optional(),
  conditions: z.string().optional(),
  adminNotes: z.string().optional()
}).refine(
  (data) => {
    if (data.action === 'reject' && !data.rejectionReason) {
      return false;
    }
    if (data.action === 'approve' && !data.interestRate) {
      return false;
    }
    return true;
  },
  {
    message: 'Rejection reason is required for rejection, interest rate is required for approval'
  }
);

export const loanFilterSchema = z.object({
  userId: objectIdValidator.optional(),
  status: z.enum(['Pending', 'Approved', 'Rejected', 'Active', 'Completed', 'Defaulted']).optional(),
  amountMin: z.number().min(0).optional(),
  amountMax: z.number().min(0).optional(),
  creditScoreMin: z.number().min(300).max(850).optional(),
  creditScoreMax: z.number().min(300).max(850).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  isOverdue: z.boolean().optional(),
  search: z.string().optional()
});

// ============================================================================
// KYC SCHEMAS
// ============================================================================

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

export const newsListQuerySchema = urlPaginationSchema.extend({
  status: z.enum(['Draft', 'Published', 'Archived']).optional(),
  category: z.string().optional(),
  author: z.string().optional(),
  isSticky: z.enum(['true', 'false']).optional(),
  search: z.string().optional(),
  tags: z.string().optional()
}).merge(dateRangeSchema);

// ============================================================================
// SUPPORT SCHEMAS
// ============================================================================

export const ticketCreateSchema = z.object({
  userId: z.string().min(1),
  subject: z.string().min(5, 'Subject must be at least 5 characters'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
  category: z.string().min(1),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent'] as const).optional()
});


// ============================================================================
// NOTIFICATION SCHEMAS
// ============================================================================

export const notificationCreateSchema = z.object({
  type: z.enum(['system', 'promotion', 'alert', 'reminder'] as const),
  channel: z.enum(['email', 'sms', 'in_app', 'push'] as const),
  title: z.string().min(1),
  message: z.string().min(1),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent'] as const).optional(),
  scheduledAt: z.coerce.date().optional(),
  data: z.any().optional()
});

// ============================================================================
// TASK SCHEMAS
// ============================================================================

export const taskCreateSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  category: z.string().min(1, 'Category is required'),
  reward: z.number().min(0, 'Reward must be non-negative'),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']),
  estimatedTime: z.number().min(1, 'Estimated time must be at least 1 minute'),
  requirements: z.array(z.string()),
  status: z.enum(['Active', 'Inactive', 'Completed']).default('Active'),
  validFrom: z.coerce.date(),
  validUntil: z.coerce.date().optional(),
  isRepeatable: z.boolean().default(false),
  maxSubmissions: z.number().min(1).optional(),
  metadata: z.object({
    externalUrl: z.string().url().optional(),
    imageUrl: z.string().url().optional(),
    tags: z.array(z.string()).optional()
  }).optional()
});

export const taskUpdateSchema = taskCreateSchema.partial();


// ============================================================================
// AUDIT LOG SCHEMAS
// ============================================================================

export const auditLogFilterSchema = urlPaginationSchema.extend({
  adminId: objectIdValidator.optional(),
  action: z.string().optional(),
  entity: z.string().optional(),
  severity: z.enum(['Low', 'Medium', 'High', 'Critical']).optional(),
  status: z.enum(['Success', 'Failed', 'Partial']).optional(),
  entityId: z.string().optional(),
  ipAddress: z.string().optional(),
  search: z.string().optional()
}).merge(dateRangeSchema);

export const bonusApprovalSchema = z.object({
  referralIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid referral ID')).min(1).max(100),
  action: z.enum(['approve', 'reject']),
  reason: z.string().optional(),
  adminNotes: z.string().optional(),
  adjustedAmount: z.number().min(0).optional()
});

// Bonus recalculation schema
export const bonusRecalculationSchema = z.object({
  refereeId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid referee ID'),
  newProfitAmount: z.number().min(0),
  profitSharePercentage: z.number().min(0).max(100).optional().default(10)
});


// Withdrawal approval validation schema
export const withdrawalApprovalSchema = z.object({
  transactionId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid transaction ID'),
  action: z.enum(['approve', 'reject']),
  reason: z.string().optional(),
  adminNotes: z.string().optional(),
  adjustedAmount: z.number().min(0).optional(), // Allow admin to adjust amount during approval
  paymentReference: z.string().optional(), // Bank reference, transaction hash, etc.
  estimatedDelivery: z.string().datetime().optional() // When funds will be available
});

// Batch approval schema for withdrawals
export const batchWithdrawalApprovalSchema = z.object({
  transactionIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid transaction ID')).min(1).max(50), // Lower limit for withdrawals due to manual processing
  action: z.enum(['approve', 'reject']),
  reason: z.string().optional(),
  adminNotes: z.string().optional(),
  batchPaymentReference: z.string().optional() // For batch payment processing
});
// Withdrawal request validation schema
export const withdrawalRequestSchema = z.object({
  userId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID'),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  currency: z.enum(['USD', 'BDT']),
  withdrawalMethod: z.enum(['bank_transfer', 'mobile_banking', 'crypto_wallet', 'check']),
  accountDetails: z.object({
    // Bank transfer
    accountNumber: z.string().optional(),
    routingNumber: z.string().optional(),
    bankName: z.string().optional(),
    accountHolderName: z.string().optional(),
    bankBranch: z.string().optional(),
    
    // Mobile banking (bKash, Nagad, etc.)
    mobileNumber: z.string().optional(),
    mobileProvider: z.string().optional(), // bKash, Nagad, Rocket, etc.
    
    // Crypto wallet
    walletAddress: z.string().optional(),
    walletType: z.string().optional(), // Bitcoin, Ethereum, etc.
    
    // Check
    mailingAddress: z.string().optional(),
    
    // Common
    note: z.string().optional()
  }),
  reason: z.string().optional(),
  urgentWithdrawal: z.boolean().optional().default(false) // For express processing
});
// Deposit approval validation schema
export const depositApprovalSchema = z.object({
  transactionId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid transaction ID'),
  action: z.enum(['approve', 'reject']),
  reason: z.string().optional(),
  adminNotes: z.string().optional(),
  adjustedAmount: z.number().min(0).optional(), // Allow admin to adjust amount during approval
  bonusAmount: z.number().min(0).optional().default(0), // Optional signup/referral bonus
});

// Batch approval schema
export const batchApprovalSchema = z.object({
  transactionIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid transaction ID')).min(1).max(100),
  action: z.enum(['approve', 'reject']),
  reason: z.string().optional(),
  adminNotes: z.string().optional()
});


// Deposit request validation schema
export const depositRequestSchema = z.object({
  userId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID'),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  currency: z.enum(['USD', 'BDT']),
  gateway: z.enum(['CoinGate', 'UddoktaPay', 'Manual']),
  gatewayData: z.object({
    // CoinGate specific
    orderId: z.string().optional(),
    coinbaseOrderId: z.string().optional(),
    
    // UddoktaPay specific
    uddoktaPayOrderId: z.string().optional(),
    paymentMethod: z.string().optional(),
    
    // Manual deposit specific
    referenceNumber: z.string().optional(),
    bankName: z.string().optional(),
    accountNumber: z.string().optional(),
    depositSlip: z.string().optional(), // File URL
    
    // Common fields
    note: z.string().optional(),
    customerReference: z.string().optional()
  }).optional()
});

export const bulkSubmissionSchema = z.object({
  submissionIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid submission ID')).min(1),
  action: z.enum(['approve', 'reject']),
  reviewNote: z.string().optional()
});

// Task submission list query validation
export const submissionListQuerySchema = z.object({
  page: z.string().optional().default('1').transform(val => {
    const num = parseInt(val, 10);
    return isNaN(num) || num < 1 ? 1 : num;
  }),
  limit: z.string().optional().default('10').transform(val => {
    const num = parseInt(val, 10);
    return isNaN(num) || num < 1 ? 10 : Math.min(num, 100);
  }),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  
  // Filters
  taskId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  userId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  status: z.enum(['Pending', 'Approved', 'Rejected']).optional(),
  search: z.string().optional()
});

// Task submission validation schema
export const taskSubmissionSchema = z.object({
  submissionId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid submission ID'),
  action: z.enum(['approve', 'reject']),
  reviewNote: z.string().optional(),
  adjustedReward: z.number().min(0).optional()
});
export const assignTicketSchema = z.object({
  adminId: z.string().refine(val => /^[0-9a-fA-F]{24}$/.test(val), 'Invalid admin ID'),
  notes: z.string().optional()
});

export const statusUpdateSchema = z.object({
  status: z.enum(['Open', 'In Progress', 'Waiting for User', 'Resolved', 'Closed']),
  resolution: z.string().optional(),
  internalNotes: z.string().optional()
});

export const ticketResponseSchema = z.object({
  message: z.string().min(1, 'Message is required').max(5000, 'Message too long'),
  isAdminResponse: z.boolean().default(true),
  attachments: z.array(z.object({
    filename: z.string(),
    url: z.string().url(),
    mimeType: z.string(),
    size: z.number().positive()
  })).optional().default([])
});

export const ticketUpdateSchema = z.object({
  status: z.enum(['Open', 'In Progress', 'Waiting for User', 'Resolved', 'Closed']).optional(),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).optional(),
  assignedTo: z.string().optional().refine(val => !val || val === '' || /^[0-9a-fA-F]{24}$/.test(val), 'Invalid admin ID'),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  resolution: z.string().optional(),
  satisfactionRating: z.number().min(1).max(5).optional(),
  feedbackComment: z.string().optional()
});
export const faqFilterSchema = z.object({
  page: z.string().transform(Number).pipe(z.number().min(1)).optional().default('1'),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).optional().default('10'),
  sortBy: z.string().optional().default('priority'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  category: z.string().optional(),
  isActive: z.enum(['true', 'false']).optional(),
  search: z.string().optional(),
  tags: z.string().optional(), // Comma-separated tags
  minViews: z.string().transform(Number).pipe(z.number().min(0)).optional(),
  createdBy: z.string().optional()
});

export const faqCreateSchema = z.object({
  question: z.string().min(5, 'Question must be at least 5 characters').max(500, 'Question too long'),
  answer: z.string().min(10, 'Answer must be at least 10 characters'),
  category: z.string().min(1, 'Category is required'),
  tags: z.array(z.string()).optional().default([]),
  priority: z.number().min(0).max(10).default(0),
  isActive: z.boolean().default(true)
});
export const referralListQuerySchema = paginationSchema.extend({
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  status: z.enum(['Pending', 'Paid', 'Cancelled']).optional(),
  bonusType: z.enum(['signup', 'profit_share']).optional(),
  referrerId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  refereeId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  amountMin: z.string().transform(Number).pipe(z.number().min(0)).optional(),
  amountMax: z.string().transform(Number).pipe(z.number().min(0)).optional(),
  search: z.string().optional()
}).merge(dateRangeSchema);

// Referral creation schema
export const createReferralSchema = z.object({
  referrerId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid referrer ID'),
  refereeId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid referee ID'),
  bonusAmount: z.number().min(0, 'Bonus amount must be positive'),
  bonusType: z.enum(['signup', 'profit_share']),
  profitBonus: z.number().min(0).optional().default(0),
  metadata: z.object({
    refereeFirstDeposit: z.number().optional(),
    refereeFirstDepositDate: z.string().datetime().optional(),
    totalRefereeProfit: z.number().optional(),
    campaignId: z.string().optional()
  }).optional()
});

export const planUpdateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().min(10).optional(),
  price: z.number().min(0).optional(),
  currency: z.enum(['USD', 'BDT']).optional(),
  duration: z.number().min(1).optional(),
  features: z.array(z.string()).min(1).optional(),
  depositLimit: z.number().min(0).optional(),
  withdrawalLimit: z.number().min(0).optional(),
  profitLimit: z.number().min(0).optional(),
  minimumDeposit: z.number().min(0).optional(),
  minimumWithdrawal: z.number().min(0).optional(),
  dailyWithdrawalLimit: z.number().min(0).optional(),
  monthlyWithdrawalLimit: z.number().min(0).optional(),
  priority: z.number().min(1).max(10).optional(),
  isActive: z.boolean().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
});
export const planCreateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  price: z.number().min(0, 'Price must be non-negative'),
  currency: z.enum(['USD', 'BDT']).optional().default('BDT'),
  duration: z.number().min(1, 'Duration must be at least 1 day').optional(),
  features: z.array(z.string()).min(1, 'At least one feature is required'),
  depositLimit: z.number().min(0),
  withdrawalLimit: z.number().min(0),
  profitLimit: z.number().min(0),
  minimumDeposit: z.number().min(0),
  minimumWithdrawal: z.number().min(0),
  dailyWithdrawalLimit: z.number().min(0),
  monthlyWithdrawalLimit: z.number().min(0),
  priority: z.number().min(1).max(10).optional().default(1),
  isActive: z.boolean().default(true),
  color: z.string().optional().default('#000000'),
  icon: z.string().optional(),
});


// Plan list query validation schema - FIXED to handle string values properly
export const planListQuerySchema = z.object({
  page: z.string().transform(val => parseInt(val) || 1).optional().default('1'),
  limit: z.string().transform(val => Math.min(parseInt(val) || 10, 100)).optional().default('10'),
  sortBy: z.string().optional().default('priority'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
  isActive: z.string().transform(val => {
    if (val === 'true') return true;
    if (val === 'false') return false;
    return undefined;
  }).optional(),
  search: z.string().optional(),
});
// Notification list query validation
export const notificationListQuerySchema = z.object({
  page: z.string().optional().default('1').transform(val => {
    const num = parseInt(val, 10);
    return isNaN(num) || num < 1 ? 1 : num;
  }),
  limit: z.string().optional().default('10').transform(val => {
    const num = parseInt(val, 10);
    return isNaN(num) || num < 1 ? 10 : Math.min(num, 100);
  }),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  
  // Filters
  type: z.enum(['KYC', 'Withdrawal', 'Loan', 'Task', 'Referral', 'System', 'Marketing']).optional(),
  channel: z.enum(['email', 'sms', 'in_app', 'push']).optional(),
  status: z.enum(['Pending', 'Sent', 'Delivered', 'Failed', 'Read']).optional(),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).optional(),
  userId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
  search: z.string().optional(),
  
  // Date filters
  dateFrom: z.string().optional().transform(val => {
    if (!val || val === '') return undefined;
    const date = new Date(val);
    return isNaN(date.getTime()) ? undefined : date;
  }),
  dateTo: z.string().optional().transform(val => {
    if (!val || val === '') return undefined;
    const date = new Date(val);
    return isNaN(date.getTime()) ? undefined : date;
  })
});

// Bulk notification schema
export const bulkNotificationSchema = z.object({
  type: z.enum(['KYC', 'Withdrawal', 'Loan', 'Task', 'Referral', 'System', 'Marketing']),
  channel: z.enum(['email', 'sms', 'in_app', 'push']),
  title: z.string().min(1, 'Title is required'),
  message: z.string().min(1, 'Message is required'),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).optional().default('Medium'),
  scheduledAt: z.string().datetime().optional(),
  recipients: z.array(z.object({
    userId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID'),
    variables: z.record(z.any()).optional()
  })).min(1, 'At least one recipient is required'),
  templateId: z.string().optional(),
  sendImmediately: z.boolean().optional().default(false)
});

// Manual send notifications schema
export const sendNotificationsSchema = z.object({
  notificationIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid notification ID')).min(1),
  forceResend: z.boolean().optional().default(false)
});

// Process pending notifications schema
export const processPendingSchema = z.object({
  batchSize: z.number().min(1).max(100).optional().default(50),
  channel: z.enum(['email', 'sms', 'in_app', 'push']).optional(),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).optional()
});


// News update validation schema
export const newsUpdateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long').optional(),
  content: z.string().min(1, 'Content is required').optional(),
  excerpt: z.string().max(500, 'Excerpt too long').optional(),
  category: z.string().min(1, 'Category is required').optional(),
  tags: z.array(z.string()).optional(),
  featuredImage: z.string().url().optional(),
  status: z.enum(['Draft', 'Published', 'Archived']).optional(),
  isSticky: z.boolean().optional(),
  publishedAt: z.string().datetime().optional(),
  metadata: z.object({
    seoTitle: z.string().max(70).optional(),
    seoDescription: z.string().max(160).optional(),
    socialImage: z.string().url().optional()
  }).optional()
});

// Patch operation schema
export const newsPatchSchema = z.object({
  action: z.enum(['publish', 'unpublish', 'archive', 'unarchive', 'stick', 'unstick', 'increment_view', 'update_metadata', 'update_tags']),
  data: z.object({
    metadata: z.object({
      seoTitle: z.string().max(70).optional(),
      seoDescription: z.string().max(160).optional(),
      socialImage: z.string().url().optional()
    }).optional(),
    tags: z.array(z.string()).optional()
  }).optional()
});


// Category validation schemas
export const categoryCreateSchema = z.object({
  name: z.string().min(1, 'Category name is required').max(50, 'Category name too long'),
  description: z.string().max(200, 'Description too long').optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format').optional(),
  icon: z.string().optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().min(0).optional().default(0)
});


// Loan application validation schema (for admin created loans)
export const loanApplicationSchema = z.object({
  userId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid user ID'),
  amount: z.number().min(500, 'Minimum loan amount is $500').max(50000, 'Maximum loan amount is $50,000'),
  purpose: z.string().min(10, 'Purpose must be at least 10 characters').max(500, 'Purpose too long'),
  tenure: z.number().min(6, 'Minimum tenure is 6 months').max(60, 'Maximum tenure is 60 months'),
  interestRate: z.number().min(8, 'Minimum interest rate is 8%').max(25, 'Maximum interest rate is 25%'),
  monthlyIncome: z.number().min(1000, 'Monthly income must be at least $1,000'),
  employmentStatus: z.string().min(1, 'Employment status is required'),
  employmentDetails: z.object({
    company: z.string().min(1, 'Company name is required'),
    position: z.string().min(1, 'Position is required'),
    workingSince: z.string().transform(str => new Date(str)),
    salary: z.number().min(0)
  }),
  personalDetails: z.object({
    maritalStatus: z.enum(['Single', 'Married', 'Divorced', 'Widowed']),
    dependents: z.number().min(0).max(10),
    education: z.string().min(1, 'Education is required')
  }),
  financialDetails: z.object({
    bankBalance: z.number().min(0),
    monthlyExpenses: z.number().min(0),
    existingLoans: z.number().min(0),
    creditHistory: z.string().optional(),
    assets: z.array(z.object({
      type: z.string(),
      value: z.number().min(0),
      description: z.string()
    })).optional().default([])
  }),
  documents: z.array(z.object({
    type: z.string(),
    url: z.string().url(),
    uploadedAt: z.string().optional().default(() => new Date().toISOString()).transform(str => new Date(str))
  })).optional().default([]),
  collateral: z.object({
    type: z.string(),
    value: z.number().min(0),
    description: z.string()
  }).optional(),
  notes: z.string().optional()
});

// Query parameters validation schema
export const loanListQuerySchema = z.object({
  page: z.string().optional().default('1').transform(val => parseInt(val, 10)),
  limit: z.string().optional().default('10').transform(val => Math.min(parseInt(val, 10), 100)),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  userId: z.string().optional(),
  status: z.enum(['Pending', 'Approved', 'Rejected', 'Active', 'Completed', 'Defaulted']).optional(),
  amountMin: z.string().optional().transform(val => {
    if (!val || val === '') return undefined;
    const num = parseFloat(val);
    return isNaN(num) ? undefined : num;
  }),
  amountMax: z.string().optional().transform(val => {
    if (!val || val === '') return undefined;
    const num = parseFloat(val);
    return isNaN(num) ? undefined : num;
  }),
  creditScoreMin: z.string().optional().transform(val => {
    if (!val || val === '') return undefined;
    const num = parseInt(val, 10);
    return isNaN(num) ? undefined : num;
  }),
  creditScoreMax: z.string().optional().transform(val => {
    if (!val || val === '') return undefined;
    const num = parseInt(val, 10);
    return isNaN(num) ? undefined : num;
  }),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  isOverdue: z.string().optional().transform(val => {
    if (!val || val === '') return undefined;
    return val === 'true';
  }),
  search: z.string().optional()
});

// EMI calculation validation schema
export const emiCalculatorSchema = z.object({
  loanAmount: z.number().min(500, 'Minimum loan amount is $500').max(50000, 'Maximum loan amount is $50,000'),
  interestRate: z.number().min(8, 'Minimum interest rate is 8%').max(25, 'Maximum interest rate is 25%'),
  tenure: z.number().min(6, 'Minimum tenure is 6 months').max(60, 'Maximum tenure is 60 months'),
  sendCalculation: z.boolean().optional().default(false) // Option to send calculation via email
});


// News validation schemas
export const newsFilterSchema = z.object({
  page: z.string().transform(Number).pipe(z.number().min(1)).optional().default('1'),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).optional().default('10'),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  status: z.enum(['Draft', 'Published', 'Archived']).optional(),
  category: z.string().optional(),
  author: z.string().optional(),
  isSticky: z.enum(['true', 'false']).optional(),
  search: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  tags: z.string().optional() // Comma-separated tags
});

export const newsCreateSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  content: z.string().min(1, 'Content is required'),
  excerpt: z.string().max(500, 'Excerpt too long').optional(),
  category: z.string().min(1, 'Category is required'),
  tags: z.array(z.string()).optional().default([]),
  featuredImage: z.string().url().optional(),
  status: z.enum(['Draft', 'Published', 'Archived']).default('Draft'),
  isSticky: z.boolean().default(false),
  publishedAt: z.string().datetime().optional(),
  metadata: z.object({
    seoTitle: z.string().max(70).optional(),
    seoDescription: z.string().max(160).optional(),
    socialImage: z.string().url().optional()
  }).optional(),
  schedulePublish: z.boolean().optional().default(false),
  scheduledAt: z.string().datetime().optional()
});

export const analyticsQuerySchema = z.object({
  period: z.enum(['today', 'week', 'month', 'quarter', 'year', 'all_time']),
  userId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional()
});
// User loan application schema
export const userLoanApplicationSchema = z.object({
  amount: z.number().min(500, 'Minimum loan amount is $500').max(5500, 'Maximum loan amount is $5,500'),
  purpose: z.string().min(10, 'Purpose must be at least 10 characters').max(500, 'Purpose too long'),
  tenure: z.number().min(6, 'Minimum tenure is 6 months').max(60, 'Maximum tenure is 60 months'),
  monthlyIncome: z.number().min(1000, 'Monthly income must be at least $1,000'),
  employmentStatus: z.string().min(1, 'Employment status is required'),
  employmentDetails: z.object({
    company: z.string().min(1, 'Company name is required'),
    position: z.string().min(1, 'Position is required'),
    workingSince: z.string().transform(str => new Date(str)),
    salary: z.number().min(0)
  }),
  personalDetails: z.object({
    maritalStatus: z.enum(['Single', 'Married', 'Divorced', 'Widowed']),
    dependents: z.number().min(0).max(10),
    education: z.string().min(1, 'Education is required')
  }),
  financialDetails: z.object({
    bankBalance: z.number().min(0),
    monthlyExpenses: z.number().min(0),
    existingLoans: z.number().min(0),
    creditHistory: z.string().optional(),
    assets: z.array(z.object({
      type: z.string(),
      value: z.number().min(0),
      description: z.string()
    })).optional().default([])
  }),
  documents: z.array(z.object({
    type: z.string(),
    url: z.string().url(),
    uploadedAt: z.string().optional().default(() => new Date().toISOString()).transform(str => new Date(str))
  })).optional().default([])
});

// Repayment validation schema
export const repaymentSchema = z.object({
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  paymentMethod: z.string().min(1, 'Payment method is required'),
  transactionId: z.string().optional(),
  notes: z.string().optional(),
  penaltyAmount: z.number().min(0).optional().default(0),
  installmentNumbers: z.array(z.number()).optional() // Specific installments to pay
});


// Dashboard filter validation schema
export const dashboardFilterSchema = z.object({
  dateRange: z.enum(['today', 'week', 'month', 'quarter', 'year', 'custom']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  currency: z.enum(['USD', 'BDT']).optional(),
  userSegment: z.string().optional(),
  planId: z.string().optional()
});

// Chart filter validation schema
export const chartFilterSchema = z.object({
  dateRange: z.enum(['today', 'week', 'month', 'quarter', 'year']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  currency: z.enum(['USD', 'BDT']).optional(),
  groupBy: z.enum(['day', 'week', 'month']).optional()
});

// Audit filter validation schema
export const auditFilterSchema = z.object({
  page: z.string().transform(Number).pipe(z.number().min(1)).optional().default('1'),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).optional().default('10'),
  sortBy: z.string().optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  adminId: z.string().optional(),
  action: z.string().optional(),
  entity: z.string().optional(),
  severity: z.enum(['Low', 'Medium', 'High', 'Critical']).optional(),
  status: z.enum(['Success', 'Failed', 'Partial']).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  search: z.string().optional(),
  entityId: z.string().optional(),
  ipAddress: z.string().optional(),
  export: z.enum(['true', 'false']).optional()
});

// Audit log creation schema for manual entries
export const auditLogCreateSchema = z.object({
  action: z.string().min(1, 'Action is required'),
  entity: z.string().min(1, 'Entity is required'),
  entityId: z.string().optional(),
  description: z.string().min(1, 'Description is required'),
  severity: z.enum(['Low', 'Medium', 'High', 'Critical']).default('Medium'),
  metadata: z.object({
    context: z.any().optional(),
    affectedUsers: z.array(z.string()).optional(),
    relatedEntities: z.array(z.object({
      type: z.string(),
      id: z.string()
    })).optional()
  }).optional()
});

// Settings list query validation schema
export const settingsListQuerySchema = paginationSchema.extend({
  sortBy: z.string().optional().default('category'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
  category: z.enum(['system', 'financial', 'security', 'email', 'upload', 'business', 'maintenance', 'api']).optional(),
  isEditable: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
  search: z.string().optional(),
  grouped: z.enum(['true', 'false']).transform(val => val === 'true').optional().default('false')
});

// Setting creation schema
export const createSettingSchema = z.object({
  category: z.enum(['system', 'financial', 'security', 'email', 'upload', 'business', 'maintenance', 'api']),
  key: z.string().min(1, 'Key is required').max(100, 'Key too long'),
  value: z.any(),
  dataType: z.enum(['string', 'number', 'boolean', 'object', 'array']),
  description: z.string().min(1, 'Description is required').max(500, 'Description too long'),
  isEditable: z.boolean().default(true),
  isEncrypted: z.boolean().default(false),
  defaultValue: z.any().optional(),
  validation: z.object({
    required: z.boolean().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    pattern: z.string().optional(),
    enum: z.array(z.string()).optional()
  }).optional()
});

// Setting update schema
export const updateSettingSchema = z.object({
  value: z.any(),
  reason: z.string().optional()
});

// Bulk update schema
export const bulkUpdateSchema = z.object({
  settings: z.array(z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid setting ID'),
    value: z.any()
  })).min(1, 'At least one setting required').max(50, 'Too many settings'),
  reason: z.string().optional()
});


// Setting validation schemas
export const settingCategorySchema = z.enum([
  'system', 
  'financial', 
  'security', 
  'email', 
  'upload', 
  'business', 
  'maintenance',
  'api'
]);

export const settingDataTypeSchema = z.enum([
  'string', 
  'number', 
  'boolean', 
  'object', 
  'array'
]);

export const settingValidationSchema = z.object({
  required: z.boolean().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  pattern: z.string().optional(),
  enum: z.array(z.string()).optional()
});


export const settingFilterSchema = z.object({
  category: settingCategorySchema.optional(),
  isEditable: z.boolean().optional(),
  search: z.string().optional(),
  dataType: settingDataTypeSchema.optional()
});

export const bulkUpdateSettingsSchema = z.object({
  settings: z.array(z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid setting ID'),
    value: z.any()
  }))
  .min(1, 'At least one setting required')
  .max(50, 'Too many settings'),
  reason: z.string()
    .optional()
    .refine(
      (val) => !val || val.length <= 200,
      'Reason must be 200 characters or less'
    )
});

// Specific setting value validation schemas
export const systemSettingsSchema = z.object({
  appName: z.string().min(1).max(100),
  appVersion: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must be in format x.y.z'),
  appDescription: z.string().min(1).max(500),
  supportEmail: z.string().email(),
  companyName: z.string().min(1).max(200),
  companyAddress: z.string().max(500).optional(),
  maintenanceMode: z.boolean(),
  maintenanceMessage: z.string().max(1000).optional()
});

export const financialSettingsSchema = z.object({
  primaryCurrency: z.enum(['USD', 'BDT']),
  secondaryCurrency: z.enum(['USD', 'BDT']),
  usdToBdtRate: z.number().min(0.01).max(1000),
  bdtToUsdRate: z.number().min(0.0001).max(1),
  minDeposit: z.number().min(0),
  minWithdrawal: z.number().min(0),
  maxDailyWithdrawal: z.number().min(0),
  maxMonthlyWithdrawal: z.number().min(0),
  signupBonus: z.number().min(0),
  profitSharePercentage: z.number().min(0).max(100),
  minRefereeDeposit: z.number().min(0)
});

export const securitySettingsSchema = z.object({
  enable2FA: z.boolean(),
  enableDeviceLimiting: z.boolean(),
  enableEmailVerification: z.boolean(),
  sessionTimeout: z.number().min(5).max(1440), // 5 minutes to 24 hours
  maxLoginAttempts: z.number().min(1).max(20),
  lockoutDuration: z.number().min(1).max(1440), // 1 minute to 24 hours
  passwordMinLength: z.number().min(6).max(128),
  passwordRequireUppercase: z.boolean(),
  passwordRequireLowercase: z.boolean(),
  passwordRequireNumbers: z.boolean(),
  passwordRequireSpecialChars: z.boolean()
});

export const emailSettingsSchema = z.object({
  smtpHost: z.string().min(1),
  smtpPort: z.number().min(1).max(65535),
  smtpSecure: z.boolean(),
  smtpUser: z.string().email(),
  smtpPassword: z.string().min(1),
  emailFromName: z.string().min(1).max(100),
  emailFromAddress: z.string().email(),
  maxConnections: z.number().min(1).max(100),
  maxMessages: z.number().min(1).max(10000),
  maxRetries: z.number().min(0).max(10),
  retryDelay: z.number().min(1000).max(300000), // 1 second to 5 minutes
  dailyEmailLimit: z.number().min(1).max(100000),
  hourlyEmailLimit: z.number().min(1).max(10000)
});

export const uploadSettingsSchema = z.object({
  maxFileSize: z.number().min(1024).max(1073741824), // 1KB to 1GB
  allowedFileTypes: z.array(z.string()).min(1),
  uploadPath: z.string().min(1),
  cdnUrl: z.string().url().optional(),
  enableVirusScan: z.boolean()
});

export const apiSettingsSchema = z.object({
  baseUrl: z.string().url(),
  timeout: z.number().min(1000).max(300000), // 1 second to 5 minutes
  retryAttempts: z.number().min(0).max(10),
  retryDelay: z.number().min(100).max(60000), // 100ms to 1 minute
  enableSwagger: z.boolean(),
  enableCors: z.boolean(),
  corsOrigins: z.array(z.string().url()).optional()
});

export const rateLimitSettingsSchema = z.object({
  authRequests: z.number().min(1).max(1000),
  authWindow: z.number().min(60000).max(3600000), // 1 minute to 1 hour
  apiRequests: z.number().min(1).max(10000),
  apiWindow: z.number().min(1000).max(3600000), // 1 second to 1 hour
  uploadRequests: z.number().min(1).max(100),
  uploadWindow: z.number().min(1000).max(3600000) // 1 second to 1 hour
});
// KYC update validation schema
export const kycUpdateSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']),
  rejectionReason: z.string().optional(),
  adminNotes: z.string().optional(),
  documentsRequired: z.array(z.string()).optional(),
});

// KYC document upload schema
export const kycDocumentSchema = z.object({
  documentType: z.enum(['national_id', 'passport', 'drivers_license', 'utility_bill', 'bank_statement']),
  documentUrl: z.string().url(),
  documentNumber: z.string().optional(),
  expiryDate: z.string().datetime().optional(),
});


export const bulkActionSchema = z.object({
  userIds: z.array(objectIdValidator).min(1, 'At least one user ID is required').max(100, 'Maximum 100 users allowed'),
  action: z.enum(['activate', 'suspend', 'ban', 'approve_kyc', 'reject_kyc', 'upgrade_plan']),
  metadata: z.object({
    reason: z.string().optional(),
    planId: objectIdValidator.optional(),
    rejectionReason: z.string().optional()
  }).optional()
});