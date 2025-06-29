// hooks/use-tasks.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Task, 
  TaskSubmission,
  TaskFilter,
  TaskAnalytics,
  PaginationParams,
  ListResponse 
} from '@/types';
import { toast } from 'sonner';

interface TasksHookReturn {
  tasks: Task[];
  totalTasks: number;
  submissions: TaskSubmission[];
  totalSubmissions: number;
  analytics: TaskAnalytics | null;
  isLoading: boolean;
  error: string | null;
  createTask: (data: Partial<Task>) => Promise<Task>;
  updateTask: (taskId: string, data: Partial<Task>) => Promise<Task>;
  deleteTask: (taskId: string) => Promise<void>;
  processSubmission: (submissionId: string, action: 'approve' | 'reject', data?: { reviewNote?: string; adjustedReward?: number }) => Promise<void>;
  bulkProcessSubmissions: (submissionIds: string[], action: 'approve' | 'reject', data?: { reviewNote?: string }) => Promise<void>;
  refreshTasks: () => void;
  refreshSubmissions: () => void;
}

export function useTasks(
  filters?: TaskFilter,
  pagination?: PaginationParams
): TasksHookReturn {
  const queryClient = useQueryClient();

  // Tasks list query
  const tasksQuery = useQuery({
    queryKey: ['tasks', 'list', filters, pagination],
    queryFn: async (): Promise<ListResponse<Task>> => {
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

      const response = await fetch(`/api/tasks?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }

      return response.json();
    },
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  // Submissions query
  const submissionsQuery = useQuery({
    queryKey: ['tasks', 'submissions', filters, pagination],
    queryFn: async (): Promise<ListResponse<TaskSubmission>> => {
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

      const response = await fetch(`/api/tasks/submissions?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch task submissions');
      }

      return response.json();
    },
    staleTime: 2 * 60 * 1000 // 2 minutes
  });

  // Analytics query
  const analyticsQuery = useQuery({
    queryKey: ['tasks', 'analytics'],
    queryFn: async (): Promise<TaskAnalytics> => {
      const response = await fetch('/api/tasks/analytics');
      if (!response.ok) {
        throw new Error('Failed to fetch task analytics');
      }
      const data = await response.json();
      return data.data;
    },
    staleTime: 10 * 60 * 1000 // 10 minutes
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (data: Partial<Task>) => {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create task');
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success('Task created successfully');
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (error) => {
      toast.error(`Failed to create task: ${error.message}`);
    }
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, data }: { taskId: string; data: Partial<Task> }) => {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update task');
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success('Task updated successfully');
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (error) => {
      toast.error(`Failed to update task: ${error.message}`);
    }
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete task');
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success('Task deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (error) => {
      toast.error(`Failed to delete task: ${error.message}`);
    }
  });

  // Process submission mutation
  const processSubmissionMutation = useMutation({
    mutationFn: async ({ 
      submissionId, 
      action, 
      data 
    }: { 
      submissionId: string; 
      action: 'approve' | 'reject'; 
      data?: { reviewNote?: string; adjustedReward?: number } 
    }) => {
      const response = await fetch('/api/tasks/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionId,
          action,
          ...data
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to process submission');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      toast.success(`Submission ${variables.action}d successfully`);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (error) => {
      toast.error(`Failed to process submission: ${error.message}`);
    }
  });

  // Bulk process submissions mutation
  const bulkProcessSubmissionsMutation = useMutation({
    mutationFn: async ({ 
      submissionIds, 
      action, 
      data 
    }: { 
      submissionIds: string[]; 
      action: 'approve' | 'reject'; 
      data?: { reviewNote?: string } 
    }) => {
      const response = await fetch('/api/tasks/submissions/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submissionIds,
          action,
          ...data
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to process submissions');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      toast.success(`${variables.submissionIds.length} submissions ${variables.action}d successfully`);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (error) => {
      toast.error(`Failed to process submissions: ${error.message}`);
    }
  });

  return {
    tasks: tasksQuery.data?.data || [],
    totalTasks: tasksQuery.data?.pagination?.total || 0,
    submissions: submissionsQuery.data?.data || [],
    totalSubmissions: submissionsQuery.data?.pagination?.total || 0,
    analytics: analyticsQuery.data || null,
    isLoading: tasksQuery.isLoading || submissionsQuery.isLoading,
    error: tasksQuery.error?.message || submissionsQuery.error?.message || null,
    createTask: createTaskMutation.mutateAsync,
    updateTask: (taskId: string, data: Partial<Task>) => updateTaskMutation.mutateAsync({ taskId, data }),
    deleteTask: deleteTaskMutation.mutateAsync,
    processSubmission: (submissionId: string, action: 'approve' | 'reject', data?: { reviewNote?: string; adjustedReward?: number }) => 
      processSubmissionMutation.mutateAsync({ submissionId, action, data }),
    bulkProcessSubmissions: (submissionIds: string[], action: 'approve' | 'reject', data?: { reviewNote?: string }) => 
      bulkProcessSubmissionsMutation.mutateAsync({ submissionIds, action, data }),
    refreshTasks: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
    refreshSubmissions: () => queryClient.invalidateQueries({ queryKey: ['tasks', 'submissions'] })
  };
}