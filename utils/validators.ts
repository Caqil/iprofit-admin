import { z } from 'zod';
import { VALIDATION_RULES, LOAN_CONFIG, TRANSACTION_CONFIG } from './constants';

// Basic validation functions
export function isValidEmail(email: string): boolean {
  return VALIDATION_RULES.EMAIL.REGEX.test(email) && email.length <= VALIDATION_RULES.EMAIL.MAX_LENGTH;
}

export function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/\s/g, '');
  return VALIDATION_RULES.PHONE.REGEX.test(cleaned) && 
         cleaned.length >= VALIDATION_RULES.PHONE.MIN_LENGTH &&
         cleaned.length <= VALIDATION_RULES.PHONE.MAX_LENGTH;
}

export function isValidPassword(password: string): boolean {
  const rules = VALIDATION_RULES.PASSWORD;
  
  if (password.length < rules.MIN_LENGTH) return false;
  if (rules.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) return false;
  if (rules.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) return false;
  if (rules.REQUIRE_NUMBER && !/\d/.test(password)) return false;
  if (rules.REQUIRE_SPECIAL && !/[@$!%*?&]/.test(password)) return false;
  
  return true;
}

export function isValidName(name: string): boolean {
  return VALIDATION_RULES.NAME.REGEX.test(name) &&
         name.length >= VALIDATION_RULES.NAME.MIN_LENGTH &&
         name.length <= VALIDATION_RULES.NAME.MAX_LENGTH;
}

export function isValidObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

export function isValidReferralCode(code: string): boolean {
  return /^[A-Z0-9]{6,10}$/.test(code);
}

export function isValidTicketNumber(ticketNumber: string): boolean {
  return /^TKT-[A-Z0-9]+-[A-Z0-9]+$/.test(ticketNumber);
}

// Business logic validators
export function isValidLoanAmount(amount: number, currency: 'USD' | 'BDT' = 'USD'): boolean {
  if (currency === 'USD') {
    return amount >= LOAN_CONFIG.AMOUNTS.MINIMUM && amount <= LOAN_CONFIG.AMOUNTS.MAXIMUM;
  }
  // Convert BDT to USD for validation
  const usdAmount = amount / 120;
  return usdAmount >= LOAN_CONFIG.AMOUNTS.MINIMUM && usdAmount <= LOAN_CONFIG.AMOUNTS.MAXIMUM;
}

export function isValidInterestRate(rate: number): boolean {
  return rate >= LOAN_CONFIG.INTEREST_RATES.MINIMUM && rate <= LOAN_CONFIG.INTEREST_RATES.MAXIMUM;
}

export function isValidLoanTenure(tenure: number): boolean {
  return tenure >= LOAN_CONFIG.TENURE.MINIMUM_MONTHS && tenure <= LOAN_CONFIG.TENURE.MAXIMUM_MONTHS;
}

export function isValidCreditScore(score: number): boolean {
  return score >= LOAN_CONFIG.CREDIT_SCORE.MINIMUM && score <= LOAN_CONFIG.CREDIT_SCORE.MAXIMUM;
}

export function isValidWithdrawalAmount(amount: number): boolean {
  return amount >= TRANSACTION_CONFIG.MINIMUM_AMOUNTS.WITHDRAWAL;
}

export function isValidDepositAmount(amount: number): boolean {
  return amount >= TRANSACTION_CONFIG.MINIMUM_AMOUNTS.DEPOSIT;
}

// File validation
export function isValidFileSize(size: number, maxSize: number = 10 * 1024 * 1024): boolean {
  return size > 0 && size <= maxSize;
}

export function isValidFileType(fileName: string, allowedTypes: string[]): boolean {
  const extension = fileName.split('.').pop()?.toLowerCase();
  return extension ? allowedTypes.includes(extension) : false;
}

export function isValidImageFile(fileName: string): boolean {
  return isValidFileType(fileName, ['jpg', 'jpeg', 'png', 'webp']);
}

export function isValidDocumentFile(fileName: string): boolean {
  return isValidFileType(fileName, ['pdf', 'doc', 'docx']);
}

// URL validation
export function isValidURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function isValidImageURL(url: string): boolean {
  return isValidURL(url) && /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
}

// Date validation
export function isValidBirthDate(date: Date): boolean {
  const now = new Date();
  const age = now.getFullYear() - date.getFullYear();
  return age >= 18 && age <= 100;
}

export function isValidFutureDate(date: Date): boolean {
  return date > new Date();
}

export function isValidPastDate(date: Date): boolean {
  return date < new Date();
}

// Advanced validators using Zod schemas
export const emailValidator = z.string()
  .email('Invalid email format')
  .max(VALIDATION_RULES.EMAIL.MAX_LENGTH, 'Email too long')
  .refine(isValidEmail, 'Invalid email address');

export const phoneValidator = z.string()
  .min(VALIDATION_RULES.PHONE.MIN_LENGTH, 'Phone number too short')
  .max(VALIDATION_RULES.PHONE.MAX_LENGTH, 'Phone number too long')
  .refine(isValidPhone, 'Invalid phone number format');

export const passwordValidator = z.string()
  .min(VALIDATION_RULES.PASSWORD.MIN_LENGTH, `Password must be at least ${VALIDATION_RULES.PASSWORD.MIN_LENGTH} characters`)
  .refine(isValidPassword, 'Password must contain uppercase, lowercase, number and special character');

export const nameValidator = z.string()
  .min(VALIDATION_RULES.NAME.MIN_LENGTH, 'Name too short')
  .max(VALIDATION_RULES.NAME.MAX_LENGTH, 'Name too long')
  .refine(isValidName, 'Name contains invalid characters');

export const objectIdValidator = z.string()
  .refine(isValidObjectId, 'Invalid ID format');

export const loanAmountValidator = z.number()
  .positive('Amount must be positive')
  .refine((amount) => isValidLoanAmount(amount), 
    `Loan amount must be between $${LOAN_CONFIG.AMOUNTS.MINIMUM} and $${LOAN_CONFIG.AMOUNTS.MAXIMUM}`);

export const interestRateValidator = z.number()
  .min(LOAN_CONFIG.INTEREST_RATES.MINIMUM, `Interest rate must be at least ${LOAN_CONFIG.INTEREST_RATES.MINIMUM}%`)
  .max(LOAN_CONFIG.INTEREST_RATES.MAXIMUM, `Interest rate cannot exceed ${LOAN_CONFIG.INTEREST_RATES.MAXIMUM}%`);

export const tenureValidator = z.number()
  .int('Tenure must be a whole number')
  .min(LOAN_CONFIG.TENURE.MINIMUM_MONTHS, `Minimum tenure is ${LOAN_CONFIG.TENURE.MINIMUM_MONTHS} months`)
  .max(LOAN_CONFIG.TENURE.MAXIMUM_MONTHS, `Maximum tenure is ${LOAN_CONFIG.TENURE.MAXIMUM_MONTHS} months`);

export const creditScoreValidator = z.number()
  .int('Credit score must be a whole number')
  .min(LOAN_CONFIG.CREDIT_SCORE.MINIMUM, `Minimum credit score is ${LOAN_CONFIG.CREDIT_SCORE.MINIMUM}`)
  .max(LOAN_CONFIG.CREDIT_SCORE.MAXIMUM, `Maximum credit score is ${LOAN_CONFIG.CREDIT_SCORE.MAXIMUM}`);

export const withdrawalAmountValidator = z.number()
  .positive('Amount must be positive')
  .min(TRANSACTION_CONFIG.MINIMUM_AMOUNTS.WITHDRAWAL, 
    `Minimum withdrawal amount is ${TRANSACTION_CONFIG.MINIMUM_AMOUNTS.WITHDRAWAL} BDT`);

export const depositAmountValidator = z.number()
  .positive('Amount must be positive')
  .min(TRANSACTION_CONFIG.MINIMUM_AMOUNTS.DEPOSIT, 
    `Minimum deposit amount is ${TRANSACTION_CONFIG.MINIMUM_AMOUNTS.DEPOSIT} BDT`);

export const urlValidator = z.string()
  .url('Invalid URL format')
  .refine(isValidURL, 'Invalid URL');

export const birthDateValidator = z.coerce.date()
  .refine(isValidBirthDate, 'Must be at least 18 years old');

export const futureDateValidator = z.coerce.date()
  .refine(isValidFutureDate, 'Date must be in the future');

export const pastDateValidator = z.coerce.date()
  .refine(isValidPastDate, 'Date must be in the past');

// Composite validators for complex forms
export const userRegistrationValidator = z.object({
  name: nameValidator,
  email: emailValidator,
  phone: phoneValidator,
  password: passwordValidator,
  confirmPassword: z.string(),
  dateOfBirth: birthDateValidator.optional(),
  referralCode: z.string().optional().refine(
    (code) => !code || isValidReferralCode(code), 
    'Invalid referral code format'
  )
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

export const loanApplicationValidator = z.object({
  amount: loanAmountValidator,
  purpose: z.string().min(10, 'Purpose must be at least 10 characters'),
  tenure: tenureValidator,
  monthlyIncome: z.number().positive('Monthly income must be positive'),
  employmentStatus: z.string().min(1, 'Employment status is required'),
  employmentDetails: z.object({
    company: z.string().min(1, 'Company name is required'),
    position: z.string().min(1, 'Position is required'),
    workingSince: pastDateValidator,
    salary: z.number().positive('Salary must be positive')
  }),
  personalDetails: z.object({
    maritalStatus: z.enum(['Single', 'Married', 'Divorced', 'Widowed']),
    dependents: z.number().min(0, 'Dependents cannot be negative'),
    education: z.string().min(1, 'Education is required')
  }),
  financialDetails: z.object({
    bankBalance: z.number().min(0, 'Bank balance cannot be negative'),
    monthlyExpenses: z.number().positive('Monthly expenses must be positive'),
    existingLoans: z.number().min(0, 'Existing loans cannot be negative')
  })
});

export const transactionValidator = z.object({
  amount: z.number().positive('Amount must be positive'),
  currency: z.enum(['USD', 'BDT']),
  type: z.enum(['deposit', 'withdrawal', 'bonus', 'profit', 'penalty']),
  gateway: z.enum(['CoinGate', 'UddoktaPay', 'Manual', 'System']),
  description: z.string().optional()
});

export const kycDocumentValidator = z.object({
  type: z.enum(['national_id', 'passport', 'driving_license', 'utility_bill', 'bank_statement', 'selfie_with_id']),
  fileName: z.string().min(1, 'File name is required'),
  fileSize: z.number().positive('File size must be positive').refine(
    (size) => isValidFileSize(size), 
    'File size too large (max 10MB)'
  ),
  mimeType: z.string().min(1, 'File type is required')
});

export const planValidator = z.object({
  name: z.string().min(2, 'Plan name must be at least 2 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  price: z.number().min(0, 'Price cannot be negative'),
  currency: z.enum(['USD', 'BDT']),
  depositLimit: z.number().positive('Deposit limit must be positive'),
  withdrawalLimit: z.number().positive('Withdrawal limit must be positive'),
  profitLimit: z.number().positive('Profit limit must be positive'),
  minimumDeposit: z.number().positive('Minimum deposit must be positive'),
  minimumWithdrawal: z.number().positive('Minimum withdrawal must be positive'),
  dailyWithdrawalLimit: z.number().positive('Daily withdrawal limit must be positive'),
  monthlyWithdrawalLimit: z.number().positive('Monthly withdrawal limit must be positive'),
  features: z.array(z.string()),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid color format'),
  priority: z.number().min(0, 'Priority cannot be negative').optional()
});

export const taskValidator = z.object({
  name: z.string().min(3, 'Task name must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  criteria: z.string().min(10, 'Criteria must be at least 10 characters'),
  reward: z.number().positive('Reward must be positive'),
  currency: z.enum(['USD', 'BDT']),
  category: z.string().min(1, 'Category is required'),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']),
  estimatedTime: z.number().positive('Estimated time must be positive'),
  instructions: z.array(z.string()),
  requiredProof: z.array(z.string()),
  validFrom: z.coerce.date(),
  validUntil: z.coerce.date().optional(),
  maxCompletions: z.number().positive().optional(),
  isRepeatable: z.boolean().optional(),
  cooldownPeriod: z.number().positive().optional()
}).refine((data) => {
  if (data.validUntil) {
    return data.validUntil > data.validFrom;
  }
  return true;
}, {
  message: "End date must be after start date",
  path: ["validUntil"]
});

export const notificationValidator = z.object({
  type: z.enum(['KYC', 'Withdrawal', 'Loan', 'Task', 'Referral', 'System', 'Marketing']),
  channel: z.enum(['email', 'sms', 'in_app', 'push']),
  title: z.string().min(1, 'Title is required'),
  message: z.string().min(1, 'Message is required'),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).optional(),
  scheduledAt: z.coerce.date().optional(),
  recipients: z.array(z.object({
    userId: objectIdValidator,
    variables: z.record(z.any()).optional()
  }))
});

export const supportTicketValidator = z.object({
  subject: z.string().min(5, 'Subject must be at least 5 characters'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
  category: z.string().min(1, 'Category is required'),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).optional(),
  attachments: z.array(z.object({
    fileName: z.string(),
    fileSize: z.number(),
    mimeType: z.string()
  })).optional()
});

export const newsArticleValidator = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  content: z.string().min(50, 'Content must be at least 50 characters'),
  excerpt: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  tags: z.array(z.string()),
  featuredImage: urlValidator.optional(),
  status: z.enum(['Draft', 'Published', 'Archived']),
  isSticky: z.boolean().optional(),
  publishedAt: z.coerce.date().optional()
});

// Validation helper functions
export function validateAndSanitize<T>(
  data: unknown,
  validator: z.ZodSchema<T>
): { success: true; data: T } | { success: false; errors: string[] } {
  try {
    const result = validator.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      return { success: false, errors };
    }
    return { success: false, errors: ['Validation failed'] };
  }
}

export function getValidationErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  
  error.errors.forEach(err => {
    const path = err.path.join('.');
    errors[path] = err.message;
  });
  
  return errors;
}

export function createFieldValidator<T>(
  schema: z.ZodSchema<T>
): (value: unknown) => string | undefined {
  return (value: unknown) => {
    try {
      schema.parse(value);
      return undefined;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return error.errors[0]?.message;
      }
      return 'Validation failed';
    }
  };
}

// Custom validation rules for specific business logic
export function validateLoanEligibility(
  income: number,
  existingLoans: number,
  creditScore: number,
  requestedAmount: number
): { eligible: boolean; reasons: string[] } {
  const reasons: string[] = [];
  
  // Minimum income requirement
  if (income < 15000) {
    reasons.push('Minimum monthly income of 15,000 BDT required');
  }
  
  // Debt-to-income ratio
  const debtToIncomeRatio = existingLoans / income;
  if (debtToIncomeRatio > 0.4) {
    reasons.push('Debt-to-income ratio too high (max 40%)');
  }
  
  // Credit score requirement
  if (creditScore < LOAN_CONFIG.CREDIT_SCORE.MINIMUM + 200) {
    reasons.push(`Credit score too low (minimum ${LOAN_CONFIG.CREDIT_SCORE.MINIMUM + 200})`);
  }
  
  // Maximum loan amount based on income
  const maxLoanAmount = income * 12; // 12 months of income
  if (requestedAmount > maxLoanAmount) {
    reasons.push(`Requested amount exceeds maximum allowed (${maxLoanAmount} BDT)`);
  }
  
  return {
    eligible: reasons.length === 0,
    reasons
  };
}

export function validateWithdrawalEligibility(
  userBalance: number,
  requestedAmount: number,
  dailyLimit: number,
  monthlyLimit: number,
  todayWithdrawals: number,
  monthlyWithdrawals: number
): { eligible: boolean; reasons: string[] } {
  const reasons: string[] = [];
  
  // Sufficient balance
  if (requestedAmount > userBalance) {
    reasons.push('Insufficient balance');
  }
  
  // Minimum amount
  if (requestedAmount < TRANSACTION_CONFIG.MINIMUM_AMOUNTS.WITHDRAWAL) {
    reasons.push(`Minimum withdrawal amount is ${TRANSACTION_CONFIG.MINIMUM_AMOUNTS.WITHDRAWAL} BDT`);
  }
  
  // Daily limit
  if (todayWithdrawals + requestedAmount > dailyLimit) {
    reasons.push(`Daily withdrawal limit exceeded (${dailyLimit} BDT)`);
  }
  
  // Monthly limit
  if (monthlyWithdrawals + requestedAmount > monthlyLimit) {
    reasons.push(`Monthly withdrawal limit exceeded (${monthlyLimit} BDT)`);
  }
  
  return {
    eligible: reasons.length === 0,
    reasons
  };
}

export function validateKYCDocuments(documents: Array<{
  type: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const requiredTypes = ['national_id', 'selfie_with_id'];
  const providedTypes = documents.map(doc => doc.type);
  
  // Check required documents
  for (const required of requiredTypes) {
    if (!providedTypes.includes(required)) {
      errors.push(`${required.replace('_', ' ')} is required`);
    }
  }
  
  // Validate each document
  documents.forEach((doc, index) => {
    // File size validation
    if (!isValidFileSize(doc.fileSize)) {
      errors.push(`Document ${index + 1}: File size too large (max 10MB)`);
    }
    
    // File type validation
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(doc.mimeType)) {
      errors.push(`Document ${index + 1}: Invalid file type`);
    }
    
    // File name validation
    if (!doc.fileName || doc.fileName.length < 3) {
      errors.push(`Document ${index + 1}: Invalid file name`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
}

export function validateDeviceInfo(deviceInfo: {
  deviceId: string;
  fingerprint: string;
  userAgent: string;
}): { valid: boolean; suspicious: boolean; reasons: string[] } {
  const reasons: string[] = [];
  let suspicious = false;
  
  // Basic validation
  if (!deviceInfo.deviceId || deviceInfo.deviceId.length < 10) {
    reasons.push('Invalid device ID');
  }
  
  if (!deviceInfo.fingerprint || deviceInfo.fingerprint.length < 10) {
    reasons.push('Invalid device fingerprint');
  }
  
  if (!deviceInfo.userAgent || deviceInfo.userAgent.length < 10) {
    reasons.push('Invalid user agent');
  }
  
  // Suspicious patterns
  const suspiciousPatterns = [
    'emulator',
    'simulator',
    'virtualbox',
    'vmware',
    'parallel',
    'bluestacks',
    'nox',
    'ldplayer'
  ];
  
  const userAgentLower = deviceInfo.userAgent.toLowerCase();
  for (const pattern of suspiciousPatterns) {
    if (userAgentLower.includes(pattern)) {
      suspicious = true;
      reasons.push(`Suspicious device detected: ${pattern}`);
      break;
    }
  }
  
  return {
    valid: reasons.length === 0,
    suspicious,
    reasons
  };
}

// Rate limiting validation
export function validateRateLimit(
  requests: number,
  windowMs: number,
  maxRequests: number,
  lastRequest: Date
): { allowed: boolean; resetTime: Date; remaining: number } {
  const now = new Date();
  const timeSinceLastRequest = now.getTime() - lastRequest.getTime();
  
  // Reset if window has passed
  if (timeSinceLastRequest >= windowMs) {
    return {
      allowed: true,
      resetTime: new Date(now.getTime() + windowMs),
      remaining: maxRequests - 1
    };
  }
  
  // Check if within limit
  const allowed = requests < maxRequests;
  const resetTime = new Date(lastRequest.getTime() + windowMs);
  const remaining = Math.max(0, maxRequests - requests - 1);
  
  return {
    allowed,
    resetTime,
    remaining
  };
}