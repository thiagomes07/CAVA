import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { salesLinkKeys } from '@/lib/api/queries/useSalesLinks';
import type { SalesLink } from '@/lib/types';
import type { SalesLinkInput } from '@/lib/schemas/link.schema';

interface CreateSalesLinkResponse {
  id: string;
  fullUrl: string;
}

export function useCreateSalesLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SalesLinkInput) => {
      const response = await apiClient.post<CreateSalesLinkResponse>('/sales-links', data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: salesLinkKeys.all });
    },
  });
}

export function useUpdateSalesLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SalesLinkInput> }) => {
      const response = await apiClient.patch<SalesLink>(`/sales-links/${id}`, data);
      return response;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: salesLinkKeys.all });
      queryClient.invalidateQueries({ queryKey: salesLinkKeys.detail(id) });
    },
  });
}

export function useDeleteSalesLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/sales-links/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: salesLinkKeys.all });
    },
  });
}
