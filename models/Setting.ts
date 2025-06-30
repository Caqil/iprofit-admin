// models/Setting.ts - Fixed version with proper error handling

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
SettingSchema.index({ category: 1, isEditable: 1 });

// Check if we're in a server environment
const isServer = typeof window === 'undefined';

// Export with proper error handling
let Setting: mongoose.Model<ISetting>;

if (isServer) {
  try {
    // Only create model on server side
    if (mongoose && mongoose.models && mongoose.model) {
      Setting = mongoose.models.Setting || mongoose.model<ISetting>('Setting', SettingSchema);
    } else {
      throw new Error('Mongoose is not properly initialized on server');
    }
  } catch (error) {
    console.error('Error creating Setting model:', error);
    // Create a fallback that will throw meaningful error if used
    Setting = null as any;
  }
} else {
  // On client side, create a dummy model that throws error if used
  Setting = {
    find: () => {
      throw new Error('Setting model cannot be used on client side. Use API routes instead.');
    },
    findOne: () => {
      throw new Error('Setting model cannot be used on client side. Use API routes instead.');
    },
    create: () => {
      throw new Error('Setting model cannot be used on client side. Use API routes instead.');
    },
    findOneAndUpdate: () => {
      throw new Error('Setting model cannot be used on client side. Use API routes instead.');
    }
  } as any;
}

export { Setting };

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

let SettingHistory: mongoose.Model<ISettingHistory>;

if (isServer) {
  try {
    if (mongoose && mongoose.models && mongoose.model) {
      SettingHistory = mongoose.models.SettingHistory || mongoose.model<ISettingHistory>('SettingHistory', SettingHistorySchema);
    } else {
      throw new Error('Mongoose is not properly initialized on server');
    }
  } catch (error) {
    console.error('Error creating SettingHistory model:', error);
    SettingHistory = null as any;
  }
} else {
  // Client-side dummy model
  SettingHistory = {
    find: () => {
      throw new Error('SettingHistory model cannot be used on client side. Use API routes instead.');
    },
    create: () => {
      throw new Error('SettingHistory model cannot be used on client side. Use API routes instead.');
    }
  } as any;
}

export { SettingHistory };

// Alternative approach: Safe model creation function (server-side only)
export function createSettingModel(): mongoose.Model<ISetting> {
  if (!isServer) {
    throw new Error('createSettingModel can only be called on the server side');
  }
  
  try {
    if (!mongoose || !mongoose.models) {
      throw new Error('Mongoose is not initialized. Make sure to call connectToDatabase() first.');
    }
    return mongoose.models.Setting || mongoose.model<ISetting>('Setting', SettingSchema);
  } catch (error) {
    console.error('Failed to create Setting model:', error);
    throw new Error('Database model creation failed. Please check your database connection.');
  }
}

export function createSettingHistoryModel(): mongoose.Model<ISettingHistory> {
  if (!isServer) {
    throw new Error('createSettingHistoryModel can only be called on the server side');
  }
  
  try {
    if (!mongoose || !mongoose.models) {
      throw new Error('Mongoose is not initialized. Make sure to call connectToDatabase() first.');
    }
    return mongoose.models.SettingHistory || mongoose.model<ISettingHistory>('SettingHistory', SettingHistorySchema);
  } catch (error) {
    console.error('Failed to create SettingHistory model:', error);
    throw new Error('Database model creation failed. Please check your database connection.');
  }
}