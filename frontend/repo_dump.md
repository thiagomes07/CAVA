# 📁 Dump Completo do Repositório

## `.\app\(auth)\login\page.tsx`:

```
'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/auth.store';
import { useToast } from '@/lib/hooks/useToast';
import { loginSchema, type LoginInput } from '@/lib/schemas/auth.schema';
import { cn } from '@/lib/utils/cn';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const login = useAuthStore((state) => state.login);
  const { success, error } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    try {
      setIsLoading(true);
      
      await login(data.email, data.password);
      
      success('Login realizado com sucesso');
      router.push(callbackUrl);
    } catch (err) {
      error('Email ou senha incorretos');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-12 bg-mineral">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-obsidian rounded-sm" />
            <span className="font-serif text-2xl font-semibold text-obsidian">CAVA</span>
          </div>

          {/* Title */}
          <div className="mb-8">
            <h1 className="font-serif text-4xl text-obsidian mb-2">
              Acesse sua conta
            </h1>
            <p className="text-slate-500">
              Entre com suas credenciais para continuar
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Email */}
            <div className="relative">
              <Input
                {...register('email')}
                type="email"
                placeholder="seu@email.com"
                error={errors.email?.message}
                disabled={isLoading}
                className="pl-12"
              />
              <Mail className="absolute left-4 top-[14px] w-5 h-5 text-slate-400" />
            </div>

            {/* Password */}
            <div className="relative">
              <Input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                placeholder="Sua senha"
                error={errors.password?.message}
                disabled={isLoading}
                className="pl-12 pr-12"
              />
              <Lock className="absolute left-4 top-[14px] w-5 h-5 text-slate-400" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-[14px] text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Forgot Password */}
            <div className="flex justify-end">
              <button
                type="button"
                className="text-sm text-slate-500 hover:text-obsidian transition-colors"
              >
                Esqueci minha senha
              </button>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={isLoading}
              className="w-full"
            >
              ENTRAR
            </Button>
          </form>

          {/* Footer */}
          <p className="text-xs text-slate-400 text-center mt-8">
            Ao continuar, você concorda com nossos Termos de Uso e Política de Privacidade
          </p>
        </div>
      </div>

      {/* Right Side - Hero Image */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Placeholder for hero image */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-800" />
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
        
        {/* Content */}
        <div className="relative z-10 flex items-center justify-center p-12 text-center">
          <div className="max-w-lg">
            <h2 className="font-serif text-5xl text-porcelain mb-6 leading-tight">
              Transforme pedras em obras de arte
            </h2>
            <p className="text-lg text-porcelain/80 leading-relaxed">
              A plataforma completa para gestão e comercialização de pedras naturais premium
            </p>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-porcelain/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-porcelain/5 rounded-full blur-3xl" />
      </div>
    </div>
  );
}
```

---

## `.\app\(broker)\dashboard\page.tsx`:

```
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PackageOpen, Link2, Inbox, TrendingUp, Plus, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/shared/LoadingState';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/lib/hooks/useToast';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { formatDate } from '@/lib/utils/formatDate';
import { formatArea } from '@/lib/utils/formatDimensions';
import type { SharedInventoryBatch, Sale } from '@/lib/types';
import { cn } from '@/lib/utils/cn';

interface BrokerMetrics {
  availableBatches: number;
  activeLinks: number;
  leadsCount: number;
  monthlyCommission: number;
}

export default function BrokerDashboardPage() {
  const router = useRouter();
  const { error } = useToast();

  const [metrics, setMetrics] = useState<BrokerMetrics | null>(null);
  const [recentBatches, setRecentBatches] = useState<SharedInventoryBatch[]>([]);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(true);
  const [isLoadingBatches, setIsLoadingBatches] = useState(true);
  const [isLoadingSales, setIsLoadingSales] = useState(true);

  useEffect(() => {
    fetchMetrics();
    fetchRecentBatches();
    fetchRecentSales();
  }, []);

  const fetchMetrics = async () => {
    try {
      setIsLoadingMetrics(true);
      const data = await apiClient.get<BrokerMetrics>('/broker/dashboard/metrics');
      setMetrics(data);
    } catch (err) {
      error('Erro ao carregar métricas');
    } finally {
      setIsLoadingMetrics(false);
    }
  };

  const fetchRecentBatches = async () => {
    try {
      setIsLoadingBatches(true);
      const data = await apiClient.get<SharedInventoryBatch[]>(
        '/broker/shared-inventory',
        { params: { recent: true, limit: 5 } }
      );
      setRecentBatches(data);
    } catch (err) {
      error('Erro ao carregar lotes recentes');
    } finally {
      setIsLoadingBatches(false);
    }
  };

  const fetchRecentSales = async () => {
    try {
      setIsLoadingSales(true);
      const data = await apiClient.get<Sale[]>('/broker/sales', {
        params: { limit: 10 },
      });
      setRecentSales(data);
    } catch (err) {
      error('Erro ao carregar vendas');
    } finally {
      setIsLoadingSales(false);
    }
  };

  return (
    <div className="min-h-screen bg-mineral">
      {/* Header */}
      <div className="bg-obsidian text-porcelain px-8 py-12">
        <div className="max-w-7xl mx-auto">
          <h1 className="font-serif text-4xl mb-2">Painel de Controle</h1>
          <p className="text-porcelain/60 text-lg">
            Visão geral das suas oportunidades
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {isLoadingMetrics ? (
            <>
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
            </>
          ) : (
            <>
              <MetricCard
                icon={PackageOpen}
                title="Lotes Disponíveis"
                value={metrics?.availableBatches || 0}
                subtitle="PARA MIM"
                color="emerald"
              />
              <MetricCard
                icon={Link2}
                title="Links Ativos"
                value={metrics?.activeLinks || 0}
                subtitle="GERADOS"
                color="blue"
              />
              <MetricCard
                icon={Inbox}
                title="Leads Capturados"
                value={metrics?.leadsCount || 0}
                subtitle="TOTAL"
                color="purple"
              />
              <MetricCard
                icon={TrendingUp}
                title="Comissão do Mês"
                value={formatCurrency(metrics?.monthlyCommission || 0)}
                subtitle="FATURAMENTO"
                color="amber"
              />
            </>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-obsidian mb-4">
            Ações Rápidas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="secondary"
              className="justify-start h-auto py-4"
              onClick={() => router.push('/shared-inventory')}
            >
              <Eye className="w-5 h-5 mr-3" />
              <div className="text-left">
                <p className="font-semibold">Ver Estoque</p>
                <p className="text-xs text-slate-500 font-normal">
                  Lotes compartilhados comigo
                </p>
              </div>
            </Button>

            <Button
              variant="secondary"
              className="justify-start h-auto py-4"
              onClick={() => router.push('/links/new')}
            >
              <Plus className="w-5 h-5 mr-3" />
              <div className="text-left">
                <p className="font-semibold">Criar Link</p>
                <p className="text-xs text-slate-500 font-normal">
                  Gerar link de venda
                </p>
              </div>
            </Button>

            <Button
              variant="secondary"
              className="justify-start h-auto py-4"
              onClick={() => router.push('/leads')}
            >
              <Inbox className="w-5 h-5 mr-3" />
              <div className="text-left">
                <p className="font-semibold">Ver Leads</p>
                <p className="text-xs text-slate-500 font-normal">
                  Gerenciar interessados
                </p>
              </div>
            </Button>
          </div>
        </div>

        {/* Recent Shared Batches */}
        <Card className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-obsidian">
              Novos Lotes Compartilhados
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/shared-inventory')}
            >
              Ver tudo
            </Button>
          </div>

          {isLoadingBatches ? (
            <LoadingState variant="cards" rows={3} />
          ) : recentBatches.length === 0 ? (
            <div className="text-center py-12">
              <PackageOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-400">
                Nenhum lote compartilhado recentemente
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {recentBatches.map((shared) => (
                <div
                  key={shared.id}
                  className="flex items-center gap-4 p-4 border border-slate-200 rounded-sm hover:border-obsidian transition-colors cursor-pointer"
                  onClick={() => router.push('/shared-inventory')}
                >
                  {shared.batch.medias?.[0] && (
                    <img
                      src={shared.batch.medias[0].url}
                      alt={shared.batch.batchCode}
                      className="w-20 h-20 rounded-sm object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <p className="font-mono text-sm font-semibold text-obsidian">
                      {shared.batch.batchCode}
                    </p>
                    <p className="text-sm text-slate-600">
                      {shared.batch.product?.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatArea(shared.batch.totalArea)} •{' '}
                      {formatCurrency(shared.negotiatedPrice || shared.batch.industryPrice)}
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push('/links/new');
                    }}
                  >
                    Criar Link
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent Sales */}
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-obsidian">
              Minhas Vendas Recentes
            </h2>
          </div>

          {isLoadingSales ? (
            <LoadingState variant="table" rows={5} columns={5} />
          ) : recentSales.length === 0 ? (
            <div className="text-center py-12">
              <TrendingUp className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-400">Nenhuma venda registrada ainda</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lote</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Valor Vendido</TableHead>
                    <TableHead>Minha Comissão</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentSales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell>
                        <span className="font-mono text-sm text-obsidian">
                          {sale.batch?.batchCode || '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-slate-600">{sale.customerName}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-serif text-obsidian">
                          {formatCurrency(sale.salePrice)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-emerald-600">
                          {formatCurrency(sale.brokerCommission || 0)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-500">
                          {formatDate(sale.saleDate)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

interface MetricCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string | number;
  subtitle: string;
  color: 'emerald' | 'blue' | 'amber' | 'purple';
}

function MetricCard({ icon: Icon, title, value, subtitle, color }: MetricCardProps) {
  const colorClasses = {
    emerald: 'text-emerald-600 bg-emerald-50',
    blue: 'text-blue-600 bg-blue-50',
    amber: 'text-amber-600 bg-amber-50',
    purple: 'text-purple-600 bg-purple-50',
  };

  return (
    <Card variant="elevated" className="relative overflow-hidden">
      <div className="flex items-start justify-between mb-4">
        <div className={cn('p-3 rounded-sm', colorClasses[color])}>
          <Icon className="w-6 h-6" />
        </div>
      </div>

      <div className="mb-2">
        <p className="font-serif text-5xl text-obsidian mb-1">
          {typeof value === 'number' && !value.toString().includes('R$')
            ? value.toLocaleString('pt-BR')
            : value}
        </p>
        <p className="uppercase tracking-widest text-[10px] text-slate-500 font-semibold">
          {subtitle}
        </p>
      </div>
    </Card>
  );
}

function MetricCardSkeleton() {
  return (
    <Card variant="elevated">
      <div className="animate-pulse">
        <div className="w-12 h-12 bg-slate-200 rounded-sm mb-4" />
        <div className="h-12 bg-slate-200 rounded w-32 mb-2" />
        <div className="h-4 bg-slate-200 rounded w-24" />
      </div>
    </Card>
  );
}
```

---

## `.\app\(broker)\leads\page.tsx`:

```
'use client';

export { default } from '@/app/(industry)/leads/page';
```

---

## `.\app\(broker)\links\new\page.tsx`:

```
'use client';

export { default } from '@/app/(industry)/links/new/page';
```

---

## `.\app\(broker)\links\page.tsx`:

```
'use client';

export { default } from '@/app/(industry)/links/page';
```

---

## `.\app\(broker)\shared-inventory\page.tsx`:

```
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Eye, Link2, Edit2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import { Modal, ModalHeader, ModalTitle, ModalContent, ModalFooter, ModalClose } from '@/components/ui/modal';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/lib/hooks/useToast';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { formatDimensions, formatArea } from '@/lib/utils/formatDimensions';
import type { SharedInventoryBatch, BatchStatus } from '@/lib/types';
import { batchStatuses } from '@/lib/schemas/batch.schema';
import { cn } from '@/lib/utils/cn';

interface SharedInventoryFilter {
  search: string;
  status: BatchStatus | '';
}

export default function BrokerSharedInventoryPage() {
  const router = useRouter();
  const { success, error } = useToast();

  const [sharedBatches, setSharedBatches] = useState<SharedInventoryBatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<SharedInventoryFilter>({
    search: '',
    status: '',
  });
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [newPrice, setNewPrice] = useState<number>(0);
  const [isUpdatingPrice, setIsUpdatingPrice] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<SharedInventoryBatch | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    fetchSharedInventory();
  }, []);

  const fetchSharedInventory = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.get<SharedInventoryBatch[]>('/broker/shared-inventory');
      setSharedBatches(data);
    } catch (err) {
      error('Erro ao carregar estoque');
      setSharedBatches([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePrice = async (sharedId: string) => {
    try {
      setIsUpdatingPrice(true);

      await apiClient.patch(`/broker/shared-inventory/${sharedId}/price`, {
        negotiatedPrice: newPrice,
      });

      success('Preço sugerido atualizado');
      setEditingPrice(null);
      fetchSharedInventory();
    } catch (err) {
      error('Erro ao atualizar preço');
    } finally {
      setIsUpdatingPrice(false);
    }
  };

  const handleStartEditPrice = (shared: SharedInventoryBatch) => {
    setEditingPrice(shared.id);
    setNewPrice(shared.negotiatedPrice || shared.batch.industryPrice);
  };

  const handleCancelEditPrice = () => {
    setEditingPrice(null);
    setNewPrice(0);
  };

  const handleViewDetails = (shared: SharedInventoryBatch) => {
    setSelectedBatch(shared);
    setShowDetailModal(true);
  };

  const filteredBatches = sharedBatches.filter((shared) => {
    if (filters.status && shared.batch.status !== filters.status) {
      return false;
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return (
        shared.batch.batchCode.toLowerCase().includes(searchLower) ||
        shared.batch.product?.name.toLowerCase().includes(searchLower)
      );
    }

    return true;
  });

  const isEmpty = filteredBatches.length === 0;
  const hasFilters = filters.search || filters.status;

  const calculateMargin = (shared: SharedInventoryBatch) => {
    const basePrice = shared.batch.industryPrice;
    const suggestedPrice = shared.negotiatedPrice || basePrice;
    return suggestedPrice - basePrice;
  };

  return (
    <div className="min-h-screen bg-mineral">
      {/* Header */}
      <div className="bg-porcelain border-b border-slate-100 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl text-obsidian mb-2">
              Estoque Disponível
            </h1>
            <p className="text-sm text-slate-500">
              Lotes compartilhados pela indústria
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => router.push('/links/new')}
          >
            <Link2 className="w-4 h-4 mr-2" />
            CRIAR LINK DE VENDA
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="px-8 py-6">
        <div className="bg-porcelain rounded-sm border border-slate-100 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Input
                placeholder="Buscar por código ou produto"
                value={filters.search}
                onChange={(e) =>
                  setFilters({ ...filters, search: e.target.value })
                }
              />
              <Search className="absolute right-3 top-3 w-5 h-5 text-slate-400 pointer-events-none" />
            </div>

            <Select
              value={filters.status}
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value as BatchStatus | '' })
              }
            >
              <option value="">Todos os Status</option>
              <option value="DISPONIVEL">Disponível</option>
              <option value="RESERVADO">Reservado</option>
            </Select>

            {hasFilters && (
              <Button
                variant="secondary"
                onClick={() => setFilters({ search: '', status: '' })}
              >
                Limpar Filtros
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-8 pb-8">
        {isLoading ? (
          <LoadingState variant="cards" rows={6} />
        ) : isEmpty ? (
          <EmptyState
            icon={Search}
            title={
              hasFilters
                ? 'Nenhum lote encontrado'
                : 'Nenhum lote disponível'
            }
            description={
              hasFilters
                ? 'Tente ajustar os filtros de busca'
                : 'Aguarde a indústria compartilhar lotes com você'
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBatches.map((shared) => {
              const margin = calculateMargin(shared);
              const marginPercent = (margin / shared.batch.industryPrice) * 100;
              const isEditing = editingPrice === shared.id;

              return (
                <Card
                  key={shared.id}
                  variant="elevated"
                  className="relative overflow-hidden"
                >
                  {/* Image */}
                  <div className="relative aspect-[4/3] -m-8 mb-4 overflow-hidden bg-slate-200">
                    {shared.batch.medias?.[0] ? (
                      <img
                        src={shared.batch.medias[0].url}
                        alt={shared.batch.batchCode}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-slate-400 text-sm">Sem foto</span>
                      </div>
                    )}
                    
                    {/* Status Badge */}
                    <div className="absolute top-4 right-4">
                      <Badge variant={shared.batch.status}>
                        {shared.batch.status}
                      </Badge>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="space-y-4">
                    {/* Product Info */}
                    <div>
                      <p className="font-mono text-sm font-semibold text-obsidian mb-1">
                        {shared.batch.batchCode}
                      </p>
                      <p className="font-serif text-xl text-obsidian">
                        {shared.batch.product?.name}
                      </p>
                    </div>

                    {/* Dimensions */}
                    <div className="flex items-center justify-between text-sm text-slate-600">
                      <span className="font-mono">
                        {formatDimensions(
                          shared.batch.height,
                          shared.batch.width,
                          shared.batch.thickness
                        )}
                      </span>
                      <span className="font-mono font-semibold">
                        {formatArea(shared.batch.totalArea)}
                      </span>
                    </div>

                    {/* Pricing Section */}
                    <div className="pt-4 border-t border-slate-200">
                      <div className="mb-3">
                        <p className="text-xs uppercase tracking-widest text-slate-500 mb-1">
                          Preço Base Indústria
                        </p>
                        <p className="text-lg font-serif text-slate-500 line-through">
                          {formatCurrency(shared.batch.industryPrice)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-widest text-emerald-600 mb-2">
                          Meu Preço Sugerido
                        </p>
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              step="0.01"
                              value={newPrice}
                              onChange={(e) => setNewPrice(parseFloat(e.target.value))}
                              disabled={isUpdatingPrice}
                              className="flex-1"
                            />
                            <button
                              onClick={() => handleUpdatePrice(shared.id)}
                              disabled={isUpdatingPrice}
                              className="p-2 bg-emerald-500 text-white rounded-sm hover:bg-emerald-600 transition-colors"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={handleCancelEditPrice}
                              disabled={isUpdatingPrice}
                              className="p-2 bg-slate-200 text-slate-600 rounded-sm hover:bg-slate-300 transition-colors"
                            >
                              ×
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <p className="text-2xl font-serif text-emerald-700">
                              {formatCurrency(shared.negotiatedPrice || shared.batch.industryPrice)}
                            </p>
                            <button
                              onClick={() => handleStartEditPrice(shared)}
                              className="p-2 hover:bg-slate-100 rounded-sm transition-colors"
                              title="Editar preço"
                            >
                              <Edit2 className="w-4 h-4 text-slate-600" />
                            </button>
                          </div>
                        )}

                        {!isEditing && margin > 0 && (
                          <p className="text-xs text-emerald-600 mt-1">
                            Margem: {formatCurrency(margin)} ({marginPercent.toFixed(1)}%)
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-4">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleViewDetails(shared)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Ver Detalhes
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        className="flex-1"
                        onClick={() => router.push('/links/new')}
                        disabled={shared.batch.status !== 'DISPONIVEL'}
                      >
                        <Link2 className="w-4 h-4 mr-2" />
                        Gerar Link
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Modal open={showDetailModal} onClose={() => setShowDetailModal(false)}>
        <ModalClose onClose={() => setShowDetailModal(false)} />
        <ModalHeader>
          <ModalTitle>Detalhes do Lote</ModalTitle>
        </ModalHeader>
        <ModalContent>
          {selectedBatch && (
            <div className="space-y-6">
              {/* Images Gallery */}
              {selectedBatch.batch.medias && selectedBatch.batch.medias.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {selectedBatch.batch.medias.map((media) => (
                    <img
                      key={media.id}
                      src={media.url}
                      alt="Lote"
                      className="w-full aspect-[4/3] object-cover rounded-sm"
                    />
                  ))}
                </div>
              )}

              {/* Basic Info */}
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-500 mb-2">
                  Identificação
                </p>
                <p className="font-mono text-lg font-semibold text-obsidian">
                  {selectedBatch.batch.batchCode}
                </p>
                <p className="text-slate-600">
                  {selectedBatch.batch.product?.name}
                </p>
              </div>

              {/* Specifications */}
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-500 mb-3">
                  Especificações
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-500">Dimensões</p>
                    <p className="font-mono text-sm text-obsidian">
                      {formatDimensions(
                        selectedBatch.batch.height,
                        selectedBatch.batch.width,
                        selectedBatch.batch.thickness
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Área Total</p>
                    <p className="font-mono text-sm text-obsidian">
                      {formatArea(selectedBatch.batch.totalArea)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Quantidade</p>
                    <p className="font-mono text-sm text-obsidian">
                      {selectedBatch.batch.quantitySlabs} chapa(s)
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Material</p>
                    <p className="text-sm text-obsidian">
                      {selectedBatch.batch.product?.material}
                    </p>
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div className="pt-4 border-t border-slate-200">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-sm">
                    <p className="text-xs uppercase tracking-widest text-slate-500 mb-1">
                      Preço Base
                    </p>
                    <p className="text-xl font-serif text-slate-700">
                      {formatCurrency(selectedBatch.batch.industryPrice)}
                    </p>
                  </div>
                  <div className="p-4 bg-emerald-50 rounded-sm">
                    <p className="text-xs uppercase tracking-widest text-emerald-600 mb-1">
                      Meu Preço
                    </p>
                    <p className="text-xl font-serif text-emerald-700">
                      {formatCurrency(selectedBatch.negotiatedPrice || selectedBatch.batch.industryPrice)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </ModalContent>
        <ModalFooter>
          <Button
            variant="secondary"
            onClick={() => setShowDetailModal(false)}
          >
            Fechar
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              setShowDetailModal(false);
              router.push('/links/new');
            }}
          >
            Criar Link de Venda
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
```

---

## `.\app\(industry)\brokers\[id]\shared\page.tsx`:

```
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Plus, X, Search, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Toggle } from '@/components/ui/toggle';
import { Card } from '@/components/ui/card';
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
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { formatDimensions, formatArea } from '@/lib/utils/formatDimensions';
import { formatDate } from '@/lib/utils/formatDate';
import type { User, Batch, SharedInventoryBatch } from '@/lib/types';
import { cn } from '@/lib/utils/cn';

export default function BrokerSharedInventoryPage() {
  const router = useRouter();
  const params = useParams();
  const brokerId = params.id as string;
  const { success, error } = useToast();

  const [broker, setBroker] = useState<User | null>(null);
  const [sharedBatches, setSharedBatches] = useState<SharedInventoryBatch[]>([]);
  const [availableBatches, setAvailableBatches] = useState<Batch[]>([]);
  const [catalogPermission, setCatalogPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const { register, handleSubmit, reset } = useForm<{ negotiatedPrice?: number }>();

  useEffect(() => {
    fetchBrokerData();
  }, [brokerId]);

  const fetchBrokerData = async () => {
    try {
      setIsLoading(true);

      const [brokerData, sharedData, availableData, permissionData] = await Promise.all([
        apiClient.get<User>(`/brokers/${brokerId}`),
        apiClient.get<SharedInventoryBatch[]>(`/brokers/${brokerId}/shared-inventory`),
        apiClient.get<{ batches: Batch[] }>('/batches', {
          params: { status: 'DISPONIVEL', limit: 1000 },
        }),
        apiClient.get<{ hasPermission: boolean }>(
          `/brokers/${brokerId}/catalog-permission`
        ),
      ]);

      setBroker(brokerData);
      setSharedBatches(sharedData);
      setAvailableBatches(availableData.batches);
      setCatalogPermission(permissionData.hasPermission);
    } catch (err) {
      error('Erro ao carregar dados');
      router.push('/brokers');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenShareModal = (batch: Batch) => {
    setSelectedBatch(batch);
    reset({ negotiatedPrice: batch.industryPrice });
    setShowShareModal(true);
  };

  const onSubmitShare = async (data: { negotiatedPrice?: number }) => {
    if (!selectedBatch) return;

    try {
      setIsSubmitting(true);

      await apiClient.post('/shared-inventory-batches', {
        batchId: selectedBatch.id,
        brokerUserId: brokerId,
        negotiatedPrice: data.negotiatedPrice || selectedBatch.industryPrice,
      });

      success(`Lote compartilhado com ${broker?.name}`);
      setShowShareModal(false);
      setSelectedBatch(null);
      fetchBrokerData();
    } catch (err) {
      error('Erro ao compartilhar lote');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveShare = async (shareId: string) => {
    try {
      await apiClient.delete(`/shared-inventory-batches/${shareId}`);
      success('Compartilhamento removido');
      fetchBrokerData();
    } catch (err) {
      error('Erro ao remover compartilhamento');
    }
  };

  const handleToggleCatalogPermission = async (newValue: boolean) => {
    try {
      if (newValue) {
        await apiClient.post('/shared-catalog-permissions', {
          brokerUserId: brokerId,
        });
        success('Acesso ao catálogo concedido');
      } else {
        await apiClient.delete(`/shared-catalog-permissions/${brokerId}`);
        success('Acesso ao catálogo removido');
      }
      setCatalogPermission(newValue);
    } catch (err) {
      error('Erro ao alterar permissão');
    }
  };

  const filteredAvailableBatches = availableBatches.filter((batch) => {
    const isAlreadyShared = sharedBatches.some((sb) => sb.batchId === batch.id);
    if (isAlreadyShared) return false;

    if (!searchTerm) return true;

    const searchLower = searchTerm.toLowerCase();
    return (
      batch.batchCode.toLowerCase().includes(searchLower) ||
      batch.product?.name.toLowerCase().includes(searchLower)
    );
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-mineral">
        <div className="px-8 py-8">
          <LoadingState variant="dashboard" />
        </div>
      </div>
    );
  }

  if (!broker) return null;

  return (
    <div className="min-h-screen bg-mineral">
      {/* Header */}
      <div className="bg-porcelain border-b border-slate-100 px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-slate-100 rounded-sm transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="font-serif text-3xl text-obsidian">
                  Estoque Compartilhado
                </h1>
              </div>
              <p className="text-sm text-slate-500">
                Gerenciar compartilhamentos com <strong>{broker.name}</strong>
              </p>
            </div>
          </div>

          <Button
            variant="primary"
            onClick={() => {
              if (filteredAvailableBatches.length > 0) {
                handleOpenShareModal(filteredAvailableBatches[0]);
              }
            }}
            disabled={availableBatches.length === 0}
          >
            <Plus className="w-4 h-4 mr-2" />
            COMPARTILHAR LOTE
          </Button>
        </div>
      </div>

      <div className="px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Shared Batches */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <h2 className="text-lg font-semibold text-obsidian mb-6">
                Lotes Compartilhados ({sharedBatches.length})
              </h2>

              {sharedBatches.length === 0 ? (
                <EmptyState
                  icon={Package}
                  title="Nenhum lote compartilhado"
                  description="Compartilhe lotes do seu estoque com este broker"
                />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Lote</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead>Dimensões</TableHead>
                        <TableHead>Preço Negociado</TableHead>
                        <TableHead>Compartilhado em</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sharedBatches.map((shared) => (
                        <TableRow key={shared.id}>
                          <TableCell>
                            <span className="font-mono text-sm text-obsidian">
                              {shared.batch.batchCode}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-slate-600">
                              {shared.batch.product?.name || '-'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-sm text-slate-600">
                              {formatDimensions(
                                shared.batch.height,
                                shared.batch.width,
                                shared.batch.thickness
                              )}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="font-serif text-obsidian">
                              {formatCurrency(
                                shared.negotiatedPrice || shared.batch.industryPrice
                              )}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-slate-500">
                              {formatDate(shared.sharedAt)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <button
                              onClick={() => handleRemoveShare(shared.id)}
                              className="p-2 hover:bg-rose-50 rounded-sm transition-colors text-rose-600"
                              title="Remover compartilhamento"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Card>
          </div>

          {/* Right Column - Catalog Permission */}
          <div className="space-y-6">
            <Card>
              <h2 className="text-lg font-semibold text-obsidian mb-6">
                Permissões
              </h2>

              <div className="space-y-4">
                <div className="p-4 bg-mineral rounded-sm">
                  <Toggle
                    checked={catalogPermission}
                    onChange={(e) => handleToggleCatalogPermission(e.target.checked)}
                    label="Permitir acesso ao catálogo completo"
                  />
                  <p className="text-xs text-slate-500 mt-2 ml-14">
                    Broker poderá ver todos os produtos, mas não necessariamente os lotes
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <p className="text-sm text-slate-600 mb-2">
                    <strong>Lotes compartilhados:</strong> {sharedBatches.length}
                  </p>
                  <p className="text-sm text-slate-600">
                    <strong>Catálogo público:</strong>{' '}
                    {catalogPermission ? 'Liberado' : 'Restrito'}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      <Modal open={showShareModal} onClose={() => setShowShareModal(false)}>
        <ModalClose onClose={() => setShowShareModal(false)} />
        <ModalHeader>
          <ModalTitle>Compartilhar Lote</ModalTitle>
        </ModalHeader>

        <form onSubmit={handleSubmit(onSubmitShare)}>
          <ModalContent>
            <div className="space-y-6">
              {/* Search Available Batches */}
              <div className="relative">
                <Input
                  placeholder="Buscar lote por código ou produto"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Search className="absolute right-3 top-3 w-5 h-5 text-slate-400 pointer-events-none" />
              </div>

              {/* Available Batches List */}
              <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-sm">
                {filteredAvailableBatches.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-slate-400">
                      {searchTerm
                        ? 'Nenhum lote encontrado'
                        : 'Todos os lotes já foram compartilhados'}
                    </p>
                  </div>
                ) : (
                  filteredAvailableBatches.map((batch) => (
                    <button
                      key={batch.id}
                      type="button"
                      onClick={() => {
                        setSelectedBatch(batch);
                        reset({ negotiatedPrice: batch.industryPrice });
                      }}
                      className={cn(
                        'w-full p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors text-left',
                        selectedBatch?.id === batch.id && 'bg-blue-50'
                      )}
                    >
                      <div className="flex items-center gap-4">
                        {batch.medias?.[0] && (
                          <img
                            src={batch.medias[0].url}
                            alt={batch.batchCode}
                            className="w-16 h-16 rounded-sm object-cover"
                          />
                        )}
                        <div className="flex-1">
                          <p className="font-mono text-sm font-semibold text-obsidian">
                            {batch.batchCode}
                          </p>
                          <p className="text-sm text-slate-600">
                            {batch.product?.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {formatArea(batch.totalArea)} •{' '}
                            {formatCurrency(batch.industryPrice)}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>

              {/* Selected Batch Preview */}
              {selectedBatch && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-sm">
                  <p className="text-xs uppercase tracking-widest text-blue-600 mb-2">
                    Lote Selecionado
                  </p>
                  <div className="flex items-center gap-4">
                    {selectedBatch.medias?.[0] && (
                      <img
                        src={selectedBatch.medias[0].url}
                        alt={selectedBatch.batchCode}
                        className="w-20 h-20 rounded-sm object-cover"
                      />
                    )}
                    <div>
                      <p className="font-mono font-semibold text-obsidian">
                        {selectedBatch.batchCode}
                      </p>
                      <p className="text-sm text-slate-600">
                        {selectedBatch.product?.name}
                      </p>
                      <p className="text-sm font-mono text-slate-500">
                        {formatDimensions(
                          selectedBatch.height,
                          selectedBatch.width,
                          selectedBatch.thickness
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Negotiated Price */}
              {selectedBatch && (
                <Input
                  {...register('negotiatedPrice', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  label="Preço de Repasse para este Broker (R$)"
                  helperText="Deixe vazio para usar o preço padrão do lote"
                  disabled={isSubmitting}
                />
              )}
            </div>
          </ModalContent>

          <ModalFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowShareModal(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting}
              disabled={!selectedBatch}
            >
              COMPARTILHAR
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}
```

---

## `.\app\(industry)\brokers\page.tsx`:

```
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { formatDate } from '@/lib/utils/formatDate';
import { formatPhone } from '@/lib/utils/validators';
import type { User } from '@/lib/types';
import { cn } from '@/lib/utils/cn';

interface BrokerWithStats extends User {
  sharedBatchesCount: number;
}

export default function BrokersManagementPage() {
  const router = useRouter();
  const { success, error } = useToast();

  const [brokers, setBrokers] = useState<BrokerWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<InviteBrokerInput>({
    resolver: zodResolver(inviteBrokerSchema),
  });

  useEffect(() => {
    fetchBrokers();
  }, []);

  const fetchBrokers = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.get<BrokerWithStats[]>('/brokers');
      setBrokers(data);
    } catch (err) {
      error('Erro ao carregar brokers');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: InviteBrokerInput) => {
    try {
      setIsSubmitting(true);

      await apiClient.post('/brokers/invite', data);

      success(`Convite enviado para ${data.email}`);
      setShowInviteModal(false);
      reset();
      fetchBrokers();
    } catch (err) {
      error('Erro ao convidar broker');
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
        currentStatus ? 'Broker desativado com sucesso' : 'Broker ativado com sucesso'
      );
      fetchBrokers();
    } catch (err) {
      error('Erro ao alterar status do broker');
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
              Parceiros (Brokers)
            </h1>
            <p className="text-sm text-slate-500">
              Gerencie seus parceiros comerciais
            </p>
          </div>
          <Button variant="primary" onClick={() => setShowInviteModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            CONVIDAR BROKER
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
            title="Nenhum parceiro cadastrado"
            description="Convide brokers para expandir sua rede de vendas"
            actionLabel="+ Convidar Broker"
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
                  <TableHead>WhatsApp</TableHead>
                  <TableHead>Lotes Compartilhados</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {brokers.map((broker) => (
                  <TableRow key={broker.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-obsidian">{broker.name}</p>
                        <p className="text-xs text-slate-500">
                          Desde {formatDate(broker.createdAt, 'MMM yyyy')}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-600">
                          {broker.email}
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
                          Abrir
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
                        {broker.isActive ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => router.push(`/brokers/${broker.id}/shared`)}
                          className="p-2 hover:bg-slate-100 rounded-sm transition-colors"
                          title="Ver compartilhamentos"
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
                          title={broker.isActive ? 'Desativar' : 'Ativar'}
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
          <ModalTitle>Convidar Broker</ModalTitle>
        </ModalHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <ModalContent>
            <div className="space-y-6">
              <Input
                {...register('name')}
                label="Nome Completo"
                placeholder="Maria Santos"
                error={errors.name?.message}
                disabled={isSubmitting}
              />

              <Input
                {...register('email')}
                type="email"
                label="Email"
                placeholder="maria@exemplo.com"
                helperText="Um convite de acesso será enviado para este email"
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

              <Input
                {...register('whatsapp')}
                label="WhatsApp (Opcional)"
                placeholder="(11) 98765-4321"
                helperText="Para facilitar a comunicação"
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
              Cancelar
            </Button>
            <Button type="submit" variant="primary" loading={isSubmitting}>
              ENVIAR CONVITE
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}
```

---

## `.\app\(industry)\catalog\[id]\page.tsx`:

```
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Upload, X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Toggle } from '@/components/ui/toggle';
import { Card } from '@/components/ui/card';
import { Modal, ModalHeader, ModalTitle, ModalContent, ModalFooter } from '@/components/ui/modal';
import { LoadingState } from '@/components/shared/LoadingState';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/lib/hooks/useToast';
import { productSchema, type ProductInput } from '@/lib/schemas/product.schema';
import { materialTypes, finishTypes } from '@/lib/schemas/product.schema';
import type { Product, Media } from '@/lib/types';
import { cn } from '@/lib/utils/cn';

interface UploadedMedia {
  file: File;
  preview: string;
  isCover: boolean;
}

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  const { success, error } = useToast();

  const [product, setProduct] = useState<Product | null>(null);
  const [existingMedias, setExistingMedias] = useState<Media[]>([]);
  const [newMedias, setNewMedias] = useState<UploadedMedia[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm<ProductInput>({
    resolver: zodResolver(productSchema),
  });

  const isPublic = watch('isPublic');

  useEffect(() => {
    fetchProduct();
  }, [productId]);

  const fetchProduct = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.get<Product>(`/products/${productId}`);
      setProduct(data);
      setExistingMedias(data.medias || []);
      
      reset({
        name: data.name,
        sku: data.sku || '',
        material: data.material,
        finish: data.finish,
        description: data.description || '',
        isPublic: data.isPublic,
      });
    } catch (err) {
      error('Erro ao carregar produto');
      router.push('/catalog');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    files.forEach((file) => {
      if (!file.type.startsWith('image/')) {
        error('Formato não suportado. Use JPG, PNG ou WebP');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        error('Arquivo excede o limite de 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        setNewMedias((prev) => [
          ...prev,
          {
            file,
            preview: event.target?.result as string,
            isCover: existingMedias.length === 0 && prev.length === 0,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const handleRemoveExistingMedia = (index: number) => {
    setExistingMedias((prev) => {
      const newMedias = prev.filter((_, i) => i !== index);
      if (newMedias.length > 0 && !newMedias.some((m) => m.isCover)) {
        newMedias[0].isCover = true;
      }
      return newMedias;
    });
  };

  const handleRemoveNewMedia = (index: number) => {
    setNewMedias((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      if (updated.length > 0 && existingMedias.length === 0 && !updated.some((m) => m.isCover)) {
        updated[0].isCover = true;
      }
      return updated;
    });
  };

  const handleSetExistingCover = (index: number) => {
    setExistingMedias((prev) =>
      prev.map((media, i) => ({
        ...media,
        isCover: i === index,
      }))
    );
    setNewMedias((prev) =>
      prev.map((media) => ({
        ...media,
        isCover: false,
      }))
    );
  };

  const handleSetNewCover = (index: number) => {
    setNewMedias((prev) =>
      prev.map((media, i) => ({
        ...media,
        isCover: i === index,
      }))
    );
    setExistingMedias((prev) =>
      prev.map((media) => ({
        ...media,
        isCover: false,
      }))
    );
  };

  const onSubmit = async (data: ProductInput) => {
    try {
      setIsSubmitting(true);

      let newMediaUrls: string[] = [];

      if (newMedias.length > 0) {
        const formData = new FormData();
        newMedias.forEach((media) => {
          formData.append('files', media.file);
        });

        const uploadResult = await apiClient.upload<{ urls: string[] }>(
          '/upload/product-medias',
          formData
        );
        newMediaUrls = uploadResult.urls;
      }

      const allMedias = [
        ...existingMedias.map((m, i) => ({
          url: m.url,
          displayOrder: i,
          isCover: m.isCover,
        })),
        ...newMediaUrls.map((url, i) => ({
          url,
          displayOrder: existingMedias.length + i,
          isCover: newMedias[i]?.isCover || false,
        })),
      ];

      const productData = {
        ...data,
        medias: allMedias,
      };

      await apiClient.put(`/products/${productId}`, productData);

      success('Produto atualizado com sucesso');
      router.push('/catalog');
    } catch (err) {
      error('Erro ao atualizar produto');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await apiClient.delete(`/products/${productId}`);
      success('Produto removido do catálogo');
      router.push('/catalog');
    } catch (err) {
      error('Erro ao remover produto');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-mineral">
        <div className="px-8 py-8">
          <div className="max-w-3xl mx-auto">
            <LoadingState variant="form" rows={8} />
          </div>
        </div>
      </div>
    );
  }

  if (!product) return null;

  const allMedias = [...existingMedias, ...newMedias.map(m => ({ ...m, id: `new-${Math.random()}` }))];

  return (
    <div className="min-h-screen bg-mineral">
      {/* Header */}
      <div className="bg-porcelain border-b border-slate-100 px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-slate-100 rounded-sm transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <h1 className="font-serif text-3xl text-obsidian">Editar Produto</h1>
              <p className="text-sm text-slate-500">{product.name}</p>
            </div>
          </div>

          <Button
            variant="destructive"
            onClick={() => setShowDeleteModal(true)}
            disabled={isSubmitting}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Excluir
          </Button>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="px-8 py-8">
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Informações Básicas */}
          <Card>
            <h2 className="text-lg font-semibold text-obsidian mb-6">
              Informações Básicas
            </h2>

            <div className="space-y-6">
              <Input
                {...register('name')}
                label="Nome do Produto"
                error={errors.name?.message}
                disabled={isSubmitting}
              />

              <Input
                {...register('sku')}
                label="Código SKU (Opcional)"
                error={errors.sku?.message}
                disabled={isSubmitting}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Select
                  {...register('material')}
                  label="Tipo de Material"
                  error={errors.material?.message}
                  disabled={isSubmitting}
                >
                  {materialTypes.map((material) => (
                    <option key={material} value={material}>
                      {material}
                    </option>
                  ))}
                </Select>

                <Select
                  {...register('finish')}
                  label="Acabamento"
                  error={errors.finish?.message}
                  disabled={isSubmitting}
                >
                  {finishTypes.map((finish) => (
                    <option key={finish} value={finish}>
                      {finish}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </Card>

          {/* Descrição Técnica */}
          <Card>
            <h2 className="text-lg font-semibold text-obsidian mb-6">
              Descrição Técnica
            </h2>

            <Textarea
              {...register('description')}
              rows={6}
              error={errors.description?.message}
              disabled={isSubmitting}
            />
          </Card>

          {/* Fotos de Catálogo */}
          <Card>
            <h2 className="text-lg font-semibold text-obsidian mb-6">
              Fotos de Catálogo
            </h2>

            <div className="mb-6">
              <label
                htmlFor="file-upload"
                className={cn(
                  'flex flex-col items-center justify-center w-full h-48',
                  'border-2 border-dashed border-slate-300 rounded-sm',
                  'cursor-pointer transition-colors',
                  'hover:border-obsidian hover:bg-slate-50',
                  isSubmitting && 'opacity-50 cursor-not-allowed'
                )}
              >
                <Upload className="w-12 h-12 text-slate-400 mb-4" />
                <p className="text-sm text-slate-600 mb-1">
                  Adicionar mais fotos
                </p>
                <p className="text-xs text-slate-400">
                  JPG, PNG ou WebP (máx. 5MB por arquivo)
                </p>
                <input
                  id="file-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handleFileSelect}
                  disabled={isSubmitting}
                  className="hidden"
                />
              </label>
            </div>

            {allMedias.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {existingMedias.map((media, index) => (
                  <MediaPreview
                    key={media.id}
                    preview={media.url}
                    isCover={media.isCover}
                    onSetCover={() => handleSetExistingCover(index)}
                    onRemove={() => handleRemoveExistingMedia(index)}
                  />
                ))}
                {newMedias.map((media, index) => (
                  <MediaPreview
                    key={`new-${index}`}
                    preview={media.preview}
                    isCover={media.isCover}
                    onSetCover={() => handleSetNewCover(index)}
                    onRemove={() => handleRemoveNewMedia(index)}
                  />
                ))}
              </div>
            )}
          </Card>

          {/* Visibilidade */}
          <Card>
            <h2 className="text-lg font-semibold text-obsidian mb-6">
              Visibilidade
            </h2>

            <Toggle
              checked={isPublic}
              onChange={(e) => setValue('isPublic', e.target.checked)}
              label="Exibir no catálogo público"
              disabled={isSubmitting}
            />
          </Card>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-200">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.back()}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary" loading={isSubmitting}>
              SALVAR ALTERAÇÕES
            </Button>
          </div>
        </div>
      </form>

      {/* Delete Confirmation Modal */}
      <Modal open={showDeleteModal} onClose={() => setShowDeleteModal(false)}>
        <ModalHeader>
          <ModalTitle>Excluir Produto</ModalTitle>
        </ModalHeader>
        <ModalContent>
          <p className="text-slate-600">
            Tem certeza que deseja excluir o produto <strong>"{product.name}"</strong>?
          </p>
          <p className="text-rose-600 text-sm mt-4">
            Esta ação não pode ser desfeita.
          </p>
        </ModalContent>
        <ModalFooter>
          <Button
            variant="secondary"
            onClick={() => setShowDeleteModal(false)}
            disabled={isDeleting}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            loading={isDeleting}
          >
            SIM, EXCLUIR
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

interface MediaPreviewProps {
  preview: string;
  isCover: boolean;
  onSetCover: () => void;
  onRemove: () => void;
}

function MediaPreview({ preview, isCover, onSetCover, onRemove }: MediaPreviewProps) {
  return (
    <div className="relative aspect-[4/3] rounded-sm overflow-hidden border-2 border-slate-200 group">
      <img
        src={preview}
        alt="Preview"
        className="w-full h-full object-cover"
      />

      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={onSetCover}
          className={cn(
            'px-3 py-1 rounded-sm text-xs font-semibold transition-colors',
            isCover
              ? 'bg-emerald-500 text-white'
              : 'bg-white text-obsidian hover:bg-slate-100'
          )}
        >
          {isCover ? 'Capa' : 'Definir Capa'}
        </button>

        <button
          type="button"
          onClick={onRemove}
          className="p-2 bg-rose-500 text-white rounded-sm hover:bg-rose-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {isCover && (
        <div className="absolute top-2 left-2">
          <span className="px-2 py-1 bg-emerald-500 text-white text-xs font-semibold rounded-sm">
            CAPA
          </span>
        </div>
      )}
    </div>
  );
}
```

---

## `.\app\(industry)\catalog\new\page.tsx`:

```
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Upload, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Toggle } from '@/components/ui/toggle';
import { Card } from '@/components/ui/card';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/lib/hooks/useToast';
import { productSchema, type ProductInput } from '@/lib/schemas/product.schema';
import { materialTypes, finishTypes } from '@/lib/schemas/product.schema';
import { cn } from '@/lib/utils/cn';

interface UploadedMedia {
  file: File;
  preview: string;
  isCover: boolean;
}

export default function NewProductPage() {
  const router = useRouter();
  const { success, error } = useToast();

  const [medias, setMedias] = useState<UploadedMedia[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<ProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      isPublic: true,
    },
  });

  const isPublic = watch('isPublic');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    files.forEach((file) => {
      if (!file.type.startsWith('image/')) {
        error('Formato não suportado. Use JPG, PNG ou WebP');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        error('Arquivo excede o limite de 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        setMedias((prev) => [
          ...prev,
          {
            file,
            preview: event.target?.result as string,
            isCover: prev.length === 0,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const handleRemoveMedia = (index: number) => {
    setMedias((prev) => {
      const newMedias = prev.filter((_, i) => i !== index);
      if (newMedias.length > 0 && !newMedias.some((m) => m.isCover)) {
        newMedias[0].isCover = true;
      }
      return newMedias;
    });
  };

  const handleSetCover = (index: number) => {
    setMedias((prev) =>
      prev.map((media, i) => ({
        ...media,
        isCover: i === index,
      }))
    );
  };

  const onSubmit = async (data: ProductInput) => {
    try {
      setIsSubmitting(true);

      let mediaUrls: string[] = [];

      if (medias.length > 0) {
        const formData = new FormData();
        medias.forEach((media) => {
          formData.append('files', media.file);
        });

        const uploadResult = await apiClient.upload<{ urls: string[] }>(
          '/upload/product-medias',
          formData
        );
        mediaUrls = uploadResult.urls;
      }

      const productData = {
        ...data,
        medias: mediaUrls.map((url, index) => ({
          url,
          displayOrder: index,
          isCover: medias[index]?.isCover || false,
        })),
      };

      await apiClient.post('/products', productData);

      success('Produto cadastrado com sucesso');
      router.push('/catalog');
    } catch (err) {
      error('Erro ao cadastrar produto');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-mineral">
      {/* Header */}
      <div className="bg-porcelain border-b border-slate-100 px-8 py-6">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-slate-100 rounded-sm transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="font-serif text-3xl text-obsidian">Novo Produto</h1>
            <p className="text-sm text-slate-500">
              Cadastre um novo tipo de pedra no catálogo
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="px-8 py-8">
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Informações Básicas */}
          <Card>
            <h2 className="text-lg font-semibold text-obsidian mb-6">
              Informações Básicas
            </h2>

            <div className="space-y-6">
              <Input
                {...register('name')}
                label="Nome do Produto"
                placeholder="Ex: Granito Preto São Gabriel"
                error={errors.name?.message}
                disabled={isSubmitting}
              />

              <Input
                {...register('sku')}
                label="Código SKU (Opcional)"
                placeholder="Ex: GRN-PSG-001"
                error={errors.sku?.message}
                disabled={isSubmitting}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Select
                  {...register('material')}
                  label="Tipo de Material"
                  error={errors.material?.message}
                  disabled={isSubmitting}
                >
                  <option value="">Selecione...</option>
                  {materialTypes.map((material) => (
                    <option key={material} value={material}>
                      {material}
                    </option>
                  ))}
                </Select>

                <Select
                  {...register('finish')}
                  label="Acabamento"
                  error={errors.finish?.message}
                  disabled={isSubmitting}
                >
                  <option value="">Selecione...</option>
                  {finishTypes.map((finish) => (
                    <option key={finish} value={finish}>
                      {finish}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </Card>

          {/* Descrição Técnica */}
          <Card>
            <h2 className="text-lg font-semibold text-obsidian mb-6">
              Descrição Técnica
            </h2>

            <Textarea
              {...register('description')}
              placeholder="Características técnicas, origem, recomendações de uso..."
              rows={6}
              error={errors.description?.message}
              disabled={isSubmitting}
            />
          </Card>

          {/* Fotos de Catálogo */}
          <Card>
            <h2 className="text-lg font-semibold text-obsidian mb-6">
              Fotos de Catálogo
            </h2>

            {/* Upload Zone */}
            <div className="mb-6">
              <label
                htmlFor="file-upload"
                className={cn(
                  'flex flex-col items-center justify-center w-full h-48',
                  'border-2 border-dashed border-slate-300 rounded-sm',
                  'cursor-pointer transition-colors',
                  'hover:border-obsidian hover:bg-slate-50',
                  isSubmitting && 'opacity-50 cursor-not-allowed'
                )}
              >
                <Upload className="w-12 h-12 text-slate-400 mb-4" />
                <p className="text-sm text-slate-600 mb-1">
                  Clique para selecionar ou arraste arquivos
                </p>
                <p className="text-xs text-slate-400">
                  JPG, PNG ou WebP (máx. 5MB por arquivo)
                </p>
                <input
                  id="file-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handleFileSelect}
                  disabled={isSubmitting}
                  className="hidden"
                />
              </label>
            </div>

            {/* Preview Grid */}
            {medias.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {medias.map((media, index) => (
                  <div
                    key={index}
                    className="relative aspect-[4/3] rounded-sm overflow-hidden border-2 border-slate-200 group"
                  >
                    <img
                      src={media.preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-full object-cover"
                    />

                    {/* Overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSetCover(index)}
                        className={cn(
                          'px-3 py-1 rounded-sm text-xs font-semibold transition-colors',
                          media.isCover
                            ? 'bg-emerald-500 text-white'
                            : 'bg-white text-obsidian hover:bg-slate-100'
                        )}
                      >
                        {media.isCover ? 'Capa' : 'Definir Capa'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemoveMedia(index)}
                        className="p-2 bg-rose-500 text-white rounded-sm hover:bg-rose-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Cover Badge */}
                    {media.isCover && (
                      <div className="absolute top-2 left-2">
                        <span className="px-2 py-1 bg-emerald-500 text-white text-xs font-semibold rounded-sm">
                          CAPA
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {medias.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-sm">
                Nenhuma foto adicionada ainda
              </div>
            )}
          </Card>

          {/* Visibilidade */}
          <Card>
            <h2 className="text-lg font-semibold text-obsidian mb-6">
              Visibilidade
            </h2>

            <Toggle
              checked={isPublic}
              onChange={(e) => setValue('isPublic', e.target.checked)}
              label="Exibir no catálogo público"
              disabled={isSubmitting}
            />
            <p className="text-xs text-slate-500 mt-2 ml-14">
              Quando ativado, este produto será visível em links de catálogo compartilhados
            </p>
          </Card>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-200">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.back()}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary" loading={isSubmitting}>
              SALVAR PRODUTO
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
```

---

## `.\app\(industry)\catalog\page.tsx`:

```
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Eye, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Toggle } from '@/components/ui/toggle';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/lib/hooks/useToast';
import type { Product } from '@/lib/types';
import type { ProductFilter } from '@/lib/schemas/product.schema';
import { materialTypes } from '@/lib/schemas/product.schema';
import { cn } from '@/lib/utils/cn';

export default function CatalogPage() {
  const router = useRouter();
  const { error } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<ProductFilter>({
    search: '',
    material: '',
    includeInactive: false,
    page: 1,
    limit: 24,
  });

  useEffect(() => {
    fetchProducts();
  }, [filters]);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.get<{ products: Product[]; total: number }>(
        '/products',
        { params: filters }
      );
      setProducts(data.products);
    } catch (err) {
      error('Erro ao carregar produtos');
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const hasFilters = filters.search || filters.material || filters.includeInactive;
  const isEmpty = products.length === 0;

  return (
    <div className="min-h-screen bg-mineral">
      {/* Header */}
      <div className="bg-porcelain border-b border-slate-100 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl text-obsidian mb-2">
              Catálogo
            </h1>
            <p className="text-sm text-slate-500">
              Gerencie seus produtos e tipos de pedra
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => router.push('/catalog/new')}
          >
            <Plus className="w-4 h-4 mr-2" />
            NOVO PRODUTO
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="px-8 py-6">
        <div className="bg-porcelain rounded-sm border border-slate-100 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Input
                placeholder="Buscar por nome ou SKU"
                value={filters.search}
                onChange={(e) =>
                  setFilters({ ...filters, search: e.target.value, page: 1 })
                }
              />
              <Search className="absolute right-3 top-3 w-5 h-5 text-slate-400 pointer-events-none" />
            </div>

            <Select
              value={filters.material}
              onChange={(e) =>
                setFilters({ ...filters, material: e.target.value, page: 1 })
              }
            >
              <option value="">Todos os Materiais</option>
              {materialTypes.map((material) => (
                <option key={material} value={material}>
                  {material}
                </option>
              ))}
            </Select>

            <div className="flex items-center">
              <Toggle
                checked={filters.includeInactive}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    includeInactive: e.target.checked,
                    page: 1,
                  })
                }
                label="Mostrar Inativos"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-8 pb-8">
        {isLoading ? (
          <LoadingState variant="cards" rows={6} />
        ) : isEmpty ? (
          <EmptyState
            icon={hasFilters ? Search : Plus}
            title={
              hasFilters
                ? `Nenhum resultado para "${filters.search}"`
                : 'Nenhum produto cadastrado'
            }
            description={
              hasFilters
                ? 'Tente ajustar os filtros de busca'
                : 'Comece adicionando seu primeiro produto ao catálogo'
            }
            actionLabel={hasFilters ? 'Limpar Filtros' : '+ Novo Produto'}
            onAction={() => {
              if (hasFilters) {
                setFilters({
                  search: '',
                  material: '',
                  includeInactive: false,
                  page: 1,
                  limit: 24,
                });
              } else {
                router.push('/catalog/new');
              }
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onView={() => router.push(`/inventory?productId=${product.id}`)}
                onEdit={() => router.push(`/catalog/${product.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface ProductCardProps {
  product: Product;
  onView: () => void;
  onEdit: () => void;
}

function ProductCard({ product, onView, onEdit }: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const coverImage = product.medias?.find((m) => m.isCover) || product.medias?.[0];

  return (
    <div
      className="bg-porcelain border border-slate-100 rounded-sm overflow-hidden group transition-all duration-200 hover:shadow-premium"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] bg-slate-200 overflow-hidden">
        {coverImage ? (
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
            style={{ backgroundImage: `url(${coverImage.url})` }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-slate-400 text-sm">Sem foto</span>
          </div>
        )}

        {/* Overlay on Hover */}
        {isHovered && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center gap-3 animate-in fade-in-0 duration-200">
            <Button variant="secondary" size="sm" onClick={onEdit}>
              <Edit2 className="w-4 h-4 mr-2" />
              Editar
            </Button>
            <Button variant="secondary" size="sm" onClick={onView}>
              <Eye className="w-4 h-4 mr-2" />
              Ver Lotes
            </Button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-serif text-xl text-obsidian">{product.name}</h3>
          <Badge variant={product.isActive ? 'DISPONIVEL' : 'INATIVO'}>
            {product.isActive ? 'Ativo' : 'Inativo'}
          </Badge>
        </div>

        {product.sku && (
          <p className="font-mono text-xs text-slate-400 mb-3">{product.sku}</p>
        )}

        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600">{product.material}</span>
          <span className="text-slate-500">
            {product.batchCount || 0} lote{product.batchCount !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </div>
  );
}
```

---

## `.\app\(industry)\dashboard\page.tsx`:

```
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Package, TrendingUp, Clock, Plus, Eye, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { LoadingState, LoadingSpinner } from '@/components/shared/LoadingState';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/lib/hooks/useToast';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { formatDate } from '@/lib/utils/formatDate';
import type { DashboardMetrics, Activity } from '@/lib/types';
import { cn } from '@/lib/utils/cn';

export default function IndustryDashboardPage() {
  const router = useRouter();
  const { error } = useToast();

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(true);
  const [isLoadingActivities, setIsLoadingActivities] = useState(true);

  useEffect(() => {
    fetchMetrics();
    fetchActivities();
  }, []);

  const fetchMetrics = async () => {
    try {
      setIsLoadingMetrics(true);
      const data = await apiClient.get<DashboardMetrics>('/dashboard/metrics');
      setMetrics(data);
    } catch (err) {
      error('Erro ao carregar métricas');
    } finally {
      setIsLoadingMetrics(false);
    }
  };

  const fetchActivities = async () => {
    try {
      setIsLoadingActivities(true);
      const data = await apiClient.get<Activity[]>('/dashboard/recent-activities');
      setActivities(data);
    } catch (err) {
      error('Erro ao carregar atividades');
    } finally {
      setIsLoadingActivities(false);
    }
  };

  return (
    <div className="min-h-screen bg-mineral">
      {/* Header */}
      <div className="bg-obsidian text-porcelain px-8 py-12">
        <div className="max-w-7xl mx-auto">
          <h1 className="font-serif text-4xl mb-2">Painel de Controle</h1>
          <p className="text-porcelain/60 text-lg">
            Visão geral do seu negócio
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {isLoadingMetrics ? (
            <>
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
            </>
          ) : (
            <>
              <MetricCard
                icon={Package}
                title="Estoque Disponível"
                value={metrics?.availableBatches || 0}
                subtitle="LOTES ATIVOS"
                color="emerald"
              />
              <MetricCard
                icon={TrendingUp}
                title="Vendas no Mês"
                value={formatCurrency(metrics?.monthlySales || 0)}
                subtitle="FATURAMENTO MENSAL"
                color="blue"
              />
              <MetricCard
                icon={Clock}
                title="Lotes Reservados"
                value={metrics?.reservedBatches || 0}
                subtitle="AGUARDANDO CONFIRMAÇÃO"
                color="amber"
              />
            </>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-obsidian mb-4">
            Ações Rápidas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="secondary"
              className="justify-start h-auto py-4"
              onClick={() => router.push('/inventory/new')}
            >
              <Plus className="w-5 h-5 mr-3" />
              <div className="text-left">
                <p className="font-semibold">Cadastrar Lote</p>
                <p className="text-xs text-slate-500 font-normal">
                  Adicionar novo lote ao estoque
                </p>
              </div>
            </Button>

            <Button
              variant="secondary"
              className="justify-start h-auto py-4"
              onClick={() => router.push('/inventory')}
            >
              <Eye className="w-5 h-5 mr-3" />
              <div className="text-left">
                <p className="font-semibold">Ver Estoque</p>
                <p className="text-xs text-slate-500 font-normal">
                  Consultar lotes disponíveis
                </p>
              </div>
            </Button>

            <Button
              variant="secondary"
              className="justify-start h-auto py-4"
              onClick={() => router.push('/sales')}
            >
              <Receipt className="w-5 h-5 mr-3" />
              <div className="text-left">
                <p className="font-semibold">Histórico de Vendas</p>
                <p className="text-xs text-slate-500 font-normal">
                  Ver todas as vendas
                </p>
              </div>
            </Button>
          </div>
        </div>

        {/* Recent Activities */}
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-obsidian">
              Últimas Movimentações
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/sales')}
            >
              Ver tudo
            </Button>
          </div>

          {isLoadingActivities ? (
            <LoadingState variant="table" rows={5} columns={5} />
          ) : activities.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-400">Nenhuma movimentação recente</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lote</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activities.map((activity) => (
                    <TableRow key={activity.id}>
                      <TableCell>
                        <span className="font-mono text-sm text-obsidian">
                          {activity.batchCode}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-slate-600">
                          {activity.productName}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-slate-600">
                          {activity.sellerName}
                        </span>
                      </TableCell>
                      <TableCell>
                        <ActivityBadge action={activity.action} />
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-500">
                          {formatDate(activity.date, 'dd/MM/yyyy HH:mm')}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

interface MetricCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string | number;
  subtitle: string;
  color: 'emerald' | 'blue' | 'amber';
}

function MetricCard({ icon: Icon, title, value, subtitle, color }: MetricCardProps) {
  const colorClasses = {
    emerald: 'text-emerald-600 bg-emerald-50',
    blue: 'text-blue-600 bg-blue-50',
    amber: 'text-amber-600 bg-amber-50',
  };

  return (
    <Card variant="elevated" className="relative overflow-hidden">
      <div className="flex items-start justify-between mb-4">
        <div className={cn('p-3 rounded-sm', colorClasses[color])}>
          <Icon className="w-6 h-6" />
        </div>
      </div>

      <div className="mb-2">
        <p className="font-serif text-5xl text-obsidian mb-1">
          {typeof value === 'number' && !value.toString().includes('R$')
            ? value.toLocaleString('pt-BR')
            : value}
        </p>
        <p className="uppercase tracking-widest text-[10px] text-slate-500 font-semibold">
          {subtitle}
        </p>
      </div>
    </Card>
  );
}

function MetricCardSkeleton() {
  return (
    <Card variant="elevated">
      <div className="animate-pulse">
        <div className="w-12 h-12 bg-slate-200 rounded-sm mb-4" />
        <div className="h-12 bg-slate-200 rounded w-32 mb-2" />
        <div className="h-4 bg-slate-200 rounded w-24" />
      </div>
    </Card>
  );
}

function ActivityBadge({ action }: { action: Activity['action'] }) {
  const variants: Record<Activity['action'], { label: string; color: string }> = {
    RESERVADO: { label: 'Reservado', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    VENDIDO: { label: 'Vendido', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    COMPARTILHADO: { label: 'Compartilhado', color: 'bg-purple-50 text-purple-700 border-purple-200' },
    CRIADO: { label: 'Criado', color: 'bg-slate-50 text-slate-700 border-slate-200' },
  };

  const variant = variants[action];

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-1 rounded-full text-[10px] uppercase tracking-widest font-semibold border',
        variant.color
      )}
    >
      {variant.label}
    </span>
  );
}
```

---

## `.\app\(industry)\inventory\[id]\page.tsx`:

```
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Upload, X, Package, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Modal, ModalHeader, ModalTitle, ModalContent, ModalFooter } from '@/components/ui/modal';
import { LoadingState } from '@/components/shared/LoadingState';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/lib/hooks/useToast';
import { batchSchema, type BatchInput } from '@/lib/schemas/batch.schema';
import { batchStatuses } from '@/lib/schemas/batch.schema';
import { calculateTotalArea, formatArea } from '@/lib/utils/formatDimensions';
import { formatDate } from '@/lib/utils/formatDate';
import type { Batch, Product, Media, BatchStatus } from '@/lib/types';
import { cn } from '@/lib/utils/cn';

interface UploadedMedia {
  file: File;
  preview: string;
}

export default function EditBatchPage() {
  const router = useRouter();
  const params = useParams();
  const batchId = params.id as string;
  const { success, error } = useToast();

  const [batch, setBatch] = useState<Batch | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [existingMedias, setExistingMedias] = useState<Media[]>([]);
  const [newMedias, setNewMedias] = useState<UploadedMedia[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [calculatedArea, setCalculatedArea] = useState<number>(0);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm<BatchInput>({
    resolver: zodResolver(batchSchema),
  });

  const height = watch('height');
  const width = watch('width');
  const quantitySlabs = watch('quantitySlabs');
  const productId = watch('productId');

  useEffect(() => {
    fetchProducts();
    fetchBatch();
  }, [batchId]);

  useEffect(() => {
    if (height && width && quantitySlabs) {
      const area = calculateTotalArea(height, width, quantitySlabs);
      setCalculatedArea(area);
    } else {
      setCalculatedArea(0);
    }
  }, [height, width, quantitySlabs]);

  const fetchProducts = async () => {
    try {
      const data = await apiClient.get<{ products: Product[] }>('/products', {
        params: { includeInactive: false, limit: 1000 },
      });
      setProducts(data.products);
    } catch (err) {
      error('Erro ao carregar produtos');
    }
  };

  const fetchBatch = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.get<Batch>(`/batches/${batchId}`);
      setBatch(data);
      setExistingMedias(data.medias || []);

      reset({
        productId: data.productId,
        batchCode: data.batchCode,
        height: data.height,
        width: data.width,
        thickness: data.thickness,
        quantitySlabs: data.quantitySlabs,
        industryPrice: data.industryPrice,
        originQuarry: data.originQuarry || '',
        entryDate: formatDate(data.entryDate, 'yyyy-MM-dd'),
      });
    } catch (err) {
      error('Erro ao carregar lote');
      router.push('/inventory');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const totalPhotos = existingMedias.length + newMedias.length + files.length;

    if (totalPhotos > 10) {
      error('Máximo de 10 fotos por lote');
      return;
    }

    files.forEach((file) => {
      if (!file.type.startsWith('image/')) {
        error('Formato não suportado. Use JPG, PNG ou WebP');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        error('Arquivo excede o limite de 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        setNewMedias((prev) => [
          ...prev,
          {
            file,
            preview: event.target?.result as string,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const handleRemoveExistingMedia = (index: number) => {
    setExistingMedias((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveNewMedia = (index: number) => {
    setNewMedias((prev) => prev.filter((_, i) => i !== index));
  };

  const handleReorderExisting = (fromIndex: number, toIndex: number) => {
    setExistingMedias((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return updated.map((media, i) => ({ ...media, displayOrder: i }));
    });
  };

  const onSubmit = async (data: BatchInput) => {
    try {
      setIsSubmitting(true);

      let newMediaUrls: string[] = [];

      if (newMedias.length > 0) {
        const formData = new FormData();
        newMedias.forEach((media) => {
          formData.append('files', media.file);
        });

        const uploadResult = await apiClient.upload<{ urls: string[] }>(
          '/upload/batch-medias',
          formData
        );
        newMediaUrls = uploadResult.urls;
      }

      const allMedias = [
        ...existingMedias.map((m, i) => ({
          url: m.url,
          displayOrder: i,
          isCover: i === 0,
        })),
        ...newMediaUrls.map((url, i) => ({
          url,
          displayOrder: existingMedias.length + i,
          isCover: existingMedias.length === 0 && i === 0,
        })),
      ];

      const batchData = {
        ...data,
        medias: allMedias,
      };

      await apiClient.put(`/batches/${batchId}`, batchData);

      success('Lote atualizado com sucesso');
      router.push('/inventory');
    } catch (err) {
      error('Erro ao atualizar lote');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await apiClient.patch(`/batches/${batchId}/status`, { status: 'INATIVO' });
      success('Lote arquivado com sucesso');
      router.push('/inventory');
    } catch (err) {
      error('Erro ao arquivar lote');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-mineral">
        <div className="px-8 py-8">
          <div className="max-w-4xl mx-auto">
            <LoadingState variant="form" rows={10} />
          </div>
        </div>
      </div>
    );
  }

  if (!batch) return null;

  const selectedProduct = products.find((p) => p.id === productId);
  const allMedias = [...existingMedias, ...newMedias.map((m) => ({ ...m, id: `new-${Math.random()}` }))];

  return (
    <div className="min-h-screen bg-mineral">
      {/* Header */}
      <div className="bg-porcelain border-b border-slate-100 px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-slate-100 rounded-sm transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="font-serif text-3xl text-obsidian">
                  Editar Lote
                </h1>
                <Badge variant={batch.status}>{batch.status}</Badge>
              </div>
              <p className="text-sm text-slate-500 font-mono">{batch.batchCode}</p>
            </div>
          </div>

          <Button
            variant="destructive"
            onClick={() => setShowDeleteModal(true)}
            disabled={isSubmitting || batch.status === 'VENDIDO'}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Arquivar
          </Button>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="px-8 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Vinculação */}
          <Card>
            <h2 className="text-lg font-semibold text-obsidian mb-6">
              Vinculação
            </h2>

            <div className="space-y-4">
              <Select
                {...register('productId')}
                label="Produto"
                error={errors.productId?.message}
                disabled={isSubmitting}
              >
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} {product.sku && `(${product.sku})`}
                  </option>
                ))}
              </Select>

              {selectedProduct && (
                <div className="flex items-center gap-4 p-4 bg-mineral rounded-sm">
                  {selectedProduct.medias?.[0] && (
                    <img
                      src={selectedProduct.medias[0].url}
                      alt={selectedProduct.name}
                      className="w-20 h-20 rounded-sm object-cover"
                    />
                  )}
                  <div>
                    <p className="font-semibold text-obsidian">
                      {selectedProduct.name}
                    </p>
                    <p className="text-sm text-slate-500">
                      {selectedProduct.material} • {selectedProduct.finish}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Identificação */}
          <Card>
            <h2 className="text-lg font-semibold text-obsidian mb-6">
              Identificação
            </h2>

            <div className="space-y-6">
              <Input
                {...register('batchCode')}
                label="Código do Lote"
                error={errors.batchCode?.message}
                disabled={isSubmitting}
              />

              <Input
                {...register('originQuarry')}
                label="Pedreira de Origem (Opcional)"
                error={errors.originQuarry?.message}
                disabled={isSubmitting}
              />

              <Input
                {...register('entryDate')}
                type="date"
                label="Data de Entrada"
                error={errors.entryDate?.message}
                disabled={isSubmitting}
              />
            </div>
          </Card>

          {/* Dimensões Físicas */}
          <Card>
            <h2 className="text-lg font-semibold text-obsidian mb-6">
              Dimensões Físicas
            </h2>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  {...register('height', { valueAsNumber: true })}
                  type="number"
                  step="0.1"
                  label="Altura (cm)"
                  error={errors.height?.message}
                  disabled={isSubmitting}
                />

                <Input
                  {...register('width', { valueAsNumber: true })}
                  type="number"
                  step="0.1"
                  label="Largura (cm)"
                  error={errors.width?.message}
                  disabled={isSubmitting}
                />

                <Input
                  {...register('thickness', { valueAsNumber: true })}
                  type="number"
                  step="0.1"
                  label="Espessura (cm)"
                  error={errors.thickness?.message}
                  disabled={isSubmitting}
                />

                <Input
                  {...register('quantitySlabs', { valueAsNumber: true })}
                  type="number"
                  label="Quantidade de Chapas"
                  error={errors.quantitySlabs?.message}
                  disabled={isSubmitting}
                />
              </div>

              {calculatedArea > 0 && (
                <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-sm">
                  <Package className="w-5 h-5 text-emerald-600" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-900">
                      Área Total Calculada
                    </p>
                    <p className="text-2xl font-mono font-bold text-emerald-700">
                      {formatArea(calculatedArea)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Precificação */}
          <Card>
            <h2 className="text-lg font-semibold text-obsidian mb-6">
              Precificação
            </h2>

            <Input
              {...register('industryPrice', { valueAsNumber: true })}
              type="number"
              step="0.01"
              label="Preço Base Indústria (R$)"
              helperText="Este é o preço de repasse para brokers"
              error={errors.industryPrice?.message}
              disabled={isSubmitting}
            />
          </Card>

          {/* Fotos do Lote */}
          <Card>
            <h2 className="text-lg font-semibold text-obsidian mb-6">
              Fotos do Lote
            </h2>

            <div className="mb-6">
              <label
                htmlFor="file-upload"
                className={cn(
                  'flex flex-col items-center justify-center w-full h-48',
                  'border-2 border-dashed border-slate-300 rounded-sm',
                  'cursor-pointer transition-colors',
                  'hover:border-obsidian hover:bg-slate-50',
                  (isSubmitting || allMedias.length >= 10) && 'opacity-50 cursor-not-allowed'
                )}
              >
                <Upload className="w-12 h-12 text-slate-400 mb-4" />
                <p className="text-sm text-slate-600 mb-1">
                  Adicionar mais fotos
                </p>
                <p className="text-xs text-slate-400">
                  {allMedias.length}/10 fotos • JPG, PNG ou WebP • 5MB máx.
                </p>
                <input
                  id="file-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handleFileSelect}
                  disabled={isSubmitting || allMedias.length >= 10}
                  className="hidden"
                />
              </label>
              <p className="text-xs text-slate-500 mt-2">
                A primeira foto será a capa do lote
              </p>
            </div>

            {allMedias.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {existingMedias.map((media, index) => (
                  <MediaPreview
                    key={media.id}
                    preview={media.url}
                    isCover={index === 0}
                    onRemove={() => handleRemoveExistingMedia(index)}
                  />
                ))}
                {newMedias.map((media, index) => (
                  <MediaPreview
                    key={`new-${index}`}
                    preview={media.preview}
                    isCover={existingMedias.length === 0 && index === 0}
                    onRemove={() => handleRemoveNewMedia(index)}
                  />
                ))}
              </div>
            )}
          </Card>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-200">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.back()}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary" loading={isSubmitting}>
              SALVAR ALTERAÇÕES
            </Button>
          </div>
        </div>
      </form>

      {/* Delete Confirmation Modal */}
      <Modal open={showDeleteModal} onClose={() => setShowDeleteModal(false)}>
        <ModalHeader>
          <ModalTitle>Arquivar Lote</ModalTitle>
        </ModalHeader>
        <ModalContent>
          <p className="text-slate-600">
            Tem certeza que deseja arquivar o lote{' '}
            <strong className="font-mono">"{batch.batchCode}"</strong>?
          </p>
          <p className="text-amber-600 text-sm mt-4">
            O lote será marcado como inativo e não aparecerá mais nas listagens.
          </p>
        </ModalContent>
        <ModalFooter>
          <Button
            variant="secondary"
            onClick={() => setShowDeleteModal(false)}
            disabled={isDeleting}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            loading={isDeleting}
          >
            ARQUIVAR
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

interface MediaPreviewProps {
  preview: string;
  isCover: boolean;
  onRemove: () => void;
}

function MediaPreview({ preview, isCover, onRemove }: MediaPreviewProps) {
  return (
    <div className="relative aspect-[4/3] rounded-sm overflow-hidden border-2 border-slate-200 group">
      <img
        src={preview}
        alt="Preview"
        className="w-full h-full object-cover"
      />

      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <button
          type="button"
          onClick={onRemove}
          className="p-2 bg-rose-500 text-white rounded-sm hover:bg-rose-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {isCover && (
        <div className="absolute top-2 left-2">
          <span className="px-2 py-1 bg-blue-500 text-white text-xs font-semibold rounded-sm">
            CAPA
          </span>
        </div>
      )}
    </div>
  );
}
```

---

## `.\app\(industry)\inventory\new\page.tsx`:

```
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Upload, X, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/lib/hooks/useToast';
import { batchSchema, type BatchInput } from '@/lib/schemas/batch.schema';
import { calculateTotalArea, formatArea } from '@/lib/utils/formatDimensions';
import type { Product } from '@/lib/types';
import { cn } from '@/lib/utils/cn';

interface UploadedMedia {
  file: File;
  preview: string;
}

export default function NewBatchPage() {
  const router = useRouter();
  const { success, error } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [medias, setMedias] = useState<UploadedMedia[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [calculatedArea, setCalculatedArea] = useState<number>(0);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<BatchInput>({
    resolver: zodResolver(batchSchema),
    defaultValues: {
      quantitySlabs: 1,
      entryDate: new Date().toISOString().split('T')[0],
    },
  });

  const height = watch('height');
  const width = watch('width');
  const quantitySlabs = watch('quantitySlabs');
  const productId = watch('productId');

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (height && width && quantitySlabs) {
      const area = calculateTotalArea(height, width, quantitySlabs);
      setCalculatedArea(area);
    } else {
      setCalculatedArea(0);
    }
  }, [height, width, quantitySlabs]);

  const fetchProducts = async () => {
    try {
      const data = await apiClient.get<{ products: Product[] }>('/products', {
        params: { includeInactive: false, limit: 1000 },
      });
      setProducts(data.products);
    } catch (err) {
      error('Erro ao carregar produtos');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    if (medias.length + files.length > 10) {
      error('Máximo de 10 fotos por lote');
      return;
    }

    files.forEach((file) => {
      if (!file.type.startsWith('image/')) {
        error('Formato não suportado. Use JPG, PNG ou WebP');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        error('Arquivo excede o limite de 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        setMedias((prev) => [
          ...prev,
          {
            file,
            preview: event.target?.result as string,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const handleRemoveMedia = (index: number) => {
    setMedias((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: BatchInput) => {
    try {
      setIsSubmitting(true);

      let mediaUrls: string[] = [];

      if (medias.length > 0) {
        const formData = new FormData();
        medias.forEach((media) => {
          formData.append('files', media.file);
        });

        const uploadResult = await apiClient.upload<{ urls: string[] }>(
          '/upload/batch-medias',
          formData
        );
        mediaUrls = uploadResult.urls;
      }

      const batchData = {
        ...data,
        medias: mediaUrls.map((url, index) => ({
          url,
          displayOrder: index,
          isCover: index === 0,
        })),
      };

      await apiClient.post('/batches', batchData);

      success('Lote cadastrado com sucesso');
      router.push('/inventory');
    } catch (err) {
      error('Erro ao cadastrar lote');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedProduct = products.find((p) => p.id === productId);

  return (
    <div className="min-h-screen bg-mineral">
      {/* Header */}
      <div className="bg-porcelain border-b border-slate-100 px-8 py-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-slate-100 rounded-sm transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="font-serif text-3xl text-obsidian">Novo Lote</h1>
            <p className="text-sm text-slate-500">
              Cadastre um novo lote físico no estoque
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="px-8 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Vinculação */}
          <Card>
            <h2 className="text-lg font-semibold text-obsidian mb-6">
              Vinculação
            </h2>

            <div className="space-y-4">
              <Select
                {...register('productId')}
                label="Produto"
                error={errors.productId?.message}
                disabled={isSubmitting}
              >
                <option value="">Selecione o produto...</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} {product.sku && `(${product.sku})`}
                  </option>
                ))}
              </Select>

              {selectedProduct && (
                <div className="flex items-center gap-4 p-4 bg-mineral rounded-sm">
                  {selectedProduct.medias?.[0] && (
                    <img
                      src={selectedProduct.medias[0].url}
                      alt={selectedProduct.name}
                      className="w-20 h-20 rounded-sm object-cover"
                    />
                  )}
                  <div>
                    <p className="font-semibold text-obsidian">
                      {selectedProduct.name}
                    </p>
                    <p className="text-sm text-slate-500">
                      {selectedProduct.material} • {selectedProduct.finish}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Identificação */}
          <Card>
            <h2 className="text-lg font-semibold text-obsidian mb-6">
              Identificação
            </h2>

            <div className="space-y-6">
              <Input
                {...register('batchCode')}
                label="Código do Lote"
                placeholder="Ex: GRN-000123"
                helperText="Use apenas letras maiúsculas, números e hífens"
                error={errors.batchCode?.message}
                disabled={isSubmitting}
              />

              <Input
                {...register('originQuarry')}
                label="Pedreira de Origem (Opcional)"
                placeholder="Ex: Pedreira São Gabriel"
                error={errors.originQuarry?.message}
                disabled={isSubmitting}
              />

              <Input
                {...register('entryDate')}
                type="date"
                label="Data de Entrada"
                error={errors.entryDate?.message}
                disabled={isSubmitting}
              />
            </div>
          </Card>

          {/* Dimensões Físicas */}
          <Card>
            <h2 className="text-lg font-semibold text-obsidian mb-6">
              Dimensões Físicas
            </h2>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  {...register('height', { valueAsNumber: true })}
                  type="number"
                  step="0.1"
                  label="Altura (cm)"
                  placeholder="180"
                  error={errors.height?.message}
                  disabled={isSubmitting}
                />

                <Input
                  {...register('width', { valueAsNumber: true })}
                  type="number"
                  step="0.1"
                  label="Largura (cm)"
                  placeholder="120"
                  error={errors.width?.message}
                  disabled={isSubmitting}
                />

                <Input
                  {...register('thickness', { valueAsNumber: true })}
                  type="number"
                  step="0.1"
                  label="Espessura (cm)"
                  placeholder="3"
                  error={errors.thickness?.message}
                  disabled={isSubmitting}
                />

                <Input
                  {...register('quantitySlabs', { valueAsNumber: true })}
                  type="number"
                  label="Quantidade de Chapas"
                  placeholder="1"
                  error={errors.quantitySlabs?.message}
                  disabled={isSubmitting}
                />
              </div>

              {/* Área Total Calculada */}
              {calculatedArea > 0 && (
                <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-sm">
                  <Package className="w-5 h-5 text-emerald-600" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-900">
                      Área Total Calculada
                    </p>
                    <p className="text-2xl font-mono font-bold text-emerald-700">
                      {formatArea(calculatedArea)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Precificação */}
          <Card>
            <h2 className="text-lg font-semibold text-obsidian mb-6">
              Precificação
            </h2>

            <Input
              {...register('industryPrice', { valueAsNumber: true })}
              type="number"
              step="0.01"
              label="Preço Base Indústria (R$)"
              placeholder="5000.00"
              helperText="Este é o preço de repasse para brokers"
              error={errors.industryPrice?.message}
              disabled={isSubmitting}
            />
          </Card>

          {/* Fotos do Lote */}
          <Card>
            <h2 className="text-lg font-semibold text-obsidian mb-6">
              Fotos do Lote
            </h2>

            <div className="mb-6">
              <label
                htmlFor="file-upload"
                className={cn(
                  'flex flex-col items-center justify-center w-full h-48',
                  'border-2 border-dashed border-slate-300 rounded-sm',
                  'cursor-pointer transition-colors',
                  'hover:border-obsidian hover:bg-slate-50',
                  isSubmitting && 'opacity-50 cursor-not-allowed'
                )}
              >
                <Upload className="w-12 h-12 text-slate-400 mb-4" />
                <p className="text-sm text-slate-600 mb-1">
                  Adicionar fotos do lote
                </p>
                <p className="text-xs text-slate-400">
                  JPG, PNG ou WebP • Máximo 10 fotos • 5MB por arquivo
                </p>
                <input
                  id="file-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handleFileSelect}
                  disabled={isSubmitting}
                  className="hidden"
                />
              </label>
              <p className="text-xs text-slate-500 mt-2">
                A primeira foto será a capa do lote
              </p>
            </div>

            {medias.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {medias.map((media, index) => (
                  <div
                    key={index}
                    className="relative aspect-[4/3] rounded-sm overflow-hidden border-2 border-slate-200 group"
                  >
                    <img
                      src={media.preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-full object-cover"
                    />

                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveMedia(index)}
                        className="p-2 bg-rose-500 text-white rounded-sm hover:bg-rose-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {index === 0 && (
                      <div className="absolute top-2 left-2">
                        <span className="px-2 py-1 bg-blue-500 text-white text-xs font-semibold rounded-sm">
                          CAPA
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-200">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.back()}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary" loading={isSubmitting}>
              SALVAR LOTE
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
```

---

## `.\app\(industry)\inventory\page.tsx`:

```
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Search, Edit2, Eye, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Pagination } from '@/components/shared/Pagination';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/lib/hooks/useToast';
import { useAuth } from '@/lib/hooks/useAuth';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { formatDimensions, formatArea } from '@/lib/utils/formatDimensions';
import type { Batch, Product, BatchStatus } from '@/lib/types';
import type { BatchFilter } from '@/lib/schemas/batch.schema';
import { batchStatuses } from '@/lib/schemas/batch.schema';
import { cn } from '@/lib/utils/cn';

export default function InventoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { error } = useToast();
  const { hasPermission } = useAuth();

  const [batches, setBatches] = useState<Batch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);

  const [filters, setFilters] = useState<BatchFilter>({
    productId: searchParams.get('productId') || '',
    status: (searchParams.get('status') as BatchStatus) || '',
    code: searchParams.get('code') || '',
    page: parseInt(searchParams.get('page') || '1'),
    limit: 50,
  });

  const canEdit = hasPermission('ADMIN_INDUSTRIA');

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    fetchBatches();
  }, [filters]);

  const fetchProducts = async () => {
    try {
      const data = await apiClient.get<{ products: Product[] }>('/products', {
        params: { includeInactive: false, limit: 1000 },
      });
      setProducts(data.products);
    } catch (err) {
      error('Erro ao carregar produtos');
    }
  };

  const fetchBatches = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.get<{
        batches: Batch[];
        total: number;
        page: number;
      }>('/batches', { params: filters });

      setBatches(data.batches);
      setTotalItems(data.total);
    } catch (err) {
      error('Erro ao carregar estoque');
      setBatches([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearFilters = () => {
    setFilters({
      productId: '',
      status: '',
      code: '',
      page: 1,
      limit: 50,
    });
    router.push('/inventory');
  };

  const hasFilters = filters.productId || filters.status || filters.code;
  const isEmpty = batches.length === 0;

  return (
    <div className="min-h-screen bg-mineral">
      {/* Header */}
      <div className="bg-porcelain border-b border-slate-100 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl text-obsidian mb-2">
              Estoque de Lotes
            </h1>
            <p className="text-sm text-slate-500">
              Gerencie todos os lotes físicos disponíveis
            </p>
          </div>
          {canEdit && (
            <Button
              variant="primary"
              onClick={() => router.push('/inventory/new')}
            >
              <Plus className="w-4 h-4 mr-2" />
              NOVO LOTE
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="px-8 py-6">
        <div className="bg-porcelain rounded-sm border border-slate-100 p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select
              value={filters.productId}
              onChange={(e) =>
                setFilters({ ...filters, productId: e.target.value, page: 1 })
              }
            >
              <option value="">Todos os Produtos</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </Select>

            <Select
              value={filters.status}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  status: e.target.value as BatchStatus,
                  page: 1,
                })
              }
            >
              <option value="">Todos os Status</option>
              {batchStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>

            <div className="relative">
              <Input
                placeholder="Código do Lote"
                value={filters.code}
                onChange={(e) =>
                  setFilters({ ...filters, code: e.target.value, page: 1 })
                }
              />
              <Search className="absolute right-3 top-3 w-5 h-5 text-slate-400 pointer-events-none" />
            </div>

            <Button
              variant="secondary"
              onClick={handleClearFilters}
              disabled={!hasFilters}
            >
              Limpar Filtros
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-8 pb-8">
        {isLoading ? (
          <LoadingState variant="table" rows={10} columns={7} />
        ) : isEmpty ? (
          <EmptyState
            icon={hasFilters ? Search : Plus}
            title={
              hasFilters
                ? 'Nenhum lote encontrado'
                : 'Estoque vazio'
            }
            description={
              hasFilters
                ? 'Tente ajustar os filtros de busca'
                : 'Cadastre seu primeiro lote para começar a vender'
            }
            actionLabel={hasFilters ? 'Limpar Filtros' : canEdit ? '+ Novo Lote' : undefined}
            onAction={
              hasFilters
                ? handleClearFilters
                : canEdit
                ? () => router.push('/inventory/new')
                : undefined
            }
          />
        ) : (
          <>
            <div className="bg-porcelain rounded-sm border border-slate-100 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Foto</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Dimensões</TableHead>
                    <TableHead>Área Total</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead>Status</TableHead>
                    {canEdit && <TableHead>Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches.map((batch) => (
                    <TableRow key={batch.id}>
                      <TableCell>
                        <div className="w-20 h-20 rounded-sm overflow-hidden bg-slate-200">
                          {batch.medias?.[0] ? (
                            <img
                              src={batch.medias[0].url}
                              alt={batch.batchCode}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                              Sem foto
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => router.push(`/inventory/${batch.id}`)}
                          className="font-mono text-sm text-obsidian hover:underline"
                        >
                          {batch.batchCode}
                        </button>
                      </TableCell>
                      <TableCell>
                        <span className="text-slate-600">
                          {batch.product?.name || '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm text-slate-600">
                          {formatDimensions(
                            batch.height,
                            batch.width,
                            batch.thickness
                          )}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm text-slate-600">
                          {formatArea(batch.totalArea)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-serif text-obsidian">
                          {formatCurrency(batch.industryPrice)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={batch.status}>{batch.status}</Badge>
                      </TableCell>
                      {canEdit && (
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => router.push(`/inventory/${batch.id}`)}
                              className="p-2 hover:bg-slate-100 rounded-sm transition-colors"
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4 text-slate-600" />
                            </button>
                            <button
                              onClick={() => router.push(`/inventory/${batch.id}`)}
                              className="p-2 hover:bg-slate-100 rounded-sm transition-colors"
                              title="Ver detalhes"
                            >
                              <Eye className="w-4 h-4 text-slate-600" />
                            </button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <Pagination
              currentPage={filters.page}
              totalPages={Math.ceil(totalItems / filters.limit)}
              totalItems={totalItems}
              itemsPerPage={filters.limit}
              onPageChange={(page) => setFilters({ ...filters, page })}
            />
          </>
        )}
      </div>
    </div>
  );
}
```

---

## `.\app\(industry)\leads\page.tsx`:

```
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Download, Search, Mail, Phone, MessageSquare, Check, User, Inbox } from 'lucide-react';
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
import type { Lead, SalesLink } from '@/lib/types';
import type { LeadFilter } from '@/lib/schemas/lead.schema';
import { leadStatuses } from '@/lib/schemas/lead.schema';
import { cn } from '@/lib/utils/cn';

export default function LeadsManagementPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { success, error } = useToast();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [salesLinks, setSalesLinks] = useState<SalesLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const [filters, setFilters] = useState<LeadFilter>({
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
    fetchLeads();
  }, [filters]);

  const fetchSalesLinks = async () => {
    try {
      const data = await apiClient.get<{ links: SalesLink[] }>('/sales-links', {
        params: { limit: 1000 },
      });
      setSalesLinks(data.links);
    } catch (err) {
      console.error('Erro ao carregar links:', err);
    }
  };

  const fetchLeads = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.get<{
        leads: Lead[];
        total: number;
        page: number;
      }>('/leads', { params: filters });

      setLeads(data.leads);
      setTotalItems(data.total);
    } catch (err) {
      error('Erro ao carregar leads');
      setLeads([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (leadId: string, newStatus: typeof leadStatuses[number]) => {
    try {
      setIsUpdatingStatus(true);
      
      await apiClient.patch(`/leads/${leadId}/status`, {
        status: newStatus,
      });

      success('Status atualizado com sucesso');
      fetchLeads();
      
      if (selectedLead?.id === leadId) {
        setSelectedLead({ ...selectedLead, status: newStatus });
      }
    } catch (err) {
      error('Erro ao atualizar status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleViewDetails = (lead: Lead) => {
    setSelectedLead(lead);
    setShowDetailModal(true);
  };

  const handleExport = async () => {
    try {
      success('Exportação iniciada. O download começará em breve.');
      // Implementar lógica de exportação CSV
    } catch (err) {
      error('Erro ao exportar leads');
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
    router.push('/leads');
  };

  const handleCopyContact = async (contact: string) => {
    try {
      await navigator.clipboard.writeText(contact);
      success('Contato copiado!');
    } catch (err) {
      error('Erro ao copiar contato');
    }
  };

  const hasFilters = filters.search || filters.linkId || filters.startDate || filters.endDate || filters.status;
  const isEmpty = leads.length === 0;

  const getStatusBadge = (status: typeof leadStatuses[number]) => {
    const variants = {
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
              Meus Leads
            </h1>
            <p className="text-sm text-slate-500">
              Visualize e gerencie leads capturados via links
            </p>
          </div>
          <Button variant="secondary" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="px-8 py-6">
        <div className="bg-porcelain rounded-sm border border-slate-100 p-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Input
                placeholder="Nome ou Contato"
                value={filters.search}
                onChange={(e) =>
                  setFilters({ ...filters, search: e.target.value, page: 1 })
                }
              />
              <Search className="absolute right-3 top-3 w-5 h-5 text-slate-400 pointer-events-none" />
            </div>

            <Select
              value={filters.linkId}
              onChange={(e) =>
                setFilters({ ...filters, linkId: e.target.value, page: 1 })
              }
            >
              <option value="">Todos os Links</option>
              {salesLinks.map((link) => (
                <option key={link.id} value={link.id}>
                  {link.title || link.slugToken}
                </option>
              ))}
            </Select>

            <Select
              value={filters.status}
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value, page: 1 })
              }
            >
              <option value="">Todos os Status</option>
              <option value="NOVO">Novo</option>
              <option value="CONTATADO">Contatado</option>
              <option value="RESOLVIDO">Resolvido</option>
            </Select>

            <Input
              type="date"
              label="Data Início"
              value={filters.startDate}
              onChange={(e) =>
                setFilters({ ...filters, startDate: e.target.value, page: 1 })
              }
            />

            <Button
              variant="secondary"
              onClick={handleClearFilters}
              disabled={!hasFilters}
            >
              Limpar Filtros
            </Button>
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
                ? 'Nenhum lead encontrado'
                : 'Nenhum lead capturado ainda'
            }
            description={
              hasFilters
                ? 'Tente ajustar os filtros de busca'
                : 'Quando clientes demonstrarem interesse, eles aparecerão aqui'
            }
            actionLabel={hasFilters ? 'Limpar Filtros' : undefined}
            onAction={hasFilters ? handleClearFilters : undefined}
          />
        ) : (
          <>
            <div className="bg-porcelain rounded-sm border border-slate-100 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Produto Interessado</TableHead>
                    <TableHead>Mensagem</TableHead>
                    <TableHead>Opt-in</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => {
                    const isEmail = lead.contact.includes('@');
                    
                    return (
                      <TableRow 
                        key={lead.id}
                        className="cursor-pointer"
                        onClick={() => handleViewDetails(lead)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-slate-400" />
                            <span className="font-medium text-obsidian">
                              {lead.name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyContact(lead.contact);
                            }}
                            className="flex items-center gap-2 text-sm text-slate-600 hover:text-obsidian transition-colors"
                          >
                            {isEmail ? (
                              <Mail className="w-4 h-4" />
                            ) : (
                              <Phone className="w-4 h-4" />
                            )}
                            <span>{lead.contact}</span>
                          </button>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm text-slate-600">
                              {lead.salesLink?.title || lead.salesLink?.slugToken || '-'}
                            </p>
                            {lead.salesLink && (
                              <Badge
                                variant="default"
                                className="mt-1"
                              >
                                {lead.salesLink.linkType.replace('_', ' ')}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-slate-600">
                            {lead.salesLink?.batch?.product?.name ||
                              lead.salesLink?.product?.name ||
                              'Catálogo'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {lead.message ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewDetails(lead);
                              }}
                              className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                            >
                              <MessageSquare className="w-4 h-4" />
                              Ver mensagem
                            </button>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {lead.marketingOptIn ? (
                            <Check className="w-5 h-5 text-emerald-600" />
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div onClick={(e) => e.stopPropagation()}>
                            <Select
                              value={lead.status}
                              onChange={(e) => handleUpdateStatus(lead.id, e.target.value as typeof leadStatuses[number])}
                              disabled={isUpdatingStatus}
                              className="text-xs"
                            >
                              <option value="NOVO">Novo</option>
                              <option value="CONTATADO">Contatado</option>
                              <option value="RESOLVIDO">Resolvido</option>
                            </Select>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-slate-500">
                            {formatDate(lead.createdAt)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewDetails(lead);
                            }}
                          >
                            Ver Detalhes
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
              onPageChange={(page) => setFilters({ ...filters, page })}
            />
          </>
        )}
      </div>

      {/* Detail Modal */}
      <Modal open={showDetailModal} onClose={() => setShowDetailModal(false)}>
        <ModalClose onClose={() => setShowDetailModal(false)} />
        <ModalHeader>
          <ModalTitle>Detalhes do Lead</ModalTitle>
        </ModalHeader>
        <ModalContent>
          {selectedLead && (
            <div className="space-y-6">
              {/* Contact Info */}
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-500 mb-3">
                  Informações de Contato
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-sm text-slate-500">Nome</p>
                      <p className="font-medium text-obsidian">{selectedLead.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {selectedLead.contact.includes('@') ? (
                      <Mail className="w-5 h-5 text-slate-400" />
                    ) : (
                      <Phone className="w-5 h-5 text-slate-400" />
                    )}
                    <div>
                      <p className="text-sm text-slate-500">Contato</p>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-obsidian">{selectedLead.contact}</p>
                        <button
                          onClick={() => handleCopyContact(selectedLead.contact)}
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
              {selectedLead.message && (
                <div>
                  <p className="text-xs uppercase tracking-widest text-slate-500 mb-3">
                    Mensagem
                  </p>
                  <div className="p-4 bg-slate-50 rounded-sm">
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">
                      {selectedLead.message}
                    </p>
                  </div>
                </div>
              )}

              {/* Origin */}
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-500 mb-3">
                  Origem do Lead
                </p>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-sm">
                  <p className="text-sm font-semibold text-blue-900 mb-1">
                    {selectedLead.salesLink?.title || 'Link sem título'}
                  </p>
                  <p className="text-xs text-blue-700 mb-2">
                    /{selectedLead.salesLink?.slugToken}
                  </p>
                  {selectedLead.salesLink?.batch && (
                    <p className="text-sm text-blue-800">
                      Lote: {selectedLead.salesLink.batch.batchCode} •{' '}
                      {selectedLead.salesLink.batch.product?.name}
                    </p>
                  )}
                  {selectedLead.salesLink?.product && (
                    <p className="text-sm text-blue-800">
                      Produto: {selectedLead.salesLink.product.name}
                    </p>
                  )}
                </div>
              </div>

              {/* Marketing Opt-in */}
              <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-sm">
                {selectedLead.marketingOptIn ? (
                  <>
                    <Check className="w-5 h-5 text-emerald-600" />
                    <p className="text-sm text-slate-600">
                      Aceitou receber comunicações de marketing
                    </p>
                  </>
                ) : (
                  <>
                    <X className="w-5 h-5 text-slate-400" />
                    <p className="text-sm text-slate-600">
                      Não aceitou comunicações de marketing
                    </p>
                  </>
                )}
              </div>

              {/* Status */}
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-500 mb-3">
                  Status do Lead
                </p>
                <Select
                  value={selectedLead.status}
                  onChange={(e) => handleUpdateStatus(selectedLead.id, e.target.value as typeof leadStatuses[number])}
                  disabled={isUpdatingStatus}
                >
                  <option value="NOVO">Novo</option>
                  <option value="CONTATADO">Contatado</option>
                  <option value="RESOLVIDO">Resolvido</option>
                </Select>
              </div>

              {/* Metadata */}
              <div className="pt-4 border-t border-slate-200">
                <p className="text-xs text-slate-500">
                  Lead capturado em {formatDate(selectedLead.createdAt, 'dd/MM/yyyy HH:mm')}
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
            Fechar
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
```

---

## `.\app\(industry)\links\new\page.tsx`:

```
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ArrowRight, Check, Search, Package, QrCode, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Toggle } from '@/components/ui/toggle';
import { Modal, ModalHeader, ModalTitle, ModalContent, ModalFooter } from '@/components/ui/modal';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/lib/hooks/useToast';
import { useAuth } from '@/lib/hooks/useAuth';
import { salesLinkSchema, type SalesLinkInput } from '@/lib/schemas/link.schema';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { formatArea } from '@/lib/utils/formatDimensions';
import { nanoid } from 'nanoid';
import QRCode from 'qrcode.react';
import type { Batch, Product, LinkType } from '@/lib/types';
import { cn } from '@/lib/utils/cn';

type WizardStep = 'content' | 'pricing' | 'config';

export default function CreateSalesLinkPage() {
  const router = useRouter();
  const { success, error } = useToast();
  const { user, isBroker } = useAuth();

  const [currentStep, setCurrentStep] = useState<WizardStep>('content');
  const [linkType, setLinkType] = useState<LinkType>('LOTE_UNICO');
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [availableBatches, setAvailableBatches] = useState<Batch[]>([]);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string>('');
  const [calculatedMargin, setCalculatedMargin] = useState<number>(0);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm<SalesLinkInput>({
    resolver: zodResolver(salesLinkSchema),
    defaultValues: {
      linkType: 'LOTE_UNICO',
      showPrice: true,
      isActive: true,
      slugToken: nanoid(10).toLowerCase(),
    },
  });

  const displayPrice = watch('displayPrice');
  const showPrice = watch('showPrice');
  const slugToken = watch('slugToken');

  useEffect(() => {
    if (currentStep === 'content') {
      fetchAvailableContent();
    }
  }, [currentStep, linkType]);

  useEffect(() => {
    if (isBroker() && selectedBatch && displayPrice) {
      const basePrice = selectedBatch.industryPrice;
      const margin = displayPrice - basePrice;
      setCalculatedMargin(margin);
    }
  }, [displayPrice, selectedBatch, isBroker]);

  const fetchAvailableContent = async () => {
    try {
      setIsLoadingContent(true);

      if (linkType === 'LOTE_UNICO') {
        const endpoint = isBroker() ? '/broker/shared-inventory' : '/batches';
        const data = await apiClient.get<{ batches?: Batch[]; data?: Batch[] }>(
          endpoint,
          { params: { status: 'DISPONIVEL', limit: 1000 } }
        );
        setAvailableBatches(data.batches || data.data || []);
      } else if (linkType === 'PRODUTO_GERAL') {
        const data = await apiClient.get<{ products: Product[] }>('/products', {
          params: { includeInactive: false, limit: 1000 },
        });
        setAvailableProducts(data.products);
      }
    } catch (err) {
      error('Erro ao carregar conteúdo');
    } finally {
      setIsLoadingContent(false);
    }
  };

  const validateSlug = async (slug: string): Promise<boolean> => {
    try {
      await apiClient.get('/sales-links/validate-slug', {
        params: { slug },
      });
      return true;
    } catch {
      return false;
    }
  };

  const handleGenerateSlug = () => {
    const newSlug = nanoid(10).toLowerCase();
    setValue('slugToken', newSlug);
  };

  const handleSelectBatch = (batch: Batch) => {
    setSelectedBatch(batch);
    setValue('batchId', batch.id);
    setValue('linkType', 'LOTE_UNICO');
    
    if (isBroker()) {
      setValue('displayPrice', batch.industryPrice);
    }
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setValue('productId', product.id);
    setValue('linkType', 'PRODUTO_GERAL');
  };

  const handleNextStep = () => {
    if (currentStep === 'content') {
      if (linkType === 'LOTE_UNICO' && !selectedBatch) {
        error('Selecione um lote para continuar');
        return;
      }
      if (linkType === 'PRODUTO_GERAL' && !selectedProduct) {
        error('Selecione um produto para continuar');
        return;
      }
      setCurrentStep('pricing');
    } else if (currentStep === 'pricing') {
      if (isBroker() && linkType === 'LOTE_UNICO') {
        if (!displayPrice) {
          error('Defina o preço para o cliente');
          return;
        }
        if (selectedBatch && displayPrice < selectedBatch.industryPrice) {
          error('Preço não pode ser menor que o preço base');
          return;
        }
      }
      setCurrentStep('config');
    }
  };

  const handlePrevStep = () => {
    if (currentStep === 'config') {
      setCurrentStep('pricing');
    } else if (currentStep === 'pricing') {
      setCurrentStep('content');
    }
  };

  const onSubmit = async (data: SalesLinkInput) => {
    try {
      setIsSubmitting(true);

      const isSlugValid = await validateSlug(data.slugToken);
      if (!isSlugValid) {
        error('Este slug já está em uso. Tente outro.');
        handleGenerateSlug();
        return;
      }

      if (linkType === 'LOTE_UNICO') {
        const statusCheck = await apiClient.get<Batch>(`/batches/${data.batchId}`);
        if (statusCheck.status !== 'DISPONIVEL') {
          error('Lote não está mais disponível');
          return;
        }
      }

      const response = await apiClient.post<{ id: string; fullUrl: string }>(
        '/sales-links',
        data
      );

      const fullUrl = `${window.location.origin}/${data.slugToken}`;
      setGeneratedLink(fullUrl);
      setShowSuccessModal(true);

      await navigator.clipboard.writeText(fullUrl);
      success('Link criado! Copiado para área de transferência');
    } catch (err) {
      error('Erro ao criar link');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredBatches = availableBatches.filter((batch) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      batch.batchCode.toLowerCase().includes(searchLower) ||
      batch.product?.name.toLowerCase().includes(searchLower)
    );
  });

  const filteredProducts = availableProducts.filter((product) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      product.name.toLowerCase().includes(searchLower) ||
      product.sku?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="min-h-screen bg-mineral">
      {/* Header */}
      <div className="bg-porcelain border-b border-slate-100 px-8 py-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-slate-100 rounded-sm transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="font-serif text-3xl text-obsidian mb-2">
              Criar Link de Venda
            </h1>
            <p className="text-sm text-slate-500">
              {currentStep === 'content' && 'Selecione o conteúdo do link'}
              {currentStep === 'pricing' && 'Defina preço e visibilidade'}
              {currentStep === 'config' && 'Configure o link'}
            </p>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="px-8 py-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between">
            {['content', 'pricing', 'config'].map((step, index) => {
              const stepLabels = {
                content: 'Conteúdo',
                pricing: 'Precificação',
                config: 'Configuração',
              };
              const isActive = currentStep === step;
              const isCompleted = ['content', 'pricing', 'config'].indexOf(currentStep) > index;

              return (
                <div key={step} className="flex items-center flex-1">
                  <div className="flex flex-col items-center w-full">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center transition-colors mb-2',
                        isCompleted
                          ? 'bg-emerald-500 text-white'
                          : isActive
                          ? 'bg-obsidian text-porcelain'
                          : 'bg-slate-200 text-slate-400'
                      )}
                    >
                      {isCompleted ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <span className="text-sm font-semibold">{index + 1}</span>
                      )}
                    </div>
                    <span
                      className={cn(
                        'text-xs font-medium',
                        isActive ? 'text-obsidian' : 'text-slate-400'
                      )}
                    >
                      {stepLabels[step as WizardStep]}
                    </span>
                  </div>
                  {index < 2 && (
                    <div
                      className={cn(
                        'h-1 flex-1 -mt-8 mx-4',
                        isCompleted ? 'bg-emerald-500' : 'bg-slate-200'
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="px-8 pb-8">
        <div className="max-w-4xl mx-auto">
          {/* Step 1: Content Selection */}
          {currentStep === 'content' && (
            <Card>
              <h2 className="text-lg font-semibold text-obsidian mb-6">
                Selecionar Conteúdo
              </h2>

              {/* Link Type Selector */}
              <div className="mb-6">
                <p className="text-xs uppercase tracking-widest text-slate-500 mb-4">
                  Tipo de Link
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    type="button"
                    onClick={() => setLinkType('LOTE_UNICO')}
                    className={cn(
                      'p-4 border-2 rounded-sm transition-all',
                      linkType === 'LOTE_UNICO'
                        ? 'border-obsidian bg-slate-50'
                        : 'border-slate-200 hover:border-slate-300'
                    )}
                  >
                    <Package className="w-6 h-6 mx-auto mb-2 text-slate-600" />
                    <p className="font-semibold text-sm">Lote Específico</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Link para um lote individual
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLinkType('PRODUTO_GERAL')}
                    className={cn(
                      'p-4 border-2 rounded-sm transition-all',
                      linkType === 'PRODUTO_GERAL'
                        ? 'border-obsidian bg-slate-50'
                        : 'border-slate-200 hover:border-slate-300'
                    )}
                  >
                    <Package className="w-6 h-6 mx-auto mb-2 text-slate-600" />
                    <p className="font-semibold text-sm">Produto (Catálogo)</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Link para um tipo de pedra
                    </p>
                  </button>

                  {isBroker() && (
                    <button
                      type="button"
                      onClick={() => setLinkType('CATALOGO_COMPLETO')}
                      className={cn(
                        'p-4 border-2 rounded-sm transition-all',
                        linkType === 'CATALOGO_COMPLETO'
                          ? 'border-obsidian bg-slate-50'
                          : 'border-slate-200 hover:border-slate-300'
                      )}
                    >
                      <Package className="w-6 h-6 mx-auto mb-2 text-slate-600" />
                      <p className="font-semibold text-sm">Catálogo Completo</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Todos os produtos disponíveis
                      </p>
                    </button>
                  )}
                </div>
              </div>

              {/* Search */}
              {linkType !== 'CATALOGO_COMPLETO' && (
                <>
                  <div className="relative mb-6">
                    <Input
                      placeholder={linkType === 'LOTE_UNICO' ? 'Buscar lote por código ou produto' : 'Buscar produto por nome'}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <Search className="absolute right-3 top-3 w-5 h-5 text-slate-400 pointer-events-none" />
                  </div>

                  {/* Content List */}
                  <div className="max-h-96 overflow-y-auto border border-slate-200 rounded-sm">
                    {isLoadingContent ? (
                      <div className="p-8 text-center text-slate-400">
                        Carregando...
                      </div>
                    ) : linkType === 'LOTE_UNICO' ? (
                      filteredBatches.length === 0 ? (
                        <div className="p-8 text-center text-slate-400">
                          {searchTerm ? 'Nenhum lote encontrado' : 'Nenhum lote disponível'}
                        </div>
                      ) : (
                        filteredBatches.map((batch) => (
                          <button
                            key={batch.id}
                            type="button"
                            onClick={() => handleSelectBatch(batch)}
                            className={cn(
                              'w-full p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors text-left',
                              selectedBatch?.id === batch.id && 'bg-blue-50 border-blue-200'
                            )}
                          >
                            <div className="flex items-center gap-4">
                              {batch.medias?.[0] && (
                                <img
                                  src={batch.medias[0].url}
                                  alt={batch.batchCode}
                                  className="w-16 h-16 rounded-sm object-cover"
                                />
                              )}
                              <div className="flex-1">
                                <p className="font-mono text-sm font-semibold text-obsidian">
                                  {batch.batchCode}
                                </p>
                                <p className="text-sm text-slate-600">
                                  {batch.product?.name}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {formatArea(batch.totalArea)} •{' '}
                                  {formatCurrency(batch.industryPrice)}
                                </p>
                              </div>
                              {selectedBatch?.id === batch.id && (
                                <Check className="w-5 h-5 text-blue-600" />
                              )}
                            </div>
                          </button>
                        ))
                      )
                    ) : (
                      filteredProducts.length === 0 ? (
                        <div className="p-8 text-center text-slate-400">
                          {searchTerm ? 'Nenhum produto encontrado' : 'Nenhum produto disponível'}
                        </div>
                      ) : (
                        filteredProducts.map((product) => (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => handleSelectProduct(product)}
                            className={cn(
                              'w-full p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors text-left',
                              selectedProduct?.id === product.id && 'bg-blue-50 border-blue-200'
                            )}
                          >
                            <div className="flex items-center gap-4">
                              {product.medias?.[0] && (
                                <img
                                  src={product.medias[0].url}
                                  alt={product.name}
                                  className="w-16 h-16 rounded-sm object-cover"
                                />
                              )}
                              <div className="flex-1">
                                <p className="font-semibold text-obsidian">
                                  {product.name}
                                </p>
                                <p className="text-sm text-slate-600">
                                  {product.material} • {product.finish}
                                </p>
                                {product.sku && (
                                  <p className="text-xs text-slate-500 font-mono">
                                    {product.sku}
                                  </p>
                                )}
                              </div>
                              {selectedProduct?.id === product.id && (
                                <Check className="w-5 h-5 text-blue-600" />
                              )}
                            </div>
                          </button>
                        ))
                      )
                    )}
                  </div>
                </>
              )}

              {/* Selected Preview */}
              {(selectedBatch || selectedProduct) && (
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-sm">
                  <p className="text-xs uppercase tracking-widest text-blue-600 mb-2">
                    Selecionado
                  </p>
                  <div className="flex items-center gap-4">
                    {(selectedBatch?.medias?.[0] || selectedProduct?.medias?.[0]) && (
                      <img
                        src={(selectedBatch?.medias?.[0] || selectedProduct?.medias?.[0])?.url}
                        alt="Preview"
                        className="w-20 h-20 rounded-sm object-cover"
                      />
                    )}
                    <div>
                      <p className="font-semibold text-obsidian">
                        {selectedBatch?.batchCode || selectedProduct?.name}
                      </p>
                      {selectedBatch && (
                        <>
                          <p className="text-sm text-slate-600">
                            {selectedBatch.product?.name}
                          </p>
                          <p className="text-sm text-slate-500">
                            {formatArea(selectedBatch.totalArea)}
                          </p>
                        </>
                      )}
                      {selectedProduct && (
                        <p className="text-sm text-slate-600">
                          {selectedProduct.material} • {selectedProduct.finish}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Step 2: Pricing */}
          {currentStep === 'pricing' && (
            <Card>
              <h2 className="text-lg font-semibold text-obsidian mb-6">
                Definir Preço e Visibilidade
              </h2>

              {isBroker() && selectedBatch && (
                <>
                  <Input
                    {...register('displayPrice', { valueAsNumber: true })}
                    type="number"
                    step="0.01"
                    label="Preço Final para o Cliente (R$)"
                    error={errors.displayPrice?.message}
                    disabled={isSubmitting}
                  />

                  {displayPrice && (
                    <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-sm">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-xs uppercase tracking-widest text-emerald-600 mb-1">
                            Preço Base
                          </p>
                          <p className="font-serif text-lg text-emerald-700">
                            {formatCurrency(selectedBatch.industryPrice)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-widest text-emerald-600 mb-1">
                            Minha Margem
                          </p>
                          <p className="font-serif text-lg text-emerald-700">
                            {formatCurrency(calculatedMargin)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-widest text-emerald-600 mb-1">
                            % Margem
                          </p>
                          <p className="font-serif text-lg text-emerald-700">
                            {((calculatedMargin / selectedBatch.industryPrice) * 100).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {!isBroker() && selectedBatch && (
                <div className="mb-6">
                  <p className="text-xs uppercase tracking-widest text-slate-500 mb-2">
                    Preço Indústria
                  </p>
                  <p className="font-serif text-3xl text-obsidian">
                    {formatCurrency(selectedBatch.industryPrice)}
                  </p>
                </div>
              )}

              <div className="space-y-6 mt-6">
                <Toggle
                  {...register('showPrice')}
                  checked={showPrice}
                  onChange={(e) => setValue('showPrice', e.target.checked)}
                  label="Exibir preço no link"
                />
                <p className="text-xs text-slate-500 ml-14">
                  Se desativado, aparecerá "Sob Consulta"
                </p>

                <Input
                  {...register('title')}
                  label="Título Personalizado (Opcional)"
                  placeholder={selectedBatch?.product?.name || selectedProduct?.name || ''}
                  error={errors.title?.message}
                  disabled={isSubmitting}
                />

                <Textarea
                  {...register('customMessage')}
                  label="Mensagem Personalizada (Opcional)"
                  placeholder="Aparecerá no topo da landing page..."
                  rows={4}
                  error={errors.customMessage?.message}
                  disabled={isSubmitting}
                />
              </div>
            </Card>
          )}

          {/* Step 3: Configuration */}
          {currentStep === 'config' && (
            <Card>
              <h2 className="text-lg font-semibold text-obsidian mb-6">
                Configurações do Link
              </h2>

              <div className="space-y-6">
                <div>
                  <Input
                    {...register('slugToken')}
                    label="Slug do Link"
                    error={errors.slugToken?.message}
                    disabled={isSubmitting}
                  />
                  <div className="flex items-center gap-2 mt-2">
                    <p className="text-xs text-slate-500">
                      Preview: {window.location.origin}/{slugToken}
                    </p>
                    <button
                      type="button"
                      onClick={handleGenerateSlug}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Gerar novo
                    </button>
                  </div>
                </div>

                <Input
                  {...register('expiresAt')}
                  type="date"
                  label="Data de Expiração (Opcional)"
                  error={errors.expiresAt?.message}
                  disabled={isSubmitting}
                />

                <Toggle
                  {...register('isActive')}
                  checked={watch('isActive')}
                  onChange={(e) => setValue('isActive', e.target.checked)}
                  label="Link Ativo"
                />
              </div>
            </Card>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8">
            {currentStep !== 'content' ? (
              <Button
                type="button"
                variant="secondary"
                onClick={handlePrevStep}
                disabled={isSubmitting}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
            ) : (
              <div />
            )}

            {currentStep !== 'config' ? (
              <Button
                type="button"
                variant="primary"
                onClick={handleNextStep}
              >
                Próximo
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                type="submit"
                variant="primary"
                loading={isSubmitting}
              >
                GERAR LINK
              </Button>
            )}
          </div>
        </div>
      </form>

      {/* Success Modal */}
      <Modal open={showSuccessModal} onClose={() => {}}>
        <ModalHeader>
          <ModalTitle>Link Criado com Sucesso! 🎉</ModalTitle>
        </ModalHeader>
        <ModalContent>
          <div className="space-y-6 text-center">
            <div className="flex justify-center">
              <QRCode value={generatedLink} size={200} />
            </div>

            <div>
              <p className="text-xs uppercase tracking-widest text-slate-500 mb-2">
                Seu Link
              </p>
              <div className="flex items-center gap-2">
                <Input
                  value={generatedLink}
                  readOnly
                  className="flex-1 font-mono text-sm"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(generatedLink);
                    success('Link copiado!');
                  }}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <p className="text-sm text-slate-600">
              Compartilhe este link com seus clientes. Eles poderão visualizar o produto e demonstrar interesse.
            </p>
          </div>
        </ModalContent>
        <ModalFooter>
          <Button
            variant="secondary"
            onClick={() => window.open(generatedLink, '_blank')}
          >
            Abrir Preview
          </Button>
          <Button
            variant="primary"
            onClick={() => router.push('/links')}
          >
            Ver Meus Links
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
```

---

## `.\app\(industry)\links\page.tsx`:

```
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Copy, Edit2, Archive, Eye, Users, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Pagination } from '@/components/shared/Pagination';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import { Modal, ModalHeader, ModalTitle, ModalContent, ModalFooter } from '@/components/ui/modal';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/lib/hooks/useToast';
import { formatDate } from '@/lib/utils/formatDate';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import type { SalesLink, LinkType } from '@/lib/types';
import type { LinkFilter } from '@/lib/schemas/link.schema';
import { linkTypes } from '@/lib/schemas/link.schema';
import { cn } from '@/lib/utils/cn';

export default function LinksManagementPage() {
  const router = useRouter();
  const { success, error } = useToast();

  const [links, setLinks] = useState<SalesLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedLink, setSelectedLink] = useState<SalesLink | null>(null);
  const [showStatsModal, setShowStatsModal] = useState(false);

  const [filters, setFilters] = useState<LinkFilter>({
    type: '',
    status: '',
    search: '',
    page: 1,
    limit: 25,
  });

  useEffect(() => {
    fetchLinks();
  }, [filters]);

  const fetchLinks = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.get<{
        links: SalesLink[];
        total: number;
        page: number;
      }>('/sales-links', { params: filters });

      setLinks(data.links);
      setTotalItems(data.total);
    } catch (err) {
      error('Erro ao carregar links');
      setLinks([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = async (link: SalesLink) => {
    try {
      const fullUrl = `${window.location.origin}/${link.slugToken}`;
      await navigator.clipboard.writeText(fullUrl);
      success('Link copiado!');
    } catch (err) {
      error('Erro ao copiar link');
    }
  };

  const handleArchiveLink = async (linkId: string) => {
    try {
      await apiClient.patch(`/sales-links/${linkId}`, { isActive: false });
      success('Link arquivado com sucesso');
      fetchLinks();
    } catch (err) {
      error('Erro ao arquivar link');
    }
  };

  const handleViewStats = (link: SalesLink) => {
    setSelectedLink(link);
    setShowStatsModal(true);
  };

  const handleClearFilters = () => {
    setFilters({
      type: '',
      status: '',
      search: '',
      page: 1,
      limit: 25,
    });
  };

  const hasFilters = filters.type || filters.status || filters.search;
  const isEmpty = links.length === 0;

  const getLinkTypeBadge = (type: LinkType) => {
    const variants = {
      LOTE_UNICO: { label: 'Lote', color: 'bg-blue-50 text-blue-700 border-blue-200' },
      PRODUTO_GERAL: { label: 'Produto', color: 'bg-purple-50 text-purple-700 border-purple-200' },
      CATALOGO_COMPLETO: { label: 'Catálogo', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    };
    const variant = variants[type];
    return (
      <span className={cn('inline-flex items-center px-2 py-1 rounded-full text-[10px] uppercase tracking-widest font-semibold border', variant.color)}>
        {variant.label}
      </span>
    );
  };

  const getLinkStatus = (link: SalesLink) => {
    if (!link.isActive) return { label: 'Arquivado', variant: 'INATIVO' as const };
    if (link.expiresAt && new Date(link.expiresAt) < new Date()) return { label: 'Expirado', variant: 'INATIVO' as const };
    return { label: 'Ativo', variant: 'DISPONIVEL' as const };
  };

  return (
    <div className="min-h-screen bg-mineral">
      {/* Header */}
      <div className="bg-porcelain border-b border-slate-100 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl text-obsidian mb-2">
              Meus Links de Venda
            </h1>
            <p className="text-sm text-slate-500">
              Gerencie links compartilháveis com clientes
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => router.push('/links/new')}
          >
            <Plus className="w-4 h-4 mr-2" />
            NOVO LINK
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="px-8 py-6">
        <div className="bg-porcelain rounded-sm border border-slate-100 p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select
              value={filters.type}
              onChange={(e) =>
                setFilters({ ...filters, type: e.target.value as LinkType | '', page: 1 })
              }
            >
              <option value="">Todos os Tipos</option>
              <option value="LOTE_UNICO">Lote Único</option>
              <option value="PRODUTO_GERAL">Produto Geral</option>
              <option value="CATALOGO_COMPLETO">Catálogo Completo</option>
            </Select>

            <Select
              value={filters.status}
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value, page: 1 })
              }
            >
              <option value="">Todos os Status</option>
              <option value="ATIVO">Ativos</option>
              <option value="EXPIRADO">Expirados</option>
            </Select>

            <div className="relative">
              <Input
                placeholder="Buscar por título ou slug"
                value={filters.search}
                onChange={(e) =>
                  setFilters({ ...filters, search: e.target.value, page: 1 })
                }
              />
              <Search className="absolute right-3 top-3 w-5 h-5 text-slate-400 pointer-events-none" />
            </div>

            <Button
              variant="secondary"
              onClick={handleClearFilters}
              disabled={!hasFilters}
            >
              Limpar Filtros
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-8 pb-8">
        {isLoading ? (
          <LoadingState variant="table" rows={10} columns={8} />
        ) : isEmpty ? (
          <EmptyState
            icon={hasFilters ? Search : Plus}
            title={
              hasFilters
                ? 'Nenhum link encontrado'
                : 'Nenhum link criado ainda'
            }
            description={
              hasFilters
                ? 'Tente ajustar os filtros de busca'
                : 'Crie links personalizados para compartilhar com seus clientes'
            }
            actionLabel={hasFilters ? 'Limpar Filtros' : '+ Novo Link'}
            onAction={hasFilters ? handleClearFilters : () => router.push('/links/new')}
          />
        ) : (
          <>
            <div className="bg-porcelain rounded-sm border border-slate-100 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Preview</TableHead>
                    <TableHead>Título/Slug</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead>Visualizações</TableHead>
                    <TableHead>Leads</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {links.map((link) => {
                    const status = getLinkStatus(link);
                    const thumbnail = link.batch?.medias?.[0] || link.product?.medias?.[0];

                    return (
                      <TableRow key={link.id}>
                        <TableCell>
                          <div className="w-16 h-16 rounded-sm overflow-hidden bg-slate-200">
                            {thumbnail ? (
                              <img
                                src={thumbnail.url}
                                alt="Preview"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ExternalLink className="w-6 h-6 text-slate-400" />
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-obsidian mb-1">
                              {link.title || link.batch?.product?.name || link.product?.name || 'Link sem título'}
                            </p>
                            <button
                              onClick={() => window.open(`/${link.slugToken}`, '_blank')}
                              className="text-xs text-blue-600 hover:underline font-mono"
                            >
                              /{link.slugToken}
                            </button>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getLinkTypeBadge(link.linkType)}
                        </TableCell>
                        <TableCell>
                          {link.showPrice && link.displayPrice ? (
                            <span className="font-serif text-obsidian">
                              {formatCurrency(link.displayPrice)}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-sm">Sob consulta</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() => handleViewStats(link)}
                            className="flex items-center gap-2 text-sm text-slate-600 hover:text-obsidian transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                            <span className="font-mono">{link.viewsCount || 0}</span>
                          </button>
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() => router.push(`/leads?linkId=${link.id}`)}
                            className="flex items-center gap-2 text-sm text-slate-600 hover:text-obsidian transition-colors"
                          >
                            <Users className="w-4 h-4" />
                            <span className="font-mono">0</span>
                          </button>
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-slate-500">
                            {formatDate(link.createdAt)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleCopyLink(link)}
                              className="p-2 hover:bg-slate-100 rounded-sm transition-colors"
                              title="Copiar link"
                            >
                              <Copy className="w-4 h-4 text-slate-600" />
                            </button>
                            <button
                              onClick={() => router.push(`/links/${link.id}`)}
                              className="p-2 hover:bg-slate-100 rounded-sm transition-colors"
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4 text-slate-600" />
                            </button>
                            {link.isActive && (
                              <button
                                onClick={() => handleArchiveLink(link.id)}
                                className="p-2 hover:bg-rose-50 rounded-sm transition-colors"
                                title="Arquivar"
                              >
                                <Archive className="w-4 h-4 text-rose-600" />
                              </button>
                            )}
                          </div>
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
              onPageChange={(page) => setFilters({ ...filters, page })}
            />
          </>
        )}
      </div>

      {/* Stats Modal */}
      <Modal open={showStatsModal} onClose={() => setShowStatsModal(false)}>
        <ModalHeader>
          <ModalTitle>Estatísticas do Link</ModalTitle>
        </ModalHeader>
        <ModalContent>
          {selectedLink && (
            <div className="space-y-6">
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-500 mb-2">
                  Título
                </p>
                <p className="text-lg font-semibold text-obsidian">
                  {selectedLink.title || 'Sem título'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-sm">
                  <p className="text-xs uppercase tracking-widest text-blue-600 mb-1">
                    Visualizações
                  </p>
                  <p className="text-3xl font-mono font-bold text-blue-700">
                    {selectedLink.viewsCount || 0}
                  </p>
                </div>
                <div className="p-4 bg-emerald-50 rounded-sm">
                  <p className="text-xs uppercase tracking-widest text-emerald-600 mb-1">
                    Leads Capturados
                  </p>
                  <p className="text-3xl font-mono font-bold text-emerald-700">
                    0
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs uppercase tracking-widest text-slate-500 mb-2">
                  Link Público
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    value={`${window.location.origin}/${selectedLink.slugToken}`}
                    readOnly
                    className="flex-1 font-mono text-sm"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleCopyLink(selectedLink)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </ModalContent>
        <ModalFooter>
          <Button
            variant="secondary"
            onClick={() => setShowStatsModal(false)}
          >
            Fechar
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
```

---

## `.\app\(industry)\sales\page.tsx`:

```
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Download, FileText, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Pagination } from '@/components/shared/Pagination';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/lib/hooks/useToast';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { formatDate } from '@/lib/utils/formatDate';
import type { Sale } from '@/lib/types';
import { cn } from '@/lib/utils/cn';

interface SalesFilter {
  startDate: string;
  endDate: string;
  sellerId: string;
  page: number;
  limit: number;
}

interface SalesSummary {
  totalSales: number;
  totalCommissions: number;
  averageTicket: number;
}

export default function SalesHistoryPage() {
  const router = useRouter();
  const { error, success } = useToast();

  const [sales, setSales] = useState<Sale[]>([]);
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [sellers, setSellers] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const [filters, setFilters] = useState<SalesFilter>({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    sellerId: '',
    page: 1,
    limit: 50,
  });

  useEffect(() => {
    fetchSellers();
  }, []);

  useEffect(() => {
    fetchSales();
    fetchSummary();
  }, [filters]);

  const fetchSellers = async () => {
    try {
      const data = await apiClient.get<Array<{ id: string; name: string }>>(
        '/users',
        { params: { role: 'VENDEDOR_INTERNO' } }
      );
      setSellers(data);
    } catch (err) {
      error('Erro ao carregar vendedores');
    }
  };

  const fetchSales = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.get<{
        sales: Sale[];
        total: number;
        page: number;
      }>('/sales-history', { params: filters });

      setSales(data.sales);
      setTotalItems(data.total);
    } catch (err) {
      error('Erro ao carregar vendas');
      setSales([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const data = await apiClient.get<SalesSummary>('/sales-history/summary', {
        params: {
          startDate: filters.startDate,
          endDate: filters.endDate,
          sellerId: filters.sellerId,
        },
      });
      setSummary(data);
    } catch (err) {
      setSummary(null);
    }
  };

  const handleExport = async () => {
    try {
      success('Exportação iniciada. O download começará em breve.');
      // Implementar lógica de exportação
    } catch (err) {
      error('Erro ao exportar relatório');
    }
  };

  const isEmpty = sales.length === 0;

  return (
    <div className="min-h-screen bg-mineral">
      {/* Header */}
      <div className="bg-porcelain border-b border-slate-100 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl text-obsidian mb-2">
              Histórico de Vendas
            </h1>
            <p className="text-sm text-slate-500">
              Consulte todas as vendas realizadas
            </p>
          </div>
          <Button variant="secondary" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Exportar Relatório
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-slate-500 uppercase tracking-widest">
                  Total Vendido
                </p>
                <Receipt className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="font-serif text-4xl text-obsidian">
                {formatCurrency(summary.totalSales)}
              </p>
            </Card>

            <Card>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-slate-500 uppercase tracking-widest">
                  Comissões Pagas
                </p>
                <Receipt className="w-5 h-5 text-blue-600" />
              </div>
              <p className="font-serif text-4xl text-obsidian">
                {formatCurrency(summary.totalCommissions)}
              </p>
            </Card>

            <Card>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-slate-500 uppercase tracking-widest">
                  Ticket Médio
                </p>
                <Receipt className="w-5 h-5 text-amber-600" />
              </div>
              <p className="font-serif text-4xl text-obsidian">
                {formatCurrency(summary.averageTicket)}
              </p>
            </Card>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="px-8 pb-6">
        <div className="bg-porcelain rounded-sm border border-slate-100 p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              type="date"
              label="Data Início"
              value={filters.startDate}
              onChange={(e) =>
                setFilters({ ...filters, startDate: e.target.value, page: 1 })
              }
            />

            <Input
              type="date"
              label="Data Fim"
              value={filters.endDate}
              onChange={(e) =>
                setFilters({ ...filters, endDate: e.target.value, page: 1 })
              }
            />

            <Select
              label="Vendedor"
              value={filters.sellerId}
              onChange={(e) =>
                setFilters({ ...filters, sellerId: e.target.value, page: 1 })
              }
            >
              <option value="">Todos os Vendedores</option>
              {sellers.map((seller) => (
                <option key={seller.id} value={seller.id}>
                  {seller.name}
                </option>
              ))}
            </Select>

            <div className="flex items-end">
              <Button
                variant="secondary"
                className="w-full"
                onClick={() =>
                  setFilters({
                    startDate: new Date(
                      new Date().getFullYear(),
                      new Date().getMonth(),
                      1
                    )
                      .toISOString()
                      .split('T')[0],
                    endDate: new Date().toISOString().split('T')[0],
                    sellerId: '',
                    page: 1,
                    limit: 50,
                  })
                }
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
          <LoadingState variant="table" rows={10} columns={7} />
        ) : isEmpty ? (
          <EmptyState
            icon={Receipt}
            title="Nenhuma venda registrada"
            description="O histórico de vendas aparecerá aqui"
          />
        ) : (
          <>
            <div className="bg-porcelain rounded-sm border border-slate-100 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nº Venda</TableHead>
                    <TableHead>Lote</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Valor Total</TableHead>
                    <TableHead>Comissão</TableHead>
                    <TableHead>Líquido</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((sale) => (
                    <>
                      <TableRow
                        key={sale.id}
                        className={cn(
                          'cursor-pointer',
                          expandedRow === sale.id && 'bg-slate-50'
                        )}
                        onClick={() =>
                          setExpandedRow(expandedRow === sale.id ? null : sale.id)
                        }
                      >
                        <TableCell>
                          <span className="font-mono text-sm text-obsidian">
                            #{sale.id.slice(0, 8)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-sm text-slate-600">
                            {sale.batch?.batchCode || '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-slate-600">{sale.customerName}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-slate-600">
                            {sale.soldBy?.name || '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-serif text-obsidian">
                            {formatCurrency(sale.salePrice)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-blue-600">
                            {sale.brokerCommission
                              ? formatCurrency(sale.brokerCommission)
                              : '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-emerald-600">
                            {formatCurrency(sale.netIndustryValue)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-slate-500">
                            {formatDate(sale.saleDate)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {sale.invoiceUrl && (
                            <a
                              href={sale.invoiceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 hover:bg-slate-100 rounded-sm inline-flex items-center transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <FileText className="w-4 h-4 text-slate-600" />
                            </a>
                          )}
                        </TableCell>
                      </TableRow>

                      {/* Expanded Row Details */}
                      {expandedRow === sale.id && (
                        <TableRow>
                          <TableCell colSpan={9} className="bg-slate-50">
                            <div className="py-4 px-6">
                              <div className="grid grid-cols-3 gap-6">
                                <div>
                                  <p className="text-xs uppercase tracking-widest text-slate-500 mb-1">
                                    Produto
                                  </p>
                                  <p className="text-sm font-medium text-obsidian">
                                    {sale.batch?.product?.name || '-'}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs uppercase tracking-widest text-slate-500 mb-1">
                                    Contato Cliente
                                  </p>
                                  <p className="text-sm text-slate-600">
                                    {sale.customerContact}
                                  </p>
                                </div>
                                {sale.notes && (
                                  <div>
                                    <p className="text-xs uppercase tracking-widest text-slate-500 mb-1">
                                      Observações
                                    </p>
                                    <p className="text-sm text-slate-600">{sale.notes}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
                </TableBody>
              </Table>
            </div>

            <Pagination
              currentPage={filters.page}
              totalPages={Math.ceil(totalItems / filters.limit)}
              totalItems={totalItems}
              itemsPerPage={filters.limit}
              onPageChange={(page) => setFilters({ ...filters, page })}
            />
          </>
        )}
      </div>
    </div>
  );
}
```

---

## `.\app\(industry)\team\page.tsx`:

```
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
                        <p className="font-medium text-obsidian">{seller.name}</p>
                        <p className="text-xs text-slate-500">
                          Desde {formatDate(seller.createdAt, 'MMM yyyy')}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-600">
                          {seller.email}
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
```

---

## `.\app\(public)\[slug]\page.tsx`:

```
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  ChevronDown, 
  CheckCircle, 
  Ruler, 
  Package, 
  Calendar,
  MapPin,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/lib/hooks/useToast';
import { leadCaptureSchema, type LeadCaptureInput } from '@/lib/schemas/link.schema';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { formatDimensions, formatArea } from '@/lib/utils/formatDimensions';
import { formatDate } from '@/lib/utils/formatDate';
import { cn } from '@/lib/utils/cn';
import type { SalesLink } from '@/lib/types';

export default function PublicLinkPage() {
  const params = useParams();
  const slug = params.slug as string;
  
  const [link, setLink] = useState<SalesLink | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { success, error } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<LeadCaptureInput>({
    resolver: zodResolver(leadCaptureSchema),
  });

  useEffect(() => {
    const fetchLink = async () => {
      try {
        setIsLoading(true);
        const data = await apiClient.get<SalesLink>(`/public/links/${slug}`);
        setLink(data);
      } catch (err) {
        error('Link não encontrado ou expirado');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLink();
  }, [slug, error]);

  const onSubmit = async (data: LeadCaptureInput) => {
    if (!link) return;

    try {
      setIsSubmitting(true);
      
      await apiClient.post('/public/leads/interest', {
        salesLinkId: link.id,
        ...data,
      });

      setIsSubmitted(true);
      reset();
      
      setTimeout(() => {
        document.getElementById('cta-section')?.scrollIntoView({ 
          behavior: 'smooth' 
        });
      }, 100);
    } catch (err) {
      error('Erro ao enviar interesse. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-obsidian" />
      </div>
    );
  }

  if (!link || !link.batch) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <h1 className="font-serif text-3xl text-obsidian mb-4">
            Link não encontrado
          </h1>
          <p className="text-slate-600">
            Este link não existe ou expirou
          </p>
        </div>
      </div>
    );
  }

  const batch = link.batch;
  const product = batch.product;
  const images = batch.medias?.length > 0 ? batch.medias : product?.medias || [];
  const mainImage = images[selectedImageIndex];

  return (
    <>
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        {mainImage && (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${mainImage.url})`,
              backgroundAttachment: 'fixed',
            }}
          />
        )}
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

        {/* Content */}
        <div className="relative z-10 text-center px-6 py-20">
          {/* Material Badge */}
          {product && (
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/20 backdrop-blur-md border border-white/40 mb-8">
              <span className="text-xs uppercase tracking-widest font-semibold text-porcelain">
                {product.material}
              </span>
            </div>
          )}

          {/* Title */}
          <h1 className="font-serif text-5xl md:text-7xl text-porcelain mb-4 leading-tight">
            {link.title || product?.name || 'Pedra Natural Premium'}
          </h1>

          {/* Batch Code */}
          <p className="font-mono text-xl text-porcelain/80 mb-12">
            Lote {batch.batchCode}
          </p>

          {/* CTA Button */}
          <Button
            size="lg"
            variant="primary"
            onClick={() => {
              document.getElementById('cta-section')?.scrollIntoView({ 
                behavior: 'smooth' 
              });
            }}
            className="bg-porcelain text-obsidian hover:shadow-premium-lg"
          >
            TENHO INTERESSE
          </Button>

          {/* Scroll Indicator */}
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 animate-bounce">
            <ChevronDown className="w-8 h-8 text-porcelain/60" />
          </div>
        </div>
      </section>

      {/* Custom Message */}
      {link.customMessage && (
        <section className="py-16 bg-mineral">
          <div className="container mx-auto px-6 max-w-3xl text-center">
            <p className="text-lg text-slate-600 leading-relaxed">
              {link.customMessage}
            </p>
          </div>
        </section>
      )}

      {/* Gallery Section */}
      {images.length > 1 && (
        <section className="py-20 bg-porcelain">
          <div className="container mx-auto px-6">
            <h2 className="font-serif text-4xl text-obsidian text-center mb-12">
              Galeria
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-6xl mx-auto">
              {images.map((image, index) => (
                <button
                  key={image.id}
                  onClick={() => {
                    setSelectedImageIndex(index);
                    setIsLightboxOpen(true);
                  }}
                  className="relative aspect-[4/3] overflow-hidden rounded-sm border border-white/20 group"
                >
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                    style={{ backgroundImage: `url(${image.url})` }}
                  />
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Specifications Section */}
      <section className="py-20 bg-mineral">
        <div className="container mx-auto px-6 max-w-4xl">
          <h2 className="font-serif text-4xl text-obsidian text-center mb-12">
            Especificações Técnicas
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Dimensions */}
            <div>
              <h3 className="uppercase tracking-widest text-xs font-semibold text-slate-500 mb-6">
                Dimensões
              </h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Ruler className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-500">Altura</p>
                    <p className="font-mono text-lg text-obsidian">{batch.height} cm</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Ruler className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-500">Largura</p>
                    <p className="font-mono text-lg text-obsidian">{batch.width} cm</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Ruler className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-500">Espessura</p>
                    <p className="font-mono text-lg text-obsidian">{batch.thickness} cm</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Package className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-500">Área Total</p>
                    <p className="font-mono text-lg text-obsidian">
                      {formatArea(batch.totalArea)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Package className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-500">Chapas</p>
                    <p className="font-mono text-lg text-obsidian">
                      {batch.quantitySlabs}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Details */}
            <div>
              <h3 className="uppercase tracking-widest text-xs font-semibold text-slate-500 mb-6">
                Origem e Detalhes
              </h3>
              <div className="space-y-4">
                {batch.originQuarry && (
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-sm text-slate-500">Pedreira</p>
                      <p className="text-lg text-obsidian">{batch.originQuarry}</p>
                    </div>
                  </div>
                )}
                {product?.finish && (
                  <div className="flex items-center gap-3">
                    <Package className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-sm text-slate-500">Acabamento</p>
                      <p className="text-lg text-obsidian">{product.finish}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-sm text-slate-500">Data de Entrada</p>
                    <p className="text-lg text-obsidian">
                      {formatDate(batch.entryDate)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Product Description */}
          {product?.description && (
            <div className="mt-12 pt-12 border-t border-slate-200">
              <h3 className="uppercase tracking-widest text-xs font-semibold text-slate-500 mb-4">
                Sobre o Material
              </h3>
              <p className="text-slate-600 leading-relaxed">
                {product.description}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Price Section */}
      {link.showPrice && link.displayPrice && (
        <section className="py-20 bg-porcelain">
          <div className="container mx-auto px-6 text-center">
            <p className="text-sm uppercase tracking-widest text-slate-500 mb-4">
              Investimento
            </p>
            <p className="font-serif text-6xl text-obsidian mb-4">
              {formatCurrency(link.displayPrice)}
            </p>
            <p className="text-sm text-slate-500">
              Valor total do lote
            </p>
          </div>
        </section>
      )}

      {!link.showPrice && (
        <section className="py-20 bg-porcelain">
          <div className="container mx-auto px-6 text-center">
            <p className="font-serif text-4xl text-obsidian">
              Preço Sob Consulta
            </p>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section id="cta-section" className="py-20 bg-obsidian text-porcelain">
        <div className="container mx-auto px-6 max-w-2xl">
          {isSubmitted ? (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-6" />
              <h2 className="font-serif text-4xl mb-4">
                Interesse Enviado!
              </h2>
              <p className="text-porcelain/80 text-lg">
                Obrigado pelo seu interesse. O vendedor responsável entrará em contato em breve.
              </p>
            </div>
          ) : (
            <>
              <div className="text-center mb-12">
                <h2 className="font-serif text-4xl mb-4">
                  Interessado nesta pedra?
                </h2>
                <p className="text-porcelain/80 text-lg">
                  Preencha o formulário abaixo e entraremos em contato
                </p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <Input
                  {...register('name')}
                  placeholder="Seu nome completo"
                  error={errors.name?.message}
                  disabled={isSubmitting}
                  className="bg-white/10 border-white/20 text-porcelain placeholder:text-porcelain/50"
                />

                <Input
                  {...register('contact')}
                  placeholder="Email ou WhatsApp"
                  error={errors.contact?.message}
                  disabled={isSubmitting}
                  className="bg-white/10 border-white/20 text-porcelain placeholder:text-porcelain/50"
                />

                <Textarea
                  {...register('message')}
                  placeholder="Mensagem (opcional)"
                  error={errors.message?.message}
                  disabled={isSubmitting}
                  rows={4}
                  className="bg-white/10 border-white/20 text-porcelain placeholder:text-porcelain/50"
                />

                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    {...register('marketingOptIn')}
                    id="marketing"
                    className="mt-1 w-4 h-4 rounded border-white/20 bg-white/10"
                  />
                  <label htmlFor="marketing" className="text-sm text-porcelain/80">
                    Quero receber novidades sobre pedras similares
                  </label>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  loading={isSubmitting}
                  className="w-full bg-porcelain text-obsidian hover:shadow-premium-lg"
                >
                  ENVIAR INTERESSE
                </Button>

                <p className="text-xs text-porcelain/60 text-center">
                  Seu contato será enviado para o vendedor responsável
                </p>
              </form>
            </>
          )}
        </div>
      </section>

      {/* Lightbox */}
      {isLightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setIsLightboxOpen(false)}
        >
          <button
            onClick={() => setIsLightboxOpen(false)}
            className="absolute top-4 right-4 text-white hover:text-white/70 transition-colors"
          >
            <X className="w-8 h-8" />
          </button>

          <div
            className="max-w-6xl max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={images[selectedImageIndex]?.url}
              alt="Imagem ampliada"
              className="max-w-full max-h-[90vh] object-contain"
            />
          </div>

          {/* Navigation */}
          {images.length > 1 && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
              {images.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImageIndex(index)}
                  className={cn(
                    'w-3 h-3 rounded-full transition-all',
                    index === selectedImageIndex
                      ? 'bg-white w-8'
                      : 'bg-white/30 hover:bg-white/50'
                  )}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
```

---

## `.\app\(seller)\dashboard\page.tsx`:

```
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Layers, Link2, Inbox, TrendingUp, Plus, Eye, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/shared/LoadingState';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/lib/hooks/useToast';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { formatDate } from '@/lib/utils/formatDate';
import type { DashboardMetrics, Activity } from '@/lib/types';
import { cn } from '@/lib/utils/cn';

export default function SellerDashboardPage() {
  const router = useRouter();
  const { error } = useToast();

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(true);
  const [isLoadingActivities, setIsLoadingActivities] = useState(true);

  useEffect(() => {
    fetchMetrics();
    fetchActivities();
  }, []);

  const fetchMetrics = async () => {
    try {
      setIsLoadingMetrics(true);
      const data = await apiClient.get<DashboardMetrics>('/dashboard/metrics');
      setMetrics(data);
    } catch (err) {
      error('Erro ao carregar métricas');
    } finally {
      setIsLoadingMetrics(false);
    }
  };

  const fetchActivities = async () => {
    try {
      setIsLoadingActivities(true);
      const data = await apiClient.get<Activity[]>('/dashboard/recent-activities');
      setActivities(data);
    } catch (err) {
      error('Erro ao carregar atividades');
    } finally {
      setIsLoadingActivities(false);
    }
  };

  return (
    <div className="min-h-screen bg-mineral">
      {/* Header */}
      <div className="bg-obsidian text-porcelain px-8 py-12">
        <div className="max-w-7xl mx-auto">
          <h1 className="font-serif text-4xl mb-2">Painel de Controle</h1>
          <p className="text-porcelain/60 text-lg">
            Visão geral das suas vendas
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {isLoadingMetrics ? (
            <>
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
            </>
          ) : (
            <>
              <MetricCard
                icon={Layers}
                title="Estoque Disponível"
                value={metrics?.availableBatches || 0}
                subtitle="LOTES ATIVOS"
                color="emerald"
              />
              <MetricCard
                icon={TrendingUp}
                title="Vendas no Mês"
                value={formatCurrency(metrics?.monthlySales || 0)}
                subtitle="FATURAMENTO MENSAL"
                color="blue"
              />
              <MetricCard
                icon={Link2}
                title="Links Ativos"
                value={metrics?.activeLinks || 0}
                subtitle="GERADOS POR MIM"
                color="purple"
              />
            </>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-obsidian mb-4">
            Ações Rápidas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="secondary"
              className="justify-start h-auto py-4"
              onClick={() => router.push('/inventory')}
            >
              <Eye className="w-5 h-5 mr-3" />
              <div className="text-left">
                <p className="font-semibold">Ver Estoque</p>
                <p className="text-xs text-slate-500 font-normal">
                  Consultar lotes disponíveis
                </p>
              </div>
            </Button>

            <Button
              variant="secondary"
              className="justify-start h-auto py-4"
              onClick={() => router.push('/links/new')}
            >
              <Plus className="w-5 h-5 mr-3" />
              <div className="text-left">
                <p className="font-semibold">Criar Link</p>
                <p className="text-xs text-slate-500 font-normal">
                  Gerar link de venda
                </p>
              </div>
            </Button>

            <Button
              variant="secondary"
              className="justify-start h-auto py-4"
              onClick={() => router.push('/leads')}
            >
              <Inbox className="w-5 h-5 mr-3" />
              <div className="text-left">
                <p className="font-semibold">Ver Leads</p>
                <p className="text-xs text-slate-500 font-normal">
                  Gerenciar interessados
                </p>
              </div>
            </Button>
          </div>
        </div>

        {/* Recent Activities */}
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-obsidian">
              Últimas Movimentações
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/sales')}
            >
              Ver tudo
            </Button>
          </div>

          {isLoadingActivities ? (
            <LoadingState variant="table" rows={5} columns={5} />
          ) : activities.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-400">Nenhuma movimentação recente</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lote</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activities.map((activity) => (
                    <TableRow key={activity.id}>
                      <TableCell>
                        <span className="font-mono text-sm text-obsidian">
                          {activity.batchCode}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-slate-600">
                          {activity.productName}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-slate-600">
                          {activity.sellerName}
                        </span>
                      </TableCell>
                      <TableCell>
                        <ActivityBadge action={activity.action} />
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-500">
                          {formatDate(activity.date, 'dd/MM/yyyy HH:mm')}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

interface MetricCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string | number;
  subtitle: string;
  color: 'emerald' | 'blue' | 'purple';
}

function MetricCard({ icon: Icon, title, value, subtitle, color }: MetricCardProps) {
  const colorClasses = {
    emerald: 'text-emerald-600 bg-emerald-50',
    blue: 'text-blue-600 bg-blue-50',
    purple: 'text-purple-600 bg-purple-50',
  };

  return (
    <Card variant="elevated" className="relative overflow-hidden">
      <div className="flex items-start justify-between mb-4">
        <div className={cn('p-3 rounded-sm', colorClasses[color])}>
          <Icon className="w-6 h-6" />
        </div>
      </div>

      <div className="mb-2">
        <p className="font-serif text-5xl text-obsidian mb-1">
          {typeof value === 'number' && !value.toString().includes('R$')
            ? value.toLocaleString('pt-BR')
            : value}
        </p>
        <p className="uppercase tracking-widest text-[10px] text-slate-500 font-semibold">
          {subtitle}
        </p>
      </div>
    </Card>
  );
}

function MetricCardSkeleton() {
  return (
    <Card variant="elevated">
      <div className="animate-pulse">
        <div className="w-12 h-12 bg-slate-200 rounded-sm mb-4" />
        <div className="h-12 bg-slate-200 rounded w-32 mb-2" />
        <div className="h-4 bg-slate-200 rounded w-24" />
      </div>
    </Card>
  );
}

function ActivityBadge({ action }: { action: Activity['action'] }) {
  const variants: Record<Activity['action'], { label: string; color: string }> = {
    RESERVADO: { label: 'Reservado', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    VENDIDO: { label: 'Vendido', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    COMPARTILHADO: { label: 'Compartilhado', color: 'bg-purple-50 text-purple-700 border-purple-200' },
    CRIADO: { label: 'Criado', color: 'bg-slate-50 text-slate-700 border-slate-200' },
  };

  const variant = variants[action];

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-1 rounded-full text-[10px] uppercase tracking-widest font-semibold border',
        variant.color
      )}
    >
      {variant.label}
    </span>
  );
}
```

---

## `.\app\(seller)\inventory\page.tsx`:

```
'use client';

export { default } from '@/app/(industry)/inventory/page';
```

---

## `.\app\(seller)\leads\page.tsx`:

```
'use client';

export { default } from '@/app/(industry)/leads/page'
```

---

## `.\app\(seller)\links\new\page.tsx`:

```
'use client';

export { default } from '@/app/(industry)/links/new/page';
```

---

## `.\app\(seller)\links\page.tsx`:

```
'use client';

export { default } from '@/app/(industry)/links/page';
```

---

## `.\app\globals.css`:

```
﻿@import "tailwindcss";

:root {
  /* Cores da Identidade CAVA */
  --color-obsidian: #121212;
  --color-obsidian-hover: #0F0F0F;
  --color-porcelain: #FFFFFF;
  --color-mineral: #F9F9FB;
  --color-off-white: #FAFAFA;

  /* Variáveis de fontes */
  --font-sans: var(--font-inter);
  --font-serif: var(--font-playfair);
  --font-mono: var(--font-jetbrains);

  /* Background padrão */
  --background: var(--color-mineral);
  --foreground: var(--color-obsidian);
}

@theme inline {
  /* Cores customizadas */
  --color-obsidian: var(--color-obsidian);
  --color-obsidian-hover: var(--color-obsidian-hover);
  --color-porcelain: var(--color-porcelain);
  --color-mineral: var(--color-mineral);
  --color-off-white: var(--color-off-white);

  /* Fontes */
  --font-sans: var(--font-sans);
  --font-serif: var(--font-serif);
  --font-mono: var(--font-mono);

  /* Letter spacing customizado */
  --letter-spacing-widest: 0.15em;

  /* Sombras premium */
  --shadow-premium: 0 4px 24px rgba(0, 0, 0, 0.08);
  --shadow-premium-lg: 0 8px 40px rgba(0, 0, 0, 0.12);
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-sans), sans-serif;
}

/* Utilitários customizados */
.shadow-premium {
  box-shadow: var(--shadow-premium);
}

.shadow-premium-lg {
  box-shadow: var(--shadow-premium-lg);
}

.tracking-widest {
  letter-spacing: var(--letter-spacing-widest);
}
```

---

## `.\app\page.tsx`:

```
import Image from "next/image";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <Image
          className="dark:invert"
          src="/next.svg"
          alt="Next.js logo"
          width={100}
          height={20}
          priority
        />
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            To get started, edit the page.tsx file.
          </h1>
          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Looking for a starting point or more instructions? Head over to{" "}
            <a
              href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              className="font-medium text-zinc-950 dark:text-zinc-50"
            >
              Templates
            </a>{" "}
            or the{" "}
            <a
              href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              className="font-medium text-zinc-950 dark:text-zinc-50"
            >
              Learning
            </a>{" "}
            center.
          </p>
        </div>
        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
          <a
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc] md:w-[158px]"
            href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              className="dark:invert"
              src="/vercel.svg"
              alt="Vercel logomark"
              width={16}
              height={16}
            />
            Deploy Now
          </a>
          <a
            className="flex h-12 w-full items-center justify-center rounded-full border border-solid border-black/[.08] px-5 transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a] md:w-[158px]"
            href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            Documentation
          </a>
        </div>
      </main>
    </div>
  );
}
```

---

## `.\components\shared\EmptyState.tsx`:

```
import { type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center min-h-[400px] py-12 px-6',
        className
      )}
    >
      <Icon className="w-12 h-12 text-slate-300 mb-6" strokeWidth={1.5} />
      
      <h3 className="font-serif text-2xl text-slate-400 mb-2 text-center">
        {title}
      </h3>
      
      <p className="text-sm text-slate-400 max-w-md text-center mb-6">
        {description}
      </p>
      
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="primary">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
```

---

## `.\components\shared\ErrorBoundary.tsx`:

```
'use client';

import { Component, type ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      // Aqui você pode enviar o erro para um serviço de monitoramento
      // Ex: Sentry, LogRocket, etc.
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-mineral flex items-center justify-center p-6">
          <Card className="max-w-2xl w-full" variant="elevated">
            <CardContent className="text-center py-12">
              <AlertCircle className="w-16 h-16 text-rose-500 mx-auto mb-6" strokeWidth={1.5} />
              
              <h1 className="font-serif text-3xl text-obsidian mb-4">
                Algo deu errado
              </h1>
              
              <p className="text-slate-600 mb-8 max-w-md mx-auto">
                Ocorreu um erro inesperado. Nossa equipe foi notificada e está trabalhando para
                resolver o problema.
              </p>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="mb-8 text-left bg-rose-50 border border-rose-200 rounded-sm p-4 overflow-auto max-h-64">
                  <p className="font-mono text-sm text-rose-900 mb-2">
                    <strong>Error:</strong> {this.state.error.toString()}
                  </p>
                  {this.state.errorInfo && (
                    <pre className="font-mono text-xs text-rose-800 whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button
                  variant="primary"
                  onClick={this.handleReset}
                  className="w-full sm:w-auto"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Tentar Novamente
                </Button>
                
                <Button
                  variant="secondary"
                  onClick={() => window.location.href = '/dashboard'}
                  className="w-full sm:w-auto"
                >
                  Ir para Dashboard
                </Button>
              </div>

              <p className="text-xs text-slate-400 mt-8">
                Se o problema persistir, entre em contato com o suporte.
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export function ErrorFallback({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center min-h-[400px] p-6">
      <div className="text-center max-w-md">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" strokeWidth={1.5} />
        
        <h3 className="font-serif text-xl text-obsidian mb-2">
          Erro ao carregar dados
        </h3>
        
        <p className="text-sm text-slate-600 mb-6">
          {error.message || 'Não foi possível carregar as informações'}
        </p>
        
        <Button onClick={reset} variant="secondary">
          Tentar Novamente
        </Button>
      </div>
    </div>
  );
}
```

---

## `.\components\shared\Header.tsx`:

```
'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Menu, LogOut, User, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dropdown, DropdownItem, DropdownSeparator } from '@/components/ui/dropdown';
import { useAuthStore } from '@/store/auth.store';
import { useUIStore } from '@/store/ui.store';
import { useToast } from '@/lib/hooks/useToast';
import { cn } from '@/lib/utils/cn';

const routeLabels: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/catalog': 'Catálogo',
  '/inventory': 'Estoque',
  '/shared-inventory': 'Estoque Compartilhado',
  '/brokers': 'Parceiros',
  '/sales': 'Vendas',
  '/links': 'Links',
  '/leads': 'Leads',
  '/team': 'Equipe',
};

function getBreadcrumbs(pathname: string): Array<{ label: string; href: string }> {
  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs: Array<{ label: string; href: string }> = [];

  let currentPath = '';
  for (const segment of segments) {
    currentPath += `/${segment}`;
    
    const label = routeLabels[currentPath] || segment.charAt(0).toUpperCase() + segment.slice(1);
    
    if (segment !== 'new' && !segment.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      breadcrumbs.push({ label, href: currentPath });
    }
  }

  return breadcrumbs;
}

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const { toggleSidebar, toggleMobileMenu } = useUIStore();
  const { success, error } = useToast();

  const breadcrumbs = getBreadcrumbs(pathname);
  const currentPage = breadcrumbs[breadcrumbs.length - 1]?.label || 'Dashboard';

  const handleLogout = async () => {
    try {
      await logout();
      success('Logout realizado com sucesso');
      router.push('/login');
    } catch (err) {
      error('Erro ao fazer logout');
    }
  };

  if (!user) return null;

  return (
    <header className="sticky top-0 z-30 bg-porcelain border-b border-slate-100">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Left: Mobile Menu + Breadcrumbs */}
        <div className="flex items-center gap-4">
          <button
            onClick={toggleSidebar}
            className={cn(
              'p-2 rounded-sm hover:bg-slate-100 transition-colors lg:hidden',
              'focus:outline-none focus:ring-2 focus:ring-obsidian/20'
            )}
          >
            <Menu className="w-5 h-5 text-slate-600" />
          </button>

          {/* Breadcrumbs */}
          <div className="hidden md:flex items-center gap-2 text-sm">
            {breadcrumbs.map((crumb, index) => (
              <div key={crumb.href} className="flex items-center gap-2">
                {index > 0 && (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
                {index === breadcrumbs.length - 1 ? (
                  <span className="font-medium text-obsidian">{crumb.label}</span>
                ) : (
                  <button
                    onClick={() => router.push(crumb.href)}
                    className="text-slate-500 hover:text-obsidian transition-colors"
                  >
                    {crumb.label}
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Mobile: Current Page */}
          <h1 className="md:hidden font-serif text-xl font-semibold text-obsidian">
            {currentPage}
          </h1>
        </div>

        {/* Right: User Menu */}
        <div className="flex items-center gap-3">
          <Dropdown
            trigger={
              <div className="flex items-center gap-3 px-3 py-2 rounded-sm hover:bg-slate-50 transition-colors cursor-pointer">
                <div className="w-8 h-8 rounded-full bg-obsidian text-porcelain flex items-center justify-center">
                  <span className="text-xs font-semibold">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="hidden lg:block text-left">
                  <p className="text-sm font-medium text-obsidian">{user.name}</p>
                  <p className="text-xs text-slate-500">{user.email}</p>
                </div>
              </div>
            }
          >
            <div className="py-2 px-4 border-b border-slate-100">
              <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold">
                {user.role === 'ADMIN_INDUSTRIA' && 'Administrador'}
                {user.role === 'VENDEDOR_INTERNO' && 'Vendedor Interno'}
                {user.role === 'BROKER' && 'Broker'}
              </p>
            </div>
            
            <DropdownItem onClick={() => router.push('/profile')}>
              <User className="w-4 h-4 mr-2" />
              Meu Perfil
            </DropdownItem>
            
            <DropdownSeparator />
            
            <DropdownItem onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </DropdownItem>
          </Dropdown>
        </div>
      </div>
    </header>
  );
}
```

---

## `.\components\shared\LoadingState.tsx`:

```
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils/cn';

interface LoadingStateProps {
  variant?: 'cards' | 'table' | 'form' | 'dashboard';
  rows?: number;
  columns?: number;
  className?: string;
}

export function LoadingState({
  variant = 'cards',
  rows = 5,
  columns = 4,
  className,
}: LoadingStateProps) {
  if (variant === 'cards') {
    return (
      <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6', className)}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="bg-porcelain border border-slate-100 rounded-sm p-6">
            <Skeleton className="aspect-[4/3] w-full mb-4" />
            <Skeleton className="h-6 w-3/4 mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div className={cn('w-full', className)}>
        <div className="bg-mineral border-b-2 border-slate-200 p-4 flex gap-6">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-24" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="border-b border-slate-100 p-4 flex gap-6">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton key={colIndex} className="h-4 w-32" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'form') {
    return (
      <div className={cn('space-y-6 max-w-2xl', className)}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-32 mb-2" />
            <Skeleton className="h-12 w-full" />
          </div>
        ))}
        <div className="flex justify-end gap-3 pt-6">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
    );
  }

  if (variant === 'dashboard') {
    return (
      <div className={cn('space-y-8', className)}>
        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-porcelain border border-slate-100 rounded-sm p-8">
              <Skeleton className="h-12 w-24 mb-4" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="flex gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-40" />
          ))}
        </div>

        {/* Table */}
        <div>
          <Skeleton className="h-6 w-48 mb-4" />
          <LoadingState variant="table" rows={5} columns={5} />
        </div>
      </div>
    );
  }

  return null;
}

export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center min-h-[400px]', className)}>
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-obsidian" />
    </div>
  );
}

export function LoadingOverlay() {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-porcelain rounded-xl p-8 shadow-premium-lg">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-obsidian" />
      </div>
    </div>
  );
}
```

---

## `.\components\shared\Pagination.tsx`:

```
'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange?: (page: number) => void;
  variant?: 'full' | 'simple';
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  variant = 'full',
}: PaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;

    if (onPageChange) {
      onPageChange(page);
    } else {
      const params = new URLSearchParams(searchParams);
      params.set('page', page.toString());
      router.push(`${pathname}?${params.toString()}`);
      
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (currentPage > 3) {
        pages.push('...');
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('...');
      }

      pages.push(totalPages);
    }

    return pages;
  };

  if (totalPages <= 1 && variant === 'full') return null;

  if (variant === 'simple') {
    return (
      <div className="flex items-center justify-center gap-2 py-4">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={cn(
            'p-2 rounded-sm transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-obsidian/20',
            currentPage === 1
              ? 'opacity-50 cursor-not-allowed text-slate-300'
              : 'text-slate-600 hover:bg-slate-50'
          )}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <span className="text-sm text-slate-600 px-4">
          Página {currentPage} de {totalPages}
        </span>

        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={cn(
            'p-2 rounded-sm transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-obsidian/20',
            currentPage === totalPages
              ? 'opacity-50 cursor-not-allowed text-slate-300'
              : 'text-slate-600 hover:bg-slate-50'
          )}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between py-4 border-t border-slate-100">
      {/* Items Info */}
      <div className="text-sm text-slate-500">
        Mostrando {startItem}-{endItem} de {totalItems} itens
      </div>

      {/* Page Numbers */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={cn(
            'w-10 h-10 rounded-sm flex items-center justify-center transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-obsidian/20',
            currentPage === 1
              ? 'opacity-50 cursor-not-allowed text-slate-300'
              : 'text-slate-600 hover:bg-slate-50'
          )}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {getPageNumbers().map((page, index) => {
          if (page === '...') {
            return (
              <span
                key={`ellipsis-${index}`}
                className="w-10 h-10 flex items-center justify-center text-slate-400"
              >
                ...
              </span>
            );
          }

          const pageNumber = page as number;
          const isActive = pageNumber === currentPage;

          return (
            <button
              key={pageNumber}
              onClick={() => handlePageChange(pageNumber)}
              className={cn(
                'w-10 h-10 rounded-sm flex items-center justify-center transition-colors text-sm font-medium',
                'focus:outline-none focus:ring-2 focus:ring-obsidian/20',
                isActive
                  ? 'bg-obsidian text-porcelain'
                  : 'text-slate-600 hover:bg-slate-50'
              )}
            >
              {pageNumber}
            </button>
          );
        })}

        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={cn(
            'w-10 h-10 rounded-sm flex items-center justify-center transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-obsidian/20',
            currentPage === totalPages
              ? 'opacity-50 cursor-not-allowed text-slate-300'
              : 'text-slate-600 hover:bg-slate-50'
          )}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
```

---

## `.\components\shared\Sidebar.tsx`:

```
'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Package, 
  Layers, 
  Users, 
  Receipt, 
  Link2, 
  Inbox, 
  UserPlus,
  PackageOpen,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useAuthStore } from '@/store/auth.store';
import { useUIStore } from '@/store/ui.store';
import type { UserRole } from '@/lib/types';

interface MenuItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
  children?: MenuItem[];
}

const menuItems: MenuItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['ADMIN_INDUSTRIA', 'VENDEDOR_INTERNO', 'BROKER'],
  },
  {
    label: 'Catálogo',
    href: '/catalog',
    icon: Package,
    roles: ['ADMIN_INDUSTRIA'],
  },
  {
    label: 'Estoque',
    href: '/inventory',
    icon: Layers,
    roles: ['ADMIN_INDUSTRIA', 'VENDEDOR_INTERNO'],
  },
  {
    label: 'Estoque Compartilhado',
    href: '/shared-inventory',
    icon: PackageOpen,
    roles: ['BROKER'],
  },
  {
    label: 'Vendas',
    href: '/sales',
    icon: Receipt,
    roles: ['ADMIN_INDUSTRIA', 'VENDEDOR_INTERNO'],
  },
  {
    label: 'Links',
    href: '/links',
    icon: Link2,
    roles: ['ADMIN_INDUSTRIA', 'VENDEDOR_INTERNO', 'BROKER'],
  },
  {
    label: 'Leads',
    href: '/leads',
    icon: Inbox,
    roles: ['ADMIN_INDUSTRIA', 'VENDEDOR_INTERNO', 'BROKER'],
  },
  {
    label: 'Parceiros',
    href: '/brokers',
    icon: Users,
    roles: ['ADMIN_INDUSTRIA'],
  },
  {
    label: 'Equipe',
    href: '/team',
    icon: UserPlus,
    roles: ['ADMIN_INDUSTRIA'],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const { sidebarOpen, toggleSidebar } = useUIStore();

  const filteredMenuItems = useMemo(() => {
    if (!user) return [];
    return menuItems.filter((item) => item.roles.includes(user.role));
  }, [user]);

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  if (!user) return null;

  return (
    <>
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-screen bg-obsidian text-porcelain transition-all duration-300',
          'flex flex-col',
          sidebarOpen ? 'w-64' : 'w-0 lg:w-20',
          'lg:relative lg:z-auto'
        )}
      >
        {/* Logo & Toggle */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div
            className={cn(
              'flex items-center gap-3 transition-opacity duration-200',
              !sidebarOpen && 'lg:opacity-0'
            )}
          >
            <div className="w-8 h-8 bg-porcelain rounded-sm" />
            {sidebarOpen && (
              <span className="font-serif text-xl font-semibold">CAVA</span>
            )}
          </div>
          
          <button
            onClick={toggleSidebar}
            className={cn(
              'p-2 rounded-sm hover:bg-white/10 transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-white/20',
              !sidebarOpen && 'lg:mx-auto'
            )}
          >
            {sidebarOpen ? (
              <ChevronLeft className="w-5 h-5" />
            ) : (
              <ChevronRight className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-6">
          <ul className="space-y-1 px-3">
            {filteredMenuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-3 rounded-sm transition-all duration-200',
                      'text-sm font-medium',
                      'focus:outline-none focus:ring-2 focus:ring-white/20',
                      active
                        ? 'bg-porcelain text-obsidian'
                        : 'text-porcelain/80 hover:bg-white/10 hover:text-porcelain',
                      !sidebarOpen && 'lg:justify-center'
                    )}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    {sidebarOpen && (
                      <span className="truncate">{item.label}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Info */}
        {sidebarOpen && (
          <div className="p-6 border-t border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-porcelain/20 flex items-center justify-center">
                <span className="text-sm font-semibold">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-xs text-porcelain/60 truncate">
                  {user.role === 'ADMIN_INDUSTRIA' && 'Administrador'}
                  {user.role === 'VENDEDOR_INTERNO' && 'Vendedor'}
                  {user.role === 'BROKER' && 'Broker'}
                </p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
```

---

## `.\components\ui\badge.tsx`:

```
import { type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';
import type { BatchStatus } from '@/lib/types';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BatchStatus | 'default';
}

const Badge = ({ className, variant = 'default', children, ...props }: BadgeProps) => {
  const baseStyles = 'inline-flex items-center px-3 py-1 rounded-full text-[10px] uppercase tracking-widest font-semibold';

  const variants = {
    DISPONIVEL: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    RESERVADO: 'bg-blue-50 text-blue-700 border border-blue-200',
    VENDIDO: 'bg-slate-100 text-slate-600 border border-slate-200',
    INATIVO: 'bg-rose-50 text-rose-600 border border-rose-200',
    default: 'bg-slate-100 text-slate-600 border border-slate-200',
  };

  return (
    <span
      className={cn(
        baseStyles,
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};

Badge.displayName = 'Badge';

export { Badge };
```

---

## `.\components\ui\button.tsx`:

```
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-sm font-bold uppercase tracking-widest text-xs transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-obsidian/20 disabled:opacity-50 disabled:cursor-not-allowed';

    const variants = {
      primary: 'bg-obsidian text-porcelain hover:shadow-premium active:scale-[0.98]',
      secondary: 'bg-porcelain border border-slate-200 text-slate-600 hover:border-obsidian hover:text-obsidian active:scale-[0.98]',
      destructive: 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 active:scale-[0.98]',
      ghost: 'bg-transparent text-slate-600 hover:bg-slate-50 active:bg-slate-100',
    };

    const sizes = {
      sm: 'px-4 py-2 text-[10px]',
      md: 'px-6 py-3 text-xs',
      lg: 'px-8 py-4 text-xs',
    };

    return (
      <button
        ref={ref}
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {children}
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
```

---

## `.\components\ui\card.tsx`:

```
import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'flat' | 'elevated' | 'glass';
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variants = {
      default: 'bg-porcelain border border-slate-100',
      flat: 'bg-mineral border-0',
      elevated: 'bg-porcelain border border-slate-100 shadow-premium hover:shadow-premium-lg transition-shadow duration-200',
      glass: 'bg-white/95 backdrop-blur-md border border-white/20',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-sm p-8',
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);

Card.displayName = 'Card';

const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-1.5 mb-6', className)}
      {...props}
    />
  )
);

CardHeader.displayName = 'CardHeader';

const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('font-serif text-2xl font-semibold leading-none tracking-tight', className)}
      {...props}
    />
  )
);

CardTitle.displayName = 'CardTitle';

const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-sm text-slate-500', className)}
      {...props}
    />
  )
);

CardDescription.displayName = 'CardDescription';

const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('', className)}
      {...props}
    />
  )
);

CardContent.displayName = 'CardContent';

const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center pt-6 border-t border-slate-100', className)}
      {...props}
    />
  )
);

CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
```

---

## `.\components\ui\dropdown.tsx`:

```
import { forwardRef, type HTMLAttributes, type ReactNode, useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface DropdownProps extends HTMLAttributes<HTMLDivElement> {
  trigger: ReactNode;
}

const Dropdown = forwardRef<HTMLDivElement, DropdownProps>(
  ({ className, trigger, children, ...props }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
      <div ref={dropdownRef} className={cn('relative inline-block', className)} {...props}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center justify-between w-full"
        >
          {trigger}
        </button>
        {isOpen && (
          <div
            ref={ref}
            className={cn(
              'absolute z-50 mt-2 min-w-[200px] rounded-sm border border-slate-200',
              'bg-white shadow-premium-lg animate-in fade-in-0 zoom-in-95 duration-100',
              'py-1'
            )}
          >
            {children}
          </div>
        )}
      </div>
    );
  }
);

Dropdown.displayName = 'Dropdown';

const DropdownItem = forwardRef<HTMLButtonElement, HTMLAttributes<HTMLButtonElement>>(
  ({ className, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      className={cn(
        'w-full px-4 py-2 text-left text-sm transition-colors duration-150',
        'hover:bg-slate-50 focus:bg-slate-50 focus:outline-none',
        className
      )}
      {...props}
    />
  )
);

DropdownItem.displayName = 'DropdownItem';

const DropdownSeparator = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('my-1 h-px bg-slate-100', className)}
      {...props}
    />
  )
);

DropdownSeparator.displayName = 'DropdownSeparator';

export { Dropdown, DropdownItem, DropdownSeparator };
```

---

## `.\components\ui\input.tsx`:

```
import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              'block uppercase tracking-widest text-[10px] font-semibold mb-2',
              error ? 'text-rose-600' : 'text-slate-500'
            )}
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full border rounded-sm px-4 py-3 text-sm transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-obsidian/20',
            'disabled:bg-slate-50 disabled:text-slate-300 disabled:cursor-not-allowed',
            error
              ? 'border-rose-300 bg-rose-50/30 focus:border-rose-400 focus:ring-rose-100'
              : 'border-slate-200 bg-white focus:border-obsidian',
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1 text-xs text-rose-600">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-xs text-slate-400">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
```

---

## `.\components\ui\label.tsx`:

```
import { forwardRef, type LabelHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  error?: boolean;
}

const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, error, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        'block uppercase tracking-widest text-[10px] font-semibold mb-2',
        error ? 'text-rose-600' : 'text-slate-500',
        className
      )}
      {...props}
    />
  )
);

Label.displayName = 'Label';

export { Label };
```

---

## `.\components\ui\modal.tsx`:

```
import { forwardRef, type HTMLAttributes, type ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface ModalProps extends HTMLAttributes<HTMLDivElement> {
  open: boolean;
  onClose: () => void;
}

const Modal = forwardRef<HTMLDivElement, ModalProps>(
  ({ className, open, onClose, children, ...props }, ref) => {
    useEffect(() => {
      if (open) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = 'unset';
      }

      return () => {
        document.body.style.overflow = 'unset';
      };
    }, [open]);

    useEffect(() => {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && open) {
          onClose();
        }
      };

      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }, [open, onClose]);

    if (!open) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200"
          onClick={onClose}
          aria-hidden="true"
        />
        <div
          ref={ref}
          className={cn(
            'relative bg-porcelain rounded-xl shadow-premium-lg',
            'w-full max-w-2xl max-h-[90vh] overflow-y-auto',
            'animate-in fade-in-0 zoom-in-95 duration-200',
            className
          )}
          {...props}
        >
          {children}
        </div>
      </div>
    );
  }
);

Modal.displayName = 'Modal';

const ModalHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('p-10 pb-6', className)}
      {...props}
    />
  )
);

ModalHeader.displayName = 'ModalHeader';

const ModalTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h2
      ref={ref}
      className={cn('font-serif text-3xl font-semibold', className)}
      {...props}
    />
  )
);

ModalTitle.displayName = 'ModalTitle';

const ModalDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('mt-2 text-sm text-slate-600', className)}
      {...props}
    />
  )
);

ModalDescription.displayName = 'ModalDescription';

const ModalContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('px-10 pb-6', className)}
      {...props}
    />
  )
);

ModalContent.displayName = 'ModalContent';

const ModalFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center justify-end gap-3 px-10 py-6 border-t border-slate-100', className)}
      {...props}
    />
  )
);

ModalFooter.displayName = 'ModalFooter';

interface ModalCloseProps extends HTMLAttributes<HTMLButtonElement> {
  onClose: () => void;
}

const ModalClose = forwardRef<HTMLButtonElement, ModalCloseProps>(
  ({ className, onClose, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      onClick={onClose}
      className={cn(
        'absolute right-4 top-4 rounded-sm opacity-70 transition-opacity',
        'hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-obsidian/20',
        'disabled:pointer-events-none',
        className
      )}
      {...props}
    >
      <X className="h-5 w-5 text-slate-500" />
      <span className="sr-only">Fechar</span>
    </button>
  )
);

ModalClose.displayName = 'ModalClose';

export {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalContent,
  ModalFooter,
  ModalClose,
};
```

---

## `.\components\ui\select.tsx`:

```
import { forwardRef, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options?: Array<{ value: string; label: string }>;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, helperText, options, id, children, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className={cn(
              'block uppercase tracking-widest text-[10px] font-semibold mb-2',
              error ? 'text-rose-600' : 'text-slate-500'
            )}
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={cn(
              'w-full border rounded-sm px-4 py-3 pr-10 text-sm transition-all duration-200',
              'appearance-none cursor-pointer',
              'focus:outline-none focus:ring-2 focus:ring-obsidian/20',
              'disabled:bg-slate-50 disabled:text-slate-300 disabled:cursor-not-allowed',
              error
                ? 'border-rose-300 bg-rose-50/30 focus:border-rose-400 focus:ring-rose-100'
                : 'border-slate-200 bg-white focus:border-obsidian',
              className
            )}
            {...props}
          >
            {children || (
              <>
                <option value="">Selecione...</option>
                {options?.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </>
            )}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        </div>
        {error && (
          <p className="mt-1 text-xs text-rose-600">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-xs text-slate-400">{helperText}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export { Select };
```

---

## `.\components\ui\separator.tsx`:

```
import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

export interface SeparatorProps extends HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical';
  decorative?: boolean;
}

const Separator = forwardRef<HTMLDivElement, SeparatorProps>(
  ({ className, orientation = 'horizontal', decorative = true, ...props }, ref) => (
    <div
      ref={ref}
      role={decorative ? 'none' : 'separator'}
      aria-orientation={orientation}
      className={cn(
        'shrink-0 bg-slate-100',
        orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]',
        className
      )}
      {...props}
    />
  )
);

Separator.displayName = 'Separator';

export { Separator };
```

---

## `.\components\ui\skeleton.tsx`:

```
import { type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {}

const Skeleton = ({ className, ...props }: SkeletonProps) => {
  return (
    <div
      className={cn(
        'animate-pulse rounded-sm bg-slate-200/50',
        className
      )}
      {...props}
    />
  );
};

Skeleton.displayName = 'Skeleton';

const SkeletonCard = ({ className }: { className?: string }) => {
  return (
    <div className={cn('bg-porcelain border border-slate-100 rounded-sm p-8', className)}>
      <Skeleton className="h-6 w-3/4 mb-4" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-5/6" />
    </div>
  );
};

SkeletonCard.displayName = 'SkeletonCard';

const SkeletonTable = ({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) => {
  return (
    <div className="w-full">
      <div className="bg-mineral border-b-2 border-slate-200 p-4 flex gap-6">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-24" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="border-b border-slate-100 p-4 flex gap-6">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-4 w-32" />
          ))}
        </div>
      ))}
    </div>
  );
};

SkeletonTable.displayName = 'SkeletonTable';

const SkeletonImage = ({ className }: { className?: string }) => {
  return (
    <Skeleton className={cn('aspect-[4/3] w-full', className)} />
  );
};

SkeletonImage.displayName = 'SkeletonImage';

export { Skeleton, SkeletonCard, SkeletonTable, SkeletonImage };
```

---

## `.\components\ui\table.tsx`:

```
import { forwardRef, type HTMLAttributes, type ThHTMLAttributes, type TdHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

const Table = forwardRef<HTMLTableElement, HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="w-full overflow-auto">
      <table
        ref={ref}
        className={cn('w-full caption-bottom text-sm', className)}
        {...props}
      />
    </div>
  )
);

Table.displayName = 'Table';

const TableHeader = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <thead
      ref={ref}
      className={cn('bg-mineral border-b-2 border-slate-200', className)}
      {...props}
    />
  )
);

TableHeader.displayName = 'TableHeader';

const TableBody = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tbody
      ref={ref}
      className={cn('[&_tr:last-child]:border-0', className)}
      {...props}
    />
  )
);

TableBody.displayName = 'TableBody';

const TableFooter = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tfoot
      ref={ref}
      className={cn('bg-mineral border-t font-medium', className)}
      {...props}
    />
  )
);

TableFooter.displayName = 'TableFooter';

const TableRow = forwardRef<HTMLTableRowElement, HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        'border-b border-slate-100 transition-colors duration-200',
        'hover:bg-slate-50/50 data-[state=selected]:bg-slate-50',
        className
      )}
      {...props}
    />
  )
);

TableRow.displayName = 'TableRow';

const TableHead = forwardRef<HTMLTableCellElement, ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={cn(
        'h-12 px-6 text-left align-middle',
        'uppercase tracking-widest text-[10px] text-slate-500 font-semibold',
        '[&:has([role=checkbox])]:pr-0',
        className
      )}
      {...props}
    />
  )
);

TableHead.displayName = 'TableHead';

const TableCell = forwardRef<HTMLTableCellElement, TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td
      ref={ref}
      className={cn(
        'py-4 px-6 align-middle text-sm',
        '[&:has([role=checkbox])]:pr-0',
        className
      )}
      {...props}
    />
  )
);

TableCell.displayName = 'TableCell';

const TableCaption = forwardRef<HTMLTableCaptionElement, HTMLAttributes<HTMLTableCaptionElement>>(
  ({ className, ...props }, ref) => (
    <caption
      ref={ref}
      className={cn('mt-4 text-sm text-slate-500', className)}
      {...props}
    />
  )
);

TableCaption.displayName = 'TableCaption';

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};
```

---

## `.\components\ui\textarea.tsx`:

```
import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className={cn(
              'block uppercase tracking-widest text-[10px] font-semibold mb-2',
              error ? 'text-rose-600' : 'text-slate-500'
            )}
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            'w-full border rounded-sm px-4 py-3 text-sm transition-all duration-200 resize-y',
            'focus:outline-none focus:ring-2 focus:ring-obsidian/20',
            'disabled:bg-slate-50 disabled:text-slate-300 disabled:cursor-not-allowed',
            'min-h-[100px]',
            error
              ? 'border-rose-300 bg-rose-50/30 focus:border-rose-400 focus:ring-rose-100'
              : 'border-slate-200 bg-white focus:border-obsidian',
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1 text-xs text-rose-600">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-xs text-slate-400">{helperText}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export { Textarea };
```

---

## `.\components\ui\toast.tsx`:

```
'use client';

import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      position="top-right"
      toastOptions={{
        classNames: {
          toast: 'border rounded-sm shadow-premium',
          success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
          error: 'bg-rose-50 border-rose-200 text-rose-800',
          warning: 'bg-amber-50 border-amber-200 text-amber-800',
          info: 'bg-blue-50 border-blue-200 text-blue-800',
          title: 'text-sm font-semibold',
          description: 'text-xs',
        },
        duration: 3000,
      }}
      {...props}
    />
  );
};

export { Toaster };

// Exportar toast helper do sonner
export { toast } from 'sonner';
```

---

## `.\components\ui\toggle.tsx`:

```
import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

export interface ToggleProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

const Toggle = forwardRef<HTMLInputElement, ToggleProps>(
  ({ className, label, id, ...props }, ref) => {
    const toggleId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex items-center">
        <button
          type="button"
          role="switch"
          aria-checked={props.checked}
          className={cn(
            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200',
            'focus:outline-none focus:ring-2 focus:ring-obsidian/20 focus:ring-offset-2',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            props.checked ? 'bg-obsidian' : 'bg-slate-200 hover:bg-slate-300',
            className
          )}
          onClick={() => {
            const event = new Event('change', { bubbles: true });
            Object.defineProperty(event, 'target', {
              value: { checked: !props.checked },
              writable: false,
            });
            props.onChange?.(event as any);
          }}
          disabled={props.disabled}
        >
          <span className="sr-only">{label || 'Toggle'}</span>
          <span
            className={cn(
              'inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200',
              props.checked ? 'translate-x-6' : 'translate-x-1'
            )}
          />
        </button>
        <input
          ref={ref}
          id={toggleId}
          type="checkbox"
          className="sr-only"
          {...props}
        />
        {label && (
          <label
            htmlFor={toggleId}
            className="ml-3 text-sm text-slate-600 cursor-pointer"
          >
            {label}
          </label>
        )}
      </div>
    );
  }
);

Toggle.displayName = 'Toggle';

export { Toggle };
```

---

## `.\eslint.config.mjs`:

```
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
```

---

## `.\lib\api\client.ts`:

```
import type { ApiResponse, ErrorResponse, PaginatedResponse } from '@/lib/types/api';

interface RequestConfig extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

class ApiClient {
  private baseURL: string;
  private isRefreshing: boolean = false;
  private failedQueue: Array<{
    resolve: (value?: unknown) => void;
    reject: (reason?: unknown) => void;
  }> = [];

  constructor(baseURL: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api') {
    this.baseURL = baseURL;
  }

  private processQueue(error: Error | null, token: string | null = null) {
    this.failedQueue.forEach(prom => {
      if (error) {
        prom.reject(error);
      } else {
        prom.resolve(token);
      }
    });
    this.failedQueue = [];
  }

  private async refreshToken(): Promise<void> {
    if (this.isRefreshing) {
      return new Promise((resolve, reject) => {
        this.failedQueue.push({ resolve, reject });
      });
    }

    this.isRefreshing = true;

    try {
      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }

      this.processQueue(null);
      this.isRefreshing = false;
    } catch (error) {
      this.processQueue(error as Error);
      this.isRefreshing = false;
      
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname;
        if (!currentPath.startsWith('/login')) {
          window.location.href = `/login?callbackUrl=${encodeURIComponent(currentPath)}`;
        }
      }
      
      throw error;
    }
  }

  private buildURL(endpoint: string, params?: Record<string, string | number | boolean | undefined>): string {
    const url = new URL(endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint}`);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          url.searchParams.append(key, String(value));
        }
      });
    }
    
    return url.toString();
  }

  private async request<T>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<T> {
    const { params, ...fetchConfig } = config;
    const url = this.buildURL(endpoint, params);

    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
    };

    const requestConfig: RequestInit = {
      ...fetchConfig,
      headers: {
        ...defaultHeaders,
        ...fetchConfig.headers,
      },
      credentials: 'include',
    };

    try {
      const response = await fetch(url, requestConfig);

      if (response.status === 401) {
        await this.refreshToken();
        
        const retryResponse = await fetch(url, requestConfig);
        
        if (!retryResponse.ok) {
          const errorData: ErrorResponse = await retryResponse.json();
          throw new Error(errorData.error.message || 'Request failed');
        }
        
        return retryResponse.json();
      }

      if (!response.ok) {
        const errorData: ErrorResponse = await response.json();
        throw new Error(errorData.error.message || 'Request failed');
      }

      const data: ApiResponse<T> = await response.json();
      return data.data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred');
    }
  }

  async get<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'GET',
    });
  }

  async post<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'DELETE',
    });
  }

  async upload<T>(
    endpoint: string,
    formData: FormData,
    config?: Omit<RequestConfig, 'body'>
  ): Promise<T> {
    const url = this.buildURL(endpoint, config?.params);

    const requestConfig: RequestInit = {
      method: 'POST',
      body: formData,
      credentials: 'include',
      headers: config?.headers,
    };

    try {
      const response = await fetch(url, requestConfig);

      if (response.status === 401) {
        await this.refreshToken();
        const retryResponse = await fetch(url, requestConfig);
        
        if (!retryResponse.ok) {
          const errorData: ErrorResponse = await retryResponse.json();
          throw new Error(errorData.error.message || 'Upload failed');
        }
        
        return retryResponse.json();
      }

      if (!response.ok) {
        const errorData: ErrorResponse = await response.json();
        throw new Error(errorData.error.message || 'Upload failed');
      }

      const data: ApiResponse<T> = await response.json();
      return data.data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Upload failed');
    }
  }
}

export const apiClient = new ApiClient();

export type { ApiResponse, ErrorResponse, PaginatedResponse };
```

---

## `.\lib\hooks\useAuth.ts`:

```
import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth.store';
import type { UserRole } from '@/lib/types';

export function useAuth() {
  const {
    user,
    isAuthenticated,
    isLoading,
    setUser,
    login,
    logout,
    refreshSession,
    hasPermission,
  } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      refreshSession().catch(() => {
        setUser(null);
      });
    }
  }, [isAuthenticated, isLoading, refreshSession, setUser]);

  const checkPermission = (requiredRole: UserRole | UserRole[]): boolean => {
    return hasPermission(requiredRole);
  };

  const isAdmin = (): boolean => {
    return hasPermission('ADMIN_INDUSTRIA');
  };

  const isBroker = (): boolean => {
    return hasPermission('BROKER');
  };

  const isSeller = (): boolean => {
    return hasPermission('VENDEDOR_INTERNO');
  };

  const canAccessRoute = (route: string): boolean => {
    if (!user) return false;

    if (route.startsWith('/dashboard') || route.startsWith('/catalog') || route.startsWith('/inventory') || route.startsWith('/brokers') || route.startsWith('/sales') || route.startsWith('/team')) {
      return hasPermission(['ADMIN_INDUSTRIA', 'VENDEDOR_INTERNO']);
    }

    if (route.startsWith('/shared-inventory')) {
      return hasPermission('BROKER');
    }

    if (route.startsWith('/links') || route.startsWith('/leads')) {
      return hasPermission(['ADMIN_INDUSTRIA', 'VENDEDOR_INTERNO', 'BROKER']);
    }

    return true;
  };

  const getDashboardRoute = (): string => {
    if (!user) return '/login';

    switch (user.role) {
      case 'ADMIN_INDUSTRIA':
      case 'VENDEDOR_INTERNO':
        return '/dashboard';
      case 'BROKER':
        return '/dashboard';
      default:
        return '/login';
    }
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    refreshSession,
    hasPermission: checkPermission,
    isAdmin,
    isBroker,
    isSeller,
    canAccessRoute,
    getDashboardRoute,
  };
}
```

---

## `.\lib\hooks\useToast.ts`:

```
import { toast as sonnerToast } from 'sonner';
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

interface ToastOptions {
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function useToast() {
  const success = (message: string, options?: ToastOptions) => {
    sonnerToast.success(message, {
      description: options?.description,
      duration: options?.duration || 3000,
      icon: CheckCircle,
      action: options?.action,
    });
  };

  const error = (message: string, options?: ToastOptions) => {
    sonnerToast.error(message, {
      description: options?.description,
      duration: options?.duration || 5000,
      icon: XCircle,
      action: options?.action,
    });
  };

  const warning = (message: string, options?: ToastOptions) => {
    sonnerToast.warning(message, {
      description: options?.description,
      duration: options?.duration || 4000,
      icon: AlertTriangle,
      action: options?.action,
    });
  };

  const info = (message: string, options?: ToastOptions) => {
    sonnerToast.info(message, {
      description: options?.description,
      duration: options?.duration || 3000,
      icon: Info,
      action: options?.action,
    });
  };

  const promise = <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string;
      error: string;
    }
  ) => {
    return sonnerToast.promise(promise, {
      loading: messages.loading,
      success: messages.success,
      error: messages.error,
    });
  };

  return {
    success,
    error,
    warning,
    info,
    promise,
    toast: sonnerToast,
  };
}

export const errorMessages: Record<string, string> = {
  BATCH_NOT_AVAILABLE: 'Este lote não está mais disponível',
  UNAUTHORIZED: 'Você não tem permissão para esta ação',
  VALIDATION_ERROR: 'Erro de validação nos dados enviados',
  NETWORK_ERROR: 'Erro de conexão. Verifique sua internet.',
  SESSION_EXPIRED: 'Sua sessão expirou. Faça login novamente.',
  GENERIC_ERROR: 'Algo deu errado. Tente novamente.',
  FILE_TOO_LARGE: 'Arquivo excede o limite de 5MB',
  INVALID_FORMAT: 'Formato não suportado. Use JPG, PNG ou WebP',
  PERMISSION_DENIED: 'Você não tem permissão para esta ação',
};

export function getErrorMessage(code: string): string {
  return errorMessages[code] || errorMessages.GENERIC_ERROR;
}
```

---

## `.\lib\schemas\auth.schema.ts`:

```
import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email é obrigatório')
    .email('Email inválido'),
  password: z
    .string()
    .min(1, 'Senha é obrigatória')
    .min(8, 'Senha deve ter no mínimo 8 caracteres'),
});

export const registerSchema = z.object({
  name: z
    .string()
    .min(1, 'Nome é obrigatório')
    .min(2, 'Nome deve ter no mínimo 2 caracteres'),
  email: z
    .string()
    .min(1, 'Email é obrigatório')
    .email('Email inválido'),
  password: z
    .string()
    .min(1, 'Senha é obrigatória')
    .min(8, 'Senha deve ter no mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
    .regex(/[0-9]/, 'Senha deve conter pelo menos um número'),
  confirmPassword: z.string().min(1, 'Confirmação de senha é obrigatória'),
  phone: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^\d{10,11}$/.test(val.replace(/\D/g, '')),
      'Telefone inválido'
    ),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
});

export const inviteBrokerSchema = z.object({
  name: z
    .string()
    .min(1, 'Nome é obrigatório')
    .min(2, 'Nome deve ter no mínimo 2 caracteres'),
  email: z
    .string()
    .min(1, 'Email é obrigatório')
    .email('Email inválido'),
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
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
  newPassword: z
    .string()
    .min(1, 'Nova senha é obrigatória')
    .min(8, 'Senha deve ter no mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
    .regex(/[0-9]/, 'Senha deve conter pelo menos um número'),
  confirmNewPassword: z.string().min(1, 'Confirmação de senha é obrigatória'),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmNewPassword'],
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type InviteBrokerInput = z.infer<typeof inviteBrokerSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
```

---

## `.\lib\schemas\batch.schema.ts`:

```
import { z } from 'zod';

export const batchStatuses = [
  'DISPONIVEL',
  'RESERVADO',
  'VENDIDO',
  'INATIVO',
] as const;

export const batchSchema = z.object({
  productId: z.string().min(1, 'Produto é obrigatório'),
  batchCode: z
    .string()
    .min(1, 'Código do lote é obrigatório')
    .max(50, 'Código deve ter no máximo 50 caracteres')
    .regex(/^[A-Z0-9-]+$/, 'Código deve conter apenas letras maiúsculas, números e hífens')
    .transform((val) => val.toUpperCase()),
  height: z
    .number({ invalid_type_error: 'Altura deve ser um número' })
    .positive('Altura deve ser maior que zero')
    .max(1000, 'Altura deve ser menor que 1000 cm'),
  width: z
    .number({ invalid_type_error: 'Largura deve ser um número' })
    .positive('Largura deve ser maior que zero')
    .max(1000, 'Largura deve ser menor que 1000 cm'),
  thickness: z
    .number({ invalid_type_error: 'Espessura deve ser um número' })
    .positive('Espessura deve ser maior que zero')
    .max(100, 'Espessura deve ser menor que 100 cm'),
  quantitySlabs: z
    .number({ invalid_type_error: 'Quantidade deve ser um número' })
    .int('Quantidade deve ser um número inteiro')
    .positive('Quantidade deve ser maior que zero')
    .default(1),
  industryPrice: z
    .number({ invalid_type_error: 'Preço deve ser um número' })
    .positive('Preço deve ser maior que zero'),
  originQuarry: z
    .string()
    .max(100, 'Nome da pedreira deve ter no máximo 100 caracteres')
    .optional(),
  entryDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Data inválida')
    .default(() => new Date().toISOString().split('T')[0]),
});

export const batchFilterSchema = z.object({
  productId: z.string().optional(),
  status: z.enum([...batchStatuses, '']).optional(),
  code: z.string().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(50),
});

export const reservationSchema = z.object({
  batchId: z.string().min(1, 'Lote é obrigatório'),
  leadId: z.string().optional(),
  customerName: z
    .string()
    .min(1, 'Nome do cliente é obrigatório')
    .min(2, 'Nome deve ter no mínimo 2 caracteres')
    .optional(),
  customerContact: z
    .string()
    .min(1, 'Contato do cliente é obrigatório')
    .optional(),
  expiresAt: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Data inválida')
    .refine(
      (val) => new Date(val) > new Date(),
      'Data de expiração deve ser futura'
    )
    .default(() => {
      const date = new Date();
      date.setDate(date.getDate() + 7);
      return date.toISOString().split('T')[0];
    }),
  notes: z
    .string()
    .max(500, 'Observações devem ter no máximo 500 caracteres')
    .optional(),
});

export const updateBatchPriceSchema = z.object({
  negotiatedPrice: z
    .number({ invalid_type_error: 'Preço deve ser um número' })
    .positive('Preço deve ser maior que zero')
    .optional(),
});

export type BatchInput = z.infer<typeof batchSchema>;
export type BatchFilter = z.infer<typeof batchFilterSchema>;
export type ReservationInput = z.infer<typeof reservationSchema>;
export type UpdateBatchPriceInput = z.infer<typeof updateBatchPriceSchema>;
```

---

## `.\lib\schemas\lead.schema.ts`:

```
import { z } from 'zod';

export const leadStatuses = ['NOVO', 'CONTATADO', 'RESOLVIDO'] as const;

export const leadFilterSchema = z.object({
  search: z.string().optional(),
  linkId: z.string().optional(),
  startDate: z
    .string()
    .refine((val) => !val || !isNaN(Date.parse(val)), 'Data inválida')
    .optional(),
  endDate: z
    .string()
    .refine((val) => !val || !isNaN(Date.parse(val)), 'Data inválida')
    .optional(),
  optIn: z.boolean().optional(),
  status: z.enum([...leadStatuses, '']).optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(50),
});

export const updateLeadStatusSchema = z.object({
  status: z.enum(leadStatuses, {
    required_error: 'Status é obrigatório',
  }),
});

export type LeadFilter = z.infer<typeof leadFilterSchema>;
export type UpdateLeadStatusInput = z.infer<typeof updateLeadStatusSchema>;
```

---

## `.\lib\schemas\link.schema.ts`:

```
import { z } from 'zod';

export const linkTypes = ['LOTE_UNICO', 'PRODUTO_GERAL', 'CATALOGO_COMPLETO'] as const;

export const salesLinkSchema = z
  .object({
    linkType: z.enum(linkTypes, {
      required_error: 'Tipo de link é obrigatório',
    }),
    batchId: z.string().optional(),
    productId: z.string().optional(),
    title: z
      .string()
      .max(100, 'Título deve ter no máximo 100 caracteres')
      .optional(),
    customMessage: z
      .string()
      .max(500, 'Mensagem deve ter no máximo 500 caracteres')
      .optional(),
    slugToken: z
      .string()
      .min(3, 'Slug deve ter no mínimo 3 caracteres')
      .max(50, 'Slug deve ter no máximo 50 caracteres')
      .regex(
        /^[a-z0-9-]+$/,
        'Slug deve conter apenas letras minúsculas, números e hífens'
      ),
    displayPrice: z
      .number({ invalid_type_error: 'Preço deve ser um número' })
      .positive('Preço deve ser maior que zero')
      .optional(),
    showPrice: z.boolean().default(true),
    expiresAt: z
      .string()
      .refine((val) => !val || !isNaN(Date.parse(val)), 'Data inválida')
      .refine(
        (val) => !val || new Date(val) > new Date(),
        'Data de expiração deve ser futura'
      )
      .optional(),
    isActive: z.boolean().default(true),
  })
  .refine(
    (data) => {
      if (data.linkType === 'LOTE_UNICO') {
        return !!data.batchId;
      }
      return true;
    },
    {
      message: 'Lote é obrigatório para links de lote único',
      path: ['batchId'],
    }
  )
  .refine(
    (data) => {
      if (data.linkType === 'PRODUTO_GERAL') {
        return !!data.productId;
      }
      return true;
    },
    {
      message: 'Produto é obrigatório para links de produto',
      path: ['productId'],
    }
  );

export const leadCaptureSchema = z.object({
  name: z
    .string()
    .min(1, 'Nome é obrigatório')
    .min(2, 'Nome deve ter no mínimo 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  contact: z
    .string()
    .min(1, 'Contato é obrigatório')
    .refine(
      (val) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const phoneRegex = /^\d{10,11}$/;
        const cleaned = val.replace(/\D/g, '');
        return emailRegex.test(val) || phoneRegex.test(cleaned);
      },
      'Informe um email ou telefone válido'
    ),
  message: z
    .string()
    .max(500, 'Mensagem deve ter no máximo 500 caracteres')
    .optional(),
  marketingOptIn: z.boolean().default(false),
});

export const linkFilterSchema = z.object({
  type: z.enum([...linkTypes, '']).optional(),
  status: z.enum(['ATIVO', 'EXPIRADO', '']).optional(),
  search: z.string().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(25),
});

export const validateSlugSchema = z.object({
  slug: z
    .string()
    .min(3, 'Slug deve ter no mínimo 3 caracteres')
    .max(50, 'Slug deve ter no máximo 50 caracteres')
    .regex(
      /^[a-z0-9-]+$/,
      'Slug deve conter apenas letras minúsculas, números e hífens'
    ),
});

export type SalesLinkInput = z.infer<typeof salesLinkSchema>;
export type LeadCaptureInput = z.infer<typeof leadCaptureSchema>;
export type LinkFilter = z.infer<typeof linkFilterSchema>;
export type ValidateSlugInput = z.infer<typeof validateSlugSchema>;
```

---

## `.\lib\schemas\product.schema.ts`:

```
import { z } from 'zod';

export const materialTypes = [
  'GRANITO',
  'MARMORE',
  'QUARTZITO',
  'LIMESTONE',
  'TRAVERTINO',
  'OUTROS',
] as const;

export const finishTypes = [
  'POLIDO',
  'LEVIGADO',
  'BRUTO',
  'APICOADO',
  'FLAMEADO',
] as const;

export const productSchema = z.object({
  name: z
    .string()
    .min(1, 'Nome do produto é obrigatório')
    .min(2, 'Nome deve ter no mínimo 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  sku: z
    .string()
    .max(50, 'SKU deve ter no máximo 50 caracteres')
    .optional(),
  material: z.enum(materialTypes, {
    required_error: 'Tipo de material é obrigatório',
  }),
  finish: z.enum(finishTypes, {
    required_error: 'Acabamento é obrigatório',
  }),
  description: z
    .string()
    .max(1000, 'Descrição deve ter no máximo 1000 caracteres')
    .optional(),
  isPublic: z.boolean().default(true),
});

export const productFilterSchema = z.object({
  search: z.string().optional(),
  material: z.enum([...materialTypes, '']).optional(),
  includeInactive: z.boolean().default(false),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(24),
});

export type ProductInput = z.infer<typeof productSchema>;
export type ProductFilter = z.infer<typeof productFilterSchema>;
```

---

## `.\lib\types\api.ts`:

```
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  success: false;
}

export type ApiResult<T> = ApiResponse<T> | ErrorResponse;

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface FilterParams {
  search?: string;
  status?: string;
  productId?: string;
  batchId?: string;
  linkId?: string;
  startDate?: string;
  endDate?: string;
  material?: string;
  includeInactive?: boolean;
  optIn?: boolean;
}

export type QueryParams = PaginationParams & FilterParams;
```

---

## `.\lib\types\index.ts`:

```
export type UserRole = 'ADMIN_INDUSTRIA' | 'BROKER' | 'VENDEDOR_INTERNO';

export type BatchStatus = 'DISPONIVEL' | 'RESERVADO' | 'VENDIDO' | 'INATIVO';

export type MaterialType = 
  | 'GRANITO' 
  | 'MARMORE' 
  | 'QUARTZITO' 
  | 'LIMESTONE' 
  | 'TRAVERTINO' 
  | 'OUTROS';

export type FinishType = 
  | 'POLIDO' 
  | 'LEVIGADO' 
  | 'BRUTO' 
  | 'APICOADO' 
  | 'FLAMEADO';

export type LinkType = 'LOTE_UNICO' | 'PRODUTO_GERAL' | 'CATALOGO_COMPLETO';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  industryId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Industry {
  id: string;
  name: string;
  cnpj?: string;
  email?: string;
  phone?: string;
  address?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Media {
  id: string;
  url: string;
  displayOrder: number;
  isCover: boolean;
  createdAt: string;
}

export interface Product {
  id: string;
  industryId: string;
  name: string;
  sku?: string;
  material: MaterialType;
  finish: FinishType;
  description?: string;
  isPublic: boolean;
  isActive: boolean;
  medias: Media[];
  batchCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Batch {
  id: string;
  productId: string;
  industryId: string;
  batchCode: string;
  height: number;
  width: number;
  thickness: number;
  quantitySlabs: number;
  totalArea: number;
  industryPrice: number;
  originQuarry?: string;
  entryDate: string;
  status: BatchStatus;
  isActive: boolean;
  medias: Media[];
  product?: Product;
  createdAt: string;
  updatedAt: string;
}

export interface SharedInventoryBatch {
  id: string;
  batchId: string;
  brokerUserId: string;
  negotiatedPrice?: number;
  sharedAt: string;
  batch: Batch;
  broker: User;
}

export interface SalesLink {
  id: string;
  createdByUserId: string;
  linkType: LinkType;
  batchId?: string;
  productId?: string;
  title?: string;
  customMessage?: string;
  slugToken: string;
  displayPrice?: number;
  showPrice: boolean;
  viewsCount: number;
  expiresAt?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  fullUrl?: string;
  batch?: Batch;
  product?: Product;
  createdBy?: User;
}

export interface Lead {
  id: string;
  salesLinkId: string;
  name: string;
  contact: string;
  message?: string;
  marketingOptIn: boolean;
  status: 'NOVO' | 'CONTATADO' | 'RESOLVIDO';
  createdAt: string;
  updatedAt: string;
  salesLink?: SalesLink;
}

export interface Reservation {
  id: string;
  batchId: string;
  leadId?: string;
  reservedByUserId: string;
  expiresAt: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  batch?: Batch;
  lead?: Lead;
  reservedBy?: User;
}

export interface Sale {
  id: string;
  batchId: string;
  soldByUserId: string;
  leadId?: string;
  customerName: string;
  customerContact: string;
  salePrice: number;
  brokerCommission?: number;
  netIndustryValue: number;
  saleDate: string;
  invoiceUrl?: string;
  notes?: string;
  createdAt: string;
  batch?: Batch;
  soldBy?: User;
  lead?: Lead;
}

export interface DashboardMetrics {
  availableBatches: number;
  monthlySales: number;
  reservedBatches: number;
  activeLinks?: number;
  leadsCount?: number;
  monthlyCommission?: number;
}

export interface Activity {
  id: string;
  batchCode: string;
  productName: string;
  sellerName: string;
  action: 'RESERVADO' | 'VENDIDO' | 'COMPARTILHADO' | 'CRIADO';
  date: string;
}
```

---

## `.\lib\utils\calculateArea.ts`:

```
'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Package, 
  Layers, 
  Users, 
  Receipt, 
  Link2, 
  Inbox, 
  UserPlus,
  PackageOpen,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useAuthStore } from '@/store/auth.store';
import { useUIStore } from '@/store/ui.store';
import type { UserRole } from '@/lib/types';

interface MenuItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
  children?: MenuItem[];
}

const menuItems: MenuItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['ADMIN_INDUSTRIA', 'VENDEDOR_INTERNO', 'BROKER'],
  },
  {
    label: 'Catálogo',
    href: '/catalog',
    icon: Package,
    roles: ['ADMIN_INDUSTRIA'],
  },
  {
    label: 'Estoque',
    href: '/inventory',
    icon: Layers,
    roles: ['ADMIN_INDUSTRIA', 'VENDEDOR_INTERNO'],
  },
  {
    label: 'Estoque Compartilhado',
    href: '/shared-inventory',
    icon: PackageOpen,
    roles: ['BROKER'],
  },
  {
    label: 'Vendas',
    href: '/sales',
    icon: Receipt,
    roles: ['ADMIN_INDUSTRIA', 'VENDEDOR_INTERNO'],
  },
  {
    label: 'Links',
    href: '/links',
    icon: Link2,
    roles: ['ADMIN_INDUSTRIA', 'VENDEDOR_INTERNO', 'BROKER'],
  },
  {
    label: 'Leads',
    href: '/leads',
    icon: Inbox,
    roles: ['ADMIN_INDUSTRIA', 'VENDEDOR_INTERNO', 'BROKER'],
  },
  {
    label: 'Parceiros',
    href: '/brokers',
    icon: Users,
    roles: ['ADMIN_INDUSTRIA'],
  },
  {
    label: 'Equipe',
    href: '/team',
    icon: UserPlus,
    roles: ['ADMIN_INDUSTRIA'],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const { sidebarOpen, toggleSidebar } = useUIStore();

  const filteredMenuItems = useMemo(() => {
    if (!user) return [];
    return menuItems.filter((item) => item.roles.includes(user.role));
  }, [user]);

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  if (!user) return null;

  return (
    <>
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-screen bg-obsidian text-porcelain transition-all duration-300',
          'flex flex-col',
          sidebarOpen ? 'w-64' : 'w-0 lg:w-20',
          'lg:relative lg:z-auto'
        )}
      >
        {/* Logo & Toggle */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div
            className={cn(
              'flex items-center gap-3 transition-opacity duration-200',
              !sidebarOpen && 'lg:opacity-0'
            )}
          >
            <div className="w-8 h-8 bg-porcelain rounded-sm" />
            {sidebarOpen && (
              <span className="font-serif text-xl font-semibold">CAVA</span>
            )}
          </div>
          
          <button
            onClick={toggleSidebar}
            className={cn(
              'p-2 rounded-sm hover:bg-white/10 transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-white/20',
              !sidebarOpen && 'lg:mx-auto'
            )}
          >
            {sidebarOpen ? (
              <ChevronLeft className="w-5 h-5" />
            ) : (
              <ChevronRight className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-6">
          <ul className="space-y-1 px-3">
            {filteredMenuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-3 rounded-sm transition-all duration-200',
                      'text-sm font-medium',
                      'focus:outline-none focus:ring-2 focus:ring-white/20',
                      active
                        ? 'bg-porcelain text-obsidian'
                        : 'text-porcelain/80 hover:bg-white/10 hover:text-porcelain',
                      !sidebarOpen && 'lg:justify-center'
                    )}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    {sidebarOpen && (
                      <span className="truncate">{item.label}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Info */}
        {sidebarOpen && (
          <div className="p-6 border-t border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-porcelain/20 flex items-center justify-center">
                <span className="text-sm font-semibold">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-xs text-porcelain/60 truncate">
                  {user.role === 'ADMIN_INDUSTRIA' && 'Administrador'}
                  {user.role === 'VENDEDOR_INTERNO' && 'Vendedor'}
                  {user.role === 'BROKER' && 'Broker'}
                </p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
```

---

## `.\lib\utils\cn.ts`:

```
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

## `.\lib\utils\formatCurrency.ts`:

```
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function parseCurrency(value: string): number {
  const cleaned = value.replace(/[^\d,]/g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

export function formatCurrencyInput(value: string): string {
  const number = parseCurrency(value);
  return formatCurrency(number);
}
```

---

## `.\lib\utils\formatDate.ts`:

```
import { format, formatDistance, formatRelative, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function formatDate(date: string | Date, formatStr: string = 'dd/MM/yyyy'): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return '-';
    return format(dateObj, formatStr, { locale: ptBR });
  } catch {
    return '-';
  }
}

export function formatDateTime(date: string | Date): string {
  return formatDate(date, "dd/MM/yyyy 'às' HH:mm");
}

export function formatDateLong(date: string | Date): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return '-';
    return format(dateObj, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  } catch {
    return '-';
  }
}

export function formatDateShort(date: string | Date): string {
  return formatDate(date, 'dd/MM/yy');
}

export function formatDateISO(date: string | Date): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return '';
    return format(dateObj, 'yyyy-MM-dd');
  } catch {
    return '';
  }
}

export function formatDateTimeISO(date: string | Date): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return '';
    return dateObj.toISOString();
  } catch {
    return '';
  }
}

export function formatRelativeDate(date: string | Date): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return '-';
    return formatRelative(dateObj, new Date(), { locale: ptBR });
  } catch {
    return '-';
  }
}

export function formatDistanceToNow(date: string | Date): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return '-';
    return formatDistance(dateObj, new Date(), { 
      addSuffix: true, 
      locale: ptBR 
    });
  } catch {
    return '-';
  }
}

export function formatDateForInput(date: string | Date): string {
  return formatDate(date, 'yyyy-MM-dd');
}

export function addDays(date: string | Date, days: number): Date {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const result = new Date(dateObj);
  result.setDate(result.getDate() + days);
  return result;
}

export function isExpired(date: string | Date): boolean {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return false;
    return dateObj < new Date();
  } catch {
    return false;
  }
}

export function getDaysUntil(date: string | Date): number {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(dateObj)) return 0;
    
    const now = new Date();
    const diff = dateObj.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
}

export function getDefaultExpirationDate(daysFromNow: number = 7): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return formatDateForInput(date);
}
```

---

## `.\lib\utils\formatDimensions.ts`:

```
export function formatDimensions(
  height: number,
  width: number,
  thickness: number
): string {
  return `${height} × ${width} × ${thickness} cm`;
}

export function formatArea(area: number): string {
  return `${area.toFixed(2)} m²`;
}

export function calculateTotalArea(
  height: number,
  width: number,
  quantitySlabs: number = 1
): number {
  const heightInMeters = height / 100;
  const widthInMeters = width / 100;
  const areaPerSlab = heightInMeters * widthInMeters;
  return areaPerSlab * quantitySlabs;
}
```

---

## `.\lib\utils\validators.ts`:

```
export function validateCPF(cpf: string): boolean {
  const cleaned = cpf.replace(/\D/g, '');
  
  if (cleaned.length !== 11 || /^(\d)\1+$/.test(cleaned)) {
    return false;
  }

  let sum = 0;
  let remainder;

  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cleaned.substring(i - 1, i)) * (11 - i);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned.substring(9, 10))) return false;

  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cleaned.substring(i - 1, i)) * (12 - i);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned.substring(10, 11))) return false;

  return true;
}

export function validateCNPJ(cnpj: string): boolean {
  const cleaned = cnpj.replace(/\D/g, '');

  if (cleaned.length !== 14 || /^(\d)\1+$/.test(cleaned)) {
    return false;
  }

  let length = cleaned.length - 2;
  let numbers = cleaned.substring(0, length);
  const digits = cleaned.substring(length);
  let sum = 0;
  let pos = length - 7;

  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;

  length = length + 1;
  numbers = cleaned.substring(0, length);
  sum = 0;
  pos = length - 7;

  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1))) return false;

  return true;
}

export function validatePhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 11;
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function formatCPF(cpf: string): string {
  const cleaned = cpf.replace(/\D/g, '');
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

export function formatCNPJ(cnpj: string): string {
  const cleaned = cnpj.replace(/\D/g, '');
  return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
}
```

---

## `.\middleware.ts`:

```
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const publicRoutes = ['/login', '/register'];
const publicPrefixes = ['/api/public', '/_next', '/static', '/favicon.ico'];

const roleRouteMap: Record<string, string[]> = {
  ADMIN_INDUSTRIA: [
    '/dashboard',
    '/catalog',
    '/inventory',
    '/brokers',
    '/sales',
    '/team',
    '/links',
    '/leads',
  ],
  VENDEDOR_INTERNO: [
    '/dashboard',
    '/inventory',
    '/sales',
    '/links',
    '/leads',
  ],
  BROKER: [
    '/dashboard',
    '/shared-inventory',
    '/links',
    '/leads',
  ],
};

const roleDashboards: Record<string, string> = {
  ADMIN_INDUSTRIA: '/dashboard',
  VENDEDOR_INTERNO: '/dashboard',
  BROKER: '/dashboard',
};

function isPublicRoute(pathname: string): boolean {
  if (publicRoutes.includes(pathname)) return true;
  return publicPrefixes.some(prefix => pathname.startsWith(prefix));
}

function canAccessRoute(pathname: string, userRole: string): boolean {
  const allowedRoutes = roleRouteMap[userRole];
  if (!allowedRoutes) return false;

  return allowedRoutes.some(route => pathname.startsWith(route));
}

function getDashboardForRole(role: string): string {
  return roleDashboards[role] || '/login';
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get('access_token')?.value;
  const userRole = request.cookies.get('user_role')?.value;

  if (!accessToken) {
    try {
      const refreshToken = request.cookies.get('refresh_token')?.value;
      
      if (!refreshToken) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(loginUrl);
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const refreshResponse = await fetch(`${apiUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': `refresh_token=${refreshToken}`,
        },
        credentials: 'include',
      });

      if (!refreshResponse.ok) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(loginUrl);
      }

      const response = NextResponse.next();
      
      const setCookieHeader = refreshResponse.headers.get('set-cookie');
      if (setCookieHeader) {
        response.headers.set('set-cookie', setCookieHeader);
      }

      return response;
    } catch (error) {
      console.error('Token refresh error:', error);
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (!userRole) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === '/login' && accessToken) {
    const dashboardUrl = getDashboardForRole(userRole);
    return NextResponse.redirect(new URL(dashboardUrl, request.url));
  }

  if (!canAccessRoute(pathname, userRole)) {
    const dashboardUrl = getDashboardForRole(userRole);
    return NextResponse.redirect(new URL(dashboardUrl, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

---

## `.\next-env.d.ts`:

```
/// <reference types="next" />
/// <reference types="next/image-types/global" />
import "./.next/dev/types/routes.d.ts";

// NOTE: This file should not be edited
// see https://nextjs.org/docs/app/api-reference/config/typescript for more information.
```

---

## `.\next.config.ts`:

```
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
```

---

## `.\package.json`:

```
{
  "name": "frontend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
  },
  "dependencies": {
    "@dnd-kit/core": "^6.3.1",
    "@dnd-kit/sortable": "^10.0.0",
    "@dnd-kit/utilities": "^3.2.2",
    "@hookform/resolvers": "^5.2.2",
    "@react-input/mask": "^2.0.4",
    "@tanstack/react-query": "^5.90.16",
    "clsx": "^2.1.1",
    "cmdk": "^1.1.1",
    "date-fns": "^4.1.0",
    "lucide-react": "^0.562.0",
    "nanoid": "^5.1.6",
    "next": "16.1.1",
    "qrcode.react": "^4.2.0",
    "react": "19.2.3",
    "react-day-picker": "^9.13.0",
    "react-dom": "19.2.3",
    "react-hook-form": "^7.70.0",
    "react-input-mask": "^2.0.4",
    "sonner": "^2.0.7",
    "tailwind-merge": "^3.4.0",
    "vaul": "^1.1.2",
    "zod": "^4.3.5",
    "zustand": "^5.0.9"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20.19.27",
    "@types/react": "^19.2.7",
    "@types/react-dom": "^19.2.3",
    "@types/react-input-mask": "^3.0.6",
    "eslint": "^9",
    "eslint-config-next": "16.1.1",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```

---

## `.\postcss.config.mjs`:

```
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
```

---

## `.\store\auth.store.ts`:

```
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User, UserRole } from '@/lib/types';
import { apiClient } from '@/lib/api/client';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  setUser: (user: User | null) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  hasPermission: (requiredRole: UserRole | UserRole[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,

      setUser: (user) => {
        set({
          user,
          isAuthenticated: !!user,
          isLoading: false,
        });
      },

      login: async (email: string, password: string) => {
        try {
          set({ isLoading: true });

          const response = await apiClient.post<{
            user: User;
            role: UserRole;
          }>('/auth/login', { email, password });

          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
          throw error;
        }
      },

      logout: async () => {
        try {
          await apiClient.post('/auth/logout');
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
          
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }
      },

      refreshSession: async () => {
        try {
          set({ isLoading: true });

          const response = await apiClient.post<{
            user: User;
          }>('/auth/refresh');

          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
          throw error;
        }
      },

      hasPermission: (requiredRole: UserRole | UserRole[]) => {
        const { user } = get();
        if (!user) return false;

        const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
        return roles.includes(user.role);
      },
    }),
    {
      name: 'cava-auth-storage',
      storage: createJSONStorage(() => {
        if (typeof window === 'undefined') {
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          };
        }
        return window.localStorage;
      }),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
```

---

## `.\store\ui.store.ts`:

```
import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  toggleMobileMenu: () => void;
  
  activeModal: string | null;
  openModal: (modalId: string) => void;
  closeModal: () => void;
  
  isPageLoading: boolean;
  setPageLoading: (loading: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  
  mobileMenuOpen: false,
  setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
  toggleMobileMenu: () => set((state) => ({ mobileMenuOpen: !state.mobileMenuOpen })),
  
  activeModal: null,
  openModal: (modalId) => set({ activeModal: modalId }),
  closeModal: () => set({ activeModal: null }),
  
  isPageLoading: false,
  setPageLoading: (loading) => set({ isPageLoading: loading }),
}));
```

---

## `.\tsconfig.json`:

```
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts",
    "**/*.mts"
  ],
  "exclude": ["node_modules"]
}
```

---


# 📌 Resumo

## Arquivos com conteúdo:
- .\app\(auth)\login\page.tsx
- .\app\(broker)\dashboard\page.tsx
- .\app\(broker)\leads\page.tsx
- .\app\(broker)\links\new\page.tsx
- .\app\(broker)\links\page.tsx
- .\app\(broker)\shared-inventory\page.tsx
- .\app\(industry)\brokers\[id]\shared\page.tsx
- .\app\(industry)\brokers\page.tsx
- .\app\(industry)\catalog\[id]\page.tsx
- .\app\(industry)\catalog\new\page.tsx
- .\app\(industry)\catalog\page.tsx
- .\app\(industry)\dashboard\page.tsx
- .\app\(industry)\inventory\[id]\page.tsx
- .\app\(industry)\inventory\new\page.tsx
- .\app\(industry)\inventory\page.tsx
- .\app\(industry)\leads\page.tsx
- .\app\(industry)\links\new\page.tsx
- .\app\(industry)\links\page.tsx
- .\app\(industry)\sales\page.tsx
- .\app\(industry)\team\page.tsx
- .\app\(public)\[slug]\page.tsx
- .\app\(seller)\dashboard\page.tsx
- .\app\(seller)\inventory\page.tsx
- .\app\(seller)\leads\page.tsx
- .\app\(seller)\links\new\page.tsx
- .\app\(seller)\links\page.tsx
- .\app\globals.css
- .\app\page.tsx
- .\components\shared\EmptyState.tsx
- .\components\shared\ErrorBoundary.tsx
- .\components\shared\Header.tsx
- .\components\shared\LoadingState.tsx
- .\components\shared\Pagination.tsx
- .\components\shared\Sidebar.tsx
- .\components\ui\badge.tsx
- .\components\ui\button.tsx
- .\components\ui\card.tsx
- .\components\ui\dropdown.tsx
- .\components\ui\input.tsx
- .\components\ui\label.tsx
- .\components\ui\modal.tsx
- .\components\ui\select.tsx
- .\components\ui\separator.tsx
- .\components\ui\skeleton.tsx
- .\components\ui\table.tsx
- .\components\ui\textarea.tsx
- .\components\ui\toast.tsx
- .\components\ui\toggle.tsx
- .\eslint.config.mjs
- .\lib\api\client.ts
- .\lib\hooks\useAuth.ts
- .\lib\hooks\useToast.ts
- .\lib\schemas\auth.schema.ts
- .\lib\schemas\batch.schema.ts
- .\lib\schemas\lead.schema.ts
- .\lib\schemas\link.schema.ts
- .\lib\schemas\product.schema.ts
- .\lib\types\api.ts
- .\lib\types\index.ts
- .\lib\utils\calculateArea.ts
- .\lib\utils\cn.ts
- .\lib\utils\formatCurrency.ts
- .\lib\utils\formatDate.ts
- .\lib\utils\formatDimensions.ts
- .\lib\utils\validators.ts
- .\middleware.ts
- .\next-env.d.ts
- .\next.config.ts
- .\package.json
- .\postcss.config.mjs
- .\store\auth.store.ts
- .\store\ui.store.ts
- .\tsconfig.json

## Arquivos vazios:
- .\lib\types\database.ts
