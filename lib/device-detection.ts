// lib/device-detection.ts - Fixed version

import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { User } from '@/models/User';
import { DeviceCheckResult } from '@/types';
import { getSetting } from '@/lib/settings-helper';

// Check if we're in browser environment
const isBrowser = typeof window !== 'undefined' && typeof navigator !== 'undefined';

export async function generateDeviceFingerprint(): Promise<string> {
  if (!isBrowser) {
    throw new Error('generateDeviceFingerprint can only be called in browser environment');
  }

  try {
    const fp = await FingerprintJS.load();
    const result = await fp.get();
    return result.visitorId;
  } catch (error) {
    console.error('Fingerprint generation failed:', error);
    // Fallback fingerprint
    return generateFallbackFingerprint();
  }
}

function generateFallbackFingerprint(): string {
  if (!isBrowser) {
    return 'server-fallback-' + Math.random().toString(36).substring(2, 15);
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Device fingerprint', 2, 2);
  }
  
  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    navigator.platform,
    canvas.toDataURL()
  ].join('|');
  
  return btoa(fingerprint).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
}

export async function checkDeviceLimit(deviceId: string, fingerprint: string): Promise<{
  isAllowed: boolean;
  reason?: string;
  existingUser?: string;
}> {
  try {
    // Check settings first
    const isDeviceLimitingEnabled = await getSetting('enable_device_limiting', true);
    
    if (!isDeviceLimitingEnabled) {
      console.log('Device limiting disabled in settings');
      return { isAllowed: true };
    }

    // Check if device is already registered
    const existingUser = await User.findOne({ deviceId });
    
    if (existingUser) {
      return {
        isAllowed: false,
        reason: 'Device already registered to another account',
        existingUser: existingUser.email
      };
    }

    // Get additional device security settings
    const blockEmulators = await getSetting('block_emulators', true);
    const blockVirtualDevices = await getSetting('block_virtual_devices', true);
    const maxRiskScore = await getSetting('max_device_risk_score', 0.8);

    // Only do device analysis if blocking is enabled
    if (blockEmulators || blockVirtualDevices) {
      const deviceCheck = await analyzeDevice(fingerprint);
      
      if (blockEmulators && deviceCheck.isEmulator) {
        return {
          isAllowed: false,
          reason: 'Virtual devices and emulators are not allowed'
        };
      }

      if (blockVirtualDevices && deviceCheck.isVirtualDevice) {
        return {
          isAllowed: false,
          reason: 'Virtual devices are not allowed'
        };
      }

      if (deviceCheck.riskScore > maxRiskScore) {
        return {
          isAllowed: false,
          reason: 'Device has high risk score'
        };
      }
    }

    return { isAllowed: true };
  } catch (error) {
    console.error('Device check failed:', error);
    // In case of error, allow access but log it
    return { isAllowed: true };
  }
}

export async function analyzeDevice(fingerprint: string, userAgent?: string): Promise<DeviceCheckResult> {
  // Use provided userAgent or try to extract from fingerprint
  const agentString = userAgent || extractUserAgentFromFingerprint(fingerprint) || 'unknown';
  
  // Detect emulators and virtual devices from user agent
  const lowerAgent = agentString.toLowerCase();
  const isEmulator = /android.*sdk|emulator|simulator|genymotion|bluestacks|nox|ldplayer/i.test(lowerAgent);
  const isVirtualDevice = /virtualbox|vmware|parallels|qemu/i.test(lowerAgent);
  
  // Calculate risk score based on available server-side factors
  let riskScore = 0;
  
  if (isEmulator) riskScore += 0.5;
  if (isVirtualDevice) riskScore += 0.4;
  
  // Additional server-side checks
  if (lowerAgent.includes('headless')) riskScore += 0.3;
  if (lowerAgent.includes('bot')) riskScore += 0.4;
  if (lowerAgent.includes('crawler')) riskScore += 0.4;
  
  // Create safe metadata without browser APIs
  const metadata = {
    userAgent: agentString,
    screen: 'unknown', // Can't access in server
    timezone: 'unknown', // Can't access in server
    language: 'unknown' // Can't access in server
  };

  return {
    isValid: riskScore < 0.8,
    deviceId: fingerprint,
    fingerprint,
    riskScore,
    isEmulator,
    isVirtualDevice,
    metadata
  };
}

// Helper function to extract user agent from fingerprint if it's encoded
function extractUserAgentFromFingerprint(fingerprint: string): string | null {
  try {
    // Try to decode base64 fingerprint and extract user agent
    const decoded = atob(fingerprint);
    const parsed = JSON.parse(decoded);
    return parsed.userAgent || null;
  } catch {
    // If fingerprint is not base64 JSON, return null
    return null;
  }
}

export function detectParallelSpace(userAgent?: string): boolean {
  if (!userAgent) return false;
  
  // Check for Parallel Space and similar apps
  const lowerAgent = userAgent.toLowerCase();
  const suspiciousPatterns = [
    'parallel',
    'dual',
    'clone',
    'multi',
    'space',
    'twin'
  ];
  
  return suspiciousPatterns.some(pattern => lowerAgent.includes(pattern));
}