'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { format, subDays } from 'date-fns';
import { BarChart3, RefreshCw, DollarSign, TrendingUp, Package } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/shared/LoadingState';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { useToast } from '@/lib/hooks/useToast';

import {
  useBIDashboard,
  useRefreshBIViews,
} from '@/lib/api/queries/useBI';

import {
  KPICard,
  KPICardSkeleton,
  BrokerRanking,
  BrokerRankingSkeleton,
  InventoryMetrics,
  InventoryMetricsSkeleton,
  TopProductsTable,
  TopProductsTableSkeleton,
  SalesTrendChart,
  SalesTrendChartSkeleton,
  DateRangeFilter,
  type DateRange,
} from '@/components/bi';

export default function BIDashboardPage() {
  const { success, error } = useToast();

  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  });

  const { data: dashboard, isLoading, refetch } = useBIDashboard({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });

  const refreshMutation = useRefreshBIViews();

  const handleRefresh = async () => {
    try {
      await refreshMutation.mutateAsync();
      await refetch();
      success('Dados atualizados com sucesso');
    } catch (err) {
      error('Erro ao atualizar dados');
    }
  };

  return (
    <div className="min-h-screen bg-mineral">
      {/* Header */}
      <div className="bg-obsidian text-porcelain px-8 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <BarChart3 className="w-8 h-8" />
                <h1 className="font-serif text-4xl">Business Intelligence</h1>
              </div>
              <p className="text-porcelain/60 text-lg">
                Metricas e indicadores estrategicos do seu negocio
              </p>
            </div>
            <div className="flex items-center gap-4">
              <DateRangeFilter
                value={dateRange}
                onChange={setDateRange}
              />
              <Button
                variant="secondary"
                onClick={handleRefresh}
                disabled={refreshMutation.isPending}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {isLoading ? (
            <>
              <KPICardSkeleton />
              <KPICardSkeleton />
              <KPICardSkeleton />
              <KPICardSkeleton />
            </>
          ) : dashboard ? (
            <>
              <KPICard
                icon={DollarSign}
                title="Receita Total"
                value={formatCurrency(dashboard.sales.totalRevenue)}
                color="emerald"
              />
              <KPICard
                icon={TrendingUp}
                title="Ticket Medio"
                value={formatCurrency(dashboard.sales.averageTicket)}
                color="blue"
              />
              <KPICard
                icon={Package}
                title="Chapas Vendidas"
                value={dashboard.sales.totalSlabs}
                subtitle={`${(dashboard.sales.totalArea ?? 0).toFixed(2)} m2`}
                color="purple"
              />
              <KPICard
                icon={Package}
                title="Total de Vendas"
                value={dashboard.sales.salesCount}
                color="amber"
              />
            </>
          ) : null}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 gap-6 mb-8">
          {isLoading ? (
            <SalesTrendChartSkeleton />
          ) : dashboard ? (
            <SalesTrendChart
              data={dashboard.salesTrend}
              granularity="day"
            />
          ) : null}
        </div>

        {/* Second Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {isLoading ? (
            <>
              <div className="lg:col-span-2">
                <BrokerRankingSkeleton />
              </div>
              <InventoryMetricsSkeleton />
            </>
          ) : dashboard ? (
            <>
              <div className="lg:col-span-2">
                <BrokerRanking data={dashboard.topBrokers} />
              </div>
              <InventoryMetrics data={dashboard.inventory} />
            </>
          ) : null}
        </div>

        {/* Top Products */}
        <div className="mb-8">
          {isLoading ? (
            <TopProductsTableSkeleton />
          ) : dashboard ? (
            <TopProductsTable data={dashboard.topProducts} />
          ) : null}
        </div>

        {/* Summary Footer */}
        {dashboard && (
          <div className="bg-porcelain rounded-sm border border-slate-100 p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-center">
              <div>
                <p className="text-3xl font-serif text-obsidian">
                  {formatCurrency(dashboard.sales.totalRevenue)}
                </p>
                <p className="text-xs text-slate-500 uppercase tracking-wider mt-1">
                  Receita Total
                </p>
              </div>
              <div>
                <p className="text-3xl font-serif text-obsidian">
                  {dashboard.sales.salesCount}
                </p>
                <p className="text-xs text-slate-500 uppercase tracking-wider mt-1">
                  Total de Vendas
                </p>
              </div>
              <div>
                <p className="text-3xl font-serif text-obsidian">
                  {(dashboard.sales.totalArea ?? 0).toFixed(2)} m²
                </p>
                <p className="text-xs text-slate-500 uppercase tracking-wider mt-1">
                  Area Total Vendida
                </p>
              </div>
            </div>

            {dashboard.lastRefresh && (
              <p className="text-center text-xs text-slate-400 mt-4">
                Ultima atualizacao: {format(new Date(dashboard.lastRefresh), 'dd/MM/yyyy HH:mm')}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
