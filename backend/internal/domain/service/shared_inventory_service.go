package service

import (
	"context"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
)

// SharedInventoryService define o contrato para operações de compartilhamento
type SharedInventoryService interface {
	// ShareBatch compartilha lote com broker (verifica duplicata)
	ShareBatch(ctx context.Context, industryID string, input entity.CreateSharedInventoryInput) (*entity.SharedInventoryBatch, error)

	// RemoveSharedBatch remove compartilhamento
	RemoveSharedBatch(ctx context.Context, id string) error

	// UpdateNegotiatedPrice atualiza preço negociado (apenas usuário pode atualizar seu próprio)
	UpdateNegotiatedPrice(ctx context.Context, id, userID string, price *float64) (*entity.SharedInventoryBatch, error)

	// GetUserInventory busca inventário compartilhado do usuário (broker ou vendedor interno)
	GetUserInventory(ctx context.Context, userID string, filters entity.SharedInventoryFilters) ([]entity.SharedInventoryBatch, error)

	// GetSharedBatchesByBatchID busca todos os compartilhamentos de um lote
	GetSharedBatchesByBatchID(ctx context.Context, batchID string) ([]entity.SharedInventoryBatch, error)

	// ExistsForUser verifica se lote está compartilhado com usuário específico
	ExistsForUser(ctx context.Context, batchID, userID string) (bool, error)

	// ShareCatalog compartilha catálogo completo com broker
	ShareCatalog(ctx context.Context, industryID string, input entity.CreateSharedCatalogInput) (*entity.SharedCatalogPermission, error)

	// RevokeCatalogAccess remove acesso ao catálogo
	RevokeCatalogAccess(ctx context.Context, industryID, userID string) error
}