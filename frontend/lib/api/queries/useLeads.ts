import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import type { Lead } from '@/lib/types';
import type { LeadFilter } from '@/lib/schemas/lead.schema';

interface LeadsResponse {
  leads: Lead[];
  total: number;
  page: number;
}

export const leadKeys = {
  all: ['leads'] as const,
  lists: () => [...leadKeys.all, 'list'] as const,
  list: (filters: Partial<LeadFilter>) => [...leadKeys.lists(), filters] as const,
  details: () => [...leadKeys.all, 'detail'] as const,
  detail: (id: string) => [...leadKeys.details(), id] as const,
  interactions: (id: string) => [...leadKeys.all, 'interactions', id] as const,
};

const defaultFilters = {
  page: 1,
  limit: 25,
};

export function useLeads(filters: Partial<LeadFilter> = {}) {
  const mergedFilters = { ...defaultFilters, ...filters };
  
  return useQuery({
    queryKey: leadKeys.list(mergedFilters),
    queryFn: async () => {
      const data = await apiClient.get<LeadsResponse>('/leads', {
        params: mergedFilters,
      });
      return data;
    },
  });
}

export function useLead(id: string) {
  return useQuery({
    queryKey: leadKeys.detail(id),
    queryFn: async () => {
      const data = await apiClient.get<Lead>(`/leads/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useLeadInteractions(id: string) {
  return useQuery({
    queryKey: leadKeys.interactions(id),
    queryFn: async () => {
      const data = await apiClient.get<unknown[]>(`/leads/${id}/interactions`);
      return data;
    },
    enabled: !!id,
  });
}
