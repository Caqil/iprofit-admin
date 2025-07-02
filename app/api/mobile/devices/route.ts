import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectToDatabase } from '@/lib/db';
import { User } from '@/models/User';
import { AuditLog } from '@/models/AuditLog';
import { withErrorHandler } from '@/middleware/error-handler';
import { ApiHandler } from '@/lib/api-helpers';
import { getUserFromRequest } from '@/lib/auth-helper';
import mongoose from 'mongoose';

// Devices query validation schema
const devicesQuerySchema = z.object({
  includeStats: z.coerce.boolean().default(true),
  includeHistory: z.coerce.boolean().default(false),
  activeOnly: z.coerce.boolean().default(false)
});

async function getUserDevicesHandler(request: NextRequest) {
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

    // Validate query parameters
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    
    const validationResult = devicesQuerySchema.safeParse(queryParams);
    if (!validationResult.success) {
      return apiHandler.validationError(
        validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      );
    }

    const { includeStats, includeHistory, activeOnly } = validationResult.data;

    // Get user with devices
    const user = await User.findById(userId).select('+devices');
    if (!user) {
      return apiHandler.notFound('User not found');
    }

    // Filter devices if needed
    let devices = user.devices || [];
    if (activeOnly) {
      devices = devices.filter(device => device.isActive);
    }

    // Format device list
    const formattedDevices = devices.map(device => {
      const deviceAge = device.registeredAt ? 
        Math.floor((Date.now() - device.registeredAt.getTime()) / (1000 * 60 * 60 * 24)) : 0;
      
      const lastActiveAge = device.lastActiveAt ? 
        Math.floor((Date.now() - device.lastActiveAt.getTime()) / (1000 * 60 * 60 * 24)) : null;

      return {
        id: device.deviceId,
        deviceName: device.deviceName,
        deviceType: device.deviceType,
        platform: device.platform,
        osVersion: device.osVersion,
        appVersion: device.appVersion,
        isPrimary: device.isPrimary,
        isTrusted: device.isTrusted,
        isActive: device.isActive,
        biometricEnabled: device.biometricEnabled,
        securityLevel: device.securityLevel,
        registeredAt: device.registeredAt,
        lastActiveAt: device.lastActiveAt,
        lastLoginAt: device.lastLoginAt,
        deviceAge: deviceAge,
        lastActiveAge: lastActiveAge,
        locationInfo: device.locationInfo,
        deviceInfo: device.deviceInfo,
        status: device.isActive ? 
          (lastActiveAge !== null && lastActiveAge < 7 ? 'active' : 'inactive') : 'disabled'
      };
    });

    let stats: {
      totalDevices: number;
      activeDevices: number;
      inactiveDevices: number;
      trustedDevices: number;
      biometricDevices: number;
      recentlyActiveDevices: number;
      platformDistribution: Record<string, number>;
      primaryDevice: string | null;
      oldestDevice: number | null;
      newestDevice: number | null;
    } | null = null;
    if (includeStats) {
      // Calculate device statistics
      const totalDevices = devices.length;
      const activeDevices = devices.filter(d => d.isActive).length;
      const trustedDevices = devices.filter(d => d.isTrusted).length;
      const biometricDevices = devices.filter(d => d.biometricEnabled).length;
      
      const platformStats = devices.reduce((acc: any, device) => {
        acc[device.platform] = (acc[device.platform] || 0) + 1;
        return acc;
      }, {});

      const recentlyActive = devices.filter(d => 
        d.lastActiveAt && (Date.now() - d.lastActiveAt.getTime()) < 7 * 24 * 60 * 60 * 1000
      ).length;

      stats = {
        totalDevices,
        activeDevices,
        inactiveDevices: totalDevices - activeDevices,
        trustedDevices,
        biometricDevices,
        recentlyActiveDevices: recentlyActive,
        platformDistribution: platformStats,
        primaryDevice: devices.find(d => d.isPrimary)?.deviceId || null,
        oldestDevice: devices.length > 0 ? 
          Math.min(...devices.map(d => d.registeredAt?.getTime() || Date.now())) : null,
        newestDevice: devices.length > 0 ? 
          Math.max(...devices.map(d => d.registeredAt?.getTime() || 0)) : null
      };
    }

    let history: any[] | null = null;
    if (includeHistory) {
      // Get recent device-related audit logs
      history = await AuditLog.find({
        $or: [
          { 'metadata.userId': userId.toString() },
          { entityId: { $in: devices.map(d => d.deviceId) } }
        ],
        action: { $in: ['DEVICE_REGISTERED', 'DEVICE_UPDATED', 'DEVICE_REMOVED', 'BIOMETRIC_AUTH'] }
      })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('action entityId status createdAt metadata');
    }

    return apiHandler.success({
      devices: formattedDevices,
      stats,
      history,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        primaryDeviceId: user.deviceId
      }
    });

  } catch (error) {
    console.error('Error fetching user devices:', error);
    return apiHandler.internalError('Failed to fetch user devices');
  }
}

export const GET = withErrorHandler(getUserDevicesHandler);
