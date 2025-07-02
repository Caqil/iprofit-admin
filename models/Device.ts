import { Schema } from "mongoose";

export interface IDevice {
  _id?: string;
  deviceId: string;
  deviceName: string;
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'web';
  platform: 'ios' | 'android' | 'windows' | 'macos' | 'linux' | 'web';
  osVersion: string;
  appVersion: string;
  fingerprint: string;
  fcmToken?: string;
  deviceInfo?: {
    brand?: string;
    model?: string;
    manufacturer?: string;
    screenResolution?: string;
    isTablet?: boolean;
    isEmulator?: boolean;
    hasNotch?: boolean;
    supportsBiometric?: boolean;
    biometricTypes?: string[];
  };
  locationInfo?: {
    timezone?: string;
    locale?: string;
    country?: string;
    region?: string;
  };
  isPrimary: boolean;
  isTrusted: boolean;
  isActive: boolean;
  biometricEnabled: boolean;
  biometricData?: Map<string, {
    enrolled: boolean;
    template: string; // Encrypted biometric template
    enrolledAt: Date;
  }>;
  securityLevel: 'weak' | 'standard' | 'strong';
  registeredAt: Date;
  lastActiveAt: Date;
  lastLoginAt?: Date;
  loginAttempts: number;
  lockedUntil?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

// Device Schema Definition - FIXED: No duplicate indexes
export const DeviceSchema = new Schema({
  deviceId: { 
    type: String, 
    required: true
    // REMOVED: index: true (will be handled by parent User schema)
  },
  deviceName: { 
    type: String, 
    required: true,
    maxlength: 100,
    trim: true
  },
  deviceType: { 
    type: String, 
    enum: ['mobile', 'tablet', 'desktop', 'web'], 
    default: 'mobile',
    required: true
  },
  platform: { 
    type: String, 
    enum: ['ios', 'android', 'windows', 'macos', 'linux', 'web'], 
    required: true 
  },
  osVersion: { 
    type: String, 
    required: true,
    maxlength: 50,
    trim: true
  },
  appVersion: { 
    type: String, 
    required: true,
    maxlength: 20,
    trim: true
  },
  fingerprint: { 
    type: String, 
    required: true,
    trim: true
    // REMOVED: index: true (will be handled by parent User schema)
  },
  fcmToken: { 
    type: String, 
    default: null,
    trim: true
    // REMOVED: index: true (will be handled by parent User schema)
  },
  
  // Detailed Device Information
  deviceInfo: {
    brand: { 
      type: String, 
      maxlength: 50,
      trim: true 
    },
    model: { 
      type: String, 
      maxlength: 100,
      trim: true 
    },
    manufacturer: { 
      type: String, 
      maxlength: 50,
      trim: true 
    },
    screenResolution: {
      type: String,
      trim: true
    },
    isTablet: {
      type: Boolean,
      default: false
    },
    isEmulator: {
      type: Boolean,
      default: false
    },
    hasNotch: {
      type: Boolean,
      default: false
    },
    supportsBiometric: {
      type: Boolean,
      default: false
    },
    biometricTypes: [{
      type: String,
      enum: ['fingerprint', 'face', 'voice', 'iris', 'palm']
    }]
  },
  
  // Location and Locale Information
  locationInfo: {
    timezone: {
      type: String,
      trim: true
    },
    locale: {
      type: String,
      trim: true
    },
    country: {
      type: String,
      maxlength: 100,
      trim: true
    },
    region: {
      type: String,
      maxlength: 100,
      trim: true
    }
  },
  
  // Device Status and Security
  isPrimary: { 
    type: Boolean, 
    default: false
    // REMOVED: index: true (will be handled by parent User schema)
  },
  isTrusted: { 
    type: Boolean, 
    default: false 
  },
  isActive: { 
    type: Boolean, 
    default: true
    // REMOVED: index: true (will be handled by parent User schema)
  },
  biometricEnabled: { 
    type: Boolean, 
    default: false 
  },
  biometricData: {
    type: Map,
    of: {
      enrolled: {
        type: Boolean,
        default: false
      },
      template: {
        type: String, // Encrypted biometric template
        select: false // Never include in queries for security
      },
      enrolledAt: {
        type: Date,
        default: Date.now
      }
    },
    default: new Map()
  },
  securityLevel: { 
    type: String, 
    enum: ['weak', 'standard', 'strong'], 
    default: 'standard' 
  },
  
  // Timestamps and Activity
  registeredAt: { 
    type: Date, 
    default: Date.now
    // REMOVED: index: true (will be handled by parent User schema)
  },
  lastActiveAt: { 
    type: Date, 
    default: Date.now
    // REMOVED: index: true (will be handled by parent User schema)
  },
  lastLoginAt: { 
    type: Date, 
    default: null 
  },
  
  // Security and Rate Limiting
  loginAttempts: { 
    type: Number, 
    default: 0,
    min: 0,
    max: 10
  },
  lockedUntil: { 
    type: Date, 
    default: null 
  }
}, {
  timestamps: true, // Adds createdAt and updatedAt
  _id: true // Enable subdocument IDs for easier management
});

// Device Schema Methods
DeviceSchema.methods.updateLastActive = function() {
  this.lastActiveAt = new Date();
  return this;
};

DeviceSchema.methods.incrementLoginAttempts = function() {
  this.loginAttempts += 1;
  if (this.loginAttempts >= 5) {
    // Lock device for 30 minutes after 5 failed attempts
    this.lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
  }
  return this;
};

DeviceSchema.methods.resetLoginAttempts = function() {
  this.loginAttempts = 0;
  this.lockedUntil = null;
  this.lastLoginAt = new Date();
  this.lastActiveAt = new Date();
  return this;
};

DeviceSchema.methods.isLocked = function() {
  return this.lockedUntil && this.lockedUntil > new Date();
};

DeviceSchema.methods.setPrimary = function() {
  this.isPrimary = true;
  return this;
};

DeviceSchema.methods.removePrimary = function() {
  this.isPrimary = false;
  return this;
};

DeviceSchema.methods.activate = function() {
  this.isActive = true;
  this.lastActiveAt = new Date();
  return this;
};

DeviceSchema.methods.deactivate = function() {
  this.isActive = false;
  return this;
};

// Device Schema Statics
DeviceSchema.statics.getDefaultDevice = function(deviceInfo: Partial<IDevice>) {
  return {
    deviceType: 'mobile',
    platform: 'android',
    isPrimary: true,
    isTrusted: false,
    isActive: true,
    biometricEnabled: false,
    securityLevel: 'standard',
    loginAttempts: 0,
    registeredAt: new Date(),
    lastActiveAt: new Date(),
    ...deviceInfo
  };
};

export default DeviceSchema;