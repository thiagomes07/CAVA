'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Toggle } from '@/components/ui/toggle';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/lib/hooks/useToast';
import { z } from 'zod';
import type { SalesLink } from '@/lib/types';
import { useLocale } from 'next-intl';

const editLinkSchema = z.object({
  title: z
    .string()
    .max(100, 'Título deve ter no máximo 100 caracteres')
    .optional(),
  customMessage: z
    .string()
    .max(500, 'Mensagem deve ter no máximo 500 caracteres')
    .optional(),
  displayPrice: z
    .number({ message: 'Preço deve ser um número' })
    .positive('Preço deve ser maior que zero')
    .optional(),
  showPrice: z.boolean(),
  expiresAt: z
    .string()
    .refine((val) => !val || !isNaN(Date.parse(val)), 'Data inválida')
    .refine(
      (val) => !val || new Date(val) > new Date(),
      'Data de expiração deve ser futura'
    )
    .optional(),
  isActive: z.boolean(),
});

type EditLinkInput = z.infer<typeof editLinkSchema>;

export default function EditSalesLinkPage() {
  const locale = useLocale();
  const params = useParams();
  const router = useRouter();
  const { success, error } = useToast();
  const linkId = params.id as string;

  const [link, setLink] = useState<SalesLink | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm<EditLinkInput>({
    resolver: zodResolver(editLinkSchema),
  });

  const showPrice = watch('showPrice');
  const isActive = watch('isActive');

  useEffect(() => {
    fetchLink();
  }, [linkId]);

  const fetchLink = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.get<SalesLink>(`/sales-links/${linkId}`);
      setLink(data);

      // Populate form with existing data
      reset({
        title: data.title || '',
        customMessage: data.customMessage || '',
        displayPrice: data.displayPrice || undefined,
        showPrice: data.showPrice,
        expiresAt: data.expiresAt ? new Date(data.expiresAt).toISOString().split('T')[0] : '',
        isActive: data.isActive,
      });
    } catch (err) {
      error('Erro ao carregar link');
      router.push(`/${locale}/links`);
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: EditLinkInput) => {
    try {
      setIsSubmitting(true);

      // Convert date to RFC3339 if provided
      const payload: any = { ...data };
      if (payload.expiresAt) {
        const date = new Date(payload.expiresAt);
        payload.expiresAt = date.toISOString();
      }

      await apiClient.patch(`/sales-links/${linkId}`, payload);
      success('Link atualizado com sucesso!');
      router.push(`/${locale}/links`);
    } catch (err) {
      error('Erro ao atualizar link');
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
    return null;
  }

  const productName = link.batch?.product?.name || link.product?.name || 'Produto';

  return (
    <div className="min-h-screen bg-mineral">
      {/* Header */}
      <div className="bg-porcelain border-b border-slate-100 px-8 py-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push(`/${locale}/links`)}
            className="p-2 hover:bg-slate-100 rounded-sm transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="font-serif text-3xl text-obsidian mb-2">
              Editar Link de Venda
            </h1>
            <p className="text-sm text-slate-500">
              {productName} • {link.slugToken}
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="px-8 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <h2 className="text-lg font-semibold text-obsidian mb-6">
              Informações do Link
            </h2>

            <div className="space-y-6">
              <Input
                {...register('title')}
                label="Título Personalizado"
                placeholder={productName}
                error={errors.title?.message}
                disabled={isSubmitting}
              />

              <Textarea
                {...register('customMessage')}
                label="Mensagem Personalizada"
                placeholder="Aparecerá no topo da landing page..."
                rows={4}
                error={errors.customMessage?.message}
                disabled={isSubmitting}
              />

              <Input
                {...register('displayPrice', { valueAsNumber: true })}
                type="number"
                step="0.01"
                label="Preço de Exibição (R$)"
                error={errors.displayPrice?.message}
                disabled={isSubmitting}
              />

              <Toggle
                {...register('showPrice')}
                checked={showPrice}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue('showPrice', e.target.checked)}
                label="Exibir preço no link"
              />

              <Input
                {...register('expiresAt')}
                type="date"
                label="Data de Expiração (Opcional)"
                error={errors.expiresAt?.message}
                disabled={isSubmitting}
              />

              <Toggle
                {...register('isActive')}
                checked={isActive}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue('isActive', e.target.checked)}
                label="Link Ativo"
              />
            </div>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-between mt-8">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push(`/${locale}/links`)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>

            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting}
            >
              <Save className="w-4 h-4 mr-2" />
              Salvar Alterações
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
