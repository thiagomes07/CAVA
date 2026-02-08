'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Package,
  ShoppingCart,
  Trash2,
  AlertCircle,
  RefreshCcw,
  User,
  Building2,
  CheckCircle2,
  XCircle,
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
import { MoneyInput } from '@/components/ui/masked-input';
import { useAuth } from '@/lib/hooks/useAuth';
import { useToast } from '@/lib/hooks/useToast';
import {
  useAllReservations,
  useMyReservations,
  useCancelReservation,
  useConfirmSale,
} from '@/lib/api/queries/useReservations';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { formatDate } from '@/lib/utils/formatDate';
import { formatDimensions } from '@/lib/utils/formatDimensions';
import { calculateSlabPrice, getSlabAreaM2 } from '@/lib/utils/priceConversion';
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
  const isBroker = user?.role === 'BROKER';
  const [activeTab, setActiveTab] = useState<TabType>('pending');

  // Query para buscar reservas - admin vê todas, broker vê as próprias
  const allReservationsQuery = useAllReservations({ enabled: isAdmin });
  const myReservationsQuery = useMyReservations();
  
  // Usar a query correta baseado no role
  const reservationsQuery = isAdmin ? allReservationsQuery : myReservationsQuery;

  // Mutations
  const cancelReservation = useCancelReservation();
  const confirmSale = useConfirmSale();

  // Modals
  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [sellingReservation, setSellingReservation] = useState<Reservation | null>(null);
  const [salePrice, setSalePrice] = useState<number>(0);
  const [saleQuantity, setSaleQuantity] = useState(1);
  
  // Cancel Modal
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancellingReservation, setCancellingReservation] = useState<Reservation | null>(null);

  // Filtrar reservas baseado na aba ativa (apenas para admin)
  const allReservations = reservationsQuery.data ?? [];
  
  // Broker vê todas as suas reservas, admin pode filtrar
  const reservations = isBroker 
    ? allReservations
    : (activeTab === 'pending'
      ? allReservations.filter(r => r.status === 'ATIVA')
      : allReservations);
  
  const pendingCount = allReservations.filter(r => r.status === 'ATIVA').length;

  // Handlers
  const handleOpenCancel = (reservation: Reservation) => {
    setCancellingReservation(reservation);
    setCancelModalOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!cancellingReservation) return;

    try {
      await cancelReservation.mutateAsync(cancellingReservation.id);
      success(t('cancelSuccess') || 'Reserva cancelada');
      setCancelModalOpen(false);
      setCancellingReservation(null);
    } catch (err) {
      error(t('cancelError') || 'Erro ao cancelar reserva');
    }
  };

  const handleOpenSale = (reservation: Reservation) => {
    setSellingReservation(reservation);
    setSaleQuantity(reservation.quantitySlabsReserved);
    
    // Calcular o valor total baseado no preço reservado
    if (reservation.reservedPrice && reservation.batch) {
      const slabArea = getSlabAreaM2(reservation.batch.height, reservation.batch.width);
      const totalArea = slabArea * reservation.quantitySlabsReserved;
      const calculatedTotal = reservation.reservedPrice * totalArea;
      setSalePrice(Math.round(calculatedTotal * 100) / 100);
    } else {
      setSalePrice(0);
    }
    
    setSaleModalOpen(true);
  };

  const handleConfirmSale = async () => {
    if (!sellingReservation || salePrice <= 0) return;

    try {
      await confirmSale.mutateAsync({
        reservationId: sellingReservation.id,
        quantitySlabsSold: sellingReservation.quantitySlabsReserved, // Sempre vende toda a reserva
        finalSoldPrice: salePrice,
      });
      success(t('saleSuccess') || 'Venda confirmada com sucesso!');
      setSaleModalOpen(false);
      setSellingReservation(null);
    } catch (err) {
      error(t('saleError') || 'Erro ao confirmar venda');
    }
  };

  const handleRejectSale = async () => {
    if (!sellingReservation) return;

    try {
      await cancelReservation.mutateAsync(sellingReservation.id);
      success(t('rejectSuccess') || 'Reserva rejeitada');
      setSaleModalOpen(false);
      setSellingReservation(null);
    } catch (err) {
      error(t('rejectError') || 'Erro ao rejeitar reserva');
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
    reservationsQuery.refetch();
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
            loading={reservationsQuery.isFetching}
          >
            <RefreshCcw className="w-4 h-4 mr-2" />
            {t('refresh') || 'Atualizar'}
          </Button>
        </div>

        {/* Tabs - apenas para admin */}
        {isAdmin && (
          <div className="flex gap-4 mt-6">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
                activeTab === 'pending'
                  ? 'bg-slate-200 text-slate-800'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Package className="w-4 h-4" />
              {t('pending') || 'Pendentes'}
              {pendingCount > 0 && (
                <span className="bg-slate-600 text-white text-xs px-2 py-0.5 rounded-full">
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
        )}
      </div>

      {/* Content */}
      <div className="px-8 py-6">
        {reservationsQuery.isLoading ? (
          <LoadingState variant="table" rows={5} columns={7} />
        ) : reservationsQuery.isError ? (
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
                            onClick={() => handleOpenCancel(reservation)}
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
      <Modal open={saleModalOpen} onClose={() => setSaleModalOpen(false)} size="md">
        <ModalHeader>
          <ModalTitle>{t('saleTitle') || 'Confirmar Venda'}</ModalTitle>
          <ModalClose onClose={() => setSaleModalOpen(false)} />
        </ModalHeader>
        <ModalContent>
          {sellingReservation && (
            <div className="space-y-4">
              {(() => {
                const batch = sellingReservation.batch;
                const slabArea = batch ? getSlabAreaM2(batch.height, batch.width) : 0;
                const totalArea = slabArea * sellingReservation.quantitySlabsReserved;
                const pricePerM2 = sellingReservation.reservedPrice || 0;
                const pricePerSlab = pricePerM2 > 0 && slabArea > 0 
                  ? calculateSlabPrice(pricePerM2, batch?.height || 0, batch?.width || 0)
                  : 0;
                const totalPrice = pricePerM2 * totalArea;
                
                return (
                  <>
                    {/* Informações do Produto */}
                    <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-slate-500" />
                        <span className="font-medium text-slate-900">
                          {batch?.product?.name}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 ml-6">
                        Lote: <span className="font-medium">{batch?.batchCode}</span>
                      </p>
                      {batch && (
                        <p className="text-sm text-slate-500 ml-6">
                          Dimensões: {formatDimensions(batch.height, batch.width)}
                        </p>
                      )}
                    </div>

                    {/* Detalhes da Reserva */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 rounded-lg p-3">
                        <p className="text-xs text-slate-500 mb-1">Quantidade</p>
                        <p className="text-lg font-semibold text-slate-900">
                          {sellingReservation.quantitySlabsReserved} chapas
                        </p>
                        <p className="text-xs text-slate-500">
                          {totalArea.toFixed(2)} m² total
                        </p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-3">
                        <p className="text-xs text-slate-500 mb-1">Área por chapa</p>
                        <p className="text-lg font-semibold text-slate-900">
                          {slabArea.toFixed(2)} m²
                        </p>
                      </div>
                    </div>

                    {/* Preços */}
                    <div className="border border-slate-200 rounded-lg divide-y divide-slate-200">
                      <div className="p-3 flex justify-between items-center">
                        <span className="text-sm text-slate-600">Preço por m²</span>
                        <span className="font-medium text-slate-900">
                          {formatCurrency(pricePerM2)}
                        </span>
                      </div>
                      <div className="p-3 flex justify-between items-center">
                        <span className="text-sm text-slate-600">Preço por chapa</span>
                        <span className="font-medium text-slate-900">
                          {formatCurrency(pricePerSlab)}
                        </span>
                      </div>
                      <div className="p-3 flex justify-between items-center bg-emerald-50">
                        <span className="text-sm font-medium text-emerald-800">Valor Total</span>
                        <span className="text-lg font-bold text-emerald-700">
                          {formatCurrency(totalPrice)}
                        </span>
                      </div>
                    </div>

                    {/* Broker */}
                    {sellingReservation.reservedBy && (
                      <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-3">
                        <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-slate-600" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Broker</p>
                          <p className="font-medium text-slate-900">
                            {sellingReservation.reservedBy.name}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Cliente (se informado) */}
                    {sellingReservation.cliente && (
                      <div className="flex items-center gap-3 bg-slate-50 rounded-lg p-3">
                        <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
                          <Building2 className="w-4 h-4 text-slate-600" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Cliente</p>
                          <p className="font-medium text-slate-900">
                            {sellingReservation.cliente.name}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Aviso se não tiver preço */}
                    {pricePerM2 <= 0 && (
                      <div className="flex items-start gap-2 bg-slate-100 border border-slate-200 rounded-lg p-3">
                        <AlertCircle className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                        <p className="text-sm text-slate-700">
                          Esta reserva não possui preço definido. Entre em contato com o broker.
                        </p>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </ModalContent>
        <ModalFooter className="flex gap-2">
          <Button
            variant="danger"
            onClick={handleRejectSale}
            loading={cancelReservation.isPending}
            className="flex items-center gap-2"
          >
            <XCircle className="w-4 h-4" />
            {t('reject') || 'Recusar'}
          </Button>
          <div className="flex-1" />
          <Button variant="secondary" onClick={() => setSaleModalOpen(false)}>
            {t('cancel') || 'Cancelar'}
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirmSale}
            disabled={salePrice <= 0}
            loading={confirmSale.isPending}
            className="flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            {t('confirmSaleButton') || 'Confirmar Venda'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Cancel Reservation Modal */}
      <Modal open={cancelModalOpen} onClose={() => setCancelModalOpen(false)}>
        <ModalHeader>
          <ModalTitle>Cancelar Reserva</ModalTitle>
          <ModalClose onClose={() => setCancelModalOpen(false)} />
        </ModalHeader>
        <ModalContent>
          {cancellingReservation && (
            <div className="space-y-4">
              {/* Warning */}
              <div className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-rose-800">
                    Atenção: Esta ação não pode ser desfeita
                  </p>
                  <p className="text-sm text-rose-600 mt-1">
                    As chapas reservadas voltarão a estar disponíveis no estoque.
                  </p>
                </div>
              </div>

              {/* Reservation Info */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Lote</p>
                    <p className="font-mono text-sm">{cancellingReservation.batch?.batchCode || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Produto</p>
                    <p className="text-sm font-medium">{cancellingReservation.batch?.product?.name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Quantidade</p>
                    <p className="text-sm font-medium text-emerald-600">{cancellingReservation.quantitySlabsReserved} chapas</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Reservado por</p>
                    <p className="text-sm">{cancellingReservation.reservedBy?.name || '-'}</p>
                  </div>
                </div>
                {cancellingReservation.reservedPrice && (
                  <div className="pt-3 border-t border-slate-200">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Preço Indicado</p>
                    <p className="text-sm font-medium">{formatCurrency(cancellingReservation.reservedPrice)}/m²</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </ModalContent>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setCancelModalOpen(false)}>
            Voltar
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirmCancel}
            loading={cancelReservation.isPending}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Cancelar Reserva
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
