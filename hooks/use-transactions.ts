import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Transaction, 
  TransactionFilter, 
  TransactionSummary, 
  TransactionApproval,
  BulkTransactionAction,
  PaginationParams,
  ListResponse 
} from '@/types';
import { toast } from 'sonner';

interface TransactionsHookReturn {
  transactions: Transaction[];
  totalTransactions: number;
  summary: TransactionSummary | undefined;
  isLoading: boolean;
  isSummaryLoading: boolean;
  error: string | null;
  approveTransaction: (data: TransactionApproval) => Promise<void>;
  bulkAction: (data: BulkTransactionAction) => Promise<void>;
  flagTransaction: (transactionId: string, reason: string) => Promise<void>;
  refreshTransactions: () => void;
  exportTransactions: (format: 'csv' | 'xlsx') => Promise<void>;
}

// API Response wrapper type to match actual response structure
interface ApiResponseWrapper<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

export function useTransactions(
  filters?: TransactionFilter,
  pagination?: PaginationParams
): TransactionsHookReturn {
  const queryClient = useQueryClient();

  // Transactions query with proper response type handling
  const transactionsQuery = useQuery({
    queryKey: ['transactions', filters, pagination],
    queryFn: async (): Promise<ListResponse<Transaction>> => {
      const params = new URLSearchParams();
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            params.append(key, value.toString());
          }
        });
      }
      
      if (pagination) {
        params.append('page', pagination.page.toString());
        params.append('limit', pagination.limit.toString());
        if (pagination.sortBy) params.append('sortBy', pagination.sortBy);
        if (pagination.sortOrder) params.append('sortOrder', pagination.sortOrder);
      }

      const response = await fetch(`/api/transactions?${params}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to fetch transactions`);
      }

      const result: ApiResponseWrapper<ListResponse<Transaction>> = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch transactions');
      }

      return result.data; // This contains { data: Transaction[], pagination: {...} }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Transaction summary query
  const summaryQuery = useQuery({
    queryKey: ['transactions-summary', filters],
    queryFn: async (): Promise<TransactionSummary> => {
      const params = new URLSearchParams();
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            params.append(key, value.toString());
          }
        });
      }

      const response = await fetch(`/api/transactions/summary?${params}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch transaction summary');
      }

      const result: ApiResponseWrapper<TransactionSummary> = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch transaction summary');
      }

      return result.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Approve transaction mutation
  const approveTransactionMutation = useMutation({
    mutationFn: async (data: TransactionApproval): Promise<void> => {
      const response = await fetch('/api/transactions/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to approve transaction');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Failed to approve transaction');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transactions-summary'] });
      toast.success('Transaction updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update transaction');
    },
  });

  // Bulk action mutation
  const bulkActionMutation = useMutation({
    mutationFn: async (data: BulkTransactionAction): Promise<void> => {
      const response = await fetch('/api/transactions/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to perform bulk action');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Failed to perform bulk action');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transactions-summary'] });
      toast.success('Bulk action completed successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to perform bulk action');
    },
  });

  // Flag transaction mutation
  const flagTransactionMutation = useMutation({
    mutationFn: async ({ transactionId, reason }: { transactionId: string; reason: string }): Promise<void> => {
      const response = await fetch(`/api/transactions/${transactionId}/flag`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to flag transaction');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Failed to flag transaction');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Transaction flagged successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to flag transaction');
    },
  });

  // Export transactions function
  const exportTransactions = async (format: 'csv' | 'xlsx') => {
    try {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            params.append(key, value.toString());
          }
        });
      }
      params.append('format', format);

      const response = await fetch(`/api/transactions/export?${params}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to export transactions');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`Transactions exported as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to export transactions');
    }
  };

  return {
    transactions: transactionsQuery.data?.data || [],
    // FIXED: Access total from pagination object instead of directly from response
    totalTransactions: transactionsQuery.data?.pagination?.total || 0,
    summary: summaryQuery.data,
    isLoading: transactionsQuery.isLoading,
    isSummaryLoading: summaryQuery.isLoading,
    error: transactionsQuery.error?.message || summaryQuery.error?.message || null,
    approveTransaction: approveTransactionMutation.mutateAsync,
    bulkAction: bulkActionMutation.mutateAsync,
    flagTransaction: (transactionId: string, reason: string) => 
      flagTransactionMutation.mutateAsync({ transactionId, reason }),
    refreshTransactions: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
    exportTransactions
  };
}