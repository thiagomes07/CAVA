import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { clienteKeys } from '@/lib/api/queries/useClientes';
import type { Cliente } from '@/lib/types';
import type { ClienteCaptureInput } from '@/lib/schemas/link.schema';

export function useCreateCliente() {
  return useMutation({
    mutationFn: async (data: ClienteCaptureInput & { salesLinkId: string }) => {
      const response = await apiClient.post<{ success: boolean }>(
        '/public/clientes/interest',
        data
      );
      return response;
    },
  });
}

export function useUpdateClienteStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await apiClient.patch<Cliente>(`/clientes/${id}/status`, { status });
      return response;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: clienteKeys.all });
      queryClient.invalidateQueries({ queryKey: clienteKeys.detail(id) });
    },
  });
}
