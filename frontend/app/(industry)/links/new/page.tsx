'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ArrowRight, Check, Search, Package, QrCode, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Toggle } from '@/components/ui/toggle';
import { Modal, ModalHeader, ModalTitle, ModalContent, ModalFooter } from '@/components/ui/modal';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/lib/hooks/useToast';
import { useAuth } from '@/lib/hooks/useAuth';
import { salesLinkSchema, type SalesLinkInput } from '@/lib/schemas/link.schema';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { formatArea } from '@/lib/utils/formatDimensions';
import { nanoid } from 'nanoid';
import { QRCodeCanvas } from 'qrcode.react';
import type { Batch, Product, LinkType } from '@/lib/types';
import { cn } from '@/lib/utils/cn';

type WizardStep = 'content' | 'pricing' | 'config';

export default function CreateSalesLinkPage() {
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
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const [isSlugAvailable, setIsSlugAvailable] = useState(true);

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
      slugToken: nanoid(10).toLowerCase(),
    },
  });

  const displayPrice = watch('displayPrice');
  const showPrice = watch('showPrice');
  const slugToken = watch('slugToken');

  useEffect(() => {
    if (currentStep === 'content') {
      fetchAvailableContent();
    }
  }, [currentStep, linkType]);

  useEffect(() => {
    const handle = setTimeout(async () => {
      if (!slugToken) return;
      setIsCheckingSlug(true);
      const available = await validateSlug(slugToken);
      setIsSlugAvailable(available);
      setIsCheckingSlug(false);
    }, 400);

    return () => clearTimeout(handle);
  }, [slugToken]);

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
        const endpoint = isBroker() ? '/broker/shared-inventory' : '/batches';
        const data = await apiClient.get<{ batches?: Batch[]; data?: Batch[] }>(
          endpoint,
          { params: { status: 'DISPONIVEL', limit: 1000 } }
        );
        setAvailableBatches(data.batches || data.data || []);
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

  const validateSlug = async (slug: string): Promise<boolean> => {
    try {
      await apiClient.get('/sales-links/validate-slug', {
        params: { slug },
      });
      return true;
    } catch {
      return false;
    }
  };

  const handleGenerateSlug = () => {
    const newSlug = nanoid(10).toLowerCase();
    setValue('slugToken', newSlug);
  };

  const handleSelectBatch = (batch: Batch) => {
    setSelectedBatch(batch);
    setValue('batchId', batch.id);
    setValue('linkType', 'LOTE_UNICO');
    
    if (isBroker()) {
      setValue('displayPrice', batch.industryPrice);
    }
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setValue('productId', product.id);
    setValue('linkType', 'PRODUTO_GERAL');
  };

  const handleNextStep = () => {
    if (currentStep === 'content') {
      if (linkType === 'LOTE_UNICO' && !selectedBatch) {
        error('Selecione um lote para continuar');
        return;
      }
      if (linkType === 'PRODUTO_GERAL' && !selectedProduct) {
        error('Selecione um produto para continuar');
        return;
      }
      setCurrentStep('pricing');
    } else if (currentStep === 'pricing') {
      if (isBroker() && linkType === 'LOTE_UNICO') {
        if (!displayPrice) {
          error('Defina o preço para o cliente');
          return;
        }
        if (selectedBatch && displayPrice < selectedBatch.industryPrice) {
          error('Preço não pode ser menor que o preço base');
          return;
        }
      }
      setCurrentStep('config');
    }
  };

  const handlePrevStep = () => {
    if (currentStep === 'config') {
      setCurrentStep('pricing');
    } else if (currentStep === 'pricing') {
      setCurrentStep('content');
    }
  };

  const onSubmit = async (data: SalesLinkInput) => {
    try {
      setIsSubmitting(true);

      const isSlugValid = await validateSlug(data.slugToken);
      if (!isSlugValid) {
        error('Este slug já está em uso. Tente outro.');
        handleGenerateSlug();
        return;
      }

      if (linkType === 'LOTE_UNICO') {
        const statusCheck = await apiClient.get<Batch>(`/batches/${data.batchId}`);
        if (statusCheck.status !== 'DISPONIVEL') {
          error('Lote não está mais disponível');
          return;
        }
      }

      const response = await apiClient.post<{ id: string; fullUrl: string }>(
        '/sales-links',
        data
      );

      const fullUrl = response.fullUrl || `${window.location.origin}/${data.slugToken}`;
      setGeneratedLink(fullUrl);
      setShowSuccessModal(true);

      await navigator.clipboard.writeText(fullUrl);
    } catch (err) {
      error('Erro ao criar link');
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

  return (
    <div className="min-h-screen bg-mineral">
      {/* Header */}
      <div className="bg-porcelain border-b border-slate-100 px-8 py-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-slate-100 rounded-sm transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="font-serif text-3xl text-obsidian mb-2">
              Criar Link de Venda
            </h1>
            <p className="text-sm text-slate-500">
              {currentStep === 'content' && 'Selecione o conteúdo do link'}
              {currentStep === 'pricing' && 'Defina preço e visibilidade'}
              {currentStep === 'config' && 'Configure o link'}
            </p>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="px-8 py-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between">
            {['content', 'pricing', 'config'].map((step, index) => {
              const stepLabels = {
                content: 'Conteúdo',
                pricing: 'Precificação',
                config: 'Configuração',
              };
              const isActive = currentStep === step;
              const isCompleted = ['content', 'pricing', 'config'].indexOf(currentStep) > index;

              return (
                <div key={step} className="flex items-center flex-1">
                  <div className="flex flex-col items-center w-full">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center transition-colors mb-2',
                        isCompleted
                          ? 'bg-emerald-500 text-white'
                          : isActive
                          ? 'bg-obsidian text-porcelain'
                          : 'bg-slate-200 text-slate-400'
                      )}
                    >
                      {isCompleted ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <span className="text-sm font-semibold">{index + 1}</span>
                      )}
                    </div>
                    <span
                      className={cn(
                        'text-xs font-medium',
                        isActive ? 'text-obsidian' : 'text-slate-400'
                      )}
                    >
                      {stepLabels[step as WizardStep]}
                    </span>
                  </div>
                  {index < 2 && (
                    <div
                      className={cn(
                        'h-1 flex-1 -mt-8 mx-4',
                        isCompleted ? 'bg-emerald-500' : 'bg-slate-200'
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="px-8 pb-8">
        <div className="max-w-4xl mx-auto">
          {/* Step 1: Content Selection */}
          {currentStep === 'content' && (
            <Card>
              <h2 className="text-lg font-semibold text-obsidian mb-6">
                Selecionar Conteúdo
              </h2>

              {/* Link Type Selector */}
              <div className="mb-6">
                <p className="text-xs uppercase tracking-widest text-slate-500 mb-4">
                  Tipo de Link
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    type="button"
                    onClick={() => setLinkType('LOTE_UNICO')}
                    className={cn(
                      'p-4 border-2 rounded-sm transition-all',
                      linkType === 'LOTE_UNICO'
                        ? 'border-obsidian bg-slate-50'
                        : 'border-slate-200 hover:border-slate-300'
                    )}
                  >
                    <Package className="w-6 h-6 mx-auto mb-2 text-slate-600" />
                    <p className="font-semibold text-sm">Lote Específico</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Link para um lote individual
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLinkType('PRODUTO_GERAL')}
                    className={cn(
                      'p-4 border-2 rounded-sm transition-all',
                      linkType === 'PRODUTO_GERAL'
                        ? 'border-obsidian bg-slate-50'
                        : 'border-slate-200 hover:border-slate-300'
                    )}
                  >
                    <Package className="w-6 h-6 mx-auto mb-2 text-slate-600" />
                    <p className="font-semibold text-sm">Produto (Catálogo)</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Link para um tipo de pedra
                    </p>
                  </button>

                  {isBroker() && (
                    <button
                      type="button"
                      onClick={() => setLinkType('CATALOGO_COMPLETO')}
                      className={cn(
                        'p-4 border-2 rounded-sm transition-all',
                        linkType === 'CATALOGO_COMPLETO'
                          ? 'border-obsidian bg-slate-50'
                          : 'border-slate-200 hover:border-slate-300'
                      )}
                    >
                      <Package className="w-6 h-6 mx-auto mb-2 text-slate-600" />
                      <p className="font-semibold text-sm">Catálogo Completo</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Todos os produtos disponíveis
                      </p>
                    </button>
                  )}
                </div>
              </div>

              {/* Search */}
              {linkType !== 'CATALOGO_COMPLETO' && (
                <>
                  <div className="relative mb-6">
                    <Input
                      placeholder={linkType === 'LOTE_UNICO' ? 'Buscar lote por código ou produto' : 'Buscar produto por nome'}
                      value={searchTerm}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                    />
                    <Search className="absolute right-3 top-3 w-5 h-5 text-slate-400 pointer-events-none" />
                  </div>

                  {/* Content List */}
                  <div className="max-h-96 overflow-y-auto border border-slate-200 rounded-sm">
                    {isLoadingContent ? (
                      <div className="p-8 text-center text-slate-400">
                        Carregando...
                      </div>
                    ) : linkType === 'LOTE_UNICO' ? (
                      filteredBatches.length === 0 ? (
                        <div className="p-8 text-center text-slate-400">
                          {searchTerm ? 'Nenhum lote encontrado' : 'Nenhum lote disponível'}
                        </div>
                      ) : (
                        filteredBatches.map((batch) => (
                          <button
                            key={batch.id}
                            type="button"
                            onClick={() => handleSelectBatch(batch)}
                            className={cn(
                              'w-full p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors text-left',
                              selectedBatch?.id === batch.id && 'bg-blue-50 border-blue-200'
                            )}
                          >
                            <div className="flex items-center gap-4">
                              {batch.medias?.[0] && (
                                <img
                                  src={batch.medias[0].url}
                                  alt={batch.batchCode}
                                  loading="lazy"
                                  className="w-16 h-16 rounded-sm object-cover"
                                />
                              )}
                              <div className="flex-1">
                                <p className="font-mono text-sm font-semibold text-obsidian">
                                  {batch.batchCode}
                                </p>
                                <p className="text-sm text-slate-600">
                                  {batch.product?.name}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {formatArea(batch.totalArea)} •{' '}
                                  {formatCurrency(batch.industryPrice)}
                                </p>
                              </div>
                              {selectedBatch?.id === batch.id && (
                                <Check className="w-5 h-5 text-blue-600" />
                              )}
                            </div>
                          </button>
                        ))
                      )
                    ) : (
                      filteredProducts.length === 0 ? (
                        <div className="p-8 text-center text-slate-400">
                          {searchTerm ? 'Nenhum produto encontrado' : 'Nenhum produto disponível'}
                        </div>
                      ) : (
                        filteredProducts.map((product) => (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => handleSelectProduct(product)}
                            className={cn(
                              'w-full p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors text-left',
                              selectedProduct?.id === product.id && 'bg-blue-50 border-blue-200'
                            )}
                          >
                            <div className="flex items-center gap-4">
                              {product.medias?.[0] && (
                                <img
                                  src={product.medias[0].url}
                                  alt={product.name}
                                  loading="lazy"
                                  className="w-16 h-16 rounded-sm object-cover"
                                />
                              )}
                              <div className="flex-1">
                                <p className="font-semibold text-obsidian">
                                  {product.name}
                                </p>
                                <p className="text-sm text-slate-600">
                                  {product.material} • {product.finish}
                                </p>
                                {product.sku && (
                                  <p className="text-xs text-slate-500 font-mono">
                                    {product.sku}
                                  </p>
                                )}
                              </div>
                              {selectedProduct?.id === product.id && (
                                <Check className="w-5 h-5 text-blue-600" />
                              )}
                            </div>
                          </button>
                        ))
                      )
                    )}
                  </div>
                </>
              )}

              {/* Selected Preview */}
              {(selectedBatch || selectedProduct) && (
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-sm">
                  <p className="text-xs uppercase tracking-widest text-blue-600 mb-2">
                    Selecionado
                  </p>
                  <div className="flex items-center gap-4">
                    {(selectedBatch?.medias?.[0] || selectedProduct?.medias?.[0]) && (
                      <img
                        src={(selectedBatch?.medias?.[0] || selectedProduct?.medias?.[0])?.url}
                        alt="Preview"
                        loading="lazy"
                        className="w-20 h-20 rounded-sm object-cover"
                      />
                    )}
                    <div>
                      <p className="font-semibold text-obsidian">
                        {selectedBatch?.batchCode || selectedProduct?.name}
                      </p>
                      {selectedBatch && (
                        <>
                          <p className="text-sm text-slate-600">
                            {selectedBatch.product?.name}
                          </p>
                          <p className="text-sm text-slate-500">
                            {formatArea(selectedBatch.totalArea)}
                          </p>
                        </>
                      )}
                      {selectedProduct && (
                        <p className="text-sm text-slate-600">
                          {selectedProduct.material} • {selectedProduct.finish}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Step 2: Pricing */}
          {currentStep === 'pricing' && (
            <Card>
              <h2 className="text-lg font-semibold text-obsidian mb-6">
                Definir Preço e Visibilidade
              </h2>

              {isBroker() && selectedBatch && (
                <>
                  <Input
                    {...register('displayPrice', { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    label="Preço Final para o Cliente (R$)"
                    error={errors.displayPrice?.message}
                    disabled={isSubmitting}
                  />

                  {displayPrice && (
                    <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-sm">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-xs uppercase tracking-widest text-emerald-600 mb-1">
                            Preço Base
                          </p>
                          <p className="font-serif text-lg text-emerald-700">
                            {formatCurrency(selectedBatch.industryPrice)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-widest text-emerald-600 mb-1">
                            Minha Margem
                          </p>
                          <p className="font-serif text-lg text-emerald-700">
                            {formatCurrency(calculatedMargin)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-widest text-emerald-600 mb-1">
                            % Margem
                          </p>
                          <p className="font-serif text-lg text-emerald-700">
                            {((calculatedMargin / selectedBatch.industryPrice) * 100).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {!isBroker() && selectedBatch && (
                <div className="mb-6">
                  <p className="text-xs uppercase tracking-widest text-slate-500 mb-2">
                    Preço Indústria
                  </p>
                  <p className="font-serif text-3xl text-obsidian">
                    {formatCurrency(selectedBatch.industryPrice)}
                  </p>
                </div>
              )}

              <div className="space-y-6 mt-6">
                <Toggle
                  {...register('showPrice')}
                  checked={showPrice}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue('showPrice', e.target.checked)}
                  label="Exibir preço no link"
                />
                <p className="text-xs text-slate-500 ml-14">
                  Se desativado, aparecerá &quot;Sob Consulta&quot;
                </p>

                <Input
                  {...register('title')}
                  label="Título Personalizado (Opcional)"
                  placeholder={selectedBatch?.product?.name || selectedProduct?.name || ''}
                  error={errors.title?.message}
                  disabled={isSubmitting}
                />

                <Textarea
                  {...register('customMessage')}
                  label="Mensagem Personalizada (Opcional)"
                  placeholder="Aparecerá no topo da landing page..."
                  rows={4}
                  error={errors.customMessage?.message}
                  disabled={isSubmitting}
                />
              </div>
            </Card>
          )}

          {/* Step 3: Configuration */}
          {currentStep === 'config' && (
            <Card>
              <h2 className="text-lg font-semibold text-obsidian mb-6">
                Configurações do Link
              </h2>

              <div className="space-y-6">
                <div>
                  <Input
                    {...register('slugToken')}
                    label="Slug do Link"
                    error={errors.slugToken?.message}
                    disabled={isSubmitting}
                  />
                  <div className="flex items-center gap-2 mt-2">
                    <p className="text-xs text-slate-500">
                      Preview: {window.location.origin}/{slugToken}
                    </p>
                    <button
                      type="button"
                      onClick={handleGenerateSlug}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Gerar novo
                    </button>
                    {!isSlugAvailable && (
                      <span className="text-xs text-rose-600">Slug já em uso</span>
                    )}
                    {isCheckingSlug && (
                      <span className="text-xs text-slate-500">Verificando...</span>
                    )}
                  </div>
                </div>

                <Input
                  {...register('expiresAt')}
                  type="date"
                  label="Data de Expiração (Opcional)"
                  error={errors.expiresAt?.message}
                  disabled={isSubmitting}
                />

                <Toggle
                  {...register('isActive')}
                  checked={watch('isActive')}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue('isActive', e.target.checked)}
                  label="Link Ativo"
                />
              </div>
            </Card>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8">
            {currentStep !== 'content' ? (
              <Button
                type="button"
                variant="secondary"
                onClick={handlePrevStep}
                disabled={isSubmitting}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
            ) : (
              <div />
            )}

            {currentStep !== 'config' ? (
              <Button
                type="button"
                variant="primary"
                onClick={handleNextStep}
              >
                Próximo
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                type="submit"
                variant="primary"
                loading={isSubmitting}
              >
                GERAR LINK
              </Button>
            )}
          </div>
        </div>
      </form>

      {/* Success Modal */}
      <Modal open={showSuccessModal} onClose={() => {}}>
        <ModalHeader>
          <ModalTitle>Link Criado com Sucesso! 🎉</ModalTitle>
        </ModalHeader>
        <ModalContent>
          <div className="space-y-6 text-center">
            <div className="flex justify-center">
              <QRCodeCanvas value={generatedLink} size={200} />
            </div>

            <div>
              <p className="text-xs uppercase tracking-widest text-slate-500 mb-2">
                Seu Link
              </p>
              <div className="flex items-center gap-2">
                <Input
                  value={generatedLink}
                  readOnly
                  className="flex-1 font-mono text-sm"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(generatedLink);
                    success('Link copiado!');
                  }}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <p className="text-sm text-slate-600">
              Compartilhe este link com seus clientes. Eles poderão visualizar o produto e demonstrar interesse.
            </p>
          </div>
        </ModalContent>
        <ModalFooter>
          <Button
            variant="secondary"
            onClick={() => window.open(generatedLink, '_blank')}
          >
            Abrir Preview
          </Button>
          <Button
            variant="primary"
            onClick={() => router.push('/links')}
          >
            Ver Meus Links
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}