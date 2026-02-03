'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/lib/hooks/useToast';
import { apiClient } from '@/lib/api/client';
import { LoadingState } from '@/components/shared/LoadingState';
import { BatchDetailModal } from '@/components/inventory/BatchDetailModal';
import type { Batch, Media, User, SharedInventoryBatch } from '@/lib/types';

export default function EditBatchPage() {
  const router = useRouter();
  const params = useParams();
  const batchId = params.id as string;
  const { success, error } = useToast();

  const [batch, setBatch] = useState<Batch | null>(null);
  const [sharedBatches, setSharedBatches] = useState<SharedInventoryBatch[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchBatch();
    fetchSharedBatches();
    fetchAvailableUsers();
  }, [batchId]);

  const fetchBatch = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.get<Batch>(`/batches/${batchId}`);
      setBatch(data);
    } catch (err) {
      error('Erro ao carregar lote');
      router.push('/inventory');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSharedBatches = async () => {
    if (!batchId) return;
    try {
      const data = await apiClient.get<SharedInventoryBatch[]>(`/batches/${batchId}/shared`);
      setSharedBatches(data);
    } catch (err) {
      // Ignorar erro se endpoint não existir ainda
    }
  };

  const fetchAvailableUsers = async () => {
    try {
      const [brokersResponse, sellersResponse] = await Promise.all([
        apiClient.get<{ brokers: User[]; total: number; page: number }>('/brokers'),
        apiClient.get<{ users: User[]; total: number; page: number }>('/users', { params: { role: 'VENDEDOR_INTERNO' } }),
      ]);
      setAvailableUsers([...brokersResponse.brokers, ...(sellersResponse.users || [])]);
    } catch (err) {
      // Ignorar erro
      console.error('Error fetching available users:', err);
    }
  };

  const handleUpdate = async (data: Partial<Batch>) => {
    try {
      await apiClient.put(`/batches/${batchId}`, data);
      success('Lote atualizado com sucesso');
      await fetchBatch();
    } catch (err) {
      error('Erro ao atualizar lote');
      throw err;
    }
  };

  const handleUpdateMedia = async (
    existingMedias: Media[],
    newMedias: File[],
    mediasToDelete: string[]
  ) => {
    try {
      // Delete removed medias
      for (const mediaId of mediasToDelete) {
        await apiClient.delete(`/batch-medias/${mediaId}`);
      }

      // Update display order and isCover for existing medias (batch)
      if (existingMedias.length > 0) {
        const payload = existingMedias.map((media, i) => ({
          id: media.id,
          displayOrder: i,
          isCover: i === 0,
        }));
        await apiClient.patch('/batch-medias/order', payload);
      }

      // Upload new medias
      if (newMedias.length > 0) {
        const formData = new FormData();
        formData.append('batchId', batchId);
        newMedias.forEach((file, index) => {
          formData.append('medias', file);
          formData.append(`displayOrders`, String(existingMedias.length + index));
        });

        await apiClient.upload(`/upload/batch-medias`, formData);
      }

      success('Fotos atualizadas com sucesso');
      await fetchBatch();
    } catch (err) {
      error('Erro ao atualizar fotos');
      throw err;
    }
  };

  const handleArchive = async () => {
    try {
      await apiClient.put(`/batches/${batchId}/archive`);
      success('Lote arquivado com sucesso');
      router.push('/inventory');
    } catch (err) {
      error('Erro ao arquivar lote');
      throw err;
    }
  };

  const handleDelete = async () => {
    try {
      await apiClient.delete(`/batches/${batchId}`);
      success('Lote deletado com sucesso');
      router.push('/inventory');
    } catch (err) {
      error('Erro ao deletar lote');
      throw err;
    }
  };

  const handleShare = async (userId: string, negotiatedPrice?: number) => {
    try {
      await apiClient.post('/shared-inventory-batches', {
        batchId,
        sharedWithUserId: userId,
        negotiatedPrice,
      });
      success('Lote compartilhado com sucesso');
      await fetchSharedBatches();
      await fetchBatch();
    } catch (err) {
      error('Erro ao compartilhar lote');
      throw err;
    }
  };

  const handleRemoveShare = async (shareId: string) => {
    try {
      await apiClient.delete(`/shared-inventory-batches/${shareId}`);
      success('Compartilhamento removido');
      await fetchSharedBatches();
    } catch (err) {
      error('Erro ao remover compartilhamento');
      throw err;
    }
  };

  const handleClose = () => {
    router.push('/inventory');
  };

  if (isLoading) {
    return <LoadingState />;
  }

  if (!batch) {
    return null;
  }

  return (
    <BatchDetailModal
      batch={batch}
      sharedBatches={sharedBatches}
      availableUsers={availableUsers}
      onClose={handleClose}
      onUpdate={handleUpdate}
      onArchive={handleArchive}
      onDelete={handleDelete}
      onShare={handleShare}
      onRemoveShare={handleRemoveShare}
      onUpdateMedia={handleUpdateMedia}
    />
  );
}
