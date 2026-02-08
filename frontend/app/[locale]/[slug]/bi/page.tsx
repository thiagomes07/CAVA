'use client';

import { useState } from 'react';
import { format, subDays } from 'date-fns';
import { 
  BarChart3, 
  RefreshCw, 
  DollarSign, 
  TrendingUp, 
  Package, 
  Users,
  ShoppingCart,
  Layers,
  AlertTriangle,
  Clock,
  Trophy,
  Medal,
  Award,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { useToast } from '@/lib/hooks/useToast';
import { cn } from '@/lib/utils/cn';

import {
  useBIDashboard,
  useRefreshBIViews,
} from '@/lib/api/queries/useBI';

import { DateRangeFilter, type DateRange } from '@/components/bi';

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

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-4 h-4 text-slate-600" />;
      case 2:
        return <Medal className="w-4 h-4 text-slate-400" />;
      case 3:
        return <Award className="w-4 h-4 text-slate-500" />;
      default:
        return <span className="text-xs font-medium text-slate-400">{rank}º</span>;
    }
  };

  return (
    <div className="min-h-screen bg-mineral">
      {/* Header */}
      <div className="bg-obsidian text-porcelain px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-7 h-7" />
              <h1 className="font-serif text-2xl sm:text-3xl">Inteligência</h1>
            </div>
            <div className="flex items-center gap-3">
              <DateRangeFilter
                value={dateRange}
                onChange={setDateRange}
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshMutation.isPending}
              >
                <RefreshCw className={cn('w-4 h-4', refreshMutation.isPending && 'animate-spin')} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        
        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} variant="elevated" className="animate-pulse">
                <div className="h-20 bg-slate-100 rounded" />
              </Card>
            ))}
          </div>
        )}

        {dashboard && (
          <>
            {/* KPIs Principais - Vendas */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card variant="elevated" className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-sm bg-slate-100">
                    <DollarSign className="w-5 h-5 text-slate-600" />
                  </div>
                </div>
                <p className="font-serif text-2xl lg:text-3xl text-obsidian">
                  {formatCurrency(dashboard.sales.netRevenue)}
                </p>
                <p className="text-xs text-slate-500 uppercase tracking-wider mt-1">
                  Receita Líquida
                </p>
                {dashboard.sales.totalCommissions > 0 && (
                  <p className="text-xs text-slate-400 mt-2">
                    -{formatCurrency(dashboard.sales.totalCommissions)} comissões
                  </p>
                )}
              </Card>

              <Card variant="elevated" className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-sm bg-slate-100">
                    <ShoppingCart className="w-5 h-5 text-slate-600" />
                  </div>
                </div>
                <p className="font-serif text-2xl lg:text-3xl text-obsidian">
                  {dashboard.sales.salesCount}
                </p>
                <p className="text-xs text-slate-500 uppercase tracking-wider mt-1">
                  Vendas
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  Ticket médio: {formatCurrency(dashboard.sales.averageTicket)}
                </p>
              </Card>

              <Card variant="elevated" className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-sm bg-slate-100">
                    <Layers className="w-5 h-5 text-slate-600" />
                  </div>
                </div>
                <p className="font-serif text-2xl lg:text-3xl text-obsidian">
                  {dashboard.sales.totalSlabs}
                </p>
                <p className="text-xs text-slate-500 uppercase tracking-wider mt-1">
                  Chapas Vendidas
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  {(dashboard.sales.totalArea ?? 0).toFixed(1)} m² total
                </p>
              </Card>

              <Card variant="elevated" className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-sm bg-slate-100">
                    <Package className="w-5 h-5 text-slate-600" />
                  </div>
                </div>
                <p className="font-serif text-2xl lg:text-3xl text-obsidian">
                  {formatCurrency(dashboard.inventory.inventoryValue)}
                </p>
                <p className="text-xs text-slate-500 uppercase tracking-wider mt-1">
                  Valor em Estoque
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  {dashboard.inventory.availableSlabs} chapas disponíveis
                </p>
              </Card>
            </div>

            {/* Seção: Estoque + Top Brokers + Top Produtos */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Status do Inventário */}
              <Card variant="elevated" className="p-4">
                <h3 className="font-semibold text-obsidian mb-4">Estoque</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Lotes ativos</span>
                    <span className="font-medium">{dashboard.inventory.totalBatches}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Chapas totais</span>
                    <span className="font-medium">{dashboard.inventory.totalSlabs}</span>
                  </div>
                  
                  <div className="h-px bg-slate-100 my-2" />
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Disponíveis</span>
                    <span className="font-medium text-slate-600">{dashboard.inventory.availableSlabs}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-600">Reservadas</span>
                    <span className="font-medium text-slate-600">{dashboard.inventory.reservedSlabs}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-500">Vendidas</span>
                    <span className="font-medium text-slate-500">{dashboard.inventory.soldSlabs}</span>
                  </div>
                </div>

                {/* Alertas */}
                {(dashboard.inventory.lowStockCount > 0 || dashboard.inventory.staleBatchCount > 0) && (
                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                    {dashboard.inventory.lowStockCount > 0 && (
                      <div className="flex items-center gap-2 text-slate-600 bg-slate-100 px-2 py-1.5 rounded text-xs">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>{dashboard.inventory.lowStockCount} lote(s) com estoque baixo</span>
                      </div>
                    )}
                    {dashboard.inventory.staleBatchCount > 0 && (
                      <div className="flex items-center gap-2 text-red-600 bg-red-50 px-2 py-1.5 rounded text-xs">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{dashboard.inventory.staleBatchCount} lote(s) parado(s) há +90 dias</span>
                      </div>
                    )}
                  </div>
                )}
              </Card>

              {/* Top Brokers */}
              <Card variant="elevated" className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-5 h-5 text-slate-400" />
                  <h3 className="font-semibold text-obsidian">Top Vendedores</h3>
                </div>
                
                {dashboard.topBrokers && dashboard.topBrokers.length > 0 ? (
                  <div className="space-y-3">
                    {dashboard.topBrokers.slice(0, 5).map((broker) => (
                      <div
                        key={broker.brokerId || broker.brokerName}
                        className={cn(
                          "flex items-center gap-3 p-2 rounded",
                          broker.rank === 1 && "bg-slate-100",
                          broker.rank === 2 && "bg-slate-50",
                          broker.rank === 3 && "bg-slate-50/50",
                        )}
                      >
                        <div className="w-6 flex justify-center">
                          {getRankIcon(broker.rank)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-obsidian truncate">
                            {broker.brokerName}
                          </p>
                          <p className="text-xs text-slate-500">
                            {broker.salesCount} venda(s)
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm text-obsidian">
                            {formatCurrency(broker.totalRevenue)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400 text-sm">
                    Nenhuma venda no período
                  </div>
                )}
              </Card>

              {/* Top Produtos */}
              <Card variant="elevated" className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-slate-400" />
                  <h3 className="font-semibold text-obsidian">Top Produtos</h3>
                </div>
                
                {dashboard.topProducts && dashboard.topProducts.length > 0 ? (
                  <div className="space-y-3">
                    {dashboard.topProducts.slice(0, 5).map((product, index) => (
                      <div 
                        key={product.productId} 
                        className="flex items-center gap-3 p-2"
                      >
                        <div className="w-6 flex justify-center">
                          <span className="text-xs font-medium text-slate-400">{index + 1}º</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-obsidian truncate">
                            {product.productName}
                          </p>
                          <p className="text-xs text-slate-500">
                            {product.slabsSold} chapas · {(product.areaSold ?? 0).toFixed(1)} m²
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-sm text-obsidian">
                            {formatCurrency(product.revenue)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400 text-sm">
                    Nenhum produto vendido
                  </div>
                )}
              </Card>
            </div>

            {/* Footer com última atualização */}
            {dashboard.lastRefresh && (
              <p className="text-center text-xs text-slate-400">
                Última atualização: {format(new Date(dashboard.lastRefresh), 'dd/MM/yyyy HH:mm')}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
