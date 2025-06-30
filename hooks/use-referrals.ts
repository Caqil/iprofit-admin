// hooks/use-referrals.ts - FIXED VERSION
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Referral, 
  ReferralOverview, 
  ReferralFilter, 
  TopReferrer,
  PaginationParams,
  ListResponse 
} from '@/types';
import { toast } from 'sonner';

interface ReferralsHookReturn {
  referrals: Referral[];
  totalReferrals: number;
  overview: ReferralOverview | undefined;
  topReferrers: TopReferrer[];
  isLoading: boolean;
  isOverviewLoading: boolean;
  error: string | null;
  approveReferral: (referralIds: string[], adjustedAmount?: number) => Promise<void>;
  rejectReferral: (referralIds: string[], reason?: string) => Promise<void>;
  recalculateProfitBonus: (refereeId: string, newProfitAmount: number) => Promise<void>;
  refreshReferrals: () => void;
}

// FIXED: API Response wrapper type to match actual response structure
interface ApiResponseWrapper<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

export function useReferrals(
  filters?: ReferralFilter,
  pagination?: PaginationParams
): ReferralsHookReturn {
  const queryClient = useQueryClient();

  // FIXED: Referrals list query to handle actual API response structure
  const referralsQuery = useQuery({
    queryKey: ['referrals', 'list', filters, pagination],
    queryFn: async (): Promise<ListResponse<Referral>> => {
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

      console.log('🔍 Referrals Hook - Fetching with params:', params.toString());

      const response = await fetch(`/api/referrals?${params}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch referrals');
      }

      const result: ApiResponseWrapper<ListResponse<Referral>> = await response.json();
      
      console.log('📊 Referrals Hook - Raw API response:', result);
      
      // FIXED: Handle the actual API response structure
      if (!result.success) {
        throw new Error(result.message || 'API request failed');
      }

      return result.data;
    },
    staleTime: 60 * 1000 // 1 minute
  });

  // Referral overview query
  const overviewQuery = useQuery({
    queryKey: ['referrals', 'bonuses'],
    queryFn: async () => {
      const response = await fetch('/api/referrals/bonuses');
      if (!response.ok) {
        throw new Error('Failed to fetch referral overview');
      }
      
      const result: ApiResponseWrapper<any> = await response.json();
      console.log('📊 Referrals Overview - Raw API response:', result);
      
      if (!result.success) {
        throw new Error(result.message || 'API request failed');
      }

      return result.data;
    },
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  // Approve referral mutation
  const approveReferralMutation = useMutation({
    mutationFn: async ({ referralIds, adjustedAmount }: { referralIds: string[], adjustedAmount?: number }) => {
      const response = await fetch('/api/referrals/bonuses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referralIds,
          action: 'approve',
          adjustedAmount
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to approve referral');
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success('Referral bonuses approved successfully');
      queryClient.invalidateQueries({ queryKey: ['referrals'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  // Reject referral mutation
  const rejectReferralMutation = useMutation({
    mutationFn: async ({ referralIds, reason }: { referralIds: string[], reason?: string }) => {
      const response = await fetch('/api/referrals/bonuses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referralIds,
          action: 'reject',
          reason
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to reject referral');
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success('Referral bonuses rejected');
      queryClient.invalidateQueries({ queryKey: ['referrals'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  // Profit bonus recalculation mutation
  const recalculateMutation = useMutation({
    mutationFn: async ({ refereeId, newProfitAmount }: { refereeId: string, newProfitAmount: number }) => {
      const response = await fetch('/api/referrals/bonuses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refereeId,
          newProfitAmount,
          profitSharePercentage: 10
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to recalculate profit bonus');
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success('Profit bonuses recalculated successfully');
      queryClient.invalidateQueries({ queryKey: ['referrals'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  // FIXED: Extract data properly from API response
  const extractReferralsData = (queryData: any) => {
    console.log('🔍 Extracting referrals data from:', queryData);
    
    if (!queryData) {
      return { referrals: [], totalReferrals: 0 };
    }

    // Handle different response structures
    if (queryData.data && Array.isArray(queryData.data)) {
      // Structure: { data: [...], pagination: {...} }
      console.log('✅ Using direct structure - data array found');
      return {
        referrals: queryData.data,
        totalReferrals: queryData.pagination?.total || 0
      };
    } else if (Array.isArray(queryData)) {
      // Raw array structure
      console.log('✅ Using raw array structure');
      return {
        referrals: queryData,
        totalReferrals: queryData.length
      };
    } else {
      console.log('❌ Unknown response structure, using empty array');
      console.log('Response structure:', Object.keys(queryData || {}));
      return {
        referrals: [],
        totalReferrals: 0
      };
    }
  };

  const { referrals, totalReferrals } = extractReferralsData(referralsQuery.data);

  return {
    referrals,
    totalReferrals,
    overview: overviewQuery.data?.overview,
    topReferrers: overviewQuery.data?.topReferrers || [],
    isLoading: referralsQuery.isLoading,
    isOverviewLoading: overviewQuery.isLoading,
    error: referralsQuery.error?.message || overviewQuery.error?.message || null,
    approveReferral: (referralIds: string[], adjustedAmount?: number) => 
      approveReferralMutation.mutateAsync({ referralIds, adjustedAmount }),
    rejectReferral: (referralIds: string[], reason?: string) =>
      rejectReferralMutation.mutateAsync({ referralIds, reason }),
    recalculateProfitBonus: (refereeId: string, newProfitAmount: number) =>
      recalculateMutation.mutateAsync({ refereeId, newProfitAmount }),
    refreshReferrals: () => {
      queryClient.invalidateQueries({ queryKey: ['referrals'] });
    }
  };
}