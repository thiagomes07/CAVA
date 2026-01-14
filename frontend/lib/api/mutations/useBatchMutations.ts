import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { batchKeys } from '@/lib/api/queries/useBatches';
import type { Batch } from '@/lib/types';
import type { BatchInput, ReservationInput } from '@/lib/schemas/batch.schema';
import { useToast } from '@/lib/hooks/useToast';
import { getErrorMessage } from '@/lib/hooks/useToast';

// Mensagens de erro específicas para operações de lote
const batchErrorMessages: Record<string, string> = {
  INSUFFICIENT_SLABS: 'Quantidade de chapas insuficiente. O estoque foi alterado.',
  BATCH_NOT_FOUND: 'Lote não encontrado.',
  BATCH_NOT_AVAILABLE: 'Este lote não está mais disponível para reserva.',
  RESERVATION_EXPIRED: 'Esta reserva já expirou.',
};

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
    onError: (err: unknown, _data, context) => {
      if (context?.previousBatches) {
        queryClient.setQueriesData(
          { queryKey: batchKeys.lists() },
          context.previousBatches
        );
      }

      // Tratamento de erro específico
      const errorCode = (err as { code?: string })?.code;
      const errorDetails = (err as { details?: { requested?: number; available?: number } })?.details;
      
      let errorMessage = 'Reserva não pôde ser concluída. Tente novamente.';
      
      if (errorCode && batchErrorMessages[errorCode]) {
        errorMessage = batchErrorMessages[errorCode];
        
        // Mensagem específica para INSUFFICIENT_SLABS com detalhes
        if (errorCode === 'INSUFFICIENT_SLABS' && errorDetails) {
          errorMessage = `Chapas insuficientes: solicitado ${errorDetails.requested}, disponível ${errorDetails.available}.`;
        }
      } else if (errorCode) {
        errorMessage = getErrorMessage(errorCode);
      }

      toastError(errorMessage);
    },
  });
}
