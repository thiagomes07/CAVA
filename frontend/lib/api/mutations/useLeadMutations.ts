import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { leadKeys } from '@/lib/api/queries/useLeads';
import type { Lead } from '@/lib/types';
import type { LeadCaptureInput } from '@/lib/schemas/link.schema';

export function useCreateLead() {
  return useMutation({
    mutationFn: async (data: LeadCaptureInput & { salesLinkId: string }) => {
      const response = await apiClient.post<{ success: boolean }>(
        '/public/leads/interest',
        data
      );
      return response;
    },
  });
}

export function useUpdateLeadStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await apiClient.patch<Lead>(`/leads/${id}/status`, { status });
      return response;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: leadKeys.all });
      queryClient.invalidateQueries({ queryKey: leadKeys.detail(id) });
    },
  });
}
