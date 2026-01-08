package service

import (
	"context"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
)

// ReservationService define o contrato para operações com reservas
type ReservationService interface {
	// Create cria reserva (verifica disponibilidade, atualiza status lote - TRANSAÇÃO)
	Create(ctx context.Context, userID string, input entity.CreateReservationInput) (*entity.Reservation, error)

	// GetByID busca reserva por ID
	GetByID(ctx context.Context, id string) (*entity.Reservation, error)

	// Cancel cancela reserva (volta status do lote para DISPONIVEL)
	Cancel(ctx context.Context, id string) error

	// ConfirmSale confirma venda (cria SalesHistory, atualiza status lote - TRANSAÇÃO)
	ConfirmSale(ctx context.Context, reservationID, userID string, input entity.ConfirmSaleInput) (*entity.Sale, error)

	// ListActive lista reservas ativas
	ListActive(ctx context.Context, userID string) ([]entity.Reservation, error)

	// ExpireReservations job para expirar reservas vencidas
	ExpireReservations(ctx context.Context) (int, error)
}