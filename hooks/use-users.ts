import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  User, 
  UserFilter, 
  UserProfile, 
  UserBulkAction,
  UserCreateRequest,
  UserUpdateRequest,
  PaginationParams,
  ListResponse, 
  KYCApprovalRequest
} from '@/types';
import { toast } from 'sonner';

interface UsersHookReturn {
  users: User[];
  totalUsers: number;
  isLoading: boolean;
  error: string | null;
  createUser: (data: UserCreateRequest) => Promise<User>;
  updateUser: (userId: string, data: UserUpdateRequest) => Promise<User>;
  deleteUser: (userId: string) => Promise<void>;
  approveKYC: (data: KYCApprovalRequest) => Promise<void>;
  bulkAction: (data: UserBulkAction) => Promise<void>;
  getUserProfile: (userId: string) => Promise<UserProfile>;
  refreshUsers: () => void;
}

interface ApiResponseWrapper<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

export function useUsers(
  filters?: UserFilter,
  pagination?: PaginationParams
): UsersHookReturn {
  const queryClient = useQueryClient();

  const usersQuery = useQuery({
    queryKey: ['users', filters, pagination],
    queryFn: async (): Promise<ListResponse<User>> => {
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

      const response = await fetch(`/api/users?${params}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to fetch users`);
      }

      const result: ApiResponseWrapper<ListResponse<User>> = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch users');
      }

      return result.data;
    },
    staleTime: 2 * 60 * 1000,
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: UserCreateRequest): Promise<User> => {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to create user');
      }

      const result: ApiResponseWrapper<User> = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to create user');
      }

      return result.data;
    },
    onSuccess: () => {
      toast.success('User created successfully');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => {
      toast.error(`Failed to create user: ${error.message}`);
    }
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: UserUpdateRequest }): Promise<User> => {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to update user');
      }

      const result: ApiResponseWrapper<User> = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to update user');
      }

      return result.data;
    },
    onSuccess: () => {
      toast.success('User updated successfully');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => {
      toast.error(`Failed to update user: ${error.message}`);
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to delete user');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to delete user');
      }

      return result.data;
    },
    onSuccess: () => {
      toast.success('User deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => {
      toast.error(`Failed to delete user: ${error.message}`);
    }
  });

const kycApprovalMutation = useMutation({
  mutationFn: async (data: KYCApprovalRequest) => {
    const requestBody = {
      status: data.action === 'approve' ? 'approved' : 'rejected',
      rejectionReason: data.action === 'reject' ? data.rejectionReason : undefined,
      adminNotes: data.adminNotes,
    };

    console.log('🔧 KYC API Request:', {
      url: `/api/users/${data.userId}/kyc`,
      method: 'PUT',
      body: requestBody
    });

    const response = await fetch(`/api/users/${data.userId}/kyc`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.error || 'Failed to process KYC');
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.message || 'Failed to process KYC');
    }

    return result.data;
  },
  onSuccess: (data, variables) => {
    const action = variables.action === 'approve' ? 'approved' : 'rejected';
    
    // ✅ ENHANCED: Multiple cache invalidation strategies
    console.log('🔄 Invalidating React Query caches...');
    
    // 1. Invalidate all users queries
    queryClient.invalidateQueries({ 
      queryKey: ['users'],
      exact: false // This will invalidate all users queries regardless of filters/pagination
    });
    
    // 2. Invalidate specific user profile if it exists
    queryClient.invalidateQueries({ 
      queryKey: ['user-profile', variables.userId] 
    });
    
    // 3. Force refetch users data
    queryClient.refetchQueries({ 
      queryKey: ['users'],
      type: 'active' 
    });
    
    // 4. Update the cache directly (optimistic update)
    queryClient.setQueriesData(
      { queryKey: ['users'] },
      (oldData: any) => {
        if (!oldData?.data) return oldData;
        
        const updatedUsers = oldData.data.map((user: any) => {
          if (user._id === variables.userId) {
            return {
              ...user,
              kycStatus: variables.action === 'approve' ? 'Approved' : 'Rejected',
              kycApprovedAt: variables.action === 'approve' ? new Date() : user.kycApprovedAt,
              kycRejectedAt: variables.action === 'reject' ? new Date() : user.kycRejectedAt,
              kycRejectionReason: variables.action === 'reject' ? variables.rejectionReason : undefined
            };
          }
          return user;
        });
        
        return {
          ...oldData,
          data: updatedUsers
        };
      }
    );
    
    toast.success(`KYC ${action} successfully`);
    console.log('✅ Cache invalidation completed');
  },
  onError: (error) => {
    console.error('🚨 KYC Approval Error:', error);
    toast.error(`Failed to process KYC: ${error.message}`);
  }
});

  const bulkActionMutation = useMutation({
    mutationFn: async (data: UserBulkAction) => {
      const response = await fetch('/api/users/bulk-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Failed to execute bulk action');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to execute bulk action');
      }

      return result.data;
    },
    onSuccess: (data) => {
      const successCount = data?.success || data?.successful || 0;
      const failedCount = data?.failed || 0;
      toast.success(`Bulk action completed: ${successCount} successful, ${failedCount} failed`);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => {
      toast.error(`Bulk action failed: ${error.message}`);
    }
  });

  const getUserProfile = async (userId: string): Promise<UserProfile> => {
    const response = await fetch(`/api/users/${userId}/profile`, {
      credentials: 'include'
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Failed to fetch user profile');
    }
    
    const result: ApiResponseWrapper<UserProfile> = await response.json();
    
    if (!result.success) {
      throw new Error(result.message || 'Failed to fetch user profile');
    }

    return result.data;
  };

  return {
    users: usersQuery.data?.data || [],
    totalUsers: usersQuery.data?.pagination?.total || 0,
    isLoading: usersQuery.isLoading,
    error: usersQuery.error?.message || null,
    createUser: createUserMutation.mutateAsync,
    updateUser: (userId: string, data: UserUpdateRequest) => 
      updateUserMutation.mutateAsync({ userId, data }),
    deleteUser: deleteUserMutation.mutateAsync,
    approveKYC: kycApprovalMutation.mutateAsync,
    bulkAction: bulkActionMutation.mutateAsync,
    getUserProfile,
    refreshUsers: () => queryClient.invalidateQueries({ queryKey: ['users'] })
  };
}