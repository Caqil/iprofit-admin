import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { User } from '@/models/User';
import { DeviceCheckResult } from '@/types';

export async function generateDeviceFingerprint(): Promise<string> {
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
    // Check if device is already registered
    const existingUser = await User.findOne({ deviceId });
    
    if (existingUser) {
      return {
        isAllowed: false,
        reason: 'Device already registered to another account',
        existingUser: existingUser.email
      };
    }

    // Check for emulators and virtual devices
    const deviceCheck = await analyzeDevice(fingerprint);
    
    if (deviceCheck.isEmulator || deviceCheck.isVirtualDevice) {
      return {
        isAllowed: false,
        reason: 'Virtual devices and emulators are not allowed'
      };
    }

    if (deviceCheck.riskScore > 0.8) {
      return {
        isAllowed: false,
        reason: 'Device has high risk score'
      };
    }

    return { isAllowed: true };
  } catch (error) {
    console.error('Device check failed:', error);
    return {
      isAllowed: false,
      reason: 'Device verification failed'
    };
  }
}

export async function analyzeDevice(fingerprint: string): Promise<DeviceCheckResult> {
  // Detect emulators and virtual devices
  const userAgent = navigator.userAgent.toLowerCase();
  const isEmulator = /android.*sdk|emulator|simulator|genymotion|bluestacks|nox|ldplayer/i.test(userAgent);
  const isVirtualDevice = /virtualbox|vmware|parallels|qemu/i.test(userAgent);
  
  // Calculate risk score based on various factors
  let riskScore = 0;
  
  if (isEmulator) riskScore += 0.5;
  if (isVirtualDevice) riskScore += 0.4;
  
  // Check for suspicious patterns
  if (screen.width === 800 && screen.height === 600) riskScore += 0.2; // Common emulator resolution
  if (navigator.hardwareConcurrency > 16) riskScore += 0.1; // Unusually high CPU cores
  const deviceMemory = (navigator as any).deviceMemory;
  if (deviceMemory && deviceMemory > 32) riskScore += 0.1; // Unusually high memory
  
  return {
    isValid: riskScore < 0.8,
    deviceId: fingerprint,
    fingerprint,
    riskScore,
    isEmulator,
    isVirtualDevice,
    metadata: {
      userAgent: navigator.userAgent,
      screen: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language
    }
  };
}

export function detectParallelSpace(): boolean {
  // Check for Parallel Space and similar apps
  const userAgent = navigator.userAgent.toLowerCase();
  const suspiciousPatterns = [
    'parallel',
    'dual',
    'clone',
    'multi',
    'space',
    'twin'
  ];
  
  return suspiciousPatterns.some(pattern => userAgent.includes(pattern));
}