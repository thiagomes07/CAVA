'use client';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils/cn';
import type { ConversionMetrics } from '@/lib/types';

interface ConversionFunnelProps {
  data: ConversionMetrics;
  title?: string;
  className?: string;
}

export function ConversionFunnel({ data, title = 'Funil de Conversao', className }: ConversionFunnelProps) {
  if (!data) {
    return (
      <Card variant="elevated" className={className}>
        <h3 className="text-lg font-semibold text-obsidian mb-4">{title}</h3>
        <div className="text-center py-8 text-slate-400">
          Sem dados de conversao
        </div>
      </Card>
    );
  }

  const stages = [
    {
      label: 'Reservas Criadas',
      value: data.totalReservations,
      color: 'bg-blue-500',
      percentage: 100,
    },
    {
      label: 'Aprovadas',
      value: data.totalApproved,
      color: 'bg-emerald-500',
      percentage: data.approvalRate,
    },
    {
      label: 'Convertidas em Vendas',
      value: data.totalConverted,
      color: 'bg-purple-500',
      percentage: data.conversionRate,
    },
  ];

  const maxValue = Math.max(...stages.map(s => s.value), 1);

  return (
    <Card variant="elevated" className={className}>
      <h3 className="text-lg font-semibold text-obsidian mb-6">{title}</h3>

      <div className="space-y-4">
        {stages.map((stage, index) => {
          const widthPercentage = Math.max((stage.value / maxValue) * 100, 10);

          return (
            <div key={stage.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-slate-700">{stage.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-obsidian">{stage.value}</span>
                  {index > 0 && (
                    <span className="text-xs text-slate-500">
                      ({stage.percentage.toFixed(1)}%)
                    </span>
                  )}
                </div>
              </div>
              <div className="h-8 bg-slate-100 rounded-sm overflow-hidden">
                <div
                  className={cn('h-full rounded-sm transition-all duration-500', stage.color)}
                  style={{ width: `${widthPercentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-slate-100">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-2xl font-serif text-obsidian">
              {data.avgHoursToApprove.toFixed(1)}h
            </p>
            <p className="text-xs text-slate-500 uppercase tracking-wider">
              Tempo medio aprovacao
            </p>
          </div>
          <div>
            <p className="text-2xl font-serif text-obsidian">
              {data.avgDaysToConvert.toFixed(1)}d
            </p>
            <p className="text-xs text-slate-500 uppercase tracking-wider">
              Tempo medio conversao
            </p>
          </div>
        </div>
      </div>

      {(data.totalRejected > 0 || data.totalExpired > 0) && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              {data.totalRejected > 0 && (
                <span className="text-red-600">
                  {data.totalRejected} rejeitada{data.totalRejected > 1 ? 's' : ''}
                </span>
              )}
              {data.totalExpired > 0 && (
                <span className="text-amber-600">
                  {data.totalExpired} expirada{data.totalExpired > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

export function ConversionFunnelSkeleton() {
  return (
    <Card variant="elevated">
      <div className="animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-40 mb-6" />
        <div className="space-y-4">
          {[100, 70, 40].map((width, i) => (
            <div key={i}>
              <div className="flex justify-between mb-1">
                <div className="h-4 bg-slate-200 rounded w-24" />
                <div className="h-4 bg-slate-200 rounded w-12" />
              </div>
              <div className="h-8 bg-slate-100 rounded-sm">
                <div className="h-full bg-slate-200 rounded-sm" style={{ width: `${width}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
