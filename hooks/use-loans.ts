import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Loan, 
  LoanApplication, 
  LoanFilter, 
  LoanAnalytics, 
  EMICalculation,
  PaginationParams,
  ListResponse, 
  LoanApprovalRequest,
  RepaymentSchedule
} from '@/types';
import { toast } from 'sonner';

interface ApiResponseWrapper<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

interface LoansHookReturn {
  loans: Loan[];
  totalLoans: number;
  analytics: LoanAnalytics | undefined;
  isLoading: boolean;
  error: string | null;
  createLoan: (data: LoanApplication) => Promise<Loan>;
  updateLoan: (loanId: string, data: Partial<Loan>) => Promise<Loan>;
  deleteLoan: (loanId: string) => Promise<void>;
  approveLoan: (data: LoanApprovalRequest) => Promise<void>;
  rejectLoan: (loanId: string, reason: string) => Promise<void>;
  calculateEMI: (data: { loanAmount: number; interestRate: number; tenure: number }) => Promise<EMICalculation>;
  recordRepayment: (loanId: string, data: any) => Promise<void>;
  refreshLoans: () => void;
}

export function useLoans(
  filters?: LoanFilter,
  pagination?: PaginationParams,
  analyticsPeriod: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'all_time' = 'month'
): LoansHookReturn {
  const queryClient = useQueryClient();

  // Loans list query
  const loansQuery = useQuery({
    queryKey: ['loans', filters, pagination],
    queryFn: async (): Promise<ListResponse<Loan>> => {
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

      const response = await fetch(`/api/loans?${params}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to fetch loans`);
      }

      const result: ApiResponseWrapper<ListResponse<Loan>> = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch loans');
      }

      return result.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
  });

  // Loan analytics query - NOW WITH REQUIRED PERIOD PARAMETER
  const analyticsQuery = useQuery({
    queryKey: ['loans', 'analytics', analyticsPeriod],
    queryFn: async (): Promise<LoanAnalytics> => {
      // Add the required period parameter
      const params = new URLSearchParams({
        period: analyticsPeriod
      });

      const response = await fetch(`/api/loans/analytics?${params}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch loan analytics');
      }

      const result: ApiResponseWrapper<LoanAnalytics> = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch analytics');
      }

      return result.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2
  });

  // Create loan mutation
  const createLoanMutation = useMutation({
    mutationFn: async (data: LoanApplication): Promise<Loan> => {
      const response = await fetch('/api/loans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create loan');
      }

      const result: ApiResponseWrapper<Loan> = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to create loan');
      }

      return result.data;
    },
    onSuccess: () => {
      toast.success('Loan application created successfully');
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['loans', 'analytics'] });
    },
    onError: (error) => {
      toast.error(`Failed to create loan: ${error.message}`);
    }
  });

  // Update loan mutation
  const updateLoanMutation = useMutation({
    mutationFn: async ({ loanId, data }: { loanId: string; data: Partial<Loan> }): Promise<Loan> => {
      const response = await fetch(`/api/loans/${loanId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update loan');
      }

      const result: ApiResponseWrapper<Loan> = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to update loan');
      }

      return result.data;
    },
    onSuccess: () => {
      toast.success('Loan updated successfully');
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['loans', 'analytics'] });
    },
    onError: (error) => {
      toast.error(`Failed to update loan: ${error.message}`);
    }
  });

  // Delete loan mutation
  const deleteLoanMutation = useMutation({
    mutationFn: async (loanId: string): Promise<void> => {
      const response = await fetch(`/api/loans/${loanId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to delete loan');
      }

      const result: ApiResponseWrapper<any> = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to delete loan');
      }
    },
    onSuccess: () => {
      toast.success('Loan deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['loans', 'analytics'] });
    },
    onError: (error) => {
      toast.error(`Failed to delete loan: ${error.message}`);
    }
  });

  // Approve loan mutation
  const approveLoanMutation = useMutation({
    mutationFn: async (data: LoanApprovalRequest): Promise<void> => {
      const response = await fetch(`/api/loans/${data.loanId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Approved',
          interestRate: data.interestRate,
          approvedAt: new Date().toISOString(),
          approvalNotes: data.adminNotes,
          conditions: data.conditions
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to approve loan');
      }

      const result: ApiResponseWrapper<any> = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to approve loan');
      }
    },
    onSuccess: () => {
      toast.success('Loan approved successfully');
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['loans', 'analytics'] });
    },
    onError: (error) => {
      toast.error(`Failed to approve loan: ${error.message}`);
    }
  });

  // Reject loan mutation
  const rejectLoanMutation = useMutation({
    mutationFn: async ({ loanId, reason }: { loanId: string; reason: string }) => {
      const response = await fetch(`/api/loans/${loanId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Rejected',
          rejectionReason: reason
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to reject loan');
      }

      const result: ApiResponseWrapper<any> = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to reject loan');
      }

      return result.data;
    },
    onSuccess: () => {
      toast.success('Loan rejected successfully');
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['loans', 'analytics'] });
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
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to calculate EMI');
      }

      const result: ApiResponseWrapper<EMICalculation> = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to calculate EMI');
      }

      return result.data;
    },
    onError: (error) => {
      toast.error(`Failed to calculate EMI: ${error.message}`);
    }
  });

  // Record repayment mutation
  const recordRepaymentMutation = useMutation({
    mutationFn: async ({ loanId, data }: { loanId: string; data: any }) => {
      const response = await fetch(`/api/loans/${loanId}/repayment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to record repayment');
      }

      const result: ApiResponseWrapper<any> = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to record repayment');
      }

      return result.data;
    },
    onSuccess: () => {
      toast.success('Repayment recorded successfully');
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['loans', 'analytics'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
    onError: (error) => {
      toast.error(`Failed to record repayment: ${error.message}`);
    }
  });

  return {
    loans: loansQuery.data?.data || [],
    totalLoans: loansQuery.data?.pagination.total || 0,
    analytics: analyticsQuery.data,
    isLoading: loansQuery.isLoading || analyticsQuery.isLoading,
    error: loansQuery.error?.message || analyticsQuery.error?.message || null,
    createLoan: createLoanMutation.mutateAsync,
    updateLoan: (loanId: string, data: Partial<Loan>) => 
      updateLoanMutation.mutateAsync({ loanId, data }),
    deleteLoan: deleteLoanMutation.mutateAsync,
    approveLoan: approveLoanMutation.mutateAsync,
    rejectLoan: (loanId: string, reason: string) => 
      rejectLoanMutation.mutateAsync({ loanId, reason }),
    calculateEMI: emiCalculationMutation.mutateAsync,
    recordRepayment: (loanId: string, data: any) => 
      recordRepaymentMutation.mutateAsync({ loanId, data }),
    refreshLoans: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['loans', 'analytics'] });
    }
  };
}

// Hook for individual loan details
export function useLoan(loanId: string) {
  const queryClient = useQueryClient();

  const loanQuery = useQuery({
    queryKey: ['loans', loanId],
    queryFn: async (): Promise<Loan> => {
      const response = await fetch(`/api/loans/${loanId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch loan details');
      }

      const result: ApiResponseWrapper<{ loan: Loan }> = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch loan');
      }

      return result.data.loan;
    },
    enabled: !!loanId && loanId !== '',
    staleTime: 1 * 60 * 1000, // 1 minute
    retry: 2
  });

  return {
    loan: loanQuery.data,
    isLoading: loanQuery.isLoading,
    error: loanQuery.error?.message || null,
    refetch: loanQuery.refetch
  };
}

// Hook for loan repayment history
export function useLoanRepayments(loanId: string) {
  const repaymentQuery = useQuery({
    queryKey: ['loans', loanId, 'repayments'],
    queryFn: async () => {
      const response = await fetch(`/api/loans/${loanId}/repayment`);
      if (!response.ok) {
        throw new Error('Failed to fetch repayment history');
      }

      const result: ApiResponseWrapper<any> = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch repayment history');
      }

      return result.data;
    },
    enabled: !!loanId && loanId !== '',
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2
  });

  return {
    repaymentSchedule: repaymentQuery.data?.repaymentSchedule || [],
    transactions: repaymentQuery.data?.transactions || [],
    upcomingPayments: repaymentQuery.data?.upcomingPayments || [],
    overduePayments: repaymentQuery.data?.overduePayments || [],
    analytics: repaymentQuery.data?.analytics,
    isLoading: repaymentQuery.isLoading,
    error: repaymentQuery.error?.message || null,
    refetch: repaymentQuery.refetch
  };
}

// Hook for user's own loans (for user portal) - also fixed with period parameter
export function useUserLoans(
  filters?: LoanFilter,
  analyticsPeriod: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'all_time' = 'month'
) {
  const queryClient = useQueryClient();

  const userLoansQuery = useQuery({
    queryKey: ['user-loans', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            params.append(key, value.toString());
          }
        });
      }

      const response = await fetch(`/api/user/loans?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch user loans');
      }

      const result: ApiResponseWrapper<any> = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch user loans');
      }

      return result.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2
  });

  // User analytics query with period parameter
  const userAnalyticsQuery = useQuery({
    queryKey: ['user-loans', 'analytics', analyticsPeriod],
    queryFn: async () => {
      const params = new URLSearchParams({
        period: analyticsPeriod
      });

      const response = await fetch(`/api/user/loans/analytics?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch user loan analytics');
      }

      const result: ApiResponseWrapper<any> = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch user analytics');
      }

      return result.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2
  });

  return {
    loans: userLoansQuery.data?.loans || [],
    analytics: userAnalyticsQuery.data,
    isLoading: userLoansQuery.isLoading || userAnalyticsQuery.isLoading,
    error: userLoansQuery.error?.message || userAnalyticsQuery.error?.message || null,
    refetch: () => {
      userLoansQuery.refetch();
      userAnalyticsQuery.refetch();
    }
  };
}