'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { PackageOpen, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import { Badge } from '@/components/ui/badge';
import { useSharedInventory } from '@/lib/api/queries/useSharedInventory';
import { formatArea, formatDimensions } from '@/lib/utils/formatDimensions';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { formatDate } from '@/lib/utils/formatDate';
import { truncateText } from '@/lib/utils/truncateText';
import { TRUNCATION_LIMITS } from '@/lib/config/truncationLimits';

export default function SharedInventoryPage() {
  const router = useRouter();
  const t = useTranslations('sharedInventory');
  const tInventory = useTranslations('inventory');

  const filters = useMemo(() => ({ limit: 200 }), []);
  const { data, isLoading, isError, refetch, isFetching } = useSharedInventory(filters);

  const sharedBatches = data ?? [];
  const isEmpty = !sharedBatches.length;

  return (
    <div className="min-h-screen bg-mineral">
      {/* Header */}
      <div className="bg-porcelain border-b border-slate-100 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl text-obsidian mb-2">{t('title')}</h1>
            <p className="text-sm text-slate-500">{t('subtitle')}</p>
          </div>
          <Button
            variant="secondary"
            onClick={() => refetch()}
            loading={isFetching}
          >
            <RefreshCcw className="w-4 h-4 mr-2" />
            {t('refresh')}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="px-8 py-6">
        {isLoading ? (
          <LoadingState variant="table" rows={8} columns={7} />
        ) : isError ? (
          <EmptyState
            icon={PackageOpen}
            title={t('loadError')}
            description={t('loadErrorDescription')}
            actionLabel={t('tryAgain')}
            onAction={refetch}
          />
        ) : isEmpty ? (
          <EmptyState
            icon={PackageOpen}
            title={t('noBatches')}
            description={t('noBatchesDescription')}
          />
        ) : (
          <div className="bg-porcelain rounded-sm border border-slate-100 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tInventory('photo')}</TableHead>
                  <TableHead>{tInventory('code')}</TableHead>
                  <TableHead>{tInventory('product')}</TableHead>
                  <TableHead>{tInventory('dimensions')}</TableHead>
                  <TableHead>{tInventory('totalArea')}</TableHead>
                  <TableHead>{tInventory('price')}</TableHead>
                  <TableHead>{tInventory('status')}</TableHead>
                  <TableHead>{t('sharedAt')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sharedBatches.map((share) => {
                  const batch = share.batch;
                  const cover = batch?.medias?.[0];
                  return (
                    <TableRow key={share.id}>
                      <TableCell>
                        <div className="w-20 h-20 rounded-sm overflow-hidden bg-slate-100">
                          {cover ? (
                            <img
                              src={cover.url}
                              alt={batch?.batchCode}
                              loading="lazy"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                              {tInventory('noPhoto')}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span 
                          className="font-mono text-sm text-obsidian"
                          title={batch?.batchCode}
                        >
                          {truncateText(batch?.batchCode, TRUNCATION_LIMITS.BATCH_CODE)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span 
                          className="text-sm text-slate-600"
                          title={batch?.product?.name}
                        >
                          {truncateText(batch?.product?.name, TRUNCATION_LIMITS.PRODUCT_NAME) || '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm text-slate-600">
                          {batch ? formatDimensions(batch.height, batch.width, batch.thickness) : '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm text-slate-600">
                          {batch ? formatArea(batch.totalArea) : '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-serif text-obsidian">
                          {batch ? formatCurrency(share.negotiatedPrice ?? batch.industryPrice) : '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {batch?.status ? (
                          <Badge variant="default">{batch.status}</Badge>
                        ) : (
                          <span className="text-slate-400 text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-600">
                          {formatDate(share.sharedAt, 'dd/MM/yyyy')}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
