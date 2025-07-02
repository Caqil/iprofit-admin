// hooks/use-templates.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { NotificationTemplate, NotificationType, NotificationChannel } from '@/types/notification';
import { toast } from 'sonner';

interface TemplateFilter {
  type?: NotificationType;
  channel?: NotificationChannel;
  isActive?: boolean;
}

interface TemplatesHookReturn {
  templates: NotificationTemplate[];
  isLoading: boolean;
  error: string | null;
  createTemplate: (template: Partial<NotificationTemplate>) => Promise<void>;
  updateTemplate: (id: string, template: Partial<NotificationTemplate>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  duplicateTemplate: (template: NotificationTemplate) => Promise<void>;
  refreshTemplates: () => void;
}

// API Response wrapper type to match actual response structure
interface ApiResponseWrapper<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

export function useTemplates(filters?: TemplateFilter): TemplatesHookReturn {
  const queryClient = useQueryClient();

  // Templates query
  const templatesQuery = useQuery({
    queryKey: ['templates', filters],
    queryFn: async (): Promise<NotificationTemplate[]> => {
      const params = new URLSearchParams();
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, value.toString());
          }
        });
      }

      console.log('🔍 Templates Hook - Fetching with params:', params.toString());

      const response = await fetch(`/api/notifications/templates?${params}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch templates');
      }

      const result: ApiResponseWrapper<NotificationTemplate[]> = await response.json();
      
      console.log('📊 Templates Hook - Raw API response:', result);
      
      // Handle the actual API response structure
      if (!result.success) {
        throw new Error(result.message || 'API request failed');
      }

      return result.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (templateData: Partial<NotificationTemplate>) => {
      const response = await fetch('/api/notifications/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(templateData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create template');
      }

      const result: ApiResponseWrapper<any> = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to create template');
      }

      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Template created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create template');
    },
  });

  // Update template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<NotificationTemplate> }) => {
      const response = await fetch(`/api/notifications/templates/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update template');
      }

      const result: ApiResponseWrapper<any> = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to update template');
      }

      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Template updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update template');
    },
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/notifications/templates/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to delete template');
      }

      const result: ApiResponseWrapper<any> = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to delete template');
      }

      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Template deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete template');
    },
  });

  // Duplicate template mutation (creates a copy)
  const duplicateTemplateMutation = useMutation({
    mutationFn: async (template: NotificationTemplate) => {
      const duplicatedData = {
        name: `${template.name} (Copy)`,
        type: template.type,
        channel: template.channel,
        subject: template.subject,
        content: template.content,
        variables: template.variables,
        isActive: false, // Set as inactive by default for duplicates
      };

      const response = await fetch('/api/notifications/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(duplicatedData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to duplicate template');
      }

      const result: ApiResponseWrapper<any> = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to duplicate template');
      }

      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Template duplicated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to duplicate template');
    },
  });

  return {
    templates: templatesQuery.data || [],
    isLoading: templatesQuery.isLoading,
    error: templatesQuery.error?.message || null,
    createTemplate: createTemplateMutation.mutateAsync,
    updateTemplate: (id: string, data: Partial<NotificationTemplate>) => 
      updateTemplateMutation.mutateAsync({ id, data }),
    deleteTemplate: deleteTemplateMutation.mutateAsync,
    duplicateTemplate: duplicateTemplateMutation.mutateAsync,
    refreshTemplates: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
  };
}