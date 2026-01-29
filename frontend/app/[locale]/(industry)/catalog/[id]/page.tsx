'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Upload, X, Trash2, GripVertical } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { restrictToParentElement } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';
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
  id: string;
  file: File;
  preview: string;
}

// Unified media item for drag and drop
interface DraggableMediaItem {
  id: string;
  url: string;
  isNew: boolean;
  originalMedia?: Media;
  newMedia?: UploadedMedia;
}

// Sortable Media Item Component
function SortableMediaItem({
  item,
  onRemove,
  isFirst
}: {
  item: DraggableMediaItem;
  onRemove: (id: string) => void;
  isFirst: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative aspect-[4/3] rounded-sm overflow-hidden border-2 group',
        isDragging ? 'opacity-50 shadow-xl' : '',
        item.isNew ? 'border-dashed border-emerald-400' : 'border-slate-200'
      )}
    >
      {isPlaceholderUrl(item.url) ? (
        <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs bg-slate-100">
          Sem foto
        </div>
      ) : (
        <img
          src={item.url}
          alt="Foto do produto"
          className="w-full h-full object-cover"
        />
      )}

      {/* Overlay with controls */}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
        <button
          type="button"
          className="p-2 bg-white/90 rounded-sm cursor-grab active:cursor-grabbing touch-none"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-4 h-4 text-slate-700" />
        </button>
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          className="p-2 bg-rose-500 text-white rounded-sm hover:bg-rose-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Cover badge */}
      {isFirst && (
        <div className="absolute top-2 left-2">
          <span className="px-2 py-1 bg-[#C2410C] text-white text-xs font-semibold rounded-sm">
            CAPA
          </span>
        </div>
      )}

      {/* New badge */}
      {item.isNew && (
        <div className="absolute top-2 right-2">
          <span className="px-2 py-1 bg-emerald-500 text-white text-xs font-semibold rounded-sm">
            NOVA
          </span>
        </div>
      )}
    </div>
  );
}

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  const { success, error } = useToast();

  const [product, setProduct] = useState<Product | null>(null);
  const [orderedMediaItems, setOrderedMediaItems] = useState<DraggableMediaItem[]>([]);
  const [mediasToDelete, setMediasToDelete] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // State for active dragging item
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeItem = activeId ? orderedMediaItems.find(item => item.id === activeId) : null;

  const handleDragStart = useCallback((event: { active: { id: string | number } }) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    setOrderedMediaItems((items) => {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);

      if (oldIndex === -1 || newIndex === -1) return items;

      return arrayMove(items, oldIndex, newIndex);
    });
  }, []);

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

      // Initialize ordered media items from product
      const initialItems: DraggableMediaItem[] = (data.medias || []).map((media) => ({
        id: `existing-${media.id}`,
        url: media.url,
        isNew: false,
        originalMedia: media,
      }));
      setOrderedMediaItems(initialItems);

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
    const totalPhotos = orderedMediaItems.length + files.length;

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
        const newItem: DraggableMediaItem = {
          id: `new-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          url: event.target?.result as string,
          isNew: true,
          newMedia: {
            id: `new-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            file,
            preview: event.target?.result as string,
          },
        };
        setOrderedMediaItems((prev) => [...prev, newItem]);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const handleRemoveMedia = useCallback((itemId: string) => {
    const itemToRemove = orderedMediaItems.find(item => item.id === itemId);
    if (itemToRemove && !itemToRemove.isNew && itemToRemove.originalMedia) {
      setMediasToDelete((prev) => [...prev, itemToRemove.originalMedia!.id]);
    }
    setOrderedMediaItems((prev) => prev.filter((item) => item.id !== itemId));
  }, [orderedMediaItems]);

  const onSubmit = async (data: ProductInput) => {
    try {
      setIsSubmitting(true);

      // Extract existing and new medias from ordered items
      const existingMedias: Media[] = [];
      const newMediaFiles: File[] = [];

      orderedMediaItems.forEach((item, index) => {
        if (!item.isNew && item.originalMedia) {
          existingMedias.push({ ...item.originalMedia, displayOrder: index });
        } else if (item.isNew && item.newMedia) {
          newMediaFiles.push(item.newMedia.file);
        }
      });

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
        const orderPayload = existingMedias.map((media) => ({
          id: media.id,
          displayOrder: media.displayOrder,
        }));

        await apiClient.patch('/product-medias/order', orderPayload).catch((err) => {
          console.error('Erro ao atualizar ordem das mídias:', err);
        });
      }

      // 3. Upload de novas mídias
      if (newMediaFiles.length > 0) {
        const formData = new FormData();
        formData.append('productId', productId);
        newMediaFiles.forEach((file) => {
          formData.append('medias', file);
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
                  (isSubmitting || orderedMediaItems.length >= 10) && 'opacity-50 cursor-not-allowed'
                )}
              >
                <Upload className="w-12 h-12 text-slate-400 mb-4" />
                <p className="text-sm text-slate-600 mb-1">
                  Adicionar mais fotos
                </p>
                <p className="text-xs text-slate-400">
                  {orderedMediaItems.length}/10 fotos • JPG, PNG ou WebP • 5MB máx.
                </p>
                <input
                  id="file-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handleFileSelect}
                  disabled={isSubmitting || orderedMediaItems.length >= 10}
                  className="hidden"
                />
              </label>
              {orderedMediaItems.length === 0 && (
                <p className="text-xs text-slate-500 mt-2">
                  A primeira foto será a capa do produto
                </p>
              )}
            </div>

            {orderedMediaItems.length > 0 && (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                modifiers={[restrictToParentElement]}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={orderedMediaItems.map(item => item.id)}
                  strategy={rectSortingStrategy}
                >
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {orderedMediaItems.map((item, index) => (
                      <SortableMediaItem
                        key={item.id}
                        item={item}
                        onRemove={handleRemoveMedia}
                        isFirst={index === 0}
                      />
                    ))}
                  </div>
                </SortableContext>
                <DragOverlay>
                  {activeItem ? (
                    <div className="aspect-[4/3] rounded-sm overflow-hidden border-2 border-[#C2410C] shadow-2xl opacity-90">
                      <img
                        src={activeItem.url}
                        alt="Arrastando"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            )}

            {orderedMediaItems.length > 0 && (
              <p className="text-xs text-slate-400 mt-3 flex items-center gap-1">
                <GripVertical className="w-3 h-3" />
                Arraste as fotos para reordenar
              </p>
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