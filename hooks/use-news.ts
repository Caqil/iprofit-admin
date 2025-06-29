// hooks/use-news.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  News, 
  NewsFilter, 
  NewsAnalytics, 
  NewsCategory,
  NewsCreateRequest,
  NewsUpdateRequest,
  PaginationParams,
  ListResponse 
} from '@/types';
import { toast } from 'sonner';

interface ApiResponseWrapper<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  stats?: any;
}

interface NewsHookReturn {
  news: News[];
  totalNews: number;
  categories: NewsCategory[];
  analytics: NewsAnalytics | undefined;
  isLoading: boolean;
  isAnalyticsLoading: boolean;
  error: string | null;
  createNews: (data: NewsCreateRequest) => Promise<News>;
  updateNews: (newsId: string, data: NewsUpdateRequest) => Promise<News>;
  deleteNews: (newsId: string) => Promise<void>;
  publishNews: (newsId: string) => Promise<void>;
  unpublishNews: (newsId: string) => Promise<void>;
  archiveNews: (newsId: string) => Promise<void>;
  stickNews: (newsId: string) => Promise<void>;
  unstickNews: (newsId: string) => Promise<void>;
  bulkAction: (action: string, ids: string[], data?: any) => Promise<void>;
  refreshNews: () => void;
}

export function useNews(
  filters?: NewsFilter,
  pagination?: PaginationParams
): NewsHookReturn {
  const queryClient = useQueryClient();

  // News list query
  const newsQuery = useQuery({
    queryKey: ['news', 'list', filters, pagination],
    queryFn: async (): Promise<ApiResponseWrapper<News[]>> => {
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
      } else {
        // Default pagination
        params.append('page', '1');
        params.append('limit', '10');
        params.append('sortBy', 'createdAt');
        params.append('sortOrder', 'desc');
      }

      console.log('🗞️ News Hook - Fetching with params:', params.toString());

      const response = await fetch(`/api/news?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch news');
      }

      return response.json();
    },
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: false
  });

  // Categories query
  const categoriesQuery = useQuery({
    queryKey: ['news', 'categories'],
    queryFn: async (): Promise<NewsCategory[]> => {
      const response = await fetch('/api/news/categories');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch categories');
      }

      const data = await response.json();
      return data.categories || [];
    },
    staleTime: 10 * 60 * 1000 // 10 minutes
  });

  // Analytics query
  const analyticsQuery = useQuery({
    queryKey: ['news', 'analytics', filters],
    queryFn: async (): Promise<NewsAnalytics> => {
      const params = new URLSearchParams();
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            params.append(key, value.toString());
          }
        });
      }

      const response = await fetch(`/api/news/analytics?${params}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch analytics');
      }

      const data = await response.json();
      return data.overview || {};
    },
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  // Create news mutation
  const createNewsMutation = useMutation({
    mutationFn: async (data: NewsCreateRequest): Promise<News> => {
      const response = await fetch('/api/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create news article');
      }

      const result = await response.json();
      return result.data || result;
    },
    onSuccess: (data, variables) => {
      toast.success(`News article "${data.title}" created successfully`);
      queryClient.invalidateQueries({ queryKey: ['news'] });
    },
    onError: (error) => {
      toast.error(`Failed to create article: ${error.message}`);
    }
  });

  // Update news mutation
  const updateNewsMutation = useMutation({
    mutationFn: async ({ newsId, data }: { newsId: string; data: NewsUpdateRequest }): Promise<News> => {
      const response = await fetch(`/api/news/${newsId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update news article');
      }

      const result = await response.json();
      return result.data || result;
    },
    onSuccess: (data) => {
      toast.success(`Article "${data.title}" updated successfully`);
      queryClient.invalidateQueries({ queryKey: ['news'] });
    },
    onError: (error) => {
      toast.error(`Failed to update article: ${error.message}`);
    }
  });

  // Delete news mutation
  const deleteNewsMutation = useMutation({
    mutationFn: async (newsId: string): Promise<void> => {
      const response = await fetch(`/api/news/${newsId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete news article');
      }
    },
    onSuccess: () => {
      toast.success('News article deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['news'] });
    },
    onError: (error) => {
      toast.error(`Failed to delete article: ${error.message}`);
    }
  });

  // Publish news mutation
  const publishNewsMutation = useMutation({
    mutationFn: async (newsId: string): Promise<void> => {
      const response = await fetch(`/api/news/${newsId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'publish' })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to publish article');
      }
    },
    onSuccess: () => {
      toast.success('Article published successfully');
      queryClient.invalidateQueries({ queryKey: ['news'] });
    },
    onError: (error) => {
      toast.error(`Failed to publish article: ${error.message}`);
    }
  });

  // Unpublish news mutation
  const unpublishNewsMutation = useMutation({
    mutationFn: async (newsId: string): Promise<void> => {
      const response = await fetch(`/api/news/${newsId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unpublish' })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to unpublish article');
      }
    },
    onSuccess: () => {
      toast.success('Article unpublished successfully');
      queryClient.invalidateQueries({ queryKey: ['news'] });
    },
    onError: (error) => {
      toast.error(`Failed to unpublish article: ${error.message}`);
    }
  });

  // Archive news mutation
  const archiveNewsMutation = useMutation({
    mutationFn: async (newsId: string): Promise<void> => {
      const response = await fetch(`/api/news/${newsId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'archive' })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to archive article');
      }
    },
    onSuccess: () => {
      toast.success('Article archived successfully');
      queryClient.invalidateQueries({ queryKey: ['news'] });
    },
    onError: (error) => {
      toast.error(`Failed to archive article: ${error.message}`);
    }
  });

  // Stick news mutation
  const stickNewsMutation = useMutation({
    mutationFn: async (newsId: string): Promise<void> => {
      const response = await fetch(`/api/news/${newsId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stick' })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to stick article');
      }
    },
    onSuccess: () => {
      toast.success('Article sticked to top');
      queryClient.invalidateQueries({ queryKey: ['news'] });
    },
    onError: (error) => {
      toast.error(`Failed to stick article: ${error.message}`);
    }
  });

  // Unstick news mutation
  const unstickNewsMutation = useMutation({
    mutationFn: async (newsId: string): Promise<void> => {
      const response = await fetch(`/api/news/${newsId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unstick' })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to unstick article');
      }
    },
    onSuccess: () => {
      toast.success('Article removed from top');
      queryClient.invalidateQueries({ queryKey: ['news'] });
    },
    onError: (error) => {
      toast.error(`Failed to unstick article: ${error.message}`);
    }
  });

  // Bulk action mutation
  const bulkActionMutation = useMutation({
    mutationFn: async ({ action, ids, data }: { action: string; ids: string[]; data?: any }): Promise<void> => {
      const response = await fetch('/api/news', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ids, data })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to perform bulk action');
      }
    },
    onSuccess: (_, variables) => {
      toast.success(`Bulk ${variables.action} completed successfully`);
      queryClient.invalidateQueries({ queryKey: ['news'] });
    },
    onError: (error) => {
      toast.error(`Bulk action failed: ${error.message}`);
    }
  });

  return {
    news: newsQuery.data?.data || [],
    totalNews: newsQuery.data?.pagination?.total || 0,
    categories: categoriesQuery.data || [],
    analytics: analyticsQuery.data,
    isLoading: newsQuery.isLoading,
    isAnalyticsLoading: analyticsQuery.isLoading,
    error: newsQuery.error?.message || categoriesQuery.error?.message || null,
    createNews: createNewsMutation.mutateAsync,
    updateNews: (newsId: string, data: NewsUpdateRequest) => 
      updateNewsMutation.mutateAsync({ newsId, data }),
    deleteNews: deleteNewsMutation.mutateAsync,
    publishNews: publishNewsMutation.mutateAsync,
    unpublishNews: unpublishNewsMutation.mutateAsync,
    archiveNews: archiveNewsMutation.mutateAsync,
    stickNews: stickNewsMutation.mutateAsync,
    unstickNews: unstickNewsMutation.mutateAsync,
    bulkAction: (action: string, ids: string[], data?: any) =>
      bulkActionMutation.mutateAsync({ action, ids, data }),
    refreshNews: () => queryClient.invalidateQueries({ queryKey: ['news'] })
  };
}

// Hook for single news article
export function useNewsArticle(newsId: string) {
  return useQuery({
    queryKey: ['news', 'detail', newsId],
    queryFn: async (): Promise<News> => {
      const response = await fetch(`/api/news/${newsId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch news article');
      }

      const data = await response.json();
      return data.data || data;
    },
    enabled: !!newsId,
    staleTime: 2 * 60 * 1000 // 2 minutes
  });
}