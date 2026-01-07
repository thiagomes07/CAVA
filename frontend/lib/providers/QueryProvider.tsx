'use client';

import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api/client';

interface QueryProviderProps {
  children: ReactNode;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'BATCH_NOT_AVAILABLE') {
      return 'Este lote não está mais disponível';
    }

    if (error.code === 'UNAUTHORIZED') {
      return 'Você não tem permissão para esta ação';
    }

    if (error.code === 'VALIDATION_ERROR') {
      return error.message || 'Verifique os campos e tente novamente';
    }

    return error.message || 'Algo deu errado. Tente novamente.';
  }

  if (error instanceof Error) {
    // Fetch/network errors commonly surface as TypeError
    if (error.name === 'TypeError') {
      return 'Erro de conexão. Verifique sua internet.';
    }
    return error.message;
  }

  return 'Algo deu errado. Tente novamente.';
}

// Custom error handler for global error management
const handleError = (error: unknown) => {
  // Don't show toast for 401 errors (handled by auth interceptor)
  if (error instanceof ApiError && error.status === 401) {
    return;
  }

  // Don't show toast for 404 errors (usually handled by UI)
  if (error instanceof ApiError && error.status === 404) {
    return;
  }

  if (process.env.NODE_ENV !== 'production') {
    console.error('Query error:', error);
  }

  const message = getErrorMessage(error);
  
  toast.error(message, {
    duration: 5000,
    position: 'top-right',
  });
};

// Factory function to create QueryClient with proper configuration
function makeQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: handleError,
    }),
    mutationCache: new MutationCache({
      onError: handleError,
    }),
    defaultOptions: {
      queries: {
        // Data is considered fresh for 60 seconds to keep estoque/reservas atualizados
        staleTime: 60 * 1000,
        // Cache is garbage collected after 5 minutes
        gcTime: 5 * 60 * 1000,
        // Retry failed requests up to 3 times with exponential backoff
        retry: (failureCount, error) => {
          // Don't retry on 4xx errors (client errors)
          if (error instanceof Error) {
            const status = (error as Error & { status?: number }).status;
            if (status && status >= 400 && status < 500) {
              return false;
            }
          }
          return failureCount < 3;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        // Keep previous data while refetching
        refetchOnWindowFocus: false,
      },
      mutations: {
        // Retry failed mutations once
        retry: 1,
      },
    },
  });
}

// Singleton for server-side rendering
let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return makeQueryClient();
  }
  
  // Browser: make a new query client if we don't already have one
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  
  return browserQueryClient;
}

export function QueryProvider({ children }: QueryProviderProps) {
  // Use a lazy initializer to ensure consistent client between server/client
  const [queryClient] = useState(getQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
