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

export function useUsers(
  filters?: UserFilter,
  pagination?: PaginationParams
): UsersHookReturn {
  const queryClient = useQueryClient();

  // Users list query
  const usersQuery = useQuery({
    queryKey: ['users', filters, pagination],
    queryFn: async (): Promise<ListResponse<User>> => {
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

      const response = await fetch(`/api/users?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      return response.json();
    },
    staleTime: 2 * 60 * 1000 // 2 minutes
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (data: UserCreateRequest): Promise<User> => {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create user');
      }

      const result = await response.json();
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

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: UserUpdateRequest }): Promise<User> => {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update user');
      }

      const result = await response.json();
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

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete user');
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success('User deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => {
      toast.error(`Failed to delete user: ${error.message}`);
    }
  });

  // KYC approval mutation
  const kycApprovalMutation = useMutation({
    mutationFn: async (data: KYCApprovalRequest) => {
      const response = await fetch(`/api/users/${data.userId}/kyc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to process KYC');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      const action = variables.action === 'approve' ? 'approved' : 'rejected';
      toast.success(`KYC ${action} successfully`);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => {
      toast.error(`Failed to process KYC: ${error.message}`);
    }
  });

  // Bulk action mutation
  const bulkActionMutation = useMutation({
    mutationFn: async (data: UserBulkAction) => {
      const response = await fetch('/api/users/bulk-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to execute bulk action');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast.success(`Bulk action completed: ${data.success} successful, ${data.failed} failed`);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => {
      toast.error(`Bulk action failed: ${error.message}`);
    }
  });

  // Get user profile function
  const getUserProfile = async (userId: string): Promise<UserProfile> => {
    const response = await fetch(`/api/users/${userId}/profile`);
    if (!response.ok) {
      throw new Error('Failed to fetch user profile');
    }
    const result = await response.json();
    return result.data;
  };

  return {
    users: usersQuery.data?.data || [],
    totalUsers: usersQuery.data?.pagination.total || 0,
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