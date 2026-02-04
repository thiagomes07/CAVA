import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";

// Types
export interface SharedCatalogPermission {
  id: string;
  industryId: string;
  sharedWithUserId: string;
  sharedWithUserName?: string;
  sharedWithUserEmail?: string;
  canShowPrices: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SharePortfolioInput {
  brokerIds: string[];
  canShowPrices: boolean;
}

export interface SharedPortfolio {
  industryId: string;
  industryName: string;
  industrySlug: string;
  logoUrl?: string;
  productCount: number;
  canShowPrices: boolean;
}

export interface PublicPortfolioResponse {
  industry: {
    name?: string;
    description?: string;
    logoUrl?: string;
    slug?: string;
    contact?: {
      email?: string;
      phone?: string;
      whatsapp?: string;
    };
    location?: {
      country?: string;
      state?: string;
      city?: string;
      street?: string;
      number?: string;
      zipCode?: string;
    };
    socialLinks?: Array<{ name: string; url: string }>;
  };
  products: PublicProduct[];
  total: number;
  page: number;
}

export interface PublicProduct {
  id: string;
  name: string;
  sku: string;
  material: string;
  finish?: string;
  description?: string;
  medias?: Array<{ url: string; type: string }>;
  batchCount?: number;
  hasAvailable: boolean;
}

export interface PublicBatch {
  batchCode: string;
  height: number;
  width: number;
  thickness: number;
  totalArea: number;
  availableSlabs: number;
  originQuarry?: string;
  medias: Array<{ id: string; url: string; displayOrder: number }>;
  productName?: string;
  material?: string;
  finish?: string;
}

export interface CaptureLeadInput {
  name: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  message?: string;
  marketingOptIn?: boolean;
  productId?: string;
}

// Query keys
export const portfolioKeys = {
  all: ["portfolio"] as const,
  sharedBrokers: () => [...portfolioKeys.all, "shared-brokers"] as const,
  sharedPortfolios: () => [...portfolioKeys.all, "shared-portfolios"] as const,
  public: (slug: string) => [...portfolioKeys.all, "public", slug] as const,
  productBatches: (slug: string, productId: string) =>
    [
      ...portfolioKeys.all,
      "public",
      slug,
      "products",
      productId,
      "batches",
    ] as const,
};

// Hooks for Admin (Industry)
export function useSharedBrokers() {
  return useQuery({
    queryKey: portfolioKeys.sharedBrokers(),
    queryFn: async () => {
      const data =
        await apiClient.get<SharedCatalogPermission[]>("/portfolio/share");
      return data;
    },
  });
}

export function useSharePortfolio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SharePortfolioInput) => {
      const data = await apiClient.post<{
        message: string;
        sharedCount: number;
        requestedCount: number;
      }>("/portfolio/share", input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: portfolioKeys.sharedBrokers(),
      });
    },
  });
}

export function useUnsharePortfolio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (brokerId: string) => {
      await apiClient.delete(`/portfolio/share/${brokerId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: portfolioKeys.sharedBrokers(),
      });
    },
  });
}

// Hooks for Broker
export function useSharedPortfolios() {
  return useQuery({
    queryKey: portfolioKeys.sharedPortfolios(),
    queryFn: async () => {
      const data = await apiClient.get<SharedPortfolio[]>(
        "/broker/shared-portfolios",
      );
      return data;
    },
  });
}

// Hooks for Public (no auth)
export function usePublicPortfolio(
  slug: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: portfolioKeys.public(slug),
    queryFn: async () => {
      const data = await apiClient.get<PublicPortfolioResponse>(
        `/public/portfolio/${slug}`,
      );
      return data;
    },
    enabled: options?.enabled ?? !!slug,
  });
}

export function useCapturePortfolioLead(slug: string) {
  return useMutation({
    mutationFn: async (input: CaptureLeadInput) => {
      const data = await apiClient.post<{ message: string }>(
        `/public/portfolio/${slug}/lead`,
        input,
      );
      return data;
    },
  });
}

// Hook para buscar lotes públicos de um produto específico
export function usePublicProductBatches(
  slug: string,
  productId: string,
  options?: { enabled?: boolean; limit?: number },
) {
  return useQuery({
    queryKey: portfolioKeys.productBatches(slug, productId),
    queryFn: async () => {
      const params = options?.limit ? { limit: options.limit } : {};
      const data = await apiClient.get<PublicBatch[]>(
        `/public/portfolio/${slug}/products/${productId}/batches`,
        { params },
      );
      return data;
    },
    enabled: (options?.enabled ?? true) && !!slug && !!productId,
  });
}
