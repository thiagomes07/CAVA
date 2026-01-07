'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Eye, Link2, Edit2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import { Modal, ModalHeader, ModalTitle, ModalContent, ModalFooter, ModalClose } from '@/components/ui/modal';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/lib/hooks/useToast';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { formatDimensions, formatArea } from '@/lib/utils/formatDimensions';
import type { SharedInventoryBatch, BatchStatus } from '@/lib/types';
import { batchStatuses } from '@/lib/schemas/batch.schema';
import { cn } from '@/lib/utils/cn';

interface SharedInventoryFilter {
  search: string;
  status: BatchStatus | '';
}

export default function BrokerSharedInventoryPage() {
  const router = useRouter();
  const { success, error } = useToast();

  const [sharedBatches, setSharedBatches] = useState<SharedInventoryBatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<SharedInventoryFilter>({
    search: '',
    status: '',
  });
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [newPrice, setNewPrice] = useState<number>(0);
  const [isUpdatingPrice, setIsUpdatingPrice] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<SharedInventoryBatch | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    fetchSharedInventory();
  }, []);

  const fetchSharedInventory = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.get<SharedInventoryBatch[]>('/broker/shared-inventory');
      setSharedBatches(data);
    } catch (err) {
      error('Erro ao carregar estoque');
      setSharedBatches([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePrice = async (sharedId: string) => {
    try {
      setIsUpdatingPrice(true);

      await apiClient.patch(`/broker/shared-inventory/${sharedId}/price`, {
        negotiatedPrice: newPrice,
      });

      success('Preço sugerido atualizado');
      setEditingPrice(null);
      fetchSharedInventory();
    } catch (err) {
      error('Erro ao atualizar preço');
    } finally {
      setIsUpdatingPrice(false);
    }
  };

  const handleStartEditPrice = (shared: SharedInventoryBatch) => {
    setEditingPrice(shared.id);
    setNewPrice(shared.negotiatedPrice || shared.batch.industryPrice);
  };

  const handleCancelEditPrice = () => {
    setEditingPrice(null);
    setNewPrice(0);
  };

  const handleViewDetails = (shared: SharedInventoryBatch) => {
    setSelectedBatch(shared);
    setShowDetailModal(true);
  };

  const filteredBatches = sharedBatches.filter((shared) => {
    if (filters.status && shared.batch.status !== filters.status) {
      return false;
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return (
        shared.batch.batchCode.toLowerCase().includes(searchLower) ||
        shared.batch.product?.name.toLowerCase().includes(searchLower)
      );
    }

    return true;
  });

  const isEmpty = filteredBatches.length === 0;
  const hasFilters = filters.search || filters.status;

  const calculateMargin = (shared: SharedInventoryBatch) => {
    const basePrice = shared.batch.industryPrice;
    const suggestedPrice = shared.negotiatedPrice || basePrice;
    return suggestedPrice - basePrice;
  };

  return (
    <div className="min-h-screen bg-mineral">
      {/* Header */}
      <div className="bg-porcelain border-b border-slate-100 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl text-obsidian mb-2">
              Estoque Disponível
            </h1>
            <p className="text-sm text-slate-500">
              Lotes compartilhados pela indústria
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => router.push('/links/new')}
          >
            <Link2 className="w-4 h-4 mr-2" />
            CRIAR LINK DE VENDA
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="px-8 py-6">
        <div className="bg-porcelain rounded-sm border border-slate-100 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Input
                placeholder="Buscar por código ou produto"
                value={filters.search}
                onChange={(e) =>
                  setFilters({ ...filters, search: e.target.value })
                }
              />
              <Search className="absolute right-3 top-3 w-5 h-5 text-slate-400 pointer-events-none" />
            </div>

            <Select
              value={filters.status}
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value as BatchStatus | '' })
              }
            >
              <option value="">Todos os Status</option>
              <option value="DISPONIVEL">Disponível</option>
              <option value="RESERVADO">Reservado</option>
            </Select>

            {hasFilters && (
              <Button
                variant="secondary"
                onClick={() => setFilters({ search: '', status: '' })}
              >
                Limpar Filtros
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-8 pb-8">
        {isLoading ? (
          <LoadingState variant="cards" rows={6} />
        ) : isEmpty ? (
          <EmptyState
            icon={Search}
            title={
              hasFilters
                ? 'Nenhum lote encontrado'
                : 'Nenhum lote disponível'
            }
            description={
              hasFilters
                ? 'Tente ajustar os filtros de busca'
                : 'Aguarde a indústria compartilhar lotes com você'
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBatches.map((shared) => {
              const margin = calculateMargin(shared);
              const marginPercent = (margin / shared.batch.industryPrice) * 100;
              const isEditing = editingPrice === shared.id;

              return (
                <Card
                  key={shared.id}
                  variant="elevated"
                  className="relative overflow-hidden"
                >
                  {/* Image */}
                  <div className="relative aspect-[4/3] -m-8 mb-4 overflow-hidden bg-slate-200">
                    {shared.batch.medias?.[0] ? (
                      <img
                        src={shared.batch.medias[0].url}
                        alt={shared.batch.batchCode}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-slate-400 text-sm">Sem foto</span>
                      </div>
                    )}
                    
                    {/* Status Badge */}
                    <div className="absolute top-4 right-4">
                      <Badge variant={shared.batch.status}>
                        {shared.batch.status}
                      </Badge>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="space-y-4">
                    {/* Product Info */}
                    <div>
                      <p className="font-mono text-sm font-semibold text-obsidian mb-1">
                        {shared.batch.batchCode}
                      </p>
                      <p className="font-serif text-xl text-obsidian">
                        {shared.batch.product?.name}
                      </p>
                    </div>

                    {/* Dimensions */}
                    <div className="flex items-center justify-between text-sm text-slate-600">
                      <span className="font-mono">
                        {formatDimensions(
                          shared.batch.height,
                          shared.batch.width,
                          shared.batch.thickness
                        )}
                      </span>
                      <span className="font-mono font-semibold">
                        {formatArea(shared.batch.totalArea)}
                      </span>
                    </div>

                    {/* Pricing Section */}
                    <div className="pt-4 border-t border-slate-200">
                      <div className="mb-3">
                        <p className="text-xs uppercase tracking-widest text-slate-500 mb-1">
                          Preço Base Indústria
                        </p>
                        <p className="text-lg font-serif text-slate-500 line-through">
                          {formatCurrency(shared.batch.industryPrice)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-widest text-emerald-600 mb-2">
                          Meu Preço Sugerido
                        </p>
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={newPrice}
                              onChange={(e) => setNewPrice(parseFloat(e.target.value))}
                              disabled={isUpdatingPrice}
                              className="flex-1"
                            />
                            <button
                              onClick={() => handleUpdatePrice(shared.id)}
                              disabled={isUpdatingPrice}
                              className="p-2 bg-emerald-500 text-white rounded-sm hover:bg-emerald-600 transition-colors"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={handleCancelEditPrice}
                              disabled={isUpdatingPrice}
                              className="p-2 bg-slate-200 text-slate-600 rounded-sm hover:bg-slate-300 transition-colors"
                            >
                              ×
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <p className="text-2xl font-serif text-emerald-700">
                              {formatCurrency(shared.negotiatedPrice || shared.batch.industryPrice)}
                            </p>
                            <button
                              onClick={() => handleStartEditPrice(shared)}
                              className="p-2 hover:bg-slate-100 rounded-sm transition-colors"
                              title="Editar preço"
                            >
                              <Edit2 className="w-4 h-4 text-slate-600" />
                            </button>
                          </div>
                        )}

                        {!isEditing && margin > 0 && (
                          <p className="text-xs text-emerald-600 mt-1">
                            Margem: {formatCurrency(margin)} ({marginPercent.toFixed(1)}%)
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-4">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleViewDetails(shared)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Ver Detalhes
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        className="flex-1"
                        onClick={() => router.push('/links/new')}
                        disabled={shared.batch.status !== 'DISPONIVEL'}
                      >
                        <Link2 className="w-4 h-4 mr-2" />
                        Gerar Link
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Modal open={showDetailModal} onClose={() => setShowDetailModal(false)}>
        <ModalClose onClose={() => setShowDetailModal(false)} />
        <ModalHeader>
          <ModalTitle>Detalhes do Lote</ModalTitle>
        </ModalHeader>
        <ModalContent>
          {selectedBatch && (
            <div className="space-y-6">
              {/* Images Gallery */}
              {selectedBatch.batch.medias && selectedBatch.batch.medias.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {selectedBatch.batch.medias.map((media) => (
                    <img
                      key={media.id}
                      src={media.url}
                      alt="Lote"
                      className="w-full aspect-[4/3] object-cover rounded-sm"
                    />
                  ))}
                </div>
              )}

              {/* Basic Info */}
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-500 mb-2">
                  Identificação
                </p>
                <p className="font-mono text-lg font-semibold text-obsidian">
                  {selectedBatch.batch.batchCode}
                </p>
                <p className="text-slate-600">
                  {selectedBatch.batch.product?.name}
                </p>
              </div>

              {/* Specifications */}
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-500 mb-3">
                  Especificações
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-500">Dimensões</p>
                    <p className="font-mono text-sm text-obsidian">
                      {formatDimensions(
                        selectedBatch.batch.height,
                        selectedBatch.batch.width,
                        selectedBatch.batch.thickness
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Área Total</p>
                    <p className="font-mono text-sm text-obsidian">
                      {formatArea(selectedBatch.batch.totalArea)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Quantidade</p>
                    <p className="font-mono text-sm text-obsidian">
                      {selectedBatch.batch.quantitySlabs} chapa(s)
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Material</p>
                    <p className="text-sm text-obsidian">
                      {selectedBatch.batch.product?.material}
                    </p>
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div className="pt-4 border-t border-slate-200">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-sm">
                    <p className="text-xs uppercase tracking-widest text-slate-500 mb-1">
                      Preço Base
                    </p>
                    <p className="text-xl font-serif text-slate-700">
                      {formatCurrency(selectedBatch.batch.industryPrice)}
                    </p>
                  </div>
                  <div className="p-4 bg-emerald-50 rounded-sm">
                    <p className="text-xs uppercase tracking-widest text-emerald-600 mb-1">
                      Meu Preço
                    </p>
                    <p className="text-xl font-serif text-emerald-700">
                      {formatCurrency(selectedBatch.negotiatedPrice || selectedBatch.batch.industryPrice)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </ModalContent>
        <ModalFooter>
          <Button
            variant="secondary"
            onClick={() => setShowDetailModal(false)}
          >
            Fechar
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              setShowDetailModal(false);
              router.push('/links/new');
            }}
          >
            Criar Link de Venda
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}