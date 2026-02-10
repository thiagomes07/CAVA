'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Download, Search, Mail, Phone, MessageSquare, Check, User, Inbox, Copy, Plus, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
// removed Checkbox selection column — not needed
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Pagination } from '@/components/shared/Pagination';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import { SortableTableHead } from '@/components/shared/SortableTableHead';
import { Checkbox } from '@/components/ui/checkbox';
import { ShareLinksModal, ShareSelection } from '@/components/shared/ShareLinksModal';
import { ClientFormModal } from '@/components/clientes/ClientFormModal';
import { apiClient, ApiError } from '@/lib/api/client';
import { useToast } from '@/lib/hooks/useToast';
import { formatDate } from '@/lib/utils/formatDate';
import { truncateText } from '@/lib/utils/truncateText';
import { TRUNCATION_LIMITS } from '@/lib/config/truncationLimits';
import { useSendLinksToClientes } from '@/lib/api/mutations/useLeadMutations';
import { sanitizePhone } from '@/lib/utils/formatPhoneInput';
import type { Cliente, SalesLink, SendLinksResponse } from '@/lib/types';
import type { ClienteFilter, CreateClienteForm } from '@/lib/schemas/lead.schema';
import { cn } from '@/lib/utils/cn';

export default function ClientesManagementPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const { success, error } = useToast();
  const t = useTranslations('clientes');
  const tCommon = useTranslations('common');

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [salesLinks, setSalesLinks] = useState<SalesLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modal State
  const [showClientModal, setShowClientModal] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // bulk send modal removed

  // Share links modal state
  const [showShareLinksModal, setShowShareLinksModal] = useState(false);
  const [shareMode, setShareMode] = useState<'whatsapp' | 'email'>('email');
  const [shareCliente, setShareCliente] = useState<Cliente | null>(null);
  const [isSendingLinks, setIsSendingLinks] = useState(false);

  // selection removed: checkboxes/ bulk selection not used
  const [customMessage, setCustomMessage] = useState('');

  // Send links mutation
  const sendLinksMutation = useSendLinksToClientes();

  const [filters, setFilters] = useState<ClienteFilter>({
    search: searchParams.get('search') || '',
    linkId: searchParams.get('linkId') || '',
    startDate: '',
    endDate: '',
    optIn: undefined,
    sortBy: 'created_at',
    sortOrder: 'desc',
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

  // Check if client has valid email
  const isValidEmail = (contact: string) => contact.includes('@');

  const handleSelectCliente = (id: string, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    setSelectedIds(newSet);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = clientes.map((c) => c.id);
      setSelectedIds(new Set(allIds));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleBulkShare = () => {
    if (selectedIds.size === 0) return;
    setShareCliente(null); // Null indicates bulk mode
    setShareMode('email'); // Force email for bulk
    setShowShareLinksModal(true);
  };

  // bulk send links removed — keep individual share functionality

  const handleOpenCreate = () => {
    setSelectedCliente(null);
    setShowClientModal(true);
  };

  const handleOpenEdit = (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setShowClientModal(true);
  };

  const handleSaveCliente = async (data: CreateClienteForm) => {
    try {
      setIsSaving(true);

      const payload = {
        name: data.name,
        email: data.email && data.email.trim() !== '' ? data.email.trim() : undefined,
        phone: data.phone ? sanitizePhone(data.phone) : undefined,
        whatsapp: data.whatsapp ? sanitizePhone(data.whatsapp) : undefined,
        message: data.message,
        marketingOptIn: data.marketingOptIn,
      };

      if (selectedCliente) {
        // Update
        await apiClient.put(`/clientes/${selectedCliente.id}`, payload);
        success(t('clienteUpdated') || 'Cliente atualizado com sucesso');
      } else {
        // Create
        await apiClient.post('/clientes', payload);
        success(t('clienteCreated'));
      }

      setShowClientModal(false);
      fetchClientes();
    } catch (err) {
      if (err instanceof ApiError) {
        error(err.message);
      } else {
        error(selectedCliente ? (t('updateError') || 'Erro ao atualizar') : t('createError'));
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCliente = async () => {
    if (!selectedCliente) return;

    try {
      setIsSaving(true);
      await apiClient.delete(`/clientes/${selectedCliente.id}`);
      success(t('clienteDeleted') || 'Cliente excluído com sucesso');
      setShowClientModal(false);
      fetchClientes();
    } catch (err) {
      if (err instanceof ApiError) {
        error(err.message);
      } else {
        error(t('deleteError') || 'Erro ao excluir cliente');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = async () => {
    try {
      success(t('exportStarted'));
      // Implementar lógica de exportação CSV
    } catch {
      error(t('exportError'));
    }
  };

  const handleSort = (field: string) => {
    setFilters((prev) => ({
      ...prev,
      sortBy: field,
      sortOrder: prev.sortBy === field && prev.sortOrder === 'asc' ? 'desc' : 'asc',
      page: 1,
    }));
  };

  const handleClearFilters = () => {
    setFilters({
      search: '',
      linkId: '',
      startDate: '',
      endDate: '',
      optIn: undefined,
      sortBy: 'created_at',
      sortOrder: 'desc',
      page: 1,
      limit: 50,
    });
    router.push(`/${slug}/clientes`);
  };

  const handleCopyContact = async (contact: string) => {
    try {
      await navigator.clipboard.writeText(contact);
      success(t('contactCopied'));
    } catch {
      error(t('copyError'));
    }
  };

  const handleOpenShareModal = (cliente: Cliente, mode: 'whatsapp' | 'email') => {
    // Verificar se o cliente tem o contato necessário
    if (mode === 'whatsapp' && !cliente.whatsapp) {
      error(t('noWhatsApp'));
      return;
    }
    if (mode === 'email' && !cliente.email) {
      error(t('noEmail'));
      return;
    }

    setShareCliente(cliente);
    setShareMode(mode);
    setShowShareLinksModal(true);
  };

  const handleShareLinksConfirm = async (selection: ShareSelection) => {
    // Determine recipients
    const recipientsIds = shareCliente ? [shareCliente.id] : Array.from(selectedIds);
    if (recipientsIds.length === 0) return;

    // Se for WhatsApp, o modal já redireciona automaticamente (apenas individual)
    // Este handler só é chamado para Email
    if (shareMode === 'email') {
      try {
        setIsSendingLinks(true);

        const result: SendLinksResponse = await sendLinksMutation.mutateAsync({
          clienteIds: recipientsIds,
          salesLinkIds: selection.salesLinkIds,
          customMessage: selection.customMessage,
        });

        if (result.totalFailed === 0 && result.totalSkipped === 0) {
          success(t('sendSuccess', { sent: result.totalSent }));
        } else {
          success(t('sendPartialSuccess', {
            sent: result.totalSent,
            failed: result.totalFailed,
            skipped: result.totalSkipped,
          }));
        }

        setShowShareLinksModal(false);
        setShareCliente(null);
        setSelectedIds(new Set()); // Clear selection after send
        fetchClientes();
      } catch (err) {
        if (err instanceof ApiError) {
          error(err.message);
        } else {
          error(t('sendError'));
        }
      } finally {
        setIsSendingLinks(false);
      }
    }
  };

  // bulk share handler removed

  const hasFilters = filters.search || filters.linkId || filters.startDate || filters.endDate;
  const isEmpty = clientes.length === 0;
  const MAX_BULK_CLIENTS = 50;
  // bulk selection removed

  return (
    <div className="min-h-screen bg-mineral">
      {/* Header */}
      <div className="page-header">
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
            <Button variant="primary" onClick={handleOpenCreate}>
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

      {/* Bulk Actions Indicator */}
      {selectedIds.size > 0 && (
        <div className="px-8 pb-6">
          <div className="flex items-center justify-between p-4 bg-obsidian text-white rounded-sm shadow-lg animate-in slide-in-from-top-2">
            <div className="flex items-center gap-4">
              <span className="font-medium">
                {selectedIds.size} {selectedIds.size === 1 ? 'cliente selecionado' : 'clientes selecionados'}
              </span>
              <div className="h-4 w-px bg-white/20" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
                className="text-white/70 hover:text-white hover:bg-white/10 h-8"
              >
                Limpar seleção
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleBulkShare}
                className="bg-white text-obsidian hover:bg-slate-100 border-none"
              >
                <Mail className="w-4 h-4 mr-2" />
                {t('sendLinks')}
              </Button>
            </div>
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
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={clientes.length > 0 && selectedIds.size === clientes.length}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                      />
                    </TableHead>
                    <SortableTableHead
                      field="name"
                      label={t('name')}
                      sortBy={filters.sortBy}
                      sortOrder={filters.sortOrder}
                      onSort={handleSort}
                    />
                    <SortableTableHead
                      field="email"
                      label={tCommon('email')}
                      sortBy={filters.sortBy}
                      sortOrder={filters.sortOrder}
                      onSort={handleSort}
                    />
                    <TableHead>{t('phonePlaceholder')}</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead>{t('observation')}</TableHead>
                    <TableHead>{t('optIn')}</TableHead>
                    <SortableTableHead
                      field="created_at"
                      label={t('date')}
                      sortBy={filters.sortBy}
                      sortOrder={filters.sortOrder}
                      onSort={handleSort}
                    />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientes.map((cliente) => {
                    return (
                      <TableRow key={cliente.id} className="cursor-pointer transition-colors" onClick={() => handleOpenEdit(cliente)}>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.has(cliente.id)}
                            onChange={(e) => handleSelectCliente(cliente.id, e.target.checked)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-slate-400" />
                            <span className="font-medium text-obsidian" title={cliente.name}>
                              {truncateText(cliente.name, TRUNCATION_LIMITS.USER_NAME_SHORT)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {cliente.email ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyContact(cliente.email!);
                                }}
                                className="flex items-center gap-2 text-sm text-slate-600 hover:text-obsidian transition-colors"
                                title={cliente.email}
                              >
                                <Mail className="w-4 h-4" />
                                <span>{truncateText(cliente.email, TRUNCATION_LIMITS.CONTACT)}</span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenShareModal(cliente, 'email');
                                }}
                                className="p-1.5 hover:bg-slate-100 rounded-sm transition-colors"
                                title={t('shareViaEmail')}
                              >
                                <Share2 className="w-4 h-4 text-slate-600" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {cliente.phone ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyContact(cliente.phone!);
                              }}
                              className="flex items-center gap-2 text-sm text-slate-600 hover:text-obsidian transition-colors"
                              title={cliente.phone}
                            >
                              <Phone className="w-4 h-4" />
                              <span>{cliente.phone}</span>
                            </button>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {cliente.whatsapp ? (
                            <div className="flex items-center gap-2">
                              <a
                                href={`https://wa.me/55${cliente.whatsapp.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-2 text-sm text-slate-600 hover:text-emerald-500 transition-colors"
                                title={cliente.whatsapp}
                              >
                                <MessageSquare className="w-4 h-4" />
                                <span>{cliente.whatsapp}</span>
                              </a>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenShareModal(cliente, 'whatsapp');
                                }}
                                className="p-1.5 hover:bg-emerald-50 rounded-sm transition-colors"
                                title={t('shareViaWhatsApp')}
                              >
                                <Share2 className="w-4 h-4 text-emerald-600" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {cliente.message ? (
                            <span className="text-sm text-slate-600" title={cliente.message}>
                              {truncateText(cliente.message, 50)}
                            </span>
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
                          <span className="text-sm text-slate-500">
                            {formatDate(cliente.createdAt)}
                          </span>
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

      <ClientFormModal
        open={showClientModal}
        onClose={() => setShowClientModal(false)}
        onSave={handleSaveCliente}
        onDelete={selectedCliente ? handleDeleteCliente : undefined}
        initialData={selectedCliente}
        isLoading={isSaving}
      />

      {/* Share Links Modal (Individual) */}
      <ShareLinksModal
        open={showShareLinksModal}
        onClose={() => {
          setShowShareLinksModal(false);
          setShareCliente(null);
        }}
        onConfirm={handleShareLinksConfirm}
        mode={shareMode}
        cliente={shareCliente || undefined}
        multipleClientes={!shareCliente ? selectedIds.size : undefined}
        isLoading={isSendingLinks}
      />
    </div >
  );
}