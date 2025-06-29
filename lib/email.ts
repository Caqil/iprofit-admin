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

const transporter = nodemailer.createTransporter(emailConfig);

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
            <strong>Loan Amount:</strong> ${{loanAmount}}<br>
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
            <strong>Loan Amount:</strong> ${{loanAmount}}<br>
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
            <strong>Disbursed Amount:</strong> ${{loanAmount}}<br>
            <strong>Monthly EMI:</strong> ${{emiAmount}}<br>
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
            <strong>Loan Amount:</strong> ${{loanAmount}}<br>
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
            <strong>Amount Paid:</strong> ${{paidAmount}}<br>
            <strong>Payment Date:</strong> {{paidAt}}<br>
            <strong>Transaction ID:</strong> {{transactionId}}<br>
            <strong>Remaining Balance:</strong> ${{remainingAmount}}
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
            <strong>Amount Due:</strong> ${{emiAmount}}<br>
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
            <strong>Original EMI:</strong> ${{emiAmount}}<br>
            <strong>Overdue Amount:</strong> ${{overdueAmount}}<br>
            <strong>Penalty:</strong> ${{penaltyAmount}}
          </div>
          <p>Please pay the overdue amount within 7 days to avoid further penalties.</p>
          <a href="{{paymentUrl}}" style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0;">
            Pay Now
          </a>
          <p>Need help? Contact us at {{supportEmail}}</p>
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