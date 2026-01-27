"use client";

import { useState, useEffect } from 'react';
import { useForm, useController } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { Plus, Mail, Phone, Link2, Receipt, UserX, Shield, RefreshCw, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

const inviteSellerSchema = z.object({
  name: z
    .string()
    .min(1, 'Nome é obrigatório')
    .refine((v) => v.trim().length >= 2, 'Nome deve ter no mínimo 2 caracteres')
    .transform((v) => v.trim()),
  email: z.string().min(1, 'Email é obrigatório').email('Email inválido').transform((v) => v.trim()),
  phone: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^\d{10,11}$/.test(val.replace(/\D/g, '')),
      'Telefone inválido'
    ),
  isAdmin: z.boolean(),
});

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

type InviteSellerInput = z.infer<typeof inviteSellerSchema>;
type ResendInviteInput = z.infer<typeof resendInviteSchema>;

export default function TeamManagementPage() {
  const { success, error } = useToast();
  const t = useTranslations('team');
  const tCommon = useTranslations('common');

  const [sellers, setSellers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showResendModal, setShowResendModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
  } = useForm<InviteSellerInput>({
    resolver: zodResolver(inviteSellerSchema),
    defaultValues: {
      isAdmin: false,
    },
  });

  const { field: phoneField } = useController({ name: 'phone', control, defaultValue: '' });

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
  }, []);

  const fetchSellers = async () => {
    try {
      setIsLoading(true);
      // Buscar vendedores internos e admins da indústria
      const [vendedores, admins] = await Promise.all([
        apiClient.get<User[]>('/users', { params: { role: 'VENDEDOR_INTERNO' } }),
        apiClient.get<User[]>('/users', { params: { role: 'ADMIN_INDUSTRIA' } }),
      ]);
      // Combinar e ordenar por nome
      const combined = [...vendedores, ...admins].sort((a, b) =>
        a.name.localeCompare(b.name)
      );
      setSellers(combined);
    } catch {
      error(t('loadError'));
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: InviteSellerInput) => {
    try {
      setIsSubmitting(true);

      await apiClient.post('/users', {
        name: data.name,
        email: data.email,
        phone: sanitizePhone(data.phone),
        isAdmin: data.isAdmin || false,
      });

      success(data.isAdmin ? t('adminCreated') : t('sellerCreated'));
      setShowInviteModal(false);
      reset();
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

  const isEmpty = sellers.length === 0;

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

      {/* Content */}
      <div className="px-8 py-8">
        {isLoading ? (
          <LoadingState variant="table" rows={5} columns={6} />
        ) : isEmpty ? (
          <EmptyState
            icon={Plus}
            title={t('noSellers')}
            description={t('noSellersDescription')}
            actionLabel={t('addSellerButton')}
            onAction={() => setShowInviteModal(true)}
          />
        ) : (
          <div className="bg-porcelain rounded-sm border border-slate-100 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tCommon('name')}</TableHead>
                  <TableHead>{tCommon('email')}</TableHead>
                  <TableHead>{tCommon('phone')}</TableHead>
                  <TableHead>{t('linksCreated')}</TableHead>
                  <TableHead>{t('salesCount')}</TableHead>
                  <TableHead>{tCommon('status')}</TableHead>
                  <TableHead>{tCommon('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sellers.map((seller) => (
                  <TableRow key={seller.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <p
                              className="font-medium text-obsidian"
                              title={seller.name}
                            >
                              {truncateText(seller.name, TRUNCATION_LIMITS.SELLER_NAME)}
                            </p>
                            {seller.role === 'ADMIN_INDUSTRIA' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                                <Shield className="w-3 h-3" />
                                Admin
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">
                            {t('since', { date: formatDate(seller.createdAt, 'MMM yyyy') })}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-slate-400" />
                        <span
                          className="text-sm text-slate-600"
                          title={seller.email}
                        >
                          {truncateText(seller.email, TRUNCATION_LIMITS.EMAIL)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {seller.phone ? (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-slate-400" />
                          <span className="text-sm text-slate-600">
                            {formatPhone(seller.phone)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Link2 className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-mono text-slate-600">
                          0
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-mono text-slate-600">
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
                        {canResendInvite(seller) && (
                          <button
                            onClick={() => handleOpenResendModal(seller)}
                            className="p-2 hover:bg-blue-50 text-blue-600 rounded-sm transition-colors"
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
                              'p-2 rounded-sm transition-colors',
                              seller.isActive
                                ? 'hover:bg-rose-50 text-rose-600'
                                : 'hover:bg-emerald-50 text-emerald-600'
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
        )}
      </div>

      {/* Invite Modal */}
      <Modal open={showInviteModal} onClose={() => setShowInviteModal(false)}>
        <ModalClose onClose={() => setShowInviteModal(false)} />
        <ModalHeader>
          <ModalTitle>{t('addSellerTitle')}</ModalTitle>
        </ModalHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <ModalContent>
            <div className="space-y-6">
              <Input
                {...register('name')}
                label={t('fullName')}
                placeholder="João Silva"
                error={errors.name?.message}
                disabled={isSubmitting}
              />

              <Input
                {...register('email')}
                type="email"
                label={tCommon('email')}
                placeholder="joao@exemplo.com"
                helperText={t('emailHelperText')}
                error={errors.email?.message}
                disabled={isSubmitting}
              />

              <Input
                value={phoneField.value}
                onChange={(e) => phoneField.onChange(formatPhoneInput(e.target.value))}
                label={t('phoneOptional')}
                placeholder="(11) 98765-4321"
                error={errors.phone?.message}
                disabled={isSubmitting}
              />

              {/* Admin Checkbox */}
              <div className="pt-4 border-t border-slate-100">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    {...register('isAdmin')}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-obsidian focus:ring-obsidian"
                    disabled={isSubmitting}
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-obsidian flex items-center gap-2">
                      <Shield className="w-4 h-4 text-amber-600" />
                      {t('isAdmin')}
                    </span>
                    <span className="text-xs text-slate-500 mt-0.5">
                      {t('isAdminDescription')}
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </ModalContent>

          <ModalFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowInviteModal(false)}
              disabled={isSubmitting}
            >
              {tCommon('cancel')}
            </Button>
            <Button type="submit" variant="primary" loading={isSubmitting}>
              {t('createAccess')}
            </Button>
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
                    {t('pendingFirstLoginInfo', { name: selectedUser?.name || '' })}
                  </p>
                  <p className="text-xs text-orange-700 mt-1">
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
    </div>
  );
}