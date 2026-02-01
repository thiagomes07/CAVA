'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Minus, Plus, AlertTriangle, Package, Users, DollarSign } from 'lucide-react';
import { useClientes } from '@/lib/api/queries/useLeads';
import { Batch, PriceUnit } from '@/lib/types';
import { cn } from '@/lib/utils/cn';
import { MoneyInput } from '@/components/ui/masked-input';
import { calculateSlabPrice, getSlabAreaM2 } from '@/lib/utils/priceConversion';
import { formatCurrency } from '@/lib/utils/formatCurrency';

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
  const [brokerPriceType, setBrokerPriceType] = useState<'M2' | 'SLAB'>('M2');
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
      setBrokerPriceType('M2');
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
    if (quantity >= minQuantity && quantity <= maxQuantity && batch) {
      // Se o broker digitou preço por chapa, converter para preço por m²
      let finalBrokerSoldPrice = brokerSoldPrice;
      if (brokerSoldPrice && brokerSoldPrice > 0 && brokerPriceType === 'SLAB') {
        const slabArea = getSlabAreaM2(batch.height, batch.width);
        if (slabArea > 0) {
          finalBrokerSoldPrice = brokerSoldPrice / slabArea;
        }
      }
      
      onConfirm({
        quantity,
        clienteId: selectedClienteId || undefined,
        reservedPrice: reservedPrice && reservedPrice > 0 ? reservedPrice : undefined,
        brokerSoldPrice: finalBrokerSoldPrice && finalBrokerSoldPrice > 0 ? finalBrokerSoldPrice : undefined,
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
      <div className="bg-white w-full max-w-4xl overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh]">
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
                <div className="flex items-start gap-3 mt-4 p-3 bg-slate-100 border border-slate-200">
                  <AlertTriangle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-700">
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
              
              <div className="grid grid-cols-2 gap-6">
                {/* Reserved Price */}
                <div className="p-4 bg-white border border-slate-200 rounded-sm">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-medium text-slate-700">
                      Reservado por
                    </label>
                    <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                      R$/m²
                    </span>
                  </div>
                  <MoneyInput
                    value={reservedPrice}
                    onChange={setReservedPrice}
                    suffix="/m²"
                    disabled={isLoading}
                  />
                  <p className="text-[10px] text-slate-400 mt-2">
                    Preço indicado ao admin
                  </p>
                </div>

                {/* Broker Sold Price with Toggle */}
                <div className="p-4 bg-white border border-slate-200 rounded-sm">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-medium text-slate-700">
                      Vendido por
                    </label>
                    <div className="flex items-center gap-0.5 bg-slate-100 rounded p-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          if (brokerPriceType !== 'M2' && brokerSoldPrice && batch) {
                            const slabArea = getSlabAreaM2(batch.height, batch.width);
                            if (slabArea > 0) {
                              setBrokerSoldPrice(brokerSoldPrice / slabArea);
                            }
                          }
                          setBrokerPriceType('M2');
                        }}
                        className={cn(
                          "px-2.5 py-1 text-[10px] font-medium rounded transition-colors",
                          brokerPriceType === 'M2' 
                            ? "bg-white text-obsidian shadow-sm" 
                            : "text-slate-500 hover:text-slate-700"
                        )}
                      >
                        R$/m²
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (brokerPriceType !== 'SLAB' && brokerSoldPrice && batch) {
                            const slabPrice = calculateSlabPrice(
                              batch.height,
                              batch.width,
                              brokerSoldPrice,
                              (batch.priceUnit || 'M2') as PriceUnit
                            );
                            setBrokerSoldPrice(slabPrice);
                          }
                          setBrokerPriceType('SLAB');
                        }}
                        className={cn(
                          "px-2.5 py-1 text-[10px] font-medium rounded transition-colors",
                          brokerPriceType === 'SLAB' 
                            ? "bg-white text-obsidian shadow-sm" 
                            : "text-slate-500 hover:text-slate-700"
                        )}
                      >
                        R$/chapa
                      </button>
                    </div>
                  </div>
                  <MoneyInput
                    value={brokerSoldPrice}
                    onChange={setBrokerSoldPrice}
                    suffix={brokerPriceType === 'M2' ? '/m²' : '/chapa'}
                    disabled={isLoading}
                  />
                  <p className="text-[10px] text-slate-400 mt-2">
                    Apenas para sua dashboard
                  </p>
                </div>
              </div>

              {/* Price Summary Preview - Unified */}
              <div className="mt-4">
              {(() => {
                const slabArea = getSlabAreaM2(batch.height, batch.width);
                
                // Reservado
                const reservedPriceM2 = reservedPrice || batch.industryPrice || 0;
                const reservedPricePerSlab = calculateSlabPrice(
                  batch.height,
                  batch.width,
                  reservedPriceM2,
                  (batch.priceUnit || 'M2') as PriceUnit
                );
                const reservedTotal = reservedPricePerSlab * quantity;
                
                // Vendido
                let soldPricePerSlab = 0;
                let soldTotal = 0;
                if (brokerSoldPrice && brokerSoldPrice > 0) {
                  if (brokerPriceType === 'M2') {
                    soldPricePerSlab = calculateSlabPrice(
                      batch.height,
                      batch.width,
                      brokerSoldPrice,
                      (batch.priceUnit || 'M2') as PriceUnit
                    );
                  } else {
                    soldPricePerSlab = brokerSoldPrice;
                  }
                  soldTotal = soldPricePerSlab * quantity;
                }
                
                return (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-sm">
                    <div className="grid grid-cols-2 gap-6">
                      {/* Reservado */}
                      <div className="text-center p-3 bg-white rounded-sm border border-slate-100">
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-3">
                          Reservado (Admin)
                        </p>
                        <div className="flex items-center justify-center gap-6">
                          <div className="min-w-[80px]">
                            <p className="text-[10px] text-slate-400 mb-1">Chapa</p>
                            <p className="font-serif text-lg font-semibold text-obsidian">
                              {formatCurrency(reservedPricePerSlab)}
                            </p>
                          </div>
                          <div className="text-slate-200">|</div>
                          <div className="min-w-[100px]">
                            <p className="text-[10px] text-slate-400 mb-1">Total ({quantity}x)</p>
                            <p className="font-serif text-xl font-bold text-emerald-600">
                              {formatCurrency(reservedTotal)}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Vendido */}
                      <div className="text-center p-3 bg-white rounded-sm border border-slate-100">
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-3">
                          Vendido (Sua Dashboard)
                        </p>
                        {brokerSoldPrice && brokerSoldPrice > 0 ? (
                          <div className="flex items-center justify-center gap-6">
                            <div className="min-w-[80px]">
                              <p className="text-[10px] text-slate-400 mb-1">Chapa</p>
                              <p className="font-serif text-lg font-semibold text-obsidian">
                                {formatCurrency(soldPricePerSlab)}
                              </p>
                            </div>
                            <div className="text-slate-200">|</div>
                            <div className="min-w-[100px]">
                              <p className="text-[10px] text-slate-400 mb-1">Total ({quantity}x)</p>
                              <p className="font-serif text-xl font-bold text-emerald-600">
                                {formatCurrency(soldTotal)}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-6 h-[52px]">
                            <p className="text-sm text-slate-400 italic">Não informado</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-[10px] text-slate-400 text-center mt-3">
                      Área por chapa: {slabArea.toFixed(2)} m²
                    </p>
                  </div>
                );
              })()}
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
