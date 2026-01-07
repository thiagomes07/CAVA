import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

interface UploadResponse {
  urls: string[];
}

export function useUploadProductMedias() {
  return useMutation({
    mutationFn: async (files: File[]) => {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      files.forEach((file) => {
        if (!allowedTypes.includes(file.type)) {
          throw new Error(`Formato não suportado: ${file.type}`);
        }
      });

      const formData = new FormData();
      files.forEach((file) => {
        formData.append('medias', file);
      });

      const response = await apiClient.upload<UploadResponse>(
        '/upload/product-medias',
        formData
      );
      return response;
    },
  });
}

export function useUploadBatchMedias() {
  return useMutation({
    mutationFn: async (files: File[]) => {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      files.forEach((file) => {
        if (!allowedTypes.includes(file.type)) {
          throw new Error(`Formato não suportado: ${file.type}`);
        }
      });

      const formData = new FormData();
      files.forEach((file) => {
        formData.append('medias', file);
      });

      const response = await apiClient.upload<UploadResponse>(
        '/upload/batch-medias',
        formData
      );
      return response;
    },
  });
}

export function useDeleteMedia() {
  return useMutation({
    mutationFn: async ({ type, id }: { type: 'product' | 'batch'; id: string }) => {
      await apiClient.delete(`/${type}-medias/${id}`);
    },
  });
}
