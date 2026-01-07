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