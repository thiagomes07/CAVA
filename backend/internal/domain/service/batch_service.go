package service

import (
	"context"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
)

// BatchService define o contrato para operações com lotes
type BatchService interface {
	// Create cria um novo lote (calcula área total automaticamente)
	Create(ctx context.Context, industryID string, input entity.CreateBatchInput) (*entity.Batch, error)

	// GetByID busca lote por ID com dados relacionados
	GetByID(ctx context.Context, id string) (*entity.Batch, error)

	// CheckStatus verifica status do lote (para verificação de disponibilidade)
	CheckStatus(ctx context.Context, id string) (*entity.Batch, error)

	// List lista lotes com filtros e paginação
	List(ctx context.Context, industryID string, filters entity.BatchFilters) (*entity.BatchListResponse, error)

	// Update atualiza lote (recalcula área se dimensões mudarem)
	Update(ctx context.Context, id string, input entity.UpdateBatchInput) (*entity.Batch, error)

	// UpdateStatus atualiza apenas o status do lote
	UpdateStatus(ctx context.Context, id string, status entity.BatchStatus) (*entity.Batch, error)

	// CheckAvailability verifica se lote está disponível
	CheckAvailability(ctx context.Context, id string) (bool, error)

	// AddMedias adiciona mídias ao lote
	AddMedias(ctx context.Context, batchID string, medias []entity.CreateMediaInput) error

	// RemoveMedia remove mídia do lote
	RemoveMedia(ctx context.Context, batchID, mediaID string) error
}