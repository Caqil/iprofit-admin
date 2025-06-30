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
      
      console.log('🔍 useTasks - Fetching tasks with filters:', filters);
      
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

      console.log('🔍 useTasks - API call URL:', `/api/tasks?${params.toString()}`);

      const response = await fetch(`/api/tasks?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ useTasks - API Error:', {
          status: response.status,
          statusText: response.statusText,
          errorData
        });
        throw new Error(errorData.message || `Failed to fetch tasks: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ useTasks - API Response:', {
        tasksCount: data.data?.length || 0,
        totalTasks: data.pagination?.total || 0,
        pagination: data.pagination
      });

      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Submissions query - Fixed to not use task filters
  const submissionsQuery = useQuery({
    queryKey: ['tasks', 'submissions', pagination],
    queryFn: async (): Promise<ListResponse<TaskSubmission>> => {
      const params = new URLSearchParams();
      
      // Only add pagination parameters - no task filters
      if (pagination) {
        params.append('page', pagination.page.toString());
        params.append('limit', pagination.limit.toString());
        if (pagination.sortBy) params.append('sortBy', pagination.sortBy);
        if (pagination.sortOrder) params.append('sortOrder', pagination.sortOrder);
      }

      console.log('🔍 useTasks - Fetching submissions with URL:', `/api/tasks/submissions?${params.toString()}`);

      const response = await fetch(`/api/tasks/submissions?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ useTasks - Submissions API Error:', {
          status: response.status,
          statusText: response.statusText,
          errorData
        });
        throw new Error(errorData.message || `Failed to fetch submissions: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ useTasks - Submissions Response:', {
        submissionsCount: data.data?.length || 0,
        totalSubmissions: data.pagination?.total || 0
      });

      return data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2
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
      return data.data || data; // Handle different response formats
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (data: Partial<Task>) => {
      console.log('📝 useTasks - Creating task:', data);
      
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to create task' }));
        throw new Error(error.message || 'Failed to create task');
      }

      const result = await response.json();
      console.log('✅ useTasks - Task created:', result);
      return result;
    },
    onSuccess: () => {
      toast.success('Task created successfully');
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (error) => {
      console.error('❌ useTasks - Create task error:', error);
      toast.error(`Failed to create task: ${error.message}`);
    }
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, data }: { taskId: string; data: Partial<Task> }) => {
      console.log('📝 useTasks - Updating task:', { taskId, data });
      
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to update task' }));
        throw new Error(error.message || 'Failed to update task');
      }

      const result = await response.json();
      console.log('✅ useTasks - Task updated:', result);
      return result;
    },
    onSuccess: () => {
      toast.success('Task updated successfully');
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (error) => {
      console.error('❌ useTasks - Update task error:', error);
      toast.error(`Failed to update task: ${error.message}`);
    }
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      console.log('🗑️ useTasks - Deleting task:', taskId);
      
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to delete task' }));
        throw new Error(error.message || 'Failed to delete task');
      }

      const result = await response.json();
      console.log('✅ useTasks - Task deleted:', result);
      return result;
    },
    onSuccess: () => {
      toast.success('Task deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (error) => {
      console.error('❌ useTasks - Delete task error:', error);
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
      console.log('📝 useTasks - Processing submission:', { submissionId, action, data });
      
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
        const error = await response.json().catch(() => ({ message: 'Failed to process submission' }));
        throw new Error(error.message || 'Failed to process submission');
      }

      const result = await response.json();
      console.log('✅ useTasks - Submission processed:', result);
      return result;
    },
    onSuccess: (_, variables) => {
      toast.success(`Submission ${variables.action}d successfully`);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (error) => {
      console.error('❌ useTasks - Process submission error:', error);
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
      console.log('📝 useTasks - Bulk processing submissions:', { submissionIds, action, data });
      
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
        const error = await response.json().catch(() => ({ message: 'Failed to process submissions' }));
        throw new Error(error.message || 'Failed to process submissions');
      }

      const result = await response.json();
      console.log('✅ useTasks - Submissions bulk processed:', result);
      return result;
    },
    onSuccess: (_, variables) => {
      toast.success(`${variables.submissionIds.length} submissions ${variables.action}d successfully`);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (error) => {
      console.error('❌ useTasks - Bulk process error:', error);
      toast.error(`Failed to process submissions: ${error.message}`);
    }
  });

  // Helper function to extract data from potentially nested API response
  const extractTasksData = (response: any) => {
    console.log('🔍 extractTasksData - Raw response:', response);
    
    // Handle different response structures
    if (response?.data?.data && Array.isArray(response.data.data)) {
      // Nested structure: { success: true, data: { data: [...], pagination: {...} } }
      console.log('✅ extractTasksData - Using nested data structure');
      return {
        tasks: response.data.data,
        totalTasks: response.data.pagination?.total || 0
      };
    } else if (response?.data && Array.isArray(response.data)) {
      // Direct structure: { success: true, data: [...], pagination: {...} }
      console.log('✅ extractTasksData - Using direct data structure');
      return {
        tasks: response.data,
        totalTasks: response.pagination?.total || 0
      };
    } else if (Array.isArray(response)) {
      // Raw array: [...]
      console.log('✅ extractTasksData - Using raw array');
      return {
        tasks: response,
        totalTasks: response.length
      };
    } else {
      console.log('❌ extractTasksData - Unknown structure, using empty array');
      return {
        tasks: [],
        totalTasks: 0
      };
    }
  };

  const extractSubmissionsData = (response: any) => {
    if (response?.data?.data && Array.isArray(response.data.data)) {
      return {
        submissions: response.data.data,
        totalSubmissions: response.data.pagination?.total || 0
      };
    } else if (response?.data && Array.isArray(response.data)) {
      return {
        submissions: response.data,
        totalSubmissions: response.pagination?.total || 0
      };
    } else if (Array.isArray(response)) {
      return {
        submissions: response,
        totalSubmissions: response.length
      };
    } else {
      return {
        submissions: [],
        totalSubmissions: 0
      };
    }
  };

  const tasksData = extractTasksData(tasksQuery.data);
  const submissionsData = extractSubmissionsData(submissionsQuery.data);

  return {
    tasks: tasksData.tasks,
    totalTasks: tasksData.totalTasks,
    submissions: submissionsData.submissions,
    totalSubmissions: submissionsData.totalSubmissions,
    analytics: analyticsQuery.data || null,
    isLoading: tasksQuery.isLoading || submissionsQuery.isLoading || analyticsQuery.isLoading,
    error: tasksQuery.error?.message || submissionsQuery.error?.message || analyticsQuery.error?.message || null,
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