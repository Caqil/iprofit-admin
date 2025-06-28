import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Transaction, 
  TransactionFilter, 
  TransactionSummary, 
  TransactionApproval,
  WithdrawalRequest,
  PaginationParams,
  ListResponse 
} from '@/types';
import { toast } from 'sonner';

interface TransactionsHookReturn {
  transactions: Transaction[];
  totalTransactions: number;
  summary: TransactionSummary | undefined;
  isLoading: boolean;
  error: string | null;
  approveTransaction: (data: TransactionApproval) => Promise<void>;
  createWithdrawal: (data: WithdrawalRequest) => Promise<void>;
  refreshTransactions: () => void;
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
          if (value !== undefined && value !== null) {
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

      const response = await fetch(`/api/transactions?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }

      return response.json();
    },
    staleTime: 60 * 1000 // 1 minute
  });

  // Transaction summary query
  const summaryQuery = useQuery({
    queryKey: ['transactions', 'summary', filters],
    queryFn: async (): Promise<TransactionSummary> => {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, value.toString());
          }
        });
      }

      const response = await fetch(`/api/transactions/summary?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch transaction summary');
      }

      const data = await response.json();
      return data.data;
    },
    staleTime: 2 * 60 * 1000 // 2 minutes
  });

  // Approve/reject transaction mutation
  const approveTransactionMutation = useMutation({
    mutationFn: async (data: TransactionApproval) => {
      const response = await fetch('/api/transactions/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to process transaction');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      const action = variables.action === 'approve' ? 'approved' : 'rejected';
      toast.success(`Transaction ${action} successfully`);
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
    onError: (error) => {
      toast.error(`Failed to process transaction: ${error.message}`);
    }
  });

  // Create withdrawal mutation
  const createWithdrawalMutation = useMutation({
    mutationFn: async (data: WithdrawalRequest) => {
      const response = await fetch('/api/transactions/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create withdrawal');
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success('Withdrawal request created successfully');
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
    onError: (error) => {
      toast.error(`Failed to create withdrawal: ${error.message}`);
    }
  });

  return {
    transactions: transactionsQuery.data?.data || [],
    totalTransactions: transactionsQuery.data?.pagination.total || 0,
    summary: summaryQuery.data,
    isLoading: transactionsQuery.isLoading || summaryQuery.isLoading,
    error: transactionsQuery.error?.message || summaryQuery.error?.message || null,
    approveTransaction: approveTransactionMutation.mutateAsync,
    createWithdrawal: createWithdrawalMutation.mutateAsync,
    refreshTransactions: () => queryClient.invalidateQueries({ queryKey: ['transactions'] })
  };
}