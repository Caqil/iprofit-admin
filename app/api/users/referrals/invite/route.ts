import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { AuditLog } from '@/models/AuditLog';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import { getUserFromRequest } from '@/lib/auth-helper';
import { sendEmail } from '@/lib/email';
import mongoose from 'mongoose';

// Validation schema for referral invite
const referralInviteSchema = z.object({
  emails: z.array(z.string().email()).min(1).max(50, 'Maximum 50 emails allowed'),
  personalMessage: z.string().max(500).optional(),
  inviteType: z.enum(['email', 'whatsapp', 'sms']).default('email')
});

async function sendReferralInviteHandler(request: NextRequest) {
  const apiHandler = new ApiHandler(request);

  try {
    // Connect to database
    await connectToDatabase();

    // Get authenticated user
    const authResult = await getUserFromRequest(request);
    if (!authResult) {
      return apiHandler.unauthorized('Authentication required');
    }

    const userId = new mongoose.Types.ObjectId(authResult.userId);

    // Parse request body
    const body = await request.json();
    const validationResult = referralInviteSchema.safeParse(body);
    
    if (!validationResult.success) {
      return apiHandler.validationError(
        validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      );
    }

    const { emails, personalMessage, inviteType } = validationResult.data;

    // Get user data
    const user = await User.findById(userId).select('name email referralCode');
    if (!user) {
      return apiHandler.notFound('User not found');
    }

    // Check rate limiting (max 100 invites per day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const invitesToday = await AuditLog.countDocuments({
      adminId: userId,
      action: 'REFERRAL_INVITE_SENT',
      createdAt: { $gte: today }
    });

    if (invitesToday + emails.length > 100) {
      return apiHandler.badRequest('Daily invite limit exceeded. Maximum 100 invites per day.');
    }

    // Check for existing users to avoid spam
    const existingUsers = await User.find({ email: { $in: emails } }).select('email');
    const existingEmails = existingUsers.map(u => u.email);
    const newEmails = emails.filter(email => !existingEmails.includes(email));

    if (newEmails.length === 0) {
      return apiHandler.badRequest('All provided emails are already registered users.');
    }

    // Generate referral URL
    const referralUrl = `${process.env.NEXTAUTH_URL}/register?ref=${user.referralCode}`;

    // Send invites based on type
    const results = {
      sent: [] as string[],
      failed: [] as string[],
      skipped: existingEmails
    };

    if (inviteType === 'email') {
      // Send email invites
      for (const email of newEmails) {
        try {
          await sendEmail({
            to: email,
            subject: `${user.name} invited you to join our platform`,
            subject: `${user.name} invited you to join our platform`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                  <h1 style="color: #2563eb;">You're Invited!</h1>
                </div>
                
                <p>Hi there!</p>
                
                <p><strong>${user.name}</strong> (${user.email}) has invited you to join our financial platform.</p>
                
                ${personalMessage ? `
                  <div style="background: #f0f9ff; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; font-style: italic;">"${personalMessage}"</p>
                  </div>
                ` : ''}
                
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; margin: 20px 0; border-radius: 8px;">
                  <h3 style="margin-top: 0; color: #1e40af;">🎁 Special Welcome Bonus</h3>
                  <p style="margin-bottom: 0;">Join now and get <strong>50 BDT</strong> welcome bonus when you complete registration!</p>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${referralUrl}" 
                     style="background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold; font-size: 16px;">
                    Join Now & Get Bonus
                  </a>
                </div>
                
                <p style="font-size: 14px; color: #6b7280;">
                  If the button doesn't work, copy and paste this link: <br>
                  <a href="${referralUrl}" style="color: #2563eb;">${referralUrl}</a>
                </p>
                
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                
                <p style="font-size: 12px; color: #9ca3af; text-align: center;">
                  This invitation was sent by ${user.name}. If you have any questions, contact us at ${process.env.SUPPORT_EMAIL || 'support@platform.com'}
                </p>
              </div>
            `
          });

          results.sent.push(email);

          // Log successful invite
          await AuditLog.create({
            adminId: userId,
            action: 'REFERRAL_INVITE_SENT',
            entity: 'User',
            entityId: userId.toString(),
            status: 'Success',
            metadata: {
              userSelfAction: true,
              inviteType,
              recipientEmail: email,
              hasPersonalMessage: !!personalMessage
            },
            ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
            userAgent: request.headers.get('user-agent') || 'unknown'
          });

        } catch (emailError) {
          console.error('Failed to send invite email:', emailError);
          results.failed.push(email);
        }
      }
    } else if (inviteType === 'whatsapp') {
      // WhatsApp invite (would integrate with WhatsApp Business API)
      const whatsappMessage = `Hi! ${user.name} invited you to join our financial platform. 
Get started and earn bonus rewards: ${referralUrl}
${personalMessage ? `\nPersonal note: ${personalMessage}` : ''}`;

      // For now, return the formatted message for the user to manually send
      return apiHandler.success({
        message: 'WhatsApp invite prepared',
        whatsappMessage,
        recipientCount: newEmails.length,
        referralUrl,
        instructions: 'Copy this message and send it manually via WhatsApp'
      });

    } else if (inviteType === 'sms') {
      // SMS invite (would integrate with SMS gateway)
      const smsMessage = `${user.name} invited you to join our platform. Join now: ${referralUrl}`;
      
      // For now, return the formatted message
      return apiHandler.success({
        message: 'SMS invite prepared',
        smsMessage,
        recipientCount: newEmails.length,
        referralUrl,
        instructions: 'SMS functionality requires SMS gateway integration'
      });
    }

    return apiHandler.success({
      message: `Referral invites processed successfully`,
      summary: {
        totalRequested: emails.length,
        sent: results.sent.length,
        failed: results.failed.length,
        skipped: results.skipped.length
      },
      details: results,
      referralUrl,
      referralCode: user.referralCode
    });

  } catch (error) {
    console.error('Error sending referral invite:', error);
    return apiHandler.internalError('Failed to send referral invite');
  }
}

export const POST = withErrorHandler(sendReferralInviteHandler);
