import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { userKeys } from '@/lib/api/queries/useUsers';
import type { User } from '@/lib/types';
import type { InviteBrokerInput } from '@/lib/schemas/auth.schema';

export function useInviteBroker() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: InviteBrokerInput) => {
      const response = await apiClient.post<User>('/brokers/invite', data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.brokers() });
    },
  });
}

export function useCreateSeller() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; email: string; phone?: string }) => {
      const response = await apiClient.post<User>('/users', {
        ...data,
        role: 'VENDEDOR_INTERNO',
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.sellers() });
    },
  });
}

export function useToggleUserStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const response = await apiClient.patch<User>(`/users/${id}/status`, { isActive });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}
