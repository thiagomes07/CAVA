'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Upload, X, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/lib/hooks/useToast';
import { batchSchema, type BatchInput } from '@/lib/schemas/batch.schema';
import { calculateTotalArea, formatArea } from '@/lib/utils/formatDimensions';
import type { Product } from '@/lib/types';
import { cn } from '@/lib/utils/cn';

interface UploadedMedia {
  file: File;
  preview: string;
}

export default function NewBatchPage() {
  const router = useRouter();
  const { success, error } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [medias, setMedias] = useState<UploadedMedia[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [calculatedArea, setCalculatedArea] = useState<number>(0);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<BatchInput>({
    resolver: zodResolver(batchSchema),
    defaultValues: {
      quantitySlabs: 1,
      entryDate: new Date().toISOString().split('T')[0],
    },
  });

  const height = watch('height');
  const width = watch('width');
  const quantitySlabs = watch('quantitySlabs');
  const productId = watch('productId');

  useEffect(() => {
    fetchProducts();
  }, []);

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    if (medias.length + files.length > 10) {
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
        setMedias((prev) => [
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

  const handleRemoveMedia = (index: number) => {
    setMedias((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: BatchInput) => {
    try {
      setIsSubmitting(true);

      let mediaUrls: string[] = [];

      if (medias.length > 0) {
        const formData = new FormData();
        medias.forEach((media) => {
          formData.append('files', media.file);
        });

        const uploadResult = await apiClient.upload<{ urls: string[] }>(
          '/upload/batch-medias',
          formData
        );
        mediaUrls = uploadResult.urls;
      }

      const batchData = {
        ...data,
        medias: mediaUrls.map((url, index) => ({
          url,
          displayOrder: index,
          isCover: index === 0,
        })),
      };

      await apiClient.post('/batches', batchData);

      success('Lote cadastrado com sucesso');
      router.push('/inventory');
    } catch (err) {
      error('Erro ao cadastrar lote');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedProduct = products.find((p) => p.id === productId);

  return (
    <div className="min-h-screen bg-mineral">
      {/* Header */}
      <div className="bg-porcelain border-b border-slate-100 px-8 py-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-slate-100 rounded-sm transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="font-serif text-3xl text-obsidian">Novo Lote</h1>
            <p className="text-sm text-slate-500">
              Cadastre um novo lote físico no estoque
            </p>
          </div>
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
                <option value="">Selecione o produto...</option>
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
                placeholder="Ex: GRN-000123"
                helperText="Use apenas letras maiúsculas, números e hífens"
                error={errors.batchCode?.message}
                disabled={isSubmitting}
              />

              <Input
                {...register('originQuarry')}
                label="Pedreira de Origem (Opcional)"
                placeholder="Ex: Pedreira São Gabriel"
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
                  placeholder="180"
                  error={errors.height?.message}
                  disabled={isSubmitting}
                />

                <Input
                  {...register('width', { valueAsNumber: true })}
                  type="number"
                  step="0.1"
                  label="Largura (cm)"
                  placeholder="120"
                  error={errors.width?.message}
                  disabled={isSubmitting}
                />

                <Input
                  {...register('thickness', { valueAsNumber: true })}
                  type="number"
                  step="0.1"
                  label="Espessura (cm)"
                  placeholder="3"
                  error={errors.thickness?.message}
                  disabled={isSubmitting}
                />

                <Input
                  {...register('quantitySlabs', { valueAsNumber: true })}
                  type="number"
                  label="Quantidade de Chapas"
                  placeholder="1"
                  error={errors.quantitySlabs?.message}
                  disabled={isSubmitting}
                />
              </div>

              {/* Área Total Calculada */}
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
              placeholder="5000.00"
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
                  isSubmitting && 'opacity-50 cursor-not-allowed'
                )}
              >
                <Upload className="w-12 h-12 text-slate-400 mb-4" />
                <p className="text-sm text-slate-600 mb-1">
                  Adicionar fotos do lote
                </p>
                <p className="text-xs text-slate-400">
                  JPG, PNG ou WebP • Máximo 10 fotos • 5MB por arquivo
                </p>
                <input
                  id="file-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handleFileSelect}
                  disabled={isSubmitting}
                  className="hidden"
                />
              </label>
              <p className="text-xs text-slate-500 mt-2">
                A primeira foto será a capa do lote
              </p>
            </div>

            {medias.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {medias.map((media, index) => (
                  <div
                    key={index}
                    className="relative aspect-[4/3] rounded-sm overflow-hidden border-2 border-slate-200 group"
                  >
                    <img
                      src={media.preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-full object-cover"
                    />

                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveMedia(index)}
                        className="p-2 bg-rose-500 text-white rounded-sm hover:bg-rose-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
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
              SALVAR LOTE
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}