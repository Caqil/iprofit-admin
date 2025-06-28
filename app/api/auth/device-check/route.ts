import { NextRequest, NextResponse } from 'next/server';
import { checkDeviceLimit, analyzeDevice } from '@/lib/device-detection';
import { deviceInfoSchema } from '@/lib/validation';
import { withErrorHandler } from '@/middleware/error-handler';
import { apiRateLimit } from '@/middleware/rate-limit';
import { ApiHandler } from '@/lib/api-helpers';

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

    // Check device limit
    const deviceLimitCheck = await checkDeviceLimit(deviceId, fingerprint);

    // Analyze device for security risks
    const deviceAnalysis = await analyzeDevice(fingerprint);

    // Determine overall recommendation
    let recommendation = 'Device approved for use';
    let isAllowed = deviceLimitCheck.isAllowed;

    if (!deviceLimitCheck.isAllowed) {
      recommendation = 'Device rejected: Multiple accounts detected';
      isAllowed = false;
    } else if (deviceAnalysis.isEmulator) {
      recommendation = 'Device rejected: Emulated device detected';
      isAllowed = false;
    } else if (deviceAnalysis.isVirtualDevice) {
      recommendation = 'Device rejected: Virtual device detected';
      isAllowed = false;
    } else if (deviceAnalysis.riskScore > 0.8) {
      recommendation = 'Device rejected: High security risk';
      isAllowed = false;
    } else if (deviceAnalysis.riskScore > 0.6) {
      recommendation = 'Device approved with caution: Moderate risk detected';
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

    return apiHandler.success(response);

  } catch (error) {
    console.error('Device check error:', error);
    return apiHandler.internalError('Device verification failed');
  }
}

export const POST = withErrorHandler(deviceCheckHandler);
