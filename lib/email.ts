import nodemailer from 'nodemailer';
import { Notification } from '@/models/Notification';
import { EmailTemplateData, NotificationType } from '@/types';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

const emailConfig: EmailConfig = {
  host: process.env.SMTP_HOST!,
  port: parseInt(process.env.SMTP_PORT!) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER!,
    pass: process.env.SMTP_PASS!
  }
};

const transporter = nodemailer.createTransport(emailConfig);

export async function sendEmail(emailData: EmailTemplateData): Promise<boolean> {
  try {
    const template = await getEmailTemplate(emailData.templateId);
    const htmlContent = processTemplate(template.content, emailData.variables);
    const subject = processTemplate(template.subject || emailData.subject, emailData.variables);

    const mailOptions = {
      from: `"${process.env.APP_NAME}" <${process.env.SMTP_FROM}>`,
      to: emailData.to,
      subject: subject,
      html: htmlContent,
      attachments: emailData.attachments?.map(att => ({
        filename: att.filename,
        content: att.content,
        contentType: att.contentType
      }))
    };

    const result = await transporter.sendMail(mailOptions);
    
    // Log successful email
    await Notification.create({
      type: 'System',
      channel: 'email',
      title: subject,
      message: 'Email sent successfully',
      status: 'Sent',
      sentAt: new Date(),
      metadata: {
        emailId: result.messageId,
        templateId: emailData.templateId
      }
    });

    return true;
  } catch (error) {
    console.error('Email sending failed:', error);
    
    // Log failed email
    await Notification.create({
      type: 'System',
      channel: 'email',
      title: emailData.subject,
      message: 'Email sending failed',
      status: 'Failed',
      failureReason: error instanceof Error ? error.message : 'Unknown error',
      metadata: {
        templateId: emailData.templateId
      }
    });

    return false;
  }
}

// Existing helper functions
export async function sendKYCApprovalEmail(userEmail: string, userName: string): Promise<boolean> {
  return sendEmail({
    to: userEmail,
    subject: 'KYC Verification Approved',
    templateId: 'kyc_approved',
    variables: {
      userName,
      approvalDate: new Date().toLocaleDateString(),
      loginUrl: `${process.env.NEXTAUTH_URL}/login`
    }
  });
}

export async function sendKYCRejectionEmail(
  userEmail: string, 
  userName: string, 
  reason: string
): Promise<boolean> {
  return sendEmail({
    to: userEmail,
    subject: 'KYC Verification Rejected',
    templateId: 'kyc_rejected',
    variables: {
      userName,
      rejectionReason: reason,
      resubmitUrl: `${process.env.NEXTAUTH_URL}/kyc`,
      supportEmail: process.env.SUPPORT_EMAIL
    }
  });
}

export async function sendWithdrawalApprovalEmail(
  userEmail: string,
  userName: string,
  amount: number,
  currency: string
): Promise<boolean> {
  return sendEmail({
    to: userEmail,
    subject: 'Withdrawal Request Approved',
    templateId: 'withdrawal_approved',
    variables: {
      userName,
      amount: `${amount} ${currency}`,
      processedDate: new Date().toLocaleDateString(),
      accountUrl: `${process.env.NEXTAUTH_URL}/account`
    }
  });
}

export async function sendLoanApprovalEmail(
  userEmail: string,
  userName: string,
  loanAmount: number,
  currency: string,
  emiAmount: number
): Promise<boolean> {
  return sendEmail({
    to: userEmail,
    subject: 'Loan Application Approved',
    templateId: 'loan_approved',
    variables: {
      userName,
      loanAmount: `${loanAmount} ${currency}`,
      emiAmount: `${emiAmount} ${currency}`,
      approvalDate: new Date().toLocaleDateString(),
      loanUrl: `${process.env.NEXTAUTH_URL}/loans`
    }
  });
}

export async function sendReferralBonusEmail(
  userEmail: string,
  userName: string,
  bonusAmount: number,
  refereeName: string
): Promise<boolean> {
  return sendEmail({
    to: userEmail,
    subject: 'Referral Bonus Credited',
    templateId: 'referral_bonus',
    variables: {
      userName,
      bonusAmount: `${bonusAmount} BDT`,
      refereeName,
      creditDate: new Date().toLocaleDateString(),
      accountUrl: `${process.env.NEXTAUTH_URL}/account`
    }
  });
}

// NEW LOAN HELPER FUNCTIONS - Following same pattern
export async function sendLoanApplicationReceivedEmail(
  userEmail: string,
  userName: string,
  loanAmount: number,
  applicationId: string
): Promise<boolean> {
  return sendEmail({
    to: userEmail,
    subject: 'Loan Application Received',
    templateId: 'loan_application_received',
    variables: {
      userName,
      loanAmount,
      applicationId,
      expectedProcessingTime: '3-5 business days'
    }
  });
}

export async function sendLoanRejectionEmail(
  userEmail: string,
  userName: string,
  loanAmount: number,
  loanId: string,
  rejectionReason: string
): Promise<boolean> {
  return sendEmail({
    to: userEmail,
    subject: 'Loan Application Update',
    templateId: 'loan_rejected',
    variables: {
      userName,
      loanAmount,
      loanId,
      rejectionReason
    }
  });
}

export async function sendLoanDisbursedEmail(
  userEmail: string,
  userName: string,
  loanAmount: number,
  emiAmount: number,
  interestRate: number,
  tenure: number,
  loanId: string
): Promise<boolean> {
  return sendEmail({
    to: userEmail,
    subject: 'Loan Disbursed Successfully',
    templateId: 'loan_disbursed',
    variables: {
      userName,
      loanAmount,
      emiAmount,
      interestRate,
      tenure,
      loanId
    }
  });
}
export async function sendReferralInviteEmail(
  recipientEmail: string,
  inviterName: string,
  inviterEmail: string,
  referralUrl: string,
  personalMessage?: string
): Promise<boolean> {
  return sendEmail({
    to: recipientEmail,
    subject: `${inviterName} invited you to join ${process.env.APP_NAME || 'our platform'}`,
    templateId: 'referral_invite',
    variables: {
      recipientEmail,
      inviterName,
      inviterEmail,
      personalMessage: personalMessage || '',
      referralUrl,
      bonusAmount: '50 BDT',
      appName: process.env.APP_NAME || 'Financial Platform',
      supportEmail: process.env.SUPPORT_EMAIL || 'support@platform.com',
      hasPersonalMessage: !!personalMessage
    }
  });
}

export async function sendLoanCompletedEmail(
  userEmail: string,
  userName: string,
  loanAmount: number,
  loanId: string
): Promise<boolean> {
  return sendEmail({
    to: userEmail,
    subject: 'Loan Successfully Completed',
    templateId: 'loan_completed',
    variables: {
      userName,
      loanAmount,
      loanId
    }
  });
}

export async function sendLoanRepaymentConfirmationEmail(
  userEmail: string,
  userName: string,
  loanId: string,
  installmentNumber: number,
  paidAmount: number,
  remainingAmount: number,
  transactionId: string,
  paidAt: string,
  isCompleted: boolean
): Promise<boolean> {
  return sendEmail({
    to: userEmail,
    subject: 'Loan Payment Confirmed',
    templateId: 'loan_repayment_confirmed',
    variables: {
      userName,
      loanId,
      installmentNumber,
      paidAmount,
      remainingAmount,
      transactionId,
      paidAt,
      isCompleted
    }
  });
}

export async function sendLoanPaymentReminderEmail(
  userEmail: string,
  userName: string,
  loanId: string,
  emiAmount: number,
  dueDate: string,
  installmentNumber: number
): Promise<boolean> {
  return sendEmail({
    to: userEmail,
    subject: 'Loan Payment Reminder',
    templateId: 'loan_payment_reminder',
    variables: {
      userName,
      loanId,
      emiAmount,
      dueDate,
      installmentNumber,
      paymentUrl: `${process.env.NEXTAUTH_URL}/user/loans/${loanId}/pay`
    }
  });
}

export async function sendLoanPaymentOverdueEmail(
  userEmail: string,
  userName: string,
  loanId: string,
  emiAmount: number,
  overdueAmount: number,
  penaltyAmount: number
): Promise<boolean> {
  return sendEmail({
    to: userEmail,
    subject: 'Overdue Loan Payment - Action Required',
    templateId: 'loan_payment_overdue',
    variables: {
      userName,
      loanId,
      emiAmount,
      overdueAmount,
      penaltyAmount,
      paymentUrl: `${process.env.NEXTAUTH_URL}/user/loans/${loanId}/pay`,
      supportEmail: process.env.SUPPORT_EMAIL
    }
  });
}
export async function sendDeviceRemovedEmail(
  userEmail: string,
  userName: string,
  deviceName: string,
  devicePlatform: string,
  deviceType: string,
  wasPrimary: boolean,
  remainingDevices: number,
  clientIP?: string
): Promise<boolean> {
  return sendEmail({
    to: userEmail,
    subject: 'Device Removed from Account',
    templateId: 'device_removed',
    variables: {
      userName,
      deviceName,
      devicePlatform,
      deviceType: deviceType || 'Unknown',
      removalTime: new Date().toLocaleString(),
      removalDate: new Date().toLocaleDateString(),
      wasPrimary: wasPrimary ? 'Yes' : 'No',
      remainingDevices,
      securityUrl: `${process.env.NEXTAUTH_URL}/user/security`,
      supportEmail: process.env.SUPPORT_EMAIL || 'support@platform.com',
      clientIP: clientIP || 'Unknown'
    }
  });
}

export async function sendDeviceRegisteredEmail(
  userEmail: string,
  userName: string,
  deviceName: string,
  devicePlatform: string,
  appVersion: string,
  clientIP: string,
  isPrimary: boolean = false
): Promise<boolean> {
  return sendEmail({
    to: userEmail,
    subject: 'New Device Registered',
    templateId: 'device_registered',
    variables: {
      userName,
      deviceName,
      devicePlatform,
      appVersion,
      registrationTime: new Date().toLocaleString(),
      registrationDate: new Date().toLocaleDateString(),
      clientIP,
      isPrimary: isPrimary ? 'Yes' : 'No',
      securityUrl: `${process.env.NEXTAUTH_URL}/user/security`,
      supportEmail: process.env.SUPPORT_EMAIL || 'support@platform.com'
    }
  });
}

export async function sendSuspiciousDeviceActivityEmail(
  userEmail: string,
  userName: string,
  activityType: string,
  deviceName: string,
  location: string
): Promise<boolean> {
  return sendEmail({
    to: userEmail,
    subject: 'Suspicious Device Activity Detected',
    templateId: 'device_suspicious_activity',
    variables: {
      userName,
      activityType,
      deviceName,
      location,
      detectionTime: new Date().toLocaleString(),
      securityUrl: `${process.env.NEXTAUTH_URL}/user/security`,
      supportEmail: process.env.SUPPORT_EMAIL || 'support@platform.com'
    }
  });
}
async function getEmailTemplate(templateId: string) {
  // In a real implementation, this would fetch from database
  const templates: Record<string, { subject: string; content: string }> = {
    kyc_approved: {
      subject: '✅ KYC Verification Approved - {{userName}}',
      content: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #22c55e;">KYC Verification Approved</h2>
          <p>Dear {{userName}},</p>
          <p>Congratulations! Your KYC verification has been approved on {{approvalDate}}.</p>
          <p>You can now access all features of our platform including:</p>
          <ul>
            <li>Make deposits and withdrawals</li>
            <li>Apply for loans</li>
            <li>Participate in referral programs</li>
          </ul>
          <a href="{{loginUrl}}" style="background: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
            Access Your Account
          </a>
          <p>Thank you for choosing our platform!</p>
        </div>
      `
    },
    kyc_rejected: {
      subject: '❌ KYC Verification Rejected - Action Required',
      content: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #ef4444;">KYC Verification Rejected</h2>
          <p>Dear {{userName}},</p>
          <p>Unfortunately, your KYC verification was rejected for the following reason:</p>
          <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 20px 0;">
            <strong>Rejection Reason:</strong> {{rejectionReason}}
          </div>
          <p>Please resubmit your documents with the correct information.</p>
          <a href="{{resubmitUrl}}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
            Resubmit Documents
          </a>
          <p>If you need assistance, contact us at {{supportEmail}}</p>
        </div>
      `
    },
    withdrawal_approved: {
      subject: '💰 Withdrawal Approved - {{amount}}',
      content: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #22c55e;">Withdrawal Approved</h2>
          <p>Dear {{userName}},</p>
          <p>Your withdrawal request has been approved and processed.</p>
          <div style="background: #f0fdf4; border: 1px solid #22c55e; padding: 16px; margin: 20px 0; border-radius: 6px;">
            <strong>Amount:</strong> {{amount}}<br>
            <strong>Processed on:</strong> {{processedDate}}
          </div>
          <p>The funds will be transferred to your account within 2-3 business days.</p>
          <a href="{{accountUrl}}" style="background: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
            View Account
          </a>
        </div>
      `
    },
    admin_loan_application_notification: {
  subject: '🔔 New Loan Application - {{userName}} ({{loanAmount}} BDT)',
  content: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc2626;">New Loan Application Received</h2>
      <p>Dear {{adminName}},</p>
      <p>A new loan application has been submitted and requires your review.</p>
      
      <!-- Applicant Details -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; margin: 20px 0; border-radius: 8px;">
        <h3 style="margin: 0 0 15px 0; color: #1e293b;">📋 Application Details</h3>
        <strong>Applicant Name:</strong> {{userName}}<br>
        <strong>Email:</strong> {{userEmail}}<br>
        <strong>Application ID:</strong> {{applicationId}}<br>
        <strong>Loan Amount:</strong> {{loanAmount}} BDT<br>
        <strong>Interest Rate:</strong> {{interestRate}}% per annum<br>
        <strong>Monthly EMI:</strong> {{emiAmount}} BDT
      </div>
      
      <!-- Risk Assessment -->
      <div style="background: {{riskColor}}; border: 1px solid {{riskBorderColor}}; padding: 20px; margin: 20px 0; border-radius: 8px;">
        <h3 style="margin: 0 0 15px 0; color: #1e293b;">📊 Risk Assessment</h3>
        <strong>Credit Score:</strong> {{creditScore}}/850<br>
        <strong>Risk Level:</strong> <span style="color: {{riskTextColor}}; font-weight: bold;">{{riskLevel}}</span><br>
        <strong>Debt-to-Income Ratio:</strong> {{debtToIncomeRatio}}%<br>
        <strong>AI Recommendation:</strong> <span style="font-weight: bold;">{{recommendation}}</span>
      </div>
      
      <!-- Action Buttons -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{reviewUrl}}" 
           style="background: #2563eb; 
                  color: #ffffff; 
                  padding: 12px 30px; 
                  text-decoration: none; 
                  border-radius: 6px; 
                  display: inline-block; 
                  font-weight: bold; 
                  margin-right: 10px;">
          📝 Review Application
        </a>
        <a href="{{reviewUrl}}/approve" 
           style="background: #059669; 
                  color: #ffffff; 
                  padding: 12px 30px; 
                  text-decoration: none; 
                  border-radius: 6px; 
                  display: inline-block; 
                  font-weight: bold; 
                  margin-left: 10px;">
          ✅ Quick Approve
        </a>
      </div>
      
      <!-- Footer -->
      <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center; color: #6b7280; font-size: 14px;">
        <p>This application was submitted on {{applicationDate}} via the user portal.</p>
        <p>Please review and process within 3-5 business days as per our SLA.</p>
      </div>
    </div>
  `
},
device_registered: {
  subject: '📱 New Device Registered to Your Account',
  content: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
      <!-- Header -->
      <div style="text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); border-radius: 12px;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">📱 Device Registered</h1>
        <p style="color: #bfdbfe; margin: 10px 0 0 0; font-size: 14px;">Security Notification for Your Account</p>
      </div>
      
      <!-- Main Content -->
      <div style="background: #eff6ff; border-radius: 12px; padding: 25px; margin-bottom: 25px; border-left: 4px solid #2563eb;">
        <p style="font-size: 16px; color: #1e293b; margin-bottom: 15px;">Dear {{userName}},</p>
        
        <p style="font-size: 16px; color: #475569; line-height: 1.6; margin-bottom: 20px;">
          A new device has been <strong>successfully registered</strong> to your account.
        </p>
        
        <!-- Device Details -->
        <div style="background: #ffffff; border: 1px solid #60a5fa; padding: 20px; margin: 20px 0; border-radius: 8px;">
          <h3 style="margin: 0 0 15px 0; color: #2563eb; font-size: 18px;">📋 Device Details</h3>
          <div style="color: #374151; line-height: 1.8;">
            <strong>Device Name:</strong> {{deviceName}}<br>
            <strong>Platform:</strong> {{devicePlatform}}<br>
            <strong>App Version:</strong> {{appVersion}}<br>
            <strong>Primary Device:</strong> {{isPrimary}}<br>
            <strong>Registered On:</strong> {{registrationTime}}<br>
            <strong>IP Address:</strong> {{clientIP}}
          </div>
        </div>
        
        <!-- Status Information -->
        <div style="background: #f0fdf4; border: 1px solid #22c55e; padding: 20px; margin: 20px 0; border-radius: 8px;">
          <h3 style="margin: 0 0 15px 0; color: #059669; font-size: 16px;">✅ Registration Successful</h3>
          <p style="margin: 0; color: #166534;">
            Your device is now active and ready to use. You can access your account securely from this device.
          </p>
        </div>
      </div>
      
      <!-- Security Notice -->
      <div style="background: #fefce8; border: 2px solid #fde047; border-radius: 12px; padding: 25px; margin-bottom: 25px;">
        <h3 style="margin: 0 0 15px 0; color: #ca8a04; font-size: 18px;">🛡️ Security Information</h3>
        <div style="color: #713f12; line-height: 1.6;">
          <p style="margin: 0 0 15px 0;">
            <strong>If you registered this device:</strong> Great! Your account security is up to date and this device is now trusted.
          </p>
          <p style="margin: 0;">
            <strong>If you did NOT register this device:</strong> Please take immediate action to secure your account.
          </p>
        </div>
      </div>
      
      <!-- Action Buttons -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{securityUrl}}" 
           style="background: #2563eb; 
                  color: #ffffff; 
                  padding: 15px 30px; 
                  text-decoration: none; 
                  border-radius: 8px; 
                  display: inline-block; 
                  font-weight: bold; 
                  font-size: 16px; 
                  margin-right: 10px;
                  box-shadow: 0 4px 15px rgba(37, 99, 235, 0.3);">
          🔧 Manage Devices
        </a>
        <a href="mailto:{{supportEmail}}" 
           style="background: #6b7280; 
                  color: #ffffff; 
                  padding: 15px 30px; 
                  text-decoration: none; 
                  border-radius: 8px; 
                  display: inline-block; 
                  font-weight: bold; 
                  font-size: 16px; 
                  margin-left: 10px;">
          📧 Contact Support
        </a>
      </div>
      
      <!-- Device Management Tips -->
      <div style="background: #f8fafc; border-radius: 12px; padding: 25px; margin-bottom: 25px;">
        <h4 style="margin: 0 0 20px 0; color: #1e293b; font-size: 16px;">💡 Device Management Tips:</h4>
        <ul style="color: #475569; line-height: 1.8; margin: 0; padding-left: 20px;">
          <li>Set a strong device passcode or biometric authentication</li>
          <li>Keep your app updated to the latest version</li>
          <li>Review your connected devices regularly</li>
          <li>Remove devices you no longer use or recognize</li>
          <li>Contact support if you notice any suspicious activity</li>
        </ul>
      </div>
      
      <!-- Quick Actions -->
      <div style="background: #f1f5f9; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
        <h4 style="margin: 0 0 15px 0; color: #1e293b; font-size: 16px;">🚀 Quick Actions:</h4>
        <div style="display: flex; flex-wrap: wrap; gap: 10px;">
          <a href="{{securityUrl}}" style="background: #e2e8f0; color: #475569; padding: 8px 16px; text-decoration: none; border-radius: 6px; font-size: 14px; flex: 1; min-width: 120px; text-align: center;">View All Devices</a>
          <a href="{{securityUrl}}/settings" style="background: #e2e8f0; color: #475569; padding: 8px 16px; text-decoration: none; border-radius: 6px; font-size: 14px; flex: 1; min-width: 120px; text-align: center;">Security Settings</a>
          <a href="{{securityUrl}}/two-factor" style="background: #e2e8f0; color: #475569; padding: 8px 16px; text-decoration: none; border-radius: 6px; font-size: 14px; flex: 1; min-width: 120px; text-align: center;">Enable 2FA</a>
        </div>
      </div>
      
      <!-- Footer -->
      <div style="border-top: 1px solid #e2e8f0; padding-top: 25px; text-align: center;">
        <p style="margin: 0 0 10px 0; font-size: 14px; color: #64748b;">
          This security notification was sent automatically when a new device was registered.
        </p>
        <p style="margin: 0 0 10px 0; font-size: 14px; color: #64748b;">
          For security questions, contact us at 
          <a href="mailto:{{supportEmail}}" style="color: #2563eb;">{{supportEmail}}</a>
        </p>
        <p style="margin: 15px 0 0 0; font-size: 11px; color: #cbd5e1;">
          Device registered on {{registrationDate}} | Your security is our priority
        </p>
      </div>
    </div>
  `
},
device_removed: {
  subject: '🚨 Device Removed from Your Account',
  content: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
      <!-- Header -->
      <div style="text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); border-radius: 12px;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: bold;">🚨 Device Removed</h1>
        <p style="color: #fecaca; margin: 10px 0 0 0; font-size: 14px;">Security Alert for Your Account</p>
      </div>
      
      <!-- Main Content -->
      <div style="background: #fef2f2; border-radius: 12px; padding: 25px; margin-bottom: 25px; border-left: 4px solid #dc2626;">
        <p style="font-size: 16px; color: #1e293b; margin-bottom: 15px;">Dear {{userName}},</p>
        
        <p style="font-size: 16px; color: #475569; line-height: 1.6; margin-bottom: 20px;">
          A device has been <strong>removed</strong> from your account. This is an important security notification.
        </p>
        
        <!-- Device Details -->
        <div style="background: #ffffff; border: 1px solid #f87171; padding: 20px; margin: 20px 0; border-radius: 8px;">
          <h3 style="margin: 0 0 15px 0; color: #dc2626; font-size: 18px;">📱 Removed Device Details</h3>
          <div style="color: #374151; line-height: 1.8;">
            <strong>Device Name:</strong> {{deviceName}}<br>
            <strong>Platform:</strong> {{devicePlatform}}<br>
            <strong>Device Type:</strong> {{deviceType}}<br>
            <strong>Was Primary:</strong> {{wasPrimary}}<br>
            <strong>Removed On:</strong> {{removalTime}}<br>
            <strong>IP Address:</strong> {{clientIP}}
          </div>
        </div>
        
        <!-- Account Status -->
        <div style="background: #fffbeb; border: 1px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 8px;">
          <h3 style="margin: 0 0 15px 0; color: #d97706; font-size: 16px;">📊 Account Status</h3>
          <p style="margin: 0; color: #92400e;">
            <strong>Remaining Devices:</strong> {{remainingDevices}} device(s) still connected to your account
          </p>
        </div>
      </div>
      
      <!-- Security Notice -->
      <div style="background: #fee2e2; border: 2px solid #fca5a5; border-radius: 12px; padding: 25px; margin-bottom: 25px;">
        <h3 style="margin: 0 0 15px 0; color: #dc2626; font-size: 18px;">⚠️ Important Security Notice</h3>
        <div style="color: #7f1d1d; line-height: 1.6;">
          <p style="margin: 0 0 15px 0;">
            <strong>If you removed this device:</strong> No further action is required. Your account remains secure.
          </p>
          <p style="margin: 0;">
            <strong>If you did NOT remove this device:</strong> Someone may have unauthorized access to your account. Please take immediate action.
          </p>
        </div>
      </div>
      
      <!-- Action Buttons -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{securityUrl}}" 
           style="background: #dc2626; 
                  color: #ffffff; 
                  padding: 15px 30px; 
                  text-decoration: none; 
                  border-radius: 8px; 
                  display: inline-block; 
                  font-weight: bold; 
                  font-size: 16px; 
                  margin-right: 10px;
                  box-shadow: 0 4px 15px rgba(220, 38, 38, 0.3);">
          🔒 Review Security Settings
        </a>
        <a href="mailto:{{supportEmail}}" 
           style="background: #6b7280; 
                  color: #ffffff; 
                  padding: 15px 30px; 
                  text-decoration: none; 
                  border-radius: 8px; 
                  display: inline-block; 
                  font-weight: bold; 
                  font-size: 16px; 
                  margin-left: 10px;">
          📧 Contact Support
        </a>
      </div>
      
      <!-- Security Tips -->
      <div style="background: #f8fafc; border-radius: 12px; padding: 25px; margin-bottom: 25px;">
        <h4 style="margin: 0 0 20px 0; color: #1e293b; font-size: 16px;">🛡️ Security Recommendations:</h4>
        <ul style="color: #475569; line-height: 1.8; margin: 0; padding-left: 20px;">
          <li>Regularly review your connected devices</li>
          <li>Use strong, unique passwords for your accounts</li>
          <li>Enable two-factor authentication if available</li>
          <li>Contact support immediately if you notice suspicious activity</li>
        </ul>
      </div>
      
      <!-- Footer -->
      <div style="border-top: 1px solid #e2e8f0; padding-top: 25px; text-align: center;">
        <p style="margin: 0 0 10px 0; font-size: 14px; color: #64748b;">
          This security alert was sent automatically to protect your account.
        </p>
        <p style="margin: 0 0 10px 0; font-size: 14px; color: #64748b;">
          If you have any concerns, please contact us at 
          <a href="mailto:{{supportEmail}}" style="color: #dc2626;">{{supportEmail}}</a>
        </p>
        <p style="margin: 15px 0 0 0; font-size: 11px; color: #cbd5e1;">
          Device removed on {{removalDate}} | Security is our priority
        </p>
      </div>
    </div>
  `
},
    loan_approved: {
      subject: '🎉 Loan Application Approved - {{loanAmount}}',
      content: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #22c55e;">Loan Application Approved</h2>
          <p>Dear {{userName}},</p>
          <p>Great news! Your loan application has been approved.</p>
          <div style="background: #f0fdf4; border: 1px solid #22c55e; padding: 16px; margin: 20px 0; border-radius: 6px;">
            <strong>Loan Amount:</strong> {{loanAmount}}<br>
            <strong>Monthly EMI:</strong> {{emiAmount}}<br>
            <strong>Approved on:</strong> {{approvalDate}}
          </div>
          <p>Your loan will be disbursed to your account within 24 hours.</p>
          <a href="{{loanUrl}}" style="background: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
            View Loan Details
          </a>
        </div>
      `
    },
    referral_bonus: {
      subject: '🎁 Referral Bonus Credited - {{bonusAmount}}',
      content: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #8b5cf6;">Referral Bonus Credited</h2>
          <p>Dear {{userName}},</p>
          <p>Congratulations! You've earned a referral bonus.</p>
          <div style="background: #faf5ff; border: 1px solid #8b5cf6; padding: 16px; margin: 20px 0; border-radius: 6px;">
            <strong>Bonus Amount:</strong> {{bonusAmount}}<br>
            <strong>Referred User:</strong> {{refereeName}}<br>
            <strong>Credited on:</strong> {{creditDate}}
          </div>
          <p>Keep referring friends to earn more bonuses!</p>
          <a href="{{accountUrl}}" style="background: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
            View Account
          </a>
        </div>
      `
    },

    // NEW LOAN TEMPLATES - Following same pattern
    loan_application_received: {
      subject: '📋 Loan Application Received - {{applicationId}}',
      content: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3b82f6;">Loan Application Received</h2>
          <p>Dear {{userName}},</p>
          <p>We have successfully received your loan application and our team is now reviewing it.</p>
          <div style="background: #eff6ff; border: 1px solid #3b82f6; padding: 16px; margin: 20px 0; border-radius: 6px;">
            <strong>Application ID:</strong> {{applicationId}}<br>
            <strong>Loan Amount:</strong> {{loanAmount}}<br>
            <strong>Expected Processing Time:</strong> {{expectedProcessingTime}}
          </div>
          <p>We will notify you via email once the review is complete. Thank you for choosing our services.</p>
        </div>
      `
    },

    loan_rejected: {
      subject: '❌ Loan Application Update',
      content: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #ef4444;">Loan Application Update</h2>
          <p>Dear {{userName}},</p>
          <p>We regret to inform you that your loan application has been declined after careful review.</p>
          <div style="background: #fef2f2; border: 1px solid #ef4444; padding: 16px; margin: 20px 0; border-radius: 6px;">
            <strong>Loan Amount:</strong> {{loanAmount}}<br>
            <strong>Application ID:</strong> {{loanId}}<br>
            <strong>Reason:</strong> {{rejectionReason}}
          </div>
          <p>You can reapply after 30 days or contact our support team for guidance.</p>
        </div>
      `
    },

    loan_disbursed: {
      subject: '💰 Loan Disbursed Successfully - ${{loanAmount}}',
      content: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #8b5cf6;">Loan Disbursed!</h2>
          <p>Dear {{userName}},</p>
          <p>Your loan amount has been successfully disbursed to your registered account.</p>
          <div style="background: #faf5ff; border: 1px solid #8b5cf6; padding: 16px; margin: 20px 0; border-radius: 6px;">
            <strong>Disbursed Amount:</strong> {{loanAmount}}<br>
            <strong>Monthly EMI:</strong> {{emiAmount}}<br>
            <strong>Interest Rate:</strong> {{interestRate}}% per annum<br>
            <strong>Loan ID:</strong> {{loanId}}
          </div>
          <p>Your first EMI payment is due 30 days from today.</p>
        </div>
      `
    },

    loan_completed: {
      subject: '🎊 Loan Successfully Completed!',
      content: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #059669;">Loan Completed!</h2>
          <p>Dear {{userName}},</p>
          <p>Congratulations! You have successfully completed your loan repayment!</p>
          <div style="background: #ecfdf5; border: 1px solid #059669; padding: 16px; margin: 20px 0; border-radius: 6px;">
            <strong>Loan Amount:</strong> {{loanAmount}}<br>
            <strong>Loan ID:</strong> {{loanId}}<br>
            <strong>Status:</strong> <span style="color: #059669; font-weight: bold;">COMPLETED</span>
          </div>
          <p>This achievement demonstrates excellent financial responsibility.</p>
        </div>
      `
    },

    loan_repayment_confirmed: {
      subject: '✅ Loan Payment Confirmed - ${{paidAmount}}',
      content: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #22c55e;">Payment Confirmed</h2>
          <p>Dear {{userName}},</p>
          <p>Your loan payment has been successfully processed and recorded.</p>
          <div style="background: #f0fdf4; border: 1px solid #22c55e; padding: 16px; margin: 20px 0; border-radius: 6px;">
            <strong>Loan ID:</strong> {{loanId}}<br>
            <strong>Installment:</strong> {{installmentNumber}}<br>
            <strong>Amount Paid:</strong> {{paidAmount}}<br>
            <strong>Payment Date:</strong> {{paidAt}}<br>
            <strong>Transaction ID:</strong> {{transactionId}}<br>
            <strong>Remaining Balance:</strong> {{remainingAmount}}
          </div>
          {{#if isCompleted}}
          <p style="color: #059669; font-weight: bold;">🎉 Congratulations! You have completed all loan payments!</p>
          {{/if}}
        </div>
      `
    },

    loan_payment_reminder: {
      subject: '⏰ Loan Payment Reminder - ${{emiAmount}} Due {{dueDate}}',
      content: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #f59e0b;">Payment Reminder</h2>
          <p>Dear {{userName}},</p>
          <p>This is a friendly reminder that your loan payment is due soon.</p>
          <div style="background: #fffbeb; border: 1px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 6px;">
            <strong>Loan ID:</strong> {{loanId}}<br>
            <strong>Installment:</strong> {{installmentNumber}}<br>
            <strong>Amount Due:</strong> {{emiAmount}}<br>
            <strong>Due Date:</strong> {{dueDate}}
          </div>
          <p>Please ensure you have sufficient funds in your account.</p>
          <a href="{{paymentUrl}}" style="background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
            Make Payment Now
          </a>
        </div>
      `
    },

    loan_payment_overdue: {
      subject: '🚨 Overdue Loan Payment - Action Required',
      content: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">Payment Overdue</h2>
          <p>Dear {{userName}},</p>
          <p>Your loan payment is now overdue. Please make the payment immediately to avoid additional penalties.</p>
          <div style="background: #fef2f2; border: 1px solid #dc2626; padding: 16px; margin: 20px 0; border-radius: 6px;">
            <strong>Loan ID:</strong> {{loanId}}<br>
            <strong>Original EMI:</strong> {{emiAmount}}<br>
            <strong>Overdue Amount:</strong> {{overdueAmount}}<br>
            <strong>Penalty:</strong> {{penaltyAmount}}
          </div>
          <p>Please pay the overdue amount within 7 days to avoid further penalties.</p>
          <a href="{{paymentUrl}}" style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
            Pay Now
          </a>
          <p>Need help? Contact us at {{supportEmail}}</p>
        </div>
      `
    },
    referral_invite: {
    subject: '🎉 {{inviterName}} invited you to join {{appName}}',
    content: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">🎉 You're Invited!</h1>
          <p style="color: #f1f5f9; margin: 10px 0 0 0; font-size: 16px;">Join {{appName}} and start earning</p>
        </div>
        
        <!-- Main Content -->
        <div style="background: #f8fafc; border-radius: 12px; padding: 30px; margin-bottom: 25px;">
          <p style="font-size: 18px; color: #1e293b; margin-bottom: 20px;">Hi there! 👋</p>
          
          <p style="font-size: 16px; color: #475569; line-height: 1.6; margin-bottom: 20px;">
            <strong>{{inviterName}}</strong> ({{inviterEmail}}) has invited you to join our financial platform and thought you'd love what we have to offer!
          </p>
          
          {{#if hasPersonalMessage}}
          <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 20px; margin: 25px 0; border-radius: 8px;">
            <p style="margin: 0; font-style: italic; color: #1e40af; font-size: 16px;">
              💬 "{{personalMessage}}"
            </p>
            <p style="margin: 10px 0 0 0; font-size: 14px; color: #64748b;">
              - {{inviterName}}
            </p>
          </div>
          {{/if}}
        </div>
        
        <!-- Bonus Section -->
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 12px; padding: 25px; margin-bottom: 30px; text-align: center;">
          <h3 style="margin: 0 0 15px 0; color: #ffffff; font-size: 22px;">🎁 Welcome Bonus</h3>
          <p style="margin: 0; color: #d1fae5; font-size: 16px; line-height: 1.5;">
            Sign up now and get <strong style="color: #ffffff; font-size: 20px;">{{bonusAmount}}</strong> as a welcome bonus when you complete your registration!
          </p>
        </div>
        
        <!-- CTA Button -->
        <div style="text-align: center; margin: 35px 0;">
          <a href="{{referralUrl}}" 
             style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); 
                    color: #ffffff; 
                    padding: 18px 40px; 
                    text-decoration: none; 
                    border-radius: 50px; 
                    display: inline-block; 
                    font-weight: bold; 
                    font-size: 18px; 
                    box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3);">
            🚀 Join Now & Claim Bonus
          </a>
        </div>
        
        <!-- Features Section -->
        <div style="background: #f1f5f9; border-radius: 12px; padding: 25px; margin-bottom: 25px;">
          <h4 style="margin: 0 0 20px 0; color: #1e293b; font-size: 18px; text-align: center;">✨ What you'll get:</h4>
          <div style="text-align: center;">
            <div style="display: inline-block; margin: 0 20px; text-align: center;">
              <div style="font-size: 24px; margin-bottom: 8px;">💰</div>
              <p style="margin: 0; color: #475569; font-size: 14px;">Instant Bonus</p>
            </div>
            <div style="display: inline-block; margin: 0 20px; text-align: center;">
              <div style="font-size: 24px; margin-bottom: 8px;">📈</div>
              <p style="margin: 0; color: #475569; font-size: 14px;">Smart Investing</p>
            </div>
            <div style="display: inline-block; margin: 0 20px; text-align: center;">
              <div style="font-size: 24px; margin-bottom: 8px;">🔒</div>
              <p style="margin: 0; color: #475569; font-size: 14px;">Secure Platform</p>
            </div>
          </div>
        </div>
        
        <!-- Alternative Link -->
        <div style="background: #ffffff; border: 2px dashed #cbd5e1; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
          <p style="margin: 0 0 10px 0; font-size: 14px; color: #64748b; text-align: center;">
            Button not working? Copy and paste this link:
          </p>
          <p style="margin: 0; text-align: center; word-break: break-all;">
            <a href="{{referralUrl}}" style="color: #3b82f6; font-size: 14px;">{{referralUrl}}</a>
          </p>
        </div>
        
        <!-- Footer -->
        <div style="border-top: 1px solid #e2e8f0; padding-top: 25px; text-align: center;">
          <p style="margin: 0 0 10px 0; font-size: 14px; color: #64748b;">
            This invitation was sent by {{inviterName}}
          </p>
          <p style="margin: 0; font-size: 12px; color: #94a3b8;">
            Questions? Contact us at 
            <a href="mailto:{{supportEmail}}" style="color: #3b82f6;">{{supportEmail}}</a>
          </p>
          <p style="margin: 15px 0 0 0; font-size: 11px; color: #cbd5e1;">
            {{appName}} - Secure Financial Platform
          </p>
        </div>
      </div>
    `
    }
  };

  return templates[templateId] || { subject: 'Notification', content: 'No template found' };
}

function processTemplate(template: string, variables: Record<string, any>): string {
  let processed = template;
  
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    processed = processed.replace(regex, String(value));
  });
  
  return processed;
}