import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { AuditLog } from '@/models/AuditLog';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import { getUserFromRequest } from '@/lib/auth-helper';
import mongoose from 'mongoose';

// Device update validation schema
const deviceUpdateSchema = z.object({
  deviceId: z.string().min(1, 'Device ID is required'),
  updates: z.object({
    deviceName: z.string().min(1).max(100).optional(),
    appVersion: z.string().max(20).optional(),
    osVersion: z.string().max(50).optional(),
    fcmToken: z.string().optional(),
    locationInfo: z.object({
      timezone: z.string().optional(),
      locale: z.string().optional(),
      country: z.string().optional(),
      region: z.string().optional()
    }).optional(),
    isPrimary: z.boolean().optional(),
    isTrusted: z.boolean().optional(),
    biometricEnabled: z.boolean().optional(),
    lastActiveAt: z.coerce.date().optional()
  })
});

async function updateDeviceHandler(request: NextRequest) {
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
    const validationResult = deviceUpdateSchema.safeParse(body);
    
    if (!validationResult.success) {
      return apiHandler.validationError(
        validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      );
    }

    const { deviceId, updates } = validationResult.data;

    // Get user with devices
    const user = await User.findById(userId);
    if (!user) {
      return apiHandler.notFound('User not found');
    }

    // Find the device to update
    const deviceIndex = user.devices?.findIndex(d => d.deviceId === deviceId);
    if (deviceIndex === undefined || deviceIndex === -1) {
      return apiHandler.notFound('Device not found');
    }

    const device = user.devices[deviceIndex];
    const oldData = { ...device.toObject() };

    // Store what's being updated for audit log
    const updatedFields: string[] = [];

    // Update device fields
    if (updates.deviceName !== undefined) {
      device.deviceName = updates.deviceName;
      updatedFields.push('deviceName');
    }

    if (updates.appVersion !== undefined) {
      device.appVersion = updates.appVersion;
      user.lastAppVersion = updates.appVersion; // Update user's last app version
      updatedFields.push('appVersion');
    }

    if (updates.osVersion !== undefined) {
      device.osVersion = updates.osVersion;
      updatedFields.push('osVersion');
    }

    if (updates.fcmToken !== undefined) {
      device.fcmToken = updates.fcmToken;
      // If this is the primary device, update user's FCM token
      if (device.isPrimary) {
        user.fcmToken = updates.fcmToken;
      }
      updatedFields.push('fcmToken');
    }

    if (updates.locationInfo !== undefined) {
      device.locationInfo = { ...device.locationInfo, ...updates.locationInfo };
      updatedFields.push('locationInfo');
    }

    if (updates.biometricEnabled !== undefined) {
      device.biometricEnabled = updates.biometricEnabled;
      updatedFields.push('biometricEnabled');
    }

    if (updates.isTrusted !== undefined) {
      device.isTrusted = updates.isTrusted;
      updatedFields.push('isTrusted');
    }

    // Handle primary device change
    if (updates.isPrimary !== undefined && updates.isPrimary !== device.isPrimary) {
      if (updates.isPrimary) {
        // Remove primary flag from all other devices
        user.devices.forEach((d, index) => {
          if (index !== deviceIndex) {
            d.isPrimary = false;
          }
        });
        device.isPrimary = true;
        
        // Update user's main device fields
        user.deviceId = deviceId;
        user.fcmToken = device.fcmToken || user.fcmToken;
        user.lastAppVersion = device.appVersion;
        
        updatedFields.push('isPrimary (set as primary)');
      } else if (user.devices.length > 1) {
        // Can't remove primary if it's the only device
        device.isPrimary = false;
        // Set another device as primary
        const nextPrimary = user.devices.find((d, index) => index !== deviceIndex);
        if (nextPrimary) {
          nextPrimary.isPrimary = true;
          user.deviceId = nextPrimary.deviceId;
          user.fcmToken = nextPrimary.fcmToken || user.fcmToken;
        }
        updatedFields.push('isPrimary (removed as primary)');
      }
    }

    // Update last active time
    if (updates.lastActiveAt !== undefined) {
      device.lastActiveAt = updates.lastActiveAt;
    } else {
      device.lastActiveAt = new Date();
    }
    
    user.lastActiveAt = new Date();

    await user.save();

    // Log device update
    await AuditLog.create({
      adminId: null,
      action: 'DEVICE_UPDATED',
      entity: 'Device',
      entityId: deviceId,
      oldData: oldData,
      newData: device.toObject(),
      status: 'Success',
      metadata: {
        userSelfAction: true,
        userId: userId.toString(),
        userName: user.name,
        updatedFields: updatedFields,
        fieldsCount: updatedFields.length
      },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      severity: 'Low'
    });

    return apiHandler.success({
      message: 'Device updated successfully',
      device: {
        id: device.deviceId,
        deviceName: device.deviceName,
        deviceType: device.deviceType,
        platform: device.platform,
        appVersion: device.appVersion,
        osVersion: device.osVersion,
        isPrimary: device.isPrimary,
        isTrusted: device.isTrusted,
        biometricEnabled: device.biometricEnabled,
        lastActiveAt: device.lastActiveAt,
        updatedFields: updatedFields
      }
    });

  } catch (error) {
    console.error('Error updating device:', error);
    return apiHandler.internalError('Failed to update device');
  }
}

export const PUT = withErrorHandler(updateDeviceHandler);