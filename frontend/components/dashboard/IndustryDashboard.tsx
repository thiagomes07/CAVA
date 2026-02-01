'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Package, TrendingUp, Clock, Plus, Eye, Receipt, Globe, Copy, ExternalLink } from 'lucide-react';
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
import { useIndustryConfig } from '@/lib/api/queries/industryApi';
import type { DashboardMetrics, Activity } from '@/lib/types';
import { cn } from '@/lib/utils/cn';

export function IndustryDashboard() {
  const router = useRouter();
  const { error, success } = useToast();
  const t = useTranslations('dashboard');
  const tActivities = useTranslations('activities');
  const tSales = useTranslations('sales');

  const { data: industry } = useIndustryConfig();
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
            {t('subtitle')}
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
                title={t('availableStock')}
                value={metrics?.availableBatches || 0}
                subtitle={t('activeBatches')}
                color="emerald"
              />
              <MetricCard
                icon={TrendingUp}
                title={t('monthlySales')}
                value={formatCurrency(metrics?.monthlySales || 0)}
                subtitle={t('monthlyRevenue')}
                color="blue"
              />
              <MetricCard
                icon={Clock}
                title={t('reservedBatches')}
                value={metrics?.reservedBatches || 0}
                subtitle={t('awaitingConfirmation')}
                color="amber"
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
              onClick={() => router.push('/inventory/new')}
            >
              <Plus className="w-5 h-5 mr-3" />
              <div className="text-left">
                <p className="font-semibold">{t('registerBatch')}</p>
                <p className="text-xs text-slate-500 font-normal">
                  {t('addNewBatch')}
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
                <p className="font-semibold">{t('viewStock')}</p>
                <p className="text-xs text-slate-500 font-normal">
                  {t('checkAvailableBatches')}
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
                <p className="font-semibold">{t('salesHistory')}</p>
                <p className="text-xs text-slate-500 font-normal">
                  {t('viewAllSales')}
                </p>
              </div>
            </Button>
          </div>
        </div>

        {/* Public Catalog Card */}
        {industry?.slug && (
          <div className="mb-8">
            <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-emerald-100 rounded-lg">
                    <Globe className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-obsidian mb-1">
                      {t('publicCatalog') || 'Catálogo Público'}
                    </h3>
                    <p className="text-sm text-slate-600 mb-2">
                      {t('publicCatalogDescription') || 'Compartilhe seu catálogo de produtos públicos com clientes e parceiros.'}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-500 bg-white/60 px-3 py-1.5 rounded-md w-fit">
                      <code className="font-mono">
                        {typeof window !== 'undefined' 
                          ? `${window.location.origin}/deposito/${industry.slug}`
                          : `/deposito/${industry.slug}`
                        }
                      </code>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      const url = `${window.location.origin}/deposito/${industry.slug}`;
                      navigator.clipboard.writeText(url);
                      success(t('linkCopied') || 'Link copiado!');
                    }}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    {t('copyLink') || 'Copiar Link'}
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => window.open(`/deposito/${industry.slug}`, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    {t('openCatalog') || 'Abrir Catálogo'}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

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
              <Clock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
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
                          className="font-mono text-sm text-obsidian"
                          title={activity.batchCode}
                        >
                          {truncateText(activity.batchCode, TRUNCATION_LIMITS.BATCH_CODE)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span 
                          className="text-slate-600"
                          title={activity.productName}
                        >
                          {truncateText(activity.productName, TRUNCATION_LIMITS.PRODUCT_NAME)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span 
                          className="text-slate-600"
                          title={activity.sellerName}
                        >
                          {truncateText(activity.sellerName, TRUNCATION_LIMITS.SELLER_NAME)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <ActivityBadge action={activity.action} t={tActivities} />
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

function ActivityBadge({ action, t }: { action: Activity['action']; t: (key: string) => string }) {
  const variants: Record<Activity['action'], { labelKey: string; color: string }> = {
    RESERVADO: { labelKey: 'reserved', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    VENDIDO: { labelKey: 'sold', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    COMPARTILHADO: { labelKey: 'shared', color: 'bg-purple-50 text-purple-700 border-purple-200' },
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
