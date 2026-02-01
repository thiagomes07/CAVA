'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Search, X, MessageSquare, Mail, AlertTriangle } from 'lucide-react';
import { Modal, ModalHeader, ModalTitle, ModalContent, ModalFooter, ModalClose } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import { apiClient } from '@/lib/api/client';
import type { SalesLink, Cliente } from '@/lib/types';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { truncateText } from '@/lib/utils/truncateText';
import { TRUNCATION_LIMITS } from '@/lib/config/truncationLimits';
import {
  formatWhatsAppMessage,
  validateWhatsAppMessage,
  filterActiveLinks,
  generateWhatsAppUrl
} from '@/lib/utils/shareUtils';
import { cn } from '@/lib/utils/cn';

export interface ShareSelection {
  salesLinkIds: string[];
  customMessage?: string;
}

interface ShareLinksModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (selection: ShareSelection) => void;
  mode: 'whatsapp' | 'email';
  cliente?: Cliente; // Se for ação por contato individual
  multipleClientes?: number; // Quantidade se for envio em massa
  isLoading?: boolean;
}

export function ShareLinksModal({
  open,
  onClose,
  onConfirm,
  mode,
  cliente,
  multipleClientes,
  isLoading = false
}: ShareLinksModalProps) {
  const t = useTranslations('clientes');
  const tCommon = useTranslations('common');
  const locale = useLocale();

  const [links, setLinks] = useState<SalesLink[]>([]);
  const [isLoadingLinks, setIsLoadingLinks] = useState(false);
  const [selectedLinkIds, setSelectedLinkIds] = useState<Set<string>>(new Set());
  const [customMessage, setCustomMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [linkMode, setLinkMode] = useState<'BATCH' | 'CATALOG'>('BATCH');

  // Buscar links ao abrir o modal
  useEffect(() => {
    if (open) {
      fetchLinks();
    } else {
      // Limpar ao fechar
      setSelectedLinkIds(new Set());
      setCustomMessage('');
      setSearchTerm('');
    }
  }, [open]);

  const fetchLinks = async () => {
    try {
      setIsLoadingLinks(true);
      const data = await apiClient.get<{ links: SalesLink[] }>('/sales-links', {
        params: { limit: 1000 }
      });

      // Filtrar apenas links ativos e não expirados
      const activeLinks = filterActiveLinks(data.links);
      setLinks(activeLinks);
    } catch (error) {
      console.error('Error loading links:', error);
      setLinks([]);
    } finally {
      setIsLoadingLinks(false);
    }
  };

  // Filtrar e buscar links
  const filteredLinks = useMemo(() => {
    let filtered = links;

    // Filter by Mode
    if (linkMode === 'CATALOG') {
      filtered = filtered.filter(link => link.linkType === 'CATALOGO_COMPLETO');
    } else {
      // Batch Mode: Anything NOT Catalogo Completo (Lotes, Produtos, Multiplos)
      filtered = filtered.filter(link => link.linkType !== 'CATALOGO_COMPLETO');
    }

    // Busca por texto
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(link => {
        const title = link.title || link.batch?.product?.name || link.product?.name || '';
        const slug = link.slugToken || '';
        return (
          title.toLowerCase().includes(searchLower) ||
          slug.toLowerCase().includes(searchLower)
        );
      });
    }

    return filtered;
  }, [links, linkMode, searchTerm]);

  // Links selecionados para preview
  const selectedLinks = useMemo(() => {
    return links.filter(link => selectedLinkIds.has(link.id));
  }, [links, selectedLinkIds]);

  // Preview da mensagem (apenas para WhatsApp)
  const whatsappPreview = useMemo(() => {
    if (mode !== 'whatsapp' || !cliente || selectedLinks.length === 0) {
      return null;
    }

    const message = formatWhatsAppMessage(
      selectedLinks,
      cliente.name,
      customMessage || undefined,
      locale
    );

    const validation = validateWhatsAppMessage(message);

    return {
      message,
      validation
    };
  }, [mode, cliente, selectedLinks, customMessage, locale]);

  const handleSelectLink = (linkId: string, checked: boolean) => {
    const newSet = new Set(selectedLinkIds);
    if (checked) {
      newSet.add(linkId);
    } else {
      newSet.delete(linkId);
    }
    setSelectedLinkIds(newSet);
  };

  const handleSelectAll = () => {
    if (selectedLinkIds.size === filteredLinks.length) {
      setSelectedLinkIds(new Set());
    } else {
      setSelectedLinkIds(new Set(filteredLinks.map(l => l.id)));
    }
  };

  const handleConfirm = () => {
    if (selectedLinkIds.size === 0) return;

    // Se for WhatsApp individual, redirecionar diretamente
    if (mode === 'whatsapp' && cliente && whatsappPreview) {
      if (!whatsappPreview.validation.valid) return;

      const url = generateWhatsAppUrl(cliente.whatsapp || '', whatsappPreview.message);
      window.open(url, '_blank');
      onClose();
      return;
    }

    // Se for email, chamar callback
    onConfirm({
      salesLinkIds: Array.from(selectedLinkIds),
      customMessage: customMessage || undefined
    });
  };

  const getLinkTypeBadge = (linkType: string) => {
    const variants: Record<string, { label: string; color: string }> = {
      LOTE_UNICO: { label: 'Lote Único', color: 'bg-blue-50 text-blue-700 border-blue-200' },
      PRODUTO_GERAL: { label: 'Produto', color: 'bg-purple-50 text-purple-700 border-purple-200' },
      CATALOGO_COMPLETO: { label: 'Catálogo', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
      MULTIPLOS_LOTES: { label: 'Múltiplos', color: 'bg-amber-50 text-amber-700 border-amber-200' }
    };
    const variant = variants[linkType] || variants.LOTE_UNICO;
    return (
      <span className={cn('inline-flex items-center px-2 py-0.5 rounded-sm text-[10px] uppercase tracking-wider font-bold border', variant.color)}>
        {variant.label}
      </span>
    );
  };

  const canConfirm = selectedLinkIds.size > 0 && !isLoading;
  const whatsappInvalid = mode === 'whatsapp' && whatsappPreview ? !whatsappPreview.validation.valid : false;
  const confirmDisabled = !canConfirm || whatsappInvalid;

  return (
    <Modal open={open} onClose={onClose}>
      <ModalClose onClose={onClose} />
      <ModalHeader>
        <div className="flex items-center gap-3">
          {mode === 'whatsapp' ? (
            <MessageSquare className="w-5 h-5 text-emerald-600" />
          ) : (
            <Mail className="w-5 h-5 text-blue-600" />
          )}
          <div>
            <ModalTitle>
              {mode === 'whatsapp' ? t('shareViaWhatsApp') : t('shareViaEmail')}
            </ModalTitle>
            {cliente && (
              <p className="text-sm text-slate-500 mt-1">
                {cliente.name}
              </p>
            )}
            {multipleClientes && multipleClientes > 1 && (
              <p className="text-sm text-slate-500 mt-1">
                {multipleClientes} {t('selectedClients', { count: multipleClientes })}
              </p>
            )}
          </div>
        </div>
      </ModalHeader>

      <ModalContent>
        <div className="space-y-4">
          {/* Filtros */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder={t('searchLinks')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex p-1 bg-slate-100 rounded-sm border border-slate-200">
              <button
                onClick={() => setLinkMode('BATCH')}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-sm transition-all min-w-[80px]",
                  linkMode === 'BATCH'
                    ? "bg-white text-obsidian shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                Lotes
              </button>
              <button
                onClick={() => setLinkMode('CATALOG')}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-sm transition-all min-w-[80px]",
                  linkMode === 'CATALOG'
                    ? "bg-white text-obsidian shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                Catálogos
              </button>
            </div>
          </div>

          {/* Indicador de seleção */}
          {selectedLinkIds.size > 0 && (
            <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-sm">
              <p className="text-sm text-blue-700 font-medium">
                {t('selectedLinks', { count: selectedLinkIds.size })}
              </p>
              <button
                onClick={() => setSelectedLinkIds(new Set())}
                className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
              >
                {t('deselectAll')}
              </button>
            </div>
          )}

          {/* Lista de links */}
          <div className="border border-slate-200 rounded-sm">
            {isLoadingLinks ? (
              <div className="p-8">
                <LoadingState variant="table" rows={3} />
              </div>
            ) : filteredLinks.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon={Search}
                  title={t('noLinksAvailable')}
                  description={t('noLinksAvailableDescription')}
                  actionLabel={t('goToLinks')}
                  onAction={() => window.location.href = `/${locale}/links`}
                />
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                <div className="sticky top-0 bg-slate-50 border-b border-slate-200 p-3">
                  <button
                    onClick={handleSelectAll}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {selectedLinkIds.size === filteredLinks.length ? t('deselectAll') : t('selectAll')}
                  </button>
                </div>
                <div className="divide-y divide-slate-200">
                  {filteredLinks.map((link) => {
                    const isSelected = selectedLinkIds.has(link.id);
                    const title = link.title || link.batch?.product?.name || link.product?.name || 'Link sem título';

                    return (
                      <div
                        key={link.id}
                        className={cn(
                          'flex items-start gap-3 p-4 cursor-pointer transition-colors',
                          isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'
                        )}
                        onClick={() => handleSelectLink(link.id, !isSelected)}
                      >
                        <div className="pt-0.5">
                          <Checkbox
                            id={`link-${link.id}`}
                            checked={isSelected}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleSelectLink(link.id, e.target.checked);
                            }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="font-medium text-obsidian" title={title}>
                              {truncateText(title, TRUNCATION_LIMITS.LINK_TITLE)}
                            </p>
                            {getLinkTypeBadge(link.linkType)}
                          </div>
                          <p className="text-xs text-slate-500 font-mono">
                            /{link.slugToken}
                          </p>
                          {link.showPrice && link.displayPrice && (
                            <p className="text-sm text-emerald-600 font-semibold mt-1">
                              {formatCurrency(link.displayPrice)}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Mensagem personalizada */}
          <div>
            <label className="block text-sm font-medium text-obsidian mb-2">
              {t('customMessage')}
            </label>
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder={t('customMessagePlaceholder')}
              rows={3}
              className="w-full px-3 py-2 border border-slate-200 rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-obsidian/20 resize-none"
            />
          </div>

          {/* Preview do WhatsApp */}
          {mode === 'whatsapp' && whatsappPreview && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-obsidian">
                  {t('messagePreview')}
                </label>
                <span className={cn(
                  'text-xs font-mono',
                  whatsappPreview.validation.valid
                    ? whatsappPreview.validation.warning
                      ? 'text-amber-600'
                      : 'text-slate-500'
                    : 'text-rose-600'
                )}>
                  {t('whatsappLimit', {
                    current: whatsappPreview.validation.length,
                    max: whatsappPreview.validation.maxLength
                  })}
                </span>
              </div>
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-sm max-h-48 overflow-y-auto">
                <pre className="text-xs whitespace-pre-wrap font-sans text-slate-700">
                  {whatsappPreview.message}
                </pre>
              </div>
              {!whatsappPreview.validation.valid && (
                <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-200 rounded-sm">
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-rose-700">
                    {t('whatsappLimitExceeded', { max: whatsappPreview.validation.maxLength })}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </ModalContent>

      <ModalFooter>
        <Button
          variant="secondary"
          onClick={onClose}
          disabled={isLoading}
        >
          {tCommon('cancel')}
        </Button>
        <Button
          variant="primary"
          onClick={handleConfirm}
          disabled={confirmDisabled}
          className={cn(
            mode === 'whatsapp'
              ? 'bg-emerald-600 hover:bg-emerald-700'
              : 'bg-blue-600 hover:bg-blue-700'
          )}
        >
          {isLoading ? (
            <>
              <span className="animate-spin mr-2">⏳</span>
              {t('sending')}
            </>
          ) : mode === 'whatsapp' ? (
            <>
              <MessageSquare className="w-4 h-4 mr-2" />
              {t('openWhatsApp')}
            </>
          ) : (
            <>
              <Mail className="w-4 h-4 mr-2" />
              {t('sendEmail')}
            </>
          )}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
