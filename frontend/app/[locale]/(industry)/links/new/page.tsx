'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ArrowRight, Check, Search, Package, Copy, Link2, Eye, EyeOff, X, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { Modal, ModalHeader, ModalTitle, ModalContent, ModalFooter, ModalClose } from '@/components/ui/modal';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/lib/hooks/useToast';
import { useAuth } from '@/lib/hooks/useAuth';
import { salesLinkSchema, type SalesLinkInput } from '@/lib/schemas/link.schema';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { formatArea } from '@/lib/utils/formatDimensions';
import { nanoid } from 'nanoid';
import { QRCodeCanvas } from 'qrcode.react';
import type { Batch, Product, LinkType, SharedInventoryBatch } from '@/lib/types';
import { cn } from '@/lib/utils/cn';
import { isPlaceholderUrl } from '@/lib/utils/media';
import { useLocale } from 'next-intl';
import { format, addDays } from 'date-fns';

type WizardStep = 'content' | 'config';

export default function CreateSalesLinkPage() {
  const locale = useLocale();
  const router = useRouter();
  const { success, error } = useToast();
  const { user, isBroker } = useAuth();

  const [currentStep, setCurrentStep] = useState<WizardStep>('content');
  const [linkType, setLinkType] = useState<LinkType>('LOTE_UNICO');
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [availableBatches, setAvailableBatches] = useState<Batch[]>([]);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string>('');
  const [calculatedMargin, setCalculatedMargin] = useState<number>(0);
  const [expirationDate, setExpirationDate] = useState<Date | undefined>(undefined);

  // Generate slug once on mount - user doesn't need to see or edit it
  const [generatedSlug] = useState(() => nanoid(10).toLowerCase());

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm<SalesLinkInput>({
    resolver: zodResolver(salesLinkSchema),
    defaultValues: {
      linkType: 'LOTE_UNICO',
      showPrice: true,
      isActive: true,
      slugToken: '',
    },
  });

  const displayPrice = watch('displayPrice');
  const showPrice = watch('showPrice');

  useEffect(() => {
    if (currentStep === 'content') {
      fetchAvailableContent();
    }
  }, [currentStep, linkType]);

  useEffect(() => {
    if (isBroker() && selectedBatch && displayPrice) {
      const basePrice = selectedBatch.industryPrice;
      const margin = displayPrice - basePrice;
      setCalculatedMargin(margin);
    }
  }, [displayPrice, selectedBatch, isBroker]);

  const fetchAvailableContent = async () => {
    try {
      setIsLoadingContent(true);

      if (linkType === 'LOTE_UNICO') {
        if (isBroker()) {
          // Para brokers, buscar inventário compartilhado
          const data = await apiClient.get<SharedInventoryBatch[]>(
            '/broker/shared-inventory',
            { params: { status: 'DISPONIVEL', limit: 1000 } }
          );
          // Extrair batches do array de SharedInventoryBatch
          const batches = data
            .map((shared) => shared.batch)
            .filter((batch): batch is Batch => batch !== null && batch !== undefined && batch.status === 'DISPONIVEL');
          setAvailableBatches(batches);
        } else {
          // Para admins, buscar batches normalmente
          const data = await apiClient.get<{ batches?: Batch[]; data?: Batch[] }>(
            '/batches',
            { params: { status: 'DISPONIVEL', limit: 1000 } }
          );
          setAvailableBatches(data.batches || data.data || []);
        }
      } else if (linkType === 'PRODUTO_GERAL') {
        const data = await apiClient.get<{ products: Product[] }>('/products', {
          params: { includeInactive: false, limit: 1000 },
        });
        setAvailableProducts(data.products);
      }
    } catch (err) {
      error('Erro ao carregar conteúdo');
    } finally {
      setIsLoadingContent(false);
    }
  };

  const handleSelectBatch = (batch: Batch) => {
    setSelectedBatch(batch);
    setValue('batchId', batch.id);
    setValue('linkType', 'LOTE_UNICO');
    // Pre-fill the price with the batch's industry price
    setValue('displayPrice', batch.industryPrice);
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setValue('productId', product.id);
    setValue('linkType', 'PRODUTO_GERAL');
  };

  const handleNextStep = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (currentStep === 'content') {
      if (!selectedBatch) {
        error('Selecione um lote para continuar');
        return;
      }
      setCurrentStep('config');
    }
  };

  const handlePrevStep = () => {
    if (currentStep === 'config') {
      setCurrentStep('content');
    }
  };

  const onSubmit = async (data: SalesLinkInput) => {
    try {
      setIsSubmitting(true);

      if (linkType === 'LOTE_UNICO' && data.batchId) {
        const statusCheck = await apiClient.get<Batch>(`/batches/${data.batchId}`);
        if (statusCheck.status !== 'DISPONIVEL') {
          error('Lote não está mais disponível');
          setIsSubmitting(false);
          return;
        }
      }

      // Use the pre-generated slug and expiration date
      const payload = { 
        ...data, 
        slugToken: generatedSlug,
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
    } catch (err: any) {
      console.error('Erro ao criar link:', err);
      error(err?.message || 'Erro ao criar link');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredBatches = availableBatches.filter((batch) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      batch.batchCode.toLowerCase().includes(searchLower) ||
      batch.product?.name.toLowerCase().includes(searchLower)
    );
  });

  const filteredProducts = availableProducts.filter((product) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      product.name.toLowerCase().includes(searchLower) ||
      product.sku?.toLowerCase().includes(searchLower)
    );
  });

  // Minimum date is tomorrow
  const minDate = addDays(new Date(), 1);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 bg-[#121212] text-white flex items-center justify-between">
          <div>
            <h2 className="font-serif text-xl">Criar Link de Venda</h2>
            <p className="text-xs text-white/50 mt-0.5">
              {currentStep === 'content' && 'Passo 1 de 2 — Selecione o lote'}
              {currentStep === 'config' && 'Passo 2 de 2 — Configure o link'}
            </p>
          </div>
          <button 
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
            style={{ 
              width: currentStep === 'content' ? '50%' : '100%' 
            }}
          />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit, (errors) => {
          console.error('Form validation errors:', errors);
          const firstError = Object.values(errors)[0];
          if (firstError?.message) {
            error(firstError.message as string);
          }
        })} className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-6">
            
            {/* Step 1: Content Selection */}
            {currentStep === 'content' && (
              <div className="space-y-5">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar por código ou produto..."
                    value={searchTerm}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                      }
                    }}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 focus:border-[#C2410C] focus:bg-white outline-none text-sm transition-colors"
                  />
                </div>

                {/* Batch List */}
                <div className="border border-slate-200 max-h-[340px] overflow-y-auto">
                  {isLoadingContent ? (
                    <div className="py-12 text-center">
                      <div className="w-6 h-6 border-2 border-[#C2410C] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                      <p className="text-slate-400 text-sm">Carregando...</p>
                    </div>
                  ) : filteredBatches.length === 0 ? (
                    <div className="py-12 text-center">
                      <Package className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                      <p className="text-slate-400 text-sm">
                        {searchTerm ? 'Nenhum lote encontrado' : 'Nenhum lote disponível'}
                      </p>
                    </div>
                  ) : (
                    filteredBatches.map((batch) => {
                      const isSelected = selectedBatch?.id === batch.id;
                      return (
                        <button
                          key={batch.id}
                          type="button"
                          onClick={() => handleSelectBatch(batch)}
                          className={cn(
                            'w-full p-3 flex items-center gap-3 border-b border-slate-100 last:border-b-0 transition-colors text-left',
                            isSelected 
                              ? 'bg-orange-50 border-l-2 border-l-[#C2410C]' 
                              : 'hover:bg-slate-50'
                          )}
                        >
                          <div className="w-12 h-12 flex-shrink-0 bg-slate-100 overflow-hidden">
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
                            <p className="text-xs text-emerald-600 font-medium mt-0.5">{formatCurrency(batch.industryPrice)}</p>
                          </div>
                          {isSelected && (
                            <div className="w-5 h-5 bg-[#C2410C] rounded-full flex items-center justify-center flex-shrink-0">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Configuration */}
            {currentStep === 'config' && (
              <div className="space-y-5">
                {/* Selected Batch Summary */}
                {selectedBatch && (
                  <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200">
                    <div className="w-10 h-10 bg-slate-200 overflow-hidden flex-shrink-0">
                      {selectedBatch.medias?.[0] && !isPlaceholderUrl(selectedBatch.medias[0].url) ? (
                        <img src={selectedBatch.medias[0].url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-4 h-4 text-slate-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{selectedBatch.product?.name}</p>
                      <p className="text-xs text-slate-400">{selectedBatch.batchCode} • {formatArea(selectedBatch.totalArea)}</p>
                    </div>
                    <p className="text-sm font-semibold text-emerald-600">{formatCurrency(selectedBatch.industryPrice)}</p>
                  </div>
                )}

                {/* Price */}
                {selectedBatch && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-medium text-slate-600 block mb-2">
                        Preço para o Cliente
                      </label>
                      <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 focus-within:border-[#C2410C] focus-within:bg-white transition-colors">
                        <span className="text-slate-400">R$</span>
                        <input
                          {...register('displayPrice', { valueAsNumber: true })}
                          type="number"
                          step="0.01"
                          className="flex-1 bg-transparent outline-none text-lg font-medium"
                          placeholder="0,00"
                        />
                      </div>
                      {errors.displayPrice && (
                        <p className="text-xs text-rose-500 mt-1">{errors.displayPrice.message}</p>
                      )}
                      <p className="text-xs text-slate-400 mt-1">
                        Preço base do lote: {formatCurrency(selectedBatch.industryPrice)}
                      </p>
                    </div>

                    {isBroker() && displayPrice && displayPrice >= selectedBatch.industryPrice && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-emerald-50 border border-emerald-100 text-center">
                          <p className="text-[10px] uppercase tracking-wide text-emerald-600 mb-0.5">Sua Margem</p>
                          <p className="font-semibold text-emerald-700">{formatCurrency(calculatedMargin)}</p>
                        </div>
                        <div className="p-3 bg-emerald-50 border border-emerald-100 text-center">
                          <p className="text-[10px] uppercase tracking-wide text-emerald-600 mb-0.5">Percentual</p>
                          <p className="font-semibold text-emerald-700">
                            {((calculatedMargin / selectedBatch.industryPrice) * 100).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Show Price Toggle */}
                <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-2">
                    {showPrice ? <Eye className="w-4 h-4 text-emerald-500" /> : <EyeOff className="w-4 h-4 text-slate-400" />}
                    <span className="text-sm">{showPrice ? 'Preço visível' : 'Sob consulta'}</span>
                  </div>
                  <Toggle
                    checked={showPrice}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue('showPrice', e.target.checked)}
                  />
                </div>

                {/* Title */}
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-2">
                    Título Personalizado <span className="text-slate-400">(opcional)</span>
                  </label>
                  <input
                    {...register('title')}
                    type="text"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#C2410C] focus:bg-white outline-none text-sm transition-colors"
                    placeholder={selectedBatch?.product?.name || 'Ex: Oferta Exclusiva'}
                  />
                </div>

                {/* Message */}
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-2">
                    Mensagem <span className="text-slate-400">(opcional)</span>
                  </label>
                  <textarea
                    {...register('customMessage')}
                    rows={3}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#C2410C] focus:bg-white outline-none text-sm resize-none transition-colors"
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
                        'w-full px-3 py-2.5 bg-slate-50 border border-slate-200 text-sm transition-colors',
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
                  <p className="text-xs text-slate-400 mt-1">
                    O link ficará disponível até a data selecionada
                  </p>
                </div>

                {/* Active Toggle */}
                <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-2">
                    <div className={cn('w-2 h-2 rounded-full', watch('isActive') ? 'bg-emerald-500' : 'bg-slate-300')} />
                    <span className="text-sm">{watch('isActive') ? 'Link ativo' : 'Link desativado'}</span>
                  </div>
                  <Toggle
                    checked={watch('isActive')}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue('isActive', e.target.checked)}
                  />
                </div>

                {/* Summary */}
                {selectedBatch && (
                  <div className="p-4 bg-white border-2 border-[#C2410C]">
                    <p className="text-[10px] uppercase tracking-widest text-[#C2410C] mb-3 font-semibold">Resumo do Link</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Lote</span>
                        <span className="font-mono text-xs text-[#121212]">{selectedBatch.batchCode}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Preço</span>
                        <span className="text-emerald-600 font-medium">
                          {showPrice 
                            ? formatCurrency(isBroker() ? displayPrice! : selectedBatch.industryPrice)
                            : 'Sob Consulta'
                          }
                        </span>
                      </div>
                      {expirationDate && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Expira em</span>
                          <span className="text-xs text-[#121212]">
                            {format(expirationDate, "dd/MM/yyyy")}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
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
                disabled={!selectedBatch}
                className={cn(
                  'flex items-center gap-1.5 px-5 py-2.5 text-white text-sm font-medium transition-all',
                  !selectedBatch
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