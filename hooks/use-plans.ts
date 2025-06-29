import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plan, 
  PaginationParams,
  ListResponse 
} from '@/types';
import { PlanFilter, PlanWithStats } from '@/types/plan';
import { toast } from 'sonner';

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

export function usePlans(
  filters?: PlanFilter,
  pagination?: PaginationParams
): PlansHookReturn {
  const queryClient = useQueryClient();

  // Plans list query - FIXED to handle nested pagination structure
  const plansQuery = useQuery({
    queryKey: ['plans', 'list', filters, pagination],
    queryFn: async (): Promise<ListResponse<PlanWithStats>> => {
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

      const response = await fetch(`/api/plans?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch plans');
      }

      return response.json();
    },
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  // Create plan mutation
  const createPlanMutation = useMutation({
    mutationFn: async (data: Partial<Plan>) => {
      const response = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create plan');
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success('Plan created successfully');
      queryClient.invalidateQueries({ queryKey: ['plans'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  // Update plan mutation
  const updatePlanMutation = useMutation({
    mutationFn: async ({ planId, data }: { planId: string, data: Partial<Plan> }) => {
      const response = await fetch(`/api/plans/${planId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update plan');
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success('Plan updated successfully');
      queryClient.invalidateQueries({ queryKey: ['plans'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  // Delete plan mutation
  const deletePlanMutation = useMutation({
    mutationFn: async (planId: string) => {
      const response = await fetch(`/api/plans/${planId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete plan');
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success('Plan deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['plans'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  return {
    // FIXED: Access data and total through proper ListResponse structure
    plans: plansQuery.data?.data || [],
    totalPlans: plansQuery.data?.pagination?.total || 0,
    isLoading: plansQuery.isLoading,
    error: plansQuery.error?.message || null,
    createPlan: (data: Partial<Plan>) => createPlanMutation.mutateAsync(data),
    updatePlan: (planId: string, data: Partial<Plan>) => 
      updatePlanMutation.mutateAsync({ planId, data }),
    deletePlan: (planId: string) => deletePlanMutation.mutateAsync(planId),
    refreshPlans: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
    }
  };
}