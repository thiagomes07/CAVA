"use client";

import { useState, useEffect, useCallback } from 'react';
import { useForm, useController } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { Plus, Mail, Phone, Link2, Receipt, UserX, Shield, RefreshCw, Clock, MessageCircle, X, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalContent,
  ModalFooter,
  ModalClose,
} from '@/components/ui/modal';
import { Checkbox } from '@/components/ui/checkbox';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import { Pagination } from '@/components/shared/Pagination';
import { SearchInput } from '@/components/shared/SearchInput';
import { SortableTableHead } from '@/components/shared/SortableTableHead';
import { apiClient, ApiError } from '@/lib/api/client';
import { useToast } from '@/lib/hooks/useToast';
import { formatDate } from '@/lib/utils/formatDate';
import { formatPhone } from '@/lib/utils/validators';
import { truncateText } from '@/lib/utils/truncateText';
import { TRUNCATION_LIMITS } from '@/lib/config/truncationLimits';
import type { User } from '@/lib/types';
import { z } from 'zod';
import { cn } from '@/lib/utils/cn';
import formatPhoneInput, { sanitizePhone } from '@/lib/utils/formatPhoneInput';
import { TeamMemberFormModal } from '@/components/team/TeamMemberFormModal';
import { TeamMemberInviteModal } from '@/components/team/TeamMemberInviteModal';
import type { UpdateSellerInput, InviteSellerInput } from '@/lib/schemas/auth.schema';

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

export default function TeamManagementPage() {
  const { success, error } = useToast();
  const t = useTranslations('team');
  const tCommon = useTranslations('common');

  const [sellers, setSellers] = useState<User[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showResendModal, setShowResendModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Filters state
  const [filters, setFilters] = useState({
    search: '',
    isActive: undefined as boolean | undefined,
    role: '',
    sortBy: 'name',
    sortOrder: 'asc',
    page: 1,
    limit: 50,
  });

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
    fetchSellers();
  }, [filters]);

  const fetchSellers = useCallback(async () => {
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
      if (filters.role) {
        params.role = filters.role;
      }

      const data = await apiClient.get<{
        users: User[];
        total: number;
        page: number;
      }>('/users', { params });

      setSellers(data.users);
      setTotalItems(data.total);
    } catch {
      error(t('loadError'));
      setSellers([]);
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
      page: 1, // Reset to first page
    }));
  };

  const handleClearFilters = () => {
    setFilters({
      search: '',
      isActive: undefined,
      role: '',
      sortBy: 'name',
      sortOrder: 'asc',
      page: 1,
      limit: 50,
    });
  };

  const hasFilters = filters.search || filters.isActive !== undefined || filters.role;
  const isEmpty = sellers.length === 0;

  const handleInviteUser = async (data: InviteSellerInput) => {
    try {
      setIsSubmitting(true);

      await apiClient.post('/users', {
        name: data.name,
        email: data.email,
        phone: sanitizePhone(data.phone),
        whatsapp: sanitizePhone(data.whatsapp),
        isAdmin: data.isAdmin || false,
      });

      success(data.isAdmin ? t('adminCreated') : t('sellerCreated'));
      setShowInviteModal(false);
      fetchSellers();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'EMAIL_EXISTS') {
        error(t('emailAlreadyExists'));
      } else if (err instanceof ApiError && err.code === 'VALIDATION_ERROR' && err.message) {
        // Exibe a mensagem específica do backend (ex: "Já existe um usuário com este nome")
        error(err.message);
      } else {
        error(t('sellerCreateError'));
      }
      throw err; // Re-throw to keep modal open (handled by modal)
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (seller: User) => {
    // Impedir desativação de admins
    if (seller.role === 'ADMIN_INDUSTRIA' && seller.isActive) {
      error(t('cannotDeactivateAdmin'));
      return;
    }

    try {
      await apiClient.patch(`/users/${seller.id}/status`, {
        isActive: !seller.isActive,
      });

      success(
        seller.isActive
          ? t('sellerDeactivated')
          : t('sellerActivated')
      );
      fetchSellers();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'FORBIDDEN') {
        error(t('cannotDeactivateAdmin'));
      } else {
        error(t('sellerStatusError'));
      }
    }
  };

  const handleOpenResendModal = (user: User) => {
    setSelectedUser(user);
    resetResend({ changeEmail: false, newEmail: '' });
    setShowResendModal(true);
  };

  const onSubmitResend = async (data: ResendInviteInput) => {
    if (!selectedUser) return;

    try {
      setIsSubmitting(true);

      const payload: { newEmail?: string } = {};
      if (data.changeEmail && data.newEmail && data.newEmail.trim() !== '') {
        payload.newEmail = data.newEmail.trim();
      }

      await apiClient.post(`/users/${selectedUser.id}/resend-invite`, payload);
      success(t('inviteResent'));
      setShowResendModal(false);
      resetResend();
      setSelectedUser(null);
      fetchSellers();
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

  // Check if user can have invite resent (never logged in)
  const canResendInvite = (user: User) => !user.firstLoginAt;

  // Handle opening edit modal
  const handleOpenEditModal = (user: User) => {
    setEditingUser(user);
    setShowEditModal(true);
  };

  // Handle save user from edit modal
  const handleSaveUser = async (data: UpdateSellerInput) => {
    if (!editingUser) return;

    try {
      await apiClient.put(`/users/${editingUser.id}`, {
        name: data.name,
        phone: data.phone || null,
        whatsapp: data.whatsapp || null,
      });
      success(t('memberUpdated'));
      setShowEditModal(false);
      setEditingUser(null);
      fetchSellers();
    } catch (err) {
      if (err instanceof ApiError) {
        error(err.message);
      } else {
        error(t('memberUpdateError'));
      }
      throw err; // Re-throw to keep modal open
    }
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
          <Button variant="primary" onClick={() => setShowInviteModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t('addSeller')}
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

            {/* Role Filter */}
            <div className="w-full md:w-auto md:min-w-[200px]">
              <Select
                value={filters.role}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setFilters((prev) => ({ ...prev, role: e.target.value, page: 1 }))
                }
              >
                <option value="">Todas as funções</option>
                <option value="VENDEDOR_INTERNO">Vendedor</option>
                <option value="ADMIN_INDUSTRIA">Admin</option>
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
      <div className="px-8 pb-8">{isLoading ? (
        <LoadingState variant="table" rows={5} columns={6} />
      ) : isEmpty ? (
        <EmptyState
          icon={hasFilters ? Plus : Plus}
          title={hasFilters ? 'Nenhum resultado encontrado' : t('noSellers')}
          description={hasFilters ? 'Ajuste os filtros para ver mais resultados' : t('noSellersDescription')}
          actionLabel={hasFilters ? 'Limpar Filtros' : t('addSellerButton')}
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
                  <TableHead>{t('linksCreated')}</TableHead>
                  <TableHead>{t('salesCount')}</TableHead>
                  <SortableTableHead
                    field="created_at"
                    label={t('joinedAt') || 'Desde'}
                    sortBy={filters.sortBy}
                    sortOrder={filters.sortOrder}
                    onSort={handleSort}
                  />
                  <TableHead>{tCommon('status')}</TableHead>
                  <TableHead>{tCommon('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sellers.map((seller) => (
                  <TableRow
                    key={seller.id}
                    className="cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => handleOpenEditModal(seller)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <p
                              className="font-serif text-obsidian"
                              title={seller.name}
                            >
                              {truncateText(seller.name, TRUNCATION_LIMITS.SELLER_NAME)}
                            </p>
                            {seller.role === 'ADMIN_INDUSTRIA' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-200 text-slate-700 text-xs font-medium rounded-full">
                                <Shield className="w-3 h-3" />
                                Admin
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 font-mono">
                            {t('since', { date: formatDate(seller.createdAt, 'MMM yyyy') })}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-slate-400 hover:text-[#C2410C] transition-colors cursor-pointer">
                        <Mail className="w-4 h-4" />
                        <span
                          className="font-mono text-sm"
                          title={seller.email}
                        >
                          {truncateText(seller.email, TRUNCATION_LIMITS.EMAIL)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {seller.phone ? (
                        <div className="flex items-center gap-2 text-slate-400">
                          <Phone className="w-4 h-4" />
                          <span className="font-mono text-sm">
                            {formatPhone(seller.phone)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {seller.whatsapp ? (
                        <a
                          href={`https://wa.me/55${seller.whatsapp.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-slate-400 hover:text-emerald-500 transition-colors"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span className="font-mono text-sm">
                            {formatPhone(seller.whatsapp)}
                          </span>
                        </a>
                      ) : seller.phone && seller.phone.replace(/\D/g, '').length === 11 ? (
                        <a
                          href={`https://wa.me/55${seller.phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-slate-400 hover:text-emerald-500 transition-colors opacity-75 hover:opacity-100"
                          title="WhatsApp via Telefone"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span className="font-mono text-sm">
                            {formatPhone(seller.phone)}
                          </span>
                        </a>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-slate-400">
                        <Link2 className="w-4 h-4" />
                        <span className="font-mono">
                          0
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-slate-400">
                        <Receipt className="w-4 h-4" />
                        <span className="font-mono">
                          0
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={seller.isActive ? 'DISPONIVEL' : 'INATIVO'}
                        >
                          {seller.isActive ? tCommon('active') : tCommon('inactive')}
                        </Badge>
                        {/* Indicador visual de primeiro login */}
                        {canResendInvite(seller) && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-full" title={t('pendingFirstLogin')}>
                            <Clock className="w-3 h-3" />
                            {t('pendingAccess')}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        {/* Reenviar convite - apenas se nunca logou */}
                        {canResendInvite(seller) && (
                          <button
                            onClick={() => handleOpenResendModal(seller)}
                            className="p-2 text-slate-300 hover:text-[#C2410C] transition-colors"
                            title={t('resendInvite')}
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        )}
                        {/* Não mostrar botão de desativar para admins */}
                        {seller.role !== 'ADMIN_INDUSTRIA' && (
                          <button
                            onClick={() => handleToggleStatus(seller)}
                            className={cn(
                              'p-2 transition-colors',
                              seller.isActive
                                ? 'text-slate-300 hover:text-rose-500'
                                : 'text-slate-300 hover:text-emerald-500'
                            )}
                            title={seller.isActive ? t('deactivate') : t('activate')}
                          >
                            <UserX className="w-4 h-4" />
                          </button>
                        )}
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
      <TeamMemberInviteModal
        open={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onSave={handleInviteUser}
        isLoading={isSubmitting}
      />

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
              <div className="flex items-start gap-3 p-4 bg-slate-100 border border-slate-200 rounded-sm">
                <Clock className="w-5 h-5 text-slate-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    {t('pendingFirstLoginInfo', { name: selectedUser?.name || '' })}
                  </p>
                  <p className="text-xs text-slate-600 mt-1">
                    {t('resendInviteDescription')}
                  </p>
                </div>
              </div>

              <p className="text-sm text-slate-600">
                {t('currentEmail')}: <strong>{selectedUser?.email}</strong>
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

      {/* Edit Member Modal */}
      <TeamMemberFormModal
        open={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingUser(null);
        }}
        onSave={handleSaveUser}
        initialData={editingUser}
        isLoading={isSubmitting}
      />
    </div >
  );
}