// hooks/use-audit.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  PaginationParams,
  FilterParams,
  ListResponse 
} from '@/types';
import { toast } from 'sonner';

// Audit log interface
interface AuditLog {
  id: string;
  adminId: string | null;
  adminName: string;
  adminEmail: string | null;
  action: string;
  entity: string;
  entityId?: string;
  oldData?: any;
  newData?: any;
  changes?: Array<{
    field: string;
    oldValue: any;
    newValue: any;
  }>;
  ipAddress: string;
  userAgent: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Success' | 'Failed' | 'Partial';
  errorMessage?: string;
  duration?: number;
  metadata?: any;
  createdAt: Date;
}

// Hook return interface
interface AuditHookReturn {
  auditLogs: AuditLog[];
  totalLogs: number;
  isLoading: boolean;
  error: string | null;
  exportLogs: (filters?: FilterParams) => Promise<void>;
  refreshLogs: () => void;
}

// API Response wrapper
interface ApiResponseWrapper<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
  error?: string;
}

export function useAudit(
  filters?: FilterParams,
  pagination?: PaginationParams
): AuditHookReturn {
  const queryClient = useQueryClient();

  // Query key for caching
  const queryKey = ['audit', 'logs', filters, pagination];

  // Fetch audit logs
  const auditQuery = useQuery({
    queryKey,
    queryFn: async (): Promise<ListResponse<AuditLog>> => {
      const params = new URLSearchParams();
      
      // Add pagination params
      if (pagination) {
        params.append('page', pagination.page.toString());
        params.append('limit', pagination.limit.toString());
        if (pagination.sortBy) params.append('sortBy', pagination.sortBy);
        if (pagination.sortOrder) params.append('sortOrder', pagination.sortOrder);
      } else {
        // Default pagination
        params.append('page', '1');
        params.append('limit', '20');
        params.append('sortBy', 'createdAt');
        params.append('sortOrder', 'desc');
      }
      
      // Add filter params
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            params.append(key, value.toString());
          }
        });
      }

      console.log('🔍 Audit Hook - Fetching with params:', params.toString());

      const response = await fetch(`/api/audit?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to fetch audit logs`);
      }

      const result: ApiResponseWrapper<ListResponse<AuditLog>> = await response.json();
      
      console.log('📋 Audit Hook - API response:', result);
      
      // Handle API wrapper structure
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch audit logs');
      }

      return result.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    meta: {
      errorMessage: 'Failed to load audit logs',
    }
  });

  // Export logs mutation
  const exportMutation = useMutation({
    mutationFn: async (exportFilters?: FilterParams) => {
      const params = new URLSearchParams();
      params.append('export', 'true');
      
      // Add filter params for export
      if (exportFilters) {
        Object.entries(exportFilters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            params.append(key, value.toString());
          }
        });
      }

      const response = await fetch(`/api/audit?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to export audit logs');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to export audit logs');
      }

      // Create and download CSV file
      const csvData = convertToCSV(result.data.data);
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `audit-logs-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
    onSuccess: () => {
      toast.success('Audit logs exported successfully');
    },
    onError: (error: Error) => {
      console.error('Export error:', error);
      toast.error(error.message || 'Failed to export audit logs');
    }
  });

  // Helper function to convert data to CSV
  const convertToCSV = (data: any[]) => {
    if (!data || data.length === 0) return '';

    const headers = [
      'Timestamp',
      'Admin',
      'Action',
      'Entity',
      'Entity ID',
      'Status',
      'Severity',
      'IP Address',
      'Error Message',
      'Duration (ms)'
    ];

    const csvRows = [headers.join(',')];

    data.forEach(row => {
      const values = [
        new Date(row.timestamp).toISOString(),
        `"${row.admin || 'System'}"`,
        `"${row.action || ''}"`,
        `"${row.entity || ''}"`,
        `"${row.entityId || ''}"`,
        `"${row.status || ''}"`,
        `"${row.severity || ''}"`,
        `"${row.ipAddress || ''}"`,
        `"${row.errorMessage || ''}"`,
        row.duration || 0
      ];
      csvRows.push(values.join(','));
    });

    return csvRows.join('\n');
  };

  // Refresh function
  const refreshLogs = () => {
    queryClient.invalidateQueries({ queryKey: ['audit'] });
  };

  return {
    auditLogs: auditQuery.data?.data || [],
    totalLogs: auditQuery.data?.pagination?.total || 0,
    isLoading: auditQuery.isLoading,
    error: auditQuery.error?.message || null,
    exportLogs: exportMutation.mutateAsync,
    refreshLogs,
  };
}