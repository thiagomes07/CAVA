import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import type { Product } from '@/lib/types';
import type { ProductFilter } from '@/lib/schemas/product.schema';

interface ProductsResponse {
  products: Product[];
  total: number;
  page: number;
}

export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (filters: Partial<ProductFilter>) => [...productKeys.lists(), filters] as const,
  details: () => [...productKeys.all, 'detail'] as const,
  detail: (id: string) => [...productKeys.details(), id] as const,
};

const defaultFilters = {
  page: 1,
  limit: 24,
  includeInactive: false,
};

export function useProducts(filters: Partial<ProductFilter> = {}) {
  const mergedFilters = { ...defaultFilters, ...filters };
  
  return useQuery({
    queryKey: productKeys.list(mergedFilters),
    queryFn: async () => {
      const data = await apiClient.get<ProductsResponse>('/products', {
        params: mergedFilters,
      });
      return data;
    },
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: async () => {
      const data = await apiClient.get<Product>(`/products/${id}`);
      return data;
    },
    enabled: !!id,
  });
}
