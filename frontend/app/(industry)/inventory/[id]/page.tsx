'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Upload, X, Package, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Modal, ModalHeader, ModalTitle, ModalContent, ModalFooter } from '@/components/ui/modal';
import { LoadingState } from '@/components/shared/LoadingState';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/lib/hooks/useToast';
import { batchSchema, type BatchInput } from '@/lib/schemas/batch.schema';
import { batchStatuses } from '@/lib/schemas/batch.schema';
import { calculateTotalArea, formatArea } from '@/lib/utils/formatDimensions';
import { formatDate } from '@/lib/utils/formatDate';
import type { Batch, Product, Media, BatchStatus } from '@/lib/types';
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
  const [products, setProducts] = useState<Product[]>([]);
  const [existingMedias, setExistingMedias] = useState<Media[]>([]);
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
  } = useForm<BatchInput>({
    resolver: zodResolver(batchSchema),
  });

  const height = watch('height');
  const width = watch('width');
  const quantitySlabs = watch('quantitySlabs');
  const productId = watch('productId');

  useEffect(() => {
    fetchProducts();
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

  const fetchProducts = async () => {
    try {
      const data = await apiClient.get<{ products: Product[] }>('/products', {
        params: { includeInactive: false, limit: 1000 },
      });
      setProducts(data.products);
    } catch (err) {
      error('Erro ao carregar produtos');
    }
  };

  const fetchBatch = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.get<Batch>(`/batches/${batchId}`);
      setBatch(data);
      setExistingMedias(data.medias || []);

      reset({
        productId: data.productId,
        batchCode: data.batchCode,
        height: data.height,
        width: data.width,
        thickness: data.thickness,
        quantitySlabs: data.quantitySlabs,
        industryPrice: data.industryPrice,
        originQuarry: data.originQuarry || '',
        entryDate: formatDate(data.entryDate, 'yyyy-MM-dd'),
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
    setExistingMedias((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveNewMedia = (index: number) => {
    setNewMedias((prev) => prev.filter((_, i) => i !== index));
  };

  const handleReorderExisting = (fromIndex: number, toIndex: number) => {
    setExistingMedias((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return updated.map((media, i) => ({ ...media, displayOrder: i }));
    });
  };

  const onSubmit = async (data: BatchInput) => {
    try {
      setIsSubmitting(true);

      let newMediaUrls: string[] = [];

      if (newMedias.length > 0) {
        const formData = new FormData();
        newMedias.forEach((media) => {
          formData.append('files', media.file);
        });

        const uploadResult = await apiClient.upload<{ urls: string[] }>(
          '/upload/batch-medias',
          formData
        );
        newMediaUrls = uploadResult.urls;
      }

      const allMedias = [
        ...existingMedias.map((m, i) => ({
          url: m.url,
          displayOrder: i,
          isCover: i === 0,
        })),
        ...newMediaUrls.map((url, i) => ({
          url,
          displayOrder: existingMedias.length + i,
          isCover: existingMedias.length === 0 && i === 0,
        })),
      ];

      const batchData = {
        ...data,
        medias: allMedias,
      };

      await apiClient.put(`/batches/${batchId}`, batchData);

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

  const selectedProduct = products.find((p) => p.id === productId);
  const allMedias = [...existingMedias, ...newMedias.map((m) => ({ ...m, id: `new-${Math.random()}` }))];

  return (
    <div className="min-h-screen bg-mineral">
      {/* Header */}
      <div className="bg-porcelain border-b border-slate-100 px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-slate-100 rounded-sm transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="font-serif text-3xl text-obsidian">
                  Editar Lote
                </h1>
                <Badge variant={batch.status}>{batch.status}</Badge>
              </div>
              <p className="text-sm text-slate-500 font-mono">{batch.batchCode}</p>
            </div>
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
          {/* Vinculação */}
          <Card>
            <h2 className="text-lg font-semibold text-obsidian mb-6">
              Vinculação
            </h2>

            <div className="space-y-4">
              <Select
                {...register('productId')}
                label="Produto"
                error={errors.productId?.message}
                disabled={isSubmitting}
              >
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} {product.sku && `(${product.sku})`}
                  </option>
                ))}
              </Select>

              {selectedProduct && (
                <div className="flex items-center gap-4 p-4 bg-mineral rounded-sm">
                  {selectedProduct.medias?.[0] && (
                    <img
                      src={selectedProduct.medias[0].url}
                      alt={selectedProduct.name}
                      className="w-20 h-20 rounded-sm object-cover"
                    />
                  )}
                  <div>
                    <p className="font-semibold text-obsidian">
                      {selectedProduct.name}
                    </p>
                    <p className="text-sm text-slate-500">
                      {selectedProduct.material} • {selectedProduct.finish}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>

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

              <Input
                {...register('entryDate')}
                type="date"
                label="Data de Entrada"
                error={errors.entryDate?.message}
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

            <Input
              {...register('industryPrice', { valueAsNumber: true })}
              type="number"
              step="0.01"
              label="Preço Base Indústria (R$)"
              helperText="Este é o preço de repasse para brokers"
              error={errors.industryPrice?.message}
              disabled={isSubmitting}
            />
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
                {existingMedias.map((media, index) => (
                  <MediaPreview
                    key={media.id}
                    preview={media.url}
                    isCover={index === 0}
                    onRemove={() => handleRemoveExistingMedia(index)}
                  />
                ))}
                {newMedias.map((media, index) => (
                  <MediaPreview
                    key={`new-${index}`}
                    preview={media.preview}
                    isCover={existingMedias.length === 0 && index === 0}
                    onRemove={() => handleRemoveNewMedia(index)}
                  />
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
            <strong className="font-mono">&quot;{batch.batchCode}&quot;</strong>?
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

interface MediaPreviewProps {
  preview: string;
  isCover: boolean;
  onRemove: () => void;
}

function MediaPreview({ preview, isCover, onRemove }: MediaPreviewProps) {
  return (
    <div className="relative aspect-[4/3] rounded-sm overflow-hidden border-2 border-slate-200 group">
      <img
        src={preview}
        alt="Preview"
        className="w-full h-full object-cover"
      />

      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <button
          type="button"
          onClick={onRemove}
          className="p-2 bg-rose-500 text-white rounded-sm hover:bg-rose-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {isCover && (
        <div className="absolute top-2 left-2">
          <span className="px-2 py-1 bg-blue-500 text-white text-xs font-semibold rounded-sm">
            CAPA
          </span>
        </div>
      )}
    </div>
  );
}