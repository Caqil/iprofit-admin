import { z } from 'zod';

// Common validation schemas
export const emailSchema = z.string().email('Invalid email address');
export const phoneSchema = z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number');
export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
    'Password must contain uppercase, lowercase, number and special character');

// Admin schemas
export const adminCreateSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['SuperAdmin', 'Moderator'] as const)
});

export const adminUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.enum(['SuperAdmin', 'Moderator'] as const).optional(),
  isActive: z.boolean().optional(),
  permissions: z.array(z.string()).optional()
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  userType: z.enum(['admin', 'user']),
  twoFactorToken: z.string().optional(),
  rememberMe: z.boolean().optional().default(false),
  deviceId: z.string().optional(),
  fingerprint: z.string().optional()
}).refine((data) => {
  // For user login, deviceId and fingerprint are required
  if (data.userType === 'user') {
    return data.deviceId && data.fingerprint;
  }
  return true;
}, {
  message: 'Device ID and fingerprint are required for user login',
  path: ['deviceId']
});

// User schemas
export const userCreateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: emailSchema,
  phone: phoneSchema,
  planId: z.string().min(1, 'Plan is required'),
  deviceId: z.string().min(1, 'Device ID is required'),
  referralCode: z.string().optional()
});

export const userUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
  status: z.enum(['Active', 'Suspended', 'Banned'] as const).optional(),
  planId: z.string().optional(),
  address: z.object({
    street: z.string(),
    city: z.string(),
    state: z.string(),
    country: z.string(),
    zipCode: z.string()
  }).optional(),
  dateOfBirth: z.coerce.date().optional()
});

export const kycApprovalSchema = z.object({
  userId: z.string().min(1),
  action: z.enum(['approve', 'reject']),
  rejectionReason: z.string().optional()
});

// Transaction schemas
export const transactionCreateSchema = z.object({
  userId: z.string().min(1),
  type: z.enum(['deposit', 'withdrawal', 'bonus', 'profit', 'penalty'] as const),
  amount: z.number().positive('Amount must be positive'),
  currency: z.enum(['USD', 'BDT'] as const),
  gateway: z.enum(['CoinGate', 'UddoktaPay', 'Manual', 'System'] as const),
  description: z.string().optional()
});

export const transactionApprovalSchema = z.object({
  transactionId: z.string().min(1),
  action: z.enum(['approve', 'reject']),
  reason: z.string().optional(),
  adminNotes: z.string().optional()
});

export const withdrawalRequestSchema = z.object({
  userId: z.string().min(1),
  amount: z.number().positive().min(100, 'Minimum withdrawal is 100 BDT'),
  currency: z.enum(['USD', 'BDT'] as const),
  withdrawalMethod: z.string().min(1),
  accountDetails: z.object({
    accountNumber: z.string().optional(),
    routingNumber: z.string().optional(),
    bankName: z.string().optional(),
    walletAddress: z.string().optional()
  })
});

// Plan schemas
export const planCreateSchema = z.object({
  name: z.string().min(2, 'Plan name must be at least 2 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  price: z.number().min(0, 'Price cannot be negative'),
  currency: z.enum(['USD', 'BDT'] as const),
  depositLimit: z.number().positive(),
  withdrawalLimit: z.number().positive(),
  profitLimit: z.number().positive(),
  minimumDeposit: z.number().positive(),
  minimumWithdrawal: z.number().positive(),
  dailyWithdrawalLimit: z.number().positive(),
  monthlyWithdrawalLimit: z.number().positive(),
  features: z.array(z.string()),
  duration: z.number().positive().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format'),
  priority: z.number().min(0).optional()
});

// Loan schemas
export const loanApplicationSchema = z.object({
  userId: z.string().min(1),
  amount: z.number().positive().max(5500, 'Maximum loan amount is $5,500'),
  currency: z.enum(['USD', 'BDT'] as const),
  purpose: z.string().min(10, 'Purpose must be at least 10 characters'),
  tenure: z.number().min(6).max(60, 'Tenure must be between 6-60 months'),
  monthlyIncome: z.number().positive(),
  employmentStatus: z.string().min(1),
  employmentDetails: z.object({
    company: z.string().min(1),
    position: z.string().min(1),
    workingSince: z.coerce.date(),
    salary: z.number().positive()
  }),
  personalDetails: z.object({
    maritalStatus: z.string(),
    dependents: z.number().min(0),
    education: z.string()
  }),
  financialDetails: z.object({
    bankBalance: z.number().min(0),
    monthlyExpenses: z.number().positive(),
    existingLoans: z.number().min(0),
    assets: z.array(z.object({
      type: z.string(),
      value: z.number().positive(),
      description: z.string()
    }))
  })
});

export const emiCalculatorSchema = z.object({
  loanAmount: z.number().positive().max(5500),
  interestRate: z.number().positive().max(50),
  tenure: z.number().min(6).max(60)
});

export const loanApprovalSchema = z.object({
  loanId: z.string().min(1),
  action: z.enum(['approve', 'reject']),
  rejectionReason: z.string().optional(),
  interestRate: z.number().positive().optional(),
  conditions: z.string().optional()
});

// Task schemas
export const taskCreateSchema = z.object({
  name: z.string().min(3, 'Task name must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  criteria: z.string().min(10, 'Criteria must be at least 10 characters'),
  reward: z.number().positive(),
  currency: z.enum(['USD', 'BDT'] as const),
  category: z.string().min(1),
  difficulty: z.enum(['Easy', 'Medium', 'Hard'] as const),
  estimatedTime: z.number().positive(),
  instructions: z.array(z.string()),
  requiredProof: z.array(z.string()),
  validFrom: z.coerce.date(),
  validUntil: z.coerce.date().optional(),
  maxCompletions: z.number().positive().optional(),
  isRepeatable: z.boolean().optional(),
  cooldownPeriod: z.number().positive().optional()
});

export const taskSubmissionSchema = z.object({
  taskId: z.string().min(1),
  userId: z.string().min(1),
  proof: z.array(z.object({
    type: z.string(),
    content: z.string(),
    uploadedAt: z.coerce.date()
  })),
  submissionNote: z.string().optional()
});

// Notification schemas
export const notificationCreateSchema = z.object({
  userId: z.string().optional(),
  type: z.enum(['KYC', 'Withdrawal', 'Loan', 'Task', 'Referral', 'System', 'Marketing'] as const),
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

// Pagination and filtering schemas
export const paginationSchema = z.object({
  page: z.number().positive().default(1),
  limit: z.number().positive().max(100).default(10),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
});

export const dateRangeSchema = z.object({
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional()
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

