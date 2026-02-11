import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import type {
  BIDashboard,
  SalesMetrics,
  ConversionMetrics,
  InventoryMetrics,
  BrokerPerformance,
  TrendPoint,
  ProductMetric,
  BIFilters,
} from '@/lib/types';

export const biKeys = {
  all: ['bi'] as const,
  dashboard: (filters?: BIFilters) => [...biKeys.all, 'dashboard', filters] as const,
  sales: (filters?: BIFilters) => [...biKeys.all, 'sales', filters] as const,
  conversion: (filters?: BIFilters) => [...biKeys.all, 'conversion', filters] as const,
  inventory: () => [...biKeys.all, 'inventory'] as const,
  brokers: (filters?: BIFilters) => [...biKeys.all, 'brokers', filters] as const,
  salesTrend: (filters?: BIFilters) => [...biKeys.all, 'sales-trend', filters] as const,
  topProducts: (filters?: BIFilters) => [...biKeys.all, 'top-products', filters] as const,
};

function buildQueryParams(filters?: BIFilters): string {
  if (!filters) return '';

  const params = new URLSearchParams();
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  if (filters.currency) params.append('currency', filters.currency);
  if (filters.brokerId) params.append('brokerId', filters.brokerId);
  if (filters.productId) params.append('productId', filters.productId);
  if (filters.granularity) params.append('granularity', filters.granularity);
  if (filters.limit) params.append('limit', filters.limit.toString());

  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
}

export function useBIDashboard(filters?: BIFilters) {
  return useQuery({
    queryKey: biKeys.dashboard(filters),
    queryFn: async () => {
      const queryParams = buildQueryParams(filters);
      const data = await apiClient.get<BIDashboard>(`/bi/dashboard${queryParams}`);
      return data;
    },
  });
}

export function useSalesMetrics(filters?: BIFilters) {
  return useQuery({
    queryKey: biKeys.sales(filters),
    queryFn: async () => {
      const queryParams = buildQueryParams(filters);
      const data = await apiClient.get<SalesMetrics>(`/bi/sales${queryParams}`);
      return data;
    },
  });
}

export function useConversionMetrics(filters?: BIFilters) {
  return useQuery({
    queryKey: biKeys.conversion(filters),
    queryFn: async () => {
      const queryParams = buildQueryParams(filters);
      const data = await apiClient.get<ConversionMetrics>(`/bi/conversion${queryParams}`);
      return data;
    },
  });
}

export function useInventoryMetrics(filters?: Pick<BIFilters, 'currency'>) {
  return useQuery({
    queryKey: [...biKeys.inventory(), filters] as const,
    queryFn: async () => {
      const queryParams = buildQueryParams(filters);
      const data = await apiClient.get<InventoryMetrics>(`/bi/inventory${queryParams}`);
      return data;
    },
  });
}

export function useBrokerRanking(filters?: BIFilters) {
  return useQuery({
    queryKey: biKeys.brokers(filters),
    queryFn: async () => {
      const queryParams = buildQueryParams(filters);
      const data = await apiClient.get<BrokerPerformance[]>(`/bi/brokers${queryParams}`);
      return data;
    },
  });
}

export function useSalesTrend(filters?: BIFilters) {
  return useQuery({
    queryKey: biKeys.salesTrend(filters),
    queryFn: async () => {
      const queryParams = buildQueryParams(filters);
      const data = await apiClient.get<TrendPoint[]>(`/bi/trends/sales${queryParams}`);
      return data;
    },
  });
}

export function useTopProducts(filters?: BIFilters) {
  return useQuery({
    queryKey: biKeys.topProducts(filters),
    queryFn: async () => {
      const queryParams = buildQueryParams(filters);
      const data = await apiClient.get<ProductMetric[]>(`/bi/products${queryParams}`);
      return data;
    },
  });
}

export function useRefreshBIViews() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await apiClient.post('/bi/refresh');
    },
    onSuccess: () => {
      // Invalidate all BI queries to refetch with fresh data
      queryClient.invalidateQueries({ queryKey: biKeys.all });
    },
  });
}
