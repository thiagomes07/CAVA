'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Plus, Search, Edit2, Eye, Archive, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
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
import { formatPricePerUnit, getPriceUnitLabel, calculateAvailabilityPercentage } from '@/lib/utils/priceConversion';
import { truncateText } from '@/lib/utils/truncateText';
import { TRUNCATION_LIMITS } from '@/lib/config/truncationLimits';
import type { Batch, Product, BatchStatus } from '@/lib/types';
import type { BatchFilter } from '@/lib/schemas/batch.schema';
import { batchStatuses } from '@/lib/schemas/batch.schema';
import { cn } from '@/lib/utils/cn';

// Tipos de ordenação
type SortField = 'availableSlabs' | 'totalArea' | 'industryPrice' | 'batchCode' | null;
type SortDirection = 'asc' | 'desc';

// Opções de filtro de disponibilidade
const availabilityOptions = [
  { value: '', label: 'Todas as disponibilidades' },
  { value: 'available', label: 'Com chapas disponíveis' },
  { value: 'low', label: 'Estoque baixo (≤3)' },
  { value: 'none', label: 'Sem disponibilidade' },
] as const;

export default function InventoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { error } = useToast();
  const { hasPermission } = useAuth();
  const t = useTranslations('inventory');
  const tCommon = useTranslations('common');

  const [batches, setBatches] = useState<Batch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);

  // Estado de ordenação
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const [filters, setFilters] = useState<BatchFilter & { availability?: string }>({
    productId: searchParams.get('productId') || '',
    status: (searchParams.get('status') as BatchStatus) || '',
    code: searchParams.get('code') || '',
    availability: searchParams.get('availability') || '',
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
      error(t('productsError'));
    }
  };

  const fetchBatches = async () => {
    try {
      setIsLoading(true);
      
      // Mapear filtro de disponibilidade para parâmetro da API
      const apiFilters: Record<string, string | number | boolean | undefined> = { 
        ...filters,
        availability: undefined 
      };
      if (filters.availability === 'available') {
        apiFilters.onlyWithAvailable = true;
      }
      
      const data = await apiClient.get<{
        batches: Batch[];
        total: number;
        page: number;
      }>('/batches', { params: apiFilters });

      setBatches(data.batches);
      setTotalItems(data.total);
    } catch (err) {
      error(t('loadError'));
      setBatches([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handler de ordenação
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Ícone de ordenação
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 ml-1 opacity-50" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-4 h-4 ml-1" />
      : <ArrowDown className="w-4 h-4 ml-1" />;
  };

  // Ordenação e filtro local (para melhor UX)
  const sortedBatches = useMemo(() => {
    let result = [...batches];
    
    // Filtro de disponibilidade local
    if (filters.availability === 'low') {
      result = result.filter(b => b.availableSlabs > 0 && b.availableSlabs <= 3);
    } else if (filters.availability === 'none') {
      result = result.filter(b => b.availableSlabs === 0);
    }
    
    // Ordenação
    if (sortField) {
      result.sort((a, b) => {
        let aVal: number | string = 0;
        let bVal: number | string = 0;
        
        switch (sortField) {
          case 'availableSlabs':
            aVal = a.availableSlabs;
            bVal = b.availableSlabs;
            break;
          case 'totalArea':
            aVal = a.totalArea;
            bVal = b.totalArea;
            break;
          case 'industryPrice':
            aVal = a.industryPrice;
            bVal = b.industryPrice;
            break;
          case 'batchCode':
            aVal = a.batchCode;
            bVal = b.batchCode;
            break;
        }
        
        if (typeof aVal === 'string') {
          return sortDirection === 'asc' 
            ? aVal.localeCompare(bVal as string)
            : (bVal as string).localeCompare(aVal);
        }
        
        return sortDirection === 'asc' ? aVal - (bVal as number) : (bVal as number) - aVal;
      });
    }
    
    return result;
  }, [batches, sortField, sortDirection, filters.availability]);

  const handleClearFilters = () => {
    setFilters({
      productId: '',
      status: '',
      code: '',
      availability: '',
      page: 1,
      limit: 50,
    });
    setSortField(null);
    setSortDirection('desc');
    router.push('/inventory');
  };

  const hasFilters = filters.productId || filters.status || filters.code || filters.availability;
  const isEmpty = batches.length === 0;

  return (
    <div className="min-h-screen bg-mineral">
      {/* Header */}
      <div className="bg-porcelain border-b border-slate-100 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl text-obsidian mb-2">
              {t('title')}
            </h1>
            <p className="text-sm text-slate-500">
              {t('subtitle')}
            </p>
          </div>
          {canEdit && (
            <Button
              variant="primary"
              onClick={() => router.push('/inventory/new')}
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('newBatch')}
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="px-8 py-6">
        <div className="bg-porcelain rounded-sm border border-slate-100 p-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Select
              value={filters.productId}
              onChange={(e) =>
                setFilters({ ...filters, productId: e.target.value, page: 1 })
              }
            >
              <option value="">{t('allProducts')}</option>
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
              <option value="">{t('allStatuses')}</option>
              {batchStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>

            {/* Filtro de Disponibilidade */}
            <Select
              value={filters.availability}
              onChange={(e) =>
                setFilters({ ...filters, availability: e.target.value, page: 1 })
              }
            >
              {availabilityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>

            <div className="relative">
              <Input
                placeholder={t('batchCodePlaceholder')}
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
              {tCommon('clearFilters')}
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
                ? t('noResults')
                : t('emptyTitle')
            }
            description={
              hasFilters
                ? t('adjustFilters')
                : t('emptyDescription')
            }
            actionLabel={hasFilters ? tCommon('clearFilters') : canEdit ? t('newBatch') : undefined}
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
                    <TableHead>{t('photo')}</TableHead>
                    <TableHead>
                      <button
                        onClick={() => handleSort('batchCode')}
                        className="flex items-center hover:text-obsidian transition-colors"
                      >
                        {t('code')}
                        <SortIcon field="batchCode" />
                      </button>
                    </TableHead>
                    <TableHead>{t('product')}</TableHead>
                    <TableHead>{t('dimensions')}</TableHead>
                    <TableHead>
                      <button
                        onClick={() => handleSort('availableSlabs')}
                        className="flex items-center hover:text-obsidian transition-colors"
                      >
                        {t('slabs')}
                        <SortIcon field="availableSlabs" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        onClick={() => handleSort('totalArea')}
                        className="flex items-center hover:text-obsidian transition-colors"
                      >
                        {t('totalArea')}
                        <SortIcon field="totalArea" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        onClick={() => handleSort('industryPrice')}
                        className="flex items-center hover:text-obsidian transition-colors"
                      >
                        {t('price')}
                        <SortIcon field="industryPrice" />
                      </button>
                    </TableHead>
                    <TableHead>{t('status')}</TableHead>
                    {canEdit && <TableHead>{t('actions')}</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedBatches.map((batch) => {
                    const availabilityPct = calculateAvailabilityPercentage(
                      batch.availableSlabs,
                      batch.quantitySlabs
                    );
                    return (
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
                              {t('noPhoto')}
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
                        <div className="flex flex-col">
                          <span className={cn(
                            "font-mono text-sm font-semibold",
                            batch.availableSlabs === 0 ? "text-rose-600" : 
                            batch.availableSlabs === batch.quantitySlabs ? "text-emerald-600" : 
                            "text-amber-600"
                          )}>
                            {batch.availableSlabs}/{batch.quantitySlabs}
                          </span>
                          <div className="w-16 h-1.5 bg-slate-200 rounded-full mt-1">
                            <div 
                              className={cn(
                                "h-full rounded-full transition-all",
                                availabilityPct === 0 ? "bg-rose-500" :
                                availabilityPct === 100 ? "bg-emerald-500" :
                                "bg-amber-500"
                              )}
                              style={{ width: `${availabilityPct}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm text-slate-600">
                          {formatArea(batch.totalArea)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-serif text-obsidian">
                          {formatPricePerUnit(batch.industryPrice, batch.priceUnit)}
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
                              title={t('edit')}
                            >
                              <Edit2 className="w-4 h-4 text-slate-600" />
                            </button>
                            <button
                              onClick={() => router.push(`/inventory/${batch.id}`)}
                              className="p-2 hover:bg-slate-100 rounded-sm transition-colors"
                              title={t('viewDetails')}
                            >
                              <Eye className="w-4 h-4 text-slate-600" />
                            </button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  )})}
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