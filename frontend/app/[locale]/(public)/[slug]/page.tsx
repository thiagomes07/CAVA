'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Package,
  Send,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Ruler,
  Layers,
  ShieldCheck,
  X,
  Maximize2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/lib/hooks/useToast';
import { clienteCaptureSchema, type ClienteCaptureInput } from '@/lib/schemas/link.schema';
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
  const { success, error } = useToast();
  const slug = params.slug as string;

  const [link, setLink] = useState<PublicSalesLink | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClienteCaptureInput>({
    resolver: zodResolver(clienteCaptureSchema),
    defaultValues: {
      marketingOptIn: true,
    },
  });

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

  const onSubmit = async (data: ClienteCaptureInput) => {
    if (!link) return;

    try {
      setIsSubmitting(true);
      await apiClient.post('/public/clientes/interest', {
        ...data,
        salesLinkId: link.id,
      });
      success('Interesse registrado com sucesso!');
      setSubmitted(true);
    } catch (err) {
      error('Erro ao registrar interesse');
    } finally {
      setIsSubmitting(false);
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

      {/* Main Checkout Layout */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">

          {/* Left Column - Product */}
          <div className="space-y-6">
            {/* Image Gallery */}
            <div className="relative group">
              <div 
                className="aspect-square bg-slate-100 relative overflow-hidden cursor-zoom-in shadow-lg"
                onClick={() => setIsLightboxOpen(true)}
              >
                {currentImage ? (
                  <img
                    src={currentImage.url}
                    alt={productName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-16 h-16 text-slate-300" />
                  </div>
                )}

                {/* Zoom Hint */}
                <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-sm text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <Maximize2 className="w-4 h-4" />
                </div>

                {/* Navigation */}
                {hasMultipleImages && (
                  <>
                    <button 
                      onClick={prevImage} 
                      className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-white/90 hover:bg-white shadow-lg transition-all opacity-0 group-hover:opacity-100"
                    >
                      <ChevronLeft className="w-5 h-5 text-[#121212]" />
                    </button>
                    <button 
                      onClick={nextImage} 
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-white/90 hover:bg-white shadow-lg transition-all opacity-0 group-hover:opacity-100"
                    >
                      <ChevronRight className="w-5 h-5 text-[#121212]" />
                    </button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm text-white text-xs px-3 py-1 font-mono">
                      {selectedImageIndex + 1} / {medias.length}
                    </div>
                  </>
                )}
              </div>

              {/* Thumbnails */}
              {hasMultipleImages && (
                <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                  {medias.map((media, idx) => (
                    <button
                      key={media.id}
                      onClick={() => setSelectedImageIndex(idx)}
                      className={cn(
                        'w-16 h-16 shrink-0 overflow-hidden transition-all',
                        selectedImageIndex === idx 
                          ? 'ring-2 ring-[#C2410C]' 
                          : 'opacity-50 hover:opacity-100'
                      )}
                    >
                      <img src={media.url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info - Mobile Only */}
            <div className="lg:hidden space-y-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-2">
                  {isMultipleBatches ? 'Pedido' : 'Produto'}
                </p>
                <h1 className="text-2xl font-serif text-[#121212]">{productName}</h1>
                {!isMultipleBatches && (batch?.material || product?.material) && (
                  <p className="text-sm text-slate-500 mt-1">
                    {batch?.material || product?.material} • {batch?.finish || product?.finish}
                  </p>
                )}
                {isMultipleBatches && totals && (
                  <p className="text-sm text-slate-500 mt-1">
                    {totals.totalPieces} peça(s) em {items!.length} lote(s)
                  </p>
                )}
              </div>
            </div>

            {/* Specs Grid - Single Batch */}
            {batch && !isMultipleBatches && (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 border border-slate-200">
                  <div className="flex items-center gap-2 text-slate-400 mb-2">
                    <Layers className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Área</span>
                  </div>
                  <p className="text-lg font-serif text-[#121212]">{formatArea(batch.totalArea)}</p>
                </div>
                <div className="bg-white p-4 border border-slate-200">
                  <div className="flex items-center gap-2 text-slate-400 mb-2">
                    <Ruler className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Dimensões</span>
                  </div>
                  <p className="text-lg font-serif text-[#121212]">{batch.height} × {batch.width} cm</p>
                </div>
                {batch.originQuarry && (
                  <div className="bg-white p-4 border border-slate-200 col-span-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Origem</p>
                    <p className="text-lg font-serif text-[#121212]">{batch.originQuarry}</p>
                  </div>
                )}
              </div>
            )}

            {/* Items List - Multiple Batches */}
            {isMultipleBatches && (
              <div className="space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                  {items.length} Lote(s) no Pedido
                </p>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {items.map((item, index) => (
                    <div key={index} className="bg-white border border-slate-200 p-4">
                      <div className="flex gap-3">
                        {/* Thumbnail */}
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
                        
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-[#121212] truncate">{item.productName}</p>
                          <p className="text-xs text-slate-400 font-mono">{item.batchCode}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            {item.material} • {item.finish}
                          </p>
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
                
                {/* Summary */}
                {totals && (
                  <div className="bg-slate-100 p-4 border border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">
                        Total: {totals.totalPieces} peça(s)
                      </span>
                      {link.showPrice && totals.totalValue > 0 && (
                        <span className="text-lg font-bold text-[#121212]">
                          {formatCurrency(totals.totalValue)}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column - Checkout */}
          <div className="lg:sticky lg:top-8 lg:self-start space-y-6">
            {/* Product Info - Desktop */}
            <div className="hidden lg:block">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-2">
                {isMultipleBatches ? 'Pedido' : 'Produto'}
              </p>
              <h1 className="text-3xl font-serif text-[#121212] mb-2">{productName}</h1>
              {!isMultipleBatches && (batch?.material || product?.material) && (
                <p className="text-slate-500">
                  {batch?.material || product?.material} • {batch?.finish || product?.finish}
                </p>
              )}
              {!isMultipleBatches && batch && (
                <p className="text-sm text-slate-400 font-mono mt-2">Lote: {batch.batchCode}</p>
              )}
              {isMultipleBatches && totals && (
                <p className="text-slate-500 mt-1">
                  {totals.totalPieces} peça(s) em {items!.length} lote(s)
                </p>
              )}
            </div>

            {/* Price Card */}
            <div className="bg-[#121212] text-white p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">Valor Total</p>
                <div className="flex items-center gap-2 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Disponível</span>
                </div>
              </div>
              {link.showPrice && link.displayPrice ? (
                <div>
                  <p className="text-4xl md:text-5xl font-serif tracking-tight">{formatCurrency(link.displayPrice)}</p>
                  {!isMultipleBatches && batch && batch.totalArea > 0 && (
                    <p className="text-sm text-white/50 mt-2">≈ {formatCurrency(link.displayPrice / batch.totalArea)}/m²</p>
                  )}
                  {isMultipleBatches && totals && (
                    <p className="text-sm text-white/50 mt-2">{totals.totalPieces} peça(s)</p>
                  )}
                </div>
              ) : (
                <p className="text-3xl font-serif italic text-white/60">Sob Consulta</p>
              )}
            </div>

            {/* Interest Form */}
            <div className="bg-white border border-slate-200 p-6">
              {submitted ? (
                <div className="py-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h3 className="text-xl font-serif text-[#121212] mb-2">Interesse Registrado!</h3>
                  <p className="text-sm text-slate-500">Entraremos em contato em breve.</p>
                </div>
              ) : (
                <>
                  <h3 className="text-lg font-serif text-[#121212] mb-4">Tenho Interesse</h3>
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1.5">
                        Nome Completo *
                      </label>
                      <Input
                        {...register('name')}
                        placeholder="Seu nome"
                        error={errors.name?.message}
                        disabled={isSubmitting}
                        className="bg-slate-50 border-slate-200"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1.5">
                        Email ou Telefone *
                      </label>
                      <Input
                        {...register('contact')}
                        placeholder="email@exemplo.com ou (11) 99999-9999"
                        error={errors.contact?.message}
                        disabled={isSubmitting}
                        className="bg-slate-50 border-slate-200"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1.5">
                        Mensagem (Opcional)
                      </label>
                      <Textarea
                        {...register('message')}
                        placeholder="Alguma dúvida ou observação?"
                        rows={3}
                        error={errors.message?.message}
                        disabled={isSubmitting}
                        className="bg-slate-50 border-slate-200"
                      />
                    </div>

                    <div className="flex items-start gap-2 pt-1">
                      <input
                        type="checkbox"
                        {...register('marketingOptIn')}
                        className="mt-0.5 rounded border-slate-300 text-[#C2410C] focus:ring-[#C2410C]"
                        disabled={isSubmitting}
                      />
                      <label className="text-xs text-slate-500">
                        Aceito receber novidades e ofertas
                      </label>
                    </div>

                    <Button
                      type="submit"
                      variant="primary"
                      loading={isSubmitting}
                      className="w-full bg-[#C2410C] hover:bg-[#a13608] text-white py-3 font-bold uppercase tracking-wider text-sm"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Enviar Interesse
                    </Button>
                  </form>
                </>
              )}
            </div>

            {/* Trust Badge */}
            <div className="flex items-center justify-center gap-3 text-slate-400 py-2">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-xs">Link exclusivo e seguro</span>
            </div>
          </div>
        </div>

        {/* Custom Message */}
        {link.customMessage && (
          <div className="mt-12 border-t border-slate-200 pt-8">
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
