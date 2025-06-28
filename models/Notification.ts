import mongoose, { Document, Schema } from 'mongoose';

export interface INotification extends Document {
  _id: string;
  userId?: string;
  adminId?: string;
  type: 'KYC' | 'Withdrawal' | 'Loan' | 'Task' | 'Referral' | 'System' | 'Marketing';
  channel: 'email' | 'sms' | 'in_app' | 'push';
  title: string;
  message: string;
  data?: any;
  status: 'Pending' | 'Sent' | 'Delivered' | 'Failed' | 'Read';
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  scheduledAt?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  failureReason?: string;
  retryCount: number;
  maxRetries: number;
  metadata?: {
    emailId?: string;
    smsId?: string;
    templateId?: string;
    variables?: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  adminId: {
    type: Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  },
  type: {
    type: String,
    enum: ['KYC', 'Withdrawal', 'Loan', 'Task', 'Referral', 'System', 'Marketing'],
    required: true
  },
  channel: {
    type: String,
    enum: ['email', 'sms', 'in_app', 'push'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  data: {
    type: Schema.Types.Mixed,
    default: null
  },
  status: {
    type: String,
    enum: ['Pending', 'Sent', 'Delivered', 'Failed', 'Read'],
    default: 'Pending'
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Urgent'],
    default: 'Medium'
  },
  scheduledAt: {
    type: Date,
    default: null
  },
  sentAt: {
    type: Date,
    default: null
  },
  deliveredAt: {
    type: Date,
    default: null
  },
  readAt: {
    type: Date,
    default: null
  },
  failureReason: {
    type: String,
    default: null
  },
  retryCount: {
    type: Number,
    default: 0
  },
  maxRetries: {
    type: Number,
    default: 3
  },
  metadata: {
    emailId: String,
    smsId: String,
    templateId: String,
    variables: Schema.Types.Mixed
  }
}, {
  timestamps: true,
  collection: 'notifications'
});

NotificationSchema.index({ userId: 1 });
NotificationSchema.index({ type: 1 });
NotificationSchema.index({ status: 1 });
NotificationSchema.index({ priority: 1 });
NotificationSchema.index({ scheduledAt: 1 });
NotificationSchema.index({ createdAt: -1 });

export const Notification = mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);
