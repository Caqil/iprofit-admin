// models/User.ts - Enhanced with mobile features and preferences
import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  _id: string;
  name: string;
  email: string;
  phone: string;
  passwordHash?: string;
  planId: mongoose.Types.ObjectId;
  balance: number;
  kycStatus: 'Pending' | 'Approved' | 'Rejected' | 'Verified';
  kycDocuments: {
    type: string;
    url: string;
    uploadedAt: Date;
  }[];
  kycRejectionReason?: string;
  referralCode: string;
  referredBy?: mongoose.Types.ObjectId;
  deviceId: string;
  profilePicture?: string;
  dateOfBirth?: Date;
  address?: {
    street: string;
    city: string;
    state: string;
    country: string;
    zipCode: string;
  };
  status: 'Active' | 'Suspended' | 'Banned';
  lastLogin?: Date;
  loginAttempts: number;
  lockedUntil?: Date;
  
  // Email verification fields
  emailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  emailVerificationAttempts: number;
  emailVerificationRequestedAt?: Date;
  emailVerifiedAt?: Date;
  
  // Phone verification fields
  phoneVerified: boolean;
  phoneVerificationCode?: string;
  phoneVerificationExpires?: Date;
  phoneVerificationAttempts: number;
  phoneCodeRequestedAt?: Date;
  phoneVerifiedAt?: Date;
  
  // Password reset fields
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  passwordResetAttempts: number;
  passwordResetRequestedAt?: Date;
  
  // Password security fields
  lastPasswordChange?: Date;
  passwordHistory?: string[];
  passwordChangedFromDevice?: string;
  
  // Two-factor authentication
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  
  // User preferences for mobile app
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
      profileVisibility: 'public' | 'private' | 'friends';
      showBalance: boolean;
      showTransactions: boolean;
      showReferrals: boolean;
      allowContact: boolean;
    };
    app: {
      language: 'en' | 'bn' | 'hi';
      currency: 'BDT' | 'USD';
      theme: 'light' | 'dark' | 'auto';
      biometricLogin: boolean;
      autoLock: boolean;
      autoLockDuration: number; // minutes
      soundEnabled: boolean;
      vibrationEnabled: boolean;
    };
    security: {
      twoFactorEnabled: boolean;
      loginNotifications: boolean;
      suspiciousActivityAlerts: boolean;
      deviceRegistrationNotifications: boolean;
      sessionTimeout: number; // minutes
    };
    marketing: {
      emailMarketing: boolean;
      smsMarketing: boolean;
      pushMarketing: boolean;
      personalizedOffers: boolean;
      referralNotifications: boolean;
    };
  };
  
  // Mobile app specific fields
  fcmToken?: string; // Firebase Cloud Messaging token
  lastAppVersion?: string;
  appInstallDate?: Date;
  lastActiveAt?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  name: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  passwordHash: {
    type: String,
    required: function() {
      return !this.isNew || this.passwordHash !== undefined;
    }
  },
  planId: {
    type: Schema.Types.ObjectId,
    ref: 'Plan',
    required: true,
    index: true
  },
  balance: {
    type: Number,
    default: 0,
    min: 0
  },
  kycStatus: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected', 'Verified'],
    default: 'Pending',
    index: true
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
  referralCode: {
    type: String,
    unique: true,
    required: true,
    uppercase: true,
    index: true
  },
  referredBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  deviceId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  profilePicture: {
    type: String,
    default: null
  },
  dateOfBirth: {
    type: Date,
    default: null
  },
  address: {
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    country: { type: String, trim: true },
    zipCode: { type: String, trim: true }
  },
  status: {
    type: String,
    enum: ['Active', 'Suspended', 'Banned'],
    default: 'Active',
    index: true
  },
  lastLogin: {
    type: Date,
    default: null
  },
  loginAttempts: {
    type: Number,
    default: 0,
    min: 0
  },
  lockedUntil: {
    type: Date,
    default: null
  },
  
  // Email verification fields
  emailVerified: {
    type: Boolean,
    default: false,
    index: true
  },
  emailVerificationToken: {
    type: String,
    default: null,
    index: true
  },
  emailVerificationExpires: {
    type: Date,
    default: null
  },
  emailVerificationAttempts: {
    type: Number,
    default: 0,
    min: 0
  },
  emailVerificationRequestedAt: {
    type: Date,
    default: null
  },
  emailVerifiedAt: {
    type: Date,
    default: null
  },
  
  // Phone verification fields
  phoneVerified: {
    type: Boolean,
    default: false,
    index: true
  },
  phoneVerificationCode: {
    type: String,
    default: null,
    index: true
  },
  phoneVerificationExpires: {
    type: Date,
    default: null
  },
  phoneVerificationAttempts: {
    type: Number,
    default: 0,
    min: 0
  },
  phoneCodeRequestedAt: {
    type: Date,
    default: null
  },
  phoneVerifiedAt: {
    type: Date,
    default: null
  },
  
  // Password reset fields
  passwordResetToken: {
    type: String,
    default: null,
    index: true
  },
  passwordResetExpires: {
    type: Date,
    default: null
  },
  passwordResetAttempts: {
    type: Number,
    default: 0,
    min: 0
  },
  passwordResetRequestedAt: {
    type: Date,
    default: null
  },
  
  // Password security fields
  lastPasswordChange: {
    type: Date,
    default: null
  },
  passwordHistory: [{
    type: String
  }],
  passwordChangedFromDevice: {
    type: String,
    default: null
  },
  
  // Two-factor authentication
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: {
    type: String,
    default: null
  },
  
  // User preferences
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
      profileVisibility: { type: String, enum: ['public', 'private', 'friends'], default: 'private' },
      showBalance: { type: Boolean, default: false },
      showTransactions: { type: Boolean, default: false },
      showReferrals: { type: Boolean, default: false },
      allowContact: { type: Boolean, default: true }
    },
    app: {
      language: { type: String, enum: ['en', 'bn', 'hi'], default: 'en' },
      currency: { type: String, enum: ['BDT', 'USD'], default: 'BDT' },
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
  
  // Mobile app specific fields
  fcmToken: {
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
  lastActiveAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  collection: 'users'
});

// Additional indexes for mobile authentication and features
UserSchema.index({ emailVerificationToken: 1, emailVerificationExpires: 1 });
UserSchema.index({ phoneVerificationCode: 1, phoneVerificationExpires: 1 });
UserSchema.index({ passwordResetToken: 1, passwordResetExpires: 1 });
UserSchema.index({ status: 1, emailVerified: 1, phoneVerified: 1 });
UserSchema.index({ lastActiveAt: -1 });
UserSchema.index({ createdAt: -1 });

// Compound indexes for better performance
UserSchema.index({ status: 1, kycStatus: 1 });
UserSchema.index({ planId: 1, status: 1 });
UserSchema.index({ referredBy: 1, createdAt: -1 });

// Indexes for rate limiting and security
UserSchema.index({ email: 1, passwordResetRequestedAt: -1 });
UserSchema.index({ phone: 1, phoneCodeRequestedAt: -1 });
UserSchema.index({ email: 1, emailVerificationRequestedAt: -1 });

// Virtual for checking if account is locked
UserSchema.virtual('isLocked').get(function() {
  return this.lockedUntil && this.lockedUntil > new Date();
});

// Virtual for checking if email verification is expired
UserSchema.virtual('isEmailVerificationExpired').get(function() {
  return this.emailVerificationExpires && this.emailVerificationExpires < new Date();
});

// Virtual for checking if phone verification is expired
UserSchema.virtual('isPhoneVerificationExpired').get(function() {
  return this.phoneVerificationExpires && this.phoneVerificationExpires < new Date();
});

// Virtual for checking if password reset is expired
UserSchema.virtual('isPasswordResetExpired').get(function() {
  return this.passwordResetExpires && this.passwordResetExpires < new Date();
});

// Virtual for account completion percentage
UserSchema.virtual('completionPercentage').get(function() {
  const fields = [
    this.name,
    this.email,
    this.phone,
    this.emailVerified,
    this.phoneVerified,
    this.dateOfBirth,
    this.address?.street,
    this.address?.city,
    this.kycStatus === 'Approved',
    this.profilePicture
  ];

  const completedFields = fields.filter(field => 
    field !== null && field !== undefined && field !== ''
  ).length;

  return Math.round((completedFields / fields.length) * 100);
});

// Method to check if user can attempt password reset
UserSchema.methods.canAttemptPasswordReset = function() {
  return this.passwordResetAttempts < 5 && !this.isPasswordResetExpired;
};

// Method to check if user can attempt email verification
UserSchema.methods.canAttemptEmailVerification = function() {
  return this.emailVerificationAttempts < 3 && !this.isEmailVerificationExpired;
};

// Method to check if user can attempt phone verification
UserSchema.methods.canAttemptPhoneVerification = function() {
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
  
  next();
});

export const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);