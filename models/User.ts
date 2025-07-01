// models/User.ts - Complete Fixed User Model without Duplicate Indexes
import mongoose, { Document, Schema } from 'mongoose';

// Device subdocument schema - FIXED: Removed all index: true properties
const DeviceSchema = new Schema({
  deviceId: { 
    type: String, 
    required: true
    // REMOVED: index: true (will be handled by parent schema)
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
    required: true
    // REMOVED: index: true (will be handled by parent schema)
  },
  fcmToken: { 
    type: String, 
    default: null
    // REMOVED: index: true (will be handled by parent schema)
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
    default: false
    // REMOVED: index: true (will be handled by parent schema)
  },
  isTrusted: { 
    type: Boolean, 
    default: false 
  },
  isActive: { 
    type: Boolean, 
    default: true
    // REMOVED: index: true (will be handled by parent schema)
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
    default: Date.now
    // REMOVED: index: true (will be handled by parent schema)
  },
  lastActiveAt: { 
    type: Date, 
    default: Date.now
    // REMOVED: index: true (will be handled by parent schema)
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
  referredBy?: mongoose.Types.ObjectId;
  totalReferrals: number;
  referralEarnings: number;
  
  // Address Information
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
  };
  
  // Security & Verification
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  phoneVerificationCode?: string;
  phoneVerificationExpires?: Date;
  phoneVerificationAttempts: number;
  isPhoneVerificationExpired: boolean;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  twoFactorSecret?: string;
  twoFactorEnabled: boolean;
  twoFactorBackupCodes: string[];
  
  // Login Security
  loginAttempts: number;
  lockUntil?: Date;
  lastFailedLogin?: Date;
  
  // Device Management (Legacy for backward compatibility)
  deviceId?: string; // Primary device ID
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

// Main User Schema - FIXED: Removed all duplicate index properties
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
    lowercase: true,
    trim: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    // REMOVED: unique: true (will be defined explicitly)
  },
  phone: {
    type: String,
    trim: true,
    match: /^[\+]?[1-9][\d]{0,15}$/
    // REMOVED: unique: true (will be defined explicitly)
  },
  password: {
    type: String,
    required: true,
    minlength: 8
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
    required: true
    // REMOVED: unique: true (will be defined explicitly)
  },
  referredBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  totalReferrals: {
    type: Number,
    default: 0,
    min: 0
  },
  referralEarnings: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Address Information
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    zipCode: String
  },
  
  // Security & Verification
  emailVerificationToken: {
    type: String,
    default: null
  },
  emailVerificationExpires: {
    type: Date,
    default: null
  },
  phoneVerificationCode: {
    type: String,
    default: null
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
  isPhoneVerificationExpired: {
    type: Boolean,
    default: false
  },
  passwordResetToken: {
    type: String,
    default: null
  },
  passwordResetExpires: {
    type: Date,
    default: null
  },
  twoFactorSecret: {
    type: String,
    default: null
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorBackupCodes: [{
    type: String
  }],
  
  // Login Security
  loginAttempts: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  lockUntil: {
    type: Date,
    default: null
  },
  lastFailedLogin: {
    type: Date,
    default: null
  },
  
  // Device Management (Legacy for backward compatibility)
  deviceId: {
    type: String,
    default: null
    // REMOVED: index: true (will be defined explicitly)
  },
  fcmToken: {
    type: String,
    default: null
  },
  fingerprint: {
    type: String,
    default: null
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

// FIXED: Define ALL indexes explicitly to avoid duplicates
// Core unique indexes
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ phone: 1 }, { unique: true, sparse: true }); // sparse allows null values
UserSchema.index({ referralCode: 1 }, { unique: true });

// Regular indexes
UserSchema.index({ deviceId: 1 }, { sparse: true }); // sparse for legacy compatibility
UserSchema.index({ status: 1 });
UserSchema.index({ kycStatus: 1 });
UserSchema.index({ emailVerified: 1 });
UserSchema.index({ phoneVerified: 1 });
UserSchema.index({ planId: 1 });
UserSchema.index({ referredBy: 1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ lastActiveAt: -1 });

// Device-related indexes (for subdocuments)
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

// Static method to get default device settings
UserSchema.statics.getDefaultDeviceSettings = function() {
  return {
    deviceType: 'mobile',
    platform: 'android',
    isPrimary: true,
    isTrusted: true,
    isActive: true,
    biometricEnabled: false,
    securityLevel: 'standard',
    loginAttempts: 0
  };
};

// Pre-save middleware to generate referral code if not exists
UserSchema.pre('save', async function(next) {
  if (this.isNew && !this.referralCode) {
    // Generate unique referral code
    let referralCode;
    let attempts = 0;
    const maxAttempts = 10;
    
    do {
      referralCode = Math.random().toString(36).substr(2, 8).toUpperCase();
      attempts++;
      
      if (attempts >= maxAttempts) {
        return next(new Error('Failed to generate unique referral code'));
      }
      
      const existingUser = await mongoose.model('User').findOne({ referralCode });
      if (!existingUser) {
        this.referralCode = referralCode;
        break;
      }
    } while (attempts < maxAttempts);
  }
  
  next();
});

// Export the model
export const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);