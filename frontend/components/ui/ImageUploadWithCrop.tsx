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

    // Crop Generation
    const handleConfirmCrop = async () => {
        if (!imageRef.current || !containerRef.current) return;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set output resolution (e.g., 600x600 for high quality avatar)
        const size = 600;
        canvas.width = size;
        canvas.height = size / aspectRatio;

        // Draw logic
        const image = imageRef.current;
        const scale = zoom;

        // Calculate the relative position of the image in the container
        // Formula: (ImageDimension * Scale) 
        // We need to map the container center to the canvas center
        // But simpler: draw the image with the transforms applied

        // We need to calculate which part of the image is visible in the square container
        // The container is "window" into the image
        // 1. Image Natural Dimensions
        const naturalWidth = image.naturalWidth;
        const naturalHeight = image.naturalHeight;

        // 2. Rendered Dimensions (in the container before zoom)
        // Checks how updateStyles fits the image (object-cover vs custom math)
        // Here we are doing custom math with transform
        // Let's rely on the ratio of "rendered pixels" to "natural pixels"

        // Simpler approach: Draw image on canvas using the same transform logic
        // Center the context
        ctx.translate(size / 2, (size / aspectRatio) / 2);
        ctx.scale(scale, scale);
        ctx.translate(pan.x / containerRef.current.clientWidth * size, pan.y / containerRef.current.clientHeight * size);

        // We need to know the base scale that "fits" the image to the container "cover" style
        const containerAspect = 1; // Square container
        const imageAspect = naturalWidth / naturalHeight;

        let drawWidth, drawHeight;

        if (imageAspect > containerAspect) {
            // Image is wider, height matches container
            drawHeight = size;
            drawWidth = size * imageAspect;
        } else {
            // Image is taller, width matches container
            drawWidth = size;
            drawHeight = size / imageAspect;
        }

        // Center image drawing
        ctx.drawImage(
            image,
            -drawWidth / 2,
            -drawHeight / 2,
            drawWidth,
            drawHeight
        );

        canvas.toBlob((blob) => {
            if (blob) {
                const newFile = new File([blob], "logo-cropped.jpg", { type: 'image/jpeg' });
                onChange(newFile);
                setIsEditing(false);
                setSelectedImage(URL.createObjectURL(blob)); // Show the cropped result properly
            }
        }, 'image/jpeg', 0.9);
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
                            // Initial size logic to behave like 'cover'
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
