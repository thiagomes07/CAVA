'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Minus, Plus, AlertTriangle, Package, Users, DollarSign } from 'lucide-react';
import { useClientes } from '@/lib/api/queries/useLeads';
import { Batch } from '@/lib/types';
import { cn } from '@/lib/utils/cn';
import { MoneyInput } from '@/components/ui/masked-input';

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
  const [reservedPrice, setReservedPrice] = useState<number | undefined>(undefined);
  const [brokerSoldPrice, setBrokerSoldPrice] = useState<number | undefined>(undefined);
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
      setReservedPrice(batch.industryPrice ?? undefined);
      setBrokerSoldPrice(undefined);
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
        reservedPrice: reservedPrice && reservedPrice > 0 ? reservedPrice : undefined,
        brokerSoldPrice: brokerSoldPrice && brokerSoldPrice > 0 ? brokerSoldPrice : undefined,
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

  if (!isOpen || !batch) return null;

  const isQuantityValid = quantity >= minQuantity && quantity <= maxQuantity;
  const areaPerSlab = (batch.height * batch.width) / 10000; // cm² para m²
  const totalArea = (areaPerSlab * quantity).toFixed(2);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 bg-[#121212] text-white flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-serif text-xl">Reservar Chapas</h2>
            <p className="text-xs text-white/50 mt-0.5">Selecione a quantidade e dados da reserva</p>
          </div>
          <button 
            onClick={onClose}
            disabled={isLoading}
            className="p-2 -mr-2 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="h-1 bg-emerald-500 shrink-0" />

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="px-6 py-6 space-y-6 overflow-y-auto flex-1">
            {/* Batch Info Summary */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 border border-slate-200">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Produto</p>
                <p className="font-serif text-sm text-[#121212] truncate">{batch.product?.name ?? 'Produto'}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Lote</p>
                <p className="font-mono text-sm text-[#121212]">{batch.batchCode}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Disponíveis</p>
                <p className="font-serif text-sm text-emerald-600 font-medium">{batch.availableSlabs} chapas</p>
              </div>
            </div>

            {/* Quantity Selector */}
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-3">
                <Package className="w-3.5 h-3.5 inline mr-1.5" />
                Quantidade de Chapas
              </label>
              
              <div className="flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={decrement}
                  disabled={quantity <= minQuantity || isLoading}
                  className="w-12 h-12 flex items-center justify-center border-2
                           border-slate-200 hover:border-emerald-500
                           hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed
                           transition-colors focus:outline-none focus:border-emerald-500"
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
                  className="w-24 h-14 text-center text-2xl font-serif font-medium border-2
                           border-slate-200 bg-white
                           focus:border-emerald-500 focus:outline-none
                           disabled:opacity-50 transition-colors
                           [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none
                           [&::-webkit-inner-spin-button]:appearance-none"
                  aria-label="Quantidade de chapas"
                />

                <button
                  type="button"
                  onClick={increment}
                  disabled={quantity >= maxQuantity || isLoading}
                  className="w-12 h-12 flex items-center justify-center border-2
                           border-slate-200 hover:border-emerald-500
                           hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed
                           transition-colors focus:outline-none focus:border-emerald-500"
                  aria-label="Aumentar quantidade"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              {/* Progress Bar */}
              <div className="mt-4">
                <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">
                  <span>1</span>
                  <span>{maxQuantity}</span>
                </div>
                <div className="h-1.5 bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-200"
                    style={{ width: `${(quantity / maxQuantity) * 100}%` }}
                  />
                </div>
              </div>

              {/* Area Summary */}
              <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200">
                <p className="text-sm text-emerald-800">
                  <strong>Área total:</strong> {totalArea} m²
                  <span className="text-emerald-600 ml-1">
                    ({quantity} × {areaPerSlab.toFixed(2)} m²)
                  </span>
                </p>
              </div>

              {/* Max Warning */}
              {quantity === maxQuantity && (
                <div className="flex items-start gap-3 mt-4 p-3 bg-amber-50 border border-amber-200">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800">
                    Você está reservando todas as chapas disponíveis
                  </p>
                </div>
              )}
            </div>

            {/* Client Selection */}
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-2">
                <Users className="w-3.5 h-3.5 inline mr-1.5" />
                Associar a um Cliente (opcional)
              </label>
              <select
                value={selectedClienteId}
                onChange={(e) => setSelectedClienteId(e.target.value)}
                disabled={isLoading || isLoadingClientes}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 
                         focus:border-emerald-500 focus:bg-white outline-none text-sm transition-colors"
              >
                <option value="">Selecione um cliente...</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.name} {cliente.company ? `- ${cliente.company}` : ''}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 mt-1.5">
                Associe esta reserva a um cliente do seu portfólio
              </p>
            </div>

            {/* Prices */}
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-3">
                <DollarSign className="w-3.5 h-3.5 inline mr-1.5" />
                Valores da Reserva
              </label>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Reserved Price */}
                <MoneyInput
                  label="Reservado por (R$/m²)"
                  value={reservedPrice}
                  onChange={setReservedPrice}
                  suffix="/m²"
                  disabled={isLoading}
                  helperText="Preço indicado ao admin"
                />

                {/* Broker Sold Price */}
                <MoneyInput
                  label="Vendido por (R$/m²)"
                  value={brokerSoldPrice}
                  onChange={setBrokerSoldPrice}
                  suffix="/m²"
                  disabled={isLoading}
                  helperText="Apenas para sua dashboard"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-2">
                Observações (opcional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Cliente solicitou entrega urgente..."
                rows={2}
                disabled={isLoading}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 
                         focus:border-emerald-500 focus:bg-white outline-none text-sm transition-colors resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-5 py-2.5 text-slate-600 text-sm font-medium hover:text-[#121212] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!isQuantityValid || isLoading}
              className={cn(
                "px-5 py-2.5 text-sm font-medium text-white transition-colors flex items-center gap-2",
                "bg-emerald-600 hover:bg-emerald-700",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
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
          </div>
        </form>
      </div>
    </div>
  );
}

export default ReservationModal;
