import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  DashboardMetrics, 
  ChartData, 
  DashboardFilter, 
  TimeSeriesData,
  SystemAlert 
} from '@/types';
import { useState, useEffect } from 'react';

interface DashboardHookReturn {
  metrics: DashboardMetrics | undefined;
  chartData: ChartData | undefined;
  alerts: SystemAlert[];
  isLoading: boolean;
  error: string | null;
  filters: DashboardFilter;
  setFilters: (filters: Partial<DashboardFilter>) => void;
  refreshData: () => void;
  isRefreshing: boolean;
}

export function useDashboard(): DashboardHookReturn {
  const queryClient = useQueryClient();
  const [filters, setFiltersState] = useState<DashboardFilter>({
    dateRange: 'month',
    currency: 'BDT'
  });

  // Dashboard metrics query
  const metricsQuery = useQuery({
    queryKey: ['dashboard', 'metrics', filters],
    queryFn: async (): Promise<DashboardMetrics> => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value.toString());
      });

      const response = await fetch(`/api/dashboard/metrics?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard metrics');
      }

      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 30 * 1000 // 30 seconds
  });

  // Chart data query
  const chartDataQuery = useQuery({
    queryKey: ['dashboard', 'charts', filters],
    queryFn: async (): Promise<ChartData> => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value.toString());
      });

      const response = await fetch(`/api/dashboard/charts?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch chart data');
      }

      return response.json();
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 60 * 1000 // 1 minute
  });

  // System alerts query
  const alertsQuery = useQuery({
    queryKey: ['dashboard', 'alerts'],
    queryFn: async (): Promise<SystemAlert[]> => {
      const response = await fetch('/api/dashboard/alerts');
      if (!response.ok) {
        throw new Error('Failed to fetch alerts');
      }

      const data = await response.json();
      return data.data || [];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 30 * 1000
  });

  const setFilters = (newFilters: Partial<DashboardFilter>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  };

  const refreshData = () => {
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  return {
    metrics: metricsQuery.data,
    chartData: chartDataQuery.data,
    alerts: alertsQuery.data || [],
    isLoading: metricsQuery.isLoading || chartDataQuery.isLoading,
    error: metricsQuery.error?.message || chartDataQuery.error?.message || null,
    filters,
    setFilters,
    refreshData,
    isRefreshing: metricsQuery.isFetching || chartDataQuery.isFetching
  };
}
