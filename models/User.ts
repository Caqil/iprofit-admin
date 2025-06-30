import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  _id: string;
  name: string;
  email: string;
  phone: string;
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
  referredBy?: string;
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
  emailVerified: boolean;
  phoneVerified: boolean;
  twoFactorEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  name: {
    type: String,
    required: true,
    trim: true,
    index: true // Remove this line to fix duplicate index warning
  },
  email: {
    type: String,
    required: true,
    unique: true, // This creates an index automatically
    lowercase: true,
    trim: true
    // Remove the separate index: true to fix duplicate index warning
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  planId: {
    type: Schema.Types.ObjectId,
    ref: 'Plan',
    required: true
  },
  balance: {
    type: Number,
    default: 0,
    min: 0
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
  referralCode: {
    type: String,
    unique: true, // This creates an index automatically
    required: true
    // Remove the separate index: true to fix duplicate index warning
  },
  referredBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  deviceId: {
    type: String,
    required: true,
    unique: true // This creates an index automatically
    // Remove the separate index: true to fix duplicate index warning
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
    street: String,
    city: String,
    state: String,
    country: String,
    zipCode: String
  },
  status: {
    type: String,
    enum: ['Active', 'Suspended', 'Banned'],
    default: 'Active'
  },
  lastLogin: {
    type: Date,
    default: null
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockedUntil: {
    type: Date,
    default: null
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  phoneVerified: {
    type: Boolean,
    default: false
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  
}, {
  timestamps: true,
  collection: 'users'
});

UserSchema.index({ phone: 1 });
UserSchema.index({ planId: 1 });
UserSchema.index({ kycStatus: 1 });
UserSchema.index({ status: 1 });
UserSchema.index({ createdAt: -1 });

// Compound indexes for better performance
UserSchema.index({ status: 1, kycStatus: 1 });
UserSchema.index({ planId: 1, status: 1 });

export const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
