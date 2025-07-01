import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { AuditLog } from '@/models/AuditLog';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import { getUserFromRequest } from '@/lib/auth-helper';
import { sendEmail } from '@/lib/email';
import mongoose from 'mongoose';

async function removeDeviceHandler(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const deviceId = params.id;

    // Get user with devices
    const user = await User.findById(userId);
    if (!user) {
      return apiHandler.notFound('User not found');
    }

    // Find the device to remove
    const deviceIndex = user.devices?.findIndex(d => d.deviceId === deviceId);
    if (deviceIndex === undefined || deviceIndex === -1) {
      return apiHandler.notFound('Device not found');
    }

    const deviceToRemove = user.devices[deviceIndex];

    // Prevent removing the last device or primary device if it's the only one
    if (user.devices.length === 1) {
      return apiHandler.badRequest('Cannot remove the last device. At least one device must remain.');
    }

    // If removing primary device, set another device as primary
    if (deviceToRemove.isPrimary) {
      const nextDevice = user.devices.find((d, index) => index !== deviceIndex);
      if (nextDevice) {
        nextDevice.isPrimary = true;
        user.deviceId = nextDevice.deviceId;
        user.fcmToken = nextDevice.fcmToken || user.fcmToken;
        user.lastAppVersion = nextDevice.appVersion;
      }
    }

    // Remove the device
    user.devices.splice(deviceIndex, 1);
    user.lastActiveAt = new Date();

    await user.save();

    // Send device removal notification email
    try {
      await sendEmail({
        to: user.email,
        subject: 'Device Removed from Account',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc2626;">Device Removed</h2>
            <p>Dear ${user.name},</p>
            <p>A device has been removed from your account.</p>
            <div style="background: #fef2f2; border: 1px solid #dc2626; padding: 16px; margin: 20px 0; border-radius: 6px;">
              <strong>Removed Device:</strong><br>
              <strong>Device Name:</strong> ${deviceToRemove.deviceName}<br>
              <strong>Platform:</strong> ${deviceToRemove.platform}<br>
              <strong>Removed:</strong> ${new Date().toLocaleString()}
            </div>
            <p>If you did not remove this device, please contact support immediately.</p>
            <a href="${process.env.NEXTAUTH_URL}/user/security" 
               style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Review Security
            </a>
          </div>
        `
      });
    } catch (emailError) {
      console.error('Failed to send device removal email:', emailError);
    }

    // Log device removal
    await AuditLog.create({
      adminId: null,
      action: 'DEVICE_REMOVED',
      entity: 'Device',
      entityId: deviceId,
      oldData: deviceToRemove.toObject(),
      status: 'Success',
      metadata: {
        userSelfAction: true,
        userId: userId.toString(),
        userName: user.name,
        deviceName: deviceToRemove.deviceName,
        wasPrimary: deviceToRemove.isPrimary,
        remainingDevices: user.devices.length
      },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      severity: 'Medium'
    });

    return apiHandler.success({
      message: 'Device removed successfully',
      removedDevice: {
        id: deviceToRemove.deviceId,
        deviceName: deviceToRemove.deviceName,
        wasPrimary: deviceToRemove.isPrimary
      },
      remainingDevices: user.devices.length,
      newPrimaryDevice: user.devices.find(d => d.isPrimary)?.deviceId || null
    });

  } catch (error) {
    console.error('Error removing device:', error);
    return apiHandler.internalError('Failed to remove device');
  }
}

export const DELETE = withErrorHandler(removeDeviceHandler);
