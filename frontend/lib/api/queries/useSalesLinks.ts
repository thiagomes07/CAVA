import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import type { SalesLink } from '@/lib/types';
import type { LinkFilter } from '@/lib/schemas/link.schema';

interface SalesLinksResponse {
  links: SalesLink[];
  total: number;
  page: number;
}

export const salesLinkKeys = {
  all: ['sales-links'] as const,
  lists: () => [...salesLinkKeys.all, 'list'] as const,
  list: (filters: Partial<LinkFilter>) => [...salesLinkKeys.lists(), filters] as const,
  details: () => [...salesLinkKeys.all, 'detail'] as const,
  detail: (id: string) => [...salesLinkKeys.details(), id] as const,
  public: (slug: string) => [...salesLinkKeys.all, 'public', slug] as const,
  validateSlug: (slug: string) => [...salesLinkKeys.all, 'validate', slug] as const,
};

const defaultFilters = {
  page: 1,
  limit: 25,
};

export function useSalesLinks(filters: Partial<LinkFilter> = {}) {
  const mergedFilters = { ...defaultFilters, ...filters };
  
  return useQuery({
    queryKey: salesLinkKeys.list(mergedFilters),
    queryFn: async () => {
      const data = await apiClient.get<SalesLinksResponse>('/sales-links', {
        params: mergedFilters,
      });
      return data;
    },
  });
}

export function useSalesLink(id: string) {
  return useQuery({
    queryKey: salesLinkKeys.detail(id),
    queryFn: async () => {
      const data = await apiClient.get<SalesLink>(`/sales-links/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function usePublicLink(slug: string) {
  return useQuery({
    queryKey: salesLinkKeys.public(slug),
    queryFn: async () => {
      const data = await apiClient.get<SalesLink>(`/public/links/${slug}`);
      return data;
    },
    enabled: !!slug,
  });
}

export function useValidateSlug(slug: string) {
  return useQuery({
    queryKey: salesLinkKeys.validateSlug(slug),
    queryFn: async () => {
      const data = await apiClient.get<{ valid: boolean }>('/sales-links/validate-slug', {
        params: { slug },
      });
      return data;
    },
    enabled: !!slug && slug.length >= 3,
  });
}
