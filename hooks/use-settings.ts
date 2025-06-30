// hooks/use-settings.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Setting, 
  SettingFilter,
  SettingsGroupedByCategory,
  SettingForm,
  SettingUpdate,
  BulkSettingUpdate,
  PaginationParams,
  ListResponse 
} from '@/types';
import { toast } from 'sonner';
import React from 'react';

interface SettingsHookReturn {
  settings: Setting[];
  groupedSettings: SettingsGroupedByCategory | null;
  totalSettings: number;
  isLoading: boolean;
  error: string | null;
  createSetting: (data: SettingForm) => Promise<Setting>;
  updateSetting: (settingId: string, data: SettingUpdate) => Promise<Setting>;
  deleteSetting: (settingId: string) => Promise<void>;
  bulkUpdateSettings: (data: BulkSettingUpdate) => Promise<void>;
  refreshSettings: () => void;
}

// API Response wrapper type to match actual response structure
interface ApiResponseWrapper<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
  error?: string;
}

export function useSettings(
  filters?: SettingFilter,
  pagination?: PaginationParams,
  grouped: boolean = false
): SettingsHookReturn {
  const queryClient = useQueryClient();

  // Settings list query
  const settingsQuery = useQuery({
    queryKey: ['settings', 'list', filters, pagination, grouped],
    queryFn: async (): Promise<ListResponse<Setting> | SettingsGroupedByCategory> => {
      const params = new URLSearchParams();
      
      // Add filter parameters
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            params.append(key, value.toString());
          }
        });
      }
      
      // Add pagination parameters
      if (pagination && !grouped) {
        params.append('page', pagination.page.toString());
        params.append('limit', pagination.limit.toString());
        if (pagination.sortBy) params.append('sortBy', pagination.sortBy);
        if (pagination.sortOrder) params.append('sortOrder', pagination.sortOrder);
      }

      // Add grouped parameter
      params.append('grouped', grouped.toString());

      console.log('🔍 Settings Hook - Fetching with params:', params.toString());

      const response = await fetch(`/api/settings?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-cache'
      });

      console.log('📡 Settings Hook - Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Settings Hook - HTTP Error:', response.status, errorData);
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to fetch settings`);
      }

      let result: ApiResponseWrapper<ListResponse<Setting> | SettingsGroupedByCategory>;
      
      try {
        result = await response.json();
        console.log('📊 Settings Hook - Raw API response:', result);
      } catch (parseError) {
        console.error('❌ Settings Hook - JSON Parse Error:', parseError);
        throw new Error('Invalid JSON response from server');
      }
      
      // Handle different response structures
      if (result.success === false) {
        console.error('❌ Settings Hook - API Error:', result.message || result.error);
        throw new Error(result.message || result.error || 'API request failed');
      }

      // Handle response data
      if (result.data) {
        console.log('✅ Settings Hook - Using wrapped response data');
        return result.data;
      } else {
        console.error('❌ Settings Hook - Unexpected response structure:', result);
        throw new Error('Unexpected response structure from API');
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false,
    throwOnError: false
  });

  // Create setting mutation
  const createSettingMutation = useMutation({
    mutationFn: async (data: SettingForm) => {
      console.log('🚀 Settings Hook - Creating setting:', data);
      
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create setting');
      }

      const result = await response.json();
      return result.success ? result.data : result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Setting created successfully');
    },
    onError: (error: Error) => {
      console.error('❌ Settings Hook - Create error:', error);
      toast.error(error.message || 'Failed to create setting');
    },
  });

  // Update setting mutation
  const updateSettingMutation = useMutation({
    mutationFn: async ({ settingId, data }: { settingId: string; data: SettingUpdate }) => {
      console.log('🔄 Settings Hook - Updating setting:', settingId, data);
      
      const response = await fetch(`/api/settings/${settingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update setting');
      }

      const result = await response.json();
      return result.success ? result.data : result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Setting updated successfully');
    },
    onError: (error: Error) => {
      console.error('❌ Settings Hook - Update error:', error);
      toast.error(error.message || 'Failed to update setting');
    },
  });

  // Delete setting mutation
  const deleteSettingMutation = useMutation({
    mutationFn: async (settingId: string) => {
      console.log('🗑️ Settings Hook - Deleting setting:', settingId);
      
      const response = await fetch(`/api/settings/${settingId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to delete setting');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Setting deleted successfully');
    },
    onError: (error: Error) => {
      console.error('❌ Settings Hook - Delete error:', error);
      toast.error(error.message || 'Failed to delete setting');
    },
  });

  // Bulk update settings mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: async (data: BulkSettingUpdate) => {
      console.log('🔄 Settings Hook - Bulk updating settings:', data);
      
      const response = await fetch('/api/settings/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to bulk update settings');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast.success('Settings updated successfully');
    },
    onError: (error: Error) => {
      console.error('❌ Settings Hook - Bulk update error:', error);
      toast.error(error.message || 'Failed to bulk update settings');
    },
  });

  // Extract data with proper fallbacks and error handling
  const settings: Setting[] = !grouped && Array.isArray((settingsQuery.data as any)?.data) 
    ? (settingsQuery.data as ListResponse<Setting>).data ?? []
    : [];
  
  const groupedSettings = grouped && settingsQuery.data && typeof settingsQuery.data === 'object' && !Array.isArray(settingsQuery.data)
    ? settingsQuery.data as SettingsGroupedByCategory
    : null;
  
  const totalSettings = !grouped && (settingsQuery.data as any)?.pagination?.total 
    ? (settingsQuery.data as ListResponse<Setting>).pagination.total 
    : (grouped && groupedSettings
      ? Object.values(groupedSettings).reduce(
          (acc: number, arr) => acc + (Array.isArray(arr) ? arr.length : 0),
          0
        )
      : 0);
  
  const isLoading = settingsQuery.isLoading;
  const error = settingsQuery.error?.message || null;

  // Log current state for debugging
  React.useEffect(() => {
    console.log('📊 Settings Hook - Current state:', {
      isLoading,
      error,
      settingsCount: (settings ?? []).length,
      totalSettings,
      grouped,
      groupedCategories: groupedSettings ? Object.keys(groupedSettings) : [],
      queryData: settingsQuery.data,
      queryError: settingsQuery.error
    });
  }, [isLoading, error, (settings ?? []).length, totalSettings, grouped, groupedSettings, settingsQuery.data, settingsQuery.error]);

  return {
    settings,
    groupedSettings,
    totalSettings,
    isLoading,
    error,
    createSetting: createSettingMutation.mutateAsync,
    updateSetting: (settingId: string, data: SettingUpdate) => 
      updateSettingMutation.mutateAsync({ settingId, data }),
    deleteSetting: deleteSettingMutation.mutateAsync,
    bulkUpdateSettings: bulkUpdateMutation.mutateAsync,
    refreshSettings: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  };
}

// Hook for getting individual setting
export function useSetting(settingId: string) {
  return useQuery({
    queryKey: ['settings', 'detail', settingId],
    queryFn: async () => {
      const response = await fetch(`/api/settings/${settingId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch setting');
      }

      const result = await response.json();
      return result.success ? result.data : result;
    },
    enabled: !!settingId,
    staleTime: 5 * 60 * 1000,
  });
}

// Hook for getting settings by category
export function useSettingsByCategory(category: string) {
  return useSettings({ category: category as any }, undefined, false);
}