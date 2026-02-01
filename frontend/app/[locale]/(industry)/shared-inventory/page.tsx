'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { PackageOpen, RefreshCcw, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import { Badge } from '@/components/ui/badge';
import { ReservationModal, type ReservationData } from '@/components/inventory/ReservationModal';
import { useSharedInventory } from '@/lib/api/queries/useSharedInventory';
import { useCreateReservation } from '@/lib/api/queries/useReservations';
import { useToast } from '@/lib/hooks/useToast';
import { formatArea, formatDimensions } from '@/lib/utils/formatDimensions';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { formatDate } from '@/lib/utils/formatDate';
import { truncateText } from '@/lib/utils/truncateText';
import { TRUNCATION_LIMITS } from '@/lib/config/truncationLimits';
import { isPlaceholderUrl } from '@/lib/utils/media';
import type { Batch } from '@/lib/types';

export default function SharedInventoryPage() {
  const router = useRouter();
  const t = useTranslations('sharedInventory');
  const tInventory = useTranslations('inventory');
  const { success, error } = useToast();

  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filters = useMemo(() => ({ limit: 200 }), []);
  const { data, isLoading, isError, refetch, isFetching } = useSharedInventory(filters);
  const createReservation = useCreateReservation();

  const sharedBatches = data ?? [];
  const isEmpty = !sharedBatches.length;

  const handleOpenReservation = (batch: Batch) => {
    setSelectedBatch(batch);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedBatch(null);
  };

  const handleConfirmReservation = async (data: ReservationData) => {
    if (!selectedBatch) return;

    try {
      await createReservation.mutateAsync({
        batchId: selectedBatch.id,
        quantitySlabsReserved: data.quantity,
        clienteId: data.clienteId,
        reservedPrice: data.reservedPrice,
        brokerSoldPrice: data.brokerSoldPrice,
        notes: data.notes,
      });
      success(t('reservationSuccess') || `Reserva de ${data.quantity} chapa(s) criada com sucesso!`);
      handleCloseModal();
      refetch();
    } catch (err) {
      error(t('reservationError') || 'Erro ao criar reserva. Tente novamente.');
    }
  };

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
          <LoadingState variant="table" rows={8} columns={8} />
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
                  <TableHead>{tInventory('available')}</TableHead>
                  <TableHead>{tInventory('price')}</TableHead>
                  <TableHead>{tInventory('status')}</TableHead>
                  <TableHead>{t('sharedAt')}</TableHead>
                  <TableHead>{tInventory('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sharedBatches.map((share) => {
                  const batch = share.batch;
                  const cover = batch?.medias?.[0];
                  const canReserve = batch && batch.availableSlabs > 0 && batch.status === 'DISPONIVEL';

                  return (
                    <TableRow key={share.id}>
                      <TableCell>
                        <div className="w-20 h-20 rounded-sm overflow-hidden bg-slate-100">
                          {cover && !isPlaceholderUrl(cover.url) ? (
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
                        <span className="font-mono text-sm font-medium text-emerald-600">
                          {batch?.availableSlabs ?? 0} chapas
                        </span>
                        {batch && (
                          <span className="text-xs text-slate-400 block">
                            {formatArea(batch.availableSlabs * batch.height * batch.width / 10000)}
                          </span>
                        )}
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
                      <TableCell>
                        {canReserve ? (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleOpenReservation(batch)}
                          >
                            <ShoppingCart className="w-4 h-4 mr-1" />
                            {t('reserve') || 'Reservar'}
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-400">
                            {batch?.availableSlabs === 0
                              ? (t('noStock') || 'Sem estoque')
                              : (t('unavailable') || 'Indisponivel')
                            }
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Reservation Modal */}
      <ReservationModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onConfirm={handleConfirmReservation}
        batch={selectedBatch}
        isLoading={createReservation.isPending}
      />
    </div>
  );
}
