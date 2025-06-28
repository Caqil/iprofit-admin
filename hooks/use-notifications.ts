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

export function useNotifications(
  filters?: NotificationFilter,
  pagination?: PaginationParams
): NotificationsHookReturn {
  const queryClient = useQueryClient();

  // Notifications list query
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

      const response = await fetch(`/api/notifications?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }

      return response.json();
    },
    staleTime: 60 * 1000 // 1 minute
  });

  // Templates query
  const templatesQuery = useQuery({
    queryKey: ['notifications', 'templates'],
    queryFn: async (): Promise<NotificationTemplate[]> => {
      const response = await fetch('/api/notifications/templates');
      if (!response.ok) {
        throw new Error('Failed to fetch notification templates');
      }

      const data = await response.json();
      return data.data || [];
    },
    staleTime: 10 * 60 * 1000 // 10 minutes
  });

  // Send notification mutation
  const sendNotificationMutation = useMutation({
    mutationFn: async (data: BulkNotificationRequest) => {
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send notification');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast.success(`Notification sent to ${data.sent} recipients`);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error) => {
      toast.error(`Failed to send notification: ${error.message}`);
    }
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH'
      });

      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error) => {
      toast.error(`Failed to mark as read: ${error.message}`);
    }
  });

  // Delete notification mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete notification');
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success('Notification deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (error) => {
      toast.error(`Failed to delete notification: ${error.message}`);
    }
  });

  return {
    notifications: notificationsQuery.data?.data || [],
    totalNotifications: notificationsQuery.data?.pagination.total || 0,
    templates: templatesQuery.data || [],
    isLoading: notificationsQuery.isLoading || templatesQuery.isLoading,
    error: notificationsQuery.error?.message || templatesQuery.error?.message || null,
    sendNotification: sendNotificationMutation.mutateAsync,
    markAsRead: markAsReadMutation.mutateAsync,
    deleteNotification: deleteNotificationMutation.mutateAsync,
    refreshNotifications: () => queryClient.invalidateQueries({ queryKey: ['notifications'] })
  };
}