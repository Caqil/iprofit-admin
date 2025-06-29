import type SMTPTransport from 'nodemailer/lib/smtp-transport';

interface EmailConfig {
  smtp: SMTPTransport.Options;
  from: {
    name: string;
    address: string;
  };
  templates: {
    baseUrl: string;
    defaultLanguage: string;
  };
  queue: {
    maxRetries: number;
    retryDelay: number;
    batchSize: number;
  };
  rateLimit: {
    maxPerHour: number;
    maxPerDay: number;
  };
}

export const emailConfig: EmailConfig = {
  smtp: {
    host: process.env.SMTP_HOST!,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER!,
      pass: process.env.SMTP_PASS!
    },
    // Connection timeout
    connectionTimeout: 60000, // 60 seconds
    greetingTimeout: 30000, // 30 seconds
    socketTimeout: 60000, // 60 seconds
    
    // Pool settings for better performance
    // maxConnections and maxMessages are not valid SMTPTransport.Options properties and have been removed.
    
    // Security options
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production'
    },
    
    // Debug for development
    debug: process.env.NODE_ENV === 'development',
    logger: process.env.NODE_ENV === 'development'
  },

  from: {
    name: process.env.EMAIL_FROM_NAME || 'Financial Admin Panel',
    address: process.env.EMAIL_FROM_ADDRESS || process.env.SMTP_USER!
  },

  templates: {
    baseUrl: process.env.NEXTAUTH_URL || 'http://localhost:3000',
    defaultLanguage: 'en'
  },

  queue: {
    maxRetries: parseInt(process.env.EMAIL_MAX_RETRIES || '3'),
    retryDelay: parseInt(process.env.EMAIL_RETRY_DELAY || '5000'), // 5 seconds
    batchSize: parseInt(process.env.EMAIL_BATCH_SIZE || '10')
  },

  rateLimit: {
    maxPerHour: parseInt(process.env.EMAIL_RATE_LIMIT_HOUR || '100'),
    maxPerDay: parseInt(process.env.EMAIL_RATE_LIMIT_DAY || '1000')
  }
};

// Email template configurations
export const emailTemplates = {
  // KYC Templates
  kycApproved: {
    subject: '✅ KYC Verification Approved - {{userName}}',
    template: 'kyc-approved',
    variables: ['userName', 'approvalDate', 'loginUrl']
  },
  
  kycRejected: {
    subject: '❌ KYC Verification Rejected - Action Required',
    template: 'kyc-rejected', 
    variables: ['userName', 'rejectionReason', 'resubmitUrl', 'supportEmail']
  },

  // Transaction Templates
  withdrawalApproved: {
    subject: '💰 Withdrawal Approved - {{amount}}',
    template: 'withdrawal-approved',
    variables: ['userName', 'amount', 'processedDate', 'accountUrl']
  },

  withdrawalRejected: {
    subject: '❌ Withdrawal Rejected - {{amount}}',
    template: 'withdrawal-rejected',
    variables: ['userName', 'amount', 'rejectionReason', 'supportEmail']
  },

  depositConfirmed: {
    subject: '💳 Deposit Confirmed - {{amount}}',
    template: 'deposit-confirmed',
    variables: ['userName', 'amount', 'currency', 'transactionId', 'accountUrl']
  },

  // Loan Templates - Following same pattern
  loanApplicationReceived: {
    subject: '📋 Loan Application Received - {{applicationId}}',
    template: 'loan-application-received',
    variables: ['userName', 'loanAmount', 'applicationId', 'expectedProcessingTime']
  },

  loanApproved: {
    subject: '🎉 Loan Application Approved - ${{loanAmount}}',
    template: 'loan-approved', 
    variables: ['userName', 'loanAmount', 'emiAmount', 'interestRate', 'tenure', 'loanId']
  },

  loanRejected: {
    subject: '❌ Loan Application Update',
    template: 'loan-rejected',
    variables: ['userName', 'loanAmount', 'loanId', 'rejectionReason']
  },

  loanDisbursed: {
    subject: '💰 Loan Disbursed Successfully - ${{loanAmount}}',
    template: 'loan-disbursed',
    variables: ['userName', 'loanAmount', 'emiAmount', 'interestRate', 'tenure', 'loanId']
  },

  loanCompleted: {
    subject: '🎊 Loan Successfully Completed - Congratulations!',
    template: 'loan-completed',
    variables: ['userName', 'loanAmount', 'loanId']
  },

  loanRepaymentConfirmed: {
    subject: '✅ Loan Payment Confirmed - ${{paidAmount}}',
    template: 'loan-repayment-confirmed',
    variables: ['userName', 'loanId', 'installmentNumber', 'paidAmount', 'remainingAmount', 'transactionId', 'paidAt', 'isCompleted']
  },

  loanPaymentReminder: {
    subject: '⏰ Loan Payment Reminder - ${{emiAmount}} Due {{dueDate}}',
    template: 'loan-payment-reminder',
    variables: ['userName', 'loanId', 'emiAmount', 'dueDate', 'installmentNumber', 'paymentUrl']
  },

  loanPaymentOverdue: {
    subject: '🚨 Overdue Loan Payment - Action Required',
    template: 'loan-payment-overdue',
    variables: ['userName', 'loanId', 'emiAmount', 'overdueAmount', 'penaltyAmount', 'paymentUrl', 'supportEmail']
  },

  loanReminder: {
    subject: '⏰ Loan Payment Reminder - {{emiAmount}} Due {{dueDate}}',
    template: 'loan-reminder',
    variables: ['userName', 'emiAmount', 'dueDate', 'paymentUrl']
  },

  loanOverdue: {
    subject: '🚨 Overdue Loan Payment - {{emiAmount}}',
    template: 'loan-overdue',
    variables: ['userName', 'emiAmount', 'overdueAmount', 'penaltyAmount', 'paymentUrl']
  },

  // Referral Templates
  referralBonus: {
    subject: '🎁 Referral Bonus Credited - {{bonusAmount}}',
    template: 'referral-bonus',
    variables: ['userName', 'bonusAmount', 'refereeName', 'creditDate', 'accountUrl']
  },

  // Task Templates
  taskApproved: {
    subject: '✅ Task Completed - {{taskName}} ({{reward}})',
    template: 'task-approved',
    variables: ['userName', 'taskName', 'reward', 'completedDate', 'accountUrl']
  },

  taskRejected: {
    subject: '❌ Task Submission Rejected - {{taskName}}',
    template: 'task-rejected',
    variables: ['userName', 'taskName', 'rejectionReason', 'resubmitUrl']
  },

  // System Templates
  welcome: {
    subject: '🎉 Welcome to Financial Platform - {{userName}}',
    template: 'welcome',
    variables: ['userName', 'planName', 'activationUrl', 'supportEmail']
  },

  passwordReset: {
    subject: '🔒 Password Reset Request',
    template: 'password-reset',
    variables: ['userName', 'resetUrl', 'expiryTime']
  },

  accountSuspended: {
    subject: '⚠️ Account Suspended - Important Notice',
    template: 'account-suspended',
    variables: ['userName', 'suspensionReason', 'appealUrl', 'supportEmail']
  },

  planUpgrade: {
    subject: '🚀 Plan Upgraded Successfully - {{newPlanName}}',
    template: 'plan-upgrade',
    variables: ['userName', 'oldPlanName', 'newPlanName', 'upgradeDate', 'featuresUrl']
  },

  // Security Templates
  loginAlert: {
    subject: '🔐 New Login to Your Account',
    template: 'login-alert',
    variables: ['userName', 'loginTime', 'location', 'device', 'securityUrl']
  },

  deviceAlert: {
    subject: '🚨 New Device Detected',
    template: 'device-alert',
    variables: ['userName', 'deviceInfo', 'location', 'authorizeUrl', 'supportEmail']
  }
};

// Email validation rules
export const emailValidation = {
  maxSubjectLength: 100,
  maxBodyLength: 50000,
  allowedAttachmentTypes: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ],
  maxAttachmentSize: 5 * 1024 * 1024, // 5MB
  maxAttachmentsPerEmail: 5
};

// Email provider configurations for different environments
export const emailProviders = {
  development: {
    provider: 'ethereal', // For testing
    config: {
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false
    }
  },
  
  production: {
    provider: 'smtp',
    config: emailConfig.smtp
  },
  
  // Backup providers
  backup: {
    sendgrid: {
      apiKey: process.env.SENDGRID_API_KEY,
      from: process.env.SENDGRID_FROM_EMAIL
    },
    
    ses: {
      region: process.env.AWS_SES_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
  }
};

// Export email configuration
export default emailConfig;