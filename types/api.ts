import { PaginationParams, SortParams } from ".";

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  code?: number;
  timestamp: Date;
}

export interface ApiError {
  message: string;
  code: number;
  details?: any;
  field?: string;
  timestamp: Date;
}

export interface ListResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
}

export interface BulkOperationResult<T = any> {
  success: number;
  failed: number;
  total: number;
  errors: {
    index: number;
    item: T;
    error: string;
  }[];
  results: T[];
}

export interface FileUploadResponse {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedAt: Date;
}

export interface SearchParams {
  query: string;
  filters?: Record<string, any>;
  sort?: SortParams;
  pagination?: PaginationParams;
}

export interface ExportParams {
  format: 'csv' | 'xlsx' | 'pdf';
  filters?: Record<string, any>;
  fields?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
  retryAfter?: number;
}

export interface WebhookPayload {
  event: string;
  data: any;
  timestamp: Date;
  signature: string;
  version: string;
}

export interface OAuthTokenResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

export interface DeviceCheckResult {
  isValid: boolean;
  deviceId: string;
  fingerprint: string;
  riskScore: number;
  isEmulator: boolean;
  isVirtualDevice: boolean;
  metadata: {
    userAgent: string;
    screen: string;
    timezone: string;
    language: string;
  };
}

export interface EmailTemplateData {
  to: string;
  subject: string;
  templateId: string;
  variables: Record<string, any>;
  attachments?: {
    filename: string;
    content: string;
    contentType: string;
  }[];
}

export interface SMSData {
  to: string;
  message: string;
  templateId?: string;
  variables?: Record<string, any>;
}

export interface PushNotificationData {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  badge?: number;
  sound?: string;
}

// API endpoint types
export type ApiEndpoint = 
  | '/api/auth/login'
  | '/api/auth/logout'
  | '/api/auth/refresh'
  | '/api/users'
  | '/api/users/[id]'
  | '/api/users/[id]/kyc'
  | '/api/transactions'
  | '/api/transactions/approve'
  | '/api/referrals'
  | '/api/plans'
  | '/api/loans'
  | '/api/loans/emi-calculator'
  | '/api/tasks'
  | '/api/notifications'
  | '/api/news'
  | '/api/support/tickets'
  | '/api/dashboard/metrics'
  | '/api/audit';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestConfig {
  method: HttpMethod;
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, any>;
  timeout?: number;
}

export interface ResponseInterceptor {
  onSuccess?: (response: any) => any;
  onError?: (error: ApiError) => any;
}

export interface RequestInterceptor {
  onRequest?: (config: RequestConfig) => RequestConfig;
  onError?: (error: any) => any;
}