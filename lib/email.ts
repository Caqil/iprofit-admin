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