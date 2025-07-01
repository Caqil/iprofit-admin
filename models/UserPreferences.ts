// models/UserPreferences.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IUserPreferences extends Document {
  _id: string;
  userId: mongoose.Types.ObjectId;
  
  // Notification preferences
  notifications: {
    email: {
      marketing: boolean;
      transactionAlerts: boolean;
      kycUpdates: boolean;
      loanUpdates: boolean;
      taskNotifications: boolean;
      referralUpdates: boolean;
      systemAnnouncements: boolean;
      securityAlerts: boolean;
    };
    sms: {
      transactionAlerts: boolean;
      securityAlerts: boolean;
      loanReminders: boolean;
      kycUpdates: boolean;
    };
    push: {
      transactionAlerts: boolean;
      taskDeadlines: boolean;
      marketingOffers: boolean;
      systemNotifications: boolean;
      chatMessages: boolean;
    };
    inApp: {
      transactionUpdates: boolean;
      taskAssignments: boolean;
      referralRewards: boolean;
      systemMessages: boolean;
    };
  };
  
  // Privacy preferences
  privacy: {
    showProfilePicture: boolean;
    showOnlineStatus: boolean;
    allowMarketingCommunication: boolean;
    shareDataForAnalytics: boolean;
    showInLeaderboards: boolean;
    allowReferralTracking: boolean;
  };
  
  // App preferences
  app: {
    language: string;
    currency: 'USD' | 'BDT';
    theme: 'light' | 'dark' | 'auto';
    timeZone: string;
    dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
    numberFormat: 'US' | 'EU' | 'IN';
  };
  
  // Dashboard preferences
  dashboard: {
    defaultView: 'overview' | 'transactions' | 'investments' | 'loans';
    showBalance: boolean;
    showRecentTransactions: boolean;
    showQuickActions: boolean;
    quickActionItems: string[];
    widgetOrder: string[];
    refreshInterval: number; // in seconds
  };
  
  // Security preferences
  security: {
    twoFactorEnabled: boolean;
    biometricEnabled: boolean;
    autoLockTimeout: number; // in minutes
    requirePasswordForTransactions: boolean;
    requireBiometricForTransactions: boolean;
    sessionTimeout: number; // in minutes
    allowMultipleDevices: boolean;
  };
  
  // Transaction preferences
  transactions: {
    defaultPaymentMethod: string;
    autoSaveRecipients: boolean;
    confirmBeforeTransaction: boolean;
    dailyTransactionLimit: number;
    weeklyTransactionLimit: number;
    monthlyTransactionLimit: number;
  };
  
  // Communication preferences
  communication: {
    preferredContactMethod: 'email' | 'sms' | 'phone' | 'in_app';
    supportLanguage: string;
    marketingFrequency: 'never' | 'weekly' | 'monthly' | 'quarterly';
  };

  createdAt: Date;
  updatedAt: Date;
}

const UserPreferencesSchema = new Schema<IUserPreferences>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  
  notifications: {
    email: {
      marketing: { type: Boolean, default: true },
      transactionAlerts: { type: Boolean, default: true },
      kycUpdates: { type: Boolean, default: true },
      loanUpdates: { type: Boolean, default: true },
      taskNotifications: { type: Boolean, default: true },
      referralUpdates: { type: Boolean, default: true },
      systemAnnouncements: { type: Boolean, default: true },
      securityAlerts: { type: Boolean, default: true }
    },
    sms: {
      transactionAlerts: { type: Boolean, default: true },
      securityAlerts: { type: Boolean, default: true },
      loanReminders: { type: Boolean, default: true },
      kycUpdates: { type: Boolean, default: false }
    },
    push: {
      transactionAlerts: { type: Boolean, default: true },
      taskDeadlines: { type: Boolean, default: true },
      marketingOffers: { type: Boolean, default: false },
      systemNotifications: { type: Boolean, default: true },
      chatMessages: { type: Boolean, default: true }
    },
    inApp: {
      transactionUpdates: { type: Boolean, default: true },
      taskAssignments: { type: Boolean, default: true },
      referralRewards: { type: Boolean, default: true },
      systemMessages: { type: Boolean, default: true }
    }
  },
  
  privacy: {
    showProfilePicture: { type: Boolean, default: true },
    showOnlineStatus: { type: Boolean, default: false },
    allowMarketingCommunication: { type: Boolean, default: true },
    shareDataForAnalytics: { type: Boolean, default: true },
    showInLeaderboards: { type: Boolean, default: true },
    allowReferralTracking: { type: Boolean, default: true }
  },
  
  app: {
    language: { type: String, default: 'en' },
    currency: { type: String, enum: ['USD', 'BDT'], default: 'USD' },
    theme: { type: String, enum: ['light', 'dark', 'auto'], default: 'auto' },
    timeZone: { type: String, default: 'UTC' },
    dateFormat: { type: String, enum: ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'], default: 'MM/DD/YYYY' },
    numberFormat: { type: String, enum: ['US', 'EU', 'IN'], default: 'US' }
  },
  
  dashboard: {
    defaultView: { type: String, enum: ['overview', 'transactions', 'investments', 'loans'], default: 'overview' },
    showBalance: { type: Boolean, default: true },
    showRecentTransactions: { type: Boolean, default: true },
    showQuickActions: { type: Boolean, default: true },
    quickActionItems: [{ type: String, default: () => ['deposit', 'withdraw', 'transfer', 'pay_bills'] }],
    widgetOrder: [{ type: String, default: () => ['balance', 'recent_transactions', 'quick_actions', 'statistics'] }],
    refreshInterval: { type: Number, default: 30 } // 30 seconds
  },
  
  security: {
    twoFactorEnabled: { type: Boolean, default: false },
    biometricEnabled: { type: Boolean, default: false },
    autoLockTimeout: { type: Number, default: 5 }, // 5 minutes
    requirePasswordForTransactions: { type: Boolean, default: true },
    requireBiometricForTransactions: { type: Boolean, default: false },
    sessionTimeout: { type: Number, default: 30 }, // 30 minutes
    allowMultipleDevices: { type: Boolean, default: true }
  },
  
  transactions: {
    defaultPaymentMethod: { type: String, default: '' },
    autoSaveRecipients: { type: Boolean, default: true },
    confirmBeforeTransaction: { type: Boolean, default: true },
    dailyTransactionLimit: { type: Number, default: 10000 },
    weeklyTransactionLimit: { type: Number, default: 50000 },
    monthlyTransactionLimit: { type: Number, default: 200000 }
  },
  
  communication: {
    preferredContactMethod: { type: String, enum: ['email', 'sms', 'phone', 'in_app'], default: 'email' },
    supportLanguage: { type: String, default: 'en' },
    marketingFrequency: { type: String, enum: ['never', 'weekly', 'monthly', 'quarterly'], default: 'monthly' }
  }
}, {
  timestamps: true,
  collection: 'user_preferences'
});

// Indexes for performance
UserPreferencesSchema.index({ userId: 1 }, { unique: true });
UserPreferencesSchema.index({ createdAt: -1 });
UserPreferencesSchema.index({ updatedAt: -1 });

// Static method to get default preferences
UserPreferencesSchema.statics.getDefaultPreferences = function(userId: string) {
  return new this({
    userId: new mongoose.Types.ObjectId(userId)
  });
};

// Instance method to reset to defaults
UserPreferencesSchema.methods.resetToDefaults = function() {
  const defaultPrefs = (this.constructor as any).getDefaultPreferences(this.userId);
  Object.assign(this, defaultPrefs.toObject());
  delete this._id;
  return this;
};

export const UserPreferences = mongoose.models.UserPreferences || 
  mongoose.model<IUserPreferences>('UserPreferences', UserPreferencesSchema);