'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Mail, Phone, Link2, Receipt, Edit2, UserX } from 'lucide-react';
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
import { formatDate } from '@/lib/utils/formatDate';
import { formatPhone } from '@/lib/utils/validators';
import { truncateText } from '@/lib/utils/truncateText';
import { TRUNCATION_LIMITS } from '@/lib/config/truncationLimits';
import type { User } from '@/lib/types';
import { z } from 'zod';
import { cn } from '@/lib/utils/cn';

const inviteSellerSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').min(2, 'Nome deve ter no mínimo 2 caracteres'),
  email: z.string().min(1, 'Email é obrigatório').email('Email inválido'),
  phone: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^\d{10,11}$/.test(val.replace(/\D/g, '')),
      'Telefone inválido'
    ),
});

type InviteSellerInput = z.infer<typeof inviteSellerSchema>;

export default function TeamManagementPage() {
  const { success, error } = useToast();

  const [sellers, setSellers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<InviteSellerInput>({
    resolver: zodResolver(inviteSellerSchema),
  });

  useEffect(() => {
    fetchSellers();
  }, []);

  const fetchSellers = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.get<User[]>('/users', {
        params: { role: 'VENDEDOR_INTERNO' },
      });
      setSellers(data);
    } catch (err) {
      error('Erro ao carregar vendedores');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: InviteSellerInput) => {
    try {
      setIsSubmitting(true);

      await apiClient.post('/users', {
        ...data,
        role: 'VENDEDOR_INTERNO',
      });

      success('Vendedor cadastrado. Email de acesso enviado.');
      setShowInviteModal(false);
      reset();
      fetchSellers();
    } catch (err) {
      error('Erro ao cadastrar vendedor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await apiClient.patch(`/users/${userId}/status`, {
        isActive: !currentStatus,
      });

      success(
        currentStatus
          ? 'Vendedor desativado com sucesso'
          : 'Vendedor ativado com sucesso'
      );
      fetchSellers();
    } catch (err) {
      error('Erro ao alterar status do vendedor');
    }
  };

  const isEmpty = sellers.length === 0;

  return (
    <div className="min-h-screen bg-mineral">
      {/* Header */}
      <div className="bg-porcelain border-b border-slate-100 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl text-obsidian mb-2">
              Equipe Interna
            </h1>
            <p className="text-sm text-slate-500">
              Gerencie seus vendedores internos
            </p>
          </div>
          <Button variant="primary" onClick={() => setShowInviteModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            ADICIONAR VENDEDOR
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
            title="Nenhum vendedor cadastrado"
            description="Adicione vendedores internos para ajudar nas vendas"
            actionLabel="+ Adicionar Vendedor"
            onAction={() => setShowInviteModal(true)}
          />
        ) : (
          <div className="bg-porcelain rounded-sm border border-slate-100 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Links Criados</TableHead>
                  <TableHead>Vendas</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sellers.map((seller) => (
                  <TableRow key={seller.id}>
                    <TableCell>
                      <div>
                        <p 
                          className="font-medium text-obsidian"
                          title={seller.name}
                        >
                          {truncateText(seller.name, TRUNCATION_LIMITS.SELLER_NAME)}
                        </p>
                        <p className="text-xs text-slate-500">
                          Desde {formatDate(seller.createdAt, 'MMM yyyy')}
                        </p>
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
                      <Badge
                        variant={seller.isActive ? 'DISPONIVEL' : 'INATIVO'}
                      >
                        {seller.isActive ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            handleToggleStatus(seller.id, seller.isActive)
                          }
                          className={cn(
                            'p-2 rounded-sm transition-colors',
                            seller.isActive
                              ? 'hover:bg-rose-50 text-rose-600'
                              : 'hover:bg-emerald-50 text-emerald-600'
                          )}
                          title={seller.isActive ? 'Desativar' : 'Ativar'}
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
          <ModalTitle>Adicionar Vendedor</ModalTitle>
        </ModalHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <ModalContent>
            <div className="space-y-6">
              <Input
                {...register('name')}
                label="Nome Completo"
                placeholder="João Silva"
                error={errors.name?.message}
                disabled={isSubmitting}
              />

              <Input
                {...register('email')}
                type="email"
                label="Email"
                placeholder="joao@exemplo.com"
                helperText="Um email de acesso será enviado automaticamente"
                error={errors.email?.message}
                disabled={isSubmitting}
              />

              <Input
                {...register('phone')}
                label="Telefone (Opcional)"
                placeholder="(11) 98765-4321"
                error={errors.phone?.message}
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
              Cancelar
            </Button>
            <Button type="submit" variant="primary" loading={isSubmitting}>
              CRIAR ACESSO
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}