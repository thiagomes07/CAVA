'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Package,
  ChevronLeft,
  ChevronRight,
  Ruler,
  Layers,
  ShieldCheck,
  X,
  Maximize2
} from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/lib/hooks/useToast';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { formatArea } from '@/lib/utils/formatDimensions';
import { cn } from '@/lib/utils/cn';
import type { Media } from '@/lib/types';

// Resposta pública sanitizada do backend
interface PublicBatch {
  batchCode: string;
  height: number;
  width: number;
  thickness: number;
  totalArea: number;
  originQuarry?: string;
  medias: Media[];
  productName?: string;
  material?: string;
  finish?: string;
}

interface PublicProduct {
  name: string;
  material: string;
  finish: string;
  description?: string;
  medias: Media[];
}

// Item para MULTIPLOS_LOTES
interface PublicLinkItem {
  batchCode: string;
  productName: string;
  material: string;
  finish: string;
  height: number;
  width: number;
  thickness: number;
  quantity: number;
  unitPrice?: number;
  totalPrice?: number;
  medias: Media[];
}

interface PublicSalesLink {
  title?: string;
  customMessage?: string;
  displayPrice?: number;
  showPrice: boolean;
  batch?: PublicBatch;
  product?: PublicProduct;
  items?: PublicLinkItem[]; // Para MULTIPLOS_LOTES
}

export default function PublicLinkPage() {
  const params = useParams();
  const router = useRouter();
  const { error } = useToast();
  const slug = params.slug as string;

  const [link, setLink] = useState<PublicSalesLink | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  useEffect(() => {
    fetchLink();
  }, [slug]);

  const fetchLink = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.get<PublicSalesLink>(`/public/links/${slug}`);
      setLink(data);
    } catch (err) {
      error('Link não encontrado ou expirado');
      setTimeout(() => router.push('/'), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  // Derived values - must be computed before any returns to maintain hook order
  const batch = link?.batch;
  const product = link?.product;
  const items = link?.items;
  const isMultipleBatches = items && items.length > 0;
  
  // Para múltiplos lotes, coletar todas as mídias de todos os itens
  const allMedias = useMemo(() => {
    if (!link) return [];
    if (isMultipleBatches && items) {
      return items.flatMap(item => item.medias || []);
    }
    return batch?.medias || product?.medias || [];
  }, [link, isMultipleBatches, items, batch, product]);
  
  // Calcular totais para múltiplos lotes
  const totals = useMemo(() => {
    if (!isMultipleBatches || !items) return null;
    const totalPieces = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalValue = items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    return { totalPieces, totalValue };
  }, [isMultipleBatches, items]);

  const productName = link?.title || (isMultipleBatches && items ? `Pedido com ${items.length} lote(s)` : batch?.productName || product?.name || 'Produto');
  const medias: Media[] = allMedias;
  const hasMultipleImages = medias.length > 1;
  const currentImage = medias[selectedImageIndex];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#121212] mx-auto mb-4"></div>
          <p className="text-slate-500 text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!link) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="text-center">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h1 className="text-xl font-serif text-[#121212] mb-2">Link não encontrado</h1>
          <p className="text-slate-500 text-sm">Este link pode ter expirado ou não existe.</p>
        </div>
      </div>
    );
  }

  const nextImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedImageIndex((prev) => (prev + 1) % medias.length);
  };

  const prevImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedImageIndex((prev) => (prev - 1 + medias.length) % medias.length);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] font-sans text-[#121212] selection:bg-[#C2410C] selection:text-white">

      {/* --- LIGHTBOX MODAL --- */}
      {isLightboxOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 md:p-12 cursor-zoom-out animate-in fade-in duration-300"
          onClick={() => setIsLightboxOpen(false)}
        >
          <button
            className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors z-[110]"
            onClick={() => setIsLightboxOpen(false)}
          >
            <X className="w-8 h-8" />
          </button>

          <img
            src={currentImage?.url}
            alt={productName}
            className="max-h-full max-w-full object-contain shadow-2xl rounded-sm animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          />

          {hasMultipleImages && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prevImage(); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-4 text-white/50 hover:text-white transition-colors"
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); nextImage(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-4 text-white/50 hover:text-white transition-colors"
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            </>
          )}
        </div>
      )}

      {/* Header */}
      <header className="bg-[#121212] text-white">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <div className="text-xl md:text-2xl font-serif font-bold tracking-tight">CAVA</div>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-white/60">
            <ShieldCheck className="w-4 h-4" />
            <span className="hidden sm:inline">Link Seguro</span>
          </div>
        </div>
      </header>

      {/* Main Content - Style like Catalog */}
      <main className="pt-8 pb-20">
        <section className="max-w-[1600px] mx-auto px-4 sm:px-6 md:px-8 py-8 pb-0 lg:py-14 relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 md:gap-16 lg:gap-20 items-start">

            {/* Left: Content (Sticky) */}
            <div className="lg:col-span-5 flex flex-col space-y-8 md:space-y-14 lg:space-y-16 lg:sticky lg:top-24 order-1">
              <div className="animate-in slide-in-from-left duration-700">
                <div className="flex items-center space-x-4 mb-6 md:mb-8">
                  <span className="h-px w-10 bg-[#121212]"></span>
                  <span className="text-xs font-bold uppercase tracking-[0.3em] text-[#121212]">
                    {isMultipleBatches ? 'Pedido' : 'Lote'}
                  </span>
                </div>

                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-serif font-medium leading-[0.95] mb-6 md:mb-10 tracking-tight text-[#121212]">
                  {productName}
                </h1>
                
                {!isMultipleBatches && (batch?.material || product?.material) && (
                  <p className="text-lg sm:text-xl md:text-2xl text-slate-500 leading-relaxed font-light font-serif italic max-w-xl">
                    "{batch?.material || product?.material} • {batch?.finish || product?.finish}"
                  </p>
                )}
                
                {isMultipleBatches && totals && (
                  <p className="text-lg sm:text-xl text-slate-500 leading-relaxed font-light">
                    {totals.totalPieces} peça(s) em {items!.length} lote(s)
                  </p>
                )}
              </div>

              {/* Specifications - Single Batch */}
              {batch && !isMultipleBatches && (
                <div className="space-y-12 border-t border-slate-200 pt-4 md:pt-12 animate-in fade-in duration-700 delay-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-12 relative">
                    {batch.originQuarry && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-3">Origem</p>
                        <p className="text-2xl font-serif text-[#121212]">{batch.originQuarry}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-3">Dimensões</p>
                      <div className="flex items-baseline space-x-2">
                        <span className="text-2xl font-serif text-[#121212]">{batch.height} × {batch.width}</span>
                        <span className="text-sm font-medium text-slate-400">cm</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-3">Código do Lote</p>
                      <p className="text-xl font-mono text-[#121212]">{batch.batchCode}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-3">Área Total</p>
                      <p className="text-2xl font-serif text-[#121212]">{formatArea(batch.totalArea)}</p>
                    </div>
                  </div>
                  
                  {/* Price */}
                  {link.showPrice && link.displayPrice && (
                    <div className="pt-8 border-t border-slate-200">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-3">Valor</p>
                      <p className="text-4xl font-serif text-[#121212]">{formatCurrency(link.displayPrice)}</p>
                      {batch.totalArea > 0 && (
                        <p className="text-sm text-slate-400 mt-2">≈ {formatCurrency(link.displayPrice / batch.totalArea)}/m²</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Items List - Multiple Batches */}
              {isMultipleBatches && (
                <div className="space-y-4 border-t border-slate-200 pt-8 animate-in fade-in duration-700 delay-200">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                    {items.length} Lote(s) no Pedido
                  </p>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {items.map((item, index) => (
                      <div key={index} className="bg-white border border-slate-200 p-4">
                        <div className="flex gap-3">
                          <div className="w-16 h-16 flex-shrink-0 bg-slate-100 overflow-hidden">
                            {item.medias?.[0] ? (
                              <img 
                                src={item.medias[0].url} 
                                alt={item.productName} 
                                className="w-full h-full object-cover cursor-pointer"
                                onClick={() => {
                                  const mediaIndex = allMedias.findIndex(m => m.id === item.medias[0].id);
                                  if (mediaIndex >= 0) setSelectedImageIndex(mediaIndex);
                                  setIsLightboxOpen(true);
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="w-6 h-6 text-slate-300" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-[#121212] truncate">{item.productName}</p>
                            <p className="text-xs text-slate-400 font-mono">{item.batchCode}</p>
                            <p className="text-xs text-slate-500 mt-1">{item.material} • {item.finish}</p>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-slate-500">
                                {item.quantity} peça(s) • {item.height}×{item.width} cm
                              </span>
                              {link.showPrice && item.totalPrice && (
                                <span className="text-sm font-semibold text-[#121212]">
                                  {formatCurrency(item.totalPrice)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {totals && (
                    <div className="bg-[#121212] text-white p-6 mt-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white/60">Total: {totals.totalPieces} peça(s)</span>
                        {link.showPrice && totals.totalValue > 0 && (
                          <span className="text-2xl font-serif">{formatCurrency(totals.totalValue)}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right: Visuals (Carousel) */}
            <div className="lg:col-span-7 space-y-8 order-2 min-w-0">
              <div className="relative shadow-2xl group animate-in slide-in-from-right duration-700">
                {/* Main Image Container */}
                <div 
                  className="aspect-[4/5] sm:aspect-square md:aspect-[4/3] bg-slate-200 relative overflow-hidden cursor-zoom-in" 
                  onClick={() => medias.length > 0 && setIsLightboxOpen(true)}
                >
                  {currentImage ? (
                    <img
                      key={selectedImageIndex}
                      src={currentImage.url}
                      alt={productName}
                      className="w-full h-full object-cover animate-in fade-in duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-16 h-16 text-slate-300" />
                    </div>
                  )}

                  {/* High-End Watermark - Single Batch */}
                  {batch && !isMultipleBatches && (
                    <div className="absolute bottom-10 left-10 border-l-2 border-white pl-6 backdrop-blur-md bg-black/10 py-4 pr-10 z-10 pointer-events-none">
                      <p className="text-white/60 text-[10px] font-bold uppercase tracking-[0.3em] mb-1">Identificação do Lote</p>
                      <p className="text-white font-mono text-xl tracking-widest">{batch.batchCode}</p>
                    </div>
                  )}

                  {/* Zoom Hint */}
                  {medias.length > 0 && (
                    <div className="absolute top-6 right-6 bg-white/20 backdrop-blur-md text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                      <Maximize2 className="w-5 h-5" />
                    </div>
                  )}

                  {/* Carousel Arrows */}
                  {hasMultipleImages && (
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <button onClick={prevImage} className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full text-white transition-colors">
                        <ChevronLeft className="w-6 h-6" />
                      </button>
                      <button onClick={nextImage} className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full text-white transition-colors">
                        <ChevronRight className="w-6 h-6" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Thumbnails Row */}
                {hasMultipleImages && (
                  <div className="flex gap-4 mt-6 overflow-x-auto pb-2">
                    {medias.map((media, idx) => (
                      <button
                        key={media.id}
                        onClick={() => setSelectedImageIndex(idx)}
                        className={cn(
                          'relative w-20 h-20 shrink-0 overflow-hidden transition-all duration-300',
                          selectedImageIndex === idx 
                            ? 'ring-2 ring-[#C2410C] opacity-100' 
                            : 'opacity-50 hover:opacity-100'
                        )}
                      >
                        <img src={media.url} alt={`${productName} - ${idx + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Additional Info Cards - Single Batch */}
              {batch && !isMultipleBatches && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="aspect-[3/2] sm:aspect-square md:aspect-[2/1] bg-slate-100 flex items-center justify-center text-slate-400 font-serif italic text-lg border border-slate-200/50">
                    <Layers className="w-6 h-6 mr-3 opacity-50" strokeWidth={0.8} />
                    <span>Área: {formatArea(batch.totalArea)}</span>
                  </div>
                  <div className="aspect-[3/2] sm:aspect-square md:aspect-[2/1] bg-[#121212] p-8 flex flex-col justify-between text-white">
                    <Ruler className="w-8 h-8 text-[#C2410C]" strokeWidth={0.8} />
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.3em] opacity-60 mb-2">Espessura</p>
                      <p className="text-3xl font-serif">{batch.thickness} cm</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Custom Message */}
        {link.customMessage && (
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 md:px-8 mt-12 border-t border-slate-200 pt-8">
            <p className="text-center text-slate-500 font-light italic max-w-2xl mx-auto">
              "{link.customMessage}"
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 flex items-center justify-between">
          <div className="text-lg font-serif font-bold tracking-tight text-[#121212]">CAVA</div>
          <p className="text-xs text-slate-400">© {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  );
}
