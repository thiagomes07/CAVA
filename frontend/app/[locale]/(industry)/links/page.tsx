'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { Plus, Search, Copy, Edit2, Archive, Eye, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Pagination } from '@/components/shared/Pagination';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import { Modal, ModalHeader, ModalTitle, ModalContent, ModalFooter } from '@/components/ui/modal';
import { LinkDetailsModal } from '@/components/links/LinkDetailsModal';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/lib/hooks/useToast';
import { formatDate } from '@/lib/utils/formatDate';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { truncateText } from '@/lib/utils/truncateText';
import { TRUNCATION_LIMITS } from '@/lib/config/truncationLimits';
import type { SalesLink, LinkType } from '@/lib/types';
import type { LinkFilter } from '@/lib/schemas/link.schema';
import { cn } from '@/lib/utils/cn';

export default function LinksManagementPage() {
  const locale = useLocale();
  const router = useRouter();
  const { success, error } = useToast();
  const t = useTranslations('links');
  const tCommon = useTranslations('common');
  const tErrors = useTranslations('errors');

  const [links, setLinks] = useState<SalesLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedLink, setSelectedLink] = useState<SalesLink | null>(null);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const [filters, setFilters] = useState<LinkFilter>({
    type: '',
    status: '',
    search: '',
    page: 1,
    limit: 25,
  });

  useEffect(() => {
    fetchLinks();
  }, [filters]);

  const fetchLinks = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.get<{
        links: SalesLink[];
        total: number;
        page: number;
      }>('/sales-links', { params: filters });

      setLinks(data.links);
      setTotalItems(data.total);
    } catch (err) {
      error(t('loadError'));
      setLinks([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = async (link: SalesLink) => {
    try {
      const fullUrl = `${window.location.origin}/${locale}/${link.slugToken}`;
      await navigator.clipboard.writeText(fullUrl);
      success(t('linkCopied'));
    } catch (err) {
      error(tErrors('copyLink'));
    }
  };

  const handleArchiveLink = async (linkId: string) => {
    try {
      await apiClient.patch(`/sales-links/${linkId}`, { isActive: false });
      success(t('linkArchived'));
      fetchLinks();
    } catch (err) {
      error(tErrors('archiveLink'));
    }
  };

  const handleViewStats = (link: SalesLink) => {
    setSelectedLink(link);
    setShowStatsModal(true);
  };

  const handleOpenDetails = async (link: SalesLink) => {
    try {
      // Buscar detalhes completos do link (incluindo items para MULTIPLOS_LOTES)
      const fullLink = await apiClient.get<SalesLink>(`/sales-links/${link.id}`);
      setSelectedLink(fullLink);
      setShowDetailsModal(true);
    } catch (err) {
      // Fallback para dados da listagem se falhar
      setSelectedLink(link);
      setShowDetailsModal(true);
    }
  };

  const handleCloseDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedLink(null);
  };

  const handleArchiveLinkFromModal = async (link: SalesLink) => {
    await handleArchiveLink(link.id);
    handleCloseDetailsModal();
  };

  const handleClearFilters = () => {
    setFilters({
      type: '',
      status: '',
      search: '',
      page: 1,
      limit: 25,
    });
  };

  const hasFilters = filters.type || filters.status || filters.search;
  const isEmpty = links.length === 0;

  const getLinkTypeBadge = (type: LinkType) => {
    const variants: Record<LinkType, { label: string; color: string }> = {
      LOTE_UNICO: { label: t('typeSingleBatch'), color: 'bg-slate-100 text-slate-700 border-slate-200' },
      PRODUTO_GERAL: { label: t('typeProduct'), color: 'bg-slate-100 text-slate-700 border-slate-200' },
      CATALOGO_COMPLETO: { label: t('typeCatalog'), color: 'bg-slate-100 text-slate-700 border-slate-200' },
      MULTIPLOS_LOTES: { label: t('typeMultipleBatches') || 'Múltiplos Lotes', color: 'bg-slate-100 text-slate-700 border-slate-200' },
    };
    const variant = variants[type] || variants.LOTE_UNICO;
    return (
      <span className={cn('inline-flex items-center px-2.5 py-1 rounded-sm text-[10px] uppercase tracking-widest font-bold border', variant.color)}>
        {variant.label}
      </span>
    );
  };

  const getLinkStatus = (link: SalesLink) => {
    if (!link.isActive) return { label: t('statusArchived'), variant: 'INATIVO' as const };
    if (link.expiresAt && new Date(link.expiresAt) < new Date()) return { label: t('statusExpired'), variant: 'warning' as const };
    return { label: t('statusActive'), variant: 'DISPONIVEL' as const };
  };

  return (
    <div className="min-h-screen bg-mineral">
      {/* Header */}
      <div className="bg-porcelain border-b border-slate-100 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl text-obsidian mb-2">
              {t('title')}
            </h1>
            <p className="text-sm text-slate-500">
              {t('subtitle')}
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => router.push(`/${locale}/catalogos/new`)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Catálogo
            </Button>
            <Button
              variant="primary"
              onClick={() => router.push(`/${locale}/links/new`)}
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('newLink')}
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-8 py-6">
        <div className="bg-porcelain rounded-sm border border-slate-100 p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select
              value={filters.type}
              onChange={(e) =>
                setFilters({ 
                  ...filters, 
                  type: e.target.value as LinkFilter['type'], 
                  page: 1 
                })
              }
            >
              <option value="">{t('allTypes')}</option>
              <option value="LOTE_UNICO">{t('typeSingleBatch')}</option>
              <option value="PRODUTO_GERAL">{t('typeProduct')}</option>
              <option value="CATALOGO_COMPLETO">{t('typeCatalog')}</option>
            </Select>

            <Select
              value={filters.status}
              onChange={(e) =>
                setFilters({ 
                  ...filters, 
                  status: e.target.value as LinkFilter['status'], 
                  page: 1 
                })
              }
            >
              <option value="">{t('allStatuses')}</option>
              <option value="ATIVO">{t('statusActive')}</option>
              <option value="EXPIRADO">{t('statusExpired')}</option>
            </Select>

            <div className="relative">
              <Input
                placeholder={t('searchPlaceholder')}
                value={filters.search}
                onChange={(e) =>
                  setFilters({ ...filters, search: e.target.value, page: 1 })
                }
              />
              <Search className="absolute right-3 top-3 w-5 h-5 text-slate-400 pointer-events-none" />
            </div>

            <Button
              variant="secondary"
              onClick={handleClearFilters}
              disabled={!hasFilters}
            >
              {tCommon('clearFilters')}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-8 pb-8">
        {isLoading ? (
          <LoadingState variant="table" rows={10} columns={8} />
        ) : isEmpty ? (
          <EmptyState
            icon={hasFilters ? Search : Plus}
            title={
              hasFilters
                ? t('noResults')
                : t('emptyTitle')
            }
            description={
              hasFilters
                ? t('adjustFilters')
                : t('emptyDescription')
            }
            actionLabel={hasFilters ? tCommon('clearFilters') : t('newLink')}
            onAction={hasFilters ? handleClearFilters : () => router.push(`/${locale}/links/new`)}
          />
        ) : (
          <>
            <div className="bg-porcelain rounded-sm border border-slate-100 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('titleSlug')}</TableHead>
                    <TableHead>{t('type')}</TableHead>
                    <TableHead>{t('price')}</TableHead>
                    <TableHead>{t('views')}</TableHead>
                    <TableHead>{t('status')}</TableHead>
                    <TableHead>{t('createdAt')}</TableHead>
                    <TableHead>{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {links.map((link) => {
                    const status = getLinkStatus(link);

                    return (
                      <TableRow 
                        key={link.id} 
                        className="cursor-pointer hover:bg-slate-50 transition-colors"
                        onClick={() => handleOpenDetails(link)}
                      >
                        <TableCell>
                          <div>
                            <p
                              className="font-medium text-obsidian mb-1"
                              title={link.title || link.batch?.product?.name || link.product?.name || t('untitledLink')}
                            >
                              {truncateText(
                                link.title || link.batch?.product?.name || link.product?.name || t('untitledLink'),
                                TRUNCATION_LIMITS.LINK_TITLE
                              )}
                            </p>
                            <button
                              onClick={() => window.open(`/${locale}/${link.slugToken}`, '_blank')}
                              className="text-xs text-blue-600 hover:underline font-mono"
                              title={`/${locale}/${link.slugToken}`}
                            >
                              /{locale}/{truncateText(link.slugToken, TRUNCATION_LIMITS.SLUG)}
                            </button>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getLinkTypeBadge(link.linkType)}
                        </TableCell>
                        <TableCell>
                          {link.showPrice && link.displayPrice ? (
                            <span className="font-serif text-obsidian">
                              {formatCurrency(link.displayPrice)}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-sm">{t('onRequest')}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleViewStats(link); }}
                            className="flex items-center gap-2 text-sm text-slate-600 hover:text-obsidian transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                            <span className="font-mono">{link.viewsCount || 0}</span>
                          </button>
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-slate-500">
                            {formatDate(link.createdAt, 'dd/MM/yyyy')}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => window.open(`/${locale}/${link.slugToken}`, '_blank')}
                              className="p-2 hover:bg-slate-100 rounded-sm transition-colors"
                              title="Preview"
                            >
                              <ExternalLink className="w-4 h-4 text-slate-600" />
                            </button>
                            <button
                              onClick={() => handleCopyLink(link)}
                              className="p-2 hover:bg-slate-100 rounded-sm transition-colors"
                              title={t('copyLink')}
                            >
                              <Copy className="w-4 h-4 text-slate-600" />
                            </button>
                            <button
                              onClick={() => router.push(`/${locale}/links/${link.id}/edit`)}
                              className="p-2 hover:bg-slate-100 rounded-sm transition-colors"
                              title={t('edit')}
                            >
                              <Edit2 className="w-4 h-4 text-slate-600" />
                            </button>
                            {link.isActive && (
                              <button
                                onClick={() => handleArchiveLink(link.id)}
                                className="p-2 hover:bg-rose-50 rounded-sm transition-colors"
                                title={t('archive')}
                              >
                                <Archive className="w-4 h-4 text-rose-600" />
                              </button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <Pagination
              currentPage={filters.page}
              totalPages={Math.ceil(totalItems / filters.limit)}
              totalItems={totalItems}
              itemsPerPage={filters.limit}
              onPageChange={(page) => setFilters({ ...filters, page })}
            />
          </>
        )}
      </div>

      {/* Stats Modal */}
      <Modal open={showStatsModal} onClose={() => setShowStatsModal(false)}>
        <ModalHeader>
          <ModalTitle>{t('linkStats')}</ModalTitle>
        </ModalHeader>
        <ModalContent>
          {selectedLink && (
            <div className="space-y-6">
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-500 mb-2">
                  {t('titleLabel')}
                </p>
                <p 
                  className="text-lg font-semibold text-obsidian"
                  title={selectedLink.title || t('untitledLink')}
                >
                  {truncateText(selectedLink.title || t('untitledLink'), TRUNCATION_LIMITS.MODAL_TITLE)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-100 rounded-sm">
                  <p className="text-xs uppercase tracking-widest text-slate-600 mb-1">
                    {t('views')}
                  </p>
                  <p className="text-3xl font-mono font-bold text-slate-700">
                    {selectedLink.viewsCount || 0}
                  </p>
                </div>
                <div className="p-4 bg-slate-100 rounded-sm">
                  <p className="text-xs uppercase tracking-widest text-slate-600 mb-1">
                    {t('capturedClientes')}
                  </p>
                  <p className="text-3xl font-mono font-bold text-slate-700">
                    0
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs uppercase tracking-widest text-slate-500 mb-2">
                  {t('publicLink')}
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    value={`${window.location.origin}/${locale}/${selectedLink.slugToken}`}
                    readOnly
                    className="flex-1 font-mono text-sm"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleCopyLink(selectedLink)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </ModalContent>
        <ModalFooter>
          <Button
            variant="secondary"
            onClick={() => setShowStatsModal(false)}
          >
            {tCommon('close')}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Link Details Modal */}
      {showDetailsModal && selectedLink && (
        <LinkDetailsModal
          link={selectedLink}
          onClose={handleCloseDetailsModal}
          onCopyLink={handleCopyLink}
          onArchive={handleArchiveLinkFromModal}
        />
      )}
    </div>
  );
}