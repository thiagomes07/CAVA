'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PackageOpen, Link2, Inbox, TrendingUp, Plus, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { LoadingState, LoadingSpinner } from '@/components/shared/LoadingState';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/lib/hooks/useToast';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { formatDate } from '@/lib/utils/formatDate';
import { formatArea } from '@/lib/utils/formatDimensions';
import { truncateText } from '@/lib/utils/truncateText';
import { TRUNCATION_LIMITS } from '@/lib/config/truncationLimits';
import type { SharedInventoryBatch, Sale } from '@/lib/types';
import { cn } from '@/lib/utils/cn';

interface BrokerMetrics {
  availableBatches: number;
  activeLinks: number;
  leadsCount: number;
  monthlyCommission: number;
}

export function BrokerDashboard() {
  const router = useRouter();
  const { error } = useToast();

  const [metrics, setMetrics] = useState<BrokerMetrics | null>(null);
  const [recentBatches, setRecentBatches] = useState<SharedInventoryBatch[]>([]);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(true);
  const [isLoadingBatches, setIsLoadingBatches] = useState(true);
  const [isLoadingSales, setIsLoadingSales] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    
    fetchMetrics();
    fetchRecentBatches();
    fetchRecentSales();
  }, [isMounted]);

  const fetchMetrics = async () => {
    try {
      setIsLoadingMetrics(true);
      const data = await apiClient.get<BrokerMetrics>('/broker/dashboard/metrics');
      setMetrics(data);
    } catch (err) {
      console.error('Erro ao carregar métricas:', err);
      // Usar valores default em vez de mostrar erro
      setMetrics({
        availableBatches: 0,
        activeLinks: 0,
        leadsCount: 0,
        monthlyCommission: 0,
      });
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
      setRecentBatches(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Erro ao carregar lotes:', err);
      setRecentBatches([]);
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
      setRecentSales(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Erro ao carregar vendas:', err);
      setRecentSales([]);
    } finally {
      setIsLoadingSales(false);
    }
  };

  // Wait for client-side hydration
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-mineral flex items-center justify-center">
        <LoadingSpinner className="w-12 h-12" />
      </div>
    );
  }

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
                    <p 
                      className="font-mono text-sm font-semibold text-obsidian"
                      title={shared.batch.batchCode}
                    >
                      {truncateText(shared.batch.batchCode, TRUNCATION_LIMITS.BATCH_CODE)}
                    </p>
                    <p 
                      className="text-sm text-slate-600"
                      title={shared.batch.product?.name}
                    >
                      {truncateText(shared.batch.product?.name, TRUNCATION_LIMITS.PRODUCT_NAME_SHORT)}
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
                        <span 
                          className="font-mono text-sm text-obsidian"
                          title={sale.batch?.batchCode}
                        >
                          {truncateText(sale.batch?.batchCode, TRUNCATION_LIMITS.BATCH_CODE) || '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span 
                          className="text-slate-600"
                          title={sale.customerName}
                        >
                          {truncateText(sale.customerName, TRUNCATION_LIMITS.CUSTOMER_NAME)}
                        </span>
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
