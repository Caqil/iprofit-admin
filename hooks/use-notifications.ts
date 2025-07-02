import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Notification, 
  NotificationFilter, 
  NotificationTemplate,
  BulkNotificationRequest,
  PaginationParams,
  ListResponse 
} from '@/types';
import { toast } from 'sonner';

interface NotificationsHookReturn {
  notifications: Notification[];
  totalNotifications: number;
  templates: NotificationTemplate[];
  isLoading: boolean;
  error: string | null;
  sendNotification: (data: BulkNotificationRequest) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  refreshNotifications: () => void;
}

// FIXED: API Response wrapper type to match actual response structure
interface ApiResponseWrapper<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

export function useNotifications(
  filters?: NotificationFilter,
  pagination?: PaginationParams
): NotificationsHookReturn {
  const queryClient = useQueryClient();

  // FIXED: Notifications list query to handle actual API response structure
  const notificationsQuery = useQuery({
    queryKey: ['notifications', filters, pagination],
    queryFn: async (): Promise<ListResponse<Notification>> => {
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

      console.log('🔍 Notifications Hook - Fetching with params:', params.toString());

      const response = await fetch(`/api/notifications?${params}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch notifications');
      }

      const result: ApiResponseWrapper<ListResponse<Notification>> = await response.json();
      
      console.log('📊 Notifications Hook - Raw API response:', result);
      
      // FIXED: Handle the actual API response structure
      if (!result.success) {
        throw new Error(result.message || 'API request failed');
      }

      return result.data;
    },
    staleTime: 60 * 1000 // 1 minute
  });

  // FIXED: Templates query - handle missing endpoint gracefully
  const templatesQuery = useQuery({
    queryKey: ['notifications', 'templates'],
    queryFn: async (): Promise<NotificationTemplate[]> => {
      try {
        const response = await fetch('/api/notifications/templates');
        
        // If endpoint doesn't exist (404), return empty array instead of throwing
        if (response.status === 404) {
          console.warn('Templates endpoint not implemented yet');
          return [];
        }
        
        if (!response.ok) {
          throw new Error('Failed to fetch templates');
        }

        const result: ApiResponseWrapper<NotificationTemplate[]> = await response.json();
        
        if (!result.success) {
          throw new Error(result.message || 'Failed to fetch templates');
        }

        return result.data;
      } catch (error) {
        console.warn('Templates endpoint error:', error);
        // Return empty array if templates endpoint is not available
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false // Don't retry on 404
  });

  // Send notification mutation
  const sendNotificationMutation = useMutation({
    mutationFn: async (data: BulkNotificationRequest) => {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to send notification');
      }

      const result: ApiResponseWrapper<any> = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to send notification');
      }

      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Notification sent successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to send notification');
    },
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to mark notification as read');
      }

      const result: ApiResponseWrapper<any> = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to mark notification as read');
      }

      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Notification marked as read');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to mark notification as read');
    },
  });

  // Delete notification mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to delete notification');
      }

      const result: ApiResponseWrapper<any> = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to delete notification');
      }

      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Notification deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete notification');
    },
  });

  // Helper function to extract data safely
  const extractNotificationsData = (response: any) => {
    console.log('🔍 extractNotificationsData - Raw response:', response);
    
    // Handle different response structures
    if (response?.data && Array.isArray(response.data)) {
      // Direct structure: { data: [...], pagination: {...} }
      console.log('✅ extractNotificationsData - Using direct data structure');
      return {
        notifications: response.data,
        totalNotifications: response.pagination?.total || 0
      };
    } else if (Array.isArray(response)) {
      // Raw array: [...]
      console.log('✅ extractNotificationsData - Using raw array');
      return {
        notifications: response,
        totalNotifications: response.length
      };
    } else {
      console.log('❌ extractNotificationsData - Unknown structure, using empty array');
      return {
        notifications: [],
        totalNotifications: 0
      };
    }
  };

  const notificationsData = extractNotificationsData(notificationsQuery.data);

  return {
    notifications: notificationsData.notifications,
    totalNotifications: notificationsData.totalNotifications,
    templates: templatesQuery.data || [],
    isLoading: notificationsQuery.isLoading || templatesQuery.isLoading,
    error: notificationsQuery.error?.message || templatesQuery.error?.message || null,
    sendNotification: sendNotificationMutation.mutateAsync,
    markAsRead: markAsReadMutation.mutateAsync,
    deleteNotification: deleteNotificationMutation.mutateAsync,
    refreshNotifications: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  };
}