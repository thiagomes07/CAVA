'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Plus, X, Search, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Toggle } from '@/components/ui/toggle';
import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalContent,
  ModalFooter,
  ModalClose,
} from '@/components/ui/modal';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/lib/hooks/useToast';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { formatDimensions, formatArea } from '@/lib/utils/formatDimensions';
import { formatDate } from '@/lib/utils/formatDate';
import { truncateText } from '@/lib/utils/truncateText';
import { TRUNCATION_LIMITS } from '@/lib/config/truncationLimits';
import type { User, Batch, SharedInventoryBatch } from '@/lib/types';
import { cn } from '@/lib/utils/cn';
import { isPlaceholderUrl } from '@/lib/utils/media';

export default function BrokerSharedInventoryPage() {
  const router = useRouter();
  const params = useParams();
  const brokerId = params.id as string;
  const { success, error } = useToast();

  const [broker, setBroker] = useState<User | null>(null);
  const [sharedBatches, setSharedBatches] = useState<SharedInventoryBatch[]>([]);
  const [availableBatches, setAvailableBatches] = useState<Batch[]>([]);
  const [catalogPermission, setCatalogPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const { register, handleSubmit, reset } = useForm<{ negotiatedPrice?: number }>();

  useEffect(() => {
    fetchBrokerData();
  }, [brokerId]);

  const fetchBrokerData = async () => {
    try {
      setIsLoading(true);

      const [brokerData, sharedData, availableData, permissionData] = await Promise.all([
        apiClient.get<User>(`/brokers/${brokerId}`),
        apiClient.get<SharedInventoryBatch[]>(`/brokers/${brokerId}/shared-inventory`),
        apiClient.get<{ batches: Batch[] }>('/batches', {
          params: { status: 'DISPONIVEL', limit: 1000 },
        }),
        apiClient.get<{ hasPermission: boolean }>(
          `/brokers/${brokerId}/catalog-permission`
        ),
      ]);

      setBroker(brokerData);
      setSharedBatches(sharedData);
      setAvailableBatches(availableData.batches);
      setCatalogPermission(permissionData.hasPermission);
    } catch (err) {
      error('Erro ao carregar dados');
      router.push('/brokers');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenShareModal = (batch: Batch) => {
    setSelectedBatch(batch);
    reset({ negotiatedPrice: batch.industryPrice });
    setShowShareModal(true);
  };

  const onSubmitShare = async (data: { negotiatedPrice?: number }) => {
    if (!selectedBatch) return;

    try {
      setIsSubmitting(true);

      await apiClient.post('/shared-inventory-batches', {
        batchId: selectedBatch.id,
        sharedWithUserId: brokerId,
        negotiatedPrice: data.negotiatedPrice || selectedBatch.industryPrice,
      });

      success(`Lote compartilhado com ${broker?.name}`);
      setShowShareModal(false);
      setSelectedBatch(null);
      fetchBrokerData();
    } catch (err) {
      error('Erro ao compartilhar lote');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveShare = async (shareId: string) => {
    try {
      await apiClient.delete(`/shared-inventory-batches/${shareId}`);
      success('Compartilhamento removido');
      fetchBrokerData();
    } catch (err) {
      error('Erro ao remover compartilhamento');
    }
  };

  const handleToggleCatalogPermission = async (newValue: boolean) => {
    try {
      if (newValue) {
        await apiClient.post('/shared-catalog-permissions', {
          sharedWithUserId: brokerId,
        });
        success('Acesso ao catálogo concedido');
      } else {
        await apiClient.delete(`/shared-catalog-permissions/${brokerId}`);
        success('Acesso ao catálogo removido');
      }
      setCatalogPermission(newValue);
    } catch (err) {
      error('Erro ao alterar permissão');
    }
  };

  const filteredAvailableBatches = availableBatches.filter((batch) => {
    const isAlreadyShared = sharedBatches.some((sb) => sb.batchId === batch.id);
    if (isAlreadyShared) return false;

    if (!searchTerm) return true;

    const searchLower = searchTerm.toLowerCase();
    return (
      batch.batchCode.toLowerCase().includes(searchLower) ||
      batch.product?.name.toLowerCase().includes(searchLower)
    );
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-mineral">
        <div className="px-8 py-8">
          <LoadingState variant="dashboard" />
        </div>
      </div>
    );
  }

  if (!broker) return null;

  return (
    <div className="min-h-screen bg-mineral">
      {/* Header */}
      <div className="bg-porcelain border-b border-slate-100 px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-slate-100 rounded-sm transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="font-serif text-3xl text-obsidian">
                  Estoque Compartilhado
                </h1>
              </div>
              <p className="text-sm text-slate-500">
                Gerenciar compartilhamentos com <strong title={broker.name}>{truncateText(broker.name, TRUNCATION_LIMITS.USER_NAME)}</strong>
              </p>
            </div>
          </div>

          <Button
            variant="primary"
            onClick={() => {
              if (filteredAvailableBatches.length > 0) {
                handleOpenShareModal(filteredAvailableBatches[0]);
              }
            }}
            disabled={availableBatches.length === 0}
          >
            <Plus className="w-4 h-4 mr-2" />
            COMPARTILHAR LOTE
          </Button>
        </div>
      </div>

      <div className="px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Shared Batches */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <h2 className="text-lg font-semibold text-obsidian mb-6">
                Lotes Compartilhados ({sharedBatches.length})
              </h2>

              {sharedBatches.length === 0 ? (
                <EmptyState
                  icon={Package}
                  title="Nenhum lote compartilhado"
                  description="Compartilhe lotes do seu estoque com este broker"
                />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Lote</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead>Dimensões</TableHead>
                        <TableHead>Preço Negociado</TableHead>
                        <TableHead>Compartilhado em</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sharedBatches.map((shared) => (
                        <TableRow key={shared.id}>
                          <TableCell>
                            <span 
                              className="font-mono text-sm text-obsidian"
                              title={shared.batch.batchCode}
                            >
                              {truncateText(shared.batch.batchCode, TRUNCATION_LIMITS.BATCH_CODE)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span 
                              className="text-slate-600"
                              title={shared.batch.product?.name}
                            >
                              {truncateText(shared.batch.product?.name, TRUNCATION_LIMITS.PRODUCT_NAME) || '-'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-sm text-slate-600">
                              {formatDimensions(
                                shared.batch.height,
                                shared.batch.width,
                                shared.batch.thickness
                              )}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="font-serif text-obsidian">
                              {formatCurrency(
                                shared.negotiatedPrice || shared.batch.industryPrice
                              )}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-slate-500">
                              {formatDate(shared.sharedAt)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <button
                              onClick={() => handleRemoveShare(shared.id)}
                              className="p-2 hover:bg-rose-50 rounded-sm transition-colors text-rose-600"
                              title="Remover compartilhamento"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Card>
          </div>

          {/* Right Column - Catalog Permission */}
          <div className="space-y-6">
            <Card>
              <h2 className="text-lg font-semibold text-obsidian mb-6">
                Permissões
              </h2>

              <div className="space-y-4">
                <div className="p-4 bg-mineral rounded-sm">
                  <Toggle
                    checked={catalogPermission}
                    onChange={(e) => handleToggleCatalogPermission(e.target.checked)}
                    label="Permitir acesso ao catálogo completo"
                  />
                  <p className="text-xs text-slate-500 mt-2 ml-14">
                    Broker poderá ver todos os produtos, mas não necessariamente os lotes
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <p className="text-sm text-slate-600 mb-2">
                    <strong>Lotes compartilhados:</strong> {sharedBatches.length}
                  </p>
                  <p className="text-sm text-slate-600">
                    <strong>Catálogo público:</strong>{' '}
                    {catalogPermission ? 'Liberado' : 'Restrito'}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      <Modal open={showShareModal} onClose={() => setShowShareModal(false)}>
        <ModalClose onClose={() => setShowShareModal(false)} />
        <ModalHeader>
          <ModalTitle>Compartilhar Lote</ModalTitle>
        </ModalHeader>

        <form onSubmit={handleSubmit(onSubmitShare)}>
          <ModalContent>
            <div className="space-y-6">
              {/* Search Available Batches */}
              <div className="relative">
                <Input
                  placeholder="Buscar lote por código ou produto"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Search className="absolute right-3 top-3 w-5 h-5 text-slate-400 pointer-events-none" />
              </div>

              {/* Available Batches List */}
              <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-sm">
                {filteredAvailableBatches.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-slate-400">
                      {searchTerm
                        ? 'Nenhum lote encontrado'
                        : 'Todos os lotes já foram compartilhados'}
                    </p>
                  </div>
                ) : (
                  filteredAvailableBatches.map((batch) => (
                    <button
                      key={batch.id}
                      type="button"
                      onClick={() => {
                        setSelectedBatch(batch);
                        reset({ negotiatedPrice: batch.industryPrice });
                      }}
                      className={cn(
                        'w-full p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors text-left',
                        selectedBatch?.id === batch.id && 'bg-blue-50'
                      )}
                    >
                      <div className="flex items-center gap-4">
                        {batch.medias?.[0] && !isPlaceholderUrl(batch.medias[0].url) && (
                          <img
                            src={batch.medias[0].url}
                            alt={batch.batchCode}
                            className="w-16 h-16 rounded-sm object-cover"
                          />
                        )}
                        <div className="flex-1">
                          <p 
                            className="font-mono text-sm font-semibold text-obsidian"
                            title={batch.batchCode}
                          >
                            {truncateText(batch.batchCode, TRUNCATION_LIMITS.BATCH_CODE)}
                          </p>
                          <p 
                            className="text-sm text-slate-600"
                            title={batch.product?.name}
                          >
                            {truncateText(batch.product?.name, TRUNCATION_LIMITS.PRODUCT_NAME_SHORT)}
                          </p>
                          <p className="text-xs text-slate-500">
                            {formatArea(batch.totalArea)} •{' '}
                            {formatCurrency(batch.industryPrice)}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>

              {/* Selected Batch Preview */}
              {selectedBatch && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-sm">
                  <p className="text-xs uppercase tracking-widest text-blue-600 mb-2">
                    Lote Selecionado
                  </p>
                  <div className="flex items-center gap-4">
                    {selectedBatch.medias?.[0] && !isPlaceholderUrl(selectedBatch.medias[0].url) && (
                      <img
                        src={selectedBatch.medias[0].url}
                        alt={selectedBatch.batchCode}
                        className="w-20 h-20 rounded-sm object-cover"
                      />
                    )}
                    <div>
                      <p 
                        className="font-mono font-semibold text-obsidian"
                        title={selectedBatch.batchCode}
                      >
                        {truncateText(selectedBatch.batchCode, TRUNCATION_LIMITS.BATCH_CODE)}
                      </p>
                      <p 
                        className="text-sm text-slate-600"
                        title={selectedBatch.product?.name}
                      >
                        {truncateText(selectedBatch.product?.name, TRUNCATION_LIMITS.PRODUCT_NAME_SHORT)}
                      </p>
                      <p className="text-sm font-mono text-slate-500">
                        {formatDimensions(
                          selectedBatch.height,
                          selectedBatch.width,
                          selectedBatch.thickness
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Negotiated Price */}
              {selectedBatch && (
                <Input
                  {...register('negotiatedPrice', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  label="Preço de Repasse para este Broker (R$)"
                  helperText="Deixe vazio para usar o preço padrão do lote"
                  disabled={isSubmitting}
                />
              )}
            </div>
          </ModalContent>

          <ModalFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowShareModal(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting}
              disabled={!selectedBatch}
            >
              COMPARTILHAR
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}