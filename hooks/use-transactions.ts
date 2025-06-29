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

export function useTransactions(
  filters?: TransactionFilter,
  pagination?: PaginationParams
): TransactionsHookReturn {
  const queryClient = useQueryClient();

  // Transactions list query
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
        throw new Error('Failed to fetch transactions');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch transactions');
      }

      return result.data;
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: true
  });

  // Transaction summary query
  const summaryQuery = useQuery({
    queryKey: ['transactions', 'summary', filters],
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
        throw new Error('Failed to fetch transaction summary');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch summary');
      }

      return result.data;
    },
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 60 * 1000 // Auto-refresh every minute
  });

  // Transaction approval mutation
  const approveTransactionMutation = useMutation({
    mutationFn: async (data: TransactionApproval) => {
      const response = await fetch('/api/transactions/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to process transaction');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      const action = variables.action === 'approve' ? 'approved' : 
                   variables.action === 'reject' ? 'rejected' : 'cancelled';
      toast.success(`Transaction ${action} successfully`);
      
      // Invalidate and refetch related queries
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to process transaction');
    }
  });

  // Bulk action mutation
  const bulkActionMutation = useMutation({
    mutationFn: async (data: BulkTransactionAction) => {
      const response = await fetch('/api/transactions/bulk-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to perform bulk action');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      toast.success(`Bulk action completed: ${variables.action} for ${variables.transactionIds.length} transactions`);
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to perform bulk action');
    }
  });

  // Flag transaction mutation
  const flagTransactionMutation = useMutation({
    mutationFn: async ({ transactionId, reason }: { transactionId: string; reason: string }) => {
      const response = await fetch(`/api/transactions/${transactionId}/flag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to flag transaction');
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success('Transaction flagged successfully');
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to flag transaction');
    }
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
    totalTransactions: transactionsQuery.data?.total || 0,
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
