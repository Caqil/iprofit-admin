// models/Setting.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface ISetting extends Document {
  _id: string;
  category: 'system' | 'financial' | 'security' | 'email' | 'upload' | 'business' | 'maintenance' | 'api';
  key: string;
  value: any;
  dataType: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  isEditable: boolean;
  isEncrypted: boolean;
  defaultValue?: any;
  validation?: {
    required?: boolean;
    min?: number;
    max?: number;
    pattern?: string;
    enum?: string[];
  };
  updatedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SettingSchema = new Schema<ISetting>({
  category: {
    type: String,
    enum: ['system', 'financial', 'security', 'email', 'upload', 'business', 'maintenance', 'api'],
    required: true
  },
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  value: {
    type: Schema.Types.Mixed,
    required: true
  },
  dataType: {
    type: String,
    enum: ['string', 'number', 'boolean', 'object', 'array'],
    required: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  isEditable: {
    type: Boolean,
    default: true
  },
  isEncrypted: {
    type: Boolean,
    default: false
  },
  defaultValue: {
    type: Schema.Types.Mixed,
    default: null
  },
  validation: {
    required: {
      type: Boolean,
      default: false
    },
    min: Number,
    max: Number,
    pattern: String,
    enum: [String]
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  }
}, {
  timestamps: true,
  collection: 'settings'
});

// Create indexes
SettingSchema.index({ category: 1 });
SettingSchema.index({ isEditable: 1 });
SettingSchema.index({ updatedAt: -1 });

// Compound indexes for better performance
SettingSchema.index({ category: 1, isEditable: 1 });

export const Setting = mongoose.models.Setting || mongoose.model<ISetting>('Setting', SettingSchema);

// Settings History Model
export interface ISettingHistory extends Document {
  _id: string;
  settingId: mongoose.Types.ObjectId;
  oldValue: any;
  newValue: any;
  updatedBy: mongoose.Types.ObjectId;
  reason?: string;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
}

const SettingHistorySchema = new Schema<ISettingHistory>({
  settingId: {
    type: Schema.Types.ObjectId,
    ref: 'Setting',
    required: true
  },
  oldValue: {
    type: Schema.Types.Mixed,
    required: true
  },
  newValue: {
    type: Schema.Types.Mixed,
    required: true
  },
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  reason: {
    type: String,
    trim: true
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    required: true
  }
}, {
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'setting_history'
});

// Create indexes for history
SettingHistorySchema.index({ settingId: 1 });
SettingHistorySchema.index({ updatedBy: 1 });
SettingHistorySchema.index({ createdAt: -1 });

export const SettingHistory = mongoose.models.SettingHistory || mongoose.model<ISettingHistory>('SettingHistory', SettingHistorySchema);