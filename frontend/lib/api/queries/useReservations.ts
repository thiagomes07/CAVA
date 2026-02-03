import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import type { Reservation } from '@/lib/types';

export const reservationKeys = {
  all: ['reservations'] as const,
  lists: () => [...reservationKeys.all, 'list'] as const,
  pending: () => [...reservationKeys.all, 'pending'] as const,
  details: () => [...reservationKeys.all, 'detail'] as const,
  detail: (id: string) => [...reservationKeys.details(), id] as const,
};

export function useMyReservations() {
  return useQuery({
    queryKey: [...reservationKeys.all, 'my'] as const,
    queryFn: async () => {
      const data = await apiClient.get<Reservation[]>('/reservations/my');
      return data;
    },
  });
}

export function useAllReservations(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: reservationKeys.lists(),
    queryFn: async () => {
      const data = await apiClient.get<Reservation[]>('/reservations');
      return data;
    },
    enabled: options?.enabled ?? true,
  });
}

export function usePendingReservations(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: reservationKeys.pending(),
    queryFn: async () => {
      const data = await apiClient.get<Reservation[]>('/reservations/pending');
      return data;
    },
    enabled: options?.enabled ?? true,
  });
}

export function usePendingReservationsCount(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...reservationKeys.pending(), 'count'] as const,
    queryFn: async () => {
      const data = await apiClient.get<Reservation[]>('/reservations');
      // Filtrar apenas reservas ATIVA (pendentes de confirmação)
      const pending = data.filter(r => r.status === 'ATIVA');
      return pending.length;
    },
    enabled: options?.enabled ?? true,
    refetchInterval: 30000, // Atualiza a cada 30 segundos
  });
}

export function useApproveReservation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reservationId: string) => {
      const data = await apiClient.post<Reservation>(
        `/reservations/${reservationId}/approve`
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reservationKeys.all });
      queryClient.invalidateQueries({ queryKey: ['bi'] });
    },
  });
}

export function useRejectReservation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reservationId, reason }: { reservationId: string; reason: string }) => {
      const data = await apiClient.post<Reservation>(
        `/reservations/${reservationId}/reject`,
        { reason }
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reservationKeys.all });
      queryClient.invalidateQueries({ queryKey: ['bi'] });
    },
  });
}

export function useCreateReservation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      batchId: string;
      quantitySlabsReserved: number;
      clienteId?: string;
      customerName?: string;
      customerContact?: string;
      reservedPrice?: number;     // Preço indicado pelo broker
      brokerSoldPrice?: number;   // Preço interno do broker
      notes?: string;
      expiresAt?: string;
    }) => {
      const data = await apiClient.post<Reservation>('/reservations', input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reservationKeys.all });
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      queryClient.invalidateQueries({ queryKey: ['shared-inventory'] });
    },
  });
}

export function useCancelReservation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reservationId: string) => {
      await apiClient.delete(`/reservations/${reservationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reservationKeys.all });
      queryClient.invalidateQueries({ queryKey: ['batches'] });
    },
  });
}

export function useConfirmSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      reservationId,
      ...input
    }: {
      reservationId: string;
      quantitySlabsSold: number;
      finalSoldPrice: number;
      invoiceUrl?: string;
      notes?: string;
    }) => {
      const data = await apiClient.post(`/reservations/${reservationId}/confirm-sale`, input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reservationKeys.all });
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['bi'] });
    },
  });
}
