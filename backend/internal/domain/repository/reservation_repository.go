package repository

import (
	"context"
	"database/sql"
	"time"

	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
)

// ReservationRepository define o contrato para operações com reservas
type ReservationRepository interface {
	// Create cria uma nova reserva
	Create(ctx context.Context, tx *sql.Tx, reservation *entity.Reservation) error

	// FindByID busca reserva por ID
	FindByID(ctx context.Context, id string) (*entity.Reservation, error)

	// FindByBatchID busca reservas de um lote
	FindByBatchID(ctx context.Context, batchID string) ([]entity.Reservation, error)

	// FindActive busca reservas ativas (não expiradas)
	FindActive(ctx context.Context, userID string) ([]entity.Reservation, error)

	// FindExpired busca reservas expiradas para job de limpeza
	FindExpired(ctx context.Context) ([]entity.Reservation, error)

	// Update atualiza os dados da reserva
	Update(ctx context.Context, reservation *entity.Reservation) error

	// UpdateStatus atualiza o status da reserva
	UpdateStatus(ctx context.Context, tx *sql.Tx, id string, status entity.ReservationStatus) error

	// Cancel cancela uma reserva
	Cancel(ctx context.Context, tx *sql.Tx, id string) error

	// List lista reservas com filtros
	List(ctx context.Context, filters entity.ReservationFilters) ([]entity.Reservation, error)

	// FindByIndustry busca todas as reservas de uma indústria
	FindByIndustry(ctx context.Context, industryID string) ([]entity.Reservation, error)

	// FindPendingByIndustry busca reservas pendentes de aprovação por indústria
	FindPendingByIndustry(ctx context.Context, industryID string) ([]entity.Reservation, error)

	// FindPendingExpired busca reservas pendentes que expiraram o prazo de aprovação
	FindPendingExpired(ctx context.Context) ([]entity.Reservation, error)

	// Approve aprova uma reserva (atualiza status e campos de aprovação)
	Approve(ctx context.Context, tx *sql.Tx, id, approverID string, expiresAt time.Time) error

	// Reject rejeita uma reserva (atualiza status e motivo)
	Reject(ctx context.Context, tx *sql.Tx, id, approverID, reason string) error
}