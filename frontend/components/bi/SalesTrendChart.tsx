'use client';

import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { formatDate } from '@/lib/utils/formatDate';
import { cn } from '@/lib/utils/cn';
import type { TrendPoint } from '@/lib/types';

interface SalesTrendChartProps {
  data: TrendPoint[];
  title?: string;
  granularity?: 'day' | 'week' | 'month';
  className?: string;
}

export function SalesTrendChart({
  data,
  title = 'Tendencia de Vendas',
  granularity = 'day',
  className,
}: SalesTrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card variant="elevated" className={className}>
        <h3 className="text-lg font-semibold text-obsidian mb-4">{title}</h3>
        <div className="text-center py-12 text-slate-400">
          Sem dados para o periodo selecionado
        </div>
      </Card>
    );
  }

  const currency = data?.[0]?.currency || 'BRL';
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const totalValue = data.reduce((sum, d) => sum + d.value, 0);
  const totalCount = data.reduce((sum, d) => sum + d.count, 0);
  const avgValue = data.length > 0 ? totalValue / data.length : 0;

  const formatDateLabel = (dateStr: string) => {
    switch (granularity) {
      case 'day':
        return formatDate(dateStr, 'dd/MM');
      case 'week':
        return formatDate(dateStr, "'S'w");
      case 'month':
        return formatDate(dateStr, 'MMM');
      default:
        return formatDate(dateStr, 'dd/MM');
    }
  };

  return (
    <Card variant="elevated" className={className}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-obsidian">{title}</h3>
        <div className="text-right">
          <p className="text-sm text-slate-500">Total do periodo</p>
          <p className="text-lg font-semibold text-emerald-600">{formatCurrency(totalValue, 'pt', currency)}</p>
        </div>
      </div>

      <div className="h-48 flex items-end gap-1 mb-4">
        {data.map((point, index) => {
          const heightPercentage = (point.value / maxValue) * 100;
          const isHighest = point.value === maxValue && maxValue > 0;

          return (
            <div
              key={point.date}
              className="flex-1 flex flex-col items-center group relative"
            >
              <div
                className={cn(
                  'w-full rounded-t-sm transition-all duration-300 hover:opacity-80',
                  isHighest ? 'bg-emerald-500' : 'bg-blue-400'
                )}
                style={{ height: `${Math.max(heightPercentage, 2)}%` }}
              />

              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                <div className="bg-obsidian text-porcelain px-3 py-2 rounded-sm text-xs whitespace-nowrap">
                  <p className="font-medium">{formatCurrency(point.value, 'pt', currency)}</p>
                  <p className="text-porcelain/70">{point.count} venda{point.count !== 1 ? 's' : ''}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* X-axis labels */}
      <div className="flex gap-1 mb-6">
        {data.map((point, index) => {
          // Show labels for first, last, and some middle points
          const showLabel = index === 0 || index === data.length - 1 ||
            (data.length > 7 && index % Math.ceil(data.length / 7) === 0);

          return (
            <div key={point.date} className="flex-1 text-center">
              {showLabel && (
                <span className="text-[10px] text-slate-400">
                  {formatDateLabel(point.date)}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-100">
        <div className="text-center">
          <p className="text-2xl font-serif text-obsidian">{totalCount}</p>
          <p className="text-xs text-slate-500 uppercase tracking-wider">Vendas</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-serif text-obsidian">{formatCurrency(avgValue, 'pt', currency)}</p>
          <p className="text-xs text-slate-500 uppercase tracking-wider">Media/dia</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-serif text-obsidian">{data.length}</p>
          <p className="text-xs text-slate-500 uppercase tracking-wider">Dias</p>
        </div>
      </div>
    </Card>
  );
}

export function SalesTrendChartSkeleton() {
  return (
    <Card variant="elevated">
      <div className="animate-pulse">
        <div className="flex items-center justify-between mb-6">
          <div className="h-6 bg-slate-200 rounded w-40" />
          <div className="text-right">
            <div className="h-4 bg-slate-200 rounded w-24 mb-1" />
            <div className="h-6 bg-slate-200 rounded w-28" />
          </div>
        </div>
        <div className="h-48 flex items-end gap-1 mb-4">
          {[40, 65, 30, 80, 55, 90, 45, 70, 35, 60].map((height, i) => (
            <div
              key={i}
              className="flex-1 bg-slate-200 rounded-t-sm"
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-100">
          {[1, 2, 3].map((i) => (
            <div key={i} className="text-center">
              <div className="h-8 bg-slate-200 rounded w-16 mx-auto mb-1" />
              <div className="h-3 bg-slate-200 rounded w-12 mx-auto" />
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
