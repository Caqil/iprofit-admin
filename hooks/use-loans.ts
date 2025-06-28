import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Loan, 
  LoanApplication, 
  LoanFilter, 
  LoanAnalytics, 
  EMICalculation,
  PaginationParams,
  ListResponse, 
  LoanApprovalRequest
} from '@/types';
import { toast } from 'sonner';

interface LoansHookReturn {
  loans: Loan[];
  totalLoans: number;
  analytics: LoanAnalytics | undefined;
  isLoading: boolean;
  error: string | null;
  approveLoan: (data: LoanApprovalRequest) => Promise<void>;
  rejectLoan: (loanId: string, reason: string) => Promise<void>;
  calculateEMI: (data: { loanAmount: number; interestRate: number; tenure: number }) => Promise<EMICalculation>;
  refreshLoans: () => void;
}

export function useLoans(
  filters?: LoanFilter,
  pagination?: PaginationParams
): LoansHookReturn {
  const queryClient = useQueryClient();

  // Loans list query
  const loansQuery = useQuery({
    queryKey: ['loans', filters, pagination],
    queryFn: async (): Promise<ListResponse<Loan>> => {
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

      const response = await fetch(`/api/loans?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch loans');
      }

      return response.json();
    },
    staleTime: 2 * 60 * 1000 // 2 minutes
  });

  // Loan analytics query
  const analyticsQuery = useQuery({
    queryKey: ['loans', 'analytics'],
    queryFn: async (): Promise<LoanAnalytics> => {
      const response = await fetch('/api/loans/analytics');
      if (!response.ok) {
        throw new Error('Failed to fetch loan analytics');
      }

      const data = await response.json();
      return data.data;
    },
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  // Approve loan mutation
  const approveLoanMutation = useMutation({
    mutationFn: async (data: LoanApprovalRequest) => {
      const response = await fetch(`/api/loans/${data.loanId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          interestRate: data.interestRate,
          conditions: data.conditions
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to approve loan');
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success('Loan approved successfully');
      queryClient.invalidateQueries({ queryKey: ['loans'] });
    },
    onError: (error) => {
      toast.error(`Failed to approve loan: ${error.message}`);
    }
  });

  // Reject loan mutation
  const rejectLoanMutation = useMutation({
    mutationFn: async ({ loanId, reason }: { loanId: string; reason: string }) => {
      const response = await fetch(`/api/loans/${loanId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          rejectionReason: reason
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to reject loan');
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success('Loan rejected successfully');
      queryClient.invalidateQueries({ queryKey: ['loans'] });
    },
    onError: (error) => {
      toast.error(`Failed to reject loan: ${error.message}`);
    }
  });

  // EMI calculation mutation
  const emiCalculationMutation = useMutation({
    mutationFn: async (data: { loanAmount: number; interestRate: number; tenure: number }): Promise<EMICalculation> => {
      const response = await fetch('/api/loans/emi-calculator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to calculate EMI');
      }

      const result = await response.json();
      return result.data;
    }
  });

  return {
    loans: loansQuery.data?.data || [],
    totalLoans: loansQuery.data?.pagination.total || 0,
    analytics: analyticsQuery.data,
    isLoading: loansQuery.isLoading || analyticsQuery.isLoading,
    error: loansQuery.error?.message || analyticsQuery.error?.message || null,
    approveLoan: approveLoanMutation.mutateAsync,
    rejectLoan: (loanId: string, reason: string) => 
      rejectLoanMutation.mutateAsync({ loanId, reason }),
    calculateEMI: emiCalculationMutation.mutateAsync,
    refreshLoans: () => queryClient.invalidateQueries({ queryKey: ['loans'] })
  };
}