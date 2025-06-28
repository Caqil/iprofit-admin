import mongoose, { Document, Schema } from 'mongoose';

export interface IAdmin extends Document {
  _id: string;
  email: string;
  passwordHash: string;
  role: 'SuperAdmin' | 'Moderator';
  name: string;
  avatar?: string;
  lastLogin?: Date;
  twoFactorSecret?: string;
  twoFactorEnabled: boolean;
  isActive: boolean;
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
}

const AdminSchema = new Schema<IAdmin>({
  email: {
    type: String,
    required: true,
    unique: true, // This creates an index automatically
    lowercase: true,
    trim: true
    // Remove the separate index: true to fix duplicate index warning
  },
  passwordHash: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['SuperAdmin', 'Moderator'],
    default: 'Moderator',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
    // Remove the separate index: true to fix duplicate index warning
  },
  avatar: {
    type: String,
    default: null
  },
  lastLogin: {
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
  isActive: {
    type: Boolean,
    default: true
  },
  permissions: [{
    type: String
  }]
}, {
  timestamps: true,
  collection: 'admins'
});

// Create indexes manually to avoid duplicates
// email already has an index from unique: true
AdminSchema.index({ role: 1 });
AdminSchema.index({ isActive: 1 });
AdminSchema.index({ createdAt: -1 });

export const Admin = mongoose.models.Admin || mongoose.model<IAdmin>('Admin', AdminSchema);
