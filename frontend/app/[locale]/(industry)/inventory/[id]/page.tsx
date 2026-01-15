'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Upload, X, Package, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Modal, ModalHeader, ModalTitle, ModalContent, ModalFooter } from '@/components/ui/modal';
import { LoadingState } from '@/components/shared/LoadingState';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/lib/hooks/useToast';
import { editBatchSchema, type EditBatchInput } from '@/lib/schemas/batch.schema';
import { calculateTotalArea, formatArea } from '@/lib/utils/formatDimensions';
import { formatPricePerUnit, getPriceUnitLabel, calculateTotalBatchPrice } from '@/lib/utils/priceConversion';

import { truncateText } from '@/lib/utils/truncateText';
import { TRUNCATION_LIMITS } from '@/lib/config/truncationLimits';
import type { Batch, Media, PriceUnit } from '@/lib/types';
import { cn } from '@/lib/utils/cn';

interface UploadedMedia {
  file: File;
  preview: string;
}

export default function EditBatchPage() {
  const router = useRouter();
  const params = useParams();
  const batchId = params.id as string;
  const { success, error } = useToast();

  const [batch, setBatch] = useState<Batch | null>(null);
  const [existingMedias, setExistingMedias] = useState<Media[]>([]);
  const [mediasToDelete, setMediasToDelete] = useState<string[]>([]);
  const [newMedias, setNewMedias] = useState<UploadedMedia[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [calculatedArea, setCalculatedArea] = useState<number>(0);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
    control,
  } = useForm<EditBatchInput>({
    resolver: zodResolver(editBatchSchema),
  });

  const height = watch('height');
  const width = watch('width');
  const quantitySlabs = watch('quantitySlabs');
  const priceUnit = watch('priceUnit') || 'M2';
  const industryPrice = watch('industryPrice');

  useEffect(() => {
    fetchBatch();
  }, [batchId]);

  useEffect(() => {
    if (height && width && quantitySlabs) {
      const area = calculateTotalArea(height, width, quantitySlabs);
      setCalculatedArea(area);
    } else {
      setCalculatedArea(0);
    }
  }, [height, width, quantitySlabs]);

  const fetchBatch = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.get<Batch>(`/batches/${batchId}`);
      setBatch(data);
      setExistingMedias(data.medias || []);

      reset({
        batchCode: data.batchCode,
        height: data.height,
        width: data.width,
        thickness: data.thickness,
        quantitySlabs: data.quantitySlabs,
        industryPrice: data.industryPrice,
        priceUnit: data.priceUnit || 'M2',
        originQuarry: data.originQuarry || '',
      });
    } catch (err) {
      error('Erro ao carregar lote');
      router.push('/inventory');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const totalPhotos = existingMedias.length + newMedias.length + files.length;

    if (totalPhotos > 10) {
      error('Máximo de 10 fotos por lote');
      return;
    }

    files.forEach((file) => {
      if (!file.type.startsWith('image/')) {
        error('Formato não suportado. Use JPG, PNG ou WebP');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        error('Arquivo excede o limite de 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        setNewMedias((prev) => [
          ...prev,
          {
            file,
            preview: event.target?.result as string,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const handleRemoveExistingMedia = (index: number) => {
    const mediaToRemove = existingMedias[index];
    if (mediaToRemove?.id) {
      setMediasToDelete((prev) => [...prev, mediaToRemove.id]);
    }
    setExistingMedias((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveNewMedia = (index: number) => {
    setNewMedias((prev) => prev.filter((_, i) => i !== index));
  };

  const handleReorderExisting = (fromIndex: number, toIndex: number) => {
    setExistingMedias((prev) => {
      if (toIndex < 0 || toIndex >= prev.length) return prev;
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return updated.map((media, i) => ({ ...media, displayOrder: i }));
    });
  };

  const handleSetExistingCover = (index: number) => {
    setExistingMedias((prev) => {
      if (index === 0) return prev;
      const updated = [...prev];
      const [cover] = updated.splice(index, 1);
      updated.unshift(cover);
      return updated.map((media, i) => ({ ...media, displayOrder: i }));
    });
  };

  const handleMoveNewMedia = (from: number, to: number) => {
    setNewMedias((prev) => {
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const handleSetNewCover = (index: number) => {
    // Se não há mídias existentes, a nova mídia se torna capa (primeira posição)
    if (existingMedias.length === 0 && index !== 0) {
      setNewMedias((prev) => {
        const next = [...prev];
        const [cover] = next.splice(index, 1);
        next.unshift(cover);
        return next;
      });
    }
  };

  const onSubmit = async (data: EditBatchInput) => {
    try {
      setIsSubmitting(true);

      // 1. Deletar mídias removidas (ignora erros 404)
      if (mediasToDelete.length > 0) {
        await Promise.all(
          mediasToDelete.map((mediaId) =>
            apiClient.delete(`/batch-medias/${mediaId}`).catch((err) => {
              console.error(`Erro ao deletar mídia ${mediaId}:`, err);
            })
          )
        );
      }

      // 2. Atualizar ordem das mídias existentes
      if (existingMedias.length > 0) {
        const orderPayload = existingMedias.map((media, index) => ({
          id: media.id,
          displayOrder: index,
        }));

        await apiClient.patch('/batch-medias/order', orderPayload).catch((err) => {
          console.error('Erro ao atualizar ordem das mídias:', err);
        });
      }

      // 3. Upload de novas mídias
      if (newMedias.length > 0) {
        const formData = new FormData();
        formData.append('batchId', batchId);
        newMedias.forEach((media) => {
          formData.append('medias', media.file);
        });

        await apiClient.upload<{ urls: string[] }>(
          '/upload/batch-medias',
          formData
        );
      }

      // 4. Atualizar dados do lote (apenas campos válidos do UpdateBatchInput)
      const updatePayload: EditBatchInput = {
        batchCode: data.batchCode,
        height: data.height,
        width: data.width,
        thickness: data.thickness,
        quantitySlabs: data.quantitySlabs,
        industryPrice: data.industryPrice,
        priceUnit: data.priceUnit,
        originQuarry: data.originQuarry,
      };

      await apiClient.put(`/batches/${batchId}`, updatePayload);

      success('Lote atualizado com sucesso');
      router.push('/inventory');
    } catch (err) {
      error('Erro ao atualizar lote');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await apiClient.patch(`/batches/${batchId}/status`, { status: 'INATIVO' });
      success('Lote arquivado com sucesso');
      router.push('/inventory');
    } catch (err) {
      error('Erro ao arquivar lote');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-mineral">
        <div className="px-8 py-8">
          <div className="max-w-4xl mx-auto">
            <LoadingState variant="form" rows={10} />
          </div>
        </div>
      </div>
    );
  }

  if (!batch) return null;

  const allMedias = [...existingMedias, ...newMedias.map((m) => ({ ...m, id: `new-${Math.random()}` }))];

  return (
    <div className="min-h-screen bg-mineral">
      {/* Header */}
      <div className="bg-porcelain border-b border-slate-100 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="font-serif text-3xl text-obsidian">
                Editar Lote
              </h1>
              <Badge variant={batch.status}>{batch.status}</Badge>
            </div>
            <p className="text-sm text-slate-500 font-mono">{batch.batchCode}</p>
          </div>

          <Button
            variant="destructive"
            onClick={() => setShowDeleteModal(true)}
            disabled={isSubmitting || batch.status === 'VENDIDO'}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Arquivar
          </Button>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="px-8 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Informações do Produto (somente leitura) */}
          {batch.product && (
            <Card>
              <h2 className="text-lg font-semibold text-obsidian mb-6">
                Produto Vinculado
              </h2>

              <div className="flex items-center gap-4 p-4 bg-mineral rounded-sm">
                {batch.product.medias?.[0] && (
                  <img
                    src={batch.product.medias[0].url}
                    alt={batch.product.name}
                    className="w-20 h-20 rounded-sm object-cover"
                  />
                )}
                <div>
                  <p 
                    className="font-semibold text-obsidian"
                    title={batch.product.name}
                  >
                    {truncateText(batch.product.name, TRUNCATION_LIMITS.PRODUCT_NAME)}
                  </p>
                  <p 
                    className="text-sm text-slate-500"
                    title={`${batch.product.material} • ${batch.product.finish}`}
                  >
                    {truncateText(`${batch.product.material} • ${batch.product.finish}`, TRUNCATION_LIMITS.MATERIAL_NAME)}
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-3">
                O produto não pode ser alterado após a criação do lote.
              </p>
            </Card>
          )}

          {/* Identificação */}
          <Card>
            <h2 className="text-lg font-semibold text-obsidian mb-6">
              Identificação
            </h2>

            <div className="space-y-6">
              <Input
                {...register('batchCode')}
                label="Código do Lote"
                error={errors.batchCode?.message}
                disabled={isSubmitting}
              />

              <Input
                {...register('originQuarry')}
                label="Pedreira de Origem (Opcional)"
                error={errors.originQuarry?.message}
                disabled={isSubmitting}
              />
            </div>
          </Card>

          {/* Dimensões Físicas */}
          <Card>
            <h2 className="text-lg font-semibold text-obsidian mb-6">
              Dimensões Físicas
            </h2>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  {...register('height', { valueAsNumber: true })}
                  type="number"
                  step="0.1"
                  label="Altura (cm)"
                  error={errors.height?.message}
                  disabled={isSubmitting}
                />

                <Input
                  {...register('width', { valueAsNumber: true })}
                  type="number"
                  step="0.1"
                  label="Largura (cm)"
                  error={errors.width?.message}
                  disabled={isSubmitting}
                />

                <Input
                  {...register('thickness', { valueAsNumber: true })}
                  type="number"
                  step="0.1"
                  label="Espessura (cm)"
                  error={errors.thickness?.message}
                  disabled={isSubmitting}
                />

                <Input
                  {...register('quantitySlabs', { valueAsNumber: true })}
                  type="number"
                  label="Quantidade de Chapas"
                  error={errors.quantitySlabs?.message}
                  disabled={isSubmitting}
                />
              </div>

              {calculatedArea > 0 && (
                <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-sm">
                  <Package className="w-5 h-5 text-emerald-600" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-900">
                      Área Total Calculada
                    </p>
                    <p className="text-2xl font-mono font-bold text-emerald-700">
                      {formatArea(calculatedArea)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Precificação */}
          <Card>
            <h2 className="text-lg font-semibold text-obsidian mb-6">
              Precificação
            </h2>

            <div className="space-y-6">
              {/* Unidade de Preço */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Unidade de Preço
                </label>
                <Controller
                  name="priceUnit"
                  control={control}
                  render={({ field }) => (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => field.onChange('M2')}
                        className={cn(
                          'px-4 py-2 rounded-sm font-medium transition-colors',
                          field.value === 'M2'
                            ? 'bg-obsidian text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        )}
                        disabled={isSubmitting}
                      >
                        R$/m²
                      </button>
                      <button
                        type="button"
                        onClick={() => field.onChange('FT2')}
                        className={cn(
                          'px-4 py-2 rounded-sm font-medium transition-colors',
                          field.value === 'FT2'
                            ? 'bg-obsidian text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        )}
                        disabled={isSubmitting}
                      >
                        R$/ft²
                      </button>
                    </div>
                  )}
                />
                <p className="text-xs text-slate-500 mt-2">
                  Selecione a unidade de área para o preço. 1 m² = 10,76 ft²
                </p>
              </div>

              <Input
                {...register('industryPrice', { valueAsNumber: true })}
                type="number"
                step="0.01"
                label={`Preço Base Indústria (R$/${getPriceUnitLabel(priceUnit as PriceUnit)})`}
                helperText="Este é o preço de repasse para brokers"
                error={errors.industryPrice?.message}
                disabled={isSubmitting}
              />

              {/* Preço Total Calculado */}
              {calculatedArea > 0 && industryPrice > 0 && (
                <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-sm">
                  <Package className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-semibold text-blue-900">
                      Valor Total do Lote
                    </p>
                    <p className="text-2xl font-mono font-bold text-blue-700">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(calculateTotalBatchPrice(calculatedArea, industryPrice, priceUnit as PriceUnit))}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      {formatPricePerUnit(industryPrice, priceUnit as PriceUnit)} × {formatArea(calculatedArea)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Fotos do Lote */}
          <Card>
            <h2 className="text-lg font-semibold text-obsidian mb-6">
              Fotos do Lote
            </h2>

            <div className="mb-6">
              <label
                htmlFor="file-upload"
                className={cn(
                  'flex flex-col items-center justify-center w-full h-48',
                  'border-2 border-dashed border-slate-300 rounded-sm',
                  'cursor-pointer transition-colors',
                  'hover:border-obsidian hover:bg-slate-50',
                  (isSubmitting || allMedias.length >= 10) && 'opacity-50 cursor-not-allowed'
                )}
              >
                <Upload className="w-12 h-12 text-slate-400 mb-4" />
                <p className="text-sm text-slate-600 mb-1">
                  Adicionar mais fotos
                </p>
                <p className="text-xs text-slate-400">
                  {allMedias.length}/10 fotos • JPG, PNG ou WebP • 5MB máx.
                </p>
                <input
                  id="file-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handleFileSelect}
                  disabled={isSubmitting || allMedias.length >= 10}
                  className="hidden"
                />
              </label>
              <p className="text-xs text-slate-500 mt-2">
                A primeira foto será a capa do lote
              </p>
            </div>

            {allMedias.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {/* Mídias Existentes */}
                {existingMedias.map((media, index) => (
                  <div
                    key={media.id}
                    className="relative aspect-[4/3] rounded-sm overflow-hidden border-2 border-slate-200 group"
                  >
                    <img
                      src={media.url}
                      alt={`Foto ${index + 1}`}
                      className="w-full h-full object-cover"
                    />

                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center px-2">
                      <div className="grid grid-cols-[auto_minmax(7rem,1fr)] gap-2 items-center">
                        <button
                          type="button"
                          onClick={() => handleReorderExisting(index, index - 1)}
                          className="p-2 bg-white/90 text-obsidian rounded-sm disabled:opacity-40 justify-self-center"
                          disabled={index === 0}
                          aria-label="Mover para cima"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetExistingCover(index)}
                          className="w-full px-3 py-2 bg-blue-500 text-white text-xs font-semibold rounded-sm disabled:opacity-60 text-center"
                          disabled={index === 0}
                        >
                          Definir capa
                        </button>

                        <button
                          type="button"
                          onClick={() => handleReorderExisting(index, index + 1)}
                          className="p-2 bg-white/90 text-obsidian rounded-sm disabled:opacity-40 justify-self-center"
                          disabled={index === existingMedias.length - 1}
                          aria-label="Mover para baixo"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveExistingMedia(index)}
                          className="w-full p-2 bg-rose-500 text-white rounded-sm hover:bg-rose-600 transition-colors flex items-center justify-center"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {index === 0 && (
                      <div className="absolute top-2 left-2">
                        <span className="px-2 py-1 bg-blue-500 text-white text-xs font-semibold rounded-sm">
                          CAPA
                        </span>
                      </div>
                    )}
                  </div>
                ))}

                {/* Novas Mídias */}
                {newMedias.map((media, index) => (
                  <div
                    key={`new-${index}`}
                    className="relative aspect-[4/3] rounded-sm overflow-hidden border-2 border-dashed border-emerald-400 group"
                  >
                    <img
                      src={media.preview}
                      alt={`Nova foto ${index + 1}`}
                      className="w-full h-full object-cover"
                    />

                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center px-2">
                      <div className="grid grid-cols-[auto_minmax(7rem,1fr)] gap-2 items-center">
                        <button
                          type="button"
                          onClick={() => handleMoveNewMedia(index, index - 1)}
                          className="p-2 bg-white/90 text-obsidian rounded-sm disabled:opacity-40 justify-self-center"
                          disabled={index === 0}
                          aria-label="Mover para cima"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetNewCover(index)}
                          className="w-full px-3 py-2 bg-blue-500 text-white text-xs font-semibold rounded-sm disabled:opacity-60 text-center"
                          disabled={existingMedias.length > 0 || index === 0}
                        >
                          Definir capa
                        </button>

                        <button
                          type="button"
                          onClick={() => handleMoveNewMedia(index, index + 1)}
                          className="p-2 bg-white/90 text-obsidian rounded-sm disabled:opacity-40 justify-self-center"
                          disabled={index === newMedias.length - 1}
                          aria-label="Mover para baixo"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveNewMedia(index)}
                          className="w-full p-2 bg-rose-500 text-white rounded-sm hover:bg-rose-600 transition-colors flex items-center justify-center"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {existingMedias.length === 0 && index === 0 && (
                      <div className="absolute top-2 left-2">
                        <span className="px-2 py-1 bg-blue-500 text-white text-xs font-semibold rounded-sm">
                          CAPA
                        </span>
                      </div>
                    )}

                    <div className="absolute top-2 right-2">
                      <span className="px-2 py-1 bg-emerald-500 text-white text-xs font-semibold rounded-sm">
                        NOVA
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-200">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.back()}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary" loading={isSubmitting}>
              SALVAR ALTERAÇÕES
            </Button>
          </div>
        </div>
      </form>

      {/* Delete Confirmation Modal */}
      <Modal open={showDeleteModal} onClose={() => setShowDeleteModal(false)}>
        <ModalHeader>
          <ModalTitle>Arquivar Lote</ModalTitle>
        </ModalHeader>
        <ModalContent>
          <p className="text-slate-600">
            Tem certeza que deseja arquivar o lote{' '}
            <strong className="font-mono" title={batch.batchCode}>&quot;{truncateText(batch.batchCode, TRUNCATION_LIMITS.BATCH_CODE)}&quot;</strong>?
          </p>
          <p className="text-amber-600 text-sm mt-4">
            O lote será marcado como inativo e não aparecerá mais nas listagens.
          </p>
        </ModalContent>
        <ModalFooter>
          <Button
            variant="secondary"
            onClick={() => setShowDeleteModal(false)}
            disabled={isDeleting}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            loading={isDeleting}
          >
            ARQUIVAR
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}