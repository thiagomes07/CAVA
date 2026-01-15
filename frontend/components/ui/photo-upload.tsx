'use client';

import React, { useState, useCallback, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Upload, X, GripVertical, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { isPlaceholderUrl } from '@/lib/utils/media';

export interface MediaFile {
  id: string;
  file?: File;
  url: string;
  isNew?: boolean;
}

export interface PhotoUploadProps {
  value: MediaFile[];
  onChange: (files: MediaFile[]) => void;
  maxFiles?: number;
  maxSizeInMB?: number;
  maxTotalSizeInMB?: number;
  acceptedTypes?: string[];
  disabled?: boolean;
  error?: string;
  className?: string;
}

interface SortableImageProps {
  media: MediaFile;
  onRemove: (id: string) => void;
  disabled?: boolean;
  isFirst?: boolean;
}

function SortableImage({ media, onRemove, disabled, isFirst }: SortableImageProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: media.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative group rounded-lg overflow-hidden bg-mineral border border-obsidian/10',
        'aspect-square',
        isDragging && 'opacity-50 z-50',
        isFirst && 'ring-2 ring-obsidian'
      )}
    >
      {/* Image */}
      {isPlaceholderUrl(media.url) ? (
        <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs bg-slate-100">
          Sem foto
        </div>
      ) : (
        <img
          src={media.url}
          alt="Preview"
          className="w-full h-full object-cover"
        />
      )}

      {/* Overlay with controls */}
      <div
        className={cn(
          'absolute inset-0 bg-obsidian/60 opacity-0 group-hover:opacity-100',
          'transition-opacity flex items-center justify-center gap-2'
        )}
      >
        {/* Drag handle */}
        {!disabled && (
          <button
            type="button"
            className="p-2 bg-porcelain rounded-lg cursor-grab active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4 text-obsidian" />
          </button>
        )}

        {/* Remove button */}
        {!disabled && (
          <button
            type="button"
            onClick={() => onRemove(media.id)}
            className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* First image badge */}
      {isFirst && (
        <div className="absolute top-2 left-2 px-2 py-1 bg-obsidian text-porcelain text-xs rounded">
          Capa
        </div>
      )}

      {/* New file indicator */}
      {media.isNew && (
        <div className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full" />
      )}
    </div>
  );
}

export function PhotoUpload({
  value = [],
  onChange,
  maxFiles = 10,
  maxSizeInMB = 5,
  maxTotalSizeInMB,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'],
  disabled = false,
  error,
  className,
}: PhotoUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const validateFile = useCallback(
    (file: File): string | null => {
      if (!acceptedTypes.includes(file.type)) {
        return `Tipo não aceito: ${file.type}. Use: ${acceptedTypes.join(', ')}`;
      }
      if (file.size > maxSizeInMB * 1024 * 1024) {
        return `Arquivo muito grande: ${(file.size / 1024 / 1024).toFixed(1)}MB. Máximo: ${maxSizeInMB}MB`;
      }
      return null;
    },
    [acceptedTypes, maxSizeInMB]
  );

  const processFiles = useCallback(
    (files: FileList) => {
      if (disabled) return;

      setLocalError(null);
      const currentCount = value.length;
      const availableSlots = maxFiles - currentCount;

      if (availableSlots <= 0) {
        setLocalError(`Máximo de ${maxFiles} imagens atingido`);
        return;
      }

      const totalSizeLimit = (maxTotalSizeInMB ?? maxFiles * maxSizeInMB) * 1024 * 1024;
      const existingTotalSize = value.reduce((acc, media) => acc + (media.file?.size || 0), 0);

      const newFiles: MediaFile[] = [];
      const errors: string[] = [];

      Array.from(files)
        .slice(0, availableSlots)
        .forEach((file) => {
          const isDuplicate = value.some((m) => m.file?.name === file.name && m.file.size === file.size);
          if (isDuplicate) {
            errors.push(`${file.name}: já foi adicionado`);
            return;
          }

          const validationError = validateFile(file);
          if (validationError) {
            errors.push(`${file.name}: ${validationError}`);
          } else {
            const projectedTotal = existingTotalSize + newFiles.reduce((acc, m) => acc + (m.file?.size || 0), 0) + file.size;
            if (projectedTotal > totalSizeLimit) {
              errors.push(`${file.name}: ultrapassa o limite total de ${(totalSizeLimit / 1024 / 1024).toFixed(0)}MB`);
              return;
            }

            newFiles.push({
              id: `new-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
              file,
              url: URL.createObjectURL(file),
              isNew: true,
            });
          }
        });

      if (errors.length > 0) {
        setLocalError(errors.join('. '));
      }

      if (newFiles.length > 0) {
        onChange([...value, ...newFiles]);
      }
    },
    [value, onChange, maxFiles, disabled, validateFile]
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files);
      }
    },
    [processFiles]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        processFiles(e.target.files);
      }
      // Reset input to allow selecting the same file again
      e.target.value = '';
    },
    [processFiles]
  );

  const handleRemove = useCallback(
    (id: string) => {
      const media = value.find((m) => m.id === id);
      if (media?.isNew && media.url.startsWith('blob:')) {
        URL.revokeObjectURL(media.url);
      }
      onChange(value.filter((m) => m.id !== id));
    },
    [value, onChange]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const oldIndex = value.findIndex((m) => m.id === active.id);
        const newIndex = value.findIndex((m) => m.id === over.id);
        onChange(arrayMove(value, oldIndex, newIndex));
      }
    },
    [value, onChange]
  );

  const displayError = error || localError;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Drop zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-lg p-8',
          'flex flex-col items-center justify-center gap-3',
          'cursor-pointer transition-colors',
          dragActive
            ? 'border-obsidian bg-mineral'
            : 'border-obsidian/20 hover:border-obsidian/40',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <div
          className={cn(
            'w-12 h-12 rounded-full flex items-center justify-center',
            'bg-mineral'
          )}
        >
          <Upload className="h-6 w-6 text-obsidian/60" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-obsidian">
            Arraste imagens ou clique para selecionar
          </p>
          <p className="text-xs text-obsidian/60 mt-1">
            PNG, JPG ou WebP • Máx. {maxSizeInMB}MB por arquivo • Até {maxFiles} imagens
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={acceptedTypes.join(',')}
          multiple
          onChange={handleChange}
          disabled={disabled}
          className="hidden"
        />
      </div>

      {/* Error message */}
      {displayError && (
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{displayError}</span>
        </div>
      )}

      {/* Image grid with drag and drop */}
      {value.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={value.map((m) => m.id)}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {value.map((media, index) => (
                <SortableImage
                  key={media.id}
                  media={media}
                  onRemove={handleRemove}
                  disabled={disabled}
                  isFirst={index === 0}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Empty state */}
      {value.length === 0 && (
        <div className="flex items-center justify-center gap-2 text-obsidian/40 py-4">
          <ImageIcon className="h-5 w-5" />
          <span className="text-sm">Nenhuma imagem adicionada</span>
        </div>
      )}

      {/* Counter */}
      {value.length > 0 && (
        <p className="text-xs text-obsidian/60 text-right">
          {value.length} de {maxFiles} imagens
        </p>
      )}
    </div>
  );
}
