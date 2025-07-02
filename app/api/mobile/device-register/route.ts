import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { AuditLog } from '@/models/AuditLog';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import { getUserFromRequest } from '@/lib/auth-helper';
import { sendDeviceRegisteredEmail, sendEmail } from '@/lib/email';
import mongoose from 'mongoose';

// Device registration validation schema
const deviceRegistrationSchema = z.object({
  deviceId: z.string().min(1, 'Device ID is required'),
  deviceName: z.string().min(1, 'Device name is required').max(100),
  deviceType: z.enum(['mobile', 'tablet', 'desktop', 'web']).default('mobile'),
  platform: z.enum(['ios', 'android', 'windows', 'macos', 'linux', 'web']),
  osVersion: z.string().max(50),
  appVersion: z.string().max(20),
  fingerprint: z.string().min(1, 'Device fingerprint is required'),
  fcmToken: z.string().optional(),
  deviceInfo: z.object({
    brand: z.string().max(50).optional(),
    model: z.string().max(100).optional(),
    manufacturer: z.string().max(50).optional(),
    screenResolution: z.string().optional(),
    isTablet: z.boolean().optional(),
    isEmulator: z.boolean().optional(),
    hasNotch: z.boolean().optional(),
    supportsBiometric: z.boolean().optional(),
    biometricTypes: z.array(z.string()).optional()
  }).optional(),
  locationInfo: z.object({
    timezone: z.string().optional(),
    locale: z.string().optional(),
    country: z.string().optional(),
    region: z.string().optional()
  }).optional(),
  isPrimary: z.boolean().default(false),
  trustDevice: z.boolean().default(false)
});

async function registerDeviceHandler(request: NextRequest) {
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
    const validationResult = deviceRegistrationSchema.safeParse(body);
    
    if (!validationResult.success) {
      return apiHandler.validationError(
        validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      );
    }

    const deviceData = validationResult.data;

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      return apiHandler.notFound('User not found');
    }

    // Check if device already exists for this user
    const existingDevice = user.devices?.find(d => d.deviceId === deviceData.deviceId);
    if (existingDevice) {
      return apiHandler.conflict('Device already registered for this user');
    }

    // Check if device is registered to another user
    const deviceExists = await User.findOne({
      _id: { $ne: userId },
      $or: [
        { deviceId: deviceData.deviceId },
        { 'devices.deviceId': deviceData.deviceId },
        { 'devices.fingerprint': deviceData.fingerprint }
      ]
    });

    if (deviceExists) {
      return apiHandler.conflict('Device is already registered to another user');
    }

    // Create device object
    const newDevice = {
      deviceId: deviceData.deviceId,
      deviceName: deviceData.deviceName,
      deviceType: deviceData.deviceType,
      platform: deviceData.platform,
      osVersion: deviceData.osVersion,
      appVersion: deviceData.appVersion,
      fingerprint: deviceData.fingerprint,
      fcmToken: deviceData.fcmToken || null,
      deviceInfo: deviceData.deviceInfo || {},
      locationInfo: deviceData.locationInfo || {},
      isPrimary: deviceData.isPrimary,
      isTrusted: deviceData.trustDevice,
      isActive: true,
      registeredAt: new Date(),
      lastActiveAt: new Date(),
      lastLoginAt: null,
      biometricEnabled: false,
      securityLevel: 'standard',
      loginAttempts: 0,
      lockedUntil: null
    };

    // If this is the first device or explicitly set as primary, make it primary
    if (!user.devices?.length || deviceData.isPrimary) {
      // Remove primary flag from other devices
      if (user.devices?.length) {
        user.devices.forEach(device => device.isPrimary = false);
      }
      newDevice.isPrimary = true;
      
      // Update user's main device fields for backwards compatibility
      user.deviceId = deviceData.deviceId;
      user.fcmToken = deviceData.fcmToken || user.fcmToken;
      user.lastAppVersion = deviceData.appVersion;
      user.appInstallDate = user.appInstallDate || new Date();
    }

    // Add device to user's devices array
    if (!user.devices) user.devices = [];
    user.devices.push(newDevice);

    // Update user timestamps
    user.lastActiveAt = new Date();

    await user.save();

    // Send device registration notification email using helper function
    try {
      const clientIP = request.headers.get('x-forwarded-for') || 'Unknown';
      
      await sendDeviceRegisteredEmail(
        user.email,
        user.name,
        deviceData.deviceName,
        deviceData.platform,
        deviceData.appVersion,
        clientIP,
        newDevice.isPrimary
      );
    } catch (emailError) {
      console.error('Failed to send device registration email:', emailError);
    }

    // Log device registration
    await AuditLog.create({
      adminId: null,
      action: 'DEVICE_REGISTERED',
      entity: 'Device',
      entityId: deviceData.deviceId,
      newData: {
        deviceName: deviceData.deviceName,
        platform: deviceData.platform,
        isPrimary: newDevice.isPrimary,
        isTrusted: newDevice.isTrusted
      },
      status: 'Success',
      metadata: {
        userSelfAction: true,
        userId: userId.toString(),
        userName: user.name,
        deviceType: deviceData.deviceType,
        osVersion: deviceData.osVersion,
        appVersion: deviceData.appVersion
      },
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      severity: 'Medium'
    });

    return apiHandler.success({
      message: 'Device registered successfully',
      device: {
        id: newDevice.deviceId,
        deviceName: newDevice.deviceName,
        deviceType: newDevice.deviceType,
        platform: newDevice.platform,
        isPrimary: newDevice.isPrimary,
        isTrusted: newDevice.isTrusted,
        registeredAt: newDevice.registeredAt,
        biometricSupported: deviceData.deviceInfo?.supportsBiometric || false
      },
      totalDevices: user.devices.length
    });

  } catch (error) {
    console.error('Error registering device:', error);
    return apiHandler.internalError('Failed to register device');
  }
}


export const POST = withErrorHandler(registerDeviceHandler);