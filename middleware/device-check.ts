import { NextRequest, NextResponse } from 'next/server';
import { checkDeviceLimit, analyzeDevice } from '@/lib/device-detection';
import { DeviceCheckResult } from '@/types';
import { env } from '@/config/env';

interface DeviceCheckOptions {
  enabled?: boolean;
  blockEmulators?: boolean;
  blockVirtualDevices?: boolean;
  maxRiskScore?: number;
  skipRoutes?: string[];
}

export async function deviceCheckMiddleware(
  request: NextRequest,
  options: DeviceCheckOptions = {}
): Promise<NextResponse | null> {
  const {
    enabled = env.ENABLE_DEVICE_LIMITING,
    blockEmulators = true,
    blockVirtualDevices = true,
    maxRiskScore = 0.8,
    skipRoutes = ['/api/auth/', '/api/public/', '/login', '/signup']
  } = options;

  // Skip if device checking is disabled
  if (!enabled) {
    return null;
  }

  const { pathname } = request.nextUrl;

  // Skip device check for certain routes
  if (skipRoutes.some(route => pathname.startsWith(route))) {
    return null;
  }

  try {
    // Get device information from headers
    const deviceId = request.headers.get('x-device-id');
    const fingerprint = request.headers.get('x-fingerprint');
    const userAgent = request.headers.get('user-agent') || '';

    // For user registration/login, device info is required
    const requiresDeviceInfo = [
      '/api/auth/signup',
      '/api/auth/login',
      '/api/users'
    ].some(route => pathname.startsWith(route));

    if (requiresDeviceInfo && (!deviceId || !fingerprint)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Device information required',
          code: 400,
          details: {
            required: ['x-device-id', 'x-fingerprint'],
            message: 'Please provide device identification headers'
          },
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    // Skip further checks if device info not provided (for optional routes)
    if (!deviceId || !fingerprint) {
      return null;
    }

    // Check device limit
    const deviceCheck = await checkDeviceLimit(deviceId, fingerprint);
    if (!deviceCheck.isAllowed) {
      return NextResponse.json(
        {
          success: false,
          error: deviceCheck.reason || 'Device limit exceeded',
          code: 403,
          details: {
            maxDevicesReached: true,
            action: 'Contact support to manage your devices'
          },
          timestamp: new Date().toISOString()
        },
        { status: 403 }
      );
    }

    // Analyze device for security threats
    const deviceAnalysis = await analyzeDevice(fingerprint);

    // Check for emulators
    if (blockEmulators && deviceAnalysis.isEmulator) {
      return NextResponse.json(
        {
          success: false,
          error: 'Emulated devices are not allowed',
          code: 403,
          details: {
            reason: 'Emulator detected',
            deviceInfo: deviceAnalysis.metadata
          },
          timestamp: new Date().toISOString()
        },
        { status: 403 }
      );
    }

    // Check for virtual devices
    if (blockVirtualDevices && deviceAnalysis.isVirtualDevice) {
      return NextResponse.json(
        {
          success: false,
          error: 'Virtual devices are not allowed',
          code: 403,
          details: {
            reason: 'Virtual machine detected',
            deviceInfo: deviceAnalysis.metadata
          },
          timestamp: new Date().toISOString()
        },
        { status: 403 }
      );
    }

    // Check risk score
    if (deviceAnalysis.riskScore > maxRiskScore) {
      return NextResponse.json(
        {
          success: false,
          error: 'Device security risk detected',
          code: 403,
          details: {
            riskScore: deviceAnalysis.riskScore,
            maxAllowed: maxRiskScore,
            action: 'Please use a trusted device'
          },
          timestamp: new Date().toISOString()
        },
        { status: 403 }
      );
    }

    // IMPORTANT: Don't use NextResponse.next() in API route middleware
    // Instead, return null to allow the request to continue
    // The device validation info can be accessed via headers in the actual handler
    return null;

  } catch (error) {
    console.error('Device check middleware error:', error);
    
    // Log suspicious activity
    console.warn('Suspicious device activity:', {
      pathname,
      userAgent: request.headers.get('user-agent'),
      ip: request.headers.get('x-forwarded-for'),
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    // In case of error, allow request but log the incident
    return null;
  }
}

// Helper to create device check middleware with options
export function createDeviceCheckMiddleware(options: DeviceCheckOptions) {
  return (request: NextRequest) => deviceCheckMiddleware(request, options);
}

// Predefined device check configurations
export const strictDeviceCheck = createDeviceCheckMiddleware({
  enabled: true,
  blockEmulators: true,
  blockVirtualDevices: true,
  maxRiskScore: 0.7
});

export const standardDeviceCheck = createDeviceCheckMiddleware({
  enabled: true,
  blockEmulators: true,
  blockVirtualDevices: false,
  maxRiskScore: 0.8
});

export const relaxedDeviceCheck = createDeviceCheckMiddleware({
  enabled: true,
  blockEmulators: false,
  blockVirtualDevices: false,
  maxRiskScore: 0.9
});