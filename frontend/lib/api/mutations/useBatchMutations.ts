import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { batchKeys } from '@/lib/api/queries/useBatches';
import type { Batch } from '@/lib/types';
import type { BatchInput, ReservationInput } from '@/lib/schemas/batch.schema';
import { useToast } from '@/lib/hooks/useToast';

export function useCreateBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: BatchInput & { medias?: File[] }) => {
      const response = await apiClient.post<Batch>('/batches', data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: batchKeys.all });
    },
  });
}

export function useUpdateBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<BatchInput> }) => {
      const response = await apiClient.put<Batch>(`/batches/${id}`, data);
      return response;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: batchKeys.all });
      queryClient.invalidateQueries({ queryKey: batchKeys.detail(id) });
    },
  });
}

export function useUpdateBatchStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await apiClient.patch<Batch>(`/batches/${id}/status`, { status });
      return response;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: batchKeys.all });
      queryClient.invalidateQueries({ queryKey: batchKeys.detail(id) });
    },
  });
}

export function useReserveBatch() {
  const queryClient = useQueryClient();
  const { error: toastError } = useToast();

  return useMutation({
    mutationFn: async (data: ReservationInput) => {
      const response = await apiClient.post('/reservations', data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: batchKeys.all });
    },
    // Optimistic update
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: batchKeys.all });

      const previousBatches = queryClient.getQueryData(batchKeys.lists());

      queryClient.setQueriesData(
        { queryKey: batchKeys.lists() },
        (old: { batches: Batch[] } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            batches: old.batches.map((batch: Batch) =>
              batch.id === data.batchId
                ? { ...batch, status: 'RESERVADO' as const }
                : batch
            ),
          };
        }
      );

      return { previousBatches };
    },
    onError: (_err, _data, context) => {
      if (context?.previousBatches) {
        queryClient.setQueriesData(
          { queryKey: batchKeys.lists() },
          context.previousBatches
        );
      }

      toastError('Reserva não pôde ser concluída. Tente novamente.');
    },
  });
}
