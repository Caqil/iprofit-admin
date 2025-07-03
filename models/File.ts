// models/File.ts - File Model for Upload Management
import mongoose, { Document, Schema } from 'mongoose';

export interface IFile extends Document {
  _id: string;
  userId: mongoose.Types.ObjectId;
  originalName: string;
  fileName: string;
  filePath: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
  fileType: 'kyc_document' | 'profile_image' | 'task_proof' | 'general';
  category?: string; // For KYC: 'national_id', 'passport', etc.
  status: 'pending' | 'approved' | 'rejected' | 'active';
  uploadedBy: mongoose.Types.ObjectId;
  uploadedFromDevice?: string;
  metadata?: {
    width?: number;
    height?: number;
    documentType?: string;
    expiryDate?: Date;
    issuingAuthority?: string;
    taskId?: string;
    compressionApplied?: boolean;
    virusScanned?: boolean;
    scanResult?: string;
  };
  accessCount: number;
  lastAccessedAt?: Date;
  expiresAt?: Date;
  isPublic: boolean;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const FileSchema = new Schema<IFile>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  originalName: {
    type: String,
    required: true,
    maxlength: 255
  },
  fileName: {
    type: String,
    required: true,
    unique: true, // This automatically creates an index
    maxlength: 255
  },
  filePath: {
    type: String,
    required: true
  },
  fileUrl: {
    type: String,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true,
    min: 0
  },
  fileType: {
    type: String,
    enum: ['kyc_document', 'profile_image', 'task_proof', 'general'],
    required: true,
    index: true
  },
  category: {
    type: String,
    maxlength: 50
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'active'],
    default: 'pending',
    index: true
  },
  uploadedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  uploadedFromDevice: {
    type: String,
    maxlength: 100
  },
  metadata: {
    width: Number,
    height: Number,
    documentType: String,
    expiryDate: Date,
    issuingAuthority: String,
    taskId: String,
    compressionApplied: Boolean,
    virusScanned: Boolean,
    scanResult: String
  },
  accessCount: {
    type: Number,
    default: 0,
    min: 0
  },
  lastAccessedAt: {
    type: Date,
    default: null
  },
  expiresAt: {
    type: Date,
    default: null
    // Removed index: true since we're creating it manually below with sparse option
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  tags: [{
    type: String,
    maxlength: 50
  }]
}, {
  timestamps: true,
  collection: 'files'
});

// Create compound and specialized indexes manually
// Note: fileName already has an index from unique: true, so we don't create another one
FileSchema.index({ userId: 1, fileType: 1 });
FileSchema.index({ status: 1, createdAt: -1 });
FileSchema.index({ expiresAt: 1 }, { sparse: true }); // sparse for optional field

export const File = mongoose.models.File || mongoose.model<IFile>('File', FileSchema);