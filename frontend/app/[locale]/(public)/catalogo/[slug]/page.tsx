'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  MapPin, 
  Package, 
  Ruler, 
  Square, 
  Image as ImageIcon, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Maximize2, 
  Layers,
  ShieldCheck,
  ChevronDown,
  ArrowLeft
} from 'lucide-react';
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
  const [selectedBatch, setSelectedBatch] = useState<PublicBatch | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

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

  const openBatchDetail = (batch: PublicBatch) => {
    setSelectedBatch(batch);
    setSelectedImageIndex(0);
  };

  const closeBatchDetail = () => {
    setSelectedBatch(null);
    setSelectedImageIndex(0);
    setIsLightboxOpen(false);
  };

  const nextImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!selectedBatch?.medias) return;
    setSelectedImageIndex((prev) => (prev + 1) % selectedBatch.medias!.length);
  };

  const prevImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!selectedBatch?.medias) return;
    setSelectedImageIndex((prev) => (prev - 1 + selectedBatch.medias!.length) % selectedBatch.medias!.length);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#121212] mx-auto mb-4"></div>
          <p className="text-slate-500 text-sm">Carregando catálogo...</p>
        </div>
      </div>
    );
  }

  if (!catalog) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <EmptyState
          icon={Package}
          title="Catálogo não encontrado"
          description="Este catálogo pode não estar mais disponível"
        />
      </div>
    );
  }

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
    <div className="min-h-screen bg-[#FAFAFA] font-sans text-[#121212] selection:bg-[#C2410C] selection:text-white relative">

      {/* --- BATCH DETAIL MODAL --- */}
      {selectedBatch && (
        <div className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="absolute inset-0 overflow-y-auto">
            <div className="min-h-screen bg-[#FAFAFA]">
              
              {/* --- LIGHTBOX MODAL --- */}
              {isLightboxOpen && selectedBatch.medias && selectedBatch.medias.length > 0 && (
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
                    src={selectedBatch.medias[selectedImageIndex]?.url}
                    alt={selectedBatch.batchCode}
                    className="max-h-full max-w-full object-contain shadow-2xl rounded-sm animate-in zoom-in-95 duration-300"
                    onClick={(e) => e.stopPropagation()}
                  />

                  {selectedBatch.medias.length > 1 && (
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

              {/* Modal Navigation */}
              <nav className="sticky top-0 w-full bg-white/90 backdrop-blur-md z-50 border-b border-slate-100">
                <div className="max-w-[1600px] mx-auto px-4 md:px-8 h-20 md:h-24 flex items-center justify-between gap-4">
                  <button
                    onClick={closeBatchDetail}
                    className="flex items-center gap-2 text-[#121212] hover:text-[#C2410C] transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    <span className="text-sm font-medium hidden sm:inline">Voltar ao catálogo</span>
                  </button>
                  
                  <div className="text-2xl md:text-3xl font-serif font-bold tracking-tight">CAVAS</div>

                  <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] text-[#C2410C] border border-[#C2410C] px-2 sm:px-3 py-1">
                    Catálogo
                  </div>
                </div>
              </nav>

              {/* Batch Detail Content */}
              <main className="pt-8 pb-20">
                <section className="max-w-[1600px] mx-auto px-4 sm:px-6 md:px-8 py-8 pb-0 lg:py-14 relative">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 md:gap-16 lg:gap-20 items-start">

                    {/* Left: Content (Sticky) */}
                    <div className="lg:col-span-5 flex flex-col space-y-8 md:space-y-14 lg:space-y-16 lg:sticky lg:top-40 order-1">
                      <div className="animate-in slide-in-from-left duration-700">
                        <div className="flex items-center space-x-4 mb-6 md:mb-8">
                          <span className="h-px w-10 bg-[#121212]"></span>
                          <span className="text-xs font-bold uppercase tracking-[0.3em] text-[#121212]">Lote</span>
                        </div>

                        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-serif font-medium leading-[0.95] mb-6 md:mb-10 tracking-tight text-[#121212]">
                          {selectedBatch.productName || selectedBatch.batchCode}
                        </h1>
                        
                        {(selectedBatch.material || selectedBatch.finish) && (
                          <p className="text-lg sm:text-xl md:text-2xl text-slate-500 leading-relaxed font-light font-serif italic max-w-xl">
                            "{selectedBatch.material} • {selectedBatch.finish}"
                          </p>
                        )}
                      </div>

                      {/* Specifications */}
                      <div className="space-y-12 border-t border-slate-200 pt-4 md:pt-12 animate-in fade-in duration-700 delay-200">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-12 relative">
                          {selectedBatch.originQuarry && (
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-3">Origem</p>
                              <p className="text-2xl font-serif text-[#121212]">{selectedBatch.originQuarry}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-3">Dimensões</p>
                            <div className="flex items-baseline space-x-2">
                              <span className="text-2xl font-serif text-[#121212]">{selectedBatch.height} × {selectedBatch.width}</span>
                              <span className="text-sm font-medium text-slate-400">cm</span>
                            </div>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-3">Código do Lote</p>
                            <p className="text-xl font-mono text-[#121212]">{selectedBatch.batchCode}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-3">Área Total</p>
                            <p className="text-2xl font-serif text-[#121212]">{formatArea(selectedBatch.totalArea)}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right: Visuals (Carousel) */}
                    <div className="lg:col-span-7 space-y-8 order-2 min-w-0">
                      <div className="relative shadow-2xl group animate-in slide-in-from-right duration-700">
                        {/* Main Image Container */}
                        <div 
                          className="aspect-[4/5] sm:aspect-square md:aspect-[4/3] bg-slate-200 relative overflow-hidden cursor-zoom-in" 
                          onClick={() => selectedBatch.medias && selectedBatch.medias.length > 0 && setIsLightboxOpen(true)}
                        >
                          {selectedBatch.medias && selectedBatch.medias.length > 0 && !isPlaceholderUrl(selectedBatch.medias[selectedImageIndex]?.url) ? (
                            <img
                              key={selectedImageIndex}
                              src={selectedBatch.medias[selectedImageIndex]?.url}
                              alt={selectedBatch.batchCode}
                              className="w-full h-full object-cover animate-in fade-in duration-500"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-16 h-16 text-slate-300" />
                            </div>
                          )}

                          {/* High-End Watermark */}
                          <div className="absolute bottom-10 left-10 border-l-2 border-white pl-6 backdrop-blur-md bg-black/10 py-4 pr-10 z-10 pointer-events-none">
                            <p className="text-white/60 text-[10px] font-bold uppercase tracking-[0.3em] mb-1">Identificação do Lote</p>
                            <p className="text-white font-mono text-xl tracking-widest">{selectedBatch.batchCode}</p>
                          </div>

                          {/* Zoom Hint */}
                          {selectedBatch.medias && selectedBatch.medias.length > 0 && (
                            <div className="absolute top-6 right-6 bg-white/20 backdrop-blur-md text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                              <Maximize2 className="w-5 h-5" />
                            </div>
                          )}

                          {/* Carousel Arrows (On Hover) */}
                          {selectedBatch.medias && selectedBatch.medias.length > 1 && (
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
                        {selectedBatch.medias && selectedBatch.medias.length > 1 && (
                          <div className="flex gap-4 mt-6 overflow-x-auto pb-2">
                            {selectedBatch.medias.map((media, idx) => (
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
                                <img src={media.url} alt={`${selectedBatch.batchCode} - ${idx + 1}`} className="w-full h-full object-cover" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Additional Info Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="aspect-[3/2] sm:aspect-square md:aspect-[2/1] bg-slate-100 flex items-center justify-center text-slate-400 font-serif italic text-lg border border-slate-200/50">
                          <Layers className="w-6 h-6 mr-3 opacity-50" strokeWidth={0.8} />
                          <span>Área: {formatArea(selectedBatch.totalArea)}</span>
                        </div>
                        <div className="aspect-[3/2] sm:aspect-square md:aspect-[2/1] bg-[#121212] p-8 flex flex-col justify-between text-white">
                          <Ruler className="w-8 h-8 text-[#C2410C]" strokeWidth={0.8} />
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.3em] opacity-60 mb-2">Espessura</p>
                            <p className="text-3xl font-serif">{selectedBatch.thickness} cm</p>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Info Block - Full Width Luxury Design */}
                  <div className="mt-10 md:mt-16 lg:mt-20 animate-in fade-in slide-in-from-bottom duration-700 delay-300">
                    <div className="relative bg-white border border-slate-200 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)] overflow-hidden">
                      {/* Top accent bar */}
                      <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-transparent via-[#C2410C] to-transparent" />
                      <div className="relative z-10 p-8 pt-12">
                        {/* Main info grid */}
                        <div className="mx-auto">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 mb-8">
                            {/* Dimensions */}
                            <div className="text-center md:text-left space-y-3 border-b md:border-b-0 md:border-r border-slate-200 pb-8 md:pb-0">
                              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400 flex items-center justify-center md:justify-start gap-2">
                                <span className="w-1.5 h-1.5 bg-[#C2410C] rounded-full" />
                                Dimensões
                              </p>
                              <p className="text-2xl md:text-3xl font-serif text-[#121212] tracking-tight">
                                {formatDimensions(selectedBatch.height, selectedBatch.width, selectedBatch.thickness)}
                              </p>
                            </div>

                            {/* Area */}
                            <div className="text-center space-y-3 border-b md:border-b-0 md:border-r border-slate-200 pb-8 md:pb-0">
                              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400 flex items-center justify-center gap-2">
                                <span className="w-1.5 h-1.5 bg-[#C2410C] rounded-full" />
                                Área Total
                              </p>
                              <p className="text-2xl md:text-3xl font-serif text-[#121212] tracking-tight">
                                {formatArea(selectedBatch.totalArea)}
                              </p>
                            </div>

                            {/* Origin */}
                            <div className="text-center md:text-right space-y-3">
                              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#C2410C] flex items-center justify-center md:justify-end gap-2">
                                <span className="w-1.5 h-1.5 bg-[#C2410C] rounded-full" />
                                Origem
                              </p>
                              <p className="text-2xl md:text-3xl font-serif text-[#121212] tracking-tight leading-none">
                                {selectedBatch.originQuarry || 'Não informada'}
                              </p>
                            </div>
                          </div>

                          {/* Footer badge */}
                          <div className="pt-4 border-t border-slate-200">
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-10 h-10 md:bg-slate-100">
                                  <ShieldCheck className="w-5 h-5 text-slate-400" />
                                </div>
                                <div className="text-left">
                                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Catálogo Oficial</p>
                                  <p className="text-sm font-medium text-[#121212]">{catalog.depositName}</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 px-4 py-2 border rounded-sm bg-emerald-50 border-emerald-200">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Disponível</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </main>
            </div>
          </div>
        </div>
      )}

      {/* Editorial Navigation */}
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-md z-50 border-b border-slate-100 animate-in slide-in-from-top duration-500">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 h-20 md:h-24 flex items-center justify-between gap-4">
          {/* Logo & Identity */}
          <div className="flex items-center">
            <div className="text-2xl md:text-3xl font-serif font-bold tracking-tight">CAVA</div>
            <div className="h-8 w-px bg-slate-200 mx-4 md:mx-6 hidden sm:block"></div>
            {catalog.depositLogo && (
              <img
                src={catalog.depositLogo}
                alt={catalog.depositName}
                className="h-8 md:h-10 object-contain hidden sm:block"
              />
            )}
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] text-[#C2410C] border border-[#C2410C] px-2 sm:px-3 py-1">
              Catálogo
            </div>
          </div>
        </div>
      </nav>

      <main className="pt-24 pb-20">
        {/* Hero Header Section */}
        <section className="max-w-[1600px] mx-auto px-4 sm:px-6 md:px-8 pt-4 pb-2">
          <div className="animate-in slide-in-from-left duration-700">
            <div className="flex items-center space-x-4 mb-3">
              <span className="h-px w-10 bg-[#121212]"></span>
              <span className="text-xs font-bold uppercase tracking-[0.3em] text-[#121212]">Catálogo Exclusivo</span>
            </div>

            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-4">
              <div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-serif font-medium leading-[0.95] tracking-tight text-[#121212] mb-2">
                  {catalog.title || catalog.depositName}
                </h1>
                {(catalog.depositCity || catalog.depositState) && (
                  <div className="flex items-center gap-2 text-slate-500">
                    <MapPin className="w-4 h-4" />
                    <span className="text-base font-light">{[catalog.depositCity, catalog.depositState].filter(Boolean).join(', ')}</span>
                  </div>
                )}
              </div>
              
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-1">Lotes Disponíveis</p>
                <p className="text-3xl md:text-4xl font-serif text-[#121212]">{catalog.batches.length}</p>
              </div>
            </div>

            {catalog.customMessage && (
              <div className="bg-[#121212] p-4 md:p-6 mt-4">
                <p className="text-white/80 text-base font-light font-serif italic leading-relaxed">
                  "{catalog.customMessage}"
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Batches Grid */}
        <section className="max-w-[1600px] mx-auto px-4 sm:px-6 md:px-8 py-6">
          {catalog.batches.length === 0 ? (
            <div className="bg-white border border-slate-200 p-16 text-center">
              <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="font-serif text-2xl text-[#121212] mb-2">Nenhum lote disponível</h3>
              <p className="text-slate-500">Este catálogo ainda não possui lotes cadastrados</p>
            </div>
          ) : (
            <div className="space-y-16">
              {industries.map((industry, industryIndex) => (
                <div key={industryIndex} className="animate-in fade-in slide-in-from-bottom duration-700" style={{ animationDelay: `${industryIndex * 100}ms` }}>
                  {/* Industry Header */}
                  <div className="mb-8 flex items-end justify-between border-b border-slate-200 pb-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400 mb-2">Fornecedor</p>
                      <h2 className="text-2xl md:text-3xl font-serif text-[#121212]">
                        {industry.name}
                      </h2>
                    </div>
                    <p className="text-sm text-slate-500">
                      {industry.batches.length} {industry.batches.length === 1 ? 'lote' : 'lotes'}
                    </p>
                  </div>

                  {/* Batches Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {industry.batches.map((batch, batchIndex) => {
                      const mainImage = batch.medias && batch.medias.length > 0 ? batch.medias[0] : null;
                      const hasMultipleImages = batch.medias && batch.medias.length > 1;
                      
                      return (
                        <div
                          key={batch.batchCode}
                          onClick={() => openBatchDetail(batch)}
                          className="group cursor-pointer"
                        >
                          {/* Image Container */}
                          <div className="aspect-[3/4] bg-slate-100 relative overflow-hidden mb-6">
                            {mainImage && !isPlaceholderUrl(mainImage.url) ? (
                              <>
                                <img
                                  src={mainImage.url}
                                  alt={batch.batchCode}
                                  className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                                />
                                {hasMultipleImages && (
                                  <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white border border-white/10">
                                    +{batch.medias!.length - 1}
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                                <Package className="w-12 h-12 mb-2" />
                              </div>
                            )}
                            
                            {/* Hover Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            
                            {/* Batch Code Watermark */}
                            <div className="absolute bottom-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                              <p className="text-white/60 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">Lote</p>
                              <p className="text-white font-mono text-sm tracking-wider">{batch.batchCode}</p>
                            </div>
                          </div>

                          {/* Content */}
                          <div>
                            <h3 className="text-xl font-serif text-[#121212] mb-2 group-hover:text-[#C2410C] transition-colors">
                              {batch.productName || batch.batchCode}
                            </h3>
                            {(batch.material || batch.finish) && (
                              <p className="text-sm text-slate-500 font-light leading-relaxed mb-3">
                                {[batch.material, batch.finish].filter(Boolean).join(' • ')}
                              </p>
                            )}
                            <div className="flex items-center text-xs font-bold uppercase tracking-widest text-slate-400">
                              <Ruler className="w-3 h-3 mr-2" strokeWidth={0.8} />
                              {formatArea(batch.totalArea)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="text-2xl font-serif font-bold tracking-tight text-[#121212]">CAVA</div>
            {catalog.depositLogo && (
              <>
                <div className="h-6 w-px bg-slate-200"></div>
                <img src={catalog.depositLogo} alt={catalog.depositName} className="h-6 object-contain opacity-60" />
              </>
            )}
          </div>
          <p className="text-xs text-slate-400 uppercase tracking-widest">
            © {new Date().getFullYear()} - Todos os direitos reservados
          </p>
        </div>
      </footer>
    </div>
  );
}
