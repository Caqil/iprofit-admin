// utils/api.ts
import { 
  ApiResponse, 
  ListResponse, 
  PaginationParams, 
  FilterParams,
  HttpMethod 
} from '@/types';

// Custom API Error class
export class ApiError extends Error {
  public code: number;
  public details?: any;
  public field?: string;
  public timestamp: Date;

  constructor(message: string, code: number = 0, details?: any, field?: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
    this.field = field;
    this.timestamp = new Date();
  }
}

// Request configuration interface
interface RequestConfig {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, any>;
  timeout?: number;
}

class ApiClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;

  constructor(baseURL: string = '/api') {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  public async request<T>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      headers = {},
      body,
      params,
      timeout = 30000
    } = config;

    let url = `${this.baseURL}${endpoint}`;

    // Add query parameters
    if (params && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, value.toString());
        }
      });
      url += `?${searchParams.toString()}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          ...this.defaultHeaders,
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        throw new ApiError(
          data.message || 'Request failed',
          response.status,
          data.details
        );
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new ApiError('Request timeout', 408);
        }
        throw new ApiError(error.message || 'Network error', 0);
      }
      
      throw new ApiError('Unknown error occurred', 0);
    }
  }

  // HTTP method helpers
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET', params });
  }

  async post<T>(endpoint: string, body?: any, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'POST', body, headers });
  }

  async put<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'PUT', body });
  }

  async patch<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'PATCH', body });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // Paginated requests
  async getList<T>(
    endpoint: string,
    pagination?: PaginationParams,
    filters?: FilterParams
  ): Promise<ListResponse<T>> {
    const params = {
      ...pagination,
      ...filters,
    };
    
    const response = await this.get<T[]>(endpoint, params);
    return response as ListResponse<T>;
  }

  // File upload
  async uploadFile(
    endpoint: string,
    file: File,
    additionalData?: Record<string, any>
  ): Promise<ApiResponse<{ url: string; filename: string }>> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, value.toString());
      });
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      body: formData,
      headers: {
        // Remove Content-Type to let browser set it with boundary for FormData
        'Authorization': this.defaultHeaders['Authorization'],
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(data.message || 'Upload failed', response.status);
    }

    return data;
  }

  // Bulk operations
  async bulkOperation<T>(
    endpoint: string,
    items: any[],
    operation: string
  ): Promise<ApiResponse<{ success: number; failed: number; results: T[] }>> {
    return this.post(endpoint, { items, operation });
  }

  // Set authorization header
  setAuthToken(token: string): void {
    this.defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  // Remove authorization header
  clearAuthToken(): void {
    delete this.defaultHeaders['Authorization'];
  }

  // Get current headers
  getHeaders(): Record<string, string> {
    return { ...this.defaultHeaders };
  }

  // Update base URL
  setBaseURL(url: string): void {
    this.baseURL = url;
  }

  // Add default header
  setDefaultHeader(key: string, value: string): void {
    this.defaultHeaders[key] = value;
  }

  // Remove default header
  removeDefaultHeader(key: string): void {
    delete this.defaultHeaders[key];
  }
}

// Create singleton instance
export const apiClient = new ApiClient();

// Authentication API
export const authAPI = {
  login: (credentials: { email: string; password: string; twoFactorToken?: string; rememberMe?: boolean }) => 
    apiClient.post('/auth/login', credentials),
    
  logout: () => 
    apiClient.post('/auth/logout'),
    
  refresh: () => 
    apiClient.post('/auth/refresh'),
    
  setup2FA: () => 
    apiClient.post('/auth/2fa/setup'),
    
  verify2FA: (token: string) => 
    apiClient.post('/auth/2fa/verify', { token }),
    
  resetPassword: (data: { email: string; token?: string; newPassword?: string; confirmPassword?: string }) => 
    apiClient.post('/auth/reset-password', data),
    
  checkSession: () => 
    apiClient.get('/auth/session'),
};

// Users API
export const usersAPI = {
  getAll: (pagination?: PaginationParams, filters?: FilterParams) =>
    apiClient.getList('/users', pagination, filters),
    
  getById: (id: string) => 
    apiClient.get(`/users/${id}`),
    
  create: (data: {
    name: string;
    email: string;
    phone: string;
    planId: string;
    deviceId: string;
    referralCode?: string;
  }) => 
    apiClient.post('/users', data),
    
  update: (id: string, data: {
    name?: string;
    email?: string;
    phone?: string;
    status?: string;
    planId?: string;
    address?: any;
    dateOfBirth?: Date;
  }) => 
    apiClient.put(`/users/${id}`, data),
    
  delete: (id: string) => 
    apiClient.delete(`/users/${id}`),
    
  approveKYC: (id: string, data: { action: 'approve' | 'reject'; rejectionReason?: string }) => 
    apiClient.post(`/users/${id}/kyc`, data),
    
  getProfile: (id: string) => 
    apiClient.get(`/users/${id}/profile`),
    
  getTransactions: (id: string, pagination?: PaginationParams) => 
    apiClient.get(`/users/${id}/transactions`, pagination),
    
  bulkAction: (data: {
    userIds: string[];
    action: 'activate' | 'suspend' | 'ban' | 'approve_kyc' | 'reject_kyc' | 'upgrade_plan';
    metadata?: any;
  }) => 
    apiClient.post('/users/bulk-actions', data),
    
  exportData: (filters?: FilterParams) => 
    apiClient.get('/users/export', filters),
};

// Transactions API
export const transactionsAPI = {
  getAll: (pagination?: PaginationParams, filters?: FilterParams) =>
    apiClient.getList('/transactions', pagination, filters),
    
  getById: (id: string) => 
    apiClient.get(`/transactions/${id}`),
    
  approve: (data: {
    transactionId: string;
    action: 'approve' | 'reject';
    reason?: string;
    adminNotes?: string;
  }) => 
    apiClient.post('/transactions/approve', data),
    
  getSummary: (filters?: FilterParams) => 
    apiClient.get('/transactions/summary', filters),
    
  createDeposit: (data: {
    userId: string;
    amount: number;
    currency: 'USD' | 'BDT';
    gateway: 'CoinGate' | 'UddoktaPay' | 'Manual';
    gatewayData?: any;
  }) => 
    apiClient.post('/transactions/deposits', data),
    
  createWithdrawal: (data: {
    userId: string;
    amount: number;
    currency: 'USD' | 'BDT';
    withdrawalMethod: string;
    accountDetails: {
      accountNumber?: string;
      routingNumber?: string;
      bankName?: string;
      walletAddress?: string;
    };
  }) => 
    apiClient.post('/transactions/withdrawals', data),
    
  getGateways: () => 
    apiClient.get('/transactions/gateways'),
};

// Loans API
export const loansAPI = {
  getAll: (pagination?: PaginationParams, filters?: FilterParams) =>
    apiClient.getList('/loans', pagination, filters),
    
  getById: (id: string) => 
    apiClient.get(`/loans/${id}`),
    
  create: (data: {
    userId: string;
    amount: number;
    purpose: string;
    tenure: number;
    monthlyIncome: number;
    employmentStatus: string;
    employmentDetails: any;
    personalDetails: any;
    financialDetails: any;
  }) => 
    apiClient.post('/loans', data),
    
  approve: (id: string, data: {
    action: 'approve' | 'reject';
    rejectionReason?: string;
    interestRate?: number;
    conditions?: string;
  }) => 
    apiClient.post(`/loans/${id}/approve`, data),
    
  calculateEMI: (data: {
    loanAmount: number;
    interestRate: number;
    tenure: number;
  }) => 
    apiClient.post('/loans/emi-calculator', data),
    
  getAnalytics: () => 
    apiClient.get('/loans/analytics'),
    
  getRepaymentSchedule: (id: string) => 
    apiClient.get(`/loans/${id}/repayment-schedule`),
    
  recordPayment: (id: string, data: {
    amount: number;
    paymentMethod: string;
    transactionId?: string;
  }) => 
    apiClient.post(`/loans/${id}/payment`, data),
};

// Plans API
export const plansAPI = {
  getAll: () => 
    apiClient.get('/plans'),
    
  getById: (id: string) => 
    apiClient.get(`/plans/${id}`),
    
  create: (data: {
    name: string;
    description: string;
    price: number;
    currency: 'USD' | 'BDT';
    depositLimit: number;
    withdrawalLimit: number;
    profitLimit: number;
    minimumDeposit: number;
    minimumWithdrawal: number;
    dailyWithdrawalLimit: number;
    monthlyWithdrawalLimit: number;
    features: string[];
    color?: string;
    priority?: number;
  }) => 
    apiClient.post('/plans', data),
    
  update: (id: string, data: any) => 
    apiClient.put(`/plans/${id}`, data),
    
  delete: (id: string) => 
    apiClient.delete(`/plans/${id}`),
    
  getUsage: (id: string) => 
    apiClient.get(`/plans/${id}/usage`),
};

// Tasks API
export const tasksAPI = {
  getAll: (pagination?: PaginationParams, filters?: FilterParams) =>
    apiClient.getList('/tasks', pagination, filters),
    
  getById: (id: string) => 
    apiClient.get(`/tasks/${id}`),
    
  create: (data: {
    name: string;
    description: string;
    criteria: string;
    reward: number;
    currency: 'USD' | 'BDT';
    category: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    estimatedTime: number;
    instructions: string[];
    requiredProof: string[];
    validFrom: Date;
    validUntil?: Date;
    maxCompletions?: number;
    isRepeatable?: boolean;
    cooldownPeriod?: number;
  }) => 
    apiClient.post('/tasks', data),
    
  update: (id: string, data: any) => 
    apiClient.put(`/tasks/${id}`, data),
    
  delete: (id: string) => 
    apiClient.delete(`/tasks/${id}`),
    
  getSubmissions: (id: string, pagination?: PaginationParams) => 
    apiClient.get(`/tasks/${id}/submissions`, pagination),
    
  approveSubmission: (taskId: string, submissionId: string, data: {
    action: 'approve' | 'reject';
    reviewNote?: string;
  }) => 
    apiClient.post(`/tasks/${taskId}/submissions/${submissionId}/review`, data),
    
  getCategories: () => 
    apiClient.get('/tasks/categories'),
};

// Referrals API
export const referralsAPI = {
  getAll: (pagination?: PaginationParams, filters?: FilterParams) =>
    apiClient.getList('/referrals', pagination, filters),
    
  getOverview: () => 
    apiClient.get('/referrals/overview'),
    
  approve: (id: string, data: { action: 'approve' | 'reject'; reason?: string }) => 
    apiClient.post(`/referrals/${id}/approve`, data),
    
  getTopReferrers: (limit: number = 10) => 
    apiClient.get('/referrals/top-referrers', { limit }),
    
  getCommissionSettings: () => 
    apiClient.get('/referrals/commission'),
    
  updateCommissionSettings: (data: {
    signupBonus: number;
    profitSharePercentage: number;
    maxProfitShare?: number;
  }) => 
    apiClient.put('/referrals/commission', data),
};

// Notifications API
export const notificationsAPI = {
  getAll: (pagination?: PaginationParams, filters?: FilterParams) =>
    apiClient.getList('/notifications', pagination, filters),
    
  getById: (id: string) => 
    apiClient.get(`/notifications/${id}`),
    
  send: (data: {
    templateId: string;
    recipients: Array<{
      userId: string;
      variables?: Record<string, any>;
    }>;
    scheduledAt?: Date;
    priority?: 'Low' | 'Medium' | 'High' | 'Urgent';
  }) => 
    apiClient.post('/notifications/send', data),
    
  markAsRead: (id: string) => 
    apiClient.patch(`/notifications/${id}/read`),
    
  delete: (id: string) => 
    apiClient.delete(`/notifications/${id}`),
    
  getTemplates: () => 
    apiClient.get('/notifications/templates'),
    
  createTemplate: (data: {
    name: string;
    type: string;
    channel: string;
    subject?: string;
    content: string;
    variables: Array<{
      name: string;
      description: string;
      type: string;
      required: boolean;
    }>;
  }) => 
    apiClient.post('/notifications/templates', data),
    
  updateTemplate: (id: string, data: any) => 
    apiClient.put(`/notifications/templates/${id}`, data),
    
  deleteTemplate: (id: string) => 
    apiClient.delete(`/notifications/templates/${id}`),
    
  getStats: () => 
    apiClient.get('/notifications/stats'),
};

// News API
export const newsAPI = {
  getAll: (pagination?: PaginationParams, filters?: FilterParams) =>
    apiClient.getList('/news', pagination, filters),
    
  getById: (id: string) => 
    apiClient.get(`/news/${id}`),
    
  create: (data: {
    title: string;
    content: string;
    excerpt?: string;
    category: string;
    tags: string[];
    featuredImage?: string;
    status: 'Draft' | 'Published' | 'Archived';
    isSticky?: boolean;
    publishedAt?: Date;
  }) => 
    apiClient.post('/news', data),
    
  update: (id: string, data: any) => 
    apiClient.put(`/news/${id}`, data),
    
  delete: (id: string) => 
    apiClient.delete(`/news/${id}`),
    
  getCategories: () => 
    apiClient.get('/news/categories'),
    
  getAnalytics: () => 
    apiClient.get('/news/analytics'),
};

// Support API
export const supportAPI = {
  getTickets: (pagination?: PaginationParams, filters?: FilterParams) =>
    apiClient.getList('/support/tickets', pagination, filters),
    
  getTicketById: (id: string) => 
    apiClient.get(`/support/tickets/${id}`),
    
  createTicket: (data: {
    userId: string;
    subject: string;
    message: string;
    category: string;
    priority?: 'Low' | 'Medium' | 'High' | 'Urgent';
    attachments?: Array<{
      filename: string;
      url: string;
      mimeType: string;
      size: number;
    }>;
  }) => 
    apiClient.post('/support/tickets', data),
    
  respondToTicket: (id: string, data: {
    message: string;
    isAdminResponse: boolean;
    attachments?: any[];
  }) => 
    apiClient.post(`/support/tickets/${id}/responses`, data),
    
  updateTicketStatus: (id: string, status: string) => 
    apiClient.patch(`/support/tickets/${id}/status`, { status }),
    
  assignTicket: (id: string, adminId: string) => 
    apiClient.patch(`/support/tickets/${id}/assign`, { adminId }),
    
  getFAQs: () => 
    apiClient.get('/support/faq'),
    
  createFAQ: (data: {
    question: string;
    answer: string;
    category: string;
    tags: string[];
    priority?: number;
  }) => 
    apiClient.post('/support/faq', data),
    
  updateFAQ: (id: string, data: any) => 
    apiClient.put(`/support/faq/${id}`, data),
    
  deleteFAQ: (id: string) => 
    apiClient.delete(`/support/faq/${id}`),
    
  getAnalytics: () => 
    apiClient.get('/support/analytics'),
};

// Dashboard API
export const dashboardAPI = {
  getMetrics: (filters?: FilterParams) => 
    apiClient.get('/dashboard/metrics', filters),
    
  getCharts: (filters?: FilterParams) => 
    apiClient.get('/dashboard/charts', filters),
    
  getAlerts: () => 
    apiClient.get('/dashboard/alerts'),
    
  markAlertAsRead: (id: string) => 
    apiClient.patch(`/dashboard/alerts/${id}/read`),
    
  getSystemStatus: () => 
    apiClient.get('/dashboard/status'),
    
  getRecentActivity: (limit: number = 10) => 
    apiClient.get('/dashboard/activity', { limit }),
};

// Audit API
export const auditAPI = {
  getLogs: (pagination?: PaginationParams, filters?: FilterParams) =>
    apiClient.getList('/audit', pagination, filters),
    
  getLogById: (id: string) => 
    apiClient.get(`/audit/${id}`),
    
  exportLogs: (filters?: FilterParams) => 
    apiClient.get('/audit/export', filters),
};

// Error handling utility
export function handleApiError(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unexpected error occurred';
}

// Retry utility with exponential backoff
export async function retryRequest<T>(
  requestFn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Exponential backoff with jitter
      const backoffDelay = delay * Math.pow(2, attempt - 1);
      const jitter = Math.random() * 0.1 * backoffDelay;
      await new Promise(resolve => setTimeout(resolve, backoffDelay + jitter));
    }
  }
  
  throw lastError!;
}

// Request interceptor for automatic token refresh
export function setupTokenInterceptor() {
  const originalRequest = apiClient.request.bind(apiClient);
  
  // @ts-ignore - Overriding private method for interceptor
  apiClient.request = async function<T>(endpoint: string, config: RequestConfig = {}) {
    try {
      return await originalRequest<T>(endpoint, config);
    } catch (error) {
      if (error instanceof ApiError && error.code === 401) {
        // Try to refresh token
        try {
          await authAPI.refresh();
          // Retry original request
          return await originalRequest<T>(endpoint, config);
        } catch (refreshError) {
          // Redirect to login if refresh fails
          window.location.href = '/login';
          throw error;
        }
      }
      throw error;
    }
  };
}

// Initialize token interceptor
if (typeof window !== 'undefined') {
  setupTokenInterceptor();
}
