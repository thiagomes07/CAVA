"use client";

import { useState, useEffect } from 'react';
import { useForm, useController } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { Plus, Mail, Phone, Link2, Receipt, UserX, Shield, RefreshCw, Clock, MessageCircle, X, UserPlus } from 'lucide-react';
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
  whatsapp: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^\d{10,11}$/.test(val.replace(/\D/g, '')),
      'WhatsApp inválido'
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
        whatsapp: sanitizePhone(data.whatsapp),
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
                  <TableHead>WhatsApp</TableHead>
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
                              className="font-serif text-obsidian"
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
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded-full" title={t('pendingFirstLogin')}>
                            <Clock className="w-3 h-3" />
                            {t('pendingAccess')}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
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
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-5 bg-[#121212] text-white flex items-center justify-between">
              <div>
                <h2 className="font-serif text-xl">{t('addSellerTitle')}</h2>
                <p className="text-xs text-white/50 mt-0.5">Adicione um novo membro à equipe</p>
              </div>
              <button 
                onClick={() => setShowInviteModal(false)} 
                className="p-2 -mr-2 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="h-1 bg-[#C2410C]" />

            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="px-6 py-6 space-y-5 max-h-[60vh] overflow-y-auto">
                {/* Name */}
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-2">
                    {t('fullName')} <span className="text-[#C2410C]">*</span>
                  </label>
                  <input
                    {...register('name')}
                    placeholder="João Silva"
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
                    placeholder="joao@exemplo.com"
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
                    {t('phoneOptional')}
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

                {/* Admin Checkbox */}
                <div className="p-4 bg-slate-50 border border-slate-200">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      {...register('isAdmin')}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#C2410C] focus:ring-[#C2410C]"
                      disabled={isSubmitting}
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
                        <Shield className="w-4 h-4 text-amber-600" />
                        {t('isAdmin')}
                      </span>
                      <span className="text-xs text-slate-400 mt-0.5">
                        {t('isAdminDescription')}
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  disabled={isSubmitting}
                  className="text-slate-500 hover:text-[#121212] text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {tCommon('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={cn(
                    'flex items-center gap-1.5 px-5 py-2.5 text-white text-sm font-medium transition-all',
                    isSubmitting ? 'bg-slate-300 cursor-not-allowed' : 'bg-[#C2410C] hover:bg-[#a03609]'
                  )}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      {t('createAccess')}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
    </div >
  );
}