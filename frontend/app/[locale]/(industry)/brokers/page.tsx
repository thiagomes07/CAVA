'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useController } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { Plus, Mail, Phone, MessageCircle, Share2, Eye, UserX, RefreshCw, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalContent,
  ModalFooter,
  ModalClose,
} from '@/components/ui/modal';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import { Pagination } from '@/components/shared/Pagination';
import { SearchInput } from '@/components/shared/SearchInput';
import { SortableTableHead } from '@/components/shared/SortableTableHead';
import { apiClient, ApiError } from '@/lib/api/client';
import { useToast } from '@/lib/hooks/useToast';
import { inviteBrokerSchema, type InviteBrokerInput, type UpdateBrokerInput } from '@/lib/schemas/auth.schema';
import formatPhoneInput, { sanitizePhone } from '@/lib/utils/formatPhoneInput';
import { BrokerFormModal } from '@/components/brokers/BrokerFormModal';
import { formatDate } from '@/lib/utils/formatDate';
import { formatPhone } from '@/lib/utils/validators';
import { truncateText } from '@/lib/utils/truncateText';
import { TRUNCATION_LIMITS } from '@/lib/config/truncationLimits';
import type { User, BrokerWithStats } from '@/lib/types';
import { cn } from '@/lib/utils/cn';
import { z } from 'zod';

// Schema for resend invite modal (optional new email)
const resendInviteSchema = z.object({
  changeEmail: z.boolean(),
  newEmail: z.string().email('Email inválido').optional().or(z.literal('')),
}).refine((data) => {
  // If changeEmail is true, newEmail must be provided
  if (data.changeEmail && (!data.newEmail || data.newEmail.trim() === '')) {
    return false;
  }
  return true;
}, {
  message: 'Informe o novo email',
  path: ['newEmail'],
});

type ResendInviteInput = z.infer<typeof resendInviteSchema>;

export default function BrokersManagementPage() {
  const router = useRouter();
  const { success, error } = useToast();
  const t = useTranslations('brokers');
  const tCommon = useTranslations('common');
  const tTeam = useTranslations('team');

  const [brokers, setBrokers] = useState<BrokerWithStats[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showResendModal, setShowResendModal] = useState(false);
  const [showBrokerModal, setShowBrokerModal] = useState(false);
  const [selectedBroker, setSelectedBroker] = useState<BrokerWithStats | null>(null);
  const [selectedBrokerForEdit, setSelectedBrokerForEdit] = useState<BrokerWithStats | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filters state
  const [filters, setFilters] = useState({
    search: '',
    isActive: undefined as boolean | undefined,
    sortBy: 'name',
    sortOrder: 'asc',
    page: 1,
    limit: 50,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
  } = useForm<InviteBrokerInput>({
    resolver: zodResolver(inviteBrokerSchema),
  });

  const { field: phoneField } = useController({ name: 'phone', control, defaultValue: '' });
  const { field: whatsappField } = useController({ name: 'whatsapp', control, defaultValue: '' });

  // Form for resend invite modal
  const {
    register: registerResend,
    handleSubmit: handleSubmitResend,
    formState: { errors: errorsResend },
    reset: resetResend,
    watch: watchResend,
    setValue: setResendValue,
  } = useForm<ResendInviteInput>({
    resolver: zodResolver(resendInviteSchema),
    defaultValues: {
      changeEmail: false,
      newEmail: '',
    },
  });

  const changeEmail = watchResend('changeEmail');

  useEffect(() => {
    fetchBrokers();
  }, [filters]);

  const fetchBrokers = useCallback(async () => {
    try {
      setIsLoading(true);

      // Build query params
      const params: Record<string, string> = {
        page: filters.page.toString(),
        limit: filters.limit.toString(),
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      };

      if (filters.search) {
        params.search = filters.search;
      }
      if (filters.isActive !== undefined) {
        params.isActive = filters.isActive.toString();
      }

      const data = await apiClient.get<{
        brokers: BrokerWithStats[];
        total: number;
        page: number;
      }>('/brokers', { params });

      setBrokers(data.brokers);
      setTotalItems(data.total);
    } catch {
      error(t('loadError'));
      setBrokers([]);
      setTotalItems(0);
    } finally {
      setIsLoading(false);
    }
  }, [filters, error, t]);

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
      isActive: undefined,
      sortBy: 'name',
      sortOrder: 'asc',
      page: 1,
      limit: 50,
    });
  };

  const hasFilters = filters.search || filters.isActive !== undefined;
  const isEmpty = brokers.length === 0;

  const onSubmit = async (data: InviteBrokerInput) => {
    try {
      setIsSubmitting(true);

      await apiClient.post('/brokers/invite', {
        ...data,
        phone: sanitizePhone(data.phone),
        whatsapp: sanitizePhone(data.whatsapp),
      });

      success(t('inviteSent', { email: data.email }));
      setShowInviteModal(false);
      reset();
      fetchBrokers();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'EMAIL_EXISTS') {
        error(t('emailAlreadyExists'));
      } else if (err instanceof ApiError && err.code === 'VALIDATION_ERROR' && err.message) {
        // Exibe a mensagem específica do backend (ex: "Já existe um usuário com este nome")
        error(err.message);
      } else {
        error(t('inviteError'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (brokerId: string, currentStatus: boolean) => {
    try {
      await apiClient.patch(`/users/${brokerId}/status`, {
        isActive: !currentStatus,
      });

      success(
        currentStatus ? t('brokerDeactivated') : t('brokerActivated')
      );
      fetchBrokers();
    } catch {
      error(t('brokerStatusError'));
    }
  };

  const handleOpenResendModal = (broker: BrokerWithStats) => {
    setSelectedBroker(broker);
    resetResend({ changeEmail: false, newEmail: '' });
    setShowResendModal(true);
  };

  const onSubmitResend = async (data: ResendInviteInput) => {
    if (!selectedBroker) return;

    try {
      setIsSubmitting(true);

      const payload: { newEmail?: string } = {};
      if (data.changeEmail && data.newEmail && data.newEmail.trim() !== '') {
        payload.newEmail = data.newEmail.trim();
      }

      await apiClient.post(`/users/${selectedBroker.id}/resend-invite`, payload);
      success(t('inviteResent'));
      setShowResendModal(false);
      resetResend();
      setSelectedBroker(null);
      fetchBrokers();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'BAD_REQUEST') {
        if (err.message?.includes('diferente')) {
          error(t('emailMustBeDifferent'));
        } else {
          error(t('cannotResendAfterLogin'));
        }
      } else if (err instanceof ApiError && err.code === 'EMAIL_EXISTS') {
        error(t('emailAlreadyExists'));
      } else if (err instanceof ApiError && err.code === 'VALIDATION_ERROR' && err.message) {
        // Exibe a mensagem específica do backend
        error(err.message);
      } else {
        error(t('resendError'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateBroker = async (data: UpdateBrokerInput) => {
    if (!selectedBrokerForEdit) return;
    try {
      setIsSubmitting(true);
      await apiClient.put(`/brokers/${selectedBrokerForEdit.id}`, data);
      success(t('brokerUpdated'));
      setShowBrokerModal(false);
      setSelectedBrokerForEdit(null);
      fetchBrokers();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'EMAIL_EXISTS') {
        error(t('emailAlreadyExists'));
      } else if (err instanceof ApiError && err.message) {
        error(err.message);
      } else {
        error(tCommon('error'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBroker = async () => {
    if (!selectedBrokerForEdit) return;
    try {
      setIsSubmitting(true);
      await apiClient.delete(`/brokers/${selectedBrokerForEdit.id}`);
      success(t('brokerDeleted'));
      setShowBrokerModal(false);
      setSelectedBrokerForEdit(null);
      fetchBrokers();
    } catch (err) {
      if (err instanceof ApiError && err.message) {
        error(err.message);
      } else {
        error(tCommon('error'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const canResendInvite = (broker: BrokerWithStats) => !broker.firstLoginAt;

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
          <Button variant="primary" onClick={() => setShowInviteModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t('inviteBroker')}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="px-8 py-6">
        <div className="bg-porcelain rounded-sm border border-slate-100 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end md:gap-4">
            {/* Search */}
            <div className="w-full md:w-auto md:min-w-[280px]">
              <SearchInput
                value={filters.search}
                onChange={(value) =>
                  setFilters((prev) => ({ ...prev, search: value, page: 1 }))
                }
                placeholder="Buscar por nome, email ou telefone..."
              />
            </div>

            {/* Status Filter */}
            <div className="w-full md:w-auto md:min-w-[180px]">
              <Select
                value={filters.isActive === undefined ? '' : filters.isActive.toString()}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                  const value = e.target.value;
                  setFilters((prev) => ({
                    ...prev,
                    isActive: value === '' ? undefined : value === 'true',
                    page: 1,
                  }));
                }}
              >
                <option value="">Todos os status</option>
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </Select>
            </div>

            {/* Clear Filters */}
            <div className="w-full md:w-auto md:ml-auto">
              <Button
                variant="secondary"
                onClick={handleClearFilters}
                disabled={!hasFilters}
                className="w-full md:w-auto h-[48px] px-6"
              >
                Limpar Filtros
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-8 pb-8">
        {isLoading ? (
          <LoadingState variant="table" rows={5} columns={6} />
        ) : isEmpty ? (
          <EmptyState
            icon={hasFilters ? Plus : Plus}
            title={hasFilters ? 'Nenhum resultado encontrado' : t('noBrokers')}
            description={hasFilters ? 'Ajuste os filtros para ver mais resultados' : t('noBrokersDescription')}
            actionLabel={hasFilters ? 'Limpar Filtros' : t('inviteBrokerButton')}
            onAction={hasFilters ? handleClearFilters : () => setShowInviteModal(true)}
          />
        ) : (
          <>
            <div className="bg-porcelain rounded-sm border border-slate-100 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableTableHead
                      field="name"
                      label={tCommon('name')}
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
                    <TableHead>{tCommon('phone')}</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead>{t('sharedBatches')}</TableHead>
                    <SortableTableHead
                      field="created_at"
                      label={t('created')}
                      sortBy={filters.sortBy}
                      sortOrder={filters.sortOrder}
                      onSort={handleSort}
                    />
                    <TableHead>{tCommon('status')}</TableHead>
                    <TableHead>{tCommon('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {brokers.map((broker) => (
                    <TableRow
                      key={broker.id}
                      className="hover:bg-slate-50/50 cursor-pointer transition-colors"
                      onClick={() => {
                        setSelectedBrokerForEdit(broker);
                        setShowBrokerModal(true);
                      }}
                    >
                      <TableCell>
                        <div>
                          <p
                            className="font-medium text-obsidian"
                            title={broker.name}
                          >
                            {truncateText(broker.name, TRUNCATION_LIMITS.USER_NAME)}
                          </p>
                          <p className="text-xs text-slate-500">
                            {tTeam('since', { date: formatDate(broker.createdAt, 'MMM yyyy') })}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-slate-400" />
                          <span
                            className="text-sm text-slate-600"
                            title={broker.email}
                          >
                            {truncateText(broker.email, TRUNCATION_LIMITS.EMAIL)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {broker.phone ? (
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-slate-400" />
                            <span className="text-sm text-slate-600">
                              {formatPhone(broker.phone)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {broker.whatsapp || broker.phone ? (
                          <a
                            href={`https://wa.me/55${(broker.whatsapp || broker.phone!).replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MessageCircle className="w-4 h-4" />
                            {formatPhone(broker.whatsapp || broker.phone!)}
                          </a>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/brokers/${broker.id}/shared`);
                          }}
                          className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 transition-colors"
                        >
                          <Share2 className="w-4 h-4" />
                          <span className="font-mono">
                            {broker.sharedBatchesCount || 0}
                          </span>
                        </button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant={broker.isActive ? 'DISPONIVEL' : 'INATIVO'}>
                            {broker.isActive ? tCommon('active') : tCommon('inactive')}
                          </Badge>
                          {/* Indicador visual de primeiro login */}
                          {canResendInvite(broker) && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded-full" title={t('pendingFirstLogin')}>
                              <Clock className="w-3 h-3" />
                              {t('pendingAccess')}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {/* Reenviar convite - apenas se nunca logou */}
                          {canResendInvite(broker) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenResendModal(broker);
                              }}
                              className="p-2 hover:bg-blue-50 text-blue-600 rounded-sm transition-colors"
                              title={t('resendInvite')}
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/brokers/${broker.id}/shared`);
                            }}
                            className="p-2 hover:bg-slate-100 rounded-sm transition-colors"
                            title={t('manageBatches')}
                          >
                            <Eye className="w-4 h-4 text-slate-600" />
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleStatus(broker.id, broker.isActive);
                            }}
                            className={cn(
                              'p-2 rounded-sm transition-colors',
                              broker.isActive
                                ? 'hover:bg-rose-50 text-rose-600'
                                : 'hover:bg-emerald-50 text-emerald-600'
                            )}
                            title={broker.isActive ? tTeam('deactivate') : tTeam('activate')}
                          >
                            <UserX className="w-4 h-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <Pagination
              currentPage={filters.page}
              totalPages={Math.ceil(totalItems / filters.limit)}
              totalItems={totalItems}
              itemsPerPage={filters.limit}
              onPageChange={(page: number) => setFilters((prev) => ({ ...prev, page }))}
            />
          </>
        )}
      </div>

      {/* Invite Modal */}
      <Modal open={showInviteModal} onClose={() => setShowInviteModal(false)}>
        <ModalClose onClose={() => setShowInviteModal(false)} />
        <ModalHeader>
          <ModalTitle>{t('inviteBrokerTitle')}</ModalTitle>
        </ModalHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <ModalContent>
            <div className="space-y-5">
              {/* Name */}
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-2">
                  {tTeam('fullName')} <span className="text-[#C2410C]">*</span>
                </label>
                <input
                  {...register('name')}
                  placeholder="Maria Santos"
                  disabled={isSubmitting}
                  className={cn(
                    'w-full px-3 py-2.5 bg-slate-50 border focus:border-[#C2410C] focus:bg-white outline-none text-sm transition-colors',
                    errors.name ? 'border-rose-500' : 'border-slate-200',
                    isSubmitting && 'opacity-50 cursor-not-allowed'
                  )}
                />
                {errors.name && <p className="mt-1 text-xs text-rose-500">{errors.name.message}</p>}
              </div>

              {/* Email */}
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-2">
                  {tCommon('email')} <span className="text-[#C2410C]">*</span>
                </label>
                <input
                  {...register('email')}
                  type="email"
                  placeholder="maria@exemplo.com"
                  disabled={isSubmitting}
                  className={cn(
                    'w-full px-3 py-2.5 bg-slate-50 border focus:border-[#C2410C] focus:bg-white outline-none text-sm transition-colors',
                    errors.email ? 'border-rose-500' : 'border-slate-200',
                    isSubmitting && 'opacity-50 cursor-not-allowed'
                  )}
                />
                <p className="mt-1 text-xs text-slate-400">{t('emailHelperText')}</p>
                {errors.email && <p className="mt-1 text-xs text-rose-500">{errors.email.message}</p>}
              </div>

              {/* Phone */}
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-2">
                  {tTeam('phoneOptional')}
                </label>
                <input
                  value={phoneField.value}
                  onChange={(e) => phoneField.onChange(formatPhoneInput(e.target.value))}
                  placeholder="(11) 98765-4321"
                  disabled={isSubmitting}
                  className={cn(
                    'w-full px-3 py-2.5 bg-slate-50 border focus:border-[#C2410C] focus:bg-white outline-none text-sm transition-colors',
                    errors.phone ? 'border-rose-500' : 'border-slate-200',
                    isSubmitting && 'opacity-50 cursor-not-allowed'
                  )}
                />
                {errors.phone && <p className="mt-1 text-xs text-rose-500">{errors.phone.message}</p>}
              </div>

              {/* WhatsApp */}
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-2">
                  {t('whatsappOptional')}
                </label>
                <input
                  value={whatsappField.value}
                  onChange={(e) => whatsappField.onChange(formatPhoneInput(e.target.value))}
                  placeholder="(11) 98765-4321"
                  disabled={isSubmitting}
                  className={cn(
                    'w-full px-3 py-2.5 bg-slate-50 border focus:border-[#C2410C] focus:bg-white outline-none text-sm transition-colors',
                    errors.whatsapp ? 'border-rose-500' : 'border-slate-200',
                    isSubmitting && 'opacity-50 cursor-not-allowed'
                  )}
                />
                <p className="mt-1 text-xs text-slate-400">{t('whatsappHelperText')}</p>
                {errors.whatsapp && <p className="mt-1 text-xs text-rose-500">{errors.whatsapp.message}</p>}
              </div>
            </div>
          </ModalContent>

          <ModalFooter className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowInviteModal(false)}
              disabled={isSubmitting}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-sm transition-colors disabled:opacity-50"
            >
              {tCommon('cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                'flex items-center gap-2 px-5 py-2 text-white text-sm font-medium rounded-sm transition-all',
                isSubmitting ? 'bg-slate-300 cursor-not-allowed' : 'bg-[#C2410C] hover:bg-[#a03609]'
              )}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {tCommon('sending')}
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  {t('sendInvite')}
                </>
              )}
            </button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Resend Invite Confirmation Modal */}
      <Modal open={showResendModal} onClose={() => setShowResendModal(false)}>
        <ModalClose onClose={() => setShowResendModal(false)} />
        <ModalHeader>
          <ModalTitle>{t('resendInviteTitle')}</ModalTitle>
        </ModalHeader>

        <form onSubmit={handleSubmitResend(onSubmitResend)}>
          <ModalContent>
            <div className="space-y-4">
              {/* Info box about pending first login */}
              <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-sm">
                <Clock className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-orange-800">
                    {t('pendingFirstLoginInfo', { name: selectedBroker?.name || '' })}
                  </p>
                  <p className="text-xs text-orange-700 mt-1">
                    {t('resendInviteDescription')}
                  </p>
                </div>
              </div>

              <p className="text-sm text-slate-600">
                {t('currentEmail')}: <strong>{selectedBroker?.email}</strong>
              </p>

              {/* Checkbox to change email */}
              <Checkbox
                id="changeEmail"
                checked={changeEmail}
                onChange={(e) => {
                  setResendValue('changeEmail', e.target.checked);
                  if (!e.target.checked) {
                    setResendValue('newEmail', '');
                  }
                }}
                label={t('sendToDifferentEmail')}
                description={t('sendToDifferentEmailDescription')}
              />

              {/* New email field - only shown when checkbox is checked */}
              {changeEmail && (
                <Input
                  {...registerResend('newEmail')}
                  type="email"
                  label={t('newEmail')}
                  placeholder="novo@email.com"
                  error={errorsResend.newEmail?.message}
                  disabled={isSubmitting}
                />
              )}
            </div>
          </ModalContent>

          <ModalFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowResendModal(false)}
              disabled={isSubmitting}
            >
              {tCommon('cancel')}
            </Button>
            <Button type="submit" variant="primary" loading={isSubmitting}>
              {t('confirmResend')}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      <BrokerFormModal
        open={showBrokerModal}
        onClose={() => {
          setShowBrokerModal(false);
          setSelectedBrokerForEdit(null);
        }}
        onSave={handleUpdateBroker}
        onDelete={handleDeleteBroker}
        initialData={selectedBrokerForEdit}
        isLoading={isSubmitting}
      />
    </div>
  );
}