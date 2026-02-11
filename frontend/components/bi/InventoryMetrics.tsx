'use client';

import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { Package, AlertTriangle, Clock, RotateCcw } from 'lucide-react';
import type { InventoryMetrics as InventoryMetricsType } from '@/lib/types';

interface InventoryMetricsProps {
  data: InventoryMetricsType;
  title?: string;
  className?: string;
}

export function InventoryMetrics({ data, title = 'Metricas de Inventario', className }: InventoryMetricsProps) {
  if (!data) {
    return (
      <Card variant="elevated" className={className}>
        <h3 className="text-lg font-semibold text-obsidian mb-4">{title}</h3>
        <div className="text-center py-8 text-slate-400">
          Sem dados de inventario
        </div>
      </Card>
    );
  }

  const currency = data.currency || 'BRL';
  const hasAlerts = data.lowStockCount > 0 || data.staleBatchCount > 0;

  return (
    <Card variant="elevated" className={className}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-obsidian">{title}</h3>
        <div className="p-2 rounded-sm bg-blue-50">
          <Package className="w-5 h-5 text-blue-600" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <p className="text-3xl font-serif text-obsidian">{data.totalBatches}</p>
          <p className="text-xs text-slate-500 uppercase tracking-wider">Lotes ativos</p>
        </div>
        <div>
          <p className="text-3xl font-serif text-obsidian">{data.totalSlabs.toLocaleString('pt-BR')}</p>
          <p className="text-xs text-slate-500 uppercase tracking-wider">Total chapas</p>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">Disponiveis</span>
          <span className="font-medium text-emerald-600">{data.availableSlabs.toLocaleString('pt-BR')}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">Reservadas</span>
          <span className="font-medium text-amber-600">{data.reservedSlabs.toLocaleString('pt-BR')}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">Vendidas</span>
          <span className="font-medium text-blue-600">{data.soldSlabs.toLocaleString('pt-BR')}</span>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">Valor em Estoque</span>
          <span className="font-semibold text-obsidian">{formatCurrency(data.inventoryValue, 'pt', currency)}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-600">Rotatividade</span>
          </div>
          <span className="font-medium text-obsidian">{data.turnover.toFixed(2)}x</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-600">Tempo Medio</span>
          </div>
          <span className="font-medium text-obsidian">{data.avgDaysInStock} dias</span>
        </div>
      </div>

      {hasAlerts && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="space-y-2">
            {data.lowStockCount > 0 && (
              <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-2 rounded-sm">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {data.lowStockCount} lote{data.lowStockCount > 1 ? 's' : ''} com estoque baixo
                </span>
              </div>
            )}
            {data.staleBatchCount > 0 && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-2 rounded-sm">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {data.staleBatchCount} lote{data.staleBatchCount > 1 ? 's' : ''} parado{data.staleBatchCount > 1 ? 's' : ''} ha mais de 90 dias
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

export function InventoryMetricsSkeleton() {
  return (
    <Card variant="elevated">
      <div className="animate-pulse">
        <div className="flex items-center justify-between mb-6">
          <div className="h-6 bg-slate-200 rounded w-40" />
          <div className="w-9 h-9 bg-slate-200 rounded-sm" />
        </div>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <div className="h-8 bg-slate-200 rounded w-16 mb-1" />
            <div className="h-3 bg-slate-200 rounded w-20" />
          </div>
          <div>
            <div className="h-8 bg-slate-200 rounded w-20 mb-1" />
            <div className="h-3 bg-slate-200 rounded w-16" />
          </div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex justify-between">
              <div className="h-4 bg-slate-200 rounded w-20" />
              <div className="h-4 bg-slate-200 rounded w-12" />
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
