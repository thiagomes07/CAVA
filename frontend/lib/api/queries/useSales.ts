import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import type { Sale } from '@/lib/types';

interface SalesResponse {
  sales: Sale[];
  total: number;
  page: number;
}

interface SalesSummary {
  totalSales: number;
  totalCommissions: number;
  averageTicket: number;
}

interface SalesFilter {
  startDate?: string;
  endDate?: string;
  sellerId?: string;
  page?: number;
  limit?: number;
  [key: string]: string | number | boolean | undefined;
}

export const salesKeys = {
  all: ['sales'] as const,
  lists: () => [...salesKeys.all, 'list'] as const,
  list: (filters: SalesFilter) => [...salesKeys.lists(), filters] as const,
  details: () => [...salesKeys.all, 'detail'] as const,
  detail: (id: string) => [...salesKeys.details(), id] as const,
  summary: (filters?: Partial<SalesFilter>) => [...salesKeys.all, 'summary', filters] as const,
};

export function useSales(filters: SalesFilter = {}) {
  return useQuery({
    queryKey: salesKeys.list(filters),
    queryFn: async () => {
      const data = await apiClient.get<SalesResponse>('/sales-history', {
        params: filters,
      });
      return data;
    },
  });
}

export function useSale(id: string) {
  return useQuery({
    queryKey: salesKeys.detail(id),
    queryFn: async () => {
      const data = await apiClient.get<Sale>(`/sales-history/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useSalesSummary(filters?: Partial<SalesFilter>) {
  return useQuery({
    queryKey: salesKeys.summary(filters),
    queryFn: async () => {
      const data = await apiClient.get<SalesSummary>('/sales-history/summary', {
        params: filters,
      });
      return data;
    },
  });
}
