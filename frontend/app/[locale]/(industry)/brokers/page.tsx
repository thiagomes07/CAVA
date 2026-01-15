'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useController } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { Plus, Mail, Phone, MessageCircle, Share2, Eye, UserX } from 'lucide-react';
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
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/lib/hooks/useToast';
import { inviteBrokerSchema, type InviteBrokerInput } from '@/lib/schemas/auth.schema';
import formatPhoneInput, { sanitizePhone } from '@/lib/utils/formatPhoneInput';
import { formatDate } from '@/lib/utils/formatDate';
import { formatPhone } from '@/lib/utils/validators';
import { truncateText } from '@/lib/utils/truncateText';
import { TRUNCATION_LIMITS } from '@/lib/config/truncationLimits';
import type { User } from '@/lib/types';
import { cn } from '@/lib/utils/cn';

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

  useEffect(() => {
    fetchBrokers();
  }, []);

  const fetchBrokers = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.get<BrokerWithStats[]>('/brokers');
      setBrokers(data);
    } catch (err) {
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
        whatsapp: sanitizePhone((data as any).whatsapp),
      });

      success(t('inviteSent', { email: data.email }));
      setShowInviteModal(false);
      reset();
      fetchBrokers();
    } catch (err) {
      error(t('inviteError'));
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
    } catch (err) {
      error(t('brokerStatusError'));
    }
  };

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
                      <Badge variant={broker.isActive ? 'DISPONIVEL' : 'INATIVO'}>
                        {broker.isActive ? tCommon('active') : tCommon('inactive')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
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
    </div>
  );
}