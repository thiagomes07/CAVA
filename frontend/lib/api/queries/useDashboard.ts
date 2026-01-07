import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import type { DashboardMetrics, Activity } from '@/lib/types';

export const dashboardKeys = {
  all: ['dashboard'] as const,
  metrics: () => [...dashboardKeys.all, 'metrics'] as const,
  activities: () => [...dashboardKeys.all, 'activities'] as const,
  brokerMetrics: () => [...dashboardKeys.all, 'broker-metrics'] as const,
};

export function useDashboardMetrics() {
  return useQuery({
    queryKey: dashboardKeys.metrics(),
    queryFn: async () => {
      const data = await apiClient.get<DashboardMetrics>('/dashboard/metrics');
      return data;
    },
  });
}

export function useRecentActivities() {
  return useQuery({
    queryKey: dashboardKeys.activities(),
    queryFn: async () => {
      const data = await apiClient.get<Activity[]>('/dashboard/recent-activities');
      return data;
    },
  });
}

export function useBrokerDashboardMetrics() {
  return useQuery({
    queryKey: dashboardKeys.brokerMetrics(),
    queryFn: async () => {
      const data = await apiClient.get<DashboardMetrics>('/broker/dashboard/metrics');
      return data;
    },
  });
}
