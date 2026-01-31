'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, X, ZoomIn, ZoomOut, Image as ImageIcon, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button';

interface ImageUploadWithCropProps {
    previewUrl?: string;
    onChange: (file: File) => void;
    onRemove: () => void;
    isUploading?: boolean;
    aspectRatio?: number; // Default 1:1
    maxSizeInMB?: number;
    className?: string;
}

export function ImageUploadWithCrop({
    previewUrl,
    onChange,
    onRemove,
    isUploading = false,
    aspectRatio = 1,
    maxSizeInMB = 2,
    className,
}: ImageUploadWithCropProps) {
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // Crop State
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [startPan, setStartPan] = useState({ x: 0, y: 0 });

    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Initial load cleanup or reset
    useEffect(() => {
        if (!previewUrl) {
            setSelectedImage(null);
            setIsEditing(false);
        }
    }, [previewUrl]);

    const handleFileSelect = (file: File) => {
        if (file.size > 10 * 1024 * 1024) { // Allow up to 10MB input for cropping
            alert(`Arquivo muito grande para edição. Máximo: 10MB`);
            return;
        }

        if (!file.type.startsWith('image/')) {
            alert('Apenas imagens são permitidas');
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            setSelectedImage(reader.result as string);
            setIsEditing(true);
            setZoom(1);
            setPan({ x: 0, y: 0 });
        };
        reader.readAsDataURL(file);
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleFileSelect(file);
    }, []);

    // Panning Logic
    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsPanning(true);
        setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isPanning) return;
        e.preventDefault();
        const newX = e.clientX - startPan.x;
        const newY = e.clientY - startPan.y;
        setPan({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
        setIsPanning(false);
    };

    // Crop Generation - CORRIGIDO
    const handleConfirmCrop = async () => {
        if (!imageRef.current || !containerRef.current) return;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set output resolution (600x600 for high quality)
        const outputSize = 600;
        canvas.width = outputSize;
        canvas.height = outputSize / aspectRatio;

        const image = imageRef.current;
        const container = containerRef.current;

        // Get natural image dimensions
        const naturalWidth = image.naturalWidth;
        const naturalHeight = image.naturalHeight;

        // Get container dimensions
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;

        // Calculate how the image is displayed in the container (object-fit: cover behavior)
        const imageAspect = naturalWidth / naturalHeight;
        const containerAspect = containerWidth / containerHeight;

        // Calculate the rendered size of the image in the container
        let renderedWidth: number;
        let renderedHeight: number;

        if (imageAspect > containerAspect) {
            // Image is wider - fit to height
            renderedHeight = containerHeight;
            renderedWidth = naturalWidth * (containerHeight / naturalHeight);
        } else {
            // Image is taller - fit to width
            renderedWidth = containerWidth;
            renderedHeight = naturalHeight * (containerWidth / naturalWidth);
        }

        // Calculate the scale from rendered pixels to natural pixels
        const scaleToNatural = naturalWidth / renderedWidth;

        // Apply zoom to the rendered dimensions
        const zoomedWidth = renderedWidth * zoom;
        const zoomedHeight = renderedHeight * zoom;

        // Calculate the offset of the zoomed image center from container center (in rendered pixels)
        // The image is centered, then translated by pan
        const imageCenterX = containerWidth / 2 + pan.x;
        const imageCenterY = containerHeight / 2 + pan.y;

        // Calculate the top-left corner of the zoomed image (in rendered pixels)
        const imageLeft = imageCenterX - (zoomedWidth / 2);
        const imageTop = imageCenterY - (zoomedHeight / 2);

        // The visible crop area is the container bounds
        // Calculate what portion of the zoomed image is visible
        const cropLeft = -imageLeft; // in rendered pixels of the zoomed image
        const cropTop = -imageTop;
        const cropWidth = containerWidth;
        const cropHeight = containerHeight;

        // Convert crop coordinates from rendered zoomed pixels to natural image pixels
        // First, account for zoom: divide by zoom to get pre-zoom rendered coordinates
        const preZoomCropLeft = cropLeft / zoom;
        const preZoomCropTop = cropTop / zoom;
        const preZoomCropWidth = cropWidth / zoom;
        const preZoomCropHeight = cropHeight / zoom;

        // Then convert from rendered pixels to natural pixels
        const naturalCropX = preZoomCropLeft * scaleToNatural;
        const naturalCropY = preZoomCropTop * scaleToNatural;
        const naturalCropWidth = preZoomCropWidth * scaleToNatural;
        const naturalCropHeight = preZoomCropHeight * scaleToNatural;

        // Draw the cropped portion to canvas
        ctx.drawImage(
            image,
            naturalCropX,
            naturalCropY,
            naturalCropWidth,
            naturalCropHeight,
            0,
            0,
            outputSize,
            outputSize / aspectRatio
        );

        canvas.toBlob((blob) => {
            if (blob) {
                const newFile = new File([blob], "logo-cropped.jpg", { type: 'image/jpeg' });
                onChange(newFile);
                setIsEditing(false);
                setSelectedImage(URL.createObjectURL(blob));
            }
        }, 'image/jpeg', 0.95);
    };

    const handleCancelCrop = () => {
        setIsEditing(false);
        setSelectedImage(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    if (isEditing && selectedImage) {
        return (
            <div className={cn("relative w-full rounded-xl overflow-hidden bg-slate-900 border-2 border-slate-200", className)}>
                <div
                    ref={containerRef}
                    className="relative w-full aspect-square overflow-hidden cursor-move touch-none"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        ref={imageRef}
                        src={selectedImage}
                        alt="Crop Preview"
                        className="max-w-none absolute top-1/2 left-1/2 origin-center select-none"
                        style={{
                            transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                            // Simular object-fit: cover
                            height: imageRef.current && (imageRef.current.naturalWidth / imageRef.current.naturalHeight > 1) ? '100%' : 'auto',
                            width: imageRef.current && (imageRef.current.naturalWidth / imageRef.current.naturalHeight <= 1) ? '100%' : 'auto',
                            minHeight: '100%',
                            minWidth: '100%'
                        }}
                        onDragStart={(e) => e.preventDefault()}
                    />

                    {/* Overlay Grid (Rule of Thirds) */}
                    <div className="absolute inset-0 pointer-events-none opacity-30">
                        <div className="w-full h-1/3 border-b border-white"></div>
                        <div className="w-full h-1/3 border-b border-white top-1/3 absolute"></div>
                        <div className="h-full w-1/3 border-r border-white absolute top-0 left-0"></div>
                        <div className="h-full w-1/3 border-r border-white absolute top-0 left-1/3"></div>
                    </div>
                </div>

                {/* Controls */}
                <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur rounded-lg p-3 flex flex-col gap-3 shadow-lg">
                    <div className="flex items-center gap-2">
                        <ZoomOut className="h-4 w-4 text-slate-500" />
                        <input
                            type="range"
                            min="1"
                            max="3"
                            step="0.05"
                            value={zoom}
                            onChange={(e) => setZoom(parseFloat(e.target.value))}
                            className="flex-1 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-obsidian"
                        />
                        <ZoomIn className="h-4 w-4 text-slate-500" />
                    </div>
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="flex-1"
                            onClick={handleCancelCrop}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            className="flex-1"
                            onClick={handleConfirmCrop}
                        >
                            <Check className="w-4 h-4 mr-1" /> Confirmar
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // View Mode (Standard)
    const currentImage = selectedImage || previewUrl;

    return (
        <div className={cn('space-y-3', className)}>
            {currentImage ? (
                <div className="relative group">
                    <div
                        className="relative w-full aspect-square rounded-xl overflow-hidden bg-slate-50 border-2 border-slate-200"
                        style={{ aspectRatio }}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={currentImage}
                            alt="Logo"
                            className="w-full h-full object-cover"
                        />

                        {isUploading && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                                <Loader2 className="h-8 w-8 animate-spin text-white" />
                            </div>
                        )}

                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                            <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                disabled={isUploading}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRemove();
                                    setSelectedImage(null);
                                    if (fileInputRef.current) fileInputRef.current.value = '';
                                }}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            ) : (
                // Upload Prompt
                <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                        'relative w-full aspect-square rounded-xl border-2 border-dashed transition-all cursor-pointer',
                        'flex flex-col items-center justify-center gap-3',
                        'hover:border-gold-500 hover:bg-gold-50/50',
                        isDragging ? 'border-gold-500 bg-gold-50' : 'border-slate-300 bg-slate-50',
                        isUploading && 'pointer-events-none opacity-50'
                    )}
                    style={{ aspectRatio }}
                >
                    <div className="p-4 rounded-full bg-gold-100">
                        <ImageIcon className="h-8 w-8 text-gold-600" />
                    </div>
                    <div className="text-center px-4">
                        <p className="text-sm font-medium text-slate-700">
                            Clique ou arraste para enviar
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                            PNG, JPG ou WEBP
                        </p>
                    </div>
                    <Upload className="h-5 w-5 text-slate-400" />

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                        className="hidden"
                    />
                </div>
            )}
        </div>
    );
}