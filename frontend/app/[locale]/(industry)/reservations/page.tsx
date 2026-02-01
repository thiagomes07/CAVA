'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Package,
  ShoppingCart,
  Trash2,
  AlertCircle,
  RefreshCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalContent,
  ModalFooter,
  ModalClose,
} from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/hooks/useAuth';
import { useToast } from '@/lib/hooks/useToast';
import {
  useAllReservations,
  useCancelReservation,
  useConfirmSale,
} from '@/lib/api/queries/useReservations';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { formatDate } from '@/lib/utils/formatDate';
import { formatDimensions } from '@/lib/utils/formatDimensions';
import type { Reservation, ReservationStatus } from '@/lib/types';

type TabType = 'all' | 'pending';

const statusConfig: Record<
  ReservationStatus,
  { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'secondary' }
> = {
  ATIVA: { label: 'Ativa', variant: 'success' },
  PENDENTE_APROVACAO: { label: 'Pendente', variant: 'warning' },
  APROVADA: { label: 'Aprovada', variant: 'success' },
  REJEITADA: { label: 'Rejeitada', variant: 'danger' },
  CONFIRMADA_VENDA: { label: 'Vendida', variant: 'secondary' },
  EXPIRADA: { label: 'Expirada', variant: 'secondary' },
  CANCELADA: { label: 'Cancelada', variant: 'secondary' },
};

export default function ReservationsPage() {
  const t = useTranslations('reservations');
  const { user } = useAuth();
  const { success, error } = useToast();

  const isAdmin = user?.role === 'ADMIN_INDUSTRIA';
  const [activeTab, setActiveTab] = useState<TabType>('pending');

  // Query para buscar todas as reservas
  const allReservationsQuery = useAllReservations({ enabled: isAdmin });

  // Mutations
  const cancelReservation = useCancelReservation();
  const confirmSale = useConfirmSale();

  // Modals
  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [sellingReservation, setSellingReservation] = useState<Reservation | null>(null);
  const [salePrice, setSalePrice] = useState('');
  const [saleQuantity, setSaleQuantity] = useState(1);

  // Filtrar reservas baseado na aba ativa
  const allReservations = allReservationsQuery.data ?? [];
  
  const reservations = activeTab === 'pending'
    ? allReservations.filter(r => r.status === 'ATIVA')
    : allReservations;
  
  const pendingCount = allReservations.filter(r => r.status === 'ATIVA').length;

  // Handlers
  const handleCancel = async (id: string) => {
    if (!confirm(t('confirmCancel') || 'Deseja cancelar esta reserva?')) return;

    try {
      await cancelReservation.mutateAsync(id);
      success(t('cancelSuccess') || 'Reserva cancelada');
    } catch (err) {
      error(t('cancelError') || 'Erro ao cancelar reserva');
    }
  };

  const handleOpenSale = (reservation: Reservation) => {
    setSellingReservation(reservation);
    setSaleQuantity(reservation.quantitySlabsReserved);
    
    // Se houver preço sugerido pelo broker (reservedPrice), calcular o valor total sugerido
    if (reservation.reservedPrice && reservation.batch) {
      const areaPerSlab = (reservation.batch.height * reservation.batch.width) / 10000;
      const totalArea = areaPerSlab * reservation.quantitySlabsReserved;
      const suggestedTotal = reservation.reservedPrice * totalArea;
      setSalePrice(suggestedTotal.toFixed(2));
    } else {
      setSalePrice('');
    }
    
    setSaleModalOpen(true);
  };

  const handleConfirmSale = async () => {
    if (!sellingReservation || !salePrice) return;

    try {
      await confirmSale.mutateAsync({
        reservationId: sellingReservation.id,
        quantitySlabsSold: saleQuantity,
        finalSoldPrice: parseFloat(salePrice),
      });
      success(t('saleSuccess') || 'Venda confirmada com sucesso!');
      setSaleModalOpen(false);
    } catch (err) {
      error(t('saleError') || 'Erro ao confirmar venda');
    }
  };

  const canConfirmSale = (reservation: Reservation) => {
    // Admin pode confirmar venda de reservas ativas
    if (isAdmin) {
      return reservation.status === 'ATIVA' || reservation.status === 'APROVADA';
    }
    // Outros usuários só podem confirmar reservas ativas ou aprovadas
    return reservation.status === 'ATIVA' || reservation.status === 'APROVADA';
  };

  const canCancel = (reservation: Reservation) => {
    return reservation.status === 'ATIVA';
  };

  const refetchAll = () => {
    allReservationsQuery.refetch();
  };

  return (
    <div className="min-h-screen bg-mineral">
      {/* Header */}
      <div className="bg-porcelain border-b border-slate-100 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl text-obsidian mb-2">
              {t('title') || 'Reservas'}
            </h1>
            <p className="text-sm text-slate-500">
              {t('subtitle') || 'Gerencie suas reservas de chapas'}
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={refetchAll}
            loading={allReservationsQuery.isFetching}
          >
            <RefreshCcw className="w-4 h-4 mr-2" />
            {t('refresh') || 'Atualizar'}
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mt-6">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === 'pending'
                ? 'bg-amber-100 text-amber-700'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Package className="w-4 h-4" />
            {t('pending') || 'Pendentes'}
            {pendingCount > 0 && (
              <span className="bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'all'
                ? 'bg-slate-200 text-slate-700'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {t('allReservations') || 'Todas'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-8 py-6">
        {allReservationsQuery.isLoading ? (
          <LoadingState variant="table" rows={5} columns={7} />
        ) : allReservationsQuery.isError ? (
          <EmptyState
            icon={AlertCircle}
            title={t('loadError') || 'Erro ao carregar'}
            description={t('loadErrorDescription') || 'Tente novamente'}
            actionLabel={t('tryAgain') || 'Tentar novamente'}
            onAction={refetchAll}
          />
        ) : reservations.length === 0 ? (
          <EmptyState
            icon={Package}
            title={t('noReservations') || 'Nenhuma reserva'}
            description={t('noReservationsDescription') || 'Suas reservas aparecerão aqui'}
          />
        ) : (
          <div className="bg-porcelain rounded-sm border border-slate-100 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('batch') || 'Lote'}</TableHead>
                  <TableHead>{t('product') || 'Produto'}</TableHead>
                  <TableHead>{t('quantity') || 'Qtd'}</TableHead>
                  <TableHead>{t('reservedBy') || 'Reservado por'}</TableHead>
                  <TableHead>{t('reservedPrice') || 'Preço'}</TableHead>
                  <TableHead>{t('client') || 'Cliente'}</TableHead>
                  <TableHead>{t('status') || 'Status'}</TableHead>
                  <TableHead>{t('expiresAt') || 'Expira em'}</TableHead>
                  <TableHead>{t('actions') || 'Ações'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reservations.map((reservation) => (
                  <TableRow key={reservation.id}>
                    <TableCell>
                      <span className="font-mono text-sm">
                        {reservation.batch?.batchCode || '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">
                          {reservation.batch?.product?.name || '-'}
                        </p>
                        {reservation.batch && (
                          <p className="text-xs text-slate-500">
                            {formatDimensions(
                              reservation.batch.height,
                              reservation.batch.width,
                              reservation.batch.thickness
                            )}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-emerald-600">
                        {reservation.quantitySlabsReserved} chapas
                      </span>
                    </TableCell>
                    <TableCell>
                      {reservation.reservedBy ? (
                        <div>
                          <p className="text-sm font-medium">{reservation.reservedBy.name}</p>
                          <p className="text-xs text-slate-500">{reservation.reservedBy.email}</p>
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {reservation.reservedPrice ? (
                        <span className="font-medium">
                          {formatCurrency(reservation.reservedPrice)}/m²
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {reservation.cliente?.name || (
                        <span className="text-slate-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusConfig[reservation.status]?.variant || 'default'}>
                        {statusConfig[reservation.status]?.label || reservation.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-600">
                        {formatDate(reservation.expiresAt, 'dd/MM/yyyy HH:mm')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {/* Confirm Sale - Only Admin */}
                        {isAdmin && canConfirmSale(reservation) && (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleOpenSale(reservation)}
                          >
                            <ShoppingCart className="w-4 h-4 mr-1" />
                            {t('confirmSale') || 'Vender'}
                          </Button>
                        )}

                        {/* Cancel */}
                        {canCancel(reservation) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCancel(reservation.id)}
                            loading={cancelReservation.isPending}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Confirm Sale Modal */}
      <Modal open={saleModalOpen} onClose={() => setSaleModalOpen(false)}>
        <ModalHeader>
          <ModalTitle>{t('saleTitle') || 'Confirmar Venda'}</ModalTitle>
          <ModalClose onClose={() => setSaleModalOpen(false)} />
        </ModalHeader>
        <ModalContent>
          {sellingReservation && (
            <div className="space-y-4">
              {/* Calcular área e preço mínimo */}
              {(() => {
                const batch = sellingReservation.batch;
                const areaPerSlab = batch ? (batch.height * batch.width) / 10000 : 0; // cm² para m²
                const totalArea = areaPerSlab * saleQuantity;
                const suggestedTotalPrice = sellingReservation.reservedPrice 
                  ? sellingReservation.reservedPrice * totalArea 
                  : null;
                
                return (
                  <>
                    <div className="bg-slate-50 rounded-lg p-4">
                      <p className="font-medium">
                        {batch?.product?.name}
                      </p>
                      <p className="text-sm text-slate-500">
                        Lote: {batch?.batchCode}
                      </p>
                      <p className="text-sm text-slate-500">
                        Reservado: {sellingReservation.quantitySlabsReserved} chapas
                      </p>
                      {sellingReservation.reservedBy && (
                        <p className="text-xs text-slate-400 mt-1">
                          Por: {sellingReservation.reservedBy.name}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        {t('saleQuantity') || 'Quantidade a vender'}
                      </label>
                      <Input
                        type="number"
                        value={saleQuantity}
                        onChange={(e) => setSaleQuantity(parseInt(e.target.value) || 1)}
                        min={1}
                        max={sellingReservation.quantitySlabsReserved}
                      />
                      {totalArea > 0 && (
                        <p className="text-xs text-slate-500 mt-1">
                          Área total: {totalArea.toFixed(2)} m²
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        {t('salePrice') || 'Valor total da venda (R$)'}
                      </label>
                      <Input
                        type="number"
                        value={salePrice}
                        onChange={(e) => setSalePrice(e.target.value)}
                        placeholder="0.00"
                        step="0.01"
                      />
                    </div>

                    {/* Preço sugerido pelo broker */}
                    {suggestedTotalPrice && suggestedTotalPrice > 0 && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
                        <p className="text-green-800">
                          <strong>Valor sugerido pelo broker:</strong> {formatCurrency(suggestedTotalPrice)}
                        </p>
                        <p className="text-green-600 text-xs mt-1">
                          ({formatCurrency(sellingReservation.reservedPrice!)}/m² × {totalArea.toFixed(2)} m²)
                        </p>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </ModalContent>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setSaleModalOpen(false)}>
            {t('cancel') || 'Cancelar'}
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirmSale}
            disabled={!salePrice || parseFloat(salePrice) <= 0}
            loading={confirmSale.isPending}
          >
            {t('confirmSaleButton') || 'Confirmar Venda'}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
