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

  // Helper function to determine transaction type endpoint
  const getEndpointForType = (transactionType: 'deposit' | 'withdrawal'): string => {
    if (transactionType === 'deposit') {
      return '/api/transactions/deposits/approve';
    } else if (transactionType === 'withdrawal') {
      return '/api/transactions/withdrawals/approve';
    }
    throw new Error('Invalid transaction type');
  };

  // Helper function to get transaction type from ID
  const getTransactionType = async (transactionId: string): Promise<'deposit' | 'withdrawal'> => {
    // First, try to find it in current transactions data
    const currentTransactions = transactionsQuery.data?.data || [];
    const transaction = currentTransactions.find(t => t._id === transactionId);
    
    if (transaction) {
      return transaction.type as 'deposit' | 'withdrawal';
    }

    // If not found in current data, fetch from API
    try {
      const response = await fetch(`/api/transactions/${transactionId}`, {
        credentials: 'include'
      });
      const result = await response.json();
      
      if (result.success && result.data) {
        return result.data.type as 'deposit' | 'withdrawal';
      }
      
      throw new Error('Transaction not found');
    } catch (error) {
      console.error('Failed to fetch transaction type:', error);
      throw new Error('Unable to determine transaction type');
    }
  };

  // Approve transaction mutation with smart type detection
  const approveTransactionMutation = useMutation({
    mutationFn: async (data: TransactionApproval): Promise<void> => {
      // Try to get transaction type from current data first
      const currentTransactions = transactionsQuery.data?.data || [];
      const transaction = currentTransactions.find(t => t._id === data.transactionId);
      
      let transactionType: 'deposit' | 'withdrawal';
      
      if (transaction) {
        transactionType = transaction.type as 'deposit' | 'withdrawal';
      } else {
        // Fallback: determine type from current filter or fetch from API
        if (filters?.type && (filters.type === 'deposit' || filters.type === 'withdrawal')) {
          transactionType = filters.type;
        } else {
          transactionType = await getTransactionType(data.transactionId);
        }
      }

      const endpoint = getEndpointForType(transactionType);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          transactionId: data.transactionId,
          action: data.action,
          reason: data.reason,
          adminNotes: data.adminNotes,
          notifyUser: data.notifyUser
        }),
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

  // Bulk action mutation with smart type detection
  const bulkActionMutation = useMutation({
    mutationFn: async (data: BulkTransactionAction): Promise<void> => {
      const currentTransactions = transactionsQuery.data?.data || [];
      
      // Group transaction IDs by type
      const groupedTransactions: Record<'deposit' | 'withdrawal', string[]> = {
        deposit: [],
        withdrawal: []
      };

      // Categorize transactions by type
      for (const transactionId of data.transactionIds) {
        const transaction = currentTransactions.find(t => t._id === transactionId);
        
        if (transaction) {
          const type = transaction.type as 'deposit' | 'withdrawal';
          if (type === 'deposit' || type === 'withdrawal') {
            groupedTransactions[type].push(transactionId);
          }
        } else {
          // If we can't determine type from current data, use filter context
          if (filters?.type && (filters.type === 'deposit' || filters.type === 'withdrawal')) {
            groupedTransactions[filters.type].push(transactionId);
          } else {
            throw new Error(`Unable to determine transaction type for ID: ${transactionId}`);
          }
        }
      }

      // Execute bulk actions for each type
      const promises: Promise<Response>[] = [];

      if (groupedTransactions.deposit.length > 0) {
        promises.push(
          fetch('/api/transactions/deposits/approve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              transactionIds: groupedTransactions.deposit,
              action: data.action,
              reason: data.reason,
              adminNotes: data.adminNotes
            }),
          })
        );
      }

      if (groupedTransactions.withdrawal.length > 0) {
        promises.push(
          fetch('/api/transactions/withdrawals/approve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              transactionIds: groupedTransactions.withdrawal,
              action: data.action,
              reason: data.reason,
              adminNotes: data.adminNotes
            }),
          })
        );
      }

      if (promises.length === 0) {
        throw new Error('No valid transactions found for bulk action');
      }

      // Execute all requests
      const responses = await Promise.all(promises);

      // Check all responses
      for (const response of responses) {
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to perform bulk action');
        }

        const result = await response.json();
        if (!result.success) {
          throw new Error(result.message || 'Failed to perform bulk action');
        }
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
  const exportTransactions = async (format: 'csv' | 'xlsx'): Promise<void> => {
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

      // Handle file download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Transactions exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export transactions');
    }
  };

  // Refresh function
  const refreshTransactions = () => {
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['transactions-summary'] });
  };

  // Create wrapper functions that return promises
  const approveTransactionWrapper = async (data: TransactionApproval): Promise<void> => {
    return new Promise((resolve, reject) => {
      approveTransactionMutation.mutate(data, {
        onSuccess: () => resolve(),
        onError: (error) => reject(error)
      });
    });
  };

  const bulkActionWrapper = async (data: BulkTransactionAction): Promise<void> => {
    return new Promise((resolve, reject) => {
      bulkActionMutation.mutate(data, {
        onSuccess: () => resolve(),
        onError: (error) => reject(error)
      });
    });
  };

  const flagTransactionWrapper = async (transactionId: string, reason: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      flagTransactionMutation.mutate({ transactionId, reason }, {
        onSuccess: () => resolve(),
        onError: (error) => reject(error)
      });
    });
  };

  return {
    transactions: transactionsQuery.data?.data || [],
    totalTransactions: transactionsQuery.data?.pagination?.total || 0,
    summary: summaryQuery.data,
    isLoading: transactionsQuery.isLoading,
    isSummaryLoading: summaryQuery.isLoading,
    error: transactionsQuery.error?.message || summaryQuery.error?.message || null,
    approveTransaction: approveTransactionWrapper,
    bulkAction: bulkActionWrapper,
    flagTransaction: flagTransactionWrapper,
    refreshTransactions,
    exportTransactions,
  };
}