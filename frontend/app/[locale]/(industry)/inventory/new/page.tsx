'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Upload, X, Package, Plus, ArrowUp, ArrowDown, Ruler, DollarSign, Camera, Sparkles } from 'lucide-react';
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
        <h1 className="font-serif text-3xl text-obsidian mb-2">Novo Lote</h1>
        <p className="text-sm text-slate-500">
          Cadastre um novo lote físico no estoque
        </p>
      </div>

      {/* Form */}
      <div className="px-8 py-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Vinculação */}
          <div className="bg-white border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h2 className="font-semibold text-[#121212] flex items-center gap-2">
                <span className="w-6 h-6 bg-[#C2410C] text-white text-xs font-bold flex items-center justify-center">1</span>
                Vinculação ao Produto
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowNewProductForm(!showNewProductForm);
                  if (!showNewProductForm) {
                    setValue('productId', undefined);
                  } else {
                    setValue('newProduct', undefined);
                  }
                }}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 text-xs font-medium text-[#C2410C] hover:text-[#a03609] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                {showNewProductForm ? 'Selecionar Existente' : 'Criar Novo Produto'}
              </button>
            </div>
            <div className="p-6">
              {!showNewProductForm ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-2">
                      Produto <span className="text-[#C2410C]">*</span>
                    </label>
                    <select
                      {...register('productId')}
                      disabled={isSubmitting}
                      className={cn(
                        'w-full px-3 py-2.5 bg-slate-50 border focus:border-[#C2410C] focus:bg-white outline-none text-sm transition-colors',
                        errors.productId ? 'border-rose-500' : 'border-slate-200',
                        isSubmitting && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <option value="">Selecione o produto...</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} {product.sku && `(${product.sku})`}
                        </option>
                      ))}
                    </select>
                    {errors.productId && <p className="mt-1 text-xs text-rose-500">{errors.productId.message}</p>}
                  </div>

                  {selectedProduct && (
                    <div className="flex items-center gap-4 p-4 bg-emerald-50 border border-emerald-200">
                      {selectedProduct.medias?.[0] && !isPlaceholderUrl(selectedProduct.medias[0].url) && (
                        <img
                          src={selectedProduct.medias[0].url}
                          alt={selectedProduct.name}
                          className="w-16 h-16 object-cover"
                        />
                      )}
                      <div>
                        <p className="font-medium text-emerald-900">
                          {selectedProduct.name}
                        </p>
                        <p className="text-sm text-emerald-700">
                          {selectedProduct.material} • {selectedProduct.finish}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-blue-50 border border-blue-200 space-y-4">
                  <p className="text-sm font-semibold text-blue-900 flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Novo Produto (será criado junto com o lote)
                  </p>
                  
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-2">
                      Nome do Produto <span className="text-[#C2410C]">*</span>
                    </label>
                    <input
                      {...register('newProduct.name')}
                      placeholder="Ex: Granito Verde Ubatuba"
                      disabled={isSubmitting}
                      className={cn(
                        'w-full px-3 py-2.5 bg-white border focus:border-[#C2410C] outline-none text-sm transition-colors',
                        errors.newProduct?.name ? 'border-rose-500' : 'border-slate-200'
                      )}
                    />
                    {errors.newProduct?.name && <p className="mt-1 text-xs text-rose-500">{errors.newProduct.name.message}</p>}
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-2">
                      SKU <span className="text-slate-400">(opcional)</span>
                    </label>
                    <input
                      {...register('newProduct.sku')}
                      placeholder="Ex: GRN-VU-001"
                      disabled={isSubmitting}
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 focus:border-[#C2410C] outline-none text-sm transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-slate-600 block mb-2">
                        Material <span className="text-[#C2410C]">*</span>
                      </label>
                      <select
                        {...register('newProduct.material')}
                        disabled={isSubmitting}
                        className="w-full px-3 py-2.5 bg-white border border-slate-200 focus:border-[#C2410C] outline-none text-sm transition-colors"
                      >
                        <option value="">Selecione...</option>
                        <option value="GRANITO">Granito</option>
                        <option value="MARMORE">Mármore</option>
                        <option value="QUARTZITO">Quartzito</option>
                        <option value="LIMESTONE">Limestone</option>
                        <option value="TRAVERTINO">Travertino</option>
                        <option value="OUTROS">Outros</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-600 block mb-2">
                        Acabamento <span className="text-[#C2410C]">*</span>
                      </label>
                      <select
                        {...register('newProduct.finish')}
                        disabled={isSubmitting}
                        className="w-full px-3 py-2.5 bg-white border border-slate-200 focus:border-[#C2410C] outline-none text-sm transition-colors"
                      >
                        <option value="">Selecione...</option>
                        <option value="POLIDO">Polido</option>
                        <option value="LEVIGADO">Levigado</option>
                        <option value="BRUTO">Bruto</option>
                        <option value="APICOADO">Apicoado</option>
                        <option value="FLAMEADO">Flameado</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-2">
                      Descrição <span className="text-slate-400">(opcional)</span>
                    </label>
                    <input
                      {...register('newProduct.description')}
                      placeholder="Descrição do produto..."
                      disabled={isSubmitting}
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 focus:border-[#C2410C] outline-none text-sm transition-colors"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Identificação */}
          <div className="bg-white border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h2 className="font-semibold text-[#121212] flex items-center gap-2">
                <span className="w-6 h-6 bg-[#C2410C] text-white text-xs font-bold flex items-center justify-center">2</span>
                Identificação do Lote
              </h2>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-2">
                  Código do Lote <span className="text-[#C2410C]">*</span>
                </label>
                <input
                  {...register('batchCode')}
                  placeholder="Ex: GRN-000123"
                  disabled={isSubmitting}
                  className={cn(
                    'w-full px-3 py-2.5 bg-slate-50 border focus:border-[#C2410C] focus:bg-white outline-none text-sm transition-colors font-mono',
                    errors.batchCode ? 'border-rose-500' : 'border-slate-200'
                  )}
                />
                <p className="mt-1 text-xs text-slate-400">Use apenas letras maiúsculas, números e hífens</p>
                {errors.batchCode && <p className="mt-1 text-xs text-rose-500">{errors.batchCode.message}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-2">
                    Pedreira de Origem <span className="text-slate-400">(opcional)</span>
                  </label>
                  <input
                    {...register('originQuarry')}
                    placeholder="Ex: Pedreira São Gabriel"
                    disabled={isSubmitting}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#C2410C] focus:bg-white outline-none text-sm transition-colors"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-2">
                    Data de Entrada <span className="text-[#C2410C]">*</span>
                  </label>
                  <input
                    {...register('entryDate')}
                    type="date"
                    disabled={isSubmitting}
                    className={cn(
                      'w-full px-3 py-2.5 bg-slate-50 border focus:border-[#C2410C] focus:bg-white outline-none text-sm transition-colors',
                      errors.entryDate ? 'border-rose-500' : 'border-slate-200'
                    )}
                  />
                  {errors.entryDate && <p className="mt-1 text-xs text-rose-500">{errors.entryDate.message}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Dimensões Físicas */}
          <div className="bg-white border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h2 className="font-semibold text-[#121212] flex items-center gap-2">
                <span className="w-6 h-6 bg-[#C2410C] text-white text-xs font-bold flex items-center justify-center">3</span>
                <Ruler className="w-4 h-4 text-slate-400" />
                Dimensões Físicas
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-2">
                    Altura (cm) <span className="text-[#C2410C]">*</span>
                  </label>
                  <input
                    {...register('height', { valueAsNumber: true })}
                    type="number"
                    step="0.1"
                    placeholder="180"
                    disabled={isSubmitting}
                    className={cn(
                      'w-full px-3 py-2.5 bg-slate-50 border focus:border-[#C2410C] focus:bg-white outline-none text-sm transition-colors',
                      errors.height ? 'border-rose-500' : 'border-slate-200'
                    )}
                  />
                  {errors.height && <p className="mt-1 text-xs text-rose-500">{errors.height.message}</p>}
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-2">
                    Largura (cm) <span className="text-[#C2410C]">*</span>
                  </label>
                  <input
                    {...register('width', { valueAsNumber: true })}
                    type="number"
                    step="0.1"
                    placeholder="120"
                    disabled={isSubmitting}
                    className={cn(
                      'w-full px-3 py-2.5 bg-slate-50 border focus:border-[#C2410C] focus:bg-white outline-none text-sm transition-colors',
                      errors.width ? 'border-rose-500' : 'border-slate-200'
                    )}
                  />
                  {errors.width && <p className="mt-1 text-xs text-rose-500">{errors.width.message}</p>}
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-2">
                    Espessura (cm) <span className="text-[#C2410C]">*</span>
                  </label>
                  <input
                    {...register('thickness', { valueAsNumber: true })}
                    type="number"
                    step="0.1"
                    placeholder="3"
                    disabled={isSubmitting}
                    className={cn(
                      'w-full px-3 py-2.5 bg-slate-50 border focus:border-[#C2410C] focus:bg-white outline-none text-sm transition-colors',
                      errors.thickness ? 'border-rose-500' : 'border-slate-200'
                    )}
                  />
                  {errors.thickness && <p className="mt-1 text-xs text-rose-500">{errors.thickness.message}</p>}
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-2">
                    Qtd. Chapas <span className="text-[#C2410C]">*</span>
                  </label>
                  <input
                    {...register('quantitySlabs', { valueAsNumber: true })}
                    type="number"
                    placeholder="1"
                    disabled={isSubmitting}
                    className={cn(
                      'w-full px-3 py-2.5 bg-slate-50 border focus:border-[#C2410C] focus:bg-white outline-none text-sm transition-colors',
                      errors.quantitySlabs ? 'border-rose-500' : 'border-slate-200'
                    )}
                  />
                  {errors.quantitySlabs && <p className="mt-1 text-xs text-rose-500">{errors.quantitySlabs.message}</p>}
                </div>
              </div>

              {/* Área Total Calculada */}
              {calculatedArea > 0 && (
                <div className="mt-5 flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200">
                  <div className="w-10 h-10 bg-emerald-100 flex items-center justify-center">
                    <Package className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-emerald-700">
                      Área Total Calculada
                    </p>
                    <p className="text-xl font-mono font-bold text-emerald-900">
                      {formatArea(calculatedArea)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Precificação */}
          <div className="bg-white border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h2 className="font-semibold text-[#121212] flex items-center gap-2">
                <span className="w-6 h-6 bg-[#C2410C] text-white text-xs font-bold flex items-center justify-center">4</span>
                <DollarSign className="w-4 h-4 text-slate-400" />
                Precificação
              </h2>
            </div>
            <div className="p-6 space-y-5">
              {/* Unidade de Preço */}
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-3">
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
                          'px-5 py-2.5 text-sm font-medium transition-all',
                          field.value === 'M2'
                            ? 'bg-[#121212] text-white'
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
                          'px-5 py-2.5 text-sm font-medium transition-all',
                          field.value === 'FT2'
                            ? 'bg-[#121212] text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        )}
                        disabled={isSubmitting}
                      >
                        R$/ft²
                      </button>
                    </div>
                  )}
                />
                <p className="text-xs text-slate-400 mt-2">
                  Selecione a unidade de área para o preço. 1 m² = 10,76 ft²
                </p>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 block mb-2">
                  Preço Base Indústria (R$/{getPriceUnitLabel(priceUnit as PriceUnit)}) <span className="text-[#C2410C]">*</span>
                </label>
                <input
                  {...register('industryPrice', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  placeholder="150.00"
                  disabled={isSubmitting}
                  className={cn(
                    'w-full px-3 py-2.5 bg-slate-50 border focus:border-[#C2410C] focus:bg-white outline-none text-sm transition-colors',
                    errors.industryPrice ? 'border-rose-500' : 'border-slate-200'
                  )}
                />
                <p className="mt-1 text-xs text-slate-400">Este é o preço de repasse para brokers</p>
                {errors.industryPrice && <p className="mt-1 text-xs text-rose-500">{errors.industryPrice.message}</p>}
              </div>

              {/* Preço Total Calculado */}
              {calculatedArea > 0 && industryPrice > 0 && (
                <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200">
                  <div className="w-10 h-10 bg-blue-100 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-blue-700">
                      Valor Total do Lote
                    </p>
                    <p className="text-xl font-mono font-bold text-blue-900">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(calculateTotalBatchPrice(calculatedArea, industryPrice, priceUnit as PriceUnit))}
                    </p>
                    <p className="text-xs text-blue-600 mt-0.5">
                      {formatPricePerUnit(industryPrice, priceUnit as PriceUnit)} × {formatArea(calculatedArea)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Fotos do Lote */}
          <div className="bg-white border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h2 className="font-semibold text-[#121212] flex items-center gap-2">
                <span className="w-6 h-6 bg-[#C2410C] text-white text-xs font-bold flex items-center justify-center">5</span>
                <Camera className="w-4 h-4 text-slate-400" />
                Fotos do Lote
              </h2>
            </div>
            <div className="p-6">
              <label
                htmlFor="file-upload"
                className={cn(
                  'flex flex-col items-center justify-center w-full py-12',
                  'border-2 border-dashed border-slate-200',
                  'cursor-pointer transition-all',
                  'hover:border-[#C2410C] hover:bg-orange-50/30',
                  isSubmitting && 'opacity-50 cursor-not-allowed'
                )}
              >
                <div className="w-14 h-14 bg-slate-100 flex items-center justify-center mb-4">
                  <Upload className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-700 mb-1">
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
              <p className="text-xs text-slate-500 mt-3">
                A primeira foto será a capa do lote
              </p>

              {medias.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
                  {medias.map((media, index) => (
                    <div
                      key={index}
                      className="relative aspect-square overflow-hidden border border-slate-200 group"
                    >
                      <img
                        src={media.preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-full object-cover"
                      />

                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleMoveMedia(index, index - 1)}
                          className="p-1.5 bg-white text-slate-700 disabled:opacity-40"
                          disabled={index === 0}
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveMedia(index, index + 1)}
                          className="p-1.5 bg-white text-slate-700 disabled:opacity-40"
                          disabled={index === medias.length - 1}
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveMedia(index)}
                          className="p-1.5 bg-rose-500 text-white hover:bg-rose-600 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {index === 0 && (
                        <div className="absolute top-1.5 left-1.5">
                          <span className="px-1.5 py-0.5 bg-[#C2410C] text-white text-[10px] font-bold">
                            CAPA
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-6 border-t border-slate-200">
            <button
              type="button"
              onClick={() => router.back()}
              disabled={isSubmitting}
              className="text-slate-500 hover:text-[#121212] text-sm font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                'flex items-center gap-2 px-6 py-3 text-white text-sm font-medium transition-all',
                isSubmitting ? 'bg-slate-300 cursor-not-allowed' : 'bg-[#C2410C] hover:bg-[#a03609]'
              )}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  SALVAR LOTE
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}