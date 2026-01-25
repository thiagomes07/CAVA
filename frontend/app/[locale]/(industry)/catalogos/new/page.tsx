'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Check, Search, Package, Copy, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Modal, ModalHeader, ModalTitle, ModalContent, ModalFooter, ModalClose } from '@/components/ui/modal';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/lib/hooks/useToast';
import { formatArea } from '@/lib/utils/formatDimensions';
import { nanoid } from 'nanoid';
import { useLocale } from 'next-intl';
import { z } from 'zod';
import type { Batch } from '@/lib/types';
import { cn } from '@/lib/utils/cn';
import { isPlaceholderUrl } from '@/lib/utils/media';

const catalogLinkSchema = z.object({
  slugToken: z.string().min(3).max(50),
  title: z.string().max(100).optional(),
  customMessage: z.string().max(500).optional(),
  expiresAt: z.string().optional(),
  isActive: z.boolean(),
  batchIds: z.array(z.string().uuid()).min(1, 'Selecione pelo menos um lote'),
});

type CatalogLinkInput = z.infer<typeof catalogLinkSchema>;

export default function CreateCatalogLinkPage() {
  const locale = useLocale();
  const router = useRouter();
  const { success, error } = useToast();

  const [availableBatches, setAvailableBatches] = useState<Batch[]>([]);
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingBatches, setIsLoadingBatches] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string>('');
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const [isSlugAvailable, setIsSlugAvailable] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<CatalogLinkInput>({
    resolver: zodResolver(catalogLinkSchema),
    defaultValues: {
      slugToken: nanoid(10).toLowerCase(),
      isActive: true,
      batchIds: [],
    },
  });

  const slugToken = watch('slugToken');

  useEffect(() => {
    fetchAvailableBatches();
  }, []);

  useEffect(() => {
    setValue('batchIds', selectedBatchIds);
  }, [selectedBatchIds, setValue]);

  useEffect(() => {
    const handle = setTimeout(async () => {
      if (!slugToken || slugToken.length < 3) return;
      setIsCheckingSlug(true);
      try {
        // Verificar se slug está disponível (pode usar o mesmo endpoint de sales-links ou criar um específico)
        const available = await validateSlug(slugToken);
        setIsSlugAvailable(available);
      } catch {
        setIsSlugAvailable(false);
      } finally {
        setIsCheckingSlug(false);
      }
    }, 400);

    return () => clearTimeout(handle);
  }, [slugToken]);

  const validateSlug = async (slug: string): Promise<boolean> => {
    try {
      const response = await apiClient.get<{ valid: boolean }>('/catalog-links/validate-slug', {
        params: { slug },
      });
      return response.valid;
    } catch {
      return false;
    }
  };

  const fetchAvailableBatches = async () => {
    try {
      setIsLoadingBatches(true);
      const data = await apiClient.get<{ batches: Batch[] }>('/batches', {
        params: { limit: 1000, includeArchived: false },
      });
      // Filtrar apenas lotes ativos e não deletados
      const activeBatches = data.batches.filter(
        (b) => b.isActive && !b.deletedAt && b.status === 'DISPONIVEL'
      );
      setAvailableBatches(activeBatches);
    } catch (err) {
      error('Erro ao carregar lotes');
    } finally {
      setIsLoadingBatches(false);
    }
  };

  const toggleBatchSelection = (batchId: string) => {
    setSelectedBatchIds((prev) =>
      prev.includes(batchId)
        ? prev.filter((id) => id !== batchId)
        : [...prev, batchId]
    );
  };

  const filteredBatches = availableBatches.filter((batch) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      batch.batchCode.toLowerCase().includes(searchLower) ||
      batch.product?.name.toLowerCase().includes(searchLower)
    );
  });

  const onSubmit = async (data: CatalogLinkInput) => {
    if (selectedBatchIds.length === 0) {
      error('Selecione pelo menos um lote');
      return;
    }

    if (!isSlugAvailable) {
      error('Este slug já está em uso. Tente outro.');
      return;
    }

    try {
      setIsSubmitting(true);

      const payload: any = {
        ...data,
        batchIds: selectedBatchIds,
      };

      if (payload.expiresAt) {
        const date = new Date(payload.expiresAt);
        payload.expiresAt = date.toISOString();
      }

      const response = await apiClient.post<{ id: string; fullUrl?: string }>(
        '/catalog-links',
        payload
      );

      const fullUrl =
        response.fullUrl || `${window.location.origin}/${locale}/catalogo/${data.slugToken}`;
      setGeneratedLink(fullUrl);
      setShowSuccessModal(true);

      await navigator.clipboard.writeText(fullUrl);
      success('Link copiado para a área de transferência!');
    } catch (err: any) {
      const errorMessage =
        err?.response?.data?.message || err?.message || 'Erro ao criar catálogo';
      error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(generatedLink);
      success('Link copiado!');
    } catch (err) {
      error('Erro ao copiar link');
    }
  };

  return (
    <div className="min-h-screen bg-mineral">
      {/* Header */}
      <div className="bg-porcelain border-b border-slate-100 px-8 py-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push(`/${locale}/catalogos`)}
            className="p-2 hover:bg-slate-100 rounded-sm transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-obsidian" />
          </button>
          <div>
            <h1 className="font-serif text-3xl text-obsidian mb-2">Novo Catálogo</h1>
            <p className="text-sm text-slate-500">
              Crie um link de catálogo personalizado com os lotes selecionados
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-8 py-8 max-w-6xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Informações Básicas */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-obsidian mb-6">Informações do Catálogo</h2>

            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Input
                    {...register('slugToken')}
                    label="Slug do Link"
                    placeholder="meu-catalogo"
                    error={errors.slugToken?.message}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setValue('slugToken', nanoid(10).toLowerCase())}
                    className="mt-6"
                  >
                    Gerar
                  </Button>
                </div>
                {slugToken && (
                  <p className="text-xs text-slate-500 mt-1">
                    Link: {window.location.origin}/{locale}/catalogo/{slugToken}
                  </p>
                )}
                {isCheckingSlug && (
                  <p className="text-xs text-amber-600 mt-1">Verificando disponibilidade...</p>
                )}
                {!isCheckingSlug && slugToken && !isSlugAvailable && (
                  <p className="text-xs text-red-600 mt-1">Este slug já está em uso</p>
                )}
              </div>

              <Input
                {...register('title')}
                label="Título (Opcional)"
                placeholder="Catálogo de Granitos Premium"
                error={errors.title?.message}
              />

              <Textarea
                {...register('customMessage')}
                label="Mensagem Personalizada (Opcional)"
                placeholder="Confira nosso estoque selecionado..."
                rows={4}
                error={errors.customMessage?.message}
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  {...register('expiresAt')}
                  type="date"
                  label="Data de Expiração (Opcional)"
                  error={errors.expiresAt?.message}
                />
              </div>
            </div>
          </Card>

          {/* Seleção de Lotes */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-obsidian mb-2">Selecionar Lotes</h2>
                <p className="text-sm text-slate-500">
                  {selectedBatchIds.length} lote{selectedBatchIds.length !== 1 ? 's' : ''} selecionado
                  {selectedBatchIds.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Buscar lotes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {errors.batchIds && (
              <p className="text-sm text-red-600 mb-4">{errors.batchIds.message}</p>
            )}

            {isLoadingBatches ? (
              <div className="text-center py-12">
                <p className="text-slate-500">Carregando lotes...</p>
              </div>
            ) : filteredBatches.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500">
                  {searchTerm ? 'Nenhum lote encontrado' : 'Nenhum lote disponível'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto">
                {filteredBatches.map((batch) => {
                  const isSelected = selectedBatchIds.includes(batch.id);
                  const mainImage = batch.medias?.[0];

                  return (
                    <div
                      key={batch.id}
                      onClick={() => toggleBatchSelection(batch.id)}
                      className={cn(
                        'border-2 rounded-lg p-4 cursor-pointer transition-all',
                        isSelected
                          ? 'border-obsidian bg-obsidian/5'
                          : 'border-slate-200 hover:border-slate-300'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5',
                            isSelected
                              ? 'border-obsidian bg-obsidian'
                              : 'border-slate-300'
                          )}
                        >
                          {isSelected && <Check className="w-3 h-3 text-porcelain" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-mono text-sm font-semibold text-obsidian">
                              {batch.batchCode}
                            </h3>
                          </div>
                          {batch.product && (
                            <p className="text-sm text-slate-600 mb-1">{batch.product.name}</p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-slate-500 mt-2">
                            <span>{formatArea(batch.totalArea)}</span>
                            {mainImage && !isPlaceholderUrl(mainImage.url) && (
                              <span className="text-emerald-600">Com foto</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push(`/${locale}/catalogos`)}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary" loading={isSubmitting}>
              Criar Catálogo
            </Button>
          </div>
        </form>
      </div>

      {/* Success Modal */}
      <Modal open={showSuccessModal} onClose={() => setShowSuccessModal(false)}>
        <ModalClose onClose={() => setShowSuccessModal(false)} />
        <ModalHeader>
          <ModalTitle>Catálogo Criado com Sucesso!</ModalTitle>
        </ModalHeader>
        <ModalContent>
          <div className="space-y-4">
            <p className="text-slate-600">
              Seu catálogo foi criado e o link foi copiado para a área de transferência.
            </p>
            <div className="bg-slate-50 rounded-lg p-4 flex items-center gap-3">
              <code className="flex-1 text-sm text-obsidian break-all">{generatedLink}</code>
              <Button variant="secondary" size="sm" onClick={handleCopyLink}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </ModalContent>
        <ModalFooter>
          <Button
            variant="primary"
            onClick={() => {
              setShowSuccessModal(false);
              router.push(`/${locale}/catalogos`);
            }}
          >
            Ver Catálogos
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
