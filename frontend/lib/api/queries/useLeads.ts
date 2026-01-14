import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import type { Cliente } from '@/lib/types';
import type { ClienteFilter } from '@/lib/schemas/cliente.schema';

interface ClientesResponse {
  clientes: Cliente[];
  total: number;
  page: number;
}

export const clienteKeys = {
  all: ['clientes'] as const,
  lists: () => [...clienteKeys.all, 'list'] as const,
  list: (filters: Partial<ClienteFilter>) => [...clienteKeys.lists(), filters] as const,
  details: () => [...clienteKeys.all, 'detail'] as const,
  detail: (id: string) => [...clienteKeys.details(), id] as const,
  interactions: (id: string) => [...clienteKeys.all, 'interactions', id] as const,
};

const defaultFilters = {
  page: 1,
  limit: 25,
};

export function useClientes(filters: Partial<ClienteFilter> = {}) {
  const mergedFilters = { ...defaultFilters, ...filters };
  
  return useQuery({
    queryKey: clienteKeys.list(mergedFilters),
    queryFn: async () => {
      const data = await apiClient.get<ClientesResponse>('/clientes', {
        params: mergedFilters,
      });
      return data;
    },
  });
}

export function useCliente(id: string) {
  return useQuery({
    queryKey: clienteKeys.detail(id),
    queryFn: async () => {
      const data = await apiClient.get<Cliente>(`/clientes/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useClienteInteractions(id: string) {
  return useQuery({
    queryKey: clienteKeys.interactions(id),
    queryFn: async () => {
      const data = await apiClient.get<unknown[]>(`/clientes/${id}/interactions`);
      return data;
    },
    enabled: !!id,
  });
}
