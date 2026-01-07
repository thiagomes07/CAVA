import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import type { User, UserRole } from '@/lib/types';

interface BrokerWithStats extends User {
  sharedBatchesCount: number;
}

export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (role?: UserRole) => [...userKeys.lists(), { role }] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
  brokers: () => [...userKeys.all, 'brokers'] as const,
  sellers: () => [...userKeys.all, 'sellers'] as const,
};

export function useUsers(role?: UserRole) {
  return useQuery({
    queryKey: userKeys.list(role),
    queryFn: async () => {
      const data = await apiClient.get<User[]>('/users', {
        params: role ? { role } : undefined,
      });
      return data;
    },
  });
}

export function useBrokers() {
  return useQuery({
    queryKey: userKeys.brokers(),
    queryFn: async () => {
      const data = await apiClient.get<BrokerWithStats[]>('/brokers');
      return data;
    },
  });
}

export function useSellers() {
  return useQuery({
    queryKey: userKeys.sellers(),
    queryFn: async () => {
      const data = await apiClient.get<User[]>('/users', {
        params: { role: 'VENDEDOR_INTERNO' },
      });
      return data;
    },
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: async () => {
      const data = await apiClient.get<User>(`/users/${id}`);
      return data;
    },
    enabled: !!id,
  });
}
