'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MapPin, Package, Ruler, Square, Image as ImageIcon } from 'lucide-react';
import { LoadingState } from '@/components/shared/LoadingState';
import { EmptyState } from '@/components/shared/EmptyState';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/lib/hooks/useToast';
import { formatArea, formatDimensions } from '@/lib/utils/formatDimensions';
import { cn } from '@/lib/utils/cn';
import { isPlaceholderUrl } from '@/lib/utils/media';

interface PublicBatch {
  batchCode: string;
  height: number;
  width: number;
  thickness: number;
  totalArea: number;
  originQuarry?: string;
  medias?: Array<{
    id: string;
    url: string;
    displayOrder: number;
  }>;
  productName?: string;
  material?: string;
  finish?: string;
  industryId?: string;
  industryName?: string;
}

interface PublicCatalogLink {
  title?: string;
  customMessage?: string;
  batches: PublicBatch[];
  depositName: string;
  depositCity?: string;
  depositState?: string;
  depositLogo?: string;
}

export default function CatalogPage() {
  const params = useParams();
  const router = useRouter();
  const { error } = useToast();
  const slug = params.slug as string;

  const [catalog, setCatalog] = useState<PublicCatalogLink | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCatalog();
  }, [slug]);

  const fetchCatalog = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.get<PublicCatalogLink>(`/public/catalogo/${slug}`);
      setCatalog(data);
    } catch (err) {
      error('Catálogo não encontrado');
      setTimeout(() => router.push('/'), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-obsidian mx-auto mb-4"></div>
          <p className="text-slate-500 text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!catalog) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <EmptyState
          icon={Package}
          title="Catálogo não encontrado"
          description="Este catálogo pode não estar mais disponível"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-obsidian text-porcelain py-3 px-4 flex-shrink-0">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-serif text-xl tracking-wider">CAVA</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-6">
        <div className="w-full max-w-6xl mx-auto">
          {/* Header Section */}
          <div className="mb-6">
            {catalog.customMessage && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-center">
                <p className="text-amber-800 text-sm italic">{catalog.customMessage}</p>
              </div>
            )}

            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                {catalog.depositLogo && (
                  <div className="flex-shrink-0">
                    <img
                      src={catalog.depositLogo}
                      alt={`${catalog.depositName} logo`}
                      className="h-16 md:h-20 object-contain"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <h1 className="font-serif text-2xl md:text-3xl text-obsidian mb-2">
                    {catalog.title || catalog.depositName}
                  </h1>
                  {(catalog.depositCity || catalog.depositState) && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <MapPin className="w-4 h-4" />
                      <span>{[catalog.depositCity, catalog.depositState].filter(Boolean).join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Batches Grid */}
          <div>


            {catalog.batches.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-16 text-center">
                <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="font-serif text-lg text-obsidian mb-2">Nenhum lote disponível</h3>
                <p className="text-slate-500 text-sm">Este catálogo ainda não possui lotes cadastrados</p>
              </div>
            ) : (() => {
              // Agrupar lotes por indústria
              const batchesByIndustry = catalog.batches.reduce((acc, batch) => {
                const industryId = batch.industryId || 'unknown';
                const industryName = batch.industryName || 'Sem indústria';
                
                if (!acc[industryId]) {
                  acc[industryId] = {
                    name: industryName,
                    batches: [],
                  };
                }
                acc[industryId].batches.push(batch);
                return acc;
              }, {} as Record<string, { name: string; batches: PublicBatch[] }>);

              const industries = Object.values(batchesByIndustry);

              return (
                <div className="space-y-8">
                  {industries.map((industry, industryIndex) => (
                    <div key={industryIndex}>
                      {/* Cabeçalho da Indústria */}
                      <div className="mb-4 pb-2 border-b border-slate-200">
                        <h3 className="font-serif text-lg text-obsidian">
                          {industry.name}
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">
                          {industry.batches.length} {industry.batches.length === 1 ? 'lote' : 'lotes'}
                        </p>
                      </div>

                      {/* Grid de Lotes da Indústria */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {industry.batches.map((batch) => {
                          const mainImage = batch.medias && batch.medias.length > 0 ? batch.medias[0] : null;
                          const hasMultipleImages = batch.medias && batch.medias.length > 1;
                          
                          return (
                            <div
                              key={batch.batchCode}
                              className="bg-white rounded-xl shadow-sm overflow-hidden flex flex-col"
                            >
                              {/* Image Container */}
                              <div className="relative aspect-square bg-slate-100">
                                {mainImage && !isPlaceholderUrl(mainImage.url) ? (
                                  <>
                                    <img
                                      src={mainImage.url}
                                      alt={batch.batchCode}
                                      className="w-full h-full object-cover"
                                    />
                                    {hasMultipleImages && (
                                      <div className="absolute top-2 right-2 bg-black/60 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                                        <ImageIcon className="w-3 h-3" />
                                        {batch.medias.length}
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                                    <Package className="w-12 h-12 mb-2" />
                                    <span className="text-xs font-medium">{batch.batchCode}</span>
                                  </div>
                                )}
                              </div>

                              {/* Content */}
                              <div className="p-4 border-t border-slate-100 flex-1 flex flex-col">
                                {/* Header */}
                                <div className="mb-3">
                                  <h3 className="font-mono text-sm font-semibold text-obsidian mb-1">
                                    {batch.batchCode}
                                  </h3>
                                  {(batch.material || batch.finish) && (
                                    <p className="text-xs text-slate-600">
                                      {[batch.material, batch.finish].filter(Boolean).join(' • ')}
                                    </p>
                                  )}
                                </div>

                                {/* Specs */}
                                <div className="space-y-2 text-xs text-slate-600 flex-1">
                                  <div className="flex items-center gap-2">
                                    <Ruler className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                    <span>{formatDimensions(batch.height, batch.width, batch.thickness)}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Square className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                    <span>{formatArea(batch.totalArea)}</span>
                                  </div>
                                  {batch.originQuarry && (
                                    <p className="text-xs text-slate-500 pt-2 border-t border-slate-100">
                                      Origem: {batch.originQuarry}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      </main>
    </div>
  );
}
