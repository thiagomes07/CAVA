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
import { Select } from '@/components/ui/select';
import { Minus, Plus, AlertCircle, Package, Users, DollarSign } from 'lucide-react';
import { useClientes } from '@/lib/api/queries/useLeads';
import { Batch } from '@/lib/types';

interface ReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: ReservationData) => void;
  batch: Batch | null;
  isLoading?: boolean;
  maxReservation?: number;
}

export interface ReservationData {
  quantity: number;
  clienteId?: string;
  reservedPrice?: number;    // Preço indicado pelo broker (visível para admin)
  brokerSoldPrice?: number;  // Preço interno do broker (só visível para o broker)
  notes?: string;
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
  const [selectedClienteId, setSelectedClienteId] = useState<string>('');
  const [reservedPrice, setReservedPrice] = useState<string>('');
  const [brokerSoldPrice, setBrokerSoldPrice] = useState<string>('');
  const [notes, setNotes] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Buscar lista de clientes
  const { data: clientesData, isLoading: isLoadingClientes } = useClientes({ limit: 100 });
  const clientes = clientesData?.clientes ?? [];

  // Quantidade máxima permitida
  const maxQuantity = maxReservation ?? batch?.availableSlabs ?? 1;
  const minQuantity = 1;

  // Reset quando modal abre ou batch muda
  useEffect(() => {
    if (isOpen && batch) {
      setQuantity(1);
      setSelectedClienteId('');
      // Define o preço padrão como o preço do lote
      setReservedPrice(batch.industryPrice?.toString() ?? '');
      setBrokerSoldPrice('');
      setNotes('');
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
      onConfirm({
        quantity,
        clienteId: selectedClienteId || undefined,
        reservedPrice: reservedPrice ? parseFloat(reservedPrice) : undefined,
        brokerSoldPrice: brokerSoldPrice ? parseFloat(brokerSoldPrice) : undefined,
        notes: notes.trim() || undefined,
      });
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
  const areaPerSlab = (batch.height * batch.width) / 10000; // cm² para m²
  const totalArea = (areaPerSlab * quantity).toFixed(2);

  return (
    <Modal open={isOpen} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <ModalHeader>
          <ModalTitle>Reservar Chapas</ModalTitle>
          <ModalClose onClose={onClose} />
        </ModalHeader>

        <ModalContent className="space-y-6">
          {/* Informações do Lote */}
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Package className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="font-medium text-obsidian">
                  {batch.product?.name ?? 'Produto'}
                </p>
                <p className="text-sm text-slate-500">
                  Lote: {batch.batchCode}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-slate-500">Dimensões:</span>
                <span className="ml-1 font-medium">
                  {batch.height}×{batch.width}×{batch.thickness} cm
                </span>
              </div>
              <div>
                <span className="text-slate-500">Disponíveis:</span>
                <span className="ml-1 font-medium text-emerald-600">
                  {batch.availableSlabs} chapas
                </span>
              </div>
            </div>
          </div>

          {/* Seletor de Quantidade */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-700">
              Quantidade de chapas para reservar
            </label>

            <div className="flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={decrement}
                disabled={quantity <= minQuantity || isLoading}
                className="w-12 h-12 flex items-center justify-center rounded-full border-2
                         border-slate-200 hover:border-emerald-500
                         hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed
                         transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
                         border-slate-200 bg-white
                         focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200
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
                         border-slate-200 hover:border-emerald-500
                         hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed
                         transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-200"
                  style={{ width: `${(quantity / maxQuantity) * 100}%` }}
                />
              </div>
            </div>

            {/* Resumo */}
            <div className="bg-blue-50 rounded-lg p-3 mt-4">
              <p className="text-sm text-blue-800">
                <strong>Área total:</strong> {totalArea} m²
                <span className="text-blue-600 ml-1">
                  ({quantity} × {areaPerSlab.toFixed(2)} m²)
                </span>
              </p>
            </div>
          </div>

          {/* Alerta de quantidade máxima */}
          {quantity === maxQuantity && (
            <div className="flex items-center gap-2 text-amber-600 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>Você está reservando todas as chapas disponíveis</span>
            </div>
          )}

          {/* Seleção de Cliente (Opcional) */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-500" />
              <label className="text-sm font-medium text-slate-700">
                Associar a um cliente (opcional)
              </label>
            </div>
            <Select
              value={selectedClienteId}
              onChange={(e) => setSelectedClienteId(e.target.value)}
              disabled={isLoading || isLoadingClientes}
            >
              <option value="">Selecione um cliente...</option>
              {clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.name} {cliente.company ? `- ${cliente.company}` : ''}
                </option>
              ))}
            </Select>
            <p className="text-xs text-slate-400">
              Você pode associar esta reserva a um cliente do seu portfólio
            </p>
          </div>

          {/* Preços do Broker */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-700">
                Valores da Reserva
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Preço Reservado (visível para admin) */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">
                  Reservado por (R$/m²)
                </label>
                <input
                  type="number"
                  value={reservedPrice}
                  onChange={(e) => setReservedPrice(e.target.value)}
                  placeholder="0,00"
                  step="0.01"
                  min="0"
                  disabled={isLoading}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500
                           disabled:opacity-50"
                />
                <p className="text-xs text-slate-400">
                  Preço indicado ao admin
                </p>
              </div>

              {/* Preço Vendido (só para o broker) */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">
                  Vendido por (R$/m²)
                  <span className="text-slate-400 font-normal ml-1">(opcional)</span>
                </label>
                <input
                  type="number"
                  value={brokerSoldPrice}
                  onChange={(e) => setBrokerSoldPrice(e.target.value)}
                  placeholder="0,00"
                  step="0.01"
                  min="0"
                  disabled={isLoading}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500
                           disabled:opacity-50"
                />
                <p className="text-xs text-slate-400">
                  Apenas para sua dashboard
                </p>
              </div>
            </div>
          </div>

          {/* Observações (Opcional) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              Observações (opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Cliente solicitou entrega urgente..."
              rows={2}
              disabled={isLoading}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-500
                       disabled:opacity-50 resize-none"
            />
          </div>
        </ModalContent>

        <ModalFooter>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-slate-700
                     bg-slate-100 hover:bg-slate-200
                     rounded-lg transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!isQuantityValid || isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600
                     hover:bg-emerald-700 rounded-lg transition-colors
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
