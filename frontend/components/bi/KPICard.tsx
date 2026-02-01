'use client';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils/cn';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive?: boolean;
  };
  icon?: React.ComponentType<{ className?: string }>;
  color?: 'emerald' | 'blue' | 'amber' | 'purple' | 'slate';
  className?: string;
}

export function KPICard({
  title,
  value,
  subtitle,
  trend,
  icon: Icon,
  color = 'blue',
  className,
}: KPICardProps) {
  const colorClasses = {
    emerald: 'text-emerald-600 bg-emerald-50',
    blue: 'text-blue-600 bg-blue-50',
    amber: 'text-amber-600 bg-amber-50',
    purple: 'text-purple-600 bg-purple-50',
    slate: 'text-slate-600 bg-slate-50',
  };

  const trendColorClasses = {
    positive: 'text-emerald-600 bg-emerald-50',
    negative: 'text-red-600 bg-red-50',
    neutral: 'text-slate-500 bg-slate-50',
  };

  const getTrendType = () => {
    if (!trend) return 'neutral';
    if (trend.value === 0) return 'neutral';
    if (trend.isPositive !== undefined) {
      return trend.isPositive ? 'positive' : 'negative';
    }
    return trend.value > 0 ? 'positive' : 'negative';
  };

  const trendType = getTrendType();

  const TrendIcon = trendType === 'positive' ? TrendingUp : trendType === 'negative' ? TrendingDown : Minus;

  return (
    <Card variant="elevated" className={cn('relative overflow-hidden', className)}>
      <div className="flex items-start justify-between mb-4">
        {Icon && (
          <div className={cn('p-3 rounded-sm', colorClasses[color])}>
            <Icon className="w-6 h-6" />
          </div>
        )}
        {trend && (
          <div className={cn('flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium', trendColorClasses[trendType])}>
            <TrendIcon className="w-3 h-3" />
            <span>{Math.abs(trend.value).toFixed(1)}%</span>
          </div>
        )}
      </div>

      <div className="mb-2">
        <p className="font-serif text-4xl text-obsidian mb-1">
          {typeof value === 'number' && !value.toString().includes('R$')
            ? value.toLocaleString('pt-BR')
            : value}
        </p>
        <p className="uppercase tracking-widest text-[10px] text-slate-500 font-semibold">
          {title}
        </p>
        {subtitle && (
          <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
        )}
      </div>
    </Card>
  );
}

export function KPICardSkeleton() {
  return (
    <Card variant="elevated">
      <div className="animate-pulse">
        <div className="flex items-start justify-between mb-4">
          <div className="w-12 h-12 bg-slate-200 rounded-sm" />
          <div className="w-16 h-6 bg-slate-200 rounded-full" />
        </div>
        <div className="h-10 bg-slate-200 rounded w-32 mb-2" />
        <div className="h-3 bg-slate-200 rounded w-24" />
      </div>
    </Card>
  );
}
