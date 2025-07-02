import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { AuditLog } from '@/models/AuditLog';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import { getUserFromRequest } from '@/lib/auth-helper';
import { sendEmail, sendReferralInviteEmail } from '@/lib/email';
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
      // Send email invites using the helper function
      for (const email of newEmails) {
        try {
          // Much cleaner using the helper function
          const emailSent = await sendReferralInviteEmail(
            email,
            user.name,
            user.email,
            referralUrl,
            personalMessage
          );
          
          if (emailSent) {
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
                hasPersonalMessage: !!personalMessage,
                templateUsed: 'referral_invite'
              },
              ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
              userAgent: request.headers.get('user-agent') || 'unknown'
            });
          } else {
            results.failed.push(email);
          }

        } catch (emailError) {
          console.error('Failed to send invite email:', emailError);
          results.failed.push(email);

          // Log failed invite
          await AuditLog.create({
            adminId: userId,
            action: 'REFERRAL_INVITE_SENT',
            entity: 'User',
            entityId: userId.toString(),
            status: 'Failed',
            metadata: {
              userSelfAction: true,
              inviteType,
              recipientEmail: email,
              hasPersonalMessage: !!personalMessage,
              errorMessage: emailError instanceof Error ? emailError.message : 'Unknown error'
            },
            ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
            userAgent: request.headers.get('user-agent') || 'unknown'
          });
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
