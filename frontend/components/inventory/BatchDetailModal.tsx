'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  X, Layers, Settings, Save, DollarSign,
  Share2, Trash2, Package, User,
  Upload, Boxes, GripVertical
} from 'lucide-react';
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
import type { Batch, Media, PriceUnit, BatchStatus, User as UserType, SharedInventoryBatch } from '@/lib/types';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { MoneyInput } from '@/components/ui/masked-input';
import { formatDate } from '@/lib/utils/formatDate';
import { formatArea, calculateTotalArea } from '@/lib/utils/formatDimensions';
import { calculateTotalBatchPrice, formatPricePerUnit, getPriceUnitLabel } from '@/lib/utils/priceConversion';
import { isPlaceholderUrl } from '@/lib/utils/media';
import { cn } from '@/lib/utils/cn';
import { apiClient, ApiError } from '@/lib/api/client';
import { useToast } from '@/lib/hooks/useToast';
import { SellBatchModal } from '@/app/[locale]/(industry)/inventory/[id]/components/SellBatchModal';

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
          alt="Foto do lote"
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
          <span className="px-2 py-1 bg-blue-500 text-white text-xs font-semibold rounded-sm">
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

interface BatchDetailModalProps {
  batch: Batch;
  sharedBatches: SharedInventoryBatch[];
  availableUsers: UserType[];
  onClose: () => void;
  onUpdate: (data: Partial<Batch>) => Promise<void>;
  onArchive: () => Promise<void>;
  onDelete: () => Promise<void>;
  onShare: (userId: string, negotiatedPrice?: number) => Promise<void>;
  onRemoveShare: (shareId: string) => Promise<void>;
  onUpdateMedia: (existingMedias: Media[], newMedias: File[], mediasToDelete: string[]) => Promise<void>;
  onUpdateStatus?: (status: BatchStatus, fromStatus: BatchStatus, quantity: number) => Promise<void>;
}

export const BatchDetailModal: React.FC<BatchDetailModalProps> = ({
  batch,
  sharedBatches,
  availableUsers,
  onClose,
  onUpdate,
  onArchive,
  onDelete,
  onShare,
  onRemoveShare,
  onUpdateMedia,
  onUpdateStatus,
}) => {
  const { success, error: toastError } = useToast();
  const [activeTab, setActiveTab] = useState<'overview' | 'stock' | 'sharing' | 'inventory'>('stock');
  
  // Inventory tab state
  const [statusQuantityInput, setStatusQuantityInput] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<BatchStatus | null>(null);
  const [sourceStatus, setSourceStatus] = useState<BatchStatus>('DISPONIVEL');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusUpdatedAt, setStatusUpdatedAt] = useState<number | null>(null);
  const [currentBatch, setCurrentBatch] = useState<Batch>(batch);
  const [showSellModal, setShowSellModal] = useState(false);

  // Form data for stock tab
  const [formData, setFormData] = useState({
    batchCode: batch.batchCode,
    height: batch.height,
    width: batch.width,
    thickness: batch.thickness,
    quantitySlabs: batch.quantitySlabs,
    industryPrice: batch.industryPrice,
    priceUnit: batch.priceUnit || 'M2' as PriceUnit,
    originQuarry: batch.originQuarry || '',
    isPublic: batch.isPublic || false,
  });

  // Media management - single ordered list
  const [orderedMediaItems, setOrderedMediaItems] = useState<DraggableMediaItem[]>([]);
  const [mediasToDelete, setMediasToDelete] = useState<string[]>([]);

  // Sharing
  const [selectedUserId, setSelectedUserId] = useState('');
  const [negotiatedPrice, setNegotiatedPrice] = useState<number | undefined>(undefined);
  const [isSharing, setIsSharing] = useState(false);

  const [isSaving, setIsSaving] = useState(false);

  // Status labels for inventory management
  const statusLabels: Record<BatchStatus, string> = {
    DISPONIVEL: 'Disponível',
    RESERVADO: 'Reservado',
    VENDIDO: 'Vendido',
    INATIVO: 'Inativo',
  };

  const getMaxForSource = (source: BatchStatus) => {
    switch (source) {
      case 'DISPONIVEL':
        return currentBatch.availableSlabs;
      case 'RESERVADO':
        return currentBatch.reservedSlabs ?? 0;
      case 'VENDIDO':
        return currentBatch.soldSlabs ?? 0;
      case 'INATIVO':
        return currentBatch.inactiveSlabs ?? 0;
      default:
        return 0;
    }
  };

  const parsedStatusQuantity = statusQuantityInput === '' ? 0 : Number(statusQuantityInput);
  const isQuantityValid = Number.isFinite(parsedStatusQuantity) && parsedStatusQuantity > 0;

  useEffect(() => {
    setFormData({
      batchCode: batch.batchCode,
      height: batch.height,
      width: batch.width,
      thickness: batch.thickness,
      quantitySlabs: batch.quantitySlabs,
      industryPrice: batch.industryPrice,
      priceUnit: batch.priceUnit || 'M2',
      originQuarry: batch.originQuarry || '',
      isPublic: batch.isPublic || false,
    });
    // Initialize ordered media items from batch
    const initialItems: DraggableMediaItem[] = (batch.medias || []).map((media) => ({
      id: `existing-${media.id}`,
      url: media.url,
      isNew: false,
      originalMedia: media,
    }));
    setOrderedMediaItems(initialItems);
    setCurrentBatch(batch);
  }, [batch]);

  const calculatedArea = useMemo(() => {
    if (formData.height && formData.width && formData.quantitySlabs) {
      return calculateTotalArea(formData.height, formData.width, formData.quantitySlabs);
    }
    return 0;
  }, [formData.height, formData.width, formData.quantitySlabs]);

  const totalBatchValue = useMemo(() => {
    if (calculatedArea > 0 && formData.industryPrice > 0) {
      return calculateTotalBatchPrice(calculatedArea, formData.industryPrice, formData.priceUnit);
    }
    return 0;
  }, [calculatedArea, formData.industryPrice, formData.priceUnit]);

  const handleUpdateStatus = async (status: BatchStatus): Promise<boolean> => {
    if (sourceStatus === status) {
      toastError('Selecione um destino diferente da origem');
      return false;
    }
    const maxAllowed = getMaxForSource(sourceStatus);
    if (maxAllowed <= 0) {
      toastError('Não há chapas suficientes para essa ação');
      return false;
    }
    if (!isQuantityValid) {
      toastError('Informe uma quantidade válida de chapas');
      return false;
    }
    if (parsedStatusQuantity > maxAllowed) {
      toastError(`Quantidade máxima para ${statusLabels[status]} é ${maxAllowed}`);
      return false;
    }
    try {
      setIsUpdatingStatus(true);
      const updated = await apiClient.patch<Batch>(`/batches/${batch.id}/availability`, {
        status,
        fromStatus: sourceStatus,
        quantity: parsedStatusQuantity,
      });
      setCurrentBatch(updated);
      setSelectedStatus(null);
      setStatusQuantityInput('');
      setStatusUpdatedAt(Date.now());
      success('Status do lote atualizado');
      return true;
    } catch (err) {
      if (err instanceof ApiError) {
        toastError(err.message);
      } else {
        toastError('Erro ao atualizar status do lote');
      }
      return false;
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleApplyStatus = async () => {
    if (!selectedStatus) {
      toastError('Selecione um status para atualizar');
      return;
    }

    // Intercepta status 'VENDIDO' para abrir modal de venda
    if (selectedStatus === 'VENDIDO') {
      if (!isQuantityValid || parsedStatusQuantity <= 0) {
        toastError('Informe uma quantidade válida de chapas para vender');
        return;
      }
      setShowSellModal(true);
      return;
    }

    await handleUpdateStatus(selectedStatus);
  };

  const handleSellSuccess = async () => {
    // Recarregar dados do batch após venda bem-sucedida
    try {
      const updated = await apiClient.get<Batch>(`/batches/${batch.id}`);
      setCurrentBatch(updated);
      setSelectedStatus(null);
      setStatusQuantityInput('');
      setStatusUpdatedAt(Date.now());
    } catch (err) {
      console.error('Erro ao recarregar batch:', err);
    }
  };

  const handleSaveStock = async () => {
    try {
      setIsSaving(true);
      await onUpdate(formData);

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

      // Handle media updates if there are changes
      const hasNewMedias = orderedMediaItems.some(item => item.isNew);
      if (mediasToDelete.length > 0 || hasNewMedias || existingMedias.length > 0) {
        await onUpdateMedia(existingMedias, newMediaFiles, mediasToDelete);
      }
    } finally {
      setIsSaving(false);
    }
  };

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

  const handleRemoveMedia = useCallback((itemId: string) => {
    const itemToRemove = orderedMediaItems.find(item => item.id === itemId);
    if (itemToRemove && !itemToRemove.isNew && itemToRemove.originalMedia) {
      setMediasToDelete((prev) => [...prev, itemToRemove.originalMedia!.id]);
    }
    setOrderedMediaItems((prev) => prev.filter((item) => item.id !== itemId));
  }, [orderedMediaItems]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const totalPhotos = orderedMediaItems.length + files.length;

    if (totalPhotos > 10) {
      alert('Máximo de 10 fotos por lote');
      return;
    }

    files.forEach((file) => {
      if (!file.type.startsWith('image/')) {
        alert('Formato não suportado. Use JPG, PNG ou WebP');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        alert('Arquivo excede o limite de 5MB');
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

  const handleShareBatch = async () => {
    if (!selectedUserId) return;
    try {
      setIsSharing(true);
      await onShare(selectedUserId, negotiatedPrice && negotiatedPrice > 0 ? negotiatedPrice : undefined);
      setSelectedUserId('');
      setNegotiatedPrice(undefined);
    } finally {
      setIsSharing(false);
    }
  };

  const coverMedia = orderedMediaItems[0] ? { url: orderedMediaItems[0].url } : null;

  const totalQuantity = currentBatch.quantitySlabs;
  const availableQty = currentBatch.availableSlabs;
  const reservedQty = currentBatch.reservedSlabs ?? 0;
  const soldQty = currentBatch.soldSlabs ?? 0;
  const inactiveQty = currentBatch.inactiveSlabs ?? 0;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-[#121212]/90 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-sm shadow-2xl w-[95vw] h-[95vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-white/10 relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-4 md:px-8 py-4 md:py-6 border-b border-[#222] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#121212] text-white shrink-0">
            <div className="flex items-center gap-4">
              <h2 className="text-lg md:text-2xl font-serif tracking-wide">{batch.product.name}</h2>
              <div className="hidden md:flex items-center text-sm text-slate-400 mt-1 space-x-3">
                <span className="text-xs font-bold uppercase tracking-widest border border-white/20 px-2 py-0.5 rounded-sm">
                  LOTE: {batch.batchCode}
                </span>
                {batch.originQuarry && (
                  <span className="font-light">{batch.originQuarry}</span>
                )}
              </div>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
              <X className="w-8 h-8" />
            </button>
          </div>

          <div className="flex-1 overflow-hidden bg-[#FAFAFA] flex flex-col md:flex-row">
            {/* Mobile Tabs */}
            <div className="md:hidden bg-white border-b border-slate-200 px-4 pt-4 flex gap-2 overflow-x-auto sticky top-0 z-10 pb-4">
              <button
                onClick={() => setActiveTab('overview')}
                className={cn(
                  'pb-4 pl-3 text-xs font-bold uppercase tracking-widest flex items-center transition-colors border-l-2 whitespace-nowrap',
                  activeTab === 'overview'
                    ? 'border-[#C2410C] text-[#121212]'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                )}
              >
                <Layers className="w-3 h-3 mr-2" />
                Visão Geral
              </button>
              <button
                onClick={() => setActiveTab('stock')}
                className={cn(
                  'pb-4 pl-3 text-xs font-bold uppercase tracking-widest flex items-center transition-colors border-l-2 whitespace-nowrap',
                  activeTab === 'stock'
                    ? 'border-[#C2410C] text-[#121212]'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                )}
              >
                <Settings className="w-3 h-3 mr-2" />
                Estoque
              </button>
              <button
                onClick={() => setActiveTab('inventory')}
                className={cn(
                  'pb-4 pl-3 text-xs font-bold uppercase tracking-widest flex items-center transition-colors border-l-2 whitespace-nowrap',
                  activeTab === 'inventory'
                    ? 'border-[#C2410C] text-[#121212]'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                )}
              >
                <Boxes className="w-3 h-3 mr-2" />
                Inventário
              </button>
              <button
                onClick={() => setActiveTab('sharing')}
                className={cn(
                  'pb-4 pl-3 text-xs font-bold uppercase tracking-widest flex items-center transition-colors border-l-2 whitespace-nowrap',
                  activeTab === 'sharing'
                    ? 'border-[#C2410C] text-[#121212]'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                )}
              >
                <Share2 className="w-3 h-3 mr-2" />
                Compartilhamentos
                <span className="ml-2 bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full text-[10px]">{sharedBatches.length}</span>
              </button>
            </div>

            {/* Left Column - Overview (Hidden on mobile when not active, visible on desktop) */}
            <div className={cn(
              'w-full md:w-1/4 border-b md:border-b-0 md:border-r border-slate-200 bg-white flex flex-col overflow-y-auto shrink-0',
              activeTab !== 'overview' ? 'hidden md:flex' : 'flex flex-1 md:flex-initial'
            )}>
              <div className="p-4 md:p-6 space-y-6 md:space-y-8">
                {/* Image */}
                <div className="aspect-square bg-slate-100 overflow-hidden relative shadow-sm">
                  {coverMedia && !isPlaceholderUrl(coverMedia.url) ? (
                    <img
                      src={coverMedia.url}
                      alt={batch.product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      <Package className="w-16 h-16" />
                    </div>
                  )}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 p-4">
                    <p className="text-white font-mono text-sm">
                      {batch.width}x{batch.height}x{batch.thickness} cm
                    </p>
                  </div>
                </div>

                {/* Global Inventory */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center">
                    <Layers className="w-3 h-3 mr-2" /> Inventário Global
                  </h3>

                  <div className="bg-[#FAFAFA] border border-slate-100 p-5 space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <span className="text-xs font-bold text-slate-500 uppercase">Total de Chapas</span>
                      <span className="font-serif text-lg text-[#121212]">{totalQuantity}</span>
                    </div>

                    <div className="w-full bg-slate-200 h-1 flex">
                      <div style={{ width: `${(soldQty / totalQuantity) * 100}%` }} className="bg-emerald-600" />
                      <div style={{ width: `${(reservedQty / totalQuantity) * 100}%` }} className="bg-amber-500" />
                      <div style={{ width: `${(availableQty / totalQuantity) * 100}%` }} className="bg-slate-400" />
                      <div style={{ width: `${(inactiveQty / totalQuantity) * 100}%` }} className="bg-slate-300" />
                    </div>

                    <div className="space-y-2 pt-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-400 uppercase tracking-wide flex items-center">
                          <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full mr-2" /> Vendidas
                        </span>
                        <span className="font-mono text-[#121212]">{soldQty}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-400 uppercase tracking-wide flex items-center">
                          <div className="w-1.5 h-1.5 bg-amber-500 mr-2" /> Reservadas
                        </span>
                        <span className="font-mono text-[#121212] font-bold">{reservedQty}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-400 uppercase tracking-wide flex items-center">
                          <div className="w-1.5 h-1.5 bg-slate-400 mr-2" /> Disponíveis
                        </span>
                        <span className="font-mono text-[#121212]">{availableQty}</span>
                      </div>
                      {inactiveQty > 0 && (
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-400 uppercase tracking-wide flex items-center">
                            <div className="w-1.5 h-1.5 bg-slate-300 mr-2" /> Inativas
                          </span>
                          <span className="font-mono text-[#121212]">{inactiveQty}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Financials */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center">
                    <DollarSign className="w-3 h-3 mr-2" /> Financeiro
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="p-3 bg-[#FAFAFA] border border-slate-100">
                      <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Preço Base</p>
                      <p className="text-lg font-serif text-[#121212] mt-1">
                        {formatPricePerUnit(batch.industryPrice, batch.priceUnit)}
                      </p>
                    </div>
                  </div>
                  {calculatedArea > 0 && (
                    <div className="p-4 bg-[#121212] text-white text-center shadow-lg">
                      <p className="text-[9px] text-[#C2410C] uppercase font-bold tracking-[0.2em]">Valor Total</p>
                      <p className="text-2xl font-serif mt-1">{formatCurrency(totalBatchValue)}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className={cn(
              'flex-1 flex flex-col overflow-hidden bg-[#FAFAFA]',
              activeTab === 'overview' ? 'hidden md:flex' : 'flex'
            )}>
              {/* Desktop Tabs */}
              <div className="hidden md:flex bg-white border-b border-slate-200 px-4 md:px-8 pt-4 md:pt-6 gap-2 md:gap-8 overflow-x-auto sticky top-0 z-10">
                <button
                  onClick={() => setActiveTab('stock')}
                  className={cn(
                    'pb-4 text-xs font-bold uppercase tracking-widest flex items-center transition-colors border-b-2 whitespace-nowrap',
                    activeTab === 'stock'
                      ? 'border-[#C2410C] text-[#121212]'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  )}
                >
                  <Settings className="w-3 h-3 mr-2" />
                  Estoque
                </button>
                <button
                  onClick={() => setActiveTab('inventory')}
                  className={cn(
                    'pb-4 text-xs font-bold uppercase tracking-widest flex items-center transition-colors border-b-2 whitespace-nowrap',
                    activeTab === 'inventory'
                      ? 'border-[#C2410C] text-[#121212]'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  )}
                >
                  <Boxes className="w-3 h-3 mr-2" />
                  Inventário
                </button>
                <button
                  onClick={() => setActiveTab('sharing')}
                  className={cn(
                    'pb-4 text-xs font-bold uppercase tracking-widest flex items-center transition-colors border-b-2 whitespace-nowrap',
                    activeTab === 'sharing'
                      ? 'border-[#C2410C] text-[#121212]'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  )}
                >
                  <Share2 className="w-3 h-3 mr-2" />
                  Compartilhamentos
                  <span className="ml-2 bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full text-[10px]">{sharedBatches.length}</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 md:p-8">
                {/* Stock Tab */}
                {activeTab === 'stock' && (
                  <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="bg-[#121212] p-4 md:p-6 flex items-start gap-5 shadow-xl">
                      <Settings className="w-6 h-6 text-[#C2410C] mt-1 flex-shrink-0" />
                      <div>
                        <h3 className="text-lg font-serif text-white">Configurações do Lote</h3>
                        <p className="text-sm text-slate-400 mt-2 font-light leading-relaxed max-w-xl">
                          Edite as informações e dimensões do lote. Gerencie fotos e visibilidade.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                      {/* Identification & Dimensions */}
                      <div className="space-y-6">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center border-b border-slate-200 pb-2">
                          <Layers className="w-3 h-3 mr-2" /> Identificação & Dimensões
                        </h4>
                        <div className="space-y-6">
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block">Código do Lote</label>
                            <input
                              type="text"
                              value={formData.batchCode}
                              onChange={(e) => setFormData({ ...formData, batchCode: e.target.value })}
                              className="w-full py-2 bg-transparent border-b border-slate-300 text-xl font-serif text-[#121212] focus:border-[#121212] outline-none transition-colors"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block">Pedreira de Origem</label>
                            <input
                              type="text"
                              value={formData.originQuarry}
                              onChange={(e) => setFormData({ ...formData, originQuarry: e.target.value })}
                              className="w-full py-2 bg-transparent border-b border-slate-300 text-base font-mono text-[#121212] focus:border-[#121212] outline-none transition-colors"
                            />
                          </div>
                          <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block">Largura (cm)</label>
                              <input
                                type="number"
                                value={formData.width}
                                onChange={(e) => setFormData({ ...formData, width: parseFloat(e.target.value) || 0 })}
                                className="w-full py-2 bg-transparent border-b border-slate-300 text-xl font-medium text-[#121212] focus:border-[#121212] outline-none transition-colors"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block">Altura (cm)</label>
                              <input
                                type="number"
                                value={formData.height}
                                onChange={(e) => setFormData({ ...formData, height: parseFloat(e.target.value) || 0 })}
                                className="w-full py-2 bg-transparent border-b border-slate-300 text-xl font-medium text-[#121212] focus:border-[#121212] outline-none transition-colors"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block">Espessura (cm)</label>
                              <input
                                type="number"
                                value={formData.thickness}
                                onChange={(e) => setFormData({ ...formData, thickness: parseFloat(e.target.value) || 0 })}
                                className="w-full py-2 bg-transparent border-b border-slate-300 text-xl font-medium text-[#121212] focus:border-[#121212] outline-none transition-colors"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block">Quantidade de Chapas</label>
                            <input
                              type="number"
                              min={soldQty + reservedQty}
                              value={formData.quantitySlabs}
                              onChange={(e) => setFormData({ ...formData, quantitySlabs: parseInt(e.target.value) || 0 })}
                              className="w-full py-2 bg-transparent border-b border-slate-300 text-xl font-serif text-[#121212] focus:border-[#121212] outline-none transition-colors"
                            />
                            {calculatedArea > 0 && (
                              <p className="text-[10px] text-slate-400 mt-1 flex items-center uppercase tracking-wider font-bold">
                                Área Total: <span className="text-[#121212] ml-1">{formatArea(calculatedArea)}</span>
                              </p>
                            )}
                          </div>
                          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-sm">
                            <div>
                              <p className="font-medium text-obsidian">Visível no catálogo público</p>
                              <p className="text-sm text-slate-500">
                                Este lote aparecerá na página pública do depósito
                              </p>
                            </div>
                            <input
                              type="checkbox"
                              checked={formData.isPublic}
                              onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                              className="w-5 h-5 rounded border-slate-300"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Pricing */}
                      <div className="space-y-6">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center border-b border-slate-200 pb-2">
                          <DollarSign className="w-3 h-3 mr-2" /> Precificação
                        </h4>
                        <div className="space-y-6">
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block">Unidade de Preço</label>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setFormData({ ...formData, priceUnit: 'M2' })}
                                className={cn(
                                  'px-4 py-2 rounded-sm font-medium transition-colors',
                                  formData.priceUnit === 'M2'
                                    ? 'bg-obsidian text-white'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                )}
                              >
                                R$/m²
                              </button>
                              <button
                                type="button"
                                onClick={() => setFormData({ ...formData, priceUnit: 'FT2' })}
                                className={cn(
                                  'px-4 py-2 rounded-sm font-medium transition-colors',
                                  formData.priceUnit === 'FT2'
                                    ? 'bg-obsidian text-white'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                )}
                              >
                                R$/ft²
                              </button>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block">
                              Preço Base ({getPriceUnitLabel(formData.priceUnit)})
                            </label>
                            <div className="relative group">
                              <MoneyInput
                                value={formData.industryPrice}
                                onChange={(val) => setFormData({ ...formData, industryPrice: val })}
                                suffix={`/${formData.priceUnit === 'M2' ? 'm²' : 'ft²'}`}
                                className="text-xl font-medium"
                              />
                            </div>
                            <p className="text-xs text-slate-500">Este é o preço de repasse para brokers</p>
                          </div>
                          {totalBatchValue > 0 && (
                            <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-sm">
                              <Package className="w-5 h-5 text-blue-600" />
                              <div>
                                <p className="text-sm font-semibold text-blue-900">
                                  Valor Total do Lote
                                </p>
                                <p className="text-2xl font-mono font-bold text-blue-700">
                                  {formatCurrency(totalBatchValue)}
                                </p>
                                <p className="text-xs text-blue-600 mt-1">
                                  {formatPricePerUnit(formData.industryPrice, formData.priceUnit)} × {formatArea(calculatedArea)}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Photos */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center border-b border-slate-200 pb-2">
                        <Upload className="w-3 h-3 mr-2" /> Fotos do Lote
                      </h4>

                      <div className="mb-6">
                        <label
                          htmlFor="file-upload"
                          className={cn(
                            'flex flex-col items-center justify-center w-full h-48',
                            'border-2 border-dashed border-slate-300 rounded-sm',
                            'cursor-pointer transition-colors',
                            'hover:border-obsidian hover:bg-slate-50',
                            orderedMediaItems.length >= 10 && 'opacity-50 cursor-not-allowed'
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
                            disabled={orderedMediaItems.length >= 10}
                            className="hidden"
                          />
                        </label>
                        <p className="text-xs text-slate-500 mt-2">
                          A primeira foto será a capa do lote
                        </p>
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
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 overflow-hidden">
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
                              <div className="aspect-[4/3] rounded-sm overflow-hidden border-2 border-blue-500 shadow-2xl opacity-90">
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
                        <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                          <GripVertical className="w-3 h-3" />
                          Arraste as fotos para reordenar. A primeira foto será a capa.
                        </p>
                      )}
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                      <button
                        onClick={onDelete}
                        className="px-6 py-3 border border-rose-500 text-rose-600 text-xs font-bold uppercase tracking-widest hover:bg-rose-50 transition-colors flex items-center"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Deletar
                      </button>
                      <button
                        onClick={handleSaveStock}
                        disabled={isSaving}
                        className="px-8 py-3 bg-[#121212] text-white text-xs font-bold uppercase tracking-widest hover:bg-[#C2410C] shadow-lg transition-all flex items-center disabled:opacity-50"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Inventory Tab */}
                {activeTab === 'inventory' && (
                  <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="bg-[#121212] p-4 md:p-6 flex items-start gap-5 shadow-xl">
                      <Boxes className="w-6 h-6 text-[#C2410C] mt-1 flex-shrink-0" />
                      <div>
                        <h3 className="text-lg font-serif text-white">Gestão de Inventário</h3>
                        <p className="text-sm text-slate-400 mt-2 font-light leading-relaxed max-w-xl">
                          Mova chapas entre diferentes status: disponível, reservado, vendido ou inativo.
                        </p>
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200 p-6 space-y-6">
                      {/* Status Overview */}
                      <div className="space-y-4">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center">
                          <Layers className="w-3 h-3 mr-2" /> Resumo do Inventário
                        </h4>
                        
                        <div className="h-4 w-full rounded-full overflow-hidden bg-slate-100 flex">
                          {availableQty > 0 && (
                            <div
                              className="bg-emerald-500"
                              style={{ width: `${(availableQty / Math.max(totalQuantity, 1)) * 100}%` }}
                            />
                          )}
                          {reservedQty > 0 && (
                            <div
                              className="bg-amber-500"
                              style={{ width: `${(reservedQty / Math.max(totalQuantity, 1)) * 100}%` }}
                            />
                          )}
                          {soldQty > 0 && (
                            <div
                              className="bg-blue-500"
                              style={{ width: `${(soldQty / Math.max(totalQuantity, 1)) * 100}%` }}
                            />
                          )}
                          {inactiveQty > 0 && (
                            <div
                              className="bg-slate-400"
                              style={{ width: `${(inactiveQty / Math.max(totalQuantity, 1)) * 100}%` }}
                            />
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div className="flex flex-col gap-1">
                            <span className="text-slate-600">Disponíveis: <span className="font-bold text-[#121212]">{availableQty}</span></span>
                            <span className="h-1.5 w-10 rounded-full bg-emerald-500" />
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-slate-600">Reservadas: <span className="font-bold text-[#121212]">{reservedQty}</span></span>
                            <span className="h-1.5 w-10 rounded-full bg-amber-500" />
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-slate-600">Vendidas: <span className="font-bold text-[#121212]">{soldQty}</span></span>
                            <span className="h-1.5 w-10 rounded-full bg-blue-500" />
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-slate-600">Inativas: <span className="font-bold text-[#121212]">{inactiveQty}</span></span>
                            <span className="h-1.5 w-10 rounded-full bg-slate-400" />
                          </div>
                        </div>
                      </div>

                      {/* Status Transfer Form */}
                      <div className="space-y-4 pt-4 border-t border-slate-200">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                          Mover Chapas
                        </h4>
                        
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block">
                            Quantidade de chapas
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={statusQuantityInput}
                            onChange={(e) => {
                              const next = e.target.value.replace(/\D/g, '');
                              setStatusQuantityInput(next);
                              setStatusUpdatedAt(null);
                            }}
                            disabled={isUpdatingStatus}
                            className="w-full py-2 bg-transparent border-b border-slate-300 text-xl font-serif text-[#121212] focus:border-[#121212] outline-none transition-colors"
                            placeholder="Digite a quantidade"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block">
                            Mover de
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {([
                              { value: 'DISPONIVEL', label: 'Disponível' },
                              { value: 'RESERVADO', label: 'Reservado' },
                              { value: 'VENDIDO', label: 'Vendido' },
                              { value: 'INATIVO', label: 'Inativo' },
                            ] as { value: BatchStatus; label: string }[]).map((option) => (
                              <button
                                key={`from-${option.value}`}
                                type="button"
                                onClick={() => setSourceStatus(option.value)}
                                className={cn(
                                  'px-4 py-2 rounded-sm text-sm font-medium transition-colors',
                                  sourceStatus === option.value
                                    ? 'bg-[#121212] text-white'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                )}
                                disabled={isUpdatingStatus}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block">
                            Para
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {([
                              { value: 'DISPONIVEL', label: 'Disponível' },
                              { value: 'RESERVADO', label: 'Reservado' },
                              { value: 'VENDIDO', label: 'Vendido' },
                              { value: 'INATIVO', label: 'Inativo' },
                            ] as { value: BatchStatus; label: string }[]).map((option) => {
                              const maxAllowed = getMaxForSource(sourceStatus);
                              const isDisabled =
                                isUpdatingStatus ||
                                sourceStatus === option.value ||
                                maxAllowed <= 0 ||
                                !isQuantityValid ||
                                parsedStatusQuantity > maxAllowed;
                              return (
                                <button
                                  key={option.value}
                                  type="button"
                                  onClick={() =>
                                    setSelectedStatus((prev) => (prev === option.value ? null : option.value))
                                  }
                                  className={cn(
                                    'px-4 py-2 rounded-sm text-sm font-medium transition-colors',
                                    selectedStatus === option.value
                                      ? 'bg-[#121212] text-white'
                                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                                    isDisabled && 'opacity-40 cursor-not-allowed'
                                  )}
                                  disabled={isDisabled}
                                >
                                  {option.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="flex items-center gap-4 pt-4">
                          <button
                            type="button"
                            onClick={handleApplyStatus}
                            disabled={
                              isUpdatingStatus ||
                              !selectedStatus ||
                              !isQuantityValid ||
                              selectedStatus === sourceStatus
                            }
                            className="px-8 py-3 bg-[#121212] text-white text-xs font-bold uppercase tracking-widest hover:bg-[#C2410C] shadow-lg transition-all flex items-center disabled:opacity-50"
                          >
                            {isUpdatingStatus ? 'Atualizando...' : 'Atualizar Status'}
                          </button>
                          {selectedStatus && (
                            <span className="text-sm text-slate-500">
                              {statusLabels[sourceStatus]} → {statusLabels[selectedStatus]}
                            </span>
                          )}
                        </div>

                        {(() => {
                          const now = Date.now();
                          const recent = statusUpdatedAt && now - statusUpdatedAt < 5000;
                          if (recent) {
                            return (
                              <p className="text-sm text-emerald-600 font-medium">✓ Status atualizado com sucesso</p>
                            );
                          }

                          if (statusQuantityInput === '') {
                            return (
                              <p className="text-xs text-slate-500">
                                Informe a quantidade de chapas e escolha o status para ajustar o estoque.
                              </p>
                            );
                          }

                          if (isQuantityValid) {
                            return (
                              <p className="text-xs text-slate-500">
                                Quantidade válida: {parsedStatusQuantity} chapas
                              </p>
                            );
                          }

                          return (
                            <p className="text-xs text-rose-600">Quantidade inválida</p>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                )}

                {/* Sharing Tab */}
                {activeTab === 'sharing' && (
                  <div className="space-y-4">
                    <div className="bg-white border border-slate-200 p-6 rounded-sm">
                      <h3 className="font-bold text-[#121212] mb-4">Compartilhar com Broker/Vendedor</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Selecionar Broker ou Vendedor
                          </label>
                          <select
                            value={selectedUserId}
                            onChange={(e) => setSelectedUserId(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-sm focus:outline-none focus:ring-2 focus:ring-obsidian/20 focus:border-obsidian"
                          >
                            <option value="">Selecione...</option>
                            {availableUsers
                              .filter((user) => !sharedBatches.some((s) => s.sharedWithUserId === user.id))
                              .map((user) => (
                                <option key={user.id} value={user.id}>
                                  {user.name} ({user.role === 'BROKER' ? 'Broker' : 'Vendedor Interno'})
                                </option>
                              ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">
                            Preço Negociado (Opcional)
                          </label>
                          <MoneyInput
                            value={negotiatedPrice}
                            onChange={setNegotiatedPrice}
                            suffix={`/${batch.priceUnit === 'M2' ? 'm²' : 'ft²'}`}
                          />
                          <p className="text-xs text-slate-500 mt-1">
                            Deixe em branco para usar o preço padrão do lote ({formatCurrency(batch.industryPrice)}/{batch.priceUnit})
                          </p>
                        </div>

                        <button
                          onClick={handleShareBatch}
                          disabled={!selectedUserId || isSharing}
                          className="w-full px-6 py-3 bg-[#121212] text-white text-xs font-bold uppercase tracking-widest hover:bg-[#C2410C] shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSharing ? 'Compartilhando...' : 'Compartilhar'}
                        </button>
                      </div>
                    </div>

                    {sharedBatches.length === 0 ? (
                      <div className="text-center py-20 text-slate-400 bg-white border border-dashed border-slate-200">
                        <p className="font-serif italic">Nenhum compartilhamento ativo</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4">
                        {sharedBatches.map((share) => {
                          const sharedUser = availableUsers.find((u) => u.id === share.sharedWithUserId);
                          return (
                            <div key={share.id} className="bg-white border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between group hover:border-[#121212] transition-colors gap-4">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 shrink-0">
                                  <span className="font-serif font-bold text-slate-400 text-lg">{sharedUser?.name?.[0]}</span>
                                </div>
                                <div>
                                  <h3 className="font-bold text-[#121212] text-sm uppercase tracking-wide">{sharedUser?.name}</h3>
                                  <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">
                                    Compartilhado em {formatDate(share.sharedAt)}
                                  </p>
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-4 md:gap-10 text-sm items-center">
                                {share.negotiatedPrice && (
                                  <div className="text-center">
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-1">Preço Negociado</p>
                                    <p className="font-serif text-base md:text-lg text-slate-700">{formatCurrency(share.negotiatedPrice)}</p>
                                  </div>
                                )}

                                <div className="w-full md:w-auto">
                                  <button
                                    onClick={() => onRemoveShare(share.id)}
                                    className="w-full md:w-auto flex items-center justify-center px-4 py-2 rounded-sm text-[10px] font-bold uppercase tracking-widest bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-all"
                                  >
                                    <Trash2 className="w-3 h-3 mr-2" />
                                    Remover Acesso
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sell Batch Modal */}
      {showSellModal && currentBatch && (
        <SellBatchModal
          batch={currentBatch}
          quantitySlabs={parsedStatusQuantity}
          sourceStatus={sourceStatus}
          isOpen={showSellModal}
          onClose={() => setShowSellModal(false)}
          onSuccess={() => {
            handleSellSuccess();
            setShowSellModal(false);
          }}
        />
      )}
    </>
  );
};
