'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Upload, X, ArrowUp, ArrowDown, Eye, EyeOff, Sparkles } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/lib/hooks/useToast';
import { productSchema, type ProductInput } from '@/lib/schemas/product.schema';
import { materialTypes, finishTypes } from '@/lib/schemas/product.schema';
import { cn } from '@/lib/utils/cn';

interface UploadedMedia {
  file: File;
  preview: string;
}

export default function NewProductPage() {
  const router = useRouter();
  const { success, error } = useToast();

  const [medias, setMedias] = useState<UploadedMedia[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<ProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      sku: '',
      material: 'GRANITO',
      finish: 'POLIDO',
      description: '',
      isPublic: true,
    },
  });

  const isPublic = watch('isPublic');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const totalPhotos = medias.length + files.length;

    if (totalPhotos > 10) {
      error('Máximo de 10 fotos por produto');
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
    if (index === 0) return;
    setMedias((prev) => {
      const next = [...prev];
      const [cover] = next.splice(index, 1);
      next.unshift(cover);
      return next;
    });
  };

  const onSubmit = async (data: ProductInput) => {
    try {
      setIsSubmitting(true);

      // 1. Criar o produto primeiro (sem mídias)
      const productData = {
        name: data.name,
        sku: data.sku || undefined,
        material: data.material,
        finish: data.finish,
        description: data.description || undefined,
        isPublic: data.isPublic,
      };

      const product = await apiClient.post<{ id: string }>('/products', productData);

      // 2. Se houver mídias, fazer upload com o productId
      if (medias.length > 0 && product.id) {
        const formData = new FormData();
        formData.append('productId', product.id);
        medias.forEach((media) => {
          formData.append('medias', media.file);
        });

        await apiClient.upload<{ urls: string[] }>(
          '/upload/product-medias',
          formData
        );
      }

      success('Produto cadastrado com sucesso');
      router.push('/catalog');
    } catch {
      error('Erro ao cadastrar produto');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-mineral">
      {/* Header */}
      <div className="bg-porcelain border-b border-slate-100 px-8 py-6">
        <h1 className="font-serif text-3xl text-obsidian mb-2">Novo Produto</h1>
        <p className="text-sm text-slate-500">
          Cadastre um novo tipo de pedra no catálogo
        </p>
      </div>

      {/* Form */}
      <div className="px-8 py-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Informações Básicas */}
          <div className="bg-white border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h2 className="font-semibold text-[#121212] flex items-center gap-2">
                <span className="w-6 h-6 bg-[#C2410C] text-white text-xs font-bold flex items-center justify-center">1</span>
                Informações Básicas
              </h2>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-2">
                  Nome do Produto <span className="text-[#C2410C]">*</span>
                </label>
                <input
                  {...register('name')}
                  placeholder="Ex: Granito Preto São Gabriel"
                  disabled={isSubmitting}
                  className={cn(
                    'w-full px-3 py-2.5 bg-slate-50 border focus:border-[#C2410C] focus:bg-white outline-none text-sm transition-colors',
                    errors.name ? 'border-rose-500' : 'border-slate-200',
                    isSubmitting && 'opacity-50 cursor-not-allowed'
                  )}
                />
                {errors.name && <p className="mt-1 text-xs text-rose-500">{errors.name.message}</p>}
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 block mb-2">
                  Código SKU <span className="text-slate-400">(opcional)</span>
                </label>
                <input
                  {...register('sku')}
                  placeholder="Ex: GRN-PSG-001"
                  disabled={isSubmitting}
                  className={cn(
                    'w-full px-3 py-2.5 bg-slate-50 border focus:border-[#C2410C] focus:bg-white outline-none text-sm transition-colors',
                    errors.sku ? 'border-rose-500' : 'border-slate-200',
                    isSubmitting && 'opacity-50 cursor-not-allowed'
                  )}
                />
                {errors.sku && <p className="mt-1 text-xs text-rose-500">{errors.sku.message}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-2">
                    Tipo de Material <span className="text-[#C2410C]">*</span>
                  </label>
                  <select
                    {...register('material')}
                    disabled={isSubmitting}
                    className={cn(
                      'w-full px-3 py-2.5 bg-slate-50 border focus:border-[#C2410C] focus:bg-white outline-none text-sm transition-colors',
                      errors.material ? 'border-rose-500' : 'border-slate-200',
                      isSubmitting && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <option value="">Selecione...</option>
                    {materialTypes.map((material) => (
                      <option key={material} value={material}>
                        {material}
                      </option>
                    ))}
                  </select>
                  {errors.material && <p className="mt-1 text-xs text-rose-500">{errors.material.message}</p>}
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-2">
                    Acabamento <span className="text-[#C2410C]">*</span>
                  </label>
                  <select
                    {...register('finish')}
                    disabled={isSubmitting}
                    className={cn(
                      'w-full px-3 py-2.5 bg-slate-50 border focus:border-[#C2410C] focus:bg-white outline-none text-sm transition-colors',
                      errors.finish ? 'border-rose-500' : 'border-slate-200',
                      isSubmitting && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <option value="">Selecione...</option>
                    {finishTypes.map((finish) => (
                      <option key={finish} value={finish}>
                        {finish}
                      </option>
                    ))}
                  </select>
                  {errors.finish && <p className="mt-1 text-xs text-rose-500">{errors.finish.message}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Descrição Técnica */}
          <div className="bg-white border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h2 className="font-semibold text-[#121212] flex items-center gap-2">
                <span className="w-6 h-6 bg-[#C2410C] text-white text-xs font-bold flex items-center justify-center">2</span>
                Descrição Técnica
              </h2>
            </div>
            <div className="p-6">
              <label className="text-xs font-medium text-slate-600 block mb-2">
                Descrição <span className="text-slate-400">(opcional)</span>
              </label>
              <textarea
                {...register('description')}
                placeholder="Características técnicas, origem, recomendações de uso..."
                rows={4}
                disabled={isSubmitting}
                className={cn(
                  'w-full px-3 py-2.5 bg-slate-50 border focus:border-[#C2410C] focus:bg-white outline-none text-sm transition-colors resize-none',
                  errors.description ? 'border-rose-500' : 'border-slate-200',
                  isSubmitting && 'opacity-50 cursor-not-allowed'
                )}
              />
              {errors.description && <p className="mt-1 text-xs text-rose-500">{errors.description.message}</p>}
            </div>
          </div>

          {/* Fotos de Catálogo */}
          <div className="bg-white border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h2 className="font-semibold text-[#121212] flex items-center gap-2">
                <span className="w-6 h-6 bg-[#C2410C] text-white text-xs font-bold flex items-center justify-center">3</span>
                Fotos de Catálogo
              </h2>
            </div>
            <div className="p-6">
              {/* Upload Zone */}
              <label
                htmlFor="file-upload"
                className={cn(
                  'flex flex-col items-center justify-center w-full py-12',
                  'border-2 border-dashed border-slate-200',
                  'cursor-pointer transition-all',
                  'hover:border-[#C2410C] hover:bg-orange-50/30',
                  (isSubmitting || medias.length >= 10) && 'opacity-50 cursor-not-allowed'
                )}
              >
                <div className="w-14 h-14 bg-slate-100 flex items-center justify-center mb-4">
                  <Upload className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-700 mb-1">
                  Clique para selecionar ou arraste arquivos
                </p>
                <p className="text-xs text-slate-400">
                  {medias.length}/10 fotos • JPG, PNG ou WebP • 5MB máx.
                </p>
                <input
                  id="file-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handleFileSelect}
                  disabled={isSubmitting || medias.length >= 10}
                  className="hidden"
                />
              </label>
              <p className="text-xs text-slate-500 mt-3">
                A primeira foto será a capa do produto
              </p>

              {/* Preview Grid */}
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

                      {/* Overlay */}
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

                      {/* Cover Badge */}
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

              {medias.length === 0 && (
                <div className="text-center py-6 text-slate-400 text-sm">
                  Nenhuma foto adicionada ainda
                </div>
              )}
            </div>
          </div>

          {/* Visibilidade */}
          <div className="bg-white border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h2 className="font-semibold text-[#121212] flex items-center gap-2">
                <span className="w-6 h-6 bg-[#C2410C] text-white text-xs font-bold flex items-center justify-center">4</span>
                Visibilidade
              </h2>
            </div>
            <div className="p-6">
              <button
                type="button"
                onClick={() => setValue('isPublic', !isPublic)}
                disabled={isSubmitting}
                className={cn(
                  'w-full flex items-center justify-between p-4 border transition-all',
                  isPublic 
                    ? 'border-[#C2410C] bg-orange-50/50' 
                    : 'border-slate-200 bg-slate-50'
                )}
              >
                <div className="flex items-center gap-3">
                  {isPublic ? (
                    <Eye className="w-5 h-5 text-[#C2410C]" />
                  ) : (
                    <EyeOff className="w-5 h-5 text-slate-400" />
                  )}
                  <div className="text-left">
                    <p className="text-sm font-medium text-slate-700">
                      {isPublic ? 'Visível no catálogo' : 'Oculto do catálogo'}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {isPublic 
                        ? 'Este produto será visível em links de catálogo compartilhados' 
                        : 'Este produto não aparecerá nos links compartilhados'}
                    </p>
                  </div>
                </div>
                <div className={cn(
                  'w-10 h-6 rounded-full transition-colors relative',
                  isPublic ? 'bg-[#C2410C]' : 'bg-slate-300'
                )}>
                  <div className={cn(
                    'absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm',
                    isPublic ? 'left-5' : 'left-1'
                  )} />
                </div>
              </button>
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
                  SALVAR PRODUTO
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}