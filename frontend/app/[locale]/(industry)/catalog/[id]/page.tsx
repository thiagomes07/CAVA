'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Upload, X, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Toggle } from '@/components/ui/toggle';
import { Card } from '@/components/ui/card';
import { Modal, ModalHeader, ModalTitle, ModalContent, ModalFooter } from '@/components/ui/modal';
import { LoadingState } from '@/components/shared/LoadingState';
import { apiClient, ApiError } from '@/lib/api/client';
import { useToast } from '@/lib/hooks/useToast';
import { productSchema, type ProductInput } from '@/lib/schemas/product.schema';
import { materialTypes, finishTypes } from '@/lib/schemas/product.schema';
import type { Product, Media } from '@/lib/types';
import { cn } from '@/lib/utils/cn';
import { isPlaceholderUrl } from '@/lib/utils/media';

interface UploadedMedia {
  file: File;
  preview: string;
}

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  const { success, error } = useToast();

  const [product, setProduct] = useState<Product | null>(null);
  const [existingMedias, setExistingMedias] = useState<Media[]>([]);
  const [mediasToDelete, setMediasToDelete] = useState<string[]>([]);
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
    } catch {
      error('Erro ao carregar produto');
      router.push('/catalog');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    // existingMedias já está filtrada (não contém mídias removidas)
    const totalPhotos = existingMedias.length + newMedias.length + files.length;

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

  const onSubmit = async (data: ProductInput) => {
    try {
      setIsSubmitting(true);

      // 1. Deletar mídias removidas (ignora erros 404)
      if (mediasToDelete.length > 0) {
        await Promise.all(
          mediasToDelete.map((mediaId) =>
            apiClient.delete(`/product-medias/${mediaId}`).catch((err) => {
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

        await apiClient.patch('/product-medias/order', orderPayload).catch((err) => {
          console.error('Erro ao atualizar ordem das mídias:', err);
        });
      }

      // 3. Upload de novas mídias
      if (newMedias.length > 0) {
        const formData = new FormData();
        formData.append('productId', productId);
        newMedias.forEach((media) => {
          formData.append('medias', media.file);
        });

        await apiClient.upload<{ urls: string[] }>(
          '/upload/product-medias',
          formData
        );
      }

      // 4. Atualizar dados do produto
      const productData = {
        name: data.name,
        sku: data.sku || undefined,
        material: data.material,
        finish: data.finish,
        description: data.description || undefined,
        isPublic: data.isPublic,
      };

      await apiClient.put(`/products/${productId}`, productData);

      success('Produto atualizado com sucesso');
      router.push('/catalog');
    } catch {
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
      if (err instanceof ApiError) {
        error(err.message);
      } else {
        error('Erro ao remover produto');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div>
        <LoadingState variant="form" rows={8} />
      </div>
    );
  }

  if (!product) return null;

  // existingMedias já está filtrada (mídias removidas são retiradas em handleRemoveExistingMedia)
  const allMedias = [...existingMedias, ...newMedias.map((m) => ({ ...m, id: `new-${Math.random()}` }))];

  return (
    <div>
      {/* Header */}
      <div className="bg-porcelain border-b border-slate-100 -mx-6 -mt-8 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl text-obsidian">Editar Produto</h1>
            <p className="text-sm text-slate-500">{product.name}</p>
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
      <form onSubmit={handleSubmit(onSubmit)} className="py-8">
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
                A primeira foto será a capa do produto
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
                    {isPlaceholderUrl(media.url) ? (
                      <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs bg-slate-100">
                        Sem foto
                      </div>
                    ) : (
                      <img
                        src={media.url}
                        alt={`Foto ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    )}

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