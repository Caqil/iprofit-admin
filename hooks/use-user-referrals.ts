// hooks/use-user-referrals.ts - NEW HOOK
import { useQuery } from '@tanstack/react-query';
import { 
  Referral,
  PaginationParams,
  ListResponse 
} from '@/types';

interface UserReferralsSummary {
  totalReferrals: number;
  totalEarnings: number;
  pendingEarnings: number;
  paidEarnings: number;
  referrerCount: number; // Times they referred others
  refereeCount: number;  // Times they were referred
}

interface UserReferralsFilter {
  type?: 'referrer' | 'referee' | 'all';
  status?: 'Pending' | 'Paid' | 'Cancelled';
  bonusType?: 'signup' | 'profit_share';
}

interface UserReferralsResponse extends ListResponse<Referral> {
  user: {
    id: string;
    name: string;
    email: string;
    referralCode: string;
  };
  summary: UserReferralsSummary;
}

interface UserReferralsHookReturn {
  referrals: Referral[];
  totalReferrals: number;
  summary: UserReferralsSummary | undefined;
  user: { id: string; name: string; email: string; referralCode: string } | undefined;
  isLoading: boolean;
  error: string | null;
  refreshReferrals: () => void;
}

// API Response wrapper type
interface ApiResponseWrapper<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

export function useUserReferrals(
  userId: string,
  filters?: UserReferralsFilter,
  pagination?: PaginationParams
): UserReferralsHookReturn {
  
  // User referrals query
  const referralsQuery = useQuery({
    queryKey: ['users', userId, 'referrals', filters, pagination],
    queryFn: async (): Promise<UserReferralsResponse> => {
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

      console.log('🔍 User Referrals Hook - Fetching with params:', params.toString());

      const response = await fetch(`/api/users/${userId}/referrals?${params}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch user referrals');
      }

      const result: ApiResponseWrapper<UserReferralsResponse> = await response.json();
      
      console.log('📊 User Referrals Hook - Raw API response:', result);
      
      if (!result.success) {
        throw new Error(result.message || 'API request failed');
      }

      return result.data;
    },
    enabled: !!userId, // Only run query if userId is provided
    staleTime: 60 * 1000 // 1 minute
  });

  return {
    referrals: referralsQuery.data?.data || [],
    totalReferrals: referralsQuery.data?.pagination?.total || 0,
    summary: referralsQuery.data?.summary,
    user: referralsQuery.data?.user,
    isLoading: referralsQuery.isLoading,
    error: referralsQuery.error?.message || null,
    refreshReferrals: () => {
      referralsQuery.refetch();
    }
  };
}