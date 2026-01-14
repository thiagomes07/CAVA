'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Upload, X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Toggle } from '@/components/ui/toggle';
import { Card } from '@/components/ui/card';
import { Modal, ModalHeader, ModalTitle, ModalContent, ModalFooter } from '@/components/ui/modal';
import { LoadingState } from '@/components/shared/LoadingState';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/lib/hooks/useToast';
import { productSchema, type ProductInput } from '@/lib/schemas/product.schema';
import { materialTypes, finishTypes } from '@/lib/schemas/product.schema';
import type { Product, Media } from '@/lib/types';
import { cn } from '@/lib/utils/cn';

interface UploadedMedia {
  file: File;
  preview: string;
  isCover: boolean;
}

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  const { success, error } = useToast();

  const [product, setProduct] = useState<Product | null>(null);
  const [existingMedias, setExistingMedias] = useState<Media[]>([]);
  const [newMedias, setNewMedias] = useState<UploadedMedia[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
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

  useEffect(() => {
    fetchProduct();
  }, [productId]);

  const fetchProduct = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.get<Product>(`/products/${productId}`);
      setProduct(data);
      setExistingMedias(data.medias || []);
      
      reset({
        name: data.name,
        sku: data.sku || '',
        material: data.material,
        finish: data.finish,
        description: data.description || '',
        isPublic: data.isPublic,
      });
    } catch (err) {
      error('Erro ao carregar produto');
      router.push('/catalog');
    } finally {
      setIsLoading(false);
    }
  };

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
        setNewMedias((prev) => [
          ...prev,
          {
            file,
            preview: event.target?.result as string,
            isCover: existingMedias.length === 0 && prev.length === 0,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const handleRemoveExistingMedia = (index: number) => {
    setExistingMedias((prev) => {
      const newMedias = prev.filter((_, i) => i !== index);
      if (newMedias.length > 0 && !newMedias.some((m) => m.isCover)) {
        newMedias[0].isCover = true;
      }
      return newMedias;
    });
  };

  const handleRemoveNewMedia = (index: number) => {
    setNewMedias((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      if (updated.length > 0 && existingMedias.length === 0 && !updated.some((m) => m.isCover)) {
        updated[0].isCover = true;
      }
      return updated;
    });
  };

  const handleSetExistingCover = (index: number) => {
    setExistingMedias((prev) =>
      prev.map((media, i) => ({
        ...media,
        isCover: i === index,
      }))
    );
    setNewMedias((prev) =>
      prev.map((media) => ({
        ...media,
        isCover: false,
      }))
    );
  };

  const handleSetNewCover = (index: number) => {
    setNewMedias((prev) =>
      prev.map((media, i) => ({
        ...media,
        isCover: i === index,
      }))
    );
    setExistingMedias((prev) =>
      prev.map((media) => ({
        ...media,
        isCover: false,
      }))
    );
  };

  const onSubmit = async (data: ProductInput) => {
    try {
      setIsSubmitting(true);

      let newMediaUrls: string[] = [];

      if (newMedias.length > 0) {
        const formData = new FormData();
        newMedias.forEach((media) => {
          formData.append('files', media.file);
        });

        const uploadResult = await apiClient.upload<{ urls: string[] }>(
          '/upload/product-medias',
          formData
        );
        newMediaUrls = uploadResult.urls;
      }

      const allMedias = [
        ...existingMedias.map((m, i) => ({
          url: m.url,
          displayOrder: i,
          isCover: m.isCover,
        })),
        ...newMediaUrls.map((url, i) => ({
          url,
          displayOrder: existingMedias.length + i,
          isCover: newMedias[i]?.isCover || false,
        })),
      ];

      const productData = {
        ...data,
        medias: allMedias,
      };

      await apiClient.put(`/products/${productId}`, productData);

      success('Produto atualizado com sucesso');
      router.push('/catalog');
    } catch (err) {
      error('Erro ao atualizar produto');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await apiClient.delete(`/products/${productId}`);
      success('Produto removido do catálogo');
      router.push('/catalog');
    } catch (err) {
      error('Erro ao remover produto');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-mineral">
        <div className="px-8 py-8">
          <div className="max-w-3xl mx-auto">
            <LoadingState variant="form" rows={8} />
          </div>
        </div>
      </div>
    );
  }

  if (!product) return null;

  const allMedias = [...existingMedias, ...newMedias.map(m => ({ ...m, id: `new-${Math.random()}` }))];

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
              <h1 className="font-serif text-3xl text-obsidian">Editar Produto</h1>
              <p className="text-sm text-slate-500">{product.name}</p>
            </div>
          </div>

          <Button
            variant="destructive"
            onClick={() => setShowDeleteModal(true)}
            disabled={isSubmitting}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Excluir
          </Button>
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
                error={errors.name?.message}
                disabled={isSubmitting}
              />

              <Input
                {...register('sku')}
                label="Código SKU (Opcional)"
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
                  Adicionar mais fotos
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

            {allMedias.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {existingMedias.map((media, index) => (
                  <MediaPreview
                    key={media.id}
                    preview={media.url}
                    isCover={media.isCover}
                    onSetCover={() => handleSetExistingCover(index)}
                    onRemove={() => handleRemoveExistingMedia(index)}
                  />
                ))}
                {newMedias.map((media, index) => (
                  <MediaPreview
                    key={`new-${index}`}
                    preview={media.preview}
                    isCover={media.isCover}
                    onSetCover={() => handleSetNewCover(index)}
                    onRemove={() => handleRemoveNewMedia(index)}
                  />
                ))}
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
          <ModalTitle>Excluir Produto</ModalTitle>
        </ModalHeader>
        <ModalContent>
          <p className="text-slate-600">
            Tem certeza que deseja excluir o produto <strong>&quot;{product.name}&quot;</strong>?
          </p>
          <p className="text-rose-600 text-sm mt-4">
            Esta ação não pode ser desfeita.
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
            SIM, EXCLUIR
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

interface MediaPreviewProps {
  preview: string;
  isCover: boolean;
  onSetCover: () => void;
  onRemove: () => void;
}

function MediaPreview({ preview, isCover, onSetCover, onRemove }: MediaPreviewProps) {
  return (
    <div className="relative aspect-[4/3] rounded-sm overflow-hidden border-2 border-slate-200 group">
      <img
        src={preview}
        alt="Preview"
        className="w-full h-full object-cover"
      />

      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={onSetCover}
          className={cn(
            'px-3 py-1 rounded-sm text-xs font-semibold transition-colors',
            isCover
              ? 'bg-emerald-500 text-white'
              : 'bg-white text-obsidian hover:bg-slate-100'
          )}
        >
          {isCover ? 'Capa' : 'Definir Capa'}
        </button>

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
          <span className="px-2 py-1 bg-emerald-500 text-white text-xs font-semibold rounded-sm">
            CAPA
          </span>
        </div>
      )}
    </div>
  );
}