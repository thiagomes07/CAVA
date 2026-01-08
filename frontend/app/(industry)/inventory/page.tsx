'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Search, Edit2, Eye, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Pagination } from '@/components/shared/Pagination';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/lib/hooks/useToast';
import { useAuth } from '@/lib/hooks/useAuth';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { formatDimensions, formatArea } from '@/lib/utils/formatDimensions';
import { truncateText } from '@/lib/utils/truncateText';
import { TRUNCATION_LIMITS } from '@/lib/config/truncationLimits';
import type { Batch, Product, BatchStatus } from '@/lib/types';
import type { BatchFilter } from '@/lib/schemas/batch.schema';
import { batchStatuses } from '@/lib/schemas/batch.schema';
import { cn } from '@/lib/utils/cn';

export default function InventoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { error } = useToast();
  const { hasPermission } = useAuth();

  const [batches, setBatches] = useState<Batch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);

  const [filters, setFilters] = useState<BatchFilter>({
    productId: searchParams.get('productId') || '',
    status: (searchParams.get('status') as BatchStatus) || '',
    code: searchParams.get('code') || '',
    page: parseInt(searchParams.get('page') || '1'),
    limit: 50,
  });

  const canEdit = hasPermission('ADMIN_INDUSTRIA');

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    fetchBatches();
  }, [filters]);

  const fetchProducts = async () => {
    try {
      const data = await apiClient.get<{ products: Product[] }>('/products', {
        params: { includeInactive: false, limit: 1000 },
      });
      setProducts(data.products);
    } catch (err) {
      error('Erro ao carregar produtos');
    }
  };

  const fetchBatches = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.get<{
        batches: Batch[];
        total: number;
        page: number;
      }>('/batches', { params: filters });

      setBatches(data.batches);
      setTotalItems(data.total);
    } catch (err) {
      error('Erro ao carregar estoque');
      setBatches([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearFilters = () => {
    setFilters({
      productId: '',
      status: '',
      code: '',
      page: 1,
      limit: 50,
    });
    router.push('/inventory');
  };

  const hasFilters = filters.productId || filters.status || filters.code;
  const isEmpty = batches.length === 0;

  return (
    <div className="min-h-screen bg-mineral">
      {/* Header */}
      <div className="bg-porcelain border-b border-slate-100 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl text-obsidian mb-2">
              Estoque de Lotes
            </h1>
            <p className="text-sm text-slate-500">
              Gerencie todos os lotes físicos disponíveis
            </p>
          </div>
          {canEdit && (
            <Button
              variant="primary"
              onClick={() => router.push('/inventory/new')}
            >
              <Plus className="w-4 h-4 mr-2" />
              NOVO LOTE
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="px-8 py-6">
        <div className="bg-porcelain rounded-sm border border-slate-100 p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select
              value={filters.productId}
              onChange={(e) =>
                setFilters({ ...filters, productId: e.target.value, page: 1 })
              }
            >
              <option value="">Todos os Produtos</option>
              {products.map((product) => (
                <option key={product.id} value={product.id} title={product.name}>
                  {truncateText(product.name, TRUNCATION_LIMITS.SELECT_OPTION)}
                </option>
              ))}
            </Select>

            <Select
              value={filters.status}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  status: e.target.value as BatchStatus,
                  page: 1,
                })
              }
            >
              <option value="">Todos os Status</option>
              {batchStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>

            <div className="relative">
              <Input
                placeholder="Código do Lote"
                value={filters.code}
                onChange={(e) =>
                  setFilters({ ...filters, code: e.target.value, page: 1 })
                }
              />
              <Search className="absolute right-3 top-3 w-5 h-5 text-slate-400 pointer-events-none" />
            </div>

            <Button
              variant="secondary"
              onClick={handleClearFilters}
              disabled={!hasFilters}
            >
              Limpar Filtros
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-8 pb-8">
        {isLoading ? (
          <LoadingState variant="table" rows={10} columns={7} />
        ) : isEmpty ? (
          <EmptyState
            icon={hasFilters ? Search : Plus}
            title={
              hasFilters
                ? 'Nenhum lote encontrado'
                : 'Estoque vazio'
            }
            description={
              hasFilters
                ? 'Tente ajustar os filtros de busca'
                : 'Cadastre seu primeiro lote para começar a vender'
            }
            actionLabel={hasFilters ? 'Limpar Filtros' : canEdit ? '+ Novo Lote' : undefined}
            onAction={
              hasFilters
                ? handleClearFilters
                : canEdit
                ? () => router.push('/inventory/new')
                : undefined
            }
          />
        ) : (
          <>
            <div className="bg-porcelain rounded-sm border border-slate-100 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Foto</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Dimensões</TableHead>
                    <TableHead>Área Total</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead>Status</TableHead>
                    {canEdit && <TableHead>Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches.map((batch) => (
                    <TableRow key={batch.id}>
                      <TableCell>
                        <div className="w-20 h-20 rounded-sm overflow-hidden bg-slate-200">
                          {batch.medias?.[0] ? (
                            <img
                              src={batch.medias[0].url}
                              alt={batch.batchCode}
                              loading="lazy"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                              Sem foto
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => router.push(`/inventory/${batch.id}`)}
                          className="font-mono text-sm text-obsidian hover:underline"
                          title={batch.batchCode}
                        >
                          {truncateText(batch.batchCode, TRUNCATION_LIMITS.BATCH_CODE)}
                        </button>
                      </TableCell>
                      <TableCell>
                        <span 
                          className="text-slate-600"
                          title={batch.product?.name}
                        >
                          {truncateText(batch.product?.name, TRUNCATION_LIMITS.PRODUCT_NAME) || '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm text-slate-600">
                          {formatDimensions(
                            batch.height,
                            batch.width,
                            batch.thickness
                          )}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm text-slate-600">
                          {formatArea(batch.totalArea)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-serif text-obsidian">
                          {formatCurrency(batch.industryPrice)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={batch.status}>{batch.status}</Badge>
                      </TableCell>
                      {canEdit && (
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => router.push(`/inventory/${batch.id}`)}
                              className="p-2 hover:bg-slate-100 rounded-sm transition-colors"
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4 text-slate-600" />
                            </button>
                            <button
                              onClick={() => router.push(`/inventory/${batch.id}`)}
                              className="p-2 hover:bg-slate-100 rounded-sm transition-colors"
                              title="Ver detalhes"
                            >
                              <Eye className="w-4 h-4 text-slate-600" />
                            </button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <Pagination
              currentPage={filters.page}
              totalPages={Math.ceil(totalItems / filters.limit)}
              totalItems={totalItems}
              itemsPerPage={filters.limit}
              onPageChange={(page) => setFilters({ ...filters, page })}
            />
          </>
        )}
      </div>
    </div>
  );
}