'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalContent,
  ModalFooter,
  ModalClose,
} from '@/components/ui/modal';
import { Minus, Plus, AlertCircle, Package } from 'lucide-react';
import { Batch } from '@/lib/types';

interface ReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (quantity: number) => void;
  batch: Batch | null;
  isLoading?: boolean;
  maxReservation?: number;
}

/**
 * Modal para seleção de quantidade de chapas para reserva
 * Implementa validação de quantidade disponível e feedback visual
 */
export function ReservationModal({
  isOpen,
  onClose,
  onConfirm,
  batch,
  isLoading = false,
  maxReservation,
}: ReservationModalProps) {
  const [quantity, setQuantity] = useState(1);
  const inputRef = useRef<HTMLInputElement>(null);

  // Quantidade máxima permitida
  const maxQuantity = maxReservation ?? batch?.availableSlabs ?? 1;
  const minQuantity = 1;

  // Reset quantity quando modal abre ou batch muda
  useEffect(() => {
    if (isOpen && batch) {
      setQuantity(1);
      // Focar no input após abertura
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, batch?.id]);

  // Handlers de ajuste de quantidade
  const increment = () => {
    if (quantity < maxQuantity) {
      setQuantity((prev) => prev + 1);
    }
  };

  const decrement = () => {
    if (quantity > minQuantity) {
      setQuantity((prev) => prev - 1);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value)) {
      setQuantity(Math.min(Math.max(value, minQuantity), maxQuantity));
    } else if (e.target.value === '') {
      setQuantity(minQuantity);
    }
  };

  const handleBlur = () => {
    if (quantity < minQuantity) setQuantity(minQuantity);
    if (quantity > maxQuantity) setQuantity(maxQuantity);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity >= minQuantity && quantity <= maxQuantity) {
      onConfirm(quantity);
    }
  };

  // Atalhos de teclado
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      increment();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      decrement();
    }
  };

  if (!batch) return null;

  const isQuantityValid = quantity >= minQuantity && quantity <= maxQuantity;
  const areaPerSlab = batch.height * batch.width;
  const totalArea = (areaPerSlab * quantity).toFixed(2);

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <ModalHeader>
          <ModalTitle>Reservar Chapas</ModalTitle>
          <ModalClose onClick={onClose} />
        </ModalHeader>

        <ModalContent className="space-y-6">
          {/* Informações do Lote */}
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-slate-900 dark:text-white">
                  {batch.product?.name ?? 'Produto'}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Lote: {batch.batchCode}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-slate-500 dark:text-slate-400">Dimensões:</span>
                <span className="ml-1 font-medium">
                  {batch.height}×{batch.width}×{batch.thickness} cm
                </span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">Disponíveis:</span>
                <span className="ml-1 font-medium text-green-600 dark:text-green-400">
                  {batch.availableSlabs} chapas
                </span>
              </div>
            </div>
          </div>

          {/* Seletor de Quantidade */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Quantidade de chapas para reservar
            </label>

            <div className="flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={decrement}
                disabled={quantity <= minQuantity || isLoading}
                className="w-12 h-12 flex items-center justify-center rounded-full border-2 
                         border-slate-200 dark:border-slate-600 hover:border-primary 
                         hover:bg-primary/5 disabled:opacity-50 disabled:cursor-not-allowed
                         transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label="Diminuir quantidade"
              >
                <Minus className="w-5 h-5" />
              </button>

              <input
                ref={inputRef}
                type="number"
                value={quantity}
                onChange={handleInputChange}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                min={minQuantity}
                max={maxQuantity}
                disabled={isLoading}
                className="w-24 h-14 text-center text-2xl font-bold rounded-lg border-2
                         border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700
                         focus:border-primary focus:ring-2 focus:ring-primary/20 
                         disabled:opacity-50 transition-colors
                         [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none 
                         [&::-webkit-inner-spin-button]:appearance-none"
                aria-label="Quantidade de chapas"
              />

              <button
                type="button"
                onClick={increment}
                disabled={quantity >= maxQuantity || isLoading}
                className="w-12 h-12 flex items-center justify-center rounded-full border-2 
                         border-slate-200 dark:border-slate-600 hover:border-primary 
                         hover:bg-primary/5 disabled:opacity-50 disabled:cursor-not-allowed
                         transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label="Aumentar quantidade"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {/* Barra de progresso visual */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>1</span>
                <span>{maxQuantity}</span>
              </div>
              <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-200"
                  style={{ width: `${(quantity / maxQuantity) * 100}%` }}
                />
              </div>
            </div>

            {/* Resumo */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 mt-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Área total:</strong> {totalArea} m² 
                <span className="text-blue-600 dark:text-blue-300 ml-1">
                  ({quantity} × {areaPerSlab.toFixed(2)} m²)
                </span>
              </p>
            </div>
          </div>

          {/* Alerta de quantidade máxima */}
          {quantity === maxQuantity && (
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>Você está reservando todas as chapas disponíveis</span>
            </div>
          )}
        </ModalContent>

        <ModalFooter>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300
                     bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600
                     rounded-lg transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!isQuantityValid || isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-primary 
                     hover:bg-primary/90 rounded-lg transition-colors 
                     disabled:opacity-50 disabled:cursor-not-allowed
                     flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Reservando...
              </>
            ) : (
              `Reservar ${quantity} chapa${quantity > 1 ? 's' : ''}`
            )}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

export default ReservationModal;
