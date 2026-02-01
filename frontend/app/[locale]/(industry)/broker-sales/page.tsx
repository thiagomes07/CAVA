'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Receipt, FileText, TrendingUp } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/lib/hooks/useToast';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { formatDate } from '@/lib/utils/formatDate';
import { formatArea } from '@/lib/utils/formatDimensions';
import { truncateText } from '@/lib/utils/truncateText';
import { TRUNCATION_LIMITS } from '@/lib/config/truncationLimits';
import type { Sale } from '@/lib/types';
import { cn } from '@/lib/utils/cn';

export default function BrokerSalesPage() {
  const router = useRouter();
  const { error } = useToast();
  const t = useTranslations('sales');
  const tDashboard = useTranslations('dashboard');

  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Calculate summary from sales
  const summary = React.useMemo(() => {
    const totalSales = sales.reduce((sum, sale) => sum + (sale.brokerSoldPrice || sale.salePrice || 0), 0);
    const totalSlabs = sales.reduce((sum, sale) => sum + (sale.quantitySlabsSold || 0), 0);
    const totalArea = sales.reduce((sum, sale) => sum + (sale.totalAreaSold || 0), 0);
    return { totalSales, totalSlabs, totalArea, count: sales.length };
  }, [sales]);

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.get<Sale[]>('/broker/sales', {
        params: { limit: 100 },
      });
      setSales(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading sales:', err);
      error(t('loadError'));
      setSales([]);
    } finally {
      setIsLoading(false);
    }
  };

  const isEmpty = sales.length === 0;

  return (
    <div className="min-h-screen bg-mineral">
      {/* Header */}
      <div className="bg-porcelain border-b border-slate-100 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl text-obsidian mb-2">
              {t('brokerSalesTitle')}
            </h1>
            <p className="text-sm text-slate-500">
              {t('brokerSalesSubtitle')}
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-500 uppercase tracking-widest">
                {t('totalSold')}
              </p>
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="font-serif text-4xl text-obsidian">
              {formatCurrency(summary.totalSales)}
            </p>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-500 uppercase tracking-widest">
                {t('totalSalesCount')}
              </p>
              <Receipt className="w-5 h-5 text-blue-600" />
            </div>
            <p className="font-serif text-4xl text-obsidian">
              {summary.count}
            </p>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-500 uppercase tracking-widest">
                {t('totalSlabsSold')}
              </p>
              <Receipt className="w-5 h-5 text-purple-600" />
            </div>
            <p className="font-serif text-4xl text-obsidian">
              {summary.totalSlabs}
            </p>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-500 uppercase tracking-widest">
                {t('totalAreaSold')}
              </p>
              <Receipt className="w-5 h-5 text-amber-600" />
            </div>
            <p className="font-serif text-4xl text-obsidian">
              {formatArea(summary.totalArea)}
            </p>
          </Card>
        </div>
      </div>

      {/* Content */}
      <div className="px-8 pb-8">
        {isLoading ? (
          <LoadingState variant="table" rows={10} columns={7} />
        ) : isEmpty ? (
          <EmptyState
            icon={Receipt}
            title={t('emptyBrokerTitle')}
            description={t('emptyBrokerDescription')}
          />
        ) : (
          <div className="bg-porcelain rounded-sm border border-slate-100 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('saleNumber')}</TableHead>
                  <TableHead>{t('batch')}</TableHead>
                  <TableHead>{t('product')}</TableHead>
                  <TableHead>{t('customer')}</TableHead>
                  <TableHead>{t('quantity')}</TableHead>
                  <TableHead>{t('area')}</TableHead>
                  <TableHead>{t('mySalePrice')}</TableHead>
                  <TableHead>{t('date')}</TableHead>
                  <TableHead>{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((sale) => (
                  <React.Fragment key={sale.id}>
                    <TableRow
                      className={cn(
                        'cursor-pointer hover:bg-slate-50',
                        expandedRow === sale.id && 'bg-slate-50'
                      )}
                      onClick={() =>
                        setExpandedRow(expandedRow === sale.id ? null : sale.id)
                      }
                    >
                      <TableCell>
                        <span className="font-mono text-obsidian">
                          #{sale.id.slice(0, 8)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className="font-mono text-slate-500"
                          title={sale.batch?.batchCode}
                        >
                          {truncateText(sale.batch?.batchCode, TRUNCATION_LIMITS.BATCH_CODE) || '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className="text-slate-600"
                          title={sale.batch?.product?.name}
                        >
                          {truncateText(sale.batch?.product?.name, TRUNCATION_LIMITS.PRODUCT_NAME_SHORT) || '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className="font-serif text-slate-600"
                          title={sale.customerName}
                        >
                          {truncateText(sale.customerName, TRUNCATION_LIMITS.CUSTOMER_NAME) || '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-slate-600">
                          {sale.quantitySlabsSold} {t('slabs')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-slate-600">
                          {formatArea(sale.totalAreaSold || 0)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-emerald-600 tabular-nums">
                          {formatCurrency(sale.brokerSoldPrice || sale.salePrice || 0)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-slate-400 font-mono text-sm">
                          {formatDate(sale.saleDate)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {sale.invoiceUrl && (
                          <a
                            href={sale.invoiceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-slate-300 hover:text-[#C2410C] inline-flex items-center transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <FileText className="w-4 h-4" />
                          </a>
                        )}
                      </TableCell>
                    </TableRow>

                    {/* Expanded Row Details */}
                    {expandedRow === sale.id && (
                      <TableRow>
                        <TableCell colSpan={9} className="bg-slate-50">
                          <div className="py-4 px-6">
                            <div className="grid grid-cols-4 gap-6">
                              <div>
                                <p className="text-xs uppercase tracking-widest text-slate-500 mb-1">
                                  {t('industryPrice')}
                                </p>
                                <p className="text-sm font-medium text-obsidian">
                                  {formatCurrency(sale.salePrice || 0)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs uppercase tracking-widest text-slate-500 mb-1">
                                  {t('pricePerUnit')}
                                </p>
                                <p className="text-sm text-slate-600">
                                  {formatCurrency(sale.pricePerUnit || 0)}/{sale.priceUnit || 'm²'}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs uppercase tracking-widest text-slate-500 mb-1">
                                  {t('customerContact')}
                                </p>
                                <p
                                  className="text-sm text-slate-600"
                                  title={sale.customerContact}
                                >
                                  {truncateText(sale.customerContact, TRUNCATION_LIMITS.CONTACT) || '-'}
                                </p>
                              </div>
                              {sale.notes && (
                                <div>
                                  <p className="text-xs uppercase tracking-widest text-slate-500 mb-1">
                                    {t('notes')}
                                  </p>
                                  <p
                                    className="text-sm text-slate-600"
                                    title={sale.notes}
                                  >
                                    {truncateText(sale.notes, TRUNCATION_LIMITS.NOTES)}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
