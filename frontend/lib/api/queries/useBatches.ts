import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import type { Batch } from '@/lib/types';
import type { BatchFilter } from '@/lib/schemas/batch.schema';

interface BatchesResponse {
  batches: Batch[];
  total: number;
  page: number;
}

export const batchKeys = {
  all: ['batches'] as const,
  lists: () => [...batchKeys.all, 'list'] as const,
  list: (filters: Partial<BatchFilter>) => [...batchKeys.lists(), filters] as const,
  details: () => [...batchKeys.all, 'detail'] as const,
  detail: (id: string) => [...batchKeys.details(), id] as const,
  status: (id: string) => [...batchKeys.all, 'status', id] as const,
};

const defaultFilters: BatchFilter = {
  page: 1,
  limit: 50,
};

export function useBatches(filters: Partial<BatchFilter> = {}) {
  const mergedFilters = { ...defaultFilters, ...filters };
  
  return useQuery({
    queryKey: batchKeys.list(mergedFilters),
    queryFn: async () => {
      const data = await apiClient.get<BatchesResponse>('/batches', {
        params: mergedFilters,
      });
      return data;
    },
  });
}

export function useBatch(id: string) {
  return useQuery({
    queryKey: batchKeys.detail(id),
    queryFn: async () => {
      const data = await apiClient.get<Batch>(`/batches/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useBatchStatus(id: string) {
  return useQuery({
    queryKey: batchKeys.status(id),
    queryFn: async () => {
      const data = await apiClient.get<Batch>(`/batches/${id}/status`);
      return data;
    },
    enabled: !!id,
  });
}
