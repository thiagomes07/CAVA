import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import type { Industry } from '@/lib/types';

export const industryKeys = {
    config: ['industry-config'] as const,
};

export function useIndustryConfig() {
    return useQuery({
        queryKey: industryKeys.config,
        queryFn: async () => {
            const data = await apiClient.get<Industry>('/industry-config');
            // Retorna os dados diretamente sem transformação adicional
            return data;
        },
        // Adiciona configurações para evitar problemas de cache
        staleTime: 5 * 60 * 1000, // 5 minutos
        gcTime: 10 * 60 * 1000, // 10 minutos (antes era cacheTime)
        refetchOnWindowFocus: false,
        retry: 1,
    });
}

export function useUpdateIndustryConfig() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: Partial<Industry>) => {
            const response = await apiClient.patch<Industry>('/industry-config', data);
            return response;
        },
        onSuccess: (updatedIndustry) => {
            // Atualiza o cache com os novos dados
            queryClient.setQueryData(industryKeys.config, updatedIndustry);
        },
    });
}

export function useUploadIndustryLogo() {
    return useMutation({
        mutationFn: async (file: File) => {
            const formData = new FormData();
            formData.append('logo', file);

            const response = await apiClient.post<{ urls: string[] }>('/upload/industry-logo', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            return response.urls[0];
        },
    });
}

export function useDeleteIndustryLogo() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            await apiClient.delete('/industry-config/logo');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: industryKeys.config });
        },
    });
}