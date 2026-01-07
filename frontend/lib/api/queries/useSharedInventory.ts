import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import type { SharedInventoryBatch } from '@/lib/types';

interface SharedInventoryFilter {
  recent?: boolean;
  limit?: number;
  status?: string;
  [key: string]: string | number | boolean | undefined;
}

export const sharedInventoryKeys = {
  all: ['shared-inventory'] as const,
  lists: () => [...sharedInventoryKeys.all, 'list'] as const,
  list: (filters: SharedInventoryFilter) => [...sharedInventoryKeys.lists(), filters] as const,
  byBroker: (brokerId: string) => [...sharedInventoryKeys.all, 'broker', brokerId] as const,
};

export function useSharedInventory(filters: SharedInventoryFilter = {}) {
  return useQuery({
    queryKey: sharedInventoryKeys.list(filters),
    queryFn: async () => {
      const data = await apiClient.get<SharedInventoryBatch[]>('/broker/shared-inventory', {
        params: filters,
      });
      return data;
    },
  });
}

export function useBrokerSharedInventory(brokerId: string) {
  return useQuery({
    queryKey: sharedInventoryKeys.byBroker(brokerId),
    queryFn: async () => {
      const data = await apiClient.get<SharedInventoryBatch[]>(
        `/brokers/${brokerId}/shared-inventory`
      );
      return data;
    },
    enabled: !!brokerId,
  });
}
