import { z } from 'zod';

// Environment validation schema
const envSchema = z.object({
  // Node Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Application
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  APP_NAME: z.string().default('Financial Admin Panel'),
  APP_VERSION: z.string().default('1.0.0'),
  
  // Database
  MONGODB_URI: z.string().min(1),
  MONGODB_DB_NAME: z.string().default('financial_app'),
  DB_MAX_POOL_SIZE: z.string().transform(Number).default('10'),
  DB_SERVER_TIMEOUT: z.string().transform(Number).default('5000'),
  DB_SOCKET_TIMEOUT: z.string().transform(Number).default('45000'),
  DB_AUTH_SOURCE: z.string().default('admin'),
  DB_RETRY_ATTEMPTS: z.string().transform(Number).default('3'),
  DB_RETRY_DELAY: z.string().transform(Number).default('1000'),
  
  // Email Configuration
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.string().transform(Number).default('587'),
  SMTP_SECURE: z.string().transform(Boolean).default('false'),
  SMTP_USER: z.string().email(),
  SMTP_PASS: z.string().min(1),
  EMAIL_FROM_NAME: z.string().default('Financial Admin Panel'),
  EMAIL_FROM_ADDRESS: z.string().email().optional(),
  SMTP_MAX_CONNECTIONS: z.string().transform(Number).default('5'),
  SMTP_MAX_MESSAGES: z.string().transform(Number).default('100'),
  EMAIL_MAX_RETRIES: z.string().transform(Number).default('3'),
  EMAIL_RETRY_DELAY: z.string().transform(Number).default('5000'),
  EMAIL_BATCH_SIZE: z.string().transform(Number).default('10'),
  EMAIL_RATE_LIMIT_HOUR: z.string().transform(Number).default('100'),
  EMAIL_RATE_LIMIT_DAY: z.string().transform(Number).default('1000'),
  
  // OAuth Providers
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  FACEBOOK_CLIENT_ID: z.string().optional(),
  FACEBOOK_CLIENT_SECRET: z.string().optional(),
  
  // Security
  ENCRYPTION_KEY: z.string().min(32),
  JWT_SECRET: z.string().min(32),
  CSRF_SECRET: z.string().min(32).optional(),
  
  // Payment Gateways
  COINGATE_API_KEY: z.string().optional(),
  COINGATE_SECRET: z.string().optional(),
  UDDOKTAPAY_API_KEY: z.string().optional(),
  UDDOKTAPAY_SECRET: z.string().optional(),
  
  // External Services
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().default('us-east-1'),
  AWS_S3_BUCKET: z.string().optional(),
  CDN_URL: z.string().url().optional(),
  
  // Backup Email Providers
  SENDGRID_API_KEY: z.string().optional(),
  SENDGRID_FROM_EMAIL: z.string().email().optional(),
  AWS_SES_REGION: z.string().default('us-east-1'),
  
  // Monitoring & Analytics
  SENTRY_DSN: z.string().url().optional(),
  GOOGLE_ANALYTICS_ID: z.string().optional(),
  
  // Feature Flags
  ENABLE_2FA: z.string().transform(Boolean).default('true'),
  ENABLE_DEVICE_LIMITING: z.string().transform(Boolean).default('true'),
  ENABLE_EMAIL_VERIFICATION: z.string().transform(Boolean).default('true'),
  ENABLE_LOAN_FEATURE: z.string().transform(Boolean).default('true'),
  ENABLE_REFERRAL_SYSTEM: z.string().transform(Boolean).default('true'),
  
  // Rate Limiting
  RATE_LIMIT_AUTH_REQUESTS: z.string().transform(Number).default('5'),
  RATE_LIMIT_AUTH_WINDOW: z.string().transform(Number).default('900000'), // 15 minutes
  RATE_LIMIT_API_REQUESTS: z.string().transform(Number).default('100'),
  RATE_LIMIT_API_WINDOW: z.string().transform(Number).default('60000'), // 1 minute
  RATE_LIMIT_UPLOAD_REQUESTS: z.string().transform(Number).default('10'),
  RATE_LIMIT_UPLOAD_WINDOW: z.string().transform(Number).default('60000'), // 1 minute
  
  // File Upload
  MAX_FILE_SIZE: z.string().transform(Number).default(String(10 * 1024 * 1024)), // 10MB
  UPLOAD_DIR: z.string().default('./uploads'),
  
  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FILE: z.string().optional(),
  
  // Support
  SUPPORT_EMAIL: z.string().email().default('support@financialapp.com'),
  SUPPORT_PHONE: z.string().optional(),
  COMPANY_NAME: z.string().default('Financial Solutions Inc.'),
  COMPANY_ADDRESS: z.string().optional(),
});

// Parse and validate environment variables
function parseEnvVars() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      throw new Error(`Environment validation failed:\n${missingVars.join('\n')}`);
    }
    throw error;
  }
}

// Get validated environment variables
export const env = parseEnvVars();

// Environment helpers
export const isDevelopment = env.NODE_ENV === 'development';
export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';

// Feature flags
export const features = {
  twoFactorAuth: env.ENABLE_2FA,
  deviceLimiting: env.ENABLE_DEVICE_LIMITING,
  emailVerification: env.ENABLE_EMAIL_VERIFICATION,
  loanFeature: env.ENABLE_LOAN_FEATURE,
  referralSystem: env.ENABLE_REFERRAL_SYSTEM,
};

// Rate limiting configuration
export const rateLimits = {
  auth: {
    requests: env.RATE_LIMIT_AUTH_REQUESTS,
    windowMs: env.RATE_LIMIT_AUTH_WINDOW
  },
  api: {
    requests: env.RATE_LIMIT_API_REQUESTS,
    windowMs: env.RATE_LIMIT_API_WINDOW
  },
  upload: {
    requests: env.RATE_LIMIT_UPLOAD_REQUESTS,
    windowMs: env.RATE_LIMIT_UPLOAD_WINDOW
  }
};

// Database configuration from environment
export const dbConfig = {
  uri: env.MONGODB_URI,
  dbName: env.MONGODB_DB_NAME,
  options: {
    maxPoolSize: env.DB_MAX_POOL_SIZE,
    serverSelectionTimeoutMS: env.DB_SERVER_TIMEOUT,
    socketTimeoutMS: env.DB_SOCKET_TIMEOUT,
    authSource: env.DB_AUTH_SOURCE
  },
  retry: {
    attempts: env.DB_RETRY_ATTEMPTS,
    delay: env.DB_RETRY_DELAY
  }
};

// Email configuration from environment
export const emailEnvConfig = {
  smtp: {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS
    },
    pool: true,
    maxConnections: env.SMTP_MAX_CONNECTIONS,
    maxMessages: env.SMTP_MAX_MESSAGES
  },
  from: {
    name: env.EMAIL_FROM_NAME,
    address: env.EMAIL_FROM_ADDRESS || env.SMTP_USER
  },
  limits: {
    maxRetries: env.EMAIL_MAX_RETRIES,
    retryDelay: env.EMAIL_RETRY_DELAY,
    batchSize: env.EMAIL_BATCH_SIZE,
    hourlyLimit: env.EMAIL_RATE_LIMIT_HOUR,
    dailyLimit: env.EMAIL_RATE_LIMIT_DAY
  }
};

// Security configuration
export const securityConfig = {
  encryptionKey: env.ENCRYPTION_KEY,
  jwtSecret: env.JWT_SECRET,
  csrfSecret: env.CSRF_SECRET,
  sessionTimeout: 30 * 60 * 1000, // 30 minutes
  maxLoginAttempts: 5,
  lockoutDuration: 15 * 60 * 1000 // 15 minutes
};

// External service configuration
export const externalServices = {
  aws: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    region: env.AWS_REGION,
    s3Bucket: env.AWS_S3_BUCKET
  },
  oauth: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET
    },
    facebook: {
      clientId: env.FACEBOOK_CLIENT_ID,
      clientSecret: env.FACEBOOK_CLIENT_SECRET
    }
  },
  payments: {
    coingate: {
      apiKey: env.COINGATE_API_KEY,
      secret: env.COINGATE_SECRET
    },
    uddoktaPay: {
      apiKey: env.UDDOKTAPAY_API_KEY,
      secret: env.UDDOKTAPAY_SECRET
    }
  }
};

// Application metadata
export const appConfig = {
  name: env.APP_NAME,
  version: env.APP_VERSION,
  url: env.NEXTAUTH_URL,
  support: {
    email: env.SUPPORT_EMAIL,
    phone: env.SUPPORT_PHONE
  },
  company: {
    name: env.COMPANY_NAME,
    address: env.COMPANY_ADDRESS
  }
};

// Validate required environment variables on startup
export function validateRequiredEnv() {
  const required = [
    'MONGODB_URI',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL',
    'SMTP_HOST',
    'SMTP_USER',
    'SMTP_PASS',
    'ENCRYPTION_KEY',
    'JWT_SECRET'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// Export everything
export default env;