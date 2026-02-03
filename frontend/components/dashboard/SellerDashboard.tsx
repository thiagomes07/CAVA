'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Layers, Link2, Inbox, TrendingUp, Plus, Eye, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { LoadingState } from '@/components/shared/LoadingState';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/lib/hooks/useToast';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { formatDate } from '@/lib/utils/formatDate';
import { truncateText } from '@/lib/utils/truncateText';
import { TRUNCATION_LIMITS } from '@/lib/config/truncationLimits';
import type { DashboardMetrics, Activity } from '@/lib/types';
import { cn } from '@/lib/utils/cn';

export function SellerDashboard() {
  const router = useRouter();
  const { error } = useToast();
  const t = useTranslations('dashboard');
  const tActivities = useTranslations('activities');
  const tSales = useTranslations('sales');

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
      error(t('metricsError'));
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
      error(t('activitiesError'));
    } finally {
      setIsLoadingActivities(false);
    }
  };

  return (
    <div className="min-h-screen bg-mineral">
      {/* Header */}
      <div className="bg-obsidian text-porcelain px-8 py-12">
        <div className="max-w-7xl mx-auto">
          <h1 className="font-serif text-4xl mb-2">{t('title')}</h1>
          <p className="text-porcelain/60 text-lg">
            {t('subtitleSeller')}
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
                title={t('availableStock')}
                value={metrics?.availableBatches || 0}
                subtitle={t('activeBatches')}
                color="slate"
              />
              <MetricCard
                icon={TrendingUp}
                title={t('monthlySales')}
                value={formatCurrency(metrics?.monthlySales || 0)}
                subtitle={t('monthlyRevenue')}
                color="slate"
              />
              <MetricCard
                icon={Link2}
                title={t('activeLinks')}
                value={metrics?.activeLinks || 0}
                subtitle={t('generatedByMe')}
                color="slate"
              />
            </>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-obsidian mb-4">
            {t('quickActions')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="secondary"
              className="justify-start h-auto py-4"
              onClick={() => router.push('/inventory')}
            >
              <Eye className="w-5 h-5 mr-3" />
              <div className="text-left">
                <p className="font-semibold">{t('viewStock')}</p>
                <p className="text-xs text-slate-500 font-normal">
                  {t('checkAvailableBatches')}
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
                <p className="font-semibold">{t('createLink')}</p>
                <p className="text-xs text-slate-500 font-normal">
                  {t('generateSaleLink')}
                </p>
              </div>
            </Button>

            <Button
              variant="secondary"
              className="justify-start h-auto py-4"
              onClick={() => router.push('/clientes')}
            >
              <Inbox className="w-5 h-5 mr-3" />
              <div className="text-left">
                <p className="font-semibold">{t('viewClientes')}</p>
                <p className="text-xs text-slate-500 font-normal">
                  {t('manageInterested')}
                </p>
              </div>
            </Button>
          </div>
        </div>

        {/* Recent Activities */}
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-obsidian">
              {t('recentMovements')}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/sales')}
            >
              {t('viewAll')}
            </Button>
          </div>

          {isLoadingActivities ? (
            <LoadingState variant="table" rows={5} columns={5} />
          ) : activities.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-400">{t('noRecentMovements')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tSales('batch')}</TableHead>
                    <TableHead>{tSales('product')}</TableHead>
                    <TableHead>{tSales('seller')}</TableHead>
                    <TableHead>{tSales('actions')}</TableHead>
                    <TableHead>{tSales('date')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activities.map((activity) => (
                    <TableRow key={activity.id}>
                      <TableCell>
                        <span 
                          className="font-mono text-obsidian"
                          title={activity.batchCode}
                        >
                          {truncateText(activity.batchCode, TRUNCATION_LIMITS.BATCH_CODE)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span 
                          className="font-serif text-slate-600"
                          title={activity.productName}
                        >
                          {truncateText(activity.productName, TRUNCATION_LIMITS.PRODUCT_NAME)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span 
                          className="text-slate-500"
                          title={activity.sellerName}
                        >
                          {truncateText(activity.sellerName, TRUNCATION_LIMITS.SELLER_NAME)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <ActivityBadge action={activity.action} t={tActivities} />
                      </TableCell>
                      <TableCell>
                        <span className="text-slate-400 font-mono text-sm">
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
  color: 'slate';
}

function MetricCard({ icon: Icon, title, value, subtitle, color }: MetricCardProps) {
  const colorClasses = {
    slate: 'text-slate-600 bg-slate-100',
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

function ActivityBadge({ action, t }: { action: Activity['action']; t: (key: string) => string }) {
  const variants: Record<Activity['action'], { labelKey: string; color: string }> = {
    RESERVADO: { labelKey: 'reserved', color: 'bg-slate-100 text-slate-700 border-slate-200' },
    VENDIDO: { labelKey: 'sold', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    COMPARTILHADO: { labelKey: 'shared', color: 'bg-slate-100 text-slate-700 border-slate-200' },
    CRIADO: { labelKey: 'created', color: 'bg-slate-50 text-slate-700 border-slate-200' },
  };

  const variant = variants[action];

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-1 rounded-full text-[10px] uppercase tracking-widest font-semibold border',
        variant.color
      )}
    >
      {t(variant.labelKey)}
    </span>
  );
}
