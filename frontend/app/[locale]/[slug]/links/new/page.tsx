'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, Search, Package, Copy, Link2, Eye, EyeOff, X, ExternalLink, Plus, Minus, Trash2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { Modal, ModalHeader, ModalTitle, ModalContent, ModalFooter, ModalClose } from '@/components/ui/modal';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/lib/hooks/useToast';
import { useAuth } from '@/lib/hooks/useAuth';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { MoneyInput } from '@/components/ui/masked-input';
import { formatArea } from '@/lib/utils/formatDimensions';
import { nanoid } from 'nanoid';
import { QRCodeCanvas } from 'qrcode.react';
import type { Batch, CurrencyCode, LinkType, SharedInventoryBatch } from '@/lib/types';
import { cn } from '@/lib/utils/cn';
import { isPlaceholderUrl } from '@/lib/utils/media';
import { useLocale } from 'next-intl';
import { format, addDays } from 'date-fns';

type WizardStep = 'content' | 'config';

// Item selecionado com quantidade e preço
interface SelectedItem {
  batch: Batch;
  quantity: number;
  unitPrice: number;
}

export default function CreateSalesLinkPage() {
  const locale = useLocale();
  const router = useRouter();
  const { success, error } = useToast();
  const { user, isBroker } = useAuth();

  const [currentStep, setCurrentStep] = useState<WizardStep>('content');
  const [availableBatches, setAvailableBatches] = useState<Batch[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string>('');
  const [expirationDate, setExpirationDate] = useState<Date | undefined>(undefined);

  // Multiple items selection
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);

  // Link config
  const [showPrice, setShowPrice] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [title, setTitle] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [displayCurrency, setDisplayCurrency] = useState<CurrencyCode>('BRL');
  const [usdBrlRate, setUsdBrlRate] = useState<number | null>(null);

  // Generate slug once on mount
  const [generatedSlug] = useState(() => nanoid(10).toLowerCase());

  const pricePrefix = displayCurrency === 'USD' ? 'US$' : 'R$';
  const toCents = (value: number) => Math.round(value * 100);
  const convertPrice = (value: number, from: CurrencyCode, to: CurrencyCode) => {
    if (from === to) return value;
    if (!usdBrlRate || usdBrlRate <= 0) return value;
    if (from === 'BRL' && to === 'USD') return value / usdBrlRate;
    if (from === 'USD' && to === 'BRL') return value * usdBrlRate;
    return value;
  };

  useEffect(() => {
    fetchAvailableContent();
    fetchExchangeRate();
  }, []);

  const fetchExchangeRate = async () => {
    try {
      const response = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL');
      if (!response.ok) {
        setUsdBrlRate(null);
        return;
      }
      const data = (await response.json()) as {
        USDBRL?: { bid?: string };
      };
      const bid = Number(data?.USDBRL?.bid || 0);
      if (Number.isFinite(bid) && bid > 0) {
        setUsdBrlRate(bid);
      }
    } catch {
      // mantém fluxo com BRL como fallback
      setUsdBrlRate(null);
    }
  };

  const fetchAvailableContent = async () => {
    try {
      setIsLoadingContent(true);

      if (isBroker()) {
        const data = await apiClient.get<SharedInventoryBatch[]>(
          '/broker/shared-inventory',
          { params: { status: 'DISPONIVEL', limit: 1000 } }
        );
        const batches = data
          .map((shared) => shared.batch)
          .filter((batch): batch is Batch => batch !== null && batch !== undefined && batch.status === 'DISPONIVEL');
        setAvailableBatches(batches);
      } else {
        const data = await apiClient.get<{ batches?: Batch[]; data?: Batch[] }>(
          '/batches',
          { params: { status: 'DISPONIVEL', limit: 1000 } }
        );
        setAvailableBatches(data.batches || data.data || []);
      }
    } catch (err) {
      error('Erro ao carregar conteúdo');
    } finally {
      setIsLoadingContent(false);
    }
  };

  // Add batch to selection
  const handleAddBatch = (batch: Batch) => {
    // Check if already selected
    if (selectedItems.some(item => item.batch.id === batch.id)) {
      error('Este lote já foi adicionado');
      return;
    }

    setSelectedItems(prev => [...prev, {
      batch,
      quantity: 1,
      unitPrice: convertPrice(batch.industryPrice, 'BRL', displayCurrency)
    }]);
  };

  // Remove batch from selection
  const handleRemoveBatch = (batchId: string) => {
    setSelectedItems(prev => prev.filter(item => item.batch.id !== batchId));
  };

  // Update quantity for a batch
  const handleUpdateQuantity = (batchId: string, newQuantity: number) => {
    setSelectedItems(prev => prev.map(item => {
      if (item.batch.id === batchId) {
        const maxQty = item.batch.availableSlabs;
        const validQty = Math.max(1, Math.min(newQuantity, maxQty));
        return { ...item, quantity: validQty };
      }
      return item;
    }));
  };

  // Update price for a batch
  const handleUpdatePrice = (batchId: string, newPrice: number) => {
    setSelectedItems(prev => prev.map(item => {
      if (item.batch.id === batchId) {
        return { ...item, unitPrice: Math.max(0, newPrice) };
      }
      return item;
    }));
  };

  const handleCurrencyChange = (nextCurrency: CurrencyCode) => {
    if (nextCurrency === displayCurrency) return;
    setSelectedItems(prev => prev.map(item => ({
      ...item,
      unitPrice: Math.max(0, convertPrice(item.unitPrice, displayCurrency, nextCurrency)),
    })));
    setDisplayCurrency(nextCurrency);
  };

  // Calculate totals
  const totals = useMemo(() => {
    const totalPieces = selectedItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalValue = selectedItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    return { totalPieces, totalValue };
  }, [selectedItems]);

  // Check availability for all items
  const availabilityErrors = useMemo(() => {
    const errors: { batchId: string; message: string }[] = [];
    selectedItems.forEach(item => {
      if (item.quantity > item.batch.availableSlabs) {
        errors.push({
          batchId: item.batch.id,
          message: `Apenas ${item.batch.availableSlabs} peça(s) disponível(is)`
        });
      }
    });
    return errors;
  }, [selectedItems]);

  const hasErrors = availabilityErrors.length > 0;

  const handleNextStep = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    
    if (selectedItems.length === 0) {
      error('Selecione pelo menos um lote');
      return;
    }

    if (hasErrors) {
      error('Corrija os erros de disponibilidade antes de continuar');
      return;
    }

    setCurrentStep('config');
  };

  const handlePrevStep = () => {
    setCurrentStep('content');
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedItems.length === 0) {
      error('Selecione pelo menos um lote');
      return;
    }

    if (hasErrors) {
      error('Corrija os erros de disponibilidade');
      return;
    }

    try {
      setIsSubmitting(true);

      // Verificar disponibilidade atual de todos os lotes
      for (const item of selectedItems) {
        const statusCheck = await apiClient.get<Batch>(`/batches/${item.batch.id}`);
        if (statusCheck.status !== 'DISPONIVEL') {
          error(`Lote ${item.batch.batchCode} não está mais disponível`);
          setIsSubmitting(false);
          return;
        }
        if (statusCheck.availableSlabs < item.quantity) {
          error(`Lote ${item.batch.batchCode} possui apenas ${statusCheck.availableSlabs} peça(s) disponível(is)`);
          setIsSubmitting(false);
          return;
        }
      }

      // Usar MULTIPLOS_LOTES quando há mais de um item, LOTE_UNICO quando é só um
      const isMultiple = selectedItems.length > 1;
      
      // Calcular preço total para o link
      const totalDisplayPrice = selectedItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

      // Construir payload baseado no tipo
      const payload = isMultiple 
        ? {
            linkType: 'MULTIPLOS_LOTES' as LinkType,
            items: selectedItems.map(item => ({
              batchId: item.batch.id,
              quantity: item.quantity,
              unitPriceAmount: toCents(item.unitPrice),
            })),
            title: title || `Pedido com ${selectedItems.length} lote(s)`,
            customMessage: customMessage || undefined,
            slugToken: generatedSlug,
            displayPriceAmount: toCents(totalDisplayPrice),
            displayCurrency,
            showPrice,
            isActive,
            expiresAt: expirationDate ? expirationDate.toISOString() : undefined,
          }
        : {
            linkType: 'LOTE_UNICO' as LinkType,
            batchId: selectedItems[0].batch.id,
            title: title || selectedItems[0].batch.product?.name || 'Link de Venda',
            customMessage: customMessage || buildItemsDescription(),
            slugToken: generatedSlug,
            displayPriceAmount: toCents(totalDisplayPrice),
            displayCurrency,
            showPrice,
            isActive,
            expiresAt: expirationDate ? expirationDate.toISOString() : undefined,
          };

      const response = await apiClient.post<{ id: string; fullUrl: string }>(
        '/sales-links',
        payload
      );

      const fullUrl = response.fullUrl || `${window.location.origin}/${locale}/${generatedSlug}`;
      setGeneratedLink(fullUrl);
      setShowSuccessModal(true);

      await navigator.clipboard.writeText(fullUrl);
    } catch (err: unknown) {
      console.error('Erro ao criar link:', err);
      error(err instanceof Error ? err.message : 'Erro ao criar link');
    } finally {
      setIsSubmitting(false);
    }
  };

  const buildItemsDescription = () => {
    return selectedItems.map(item => 
      `• ${item.batch.batchCode} (${item.batch.product?.name}) - ${item.quantity} peça(s) x ${formatCurrency(item.unitPrice, locale as 'pt' | 'en' | 'es', displayCurrency)} = ${formatCurrency(item.quantity * item.unitPrice, locale as 'pt' | 'en' | 'es', displayCurrency)}`
    ).join('\n');
  };

  const filteredBatches = useMemo(() => {
    return availableBatches.filter((batch) => {
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      return (
        batch.batchCode.toLowerCase().includes(searchLower) ||
        batch.product?.name.toLowerCase().includes(searchLower)
      );
    });
  }, [availableBatches, searchTerm]);

  // Batches that are not yet selected
  const unselectedBatches = useMemo(() => {
    const selectedIds = new Set(selectedItems.map(item => item.batch.id));
    return filteredBatches.filter(batch => !selectedIds.has(batch.id));
  }, [filteredBatches, selectedItems]);

  const minDate = addDays(new Date(), 1);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 bg-[#121212] text-white flex items-center justify-between">
          <div>
            <h2 className="font-serif text-xl">Criar Link de Venda</h2>
            <p className="text-xs text-white/50 mt-0.5">
              {currentStep === 'content' && 'Passo 1 de 2 — Selecione os lotes e quantidades'}
              {currentStep === 'config' && 'Passo 2 de 2 — Configure o link'}
            </p>
          </div>
          <button 
            type="button"
            onClick={() => router.back()} 
            className="p-2 -mr-2 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="h-1 bg-slate-100 flex">
          <div 
            className="bg-[#C2410C] transition-all duration-300"
            style={{ width: currentStep === 'content' ? '50%' : '100%' }}
          />
        </div>

        {/* Content */}
        <form onSubmit={onSubmit} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-6">
            
            {/* Step 1: Content Selection */}
            {currentStep === 'content' && (
              <div className="space-y-5">
                {/* Selected Items */}
                {selectedItems.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-700">
                        Itens Selecionados ({selectedItems.length})
                      </h3>
                      <div className="text-sm text-emerald-600 font-semibold">
                        Total: {formatCurrency(totals.totalValue, locale as 'pt' | 'en' | 'es', displayCurrency)}
                      </div>
                    </div>
                    
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                      {selectedItems.map((item) => {
                        const itemError = availabilityErrors.find(e => e.batchId === item.batch.id);
                        const itemTotal = item.quantity * item.unitPrice;
                        
                        return (
                          <div 
                            key={item.batch.id}
                            className={cn(
                              "p-3 border rounded-lg",
                              itemError ? "border-rose-300 bg-rose-50" : "border-slate-200 bg-white"
                            )}
                          >
                            <div className="flex items-start gap-3">
                              {/* Image */}
                              <div className="w-12 h-12 flex-shrink-0 bg-slate-100 rounded overflow-hidden">
                                {item.batch.medias?.[0] && !isPlaceholderUrl(item.batch.medias[0].url) ? (
                                  <img src={item.batch.medias[0].url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <Package className="w-5 h-5 text-slate-300" />
                                  </div>
                                )}
                              </div>
                              
                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <p className="font-medium text-sm text-[#121212] truncate">
                                      {item.batch.product?.name}
                                    </p>
                                    <p className="font-mono text-xs text-slate-400">
                                      {item.batch.batchCode} • {item.batch.availableSlabs} disponível(is)
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveBatch(item.batch.id)}
                                    className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>

                                {/* Quantity and Price */}
                                <div className="flex items-center gap-4 mt-2">
                                  {/* Quantity */}
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs text-slate-500">Qtd:</span>
                                    <div className="flex items-center border border-slate-200 rounded">
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateQuantity(item.batch.id, item.quantity - 1)}
                                        disabled={item.quantity <= 1}
                                        className="p-1 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        <Minus className="w-3 h-3" />
                                      </button>
                                      <input
                                        type="number"
                                        value={item.quantity}
                                        onChange={(e) => handleUpdateQuantity(item.batch.id, parseInt(e.target.value) || 1)}
                                        className="w-12 text-center text-sm border-x border-slate-200 py-1 outline-none"
                                        min={1}
                                        max={item.batch.availableSlabs}
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateQuantity(item.batch.id, item.quantity + 1)}
                                        disabled={item.quantity >= item.batch.availableSlabs}
                                        className="p-1 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        <Plus className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Unit Price */}
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs text-slate-500">Preço unit.:</span>
                                    <div className="flex items-center border border-slate-200 rounded px-2 py-1">
                                      <MoneyInput
                                        value={item.unitPrice}
                                        onChange={(val) => handleUpdatePrice(item.batch.id, val ?? 0)}
                                        prefix={pricePrefix}
                                        variant="minimal"
                                        className="w-20 text-sm"
                                      />
                                    </div>
                                  </div>

                                  {/* Subtotal */}
                                  <div className="ml-auto text-sm font-medium text-emerald-600">
                                    {formatCurrency(itemTotal, locale as 'pt' | 'en' | 'es', displayCurrency)}
                                  </div>
                                </div>

                                {/* Error message */}
                                {itemError && (
                                  <div className="flex items-center gap-1 mt-2 text-xs text-rose-600">
                                    <AlertCircle className="w-3 h-3" />
                                    {itemError.message}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Summary */}
                    <div className="flex items-center justify-between p-3 bg-slate-100 rounded-lg">
                      <span className="text-sm text-slate-600">
                        {totals.totalPieces} peça(s) em {selectedItems.length} lote(s)
                      </span>
                      <span className="text-lg font-bold text-[#121212]">
                        {formatCurrency(totals.totalValue, locale as 'pt' | 'en' | 'es', displayCurrency)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Divider */}
                {selectedItems.length > 0 && (
                  <div className="border-t border-slate-200 pt-4">
                    <h3 className="text-sm font-semibold text-slate-700 mb-3">
                      Adicionar mais lotes
                    </h3>
                  </div>
                )}

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar por código ou produto..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.preventDefault();
                    }}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-[#C2410C] focus:bg-white outline-none text-sm transition-colors"
                  />
                </div>

                {/* Batch List */}
                <div className="border border-slate-200 max-h-[300px] overflow-y-auto rounded-lg">
                  {isLoadingContent ? (
                    <div className="py-12 text-center">
                      <div className="w-6 h-6 border-2 border-[#C2410C] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                      <p className="text-slate-400 text-sm">Carregando...</p>
                    </div>
                  ) : unselectedBatches.length === 0 ? (
                    <div className="py-12 text-center">
                      <Package className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                      <p className="text-slate-400 text-sm">
                        {searchTerm ? 'Nenhum lote encontrado' : selectedItems.length > 0 ? 'Todos os lotes já foram adicionados' : 'Nenhum lote disponível'}
                      </p>
                    </div>
                  ) : (
                    unselectedBatches.map((batch) => (
                      <button
                        key={batch.id}
                        type="button"
                        onClick={() => handleAddBatch(batch)}
                        className="w-full p-3 flex items-center gap-3 border-b border-slate-100 last:border-b-0 transition-colors text-left hover:bg-slate-50"
                      >
                        <div className="w-12 h-12 flex-shrink-0 bg-slate-100 rounded overflow-hidden">
                          {batch.medias?.[0] && !isPlaceholderUrl(batch.medias[0].url) ? (
                            <img src={batch.medias[0].url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-5 h-5 text-slate-300" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-[#121212] truncate">{batch.product?.name}</p>
                          <p className="font-mono text-xs text-slate-400">{batch.batchCode}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-emerald-600 font-medium">{formatCurrency(convertPrice(batch.industryPrice, 'BRL', displayCurrency), locale as 'pt' | 'en' | 'es', displayCurrency)}</span>
                            <span className="text-xs text-slate-400">• {batch.availableSlabs} disponível(is)</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 hover:bg-[#C2410C] hover:text-white transition-colors">
                          <Plus className="w-4 h-4" />
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Configuration */}
            {currentStep === 'config' && (
              <div className="space-y-5">
                {/* Selected Items Summary */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">
                    Resumo do Pedido
                  </h3>
                  <div className="space-y-2 max-h-[150px] overflow-y-auto">
                    {selectedItems.map((item) => (
                      <div key={item.batch.id} className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">
                          {item.batch.batchCode} ({item.quantity}x)
                        </span>
                        <span className="font-medium">{formatCurrency(item.quantity * item.unitPrice, locale as 'pt' | 'en' | 'es', displayCurrency)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-slate-200 mt-3 pt-3 flex justify-between">
                    <span className="font-semibold">Total ({totals.totalPieces} peças)</span>
                    <span className="font-bold text-lg text-emerald-600">{formatCurrency(totals.totalValue, locale as 'pt' | 'en' | 'es', displayCurrency)}</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-2">
                    Moeda de Exibição
                  </label>
                  <select
                    value={displayCurrency}
                    onChange={(e) => handleCurrencyChange(e.target.value as CurrencyCode)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#C2410C] focus:bg-white outline-none text-sm transition-colors rounded"
                  >
                    <option value="BRL">Real (BRL)</option>
                    <option value="USD">Dólar (USD)</option>
                  </select>
                  {displayCurrency === 'USD' && !usdBrlRate && (
                    <p className="mt-1 text-xs text-amber-600">
                      Cotação USD/BRL indisponível no momento. Valores atuais foram mantidos.
                    </p>
                  )}
                </div>

                {/* Show Price Toggle */}
                <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded">
                  <div className="flex items-center gap-2">
                    {showPrice ? <Eye className="w-4 h-4 text-emerald-500" /> : <EyeOff className="w-4 h-4 text-slate-400" />}
                    <span className="text-sm">{showPrice ? 'Preço visível no link' : 'Preço sob consulta'}</span>
                  </div>
                  <Toggle
                    checked={showPrice}
                    onChange={(e) => setShowPrice(e.target.checked)}
                  />
                </div>

                {/* Title */}
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-2">
                    Título do Link <span className="text-slate-400">(opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#C2410C] focus:bg-white outline-none text-sm transition-colors rounded"
                    placeholder={`Pedido com ${selectedItems.length} lote(s)`}
                  />
                </div>

                {/* Message */}
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-2">
                    Mensagem <span className="text-slate-400">(opcional)</span>
                  </label>
                  <textarea
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#C2410C] focus:bg-white outline-none text-sm resize-none transition-colors rounded"
                    placeholder="Mensagem que aparecerá no link..."
                  />
                </div>

                {/* Expiration Date */}
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-2">
                    Expiração <span className="text-slate-400">(opcional)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={expirationDate ? format(expirationDate, 'yyyy-MM-dd') : ''}
                      min={format(minDate, 'yyyy-MM-dd')}
                      onChange={(e) => {
                        const value = e.target.value;
                        setExpirationDate(value ? new Date(value + 'T00:00:00') : undefined);
                      }}
                      className={cn(
                        'w-full px-3 py-2.5 bg-slate-50 border border-slate-200 text-sm transition-colors rounded',
                        'hover:border-[#C2410C] focus:border-[#C2410C] focus:bg-white outline-none',
                        !expirationDate && 'text-slate-400'
                      )}
                    />
                    {expirationDate && (
                      <button
                        type="button"
                        onClick={() => setExpirationDate(undefined)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Active Toggle */}
                <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded">
                  <div className="flex items-center gap-2">
                    <div className={cn('w-2 h-2 rounded-full', isActive ? 'bg-emerald-500' : 'bg-slate-300')} />
                    <span className="text-sm">{isActive ? 'Link ativo' : 'Link desativado'}</span>
                  </div>
                  <Toggle
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
            {currentStep !== 'content' ? (
              <button
                type="button"
                onClick={handlePrevStep}
                className="flex items-center gap-1.5 text-slate-500 hover:text-[#121212] text-sm font-medium transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </button>
            ) : (
              <button
                type="button"
                onClick={() => router.back()}
                className="text-slate-500 hover:text-[#121212] text-sm font-medium transition-colors"
              >
                Cancelar
              </button>
            )}

            {currentStep !== 'config' ? (
              <button
                type="button"
                onClick={handleNextStep}
                disabled={selectedItems.length === 0 || hasErrors}
                className={cn(
                  'flex items-center gap-1.5 px-5 py-2.5 text-white text-sm font-medium transition-all',
                  (selectedItems.length === 0 || hasErrors)
                    ? 'bg-slate-300 cursor-not-allowed'
                    : 'bg-[#121212] hover:bg-[#C2410C]'
                )}
              >
                Continuar
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className={cn(
                  'flex items-center gap-1.5 px-5 py-2.5 text-white text-sm font-medium transition-all',
                  isSubmitting
                    ? 'bg-slate-300 cursor-not-allowed'
                    : 'bg-[#C2410C] hover:bg-[#a03609]'
                )}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <Link2 className="w-4 h-4" />
                    Criar Link
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Success Modal */}
      <Modal open={showSuccessModal} onClose={() => setShowSuccessModal(false)}>
        <ModalClose onClose={() => setShowSuccessModal(false)} />
        <ModalHeader>
          <ModalTitle>Link Criado!</ModalTitle>
        </ModalHeader>
        <ModalContent>
          <div className="space-y-5">
            <div className="flex justify-center">
              <div className="p-3 bg-slate-50 border border-slate-200">
                <QRCodeCanvas value={generatedLink} size={140} />
              </div>
            </div>

            <div>
              <p className="text-xs text-slate-500 mb-2 text-center">Seu link de venda</p>
              <div className="flex items-center gap-2">
                <input
                  value={generatedLink}
                  readOnly
                  className="flex-1 py-2.5 px-3 bg-slate-50 border border-slate-200 text-sm font-mono"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(generatedLink);
                    success('Link copiado!');
                  }}
                  className="p-2.5 bg-[#121212] hover:bg-[#C2410C] text-white transition-colors"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded text-sm">
              <p className="font-medium mb-2">Itens incluídos:</p>
              {selectedItems.map(item => (
                <p key={item.batch.id} className="text-slate-600">
                  • {item.batch.batchCode} - {item.quantity} peça(s) x {formatCurrency(item.unitPrice, locale as 'pt' | 'en' | 'es', displayCurrency)}
                </p>
              ))}
              <p className="font-semibold mt-2 pt-2 border-t border-slate-200">
                Total: {formatCurrency(totals.totalValue, locale as 'pt' | 'en' | 'es', displayCurrency)}
              </p>
            </div>
          </div>
        </ModalContent>
        <ModalFooter>
          <Button
            variant="secondary"
            onClick={() => window.open(generatedLink, '_blank')}
            className="flex items-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            Preview
          </Button>
          <button
            type="button"
            onClick={() => router.push(`/${locale}/links`)}
            className="px-5 py-2.5 bg-[#121212] hover:bg-[#C2410C] text-white text-sm font-medium transition-all"
          >
            Ver Links
          </button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
