'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Upload, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Toggle } from '@/components/ui/toggle';
import { Card } from '@/components/ui/card';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/lib/hooks/useToast';
import { productSchema, type ProductInput } from '@/lib/schemas/product.schema';
import { materialTypes, finishTypes } from '@/lib/schemas/product.schema';
import { cn } from '@/lib/utils/cn';

interface UploadedMedia {
  file: File;
  preview: string;
  isCover: boolean;
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
      isPublic: true,
    },
  });

  const isPublic = watch('isPublic');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
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
            isCover: prev.length === 0,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const handleRemoveMedia = (index: number) => {
    setMedias((prev) => {
      const newMedias = prev.filter((_, i) => i !== index);
      if (newMedias.length > 0 && !newMedias.some((m) => m.isCover)) {
        newMedias[0].isCover = true;
      }
      return newMedias;
    });
  };

  const handleSetCover = (index: number) => {
    setMedias((prev) =>
      prev.map((media, i) => ({
        ...media,
        isCover: i === index,
      }))
    );
  };

  const onSubmit = async (data: ProductInput) => {
    try {
      setIsSubmitting(true);

      let mediaUrls: string[] = [];

      if (medias.length > 0) {
        const formData = new FormData();
        medias.forEach((media) => {
          formData.append('files', media.file);
        });

        const uploadResult = await apiClient.upload<{ urls: string[] }>(
          '/upload/product-medias',
          formData
        );
        mediaUrls = uploadResult.urls;
      }

      const productData = {
        ...data,
        medias: mediaUrls.map((url, index) => ({
          url,
          displayOrder: index,
          isCover: medias[index]?.isCover || false,
        })),
      };

      await apiClient.post('/products', productData);

      success('Produto cadastrado com sucesso');
      router.push('/catalog');
    } catch (err) {
      error('Erro ao cadastrar produto');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-mineral">
      {/* Header */}
      <div className="bg-porcelain border-b border-slate-100 px-8 py-6">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-slate-100 rounded-sm transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="font-serif text-3xl text-obsidian">Novo Produto</h1>
            <p className="text-sm text-slate-500">
              Cadastre um novo tipo de pedra no catálogo
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="px-8 py-8">
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Informações Básicas */}
          <Card>
            <h2 className="text-lg font-semibold text-obsidian mb-6">
              Informações Básicas
            </h2>

            <div className="space-y-6">
              <Input
                {...register('name')}
                label="Nome do Produto"
                placeholder="Ex: Granito Preto São Gabriel"
                error={errors.name?.message}
                disabled={isSubmitting}
              />

              <Input
                {...register('sku')}
                label="Código SKU (Opcional)"
                placeholder="Ex: GRN-PSG-001"
                error={errors.sku?.message}
                disabled={isSubmitting}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Select
                  {...register('material')}
                  label="Tipo de Material"
                  error={errors.material?.message}
                  disabled={isSubmitting}
                >
                  <option value="">Selecione...</option>
                  {materialTypes.map((material) => (
                    <option key={material} value={material}>
                      {material}
                    </option>
                  ))}
                </Select>

                <Select
                  {...register('finish')}
                  label="Acabamento"
                  error={errors.finish?.message}
                  disabled={isSubmitting}
                >
                  <option value="">Selecione...</option>
                  {finishTypes.map((finish) => (
                    <option key={finish} value={finish}>
                      {finish}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </Card>

          {/* Descrição Técnica */}
          <Card>
            <h2 className="text-lg font-semibold text-obsidian mb-6">
              Descrição Técnica
            </h2>

            <Textarea
              {...register('description')}
              placeholder="Características técnicas, origem, recomendações de uso..."
              rows={6}
              error={errors.description?.message}
              disabled={isSubmitting}
            />
          </Card>

          {/* Fotos de Catálogo */}
          <Card>
            <h2 className="text-lg font-semibold text-obsidian mb-6">
              Fotos de Catálogo
            </h2>

            {/* Upload Zone */}
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
                  Clique para selecionar ou arraste arquivos
                </p>
                <p className="text-xs text-slate-400">
                  JPG, PNG ou WebP (máx. 5MB por arquivo)
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
            </div>

            {/* Preview Grid */}
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

                    {/* Overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSetCover(index)}
                        className={cn(
                          'px-3 py-1 rounded-sm text-xs font-semibold transition-colors',
                          media.isCover
                            ? 'bg-emerald-500 text-white'
                            : 'bg-white text-obsidian hover:bg-slate-100'
                        )}
                      >
                        {media.isCover ? 'Capa' : 'Definir Capa'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemoveMedia(index)}
                        className="p-2 bg-rose-500 text-white rounded-sm hover:bg-rose-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Cover Badge */}
                    {media.isCover && (
                      <div className="absolute top-2 left-2">
                        <span className="px-2 py-1 bg-emerald-500 text-white text-xs font-semibold rounded-sm">
                          CAPA
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {medias.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-sm">
                Nenhuma foto adicionada ainda
              </div>
            )}
          </Card>

          {/* Visibilidade */}
          <Card>
            <h2 className="text-lg font-semibold text-obsidian mb-6">
              Visibilidade
            </h2>

            <Toggle
              checked={isPublic}
              onChange={(e) => setValue('isPublic', e.target.checked)}
              label="Exibir no catálogo público"
              disabled={isSubmitting}
            />
            <p className="text-xs text-slate-500 mt-2 ml-14">
              Quando ativado, este produto será visível em links de catálogo compartilhados
            </p>
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
              SALVAR PRODUTO
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}