// models/User.ts - Complete User Model with Device Management
import mongoose, { Document, Schema } from 'mongoose';

// Device subdocument schema
const DeviceSchema = new Schema({
  deviceId: { 
    type: String, 
    required: true,
    index: true
  },
  deviceName: { 
    type: String, 
    required: true,
    maxlength: 100
  },
  deviceType: { 
    type: String, 
    enum: ['mobile', 'tablet', 'desktop', 'web'], 
    default: 'mobile' 
  },
  platform: { 
    type: String, 
    enum: ['ios', 'android', 'windows', 'macos', 'linux', 'web'], 
    required: true 
  },
  osVersion: { 
    type: String, 
    required: true,
    maxlength: 50
  },
  appVersion: { 
    type: String, 
    required: true,
    maxlength: 20
  },
  fingerprint: { 
    type: String, 
    required: true,
    index: true
  },
  fcmToken: { 
    type: String, 
    default: null,
    index: true
  },
  deviceInfo: {
    brand: { type: String, maxlength: 50 },
    model: { type: String, maxlength: 100 },
    manufacturer: { type: String, maxlength: 50 },
    screenResolution: String,
    isTablet: Boolean,
    isEmulator: Boolean,
    hasNotch: Boolean,
    supportsBiometric: Boolean,
    biometricTypes: [String]
  },
  locationInfo: {
    timezone: String,
    locale: String,
    country: String,
    region: String
  },
  isPrimary: { 
    type: Boolean, 
    default: false,
    index: true
  },
  isTrusted: { 
    type: Boolean, 
    default: false 
  },
  isActive: { 
    type: Boolean, 
    default: true,
    index: true
  },
  biometricEnabled: { 
    type: Boolean, 
    default: false 
  },
  biometricData: {
    type: Map,
    of: {
      enrolled: Boolean,
      template: String, // Encrypted biometric template
      enrolledAt: Date
    },
    default: new Map()
  },
  securityLevel: { 
    type: String, 
    enum: ['weak', 'standard', 'strong'], 
    default: 'standard' 
  },
  registeredAt: { 
    type: Date, 
    default: Date.now,
    index: true
  },
  lastActiveAt: { 
    type: Date, 
    default: Date.now,
    index: true
  },
  lastLoginAt: { 
    type: Date, 
    default: null 
  },
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
  timestamps: true
});

// Complete User Interface
export interface IUser extends Document {
  _id: string;
  
  // Basic Information
  name: string;
  email: string;
  phone: string;
  password: string;
  dateOfBirth?: Date;
  profilePicture?: string;
  
  // Account Status
  status: 'Active' | 'Suspended' | 'Banned';
  emailVerified: boolean;
  phoneVerified: boolean;
  kycStatus: 'Pending' | 'Approved' | 'Rejected';
  kycDocuments: {
    type: string;
    url: string;
    uploadedAt: Date;
  }[];
  kycRejectionReason?: string;
  
  // Financial Information
  balance: number;
  planId: mongoose.Types.ObjectId;
  
  // Referral System
  referralCode: string;
  referredBy?: string;
  
  // Authentication & Security
  loginAttempts: number;
  lockedUntil?: Date;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  
  // Email Verification
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  
  // Phone Verification
  phoneVerificationCode?: string;
  phoneVerificationExpires?: Date;
  phoneVerificationAttempts: number;
  
  // Password Reset
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  passwordResetAttempts: number;
  
  // Address Information
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
  };
  
  // User Preferences
  preferences?: {
    notifications: {
      email: {
        kyc: boolean;
        transactions: boolean;
        loans: boolean;
        referrals: boolean;
        tasks: boolean;
        system: boolean;
        marketing: boolean;
        security: boolean;
      };
      push: {
        kyc: boolean;
        transactions: boolean;
        loans: boolean;
        referrals: boolean;
        tasks: boolean;
        system: boolean;
        marketing: boolean;
        security: boolean;
      };
      sms: {
        kyc: boolean;
        transactions: boolean;
        loans: boolean;
        referrals: boolean;
        tasks: boolean;
        system: boolean;
        marketing: boolean;
        security: boolean;
      };
      inApp: {
        kyc: boolean;
        transactions: boolean;
        loans: boolean;
        referrals: boolean;
        tasks: boolean;
        system: boolean;
        marketing: boolean;
        security: boolean;
      };
    };
    privacy: {
      profileVisibility: 'public' | 'private';
      showBalance: boolean;
      showTransactions: boolean;
      showReferrals: boolean;
      allowContact: boolean;
    };
    app: {
      language: string;
      currency: 'USD' | 'BDT';
      theme: 'light' | 'dark' | 'auto';
      biometricLogin: boolean;
      autoLock: boolean;
      autoLockDuration: number;
      soundEnabled: boolean;
      vibrationEnabled: boolean;
    };
    security: {
      twoFactorEnabled: boolean;
      loginNotifications: boolean;
      suspiciousActivityAlerts: boolean;
      deviceRegistrationNotifications: boolean;
      sessionTimeout: number;
    };
    marketing: {
      emailMarketing: boolean;
      smsMarketing: boolean;
      pushMarketing: boolean;
      personalizedOffers: boolean;
      referralNotifications: boolean;
    };
  };
  
  // Mobile App Specific Fields (Legacy - for backwards compatibility)
  deviceId: string; // Primary device ID
  fcmToken?: string; // Primary device FCM token
  fingerprint?: string; // Primary device fingerprint (legacy)
  lastAppVersion?: string;
  appInstallDate?: Date;
  
  // Device Management (New Multi-Device Support)
  devices?: Array<{
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
    biometricData: Map<string, {
      enrolled: boolean;
      template: string;
      enrolledAt: Date;
    }>;
    securityLevel: 'weak' | 'standard' | 'strong';
    registeredAt: Date;
    lastActiveAt: Date;
    lastLoginAt?: Date;
    loginAttempts: number;
    lockedUntil?: Date;
  }>;
  
  // Timestamps
  lastActiveAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  isEmailVerificationValid(): boolean;
  isPhoneVerificationValid(): boolean;
  updateLastActive(): Promise<IUser>;
}

// Main User Schema
const UserSchema = new Schema<IUser>({
  // Basic Information
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 10,
    maxlength: 20
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
    select: false // Don't include password in queries by default
  },
  dateOfBirth: {
    type: Date,
    default: null
  },
  profilePicture: {
    type: String,
    default: null
  },

  // Account Status
  status: {
    type: String,
    enum: ['Active', 'Suspended', 'Banned'],
    default: 'Active'
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  phoneVerified: {
    type: Boolean,
    default: false
  },
  kycStatus: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  kycDocuments: [{
    type: {
      type: String,
      required: true
    },
    url: {
      type: String,
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  kycRejectionReason: {
    type: String,
    default: null
  },

  // Financial Information
  balance: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  planId: {
    type: Schema.Types.ObjectId,
    ref: 'Plan',
    required: true
  },

  // Referral System
  referralCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    minlength: 6,
    maxlength: 10
  },
  referredBy: {
    type: String,
    default: null
  },

  // Authentication & Security
  loginAttempts: {
    type: Number,
    default: 0,
    min: 0,
    max: 10
  },
  lockedUntil: {
    type: Date,
    default: null
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: {
    type: String,
    default: null,
    select: false
  },

  // Email Verification
  emailVerificationToken: {
    type: String,
    default: null,
    select: false
  },
  emailVerificationExpires: {
    type: Date,
    default: null
  },

  // Phone Verification
  phoneVerificationCode: {
    type: String,
    default: null,
    select: false
  },
  phoneVerificationExpires: {
    type: Date,
    default: null
  },
  phoneVerificationAttempts: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },

  // Password Reset
  passwordResetToken: {
    type: String,
    default: null,
    select: false
  },
  passwordResetExpires: {
    type: Date,
    default: null
  },
  passwordResetAttempts: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },

  // Address Information
  address: {
    street: { type: String, trim: true, maxlength: 200 },
    city: { type: String, trim: true, maxlength: 100 },
    state: { type: String, trim: true, maxlength: 100 },
    country: { type: String, trim: true, maxlength: 100 },
    zipCode: { type: String, trim: true, maxlength: 20 }
  },

  // User Preferences
  preferences: {
    notifications: {
      email: {
        kyc: { type: Boolean, default: true },
        transactions: { type: Boolean, default: true },
        loans: { type: Boolean, default: true },
        referrals: { type: Boolean, default: true },
        tasks: { type: Boolean, default: true },
        system: { type: Boolean, default: true },
        marketing: { type: Boolean, default: false },
        security: { type: Boolean, default: true }
      },
      push: {
        kyc: { type: Boolean, default: true },
        transactions: { type: Boolean, default: true },
        loans: { type: Boolean, default: true },
        referrals: { type: Boolean, default: true },
        tasks: { type: Boolean, default: true },
        system: { type: Boolean, default: true },
        marketing: { type: Boolean, default: false },
        security: { type: Boolean, default: true }
      },
      sms: {
        kyc: { type: Boolean, default: true },
        transactions: { type: Boolean, default: true },
        loans: { type: Boolean, default: false },
        referrals: { type: Boolean, default: false },
        tasks: { type: Boolean, default: false },
        system: { type: Boolean, default: true },
        marketing: { type: Boolean, default: false },
        security: { type: Boolean, default: true }
      },
      inApp: {
        kyc: { type: Boolean, default: true },
        transactions: { type: Boolean, default: true },
        loans: { type: Boolean, default: true },
        referrals: { type: Boolean, default: true },
        tasks: { type: Boolean, default: true },
        system: { type: Boolean, default: true },
        marketing: { type: Boolean, default: true },
        security: { type: Boolean, default: true }
      }
    },
    privacy: {
      profileVisibility: { type: String, enum: ['public', 'private'], default: 'private' },
      showBalance: { type: Boolean, default: false },
      showTransactions: { type: Boolean, default: false },
      showReferrals: { type: Boolean, default: false },
      allowContact: { type: Boolean, default: true }
    },
    app: {
      language: { type: String, default: 'en', maxlength: 5 },
      currency: { type: String, enum: ['USD', 'BDT'], default: 'BDT' },
      theme: { type: String, enum: ['light', 'dark', 'auto'], default: 'auto' },
      biometricLogin: { type: Boolean, default: false },
      autoLock: { type: Boolean, default: true },
      autoLockDuration: { type: Number, default: 5, min: 1, max: 60 },
      soundEnabled: { type: Boolean, default: true },
      vibrationEnabled: { type: Boolean, default: true }
    },
    security: {
      twoFactorEnabled: { type: Boolean, default: false },
      loginNotifications: { type: Boolean, default: true },
      suspiciousActivityAlerts: { type: Boolean, default: true },
      deviceRegistrationNotifications: { type: Boolean, default: true },
      sessionTimeout: { type: Number, default: 30, min: 5, max: 120 }
    },
    marketing: {
      emailMarketing: { type: Boolean, default: false },
      smsMarketing: { type: Boolean, default: false },
      pushMarketing: { type: Boolean, default: false },
      personalizedOffers: { type: Boolean, default: true },
      referralNotifications: { type: Boolean, default: true }
    }
  },

  // Mobile App Specific Fields (Legacy - for backwards compatibility)
  deviceId: {
    type: String,
    required: true,
    index: true
  },
  fcmToken: {
    type: String,
    default: null,
    index: true
  },
  fingerprint: {
    type: String,
    default: null,
    index: true
  },
  lastAppVersion: {
    type: String,
    default: null
  },
  appInstallDate: {
    type: Date,
    default: null
  },

  // Device Management (New Multi-Device Support)
  devices: [DeviceSchema],

  // Timestamps
  lastActiveAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  collection: 'users'
});

// Indexes for better performance
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ phone: 1 }, { unique: true });
UserSchema.index({ referralCode: 1 }, { unique: true });
UserSchema.index({ deviceId: 1 });
UserSchema.index({ status: 1 });
UserSchema.index({ kycStatus: 1 });
UserSchema.index({ emailVerified: 1 });
UserSchema.index({ phoneVerified: 1 });
UserSchema.index({ planId: 1 });
UserSchema.index({ referredBy: 1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ lastActiveAt: -1 });

// Device-related indexes
UserSchema.index({ 'devices.deviceId': 1 });
UserSchema.index({ 'devices.fingerprint': 1 });
UserSchema.index({ 'devices.isPrimary': 1 });
UserSchema.index({ 'devices.lastActiveAt': -1 });
UserSchema.index({ 'devices.isActive': 1 });
UserSchema.index({ 'devices.platform': 1 });

// Compound indexes for better query performance
UserSchema.index({ status: 1, emailVerified: 1, phoneVerified: 1 });
UserSchema.index({ status: 1, kycStatus: 1 });
UserSchema.index({ planId: 1, status: 1 });
UserSchema.index({ referredBy: 1, createdAt: -1 });

// Rate limiting and security indexes
UserSchema.index({ emailVerificationToken: 1, emailVerificationExpires: 1 });
UserSchema.index({ phoneVerificationCode: 1, phoneVerificationExpires: 1 });
UserSchema.index({ passwordResetToken: 1, passwordResetExpires: 1 });

// Method to check if email verification is valid
UserSchema.methods.isEmailVerificationValid = function() {
  return this.emailVerificationExpires && this.emailVerificationExpires > new Date();
};

// Method to check if phone verification is valid
UserSchema.methods.isPhoneVerificationValid = function() {
  return this.phoneVerificationAttempts < 5 && !this.isPhoneVerificationExpired;
};

// Method to update last active timestamp
UserSchema.methods.updateLastActive = function() {
  this.lastActiveAt = new Date();
  return this.save();
};

// Static method to get default preferences
UserSchema.statics.getDefaultPreferences = function() {
  return {
    notifications: {
      email: { kyc: true, transactions: true, loans: true, referrals: true, tasks: true, system: true, marketing: false, security: true },
      push: { kyc: true, transactions: true, loans: true, referrals: true, tasks: true, system: true, marketing: false, security: true },
      sms: { kyc: true, transactions: true, loans: false, referrals: false, tasks: false, system: true, marketing: false, security: true },
      inApp: { kyc: true, transactions: true, loans: true, referrals: true, tasks: true, system: true, marketing: true, security: true }
    },
    privacy: { profileVisibility: 'private', showBalance: false, showTransactions: false, showReferrals: false, allowContact: true },
    app: { language: 'en', currency: 'BDT', theme: 'auto', biometricLogin: false, autoLock: true, autoLockDuration: 5, soundEnabled: true, vibrationEnabled: true },
    security: { twoFactorEnabled: false, loginNotifications: true, suspiciousActivityAlerts: true, deviceRegistrationNotifications: true, sessionTimeout: 30 },
    marketing: { emailMarketing: false, smsMarketing: false, pushMarketing: false, personalizedOffers: true, referralNotifications: true }
  };
};

// Pre-save middleware
UserSchema.pre('save', function(next) {
  // Ensure referral code is uppercase
  if (this.referralCode) {
    this.referralCode = this.referralCode.toUpperCase();
  }
  
  // Set default preferences if not set
  if (!this.preferences) {
    // @ts-ignore
    this.preferences = (this.constructor as any).getDefaultPreferences();
  }
  
  // Sync primary device with legacy fields for backwards compatibility
  if (this.devices && this.devices.length > 0) {
    const primaryDevice = this.devices.find(d => d.isPrimary);
    if (primaryDevice) {
      this.deviceId = primaryDevice.deviceId;
      this.fcmToken = primaryDevice.fcmToken || this.fcmToken;
      this.fingerprint = primaryDevice.fingerprint;
      this.lastAppVersion = primaryDevice.appVersion;
    }
  }
  
  next();
});

export const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);