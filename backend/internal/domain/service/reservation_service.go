package service

import (
	"context"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
)

// ReservationService define o contrato para operações com reservas
type ReservationService interface {
	// Create cria reserva (verifica disponibilidade, atualiza status lote - TRANSAÇÃO)
	// Para brokers, a reserva vai para PENDENTE_APROVACAO; para indústria, vai para ATIVA
	Create(ctx context.Context, userID string, userRole entity.UserRole, input entity.CreateReservationInput) (*entity.Reservation, error)

	// GetByID busca reserva por ID
	GetByID(ctx context.Context, id string) (*entity.Reservation, error)

	// Cancel cancela reserva (volta status do lote para DISPONIVEL)
	Cancel(ctx context.Context, id string) error

	// ConfirmSale confirma venda (cria SalesHistory, atualiza status lote - TRANSAÇÃO)
	ConfirmSale(ctx context.Context, reservationID, userID string, input entity.ConfirmSaleInput) (*entity.Sale, error)

	// ListActive lista reservas ativas do usuário
	ListActive(ctx context.Context, userID string) ([]entity.Reservation, error)

	// ListByUser lista todas as reservas do usuário (broker)
	ListByUser(ctx context.Context, userID string) ([]entity.Reservation, error)

	// ListByIndustry lista todas as reservas da indústria (admin)
	ListByIndustry(ctx context.Context, industryID string) ([]entity.Reservation, error)

	// ListPending lista reservas pendentes de aprovação
	ListPending(ctx context.Context, industryID string) ([]entity.Reservation, error)

	// Approve aprova uma reserva pendente (admin)
	Approve(ctx context.Context, reservationID, approverID string) (*entity.Reservation, error)

	// Reject rejeita uma reserva pendente (admin)
	Reject(ctx context.Context, reservationID, approverID string, reason string) (*entity.Reservation, error)

	// ExpireReservations job para expirar reservas vencidas
	ExpireReservations(ctx context.Context) (int, error)

	// ExpirePendingApprovals job para expirar reservas pendentes de aprovação
	ExpirePendingApprovals(ctx context.Context) (int, error)
}