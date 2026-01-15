'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Upload, X, Package, Plus, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Toggle } from '@/components/ui/toggle';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/lib/hooks/useToast';
import { batchSchema, type BatchInput, priceUnits } from '@/lib/schemas/batch.schema';
import { calculateTotalArea, formatArea } from '@/lib/utils/formatDimensions';
import { formatPricePerUnit, getPriceUnitLabel, calculateTotalBatchPrice } from '@/lib/utils/priceConversion';
import type { Product, PriceUnit, MaterialType, FinishType } from '@/lib/types';
import { cn } from '@/lib/utils/cn';
import { isPlaceholderUrl } from '@/lib/utils/media';

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
  const [showNewProductForm, setShowNewProductForm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    control,
  } = useForm<BatchInput>({
    resolver: zodResolver(batchSchema),
    defaultValues: {
      quantitySlabs: 1,
      entryDate: new Date().toISOString().split('T')[0],
      priceUnit: 'M2',
    },
  });

  const height = watch('height');
  const width = watch('width');
  const quantitySlabs = watch('quantitySlabs');
  const productId = watch('productId');
  const priceUnit = watch('priceUnit') || 'M2';
  const industryPrice = watch('industryPrice');

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

  const handleMoveMedia = (from: number, to: number) => {
    setMedias((prev) => {
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const handleSetCover = (index: number) => {
    setMedias((prev) => {
      if (index === 0) return prev;
      const next = [...prev];
      const [cover] = next.splice(index, 1);
      next.unshift(cover);
      return next;
    });
  };

  const onSubmit = async (data: BatchInput) => {
    try {
      setIsSubmitting(true);

      // 1) Cria o lote primeiro
      const created = await apiClient.post<{ id: string }>('/batches', data);

      // 2) Se houver mídias, faz upload vinculando ao lote criado
      if (medias.length > 0) {
        const formData = new FormData();
        formData.append('batchId', created.id);
        medias.forEach((media) => {
          formData.append('medias', media.file);
        });

        await apiClient.upload<{ urls: string[] }>(
          '/upload/batch-medias',
          formData
        );
      }

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
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-obsidian">
                Vinculação
              </h2>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setShowNewProductForm(!showNewProductForm);
                  if (!showNewProductForm) {
                    setValue('productId', undefined);
                  } else {
                    setValue('newProduct', undefined);
                  }
                }}
                disabled={isSubmitting}
              >
                <Plus className="w-4 h-4 mr-2" />
                {showNewProductForm ? 'Selecionar Existente' : 'Criar Novo Produto'}
              </Button>
            </div>

            <div className="space-y-4">
              {!showNewProductForm ? (
                <>
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
                </>
              ) : (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-sm space-y-4">
                  <p className="text-sm font-semibold text-blue-900">
                    Novo Produto (será criado junto com o lote)
                  </p>
                  
                  <Input
                              {selectedProduct.medias?.[0] && !isPlaceholderUrl(selectedProduct.medias[0].url) && (
                    label="Nome do Produto"
                    placeholder="Ex: Granito Verde Ubatuba"
                    error={errors.newProduct?.name?.message}
                    disabled={isSubmitting}
                  />

                  <Input
                    {...register('newProduct.sku')}
                    label="SKU (Opcional)"
                    placeholder="Ex: GRN-VU-001"
                    error={errors.newProduct?.sku?.message}
                    disabled={isSubmitting}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select
                      {...register('newProduct.material')}
                      label="Material"
                      error={errors.newProduct?.material?.message}
                      disabled={isSubmitting}
                    >
                      <option value="">Selecione...</option>
                      <option value="GRANITO">Granito</option>
                      <option value="MARMORE">Mármore</option>
                      <option value="QUARTZITO">Quartzito</option>
                      <option value="LIMESTONE">Limestone</option>
                      <option value="TRAVERTINO">Travertino</option>
                      <option value="OUTROS">Outros</option>
                    </Select>

                    <Select
                      {...register('newProduct.finish')}
                      label="Acabamento"
                      error={errors.newProduct?.finish?.message}
                      disabled={isSubmitting}
                    >
                      <option value="">Selecione...</option>
                      <option value="POLIDO">Polido</option>
                      <option value="LEVIGADO">Levigado</option>
                      <option value="BRUTO">Bruto</option>
                      <option value="APICOADO">Apicoado</option>
                      <option value="FLAMEADO">Flameado</option>
                    </Select>
                  </div>

                  <Input
                    {...register('newProduct.description')}
                    label="Descrição (Opcional)"
                    placeholder="Descrição do produto..."
                    error={errors.newProduct?.description?.message}
                    disabled={isSubmitting}
                  />
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
                placeholder="150.00"
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

                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center px-2">
                      <div className="grid grid-cols-[auto_minmax(7rem,1fr)] gap-2 items-center">
                        <button
                          type="button"
                          onClick={() => handleMoveMedia(index, index - 1)}
                          className="p-2 bg-white/90 text-obsidian rounded-sm disabled:opacity-40 justify-self-center"
                          disabled={index === 0}
                          aria-label="Mover para cima"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetCover(index)}
                          className="w-full px-3 py-2 bg-blue-500 text-white text-xs font-semibold rounded-sm disabled:opacity-60 text-center"
                          disabled={index === 0}
                        >
                          Definir capa
                        </button>

                        <button
                          type="button"
                          onClick={() => handleMoveMedia(index, index + 1)}
                          className="p-2 bg-white/90 text-obsidian rounded-sm disabled:opacity-40 justify-self-center"
                          disabled={index === medias.length - 1}
                          aria-label="Mover para baixo"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveMedia(index)}
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