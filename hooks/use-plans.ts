import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plan, 
  PaginationParams,
  ListResponse 
} from '@/types';
import { PlanFilter, PlanWithStats } from '@/types/plan';
import { toast } from 'sonner';
import React from 'react';

interface PlansHookReturn {
  plans: PlanWithStats[];
  totalPlans: number;
  isLoading: boolean;
  error: string | null;
  createPlan: (data: Partial<Plan>) => Promise<Plan>;
  updatePlan: (planId: string, data: Partial<Plan>) => Promise<Plan>;
  deletePlan: (planId: string) => Promise<void>;
  refreshPlans: () => void;
}

// FIXED: API Response wrapper type to match actual response structure
interface ApiResponseWrapper<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
  error?: string;
}

export function usePlans(
  filters?: PlanFilter,
  pagination?: PaginationParams
): PlansHookReturn {
  const queryClient = useQueryClient();

  // FIXED: Plans list query with proper error handling and response structure
  const plansQuery = useQuery({
    queryKey: ['plans', 'list', filters, pagination],
    queryFn: async (): Promise<ListResponse<PlanWithStats>> => {
      const params = new URLSearchParams();
      
      // FIXED: Better parameter handling
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
      } else {
        // Default pagination if not provided
        params.append('page', '1');
        params.append('limit', '10');
        params.append('sortBy', 'priority');
        params.append('sortOrder', 'asc');
      }

      console.log('🔍 Plans Hook - Fetching with params:', params.toString());

      const response = await fetch(`/api/plans?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Add cache: 'no-cache' to ensure fresh data
        cache: 'no-cache'
      });

      console.log('📡 Plans Hook - Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Plans Hook - HTTP Error:', response.status, errorData);
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to fetch plans`);
      }

      let result: ApiResponseWrapper<ListResponse<PlanWithStats>>;
      
      try {
        result = await response.json();
        console.log('📊 Plans Hook - Raw API response:', result);
      } catch (parseError) {
        console.error('❌ Plans Hook - JSON Parse Error:', parseError);
        throw new Error('Invalid JSON response from server');
      }
      
      // FIXED: Handle different response structures
      if (result.success === false) {
        console.error('❌ Plans Hook - API Error:', result.message || result.error);
        throw new Error(result.message || result.error || 'API request failed');
      }

      // Handle direct data response (when success wrapper is not used)
      if (result.data) {
        console.log('✅ Plans Hook - Using wrapped response data');
        return result.data;
      } else if (Array.isArray((result as any).data) || (result as any).pagination) {
        // Handle case where result is the actual ListResponse
        console.log('✅ Plans Hook - Using direct response data');
        return result as unknown as ListResponse<PlanWithStats>;
      } else {
        console.error('❌ Plans Hook - Unexpected response structure:', result);
        throw new Error('Unexpected response structure from API');
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false,
    // FIXED: Add error handling
    throwOnError: false
  });

  // Create plan mutation
  const createPlanMutation = useMutation({
    mutationFn: async (data: Partial<Plan>) => {
      console.log('🚀 Plans Hook - Creating plan:', data);
      
      const response = await fetch('/api/plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create plan');
      }

      const result = await response.json();
      return result.success ? result.data : result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      toast.success('Plan created successfully');
    },
    onError: (error: Error) => {
      console.error('❌ Plans Hook - Create error:', error);
      toast.error(error.message || 'Failed to create plan');
    },
  });

  // Update plan mutation
  const updatePlanMutation = useMutation({
    mutationFn: async ({ planId, data }: { planId: string; data: Partial<Plan> }) => {
      console.log('🔄 Plans Hook - Updating plan:', planId, data);
      
      const response = await fetch(`/api/plans/${planId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update plan');
      }

      const result = await response.json();
      return result.success ? result.data : result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      toast.success('Plan updated successfully');
    },
    onError: (error: Error) => {
      console.error('❌ Plans Hook - Update error:', error);
      toast.error(error.message || 'Failed to update plan');
    },
  });

  // Delete plan mutation
  const deletePlanMutation = useMutation({
    mutationFn: async (planId: string) => {
      console.log('🗑️ Plans Hook - Deleting plan:', planId);
      
      const response = await fetch(`/api/plans/${planId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to delete plan');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      toast.success('Plan deleted successfully');
    },
    onError: (error: Error) => {
      console.error('❌ Plans Hook - Delete error:', error);
      toast.error(error.message || 'Failed to delete plan');
    },
  });

  // FIXED: Extract data with proper fallbacks and error handling
  const plans = plansQuery.data?.data || [];
  const totalPlans = plansQuery.data?.pagination?.total || 0;
  const isLoading = plansQuery.isLoading;
  const error = plansQuery.error?.message || null;

  // Log current state for debugging
  React.useEffect(() => {
    console.log('📊 Plans Hook - Current state:', {
      isLoading,
      error,
      plansCount: plans.length,
      totalPlans,
      queryData: plansQuery.data,
      queryError: plansQuery.error
    });
  }, [isLoading, error, plans.length, totalPlans, plansQuery.data, plansQuery.error]);

  return {
    plans: Array.isArray(plans) ? plans : [],
    totalPlans,
    isLoading,
    error,
    createPlan: (data) => createPlanMutation.mutateAsync(data),
    updatePlan: (planId, data) => updatePlanMutation.mutateAsync({ planId, data }),
    deletePlan: (planId) => deletePlanMutation.mutateAsync(planId),
    refreshPlans: () => queryClient.invalidateQueries({ queryKey: ['plans'] }),
  };
}

// FIXED: Export a simplified version for quick testing
export function usePlansSimple() {
  return useQuery({
    queryKey: ['plans', 'simple'],
    queryFn: async () => {
      console.log('🔍 Plans Hook Simple - Fetching plans...');
      
      try {
        const response = await fetch('/api/plans?page=1&limit=10&sortBy=priority&sortOrder=asc');
        
        console.log('📡 Plans Hook Simple - Response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        console.log('📊 Plans Hook Simple - Response data:', data);
        
        return data;
      } catch (error) {
        console.error('❌ Plans Hook Simple - Error:', error);
        throw error;
      }
    },
    retry: 1,
    staleTime: 0, // Always fetch fresh data
    refetchOnWindowFocus: false
  });
}