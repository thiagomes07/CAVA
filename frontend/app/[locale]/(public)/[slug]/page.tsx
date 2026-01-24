'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Package, Send, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/lib/hooks/useToast';
import { clienteCaptureSchema, type ClienteCaptureInput } from '@/lib/schemas/link.schema';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { formatArea } from '@/lib/utils/formatDimensions';
import type { SalesLink } from '@/lib/types';

export default function PublicLinkPage() {
  const params = useParams();
  const router = useRouter();
  const { success, error } = useToast();
  const slug = params.slug as string;

  const [link, setLink] = useState<SalesLink | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
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
      const data = await apiClient.get<SalesLink>(`/public/links/${slug}`);
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
      <div className="min-h-screen bg-mineral flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-obsidian mx-auto mb-4"></div>
          <p className="text-slate-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!link) {
    return (
      <div className="min-h-screen bg-mineral flex items-center justify-center">
        <div className="text-center">
          <Package className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <h1 className="text-2xl font-serif text-obsidian mb-2">Link não encontrado</h1>
          <p className="text-slate-600">Este link pode ter expirado ou não existe.</p>
        </div>
      </div>
    );
  }

  const content = link.batch || link.product;
  const productName = link.batch?.product?.name || link.product?.name || 'Produto';
  const thumbnail = link.batch?.medias?.[0] || link.product?.medias?.[0];

  return (
    <div className="min-h-screen bg-mineral">
      {/* Header */}
      <div className="bg-obsidian text-porcelain py-6 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="font-serif text-3xl mb-2">CAVA</h1>
          <p className="text-sm text-slate-300">Premium Ornamental Stones</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Custom Message */}
        {link.customMessage && (
          <Card className="mb-8">
            <p className="text-slate-700 italic">{link.customMessage}</p>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Product Info */}
          <div>
            <Card>
              <h2 className="text-2xl font-serif text-obsidian mb-4">
                {link.title || productName}
              </h2>

              {/* Image */}
              {thumbnail && (
                <div className="mb-6">
                  <img
                    src={thumbnail.url}
                    alt={productName}
                    className="w-full h-64 object-cover rounded-sm"
                  />
                </div>
              )}

              {/* Details */}
              <div className="space-y-4">
                {link.batch && (
                  <>
                    <div>
                      <p className="text-xs uppercase tracking-widest text-slate-500 mb-1">
                        Código do Lote
                      </p>
                      <p className="font-mono text-lg text-obsidian">{link.batch.batchCode}</p>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-widest text-slate-500 mb-1">
                        Área Total
                      </p>
                      <p className="text-lg text-obsidian">{formatArea(link.batch.totalArea)}</p>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-widest text-slate-500 mb-1">
                        Material
                      </p>
                      <p className="text-obsidian">
                        {link.batch.product?.material} • {link.batch.product?.finish}
                      </p>
                    </div>
                  </>
                )}

                {link.product && !link.batch && (
                  <>
                    <div>
                      <p className="text-xs uppercase tracking-widest text-slate-500 mb-1">
                        Material
                      </p>
                      <p className="text-obsidian">
                        {link.product.material} • {link.product.finish}
                      </p>
                    </div>

                    {link.product.description && (
                      <div>
                        <p className="text-xs uppercase tracking-widest text-slate-500 mb-1">
                          Descrição
                        </p>
                        <p className="text-slate-700">{link.product.description}</p>
                      </div>
                    )}
                  </>
                )}

                {/* Price */}
                {link.showPrice && link.displayPrice && (
                  <div className="pt-4 border-t border-slate-200">
                    <p className="text-xs uppercase tracking-widest text-slate-500 mb-1">
                      Preço
                    </p>
                    <p className="font-serif text-3xl text-obsidian">
                      {formatCurrency(link.displayPrice)}
                    </p>
                  </div>
                )}

                {(!link.showPrice || !link.displayPrice) && (
                  <div className="pt-4 border-t border-slate-200">
                    <p className="text-lg text-slate-600 italic">Sob Consulta</p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Contact Form */}
          <div>
            {submitted ? (
              <Card className="text-center">
                <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                <h3 className="text-2xl font-serif text-obsidian mb-2">
                  Obrigado pelo seu interesse!
                </h3>
                <p className="text-slate-600">
                  Entraremos em contato em breve com mais informações sobre este produto.
                </p>
              </Card>
            ) : (
              <Card>
                <h3 className="text-xl font-serif text-obsidian mb-4">
                  Demonstre seu interesse
                </h3>
                <p className="text-sm text-slate-600 mb-6">
                  Preencha o formulário abaixo e entraremos em contato com você.
                </p>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <Input
                    {...register('name')}
                    label="Nome completo"
                    placeholder="Seu nome"
                    error={errors.name?.message}
                    disabled={isSubmitting}
                  />

                  <Input
                    {...register('contact')}
                    label="Email ou Telefone"
                    placeholder="email@exemplo.com ou (00) 00000-0000"
                    error={errors.contact?.message}
                    disabled={isSubmitting}
                  />

                  <Textarea
                    {...register('message')}
                    label="Mensagem (Opcional)"
                    placeholder="Conte-nos mais sobre seu interesse..."
                    rows={4}
                    error={errors.message?.message}
                    disabled={isSubmitting}
                  />

                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      {...register('marketingOptIn')}
                      className="mt-1"
                      disabled={isSubmitting}
                    />
                    <label className="text-sm text-slate-600">
                      Aceito receber comunicações sobre produtos e ofertas
                    </label>
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    loading={isSubmitting}
                    className="w-full"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Enviar interesse
                  </Button>
                </form>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-obsidian text-porcelain py-8 px-4 mt-16">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm text-slate-300">
            © {new Date().getFullYear()} CAVA. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}
