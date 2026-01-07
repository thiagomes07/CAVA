'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  ChevronDown, 
  CheckCircle, 
  Ruler, 
  Package, 
  Calendar,
  MapPin,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/lib/hooks/useToast';
import { leadCaptureSchema, type LeadCaptureInput } from '@/lib/schemas/link.schema';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { formatDimensions, formatArea } from '@/lib/utils/formatDimensions';
import { formatDate } from '@/lib/utils/formatDate';
import { cn } from '@/lib/utils/cn';
import type { SalesLink } from '@/lib/types';

export default function PublicLinkPage() {
  const params = useParams();
  const slug = params.slug as string;
  const isSlugValid = /^[a-zA-Z0-9_-]+$/.test(slug || '');
  
  const [link, setLink] = useState<SalesLink | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { success, error } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<LeadCaptureInput>({
    resolver: zodResolver(leadCaptureSchema),
    defaultValues: {
      name: '',
      contact: '',
      message: '',
      marketingOptIn: false,
    },
  });

  useEffect(() => {
    const fetchLink = async () => {
      if (!isSlugValid) {
        setIsLoading(false);
        error('Slug inválido');
        return;
      }

      try {
        setIsLoading(true);
        const data = await apiClient.get<SalesLink>(`/public/links/${encodeURIComponent(slug)}`);
        setLink(data);
      } catch (err) {
        error('Link não encontrado ou expirado');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLink();
  }, [slug, error, isSlugValid]);

  useEffect(() => {
    if (!isLightboxOpen) return;

    const gallery = link?.batch
      ? (link.batch.medias?.length ? link.batch.medias : link.batch.product?.medias) ?? []
      : [];

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsLightboxOpen(false);
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        setSelectedImageIndex((prev) => (gallery.length ? (prev + 1) % gallery.length : 0));
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setSelectedImageIndex((prev) => (gallery.length ? (prev - 1 + gallery.length) % gallery.length : 0));
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen, link]);

  const onSubmit = async (data: LeadCaptureInput) => {
    if (!link) return;

    try {
      setIsSubmitting(true);
      
      await apiClient.post('/public/leads/interest', {
        salesLinkId: link.id,
        ...data,
      });

      setIsSubmitted(true);
      reset();
      
      setTimeout(() => {
        document.getElementById('cta-section')?.scrollIntoView({ 
          behavior: 'smooth' 
        });
      }, 100);
    } catch (err) {
      error('Erro ao enviar interesse. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const sanitizeText = (text?: string) =>
    text?.replace(/[<>&"']/g, (char) => {
      const map: Record<string, string> = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
        '&': '&amp;',
      };
      return map[char];
    });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-obsidian" />
      </div>
    );
  }

  if (!isSlugValid || !link || !link.batch) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <h1 className="font-serif text-3xl text-obsidian mb-4">
            Link não encontrado
          </h1>
          <p className="text-slate-600">
            Este link não existe ou expirou
          </p>
        </div>
      </div>
    );
  }

  const batch = link.batch;
  const product = batch.product;
  const images = batch.medias?.length > 0 ? batch.medias : product?.medias || [];
  const mainImage = images[selectedImageIndex];

  return (
    <>
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        {mainImage && (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${mainImage.url})`,
              backgroundAttachment: 'fixed',
            }}
          />
        )}
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

        {/* Content */}
        <div className="relative z-10 text-center px-6 py-20">
          {/* Material Badge */}
          {product && (
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/20 backdrop-blur-md border border-white/40 mb-8">
              <span className="text-xs uppercase tracking-widest font-semibold text-porcelain">
                {product.material}
              </span>
            </div>
          )}

          {/* Title */}
          <h1 className="font-serif text-5xl md:text-7xl text-porcelain mb-4 leading-tight">
            {sanitizeText(link.title) || product?.name || 'Pedra Ornamental'}
          </h1>

          {/* Batch Code */}
          <p className="font-mono text-xl text-porcelain/80 mb-12">
            Lote {batch.batchCode}
          </p>

          {/* CTA Button */}
          <Button
            size="lg"
            variant="primary"
            onClick={() => {
              document.getElementById('cta-section')?.scrollIntoView({ 
                behavior: 'smooth' 
              });
            }}
            className="bg-porcelain text-obsidian hover:shadow-premium-lg"
          >
            TENHO INTERESSE
          </Button>

          {/* Scroll Indicator */}
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 animate-bounce">
            <ChevronDown className="w-8 h-8 text-porcelain/60" />
          </div>
        </div>
      </section>

      {/* Custom Message */}
      {link.customMessage && (
        <section className="py-16 bg-mineral">
          <div className="container mx-auto px-6 max-w-3xl text-center">
            <p className="text-lg text-slate-600 leading-relaxed">
              {sanitizeText(link.customMessage)}
            </p>
          </div>
        </section>
      )}

      {/* Gallery Section */}
      {images.length > 1 && (
        <section className="py-20 bg-porcelain">
          <div className="container mx-auto px-6">
            <h2 className="font-serif text-4xl text-obsidian text-center mb-12">
              Galeria
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-6xl mx-auto">
              {images.map((image, index) => (
                <button
                  key={image.id}
                  onClick={() => {
                    setSelectedImageIndex(index);
                    setIsLightboxOpen(true);
                  }}
                  className="relative aspect-[4/3] overflow-hidden rounded-sm border border-white/20 group"
                >
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                    style={{ backgroundImage: `url(${image.url})` }}
                    aria-label="Abrir imagem em destaque"
                  />
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Specifications Section */}
      <section className="py-20 bg-mineral">
        <div className="container mx-auto px-6 max-w-4xl">
          <h2 className="font-serif text-4xl text-obsidian text-center mb-12">
            Especificações Técnicas
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Dimensions */}
            <div>
              <h3 className="uppercase tracking-widest text-xs font-semibold text-slate-500 mb-6">
                Dimensões
              </h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Ruler className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-500">Altura</p>
                    <p className="font-mono text-lg text-obsidian">{batch.height} cm</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Ruler className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-500">Largura</p>
                    <p className="font-mono text-lg text-obsidian">{batch.width} cm</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Ruler className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-500">Espessura</p>
                    <p className="font-mono text-lg text-obsidian">{batch.thickness} cm</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Package className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-500">Área Total</p>
                    <p className="font-mono text-lg text-obsidian">
                      {formatArea(batch.totalArea)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Package className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-500">Chapas</p>
                    <p className="font-mono text-lg text-obsidian">
                      {batch.quantitySlabs}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Details */}
            <div>
              <h3 className="uppercase tracking-widest text-xs font-semibold text-slate-500 mb-6">
                Origem e Detalhes
              </h3>
              <div className="space-y-4">
                {batch.originQuarry && (
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-sm text-slate-500">Pedreira</p>
                      <p className="text-lg text-obsidian">{batch.originQuarry}</p>
                    </div>
                  </div>
                )}
                {product?.finish && (
                  <div className="flex items-center gap-3">
                    <Package className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-sm text-slate-500">Acabamento</p>
                      <p className="text-lg text-obsidian">{product.finish}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-500">Data de Entrada</p>
                    <p className="text-lg text-obsidian">
                      {formatDate(batch.entryDate)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Product Description */}
          {product?.description && (
            <div className="mt-12 pt-12 border-t border-slate-200">
              <h3 className="uppercase tracking-widest text-xs font-semibold text-slate-500 mb-4">
                Sobre o Material
              </h3>
              <p className="text-slate-600 leading-relaxed">
                {sanitizeText(product.description)}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Price Section */}
      {link.showPrice && link.displayPrice && (
        <section className="py-20 bg-porcelain">
          <div className="container mx-auto px-6 text-center">
            <p className="text-sm uppercase tracking-widest text-slate-500 mb-4">
              Investimento
            </p>
            <p className="font-serif text-6xl text-obsidian mb-4">
              {formatCurrency(link.displayPrice)}
            </p>
            <p className="text-sm text-slate-500">
              Valor total do lote
            </p>
          </div>
        </section>
      )}

      {!link.showPrice && (
        <section className="py-20 bg-porcelain">
          <div className="container mx-auto px-6 text-center">
            <p className="font-serif text-4xl text-obsidian">
              Preço Sob Consulta
            </p>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section id="cta-section" className="py-20 bg-obsidian text-porcelain">
        <div className="container mx-auto px-6 max-w-2xl">
          {isSubmitted ? (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-6" />
              <h2 className="font-serif text-4xl mb-4">
                Interesse Enviado!
              </h2>
              <p className="text-porcelain/80 text-lg">
                Obrigado pelo seu interesse. O vendedor responsável entrará em contato em breve.
              </p>
            </div>
          ) : (
            <>
              <div className="text-center mb-12">
                <h2 className="font-serif text-4xl mb-4">
                  Interessado nesta pedra?
                </h2>
                <p className="text-porcelain/80 text-lg">
                  Preencha o formulário abaixo e entraremos em contato
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <Input
                  {...register('name')}
                  placeholder="Seu nome completo"
                  error={errors.name?.message}
                  disabled={isSubmitting}
                  className="bg-white/10 border-white/20 text-porcelain placeholder:text-porcelain/50"
                />

                <Input
                  {...register('contact')}
                  placeholder="Email ou WhatsApp"
                  error={errors.contact?.message}
                  disabled={isSubmitting}
                  className="bg-white/10 border-white/20 text-porcelain placeholder:text-porcelain/50"
                />

                <Textarea
                  {...register('message')}
                  placeholder="Mensagem (opcional)"
                  error={errors.message?.message}
                  disabled={isSubmitting}
                  rows={4}
                  className="bg-white/10 border-white/20 text-porcelain placeholder:text-porcelain/50"
                />

                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    {...register('marketingOptIn')}
                    id="marketing"
                    className="mt-1 w-4 h-4 rounded border-white/20 bg-white/10"
                  />
                  <label htmlFor="marketing" className="text-sm text-porcelain/80">
                    Quero receber novidades sobre pedras similares
                  </label>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  loading={isSubmitting}
                  className="w-full bg-porcelain text-obsidian hover:shadow-premium-lg"
                >
                  ENVIAR INTERESSE
                </Button>

                <p className="text-xs text-porcelain/60 text-center">
                  Seu contato será enviado para o vendedor responsável
                </p>
              </form>
            </>
          )}
        </div>
      </section>

      {/* Lightbox */}
      {isLightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsLightboxOpen(false)}
        >
          {images.length > 1 && (
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-white/70 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedImageIndex((prev) => (prev - 1 + images.length) % images.length);
              }}
              aria-label="Imagem anterior"
            >
              <ChevronDown className="w-10 h-10 rotate-90" />
            </button>
          )}

          <button
            onClick={() => setIsLightboxOpen(false)}
            className="absolute top-4 right-4 text-white hover:text-white/70 transition-colors"
          >
            <X className="w-8 h-8" />
          </button>

          <div
            className="max-w-6xl max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={images[selectedImageIndex]?.url}
              alt="Imagem ampliada"
              loading="lazy"
              className="max-w-full max-h-[90vh] object-contain"
            />
          </div>

          {images.length > 1 && (
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-white/70 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedImageIndex((prev) => (prev + 1) % images.length);
              }}
              aria-label="Próxima imagem"
            >
              <ChevronDown className="w-10 h-10 -rotate-90" />
            </button>
          )}

          {/* Navigation */}
          {images.length > 1 && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
              {images.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImageIndex(index)}
                  className={cn(
                    'w-3 h-3 rounded-full transition-all',
                    index === selectedImageIndex
                      ? 'bg-white w-8'
                      : 'bg-white/30 hover:bg-white/50'
                  )}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <footer className="py-8 bg-mineral border-t border-slate-200">
        <div className="container mx-auto px-6 max-w-4xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-obsidian rounded-sm" />
              <span className="font-serif text-lg font-semibold text-obsidian">CAVA</span>
            </div>

            {/* Text */}
            <p className="text-sm text-slate-500">
              Powered by CAVA Stone Platform
            </p>

            {/* Links */}
            <Link
              href="/privacy"
              className="text-sm text-slate-500 hover:text-obsidian transition-colors"
            >
              Política de Privacidade
            </Link>
          </div>
        </div>
      </footer>
    </>
  );
}