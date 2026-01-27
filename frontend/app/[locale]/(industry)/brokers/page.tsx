'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useController } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { Plus, Mail, Phone, MessageCircle, Share2, Eye, UserX, RefreshCw, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { apiClient, ApiError } from '@/lib/api/client';
import { useToast } from '@/lib/hooks/useToast';
import { inviteBrokerSchema, type InviteBrokerInput } from '@/lib/schemas/auth.schema';
import formatPhoneInput, { sanitizePhone } from '@/lib/utils/formatPhoneInput';
import { formatDate } from '@/lib/utils/formatDate';
import { formatPhone } from '@/lib/utils/validators';
import { truncateText } from '@/lib/utils/truncateText';
import { TRUNCATION_LIMITS } from '@/lib/config/truncationLimits';
import type { User } from '@/lib/types';
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

interface BrokerWithStats extends User {
  sharedBatchesCount: number;
}

export default function BrokersManagementPage() {
  const router = useRouter();
  const { success, error } = useToast();
  const t = useTranslations('brokers');
  const tCommon = useTranslations('common');
  const tTeam = useTranslations('team');

  const [brokers, setBrokers] = useState<BrokerWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showResendModal, setShowResendModal] = useState(false);
  const [selectedBroker, setSelectedBroker] = useState<BrokerWithStats | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
  }, []);

  const fetchBrokers = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.get<BrokerWithStats[]>('/brokers');
      setBrokers(data);
    } catch {
      error(t('loadError'));
    } finally {
      setIsLoading(false);
    }
  };

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

  // Check if user can have invite resent (never logged in)
  const canResendInvite = (broker: BrokerWithStats) => !broker.firstLoginAt;

  const isEmpty = brokers.length === 0;

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

      {/* Content */}
      <div className="px-8 py-8">
        {isLoading ? (
          <LoadingState variant="table" rows={5} columns={6} />
        ) : isEmpty ? (
          <EmptyState
            icon={Plus}
            title={t('noBrokers')}
            description={t('noBrokersDescription')}
            actionLabel={t('inviteBrokerButton')}
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
                  <TableHead>{t('sharedBatches')}</TableHead>
                  <TableHead>{tCommon('status')}</TableHead>
                  <TableHead>{tCommon('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {brokers.map((broker) => (
                  <TableRow key={broker.id}>
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
                      {broker.phone ? (
                        <a
                          href={`https://wa.me/${broker.phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 transition-colors"
                        >
                          <MessageCircle className="w-4 h-4" />
                          {tCommon('seeDetails')}
                        </a>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => router.push(`/brokers/${broker.id}/shared`)}
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
                            onClick={() => handleOpenResendModal(broker)}
                            className="p-2 hover:bg-blue-50 text-blue-600 rounded-sm transition-colors"
                            title={t('resendInvite')}
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => router.push(`/brokers/${broker.id}/shared`)}
                          className="p-2 hover:bg-slate-100 rounded-sm transition-colors"
                          title={t('manageBatches')}
                        >
                          <Eye className="w-4 h-4 text-slate-600" />
                        </button>

                        <button
                          onClick={() => handleToggleStatus(broker.id, broker.isActive)}
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
            <div className="space-y-6">
              <Input
                {...register('name')}
                label={tTeam('fullName')}
                placeholder="Maria Santos"
                error={errors.name?.message}
                disabled={isSubmitting}
              />

              <Input
                {...register('email')}
                type="email"
                label={tCommon('email')}
                placeholder="maria@exemplo.com"
                helperText={t('emailHelperText')}
                error={errors.email?.message}
                disabled={isSubmitting}
              />

              <Input
                value={phoneField.value}
                onChange={(e) => phoneField.onChange(formatPhoneInput(e.target.value))}
                label={tTeam('phoneOptional')}
                placeholder="(11) 98765-4321"
                error={errors.phone?.message}
                disabled={isSubmitting}
              />

              <Input
                value={whatsappField.value}
                onChange={(e) => whatsappField.onChange(formatPhoneInput(e.target.value))}
                label={t('whatsappOptional')}
                placeholder="(11) 98765-4321"
                helperText={t('whatsappHelperText')}
                error={errors.whatsapp?.message}
                disabled={isSubmitting}
              />
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
              {t('sendInvite')}
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
    </div>
  );
}