'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Download, FileText, Receipt, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Pagination } from '@/components/shared/Pagination';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import { apiClient } from '@/lib/api/client';
import { useToast } from '@/lib/hooks/useToast';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { formatDate } from '@/lib/utils/formatDate';
import { truncateText } from '@/lib/utils/truncateText';
import { TRUNCATION_LIMITS } from '@/lib/config/truncationLimits';
import type { Sale } from '@/lib/types';
import { cn } from '@/lib/utils/cn';

interface SalesFilter {
  startDate: string;
  endDate: string;
  sellerId: string;
  page: number;
  limit: number;
  [key: string]: string | number | boolean | undefined;
}

interface SalesSummary {
  totalSales: number;
  totalCommissions: number;
  averageTicket: number;
}

export default function SalesHistoryPage() {
  const router = useRouter();
  const { error, success } = useToast();
  const t = useTranslations('sales');
  const tCommon = useTranslations('common');

  const [sales, setSales] = useState<Sale[]>([]);
  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [sellers, setSellers] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const [filters, setFilters] = useState<SalesFilter>({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    sellerId: '',
    page: 1,
    limit: 50,
  });

  useEffect(() => {
    fetchSellers();
  }, []);

  useEffect(() => {
    fetchSales();
    fetchSummary();
  }, [filters]);

  const fetchSellers = async () => {
    try {
      const data = await apiClient.get<{ users: Array<{ id: string; name: string }>; total: number; page: number }>(
        '/users',
        { params: { role: 'VENDEDOR_INTERNO' } }
      );
      setSellers(data.users || []);
    } catch (err) {
      error(t('sellersError'));
    }
  };

  const fetchSales = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.get<{
        sales: Sale[];
        total: number;
        page: number;
      }>('/sales-history', { params: filters });

      setSales(data.sales);
      setTotalItems(data.total);
    } catch (err) {
      error(t('loadError'));
      setSales([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const data = await apiClient.get<SalesSummary>('/sales-history/summary', {
        params: {
          startDate: filters.startDate,
          endDate: filters.endDate,
          sellerId: filters.sellerId,
        },
      });
      setSummary(data);
    } catch (err) {
      setSummary(null);
    }
  };

  const handleExport = async () => {
    try {
      success(t('exportStarted'));
      // Implementar lógica de exportação
    } catch (err) {
      error(t('exportError'));
    }
  };

  const isEmpty = sales.length === 0;

  return (
    <div className="min-h-screen bg-mineral">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl text-obsidian mb-2">
              {t('title')}
            </h1>
            <p className="text-sm text-slate-500">
              {t('subtitle')}
            </p>
          </div>
          <Button variant="secondary" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            {t('exportReport')}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-slate-500 uppercase tracking-widest">
                  {t('totalSold')}
                </p>
                <Receipt className="w-5 h-5 text-slate-400" />
              </div>
              <p className="font-serif text-4xl text-obsidian">
                {formatCurrency(summary.totalSales)}
              </p>
            </Card>

            <Card>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-slate-500 uppercase tracking-widest">
                  {t('commissionsPaid')}
                </p>
                <Receipt className="w-5 h-5 text-slate-400" />
              </div>
              <p className="font-serif text-4xl text-obsidian">
                {formatCurrency(summary.totalCommissions)}
              </p>
            </Card>

            <Card>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-slate-500 uppercase tracking-widest">
                  {t('averageTicket')}
                </p>
                <Receipt className="w-5 h-5 text-slate-400" />
              </div>
              <p className="font-serif text-4xl text-obsidian">
                {formatCurrency(summary.averageTicket)}
              </p>
            </Card>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="px-8 pb-6">
        <div className="bg-porcelain rounded-sm border border-slate-100 p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              type="date"
              label={t('startDate')}
              value={filters.startDate}
              onChange={(e) =>
                setFilters({ ...filters, startDate: e.target.value, page: 1 })
              }
            />

            <Input
              type="date"
              label={t('endDate')}
              value={filters.endDate}
              onChange={(e) =>
                setFilters({ ...filters, endDate: e.target.value, page: 1 })
              }
            />

            <Select
              label={t('seller')}
              value={filters.sellerId}
              onChange={(e) =>
                setFilters({ ...filters, sellerId: e.target.value, page: 1 })
              }
            >
              <option value="">{t('allSellers')}</option>
              {sellers.map((seller) => (
                <option key={seller.id} value={seller.id} title={seller.name}>
                  {truncateText(seller.name, TRUNCATION_LIMITS.SELECT_OPTION)}
                </option>
              ))}
            </Select>

            <div className="flex items-end">
              <Button
                variant="secondary"
                className="w-full"
                onClick={() =>
                  setFilters({
                    startDate: new Date(
                      new Date().getFullYear(),
                      new Date().getMonth(),
                      1
                    )
                      .toISOString()
                      .split('T')[0],
                    endDate: new Date().toISOString().split('T')[0],
                    sellerId: '',
                    page: 1,
                    limit: 50,
                  })
                }
              >
                {tCommon('clearFilters')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-8 pb-8">
        {isLoading ? (
          <LoadingState variant="table" rows={10} columns={7} />
        ) : isEmpty ? (
          <EmptyState
            icon={Receipt}
            title={t('emptyTitle')}
            description={t('emptyDescription')}
          />
        ) : (
          <>
            <div className="bg-porcelain rounded-sm border border-slate-100 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('saleNumber')}</TableHead>
                    <TableHead>{t('batch')}</TableHead>
                    <TableHead>{t('customer')}</TableHead>
                    <TableHead>{t('seller')}</TableHead>
                    <TableHead>{t('totalValue')}</TableHead>
                    <TableHead>{t('commission')}</TableHead>
                    <TableHead>{t('netValue')}</TableHead>
                    <TableHead>{t('date')}</TableHead>
                    <TableHead>{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((sale) => (
                    <React.Fragment key={sale.id}>
                      <TableRow
                        className={cn(
                          'cursor-pointer',
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
                            className="font-serif text-slate-600"
                            title={sale.customerName}
                          >
                            {truncateText(sale.customerName, TRUNCATION_LIMITS.CUSTOMER_NAME)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span
                            className="text-slate-500"
                            title={sale.soldBy?.name || sale.sellerName}
                          >
                            {truncateText(sale.soldBy?.name || sale.sellerName, TRUNCATION_LIMITS.SELLER_NAME) || '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-serif text-obsidian tabular-nums">
                            {formatCurrency(sale.salePrice)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-[#C2410C] tabular-nums">
                            {sale.brokerCommission
                              ? formatCurrency(sale.brokerCommission)
                              : '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-obsidian tabular-nums">
                            {formatCurrency(sale.netIndustryValue)}
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
                              <div className="grid grid-cols-3 gap-6">
                                <div>
                                  <p className="text-xs uppercase tracking-widest text-slate-500 mb-1">
                                    {t('product')}
                                  </p>
                                  <p
                                    className="text-sm font-medium text-obsidian"
                                    title={sale.batch?.product?.name}
                                  >
                                    {truncateText(sale.batch?.product?.name, TRUNCATION_LIMITS.PRODUCT_NAME) || '-'}
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
                                    {truncateText(sale.customerContact, TRUNCATION_LIMITS.CONTACT)}
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

            <Pagination
              currentPage={filters.page}
              totalPages={Math.ceil(totalItems / filters.limit)}
              totalItems={totalItems}
              itemsPerPage={filters.limit}
              onPageChange={(page) => setFilters({ ...filters, page })}
            />
          </>
        )}
      </div>
    </div>
  );
}