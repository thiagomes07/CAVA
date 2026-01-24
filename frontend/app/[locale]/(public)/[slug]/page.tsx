'use client';

import { useEffect, useState } from 'react';
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
  MapPin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/lib/hooks/useToast';
import { clienteCaptureSchema, type ClienteCaptureInput } from '@/lib/schemas/link.schema';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { formatArea, formatDimensions } from '@/lib/utils/formatDimensions';
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

interface PublicSalesLink {
  title?: string;
  customMessage?: string;
  displayPrice?: number;
  showPrice: boolean;
  batch?: PublicBatch;
  product?: PublicProduct;
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

  if (!link) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h1 className="text-xl font-serif text-obsidian mb-2">Link não encontrado</h1>
          <p className="text-slate-500 text-sm">Este link pode ter expirado ou não existe.</p>
        </div>
      </div>
    );
  }

  const batch = link.batch;
  const product = link.product;
  const productName = batch?.productName || product?.name || 'Produto';
  const medias: Media[] = batch?.medias || product?.medias || [];
  const hasMultipleImages = medias.length > 1;
  const currentImage = medias[selectedImageIndex];

  const nextImage = () => {
    setSelectedImageIndex((prev) => (prev + 1) % medias.length);
  };

  const prevImage = () => {
    setSelectedImageIndex((prev) => (prev - 1 + medias.length) % medias.length);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-obsidian text-porcelain py-3 px-4 flex-shrink-0">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-serif text-xl tracking-wider">CAVA</h1>
          </div>
          <p className="text-xs text-slate-400 tracking-widest uppercase hidden sm:block">Premium Stones</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-5xl">
          {/* Custom Message */}
          {link.customMessage && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-center">
              <p className="text-amber-800 text-sm italic">{link.customMessage}</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            {/* Left - Image Gallery */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden flex flex-col">
              {/* Main Image */}
              <div className="relative aspect-square bg-slate-100">
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

                {/* Navigation Arrows */}
                {hasMultipleImages && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 shadow flex items-center justify-center hover:bg-white transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5 text-obsidian" />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 shadow flex items-center justify-center hover:bg-white transition-colors"
                    >
                      <ChevronRight className="w-5 h-5 text-obsidian" />
                    </button>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/50 text-white text-xs">
                      {selectedImageIndex + 1} / {medias.length}
                    </div>
                  </>
                )}
              </div>

              {/* Thumbnails */}
              {hasMultipleImages && (
                <div className="flex gap-1 p-2 bg-slate-50 overflow-x-auto">
                  {medias.map((media, index) => (
                    <button
                      key={media.id}
                      onClick={() => setSelectedImageIndex(index)}
                      className={cn(
                        'flex-shrink-0 w-14 h-14 rounded overflow-hidden border-2 transition-all',
                        index === selectedImageIndex
                          ? 'border-obsidian'
                          : 'border-transparent opacity-60 hover:opacity-100'
                      )}
                    >
                      <img
                        src={media.url}
                        alt={`${productName} - ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Product Details */}
              <div className="p-4 border-t border-slate-100 flex-1">
                <div className="grid grid-cols-2 gap-4">
                  {batch && (
                    <>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Código</p>
                        <p className="font-mono text-sm text-obsidian">{batch.batchCode}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Área</p>
                        <p className="text-sm text-obsidian">{formatArea(batch.totalArea)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Dimensões</p>
                        <p className="text-sm text-obsidian">{formatDimensions(batch.height, batch.width, batch.thickness)}</p>
                      </div>
                      {batch.originQuarry && (
                        <div>
                          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Origem</p>
                          <p className="text-sm text-obsidian">{batch.originQuarry}</p>
                        </div>
                      )}
                    </>
                  )}
                  {(batch?.material || product?.material) && (
                    <div className="col-span-2">
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Material</p>
                      <p className="text-sm text-obsidian">
                        {batch?.material || product?.material} • {batch?.finish || product?.finish}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right - Product Info & Form */}
            <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col">
              {/* Title & Price */}
              <div className="mb-6">
                <h2 className="font-serif text-2xl text-obsidian mb-2">
                  {link.title || productName}
                </h2>
                {(batch?.material || product?.material) && (
                  <p className="text-slate-500 text-sm mb-4">
                    {batch?.material || product?.material} • {batch?.finish || product?.finish}
                  </p>
                )}

                <div className="py-4 border-y border-slate-100">
                  {link.showPrice && link.displayPrice ? (
                    <div>
                      <p className="font-serif text-3xl text-obsidian">
                        {formatCurrency(link.displayPrice)}
                      </p>
                      {batch && batch.totalArea > 0 && (
                        <p className="text-xs text-slate-500 mt-1">
                          ≈ {formatCurrency(link.displayPrice / batch.totalArea)}/m²
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-lg text-slate-500 italic">Sob Consulta</p>
                  )}
                </div>
              </div>

              {/* Form */}
              <div className="flex-1">
                {submitted ? (
                  <div className="h-full flex flex-col items-center justify-center text-center py-8">
                    <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                      <CheckCircle className="w-7 h-7 text-emerald-600" />
                    </div>
                    <h3 className="text-lg font-serif text-obsidian mb-2">
                      Obrigado!
                    </h3>
                    <p className="text-sm text-slate-500">
                      Entraremos em contato em breve.
                    </p>
                  </div>
                ) : (
                  <>
                    <h3 className="font-medium text-obsidian mb-1">Tenho Interesse</h3>
                    <p className="text-xs text-slate-500 mb-4">
                      Preencha seus dados para receber mais informações.
                    </p>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
                      <Input
                        {...register('name')}
                        label="Nome"
                        placeholder="Seu nome completo"
                        error={errors.name?.message}
                        disabled={isSubmitting}
                      />

                      <Input
                        {...register('contact')}
                        label="Email ou Telefone"
                        placeholder="email@exemplo.com"
                        error={errors.contact?.message}
                        disabled={isSubmitting}
                      />

                      <Textarea
                        {...register('message')}
                        label="Mensagem (Opcional)"
                        placeholder="Alguma dúvida?"
                        rows={2}
                        error={errors.message?.message}
                        disabled={isSubmitting}
                      />

                      <div className="flex items-start gap-2 pt-1">
                        <input
                          type="checkbox"
                          {...register('marketingOptIn')}
                          className="mt-0.5 rounded border-slate-300"
                          disabled={isSubmitting}
                        />
                        <label className="text-xs text-slate-500">
                          Aceito receber comunicações sobre produtos
                        </label>
                      </div>

                      <Button
                        type="submit"
                        variant="primary"
                        loading={isSubmitting}
                        className="w-full mt-4"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Enviar
                      </Button>
                    </form>
                  </>
                )}
              </div>

              {/* Footer inside card */}
              <div className="pt-4 mt-4 border-t border-slate-100 text-center">
                <p className="text-xs text-slate-400">
                  © {new Date().getFullYear()} CAVA
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
