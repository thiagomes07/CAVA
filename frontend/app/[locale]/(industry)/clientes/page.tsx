'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Download, Search, Mail, Phone, MessageSquare, Check, User, Inbox, Copy, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Pagination } from '@/components/shared/Pagination';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import { Modal, ModalHeader, ModalTitle, ModalContent, ModalFooter, ModalClose } from '@/components/ui/modal';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/lib/hooks/useToast';
import { formatDate } from '@/lib/utils/formatDate';
import { truncateText } from '@/lib/utils/truncateText';
import { TRUNCATION_LIMITS } from '@/lib/config/truncationLimits';
import type { Cliente, SalesLink } from '@/lib/types';
import type { ClienteFilter } from '@/lib/schemas/cliente.schema';
import { clienteStatuses } from '@/lib/schemas/cliente.schema';
import { cn } from '@/lib/utils/cn';

export default function ClientesManagementPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { success, error } = useToast();
  const t = useTranslations('clientes');
  const tCommon = useTranslations('common');

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [salesLinks, setSalesLinks] = useState<SalesLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const [filters, setFilters] = useState<ClienteFilter>({
    search: searchParams.get('search') || '',
    linkId: searchParams.get('linkId') || '',
    startDate: '',
    endDate: '',
    optIn: undefined,
    status: '',
    page: parseInt(searchParams.get('page') || '1'),
    limit: 50,
  });

  useEffect(() => {
    fetchSalesLinks();
  }, []);

  useEffect(() => {
    fetchClientes();
  }, [filters]);

  const fetchSalesLinks = async () => {
    try {
      const data = await apiClient.get<{ links: SalesLink[] }>('/sales-links', {
        params: { limit: 1000 },
      });
      setSalesLinks(data.links);
    } catch (err) {
      console.error('Error loading links:', err);
    }
  };

  const fetchClientes = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.get<{
        clientes: Cliente[];
        total: number;
        page: number;
      }>('/clientes', { params: filters });

      setClientes(data.clientes);
      setTotalItems(data.total);
    } catch (err) {
      error(t('loadError'));
      setClientes([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (clienteId: string, newStatus: typeof clienteStatuses[number]) => {
    try {
      setIsUpdatingStatus(true);
      
      await apiClient.patch(`/clientes/${clienteId}/status`, {
        status: newStatus,
      });

      success(t('statusUpdated'));
      fetchClientes();
      
      if (selectedCliente?.id === clienteId) {
        setSelectedCliente({ ...selectedCliente, status: newStatus });
      }
    } catch (err) {
      error(t('statusError'));
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleViewDetails = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setShowDetailModal(true);
  };

  const handleExport = async () => {
    try {
      success(t('exportStarted'));
      // Implementar lógica de exportação CSV
    } catch (err) {
      error(t('exportError'));
    }
  };

  const handleClearFilters = () => {
    setFilters({
      search: '',
      linkId: '',
      startDate: '',
      endDate: '',
      optIn: undefined,
      status: '',
      page: 1,
      limit: 50,
    });
    router.push('/clientes');
  };

  const handleCopyContact = async (contact: string) => {
    try {
      await navigator.clipboard.writeText(contact);
      success(t('contactCopied'));
    } catch (err) {
      error(t('copyError'));
    }
  };

  const hasFilters = filters.search || filters.linkId || filters.startDate || filters.endDate || filters.status;
  const isEmpty = clientes.length === 0;

  const getStatusBadge = (status: 'NOVO' | 'CONTATADO' | 'RESOLVIDO') => {
    const variants: Record<'NOVO' | 'CONTATADO' | 'RESOLVIDO', string> = {
      NOVO: 'bg-blue-50 text-blue-700 border-blue-200',
      CONTATADO: 'bg-amber-50 text-amber-700 border-amber-200',
      RESOLVIDO: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    };
    return variants[status];
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
          <Button variant="secondary" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            {t('exportCsv')}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="px-8 py-6">
        <div className="bg-porcelain rounded-sm border border-slate-100 p-6">
          <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end md:gap-4">
            <div className="relative w-full md:w-auto md:min-w-[240px]">
              <Input
                placeholder={t('searchPlaceholder')}
                value={filters.search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFilters({ ...filters, search: e.target.value, page: 1 })
                }
                className="pr-10"
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
            </div>

            <div className="w-full md:w-auto md:min-w-[200px]">
              <Select
                value={filters.linkId}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setFilters({ ...filters, linkId: e.target.value, page: 1 })
                }
              >
                <option value="">{t('allLinks')}</option>
                {salesLinks.map((link) => (
                  <option key={link.id} value={link.id} title={link.title || link.slugToken}>
                    {truncateText(link.title || link.slugToken, TRUNCATION_LIMITS.SELECT_OPTION)}
                  </option>
                ))}
              </Select>
            </div>

            <div className="w-full md:w-auto md:min-w-[180px]">
              <Select
                value={filters.status}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setFilters({ ...filters, status: e.target.value as '' | 'NOVO' | 'CONTATADO' | 'RESOLVIDO', page: 1 })
                }
              >
                <option value="">{t('allStatuses')}</option>
                <option value="NOVO">{t('statusNew')}</option>
                <option value="CONTATADO">{t('statusContacted')}</option>
                <option value="RESOLVIDO">{t('statusResolved')}</option>
              </Select>
            </div>

            <div className="w-full md:w-auto md:min-w-[170px]">
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFilters({ ...filters, startDate: e.target.value, page: 1 })
                }
              />
            </div>

            <div className="w-full md:w-auto md:ml-auto">
              <Button
                variant="secondary"
                onClick={handleClearFilters}
                disabled={!hasFilters}
                className="w-full md:w-auto h-[48px] px-6"
              >
                {tCommon('clearFilters')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-8 pb-8">
        {isLoading ? (
          <LoadingState variant="table" rows={10} columns={7} />
        ) : isEmpty ? (
          <EmptyState
            icon={hasFilters ? Search : Inbox}
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
            actionLabel={hasFilters ? tCommon('clearFilters') : undefined}
            onAction={hasFilters ? handleClearFilters : undefined}
          />
        ) : (
          <>
            <div className="bg-porcelain rounded-sm border border-slate-100 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('name')}</TableHead>
                    <TableHead>{t('contact')}</TableHead>
                    <TableHead>{t('origin')}</TableHead>
                    <TableHead>{t('interestedProduct')}</TableHead>
                    <TableHead>{t('message')}</TableHead>
                    <TableHead>{t('optIn')}</TableHead>
                    <TableHead>{t('status')}</TableHead>
                    <TableHead>{t('date')}</TableHead>
                    <TableHead>{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientes.map((cliente) => {
                    const isEmail = cliente.contact.includes('@');
                    
                    return (
                      <TableRow 
                        key={cliente.id}
                        className="cursor-pointer"
                        onClick={() => handleViewDetails(cliente)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-slate-400" />
                            <span 
                              className="font-medium text-obsidian"
                              title={cliente.name}
                            >
                              {truncateText(cliente.name, TRUNCATION_LIMITS.USER_NAME_SHORT)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyContact(cliente.contact);
                            }}
                            className="flex items-center gap-2 text-sm text-slate-600 hover:text-obsidian transition-colors"
                            title={cliente.contact}
                          >
                            {isEmail ? (
                              <Mail className="w-4 h-4" />
                            ) : (
                              <Phone className="w-4 h-4" />
                            )}
                            <span>{truncateText(cliente.contact, TRUNCATION_LIMITS.CONTACT)}</span>
                          </button>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p 
                              className="text-sm text-slate-600"
                              title={cliente.salesLink?.title || cliente.salesLink?.slugToken}
                            >
                              {truncateText(cliente.salesLink?.title || cliente.salesLink?.slugToken, TRUNCATION_LIMITS.LINK_TITLE) || '-'}
                            </p>
                            {cliente.salesLink && (
                              <Badge
                                variant="default"
                                className="mt-1"
                              >
                                {cliente.salesLink.linkType.replace('_', ' ')}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span 
                            className="text-sm text-slate-600"
                            title={cliente.salesLink?.batch?.product?.name || cliente.salesLink?.product?.name || 'Catálogo'}
                          >
                            {truncateText(
                              cliente.salesLink?.batch?.product?.name ||
                                cliente.salesLink?.product?.name ||
                                'Catálogo',
                              TRUNCATION_LIMITS.PRODUCT_NAME_SHORT
                            )}
                          </span>
                        </TableCell>
                        <TableCell>
                          {cliente.message ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewDetails(cliente);
                              }}
                              className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                            >
                              <MessageSquare className="w-4 h-4" />
                              {t('viewMessage')}
                            </button>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {cliente.marketingOptIn ? (
                            <Check className="w-5 h-5 text-emerald-600" />
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                            <Select
                              value={cliente.status}
                              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleUpdateStatus(cliente.id, e.target.value as 'NOVO' | 'CONTATADO' | 'RESOLVIDO')}
                              disabled={isUpdatingStatus}
                              className="text-xs"
                            >
                              <option value="NOVO">{t('statusNew')}</option>
                              <option value="CONTATADO">{t('statusContacted')}</option>
                              <option value="RESOLVIDO">{t('statusResolved')}</option>
                            </Select>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-slate-500">
                            {formatDate(cliente.createdAt)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                              e.stopPropagation();
                              handleViewDetails(cliente);
                            }}
                          >
                            {t('viewDetails')}
                          </Button>
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
              onPageChange={(page: number) => setFilters({ ...filters, page })}
            />
          </>
        )}
      </div>

      {/* Detail Modal */}
      <Modal open={showDetailModal} onClose={() => setShowDetailModal(false)}>
        <ModalClose onClose={() => setShowDetailModal(false)} />
        <ModalHeader>
          <ModalTitle>{t('clienteDetails')}</ModalTitle>
        </ModalHeader>
        <ModalContent>
          {selectedCliente && (
            <div className="space-y-6">
              {/* Contact Info */}
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-500 mb-3">
                  {t('contactInfo')}
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-sm text-slate-500">{t('name')}</p>
                      <p className="font-medium text-obsidian">{selectedCliente.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {selectedCliente.contact.includes('@') ? (
                      <Mail className="w-5 h-5 text-slate-400" />
                    ) : (
                      <Phone className="w-5 h-5 text-slate-400" />
                    )}
                    <div>
                      <p className="text-sm text-slate-500">{t('contact')}</p>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-obsidian">{selectedCliente.contact}</p>
                        <button
                          onClick={() => handleCopyContact(selectedCliente.contact)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Message */}
              {selectedCliente.message && (
                <div>
                  <p className="text-xs uppercase tracking-widest text-slate-500 mb-3">
                    {t('message')}
                  </p>
                  <div className="p-4 bg-slate-50 rounded-sm">
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">
                      {selectedCliente.message}
                    </p>
                  </div>
                </div>
              )}

              {/* Origin */}
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-500 mb-3">
                  {t('clienteOrigin')}
                </p>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-sm">
                  <p className="text-sm font-semibold text-blue-900 mb-1">
                    {selectedCliente.salesLink?.title || t('untitledLink')}
                  </p>
                  <p className="text-xs text-blue-700 mb-2">
                    /{selectedCliente.salesLink?.slugToken}
                  </p>
                  {selectedCliente.salesLink?.batch && (
                    <p className="text-sm text-blue-800">
                      {t('batch')}: {selectedCliente.salesLink.batch.batchCode} •{' '}
                      {selectedCliente.salesLink.batch.product?.name}
                    </p>
                  )}
                  {selectedCliente.salesLink?.product && (
                    <p className="text-sm text-blue-800">
                      {t('productLabel')}: {selectedCliente.salesLink.product.name}
                    </p>
                  )}
                </div>
              </div>

              {/* Marketing Opt-in */}
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-sm">
                {selectedCliente.marketingOptIn ? (
                  <>
                    <Check className="w-5 h-5 text-emerald-600" />
                    <p className="text-sm text-slate-600">
                      {t('optInAccepted')}
                    </p>
                  </>
                ) : (
                  <>
                    <X className="w-5 h-5 text-slate-400" />
                    <p className="text-sm text-slate-600">
                      {t('optInDeclined')}
                    </p>
                  </>
                )}
              </div>

              {/* Status */}
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-500 mb-3">
                  {t('clienteStatus')}
                </p>
                <Select
                  value={selectedCliente.status}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleUpdateStatus(selectedCliente.id, e.target.value as 'NOVO' | 'CONTATADO' | 'RESOLVIDO')}
                  disabled={isUpdatingStatus}
                >
                  <option value="NOVO">{t('statusNew')}</option>
                  <option value="CONTATADO">{t('statusContacted')}</option>
                  <option value="RESOLVIDO">{t('statusResolved')}</option>
                </Select>
              </div>

              {/* Metadata */}
              <div className="pt-4 border-t border-slate-200">
                <p className="text-xs text-slate-500">
                  {t('clienteCapturedAt', { date: formatDate(selectedCliente.createdAt, 'dd/MM/yyyy HH:mm') })}
                </p>
              </div>
            </div>
          )}
        </ModalContent>
        <ModalFooter>
          <Button
            variant="secondary"
            onClick={() => setShowDetailModal(false)}
          >
            {tCommon('close')}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}