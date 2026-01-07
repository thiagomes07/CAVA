'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Eye, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Toggle } from '@/components/ui/toggle';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/lib/hooks/useToast';
import type { Product } from '@/lib/types';
import type { ProductFilter } from '@/lib/schemas/product.schema';
import { materialTypes } from '@/lib/schemas/product.schema';
import { cn } from '@/lib/utils/cn';

export default function CatalogPage() {
  const router = useRouter();
  const { error } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState<ProductFilter>({
    search: '',
    material: '',
    includeInactive: false,
    page: 1,
    limit: 24,
  });

  useEffect(() => {
    const handle = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: searchInput, page: 1 }));
    }, 300);

    return () => clearTimeout(handle);
  }, [searchInput]);

  useEffect(() => {
    fetchProducts();
  }, [filters]);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.get<{ products: Product[]; total: number }>(
        '/products',
        { params: filters }
      );
      setProducts(data.products);
    } catch (err) {
      error('Erro ao carregar produtos');
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const hasFilters = filters.search || filters.material || filters.includeInactive;
  const isEmpty = products.length === 0;

  return (
    <div className="min-h-screen bg-mineral">
      {/* Header */}
      <div className="bg-porcelain border-b border-slate-100 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl text-obsidian mb-2">
              Catálogo
            </h1>
            <p className="text-sm text-slate-500">
              Gerencie seus produtos e tipos de pedra
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => router.push('/catalog/new')}
          >
            <Plus className="w-4 h-4 mr-2" />
            NOVO PRODUTO
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="px-8 py-6">
        <div className="bg-porcelain rounded-sm border border-slate-100 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Input
                placeholder="Buscar por nome ou SKU"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              <Search className="absolute right-3 top-3 w-5 h-5 text-slate-400 pointer-events-none" />
            </div>

            <Select
              value={filters.material}
              onChange={(e) =>
                setFilters({ 
                  ...filters, 
                  material: e.target.value as ProductFilter['material'], 
                  page: 1 
                })
              }
            >
              <option value="">Todos os Materiais</option>
              {materialTypes.map((material) => (
                <option key={material} value={material}>
                  {material}
                </option>
              ))}
            </Select>

            <div className="flex items-center">
              <Toggle
                checked={filters.includeInactive}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    includeInactive: e.target.checked,
                    page: 1,
                  })
                }
                label="Mostrar Inativos"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-8 pb-8">
        {isLoading ? (
          <LoadingState variant="cards" rows={6} />
        ) : isEmpty ? (
          <EmptyState
            icon={hasFilters ? Search : Plus}
            title={
              hasFilters
                ? `Nenhum resultado para "${filters.search}"`
                : 'Nenhum produto cadastrado'
            }
            description={
              hasFilters
                ? 'Tente ajustar os filtros de busca'
                : 'Comece adicionando seu primeiro produto ao catálogo'
            }
            actionLabel={hasFilters ? 'Limpar Filtros' : '+ Novo Produto'}
            onAction={() => {
              if (hasFilters) {
                setFilters({
                  search: '',
                  material: '',
                  includeInactive: false,
                  page: 1,
                  limit: 24,
                });
              } else {
                router.push('/catalog/new');
              }
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onView={() => router.push(`/admin/inventory?productId=${product.id}`)}
                onEdit={() => router.push(`/admin/catalog/${product.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface ProductCardProps {
  product: Product;
  onView: () => void;
  onEdit: () => void;
}

function ProductCard({ product, onView, onEdit }: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const coverImage = product.medias?.find((m) => m.isCover) || product.medias?.[0];

  return (
    <div
      className="bg-porcelain border border-slate-100 rounded-sm overflow-hidden group transition-all duration-200 hover:shadow-premium"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] bg-slate-200 overflow-hidden">
        {coverImage ? (
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
            style={{ backgroundImage: `url(${coverImage.url})` }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-slate-400 text-sm">Sem foto</span>
          </div>
        )}

        {/* Overlay on Hover */}
        {isHovered && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center gap-3 animate-in fade-in-0 duration-200">
            <Button variant="secondary" size="sm" onClick={onEdit}>
              <Edit2 className="w-4 h-4 mr-2" />
              Editar
            </Button>
            <Button variant="secondary" size="sm" onClick={onView}>
              <Eye className="w-4 h-4 mr-2" />
              Ver Lotes
            </Button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-serif text-xl text-obsidian">{product.name}</h3>
          <Badge variant={product.isActive ? 'DISPONIVEL' : 'INATIVO'}>
            {product.isActive ? 'Ativo' : 'Inativo'}
          </Badge>
        </div>

        {product.sku && (
          <p className="font-mono text-xs text-slate-400 mb-3">{product.sku}</p>
        )}

        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600">{product.material}</span>
          <span className="text-slate-500">
            {product.batchCount || 0} lote{product.batchCount !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </div>
  );
}