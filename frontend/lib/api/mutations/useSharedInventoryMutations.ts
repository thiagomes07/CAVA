import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { sharedInventoryKeys } from '@/lib/api/queries/useSharedInventory';

interface ShareBatchInput {
  batchId: string;
  sharedWithUserId: string; // Broker ou Vendedor Interno
  negotiatedPrice?: number;
}

export function useShareBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ShareBatchInput) => {
      const response = await apiClient.post('/shared-inventory-batches', data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sharedInventoryKeys.all });
    },
  });
}

export function useUnshareBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/shared-inventory-batches/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sharedInventoryKeys.all });
    },
  });
}

export function useUpdateSharedBatchPrice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, price }: { id: string; price: number }) => {
      const response = await apiClient.patch(`/broker/shared-inventory/${id}/price`, {
        negotiatedPrice: price,
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sharedInventoryKeys.all });
    },
  });
}
