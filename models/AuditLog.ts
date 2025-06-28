import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IAuditLog extends Document {
  _id: string;
  adminId: Types.ObjectId;
  action: string;
  entity: string;
  entityId?: string;
  oldData?: any;
  newData?: any;
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  ipAddress: string;
  userAgent: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Success' | 'Failed' | 'Partial';
  errorMessage?: string;
  duration?: number; // in milliseconds
  metadata?: {
    affectedUsers?: Types.ObjectId[];
    relatedEntities?: {
      type: string;
      id: string;
    }[];
    context?: any;
  };
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>({
  adminId: {
    type: Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  action: {
    type: String,
    required: true
  },
  entity: {
    type: String,
    required: true
  },
  entityId: {
    type: String,
    default: null
  },
  oldData: {
    type: Schema.Types.Mixed,
    default: null
  },
  newData: {
    type: Schema.Types.Mixed,
    default: null
  },
  changes: [{
    field: {
      type: String,
      required: true
    },
    oldValue: Schema.Types.Mixed,
    newValue: Schema.Types.Mixed
  }],
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    required: true
  },
  severity: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium'
  },
  status: {
    type: String,
    enum: ['Success', 'Failed', 'Partial'],
    default: 'Success'
  },
  errorMessage: {
    type: String,
    default: null
  },
  duration: {
    type: Number,
    default: null
  },
  metadata: {
    affectedUsers: [{
      type: Schema.Types.ObjectId,
      ref: 'User'
    }],
    relatedEntities: [{
      type: String,
      id: String
    }],
    context: Schema.Types.Mixed
  }
}, {
  timestamps: { createdAt: true, updatedAt: false },
  collection: 'audit_logs'
});

AuditLogSchema.index({ adminId: 1 });
AuditLogSchema.index({ action: 1 });
AuditLogSchema.index({ entity: 1 });
AuditLogSchema.index({ severity: 1 });
AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ entityId: 1 });

export const AuditLog = mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);