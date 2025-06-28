import { BaseEntity, UserFilter } from './index';

export type NotificationType = 'KYC' | 'Withdrawal' | 'Loan' | 'Task' | 'Referral' | 'System' | 'Marketing';
export type NotificationChannel = 'email' | 'sms' | 'in_app' | 'push';
export type NotificationStatus = 'Pending' | 'Sent' | 'Delivered' | 'Failed' | 'Read';
export type NotificationPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface Notification extends BaseEntity {
  userId?: string;
  adminId?: string;
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  message: string;
  data?: any;
  status: NotificationStatus;
  priority: NotificationPriority;
  scheduledAt?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  failureReason?: string;
  retryCount: number;
  maxRetries: number;
  metadata?: NotificationMetadata;
}

export interface NotificationMetadata {
  emailId?: string;
  smsId?: string;
  templateId?: string;
  variables?: Record<string, any>;
  trackingId?: string;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: NotificationType;
  channel: NotificationChannel;
  subject?: string;
  content: string;
  variables: TemplateVariable[];
  isActive: boolean;
  defaultPriority: NotificationPriority;
}

export interface TemplateVariable {
  name: string;
  description: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  required: boolean;
  defaultValue?: any;
}

export interface NotificationCampaign {
  id: string;
  name: string;
  description: string;
  templateId: string;
  targetAudience: {
    userIds?: string[];
    filters?: UserFilter;
    segments?: string[];
  };
  scheduledAt: Date;
  status: 'Draft' | 'Scheduled' | 'Running' | 'Completed' | 'Cancelled';
  statistics: CampaignStatistics;
}

export interface CampaignStatistics {
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
  clickCount: number;
  unsubscribeCount: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
}

export interface NotificationPreferences {
  userId: string;
  email: boolean;
  sms: boolean;
  push: boolean;
  marketing: boolean;
  updates: boolean;
  security: boolean;
  frequency: 'immediate' | 'daily' | 'weekly' | 'never';
}

export interface NotificationFilter {
  type?: NotificationType;
  channel?: NotificationChannel;
  status?: NotificationStatus;
  priority?: NotificationPriority;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface BulkNotificationRequest {
  templateId: string;
  recipients: {
    userId: string;
    variables?: Record<string, any>;
  }[];
  scheduledAt?: Date;
  priority?: NotificationPriority;
}
