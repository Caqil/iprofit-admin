import { NextRequest, NextResponse } from 'next/server';
import { checkDeviceLimit, analyzeDevice } from '@/lib/device-detection';
import { deviceInfoSchema } from '@/lib/validation';
import { withErrorHandler } from '@/middleware/error-handler';
import { apiRateLimit } from '@/middleware/rate-limit';
import { ApiHandler } from '@/lib/api-helpers';
import { BusinessRules, getSetting } from '@/lib/settings-helper';

interface DeviceCheckRequest {
  deviceId: string;
  fingerprint: string;
  userAgent: string;
  ipAddress?: string;
}

interface DeviceCheckResponse {
  isAllowed: boolean;
  riskScore: number;
  analysis: {
    isEmulator: boolean;
    isVirtualDevice: boolean;
    deviceInfo: {
      userAgent: string;
      screen: string;
      timezone: string;
      language: string;
    };
  };
  reason?: string;
  recommendation: string;
}

async function deviceCheckHandler(request: NextRequest): Promise<NextResponse> {
  const apiHandler = ApiHandler.create(request);

  // Apply rate limiting
  const rateLimitResult = await apiRateLimit(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    // Parse and validate request body
    const body = await request.json();
    const validationResult = deviceInfoSchema.safeParse(body);

    if (!validationResult.success) {
      return apiHandler.validationError(
        validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      );
    }

    const { deviceId, fingerprint, userAgent }: DeviceCheckRequest = validationResult.data;

    // Get security configuration from settings
    const securityConfig = await BusinessRules.getSecurityConfig();
    
    // Get device security settings from settings-helper
    const deviceSecuritySettings = await Promise.all([
      getSetting('block_emulators', true),
      getSetting('block_virtual_devices', true),
      getSetting('max_device_risk_score', 0.8),
      getSetting('moderate_risk_threshold', 0.6),
      getSetting('enable_device_blocking', true)
    ]);

    const [
      blockEmulators,
      blockVirtualDevices, 
      maxRiskScore,
      moderateRiskThreshold,
      enableDeviceBlocking
    ] = deviceSecuritySettings;

    // Check device limit using settings
    const deviceLimitCheck = await checkDeviceLimit(deviceId, fingerprint);

    // Analyze device for security risks
    const deviceAnalysis = await analyzeDevice(fingerprint);

    // Determine overall recommendation based on settings
    let recommendation = 'Device approved for use';
    let isAllowed = deviceLimitCheck.isAllowed;

    // Check if device blocking is enabled
    if (!enableDeviceBlocking) {
      recommendation = 'Device checking disabled - access granted';
    } else {
      // Apply security rules based on settings
      if (!deviceLimitCheck.isAllowed) {
        recommendation = `Device rejected: Device limit exceeded (max: ${securityConfig.deviceLimitPerUser})`;
        isAllowed = false;
      } else if (blockEmulators && deviceAnalysis.isEmulator) {
        recommendation = 'Device rejected: Emulated device detected';
        isAllowed = false;
      } else if (blockVirtualDevices && deviceAnalysis.isVirtualDevice) {
        recommendation = 'Device rejected: Virtual device detected';
        isAllowed = false;
      } else if (deviceAnalysis.riskScore > maxRiskScore) {
        recommendation = `Device rejected: High security risk (score: ${deviceAnalysis.riskScore.toFixed(2)}, max: ${maxRiskScore})`;
        isAllowed = false;
      } else if (deviceAnalysis.riskScore > moderateRiskThreshold) {
        recommendation = `Device approved with caution: Moderate risk detected (score: ${deviceAnalysis.riskScore.toFixed(2)})`;
      }
    }

    const response: DeviceCheckResponse = {
      isAllowed,
      riskScore: deviceAnalysis.riskScore,
      analysis: {
        isEmulator: deviceAnalysis.isEmulator,
        isVirtualDevice: deviceAnalysis.isVirtualDevice,
        deviceInfo: deviceAnalysis.metadata
      },
      reason: deviceLimitCheck.reason,
      recommendation
    };

    // Log device check for audit purposes
    console.log('Device check completed:', {
      deviceId: deviceId.substring(0, 8) + '...',
      isAllowed,
      riskScore: deviceAnalysis.riskScore,
      deviceLimit: securityConfig.deviceLimitPerUser,
      securitySettings: {
        blockEmulators,
        blockVirtualDevices,
        maxRiskScore,
        enableDeviceBlocking
      }
    });

    return apiHandler.success(response);

  } catch (error) {
    console.error('Device check error:', error);
    return apiHandler.internalError('Device verification failed');
  }
}

export const POST = withErrorHandler(deviceCheckHandler);