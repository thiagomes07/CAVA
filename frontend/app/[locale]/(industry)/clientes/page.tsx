'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm, useController } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Download, Search, Mail, Phone, MessageSquare, Check, User, Inbox, Copy, X, Plus, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Pagination } from '@/components/shared/Pagination';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import { Modal, ModalHeader, ModalTitle, ModalContent, ModalFooter, ModalClose } from '@/components/ui/modal';
import { apiClient, ApiError } from '@/lib/api/client';
import { useToast } from '@/lib/hooks/useToast';
import { formatDate } from '@/lib/utils/formatDate';
import { truncateText } from '@/lib/utils/truncateText';
import { TRUNCATION_LIMITS } from '@/lib/config/truncationLimits';
import { useSendLinksToClientes } from '@/lib/api/mutations/useLeadMutations';
import formatPhoneInput, { sanitizePhone } from '@/lib/utils/formatPhoneInput';
import type { Cliente, SalesLink, SendLinksResponse } from '@/lib/types';
import type { ClienteFilter } from '@/lib/schemas/lead.schema';
import { clienteStatuses } from '@/lib/schemas/lead.schema';
import { cn } from '@/lib/utils/cn';

// Schema for creating a new cliente
const createClienteSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(100),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional().refine(
    (val) => !val || /^\d{10,11}$/.test(val.replace(/\D/g, '')),
    'Telefone inválido'
  ),
  message: z.string().max(500).optional(),
  marketingOptIn: z.boolean(),
}).refine((data) => {
  // Pelo menos email ou telefone deve ser preenchido
  const hasEmail = data.email && data.email.trim() !== '';
  const hasPhone = data.phone && data.phone.replace(/\D/g, '').length >= 10;
  return hasEmail || hasPhone;
}, {
  message: 'Informe pelo menos o email ou telefone',
  path: ['email'],
});

type CreateClienteForm = z.infer<typeof createClienteSchema>;

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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSendLinksModal, setShowSendLinksModal] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Selection state
  const [selectedClienteIds, setSelectedClienteIds] = useState<Set<string>>(new Set());
  const [selectedLinkIds, setSelectedLinkIds] = useState<Set<string>>(new Set());
  const [customMessage, setCustomMessage] = useState('');

  // Send links mutation
  const sendLinksMutation = useSendLinksToClientes();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<CreateClienteForm>({
    resolver: zodResolver(createClienteSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      message: '',
      marketingOptIn: false,
    },
  });

  const { field: phoneField } = useController({ name: 'phone', control, defaultValue: '' });

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

  const fetchClientes = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.get<{
        clientes: Cliente[];
        total: number;
        page: number;
      }>('/clientes', { params: filters });

      setClientes(data.clientes);
      setTotalItems(data.total);
    } catch {
      error(t('loadError'));
      setClientes([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters, error, t]);

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

  useEffect(() => {
    fetchSalesLinks();
  }, []);

  useEffect(() => {
    fetchClientes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // Filter active links only
  const activeLinks = useMemo(() => {
    return salesLinks.filter(link => link.isActive && (!link.expiresAt || new Date(link.expiresAt) > new Date()));
  }, [salesLinks]);

  // Check if client has valid email
  const isValidEmail = (contact: string) => contact.includes('@');

  // Selection handlers
  const handleSelectCliente = (clienteId: string, checked: boolean) => {
    const newSet = new Set(selectedClienteIds);
    if (checked) {
      newSet.add(clienteId);
    } else {
      newSet.delete(clienteId);
    }
    setSelectedClienteIds(newSet);
  };

  const handleSelectAllClientes = () => {
    if (selectedClienteIds.size === clientes.length) {
      setSelectedClienteIds(new Set());
    } else {
      setSelectedClienteIds(new Set(clientes.map(c => c.id)));
    }
  };

  const handleSelectLink = (linkId: string, checked: boolean) => {
    const newSet = new Set(selectedLinkIds);
    if (checked) {
      newSet.add(linkId);
    } else {
      newSet.delete(linkId);
    }
    setSelectedLinkIds(newSet);
  };

  const handleOpenSendLinksModal = () => {
    if (selectedClienteIds.size === 0) {
      error(t('noClientsSelected'));
      return;
    }
    setSelectedLinkIds(new Set());
    setCustomMessage('');
    setShowSendLinksModal(true);
  };

  const handleSendLinks = async () => {
    if (selectedLinkIds.size === 0) {
      error(t('noLinksSelected'));
      return;
    }

    try {
      const result: SendLinksResponse = await sendLinksMutation.mutateAsync({
        clienteIds: Array.from(selectedClienteIds),
        salesLinkIds: Array.from(selectedLinkIds),
        customMessage: customMessage || undefined,
      });

      // Show appropriate message based on results
      if (result.totalFailed === 0 && result.totalSkipped === 0) {
        success(t('sendSuccess', { sent: result.totalSent }));
      } else {
        success(t('sendPartialSuccess', {
          sent: result.totalSent,
          failed: result.totalFailed,
          skipped: result.totalSkipped,
        }));
      }

      setShowSendLinksModal(false);
      setSelectedClienteIds(new Set());
      setSelectedLinkIds(new Set());
      setCustomMessage('');
      fetchClientes();
    } catch (err) {
      if (err instanceof ApiError) {
        error(err.message);
      } else {
        error(t('sendError'));
      }
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
    } catch {
      error(t('statusError'));
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleCreateCliente = async (data: CreateClienteForm) => {
    try {
      setIsCreating(true);
      
      // Combina email e phone em contact para compatibilidade com o backend
      // Prioriza email se ambos forem preenchidos
      const contact = data.email && data.email.trim() !== '' 
        ? data.email.trim() 
        : sanitizePhone(data.phone);
      
      await apiClient.post('/clientes', {
        name: data.name,
        contact,
        message: data.message,
        marketingOptIn: data.marketingOptIn,
      });
      success(t('clienteCreated'));
      setShowCreateModal(false);
      reset();
      fetchClientes();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'CONFLICT') {
        error(t('contactAlreadyExists'));
      } else {
        error(t('createError'));
      }
    } finally {
      setIsCreating(false);
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
    } catch {
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
    } catch {
      error(t('copyError'));
    }
  };

  const hasFilters = filters.search || filters.linkId || filters.startDate || filters.endDate || filters.status;
  const isEmpty = clientes.length === 0;

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
          <div className="flex items-center gap-3">
            {selectedClienteIds.size > 0 && (
              <Button
                variant="primary"
                onClick={handleOpenSendLinksModal}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Send className="w-4 h-4 mr-2" />
                {t('sendLinks')} ({selectedClienteIds.size})
              </Button>
            )}
            <Button variant="primary" onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t('addCliente')}
            </Button>
            <Button variant="secondary" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              {t('exportCsv')}
            </Button>
          </div>
        </div>
      </div>

      {/* Selection indicator */}
      {selectedClienteIds.size > 0 && (
        <div className="bg-blue-50 border-b border-blue-200 px-8 py-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-blue-700">
              {t('selectedClients', { count: selectedClienteIds.size })}
            </p>
            <button
              onClick={() => setSelectedClienteIds(new Set())}
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
            >
              {t('deselectAll')}
            </button>
          </div>
        </div>
      )}

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
                    <TableHead className="w-12">
                      <Checkbox
                        id="select-all"
                        checked={selectedClienteIds.size === clientes.length && clientes.length > 0}
                        onChange={handleSelectAllClientes}
                      />
                    </TableHead>
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
                    const isSelected = selectedClienteIds.has(cliente.id);

                    return (
                      <TableRow
                        key={cliente.id}
                        className={cn(
                          "cursor-pointer transition-colors",
                          isSelected && "bg-blue-50"
                        )}
                        onClick={() => handleViewDetails(cliente)}
                      >
                        <TableCell onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                          <Checkbox
                            id={`select-${cliente.id}`}
                            checked={isSelected}
                            onChange={(e) => handleSelectCliente(cliente.id, e.target.checked)}
                          />
                        </TableCell>
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
                          className="text-blue-600 hover:text-blue-700 cursor-pointer"
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
                {selectedCliente.salesLinkId ? (
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
                ) : (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-sm">
                    <p className="text-sm font-semibold text-slate-700">
                      {t('manuallyCreated')}
                    </p>
                    <p className="text-xs text-slate-500">
                      {t('manuallyCreatedDescription')}
                    </p>
                  </div>
                )}
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

      {/* Create Cliente Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-5 bg-[#121212] text-white flex items-center justify-between">
              <div>
                <h2 className="font-serif text-xl">{t('addClienteTitle')}</h2>
                <p className="text-xs text-white/50 mt-0.5">Cadastre um novo cliente manualmente</p>
              </div>
              <button 
                onClick={() => { setShowCreateModal(false); reset(); }} 
                className="p-2 -mr-2 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="h-1 bg-[#C2410C]" />

            <form onSubmit={handleSubmit(handleCreateCliente)}>
              <div className="px-6 py-6 space-y-5 max-h-[60vh] overflow-y-auto">
                {/* Name */}
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-2">
                    {t('name')} <span className="text-[#C2410C]">*</span>
                  </label>
                  <input
                    {...register('name')}
                    placeholder={t('namePlaceholder')}
                    className={cn(
                      'w-full px-3 py-2.5 bg-slate-50 border focus:border-[#C2410C] focus:bg-white outline-none text-sm transition-colors',
                      errors.name ? 'border-rose-500' : 'border-slate-200'
                    )}
                  />
                  {errors.name && <p className="mt-1 text-xs text-rose-500">{errors.name.message}</p>}
                </div>

                {/* Email */}
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-2">
                    {tCommon('email')}
                  </label>
                  <input
                    {...register('email')}
                    type="email"
                    placeholder={t('emailPlaceholder')}
                    className={cn(
                      'w-full px-3 py-2.5 bg-slate-50 border focus:border-[#C2410C] focus:bg-white outline-none text-sm transition-colors',
                      errors.email ? 'border-rose-500' : 'border-slate-200'
                    )}
                  />
                  {errors.email && <p className="mt-1 text-xs text-rose-500">{errors.email.message}</p>}
                </div>

                {/* Phone */}
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-2">
                    {t('phonePlaceholder')}
                  </label>
                  <input
                    value={phoneField.value}
                    onChange={(e) => phoneField.onChange(formatPhoneInput(e.target.value))}
                    placeholder="(11) 98765-4321"
                    className={cn(
                      'w-full px-3 py-2.5 bg-slate-50 border focus:border-[#C2410C] focus:bg-white outline-none text-sm transition-colors',
                      errors.phone ? 'border-rose-500' : 'border-slate-200'
                    )}
                  />
                  <p className="mt-1 text-xs text-slate-400">{t('contactHelperText')}</p>
                  {errors.phone && <p className="mt-1 text-xs text-rose-500">{errors.phone.message}</p>}
                </div>

                {/* Message */}
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-2">
                    {t('noteOptional')}
                  </label>
                  <textarea
                    {...register('message')}
                    placeholder={t('notePlaceholder')}
                    rows={3}
                    className={cn(
                      'w-full px-3 py-2.5 bg-slate-50 border focus:border-[#C2410C] focus:bg-white outline-none text-sm transition-colors resize-none',
                      errors.message ? 'border-rose-500' : 'border-slate-200'
                    )}
                  />
                  {errors.message && <p className="mt-1 text-xs text-rose-500">{errors.message.message}</p>}
                </div>

                {/* Marketing Opt-in */}
                <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium">{t('marketingOptInLabel')}</p>
                      <p className="text-xs text-slate-400">{t('marketingOptInDescription')}</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    {...register('marketingOptIn')}
                    className="h-4 w-4 rounded border-slate-300 text-[#C2410C] focus:ring-[#C2410C]"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => { setShowCreateModal(false); reset(); }}
                  className="text-slate-500 hover:text-[#121212] text-sm font-medium transition-colors"
                >
                  {tCommon('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className={cn(
                    'flex items-center gap-1.5 px-5 py-2.5 text-white text-sm font-medium transition-all',
                    isCreating ? 'bg-slate-300 cursor-not-allowed' : 'bg-[#C2410C] hover:bg-[#a03609]'
                  )}
                >
                  {isCreating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {tCommon('saving')}
                    </>
                  ) : (
                    <>
                      <User className="w-4 h-4" />
                      {t('createCliente')}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Send Links Modal */}
      <Modal open={showSendLinksModal} onClose={() => setShowSendLinksModal(false)}>
        <ModalClose onClose={() => setShowSendLinksModal(false)} />
        <ModalHeader>
          <ModalTitle>{t('sendLinksTitle')}</ModalTitle>
        </ModalHeader>
        <ModalContent>
          <div className="space-y-6">
            {/* Selected clients info */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-sm">
              <p className="text-sm font-medium text-blue-900 mb-2">
                {t('selectedClients', { count: selectedClienteIds.size })}
              </p>
              <p className="text-xs text-blue-700">
                {t('onlyEmailClients')}
              </p>
            </div>

            {/* Links selection */}
            <div>
              <p className="text-sm font-medium text-obsidian mb-3">
                {t('selectLinksToSend')} *
              </p>
              <p className="text-xs text-slate-500 mb-3">
                {t('activeLinksOnly')}
              </p>
              <div className="space-y-2 max-h-64 overflow-y-auto border border-slate-200 rounded-sm p-3">
                {activeLinks.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">
                    {t('noLinksSelected')}
                  </p>
                ) : (
                  activeLinks.map((link) => (
                    <div
                      key={link.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-sm border cursor-pointer transition-all",
                        selectedLinkIds.has(link.id)
                          ? "bg-blue-50 border-blue-300"
                          : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      )}
                      onClick={() => handleSelectLink(link.id, !selectedLinkIds.has(link.id))}
                    >
                      <Checkbox
                        id={`link-${link.id}`}
                        checked={selectedLinkIds.has(link.id)}
                        onChange={(e) => handleSelectLink(link.id, e.target.checked)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-obsidian truncate">
                          {link.title || link.slugToken}
                        </p>
                        <p className="text-xs text-slate-500">
                          {link.linkType.replace('_', ' ')} • /{link.slugToken}
                        </p>
                      </div>
                      {link.displayPrice && link.showPrice && (
                        <Badge variant="default">
                          R$ {link.displayPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </Badge>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Custom message */}
            <div>
              <label className="block text-sm font-medium text-obsidian mb-2">
                {t('customMessage')}
              </label>
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder={t('customMessagePlaceholder')}
                rows={3}
                className={cn(
                  'w-full px-4 py-3 rounded-sm border bg-porcelain text-obsidian border-slate-200',
                  'placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-obsidian/20',
                  'resize-none'
                )}
              />
            </div>
          </div>
        </ModalContent>
        <ModalFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setShowSendLinksModal(false)}
          >
            {tCommon('cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={handleSendLinks}
            disabled={sendLinksMutation.isPending || selectedLinkIds.size === 0}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {sendLinksMutation.isPending ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                {t('sending')}
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                {t('sendLinksButton')}
              </>
            )}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}