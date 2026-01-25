package repository

import (
	"context"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
)

// SharedInventoryRepository define o contrato para operações de compartilhamento
type SharedInventoryRepository interface {
	// CreateSharedBatch compartilha um lote com um broker
	CreateSharedBatch(ctx context.Context, shared *entity.SharedInventoryBatch) error

	// FindByUserID busca lotes compartilhados com um usuário (broker ou vendedor interno)
	FindByUserID(ctx context.Context, userID string, filters entity.SharedInventoryFilters) ([]entity.SharedInventoryBatch, error)

	// FindByBatchID busca compartilhamentos de um lote específico
	FindByBatchID(ctx context.Context, batchID string) ([]entity.SharedInventoryBatch, error)

	// FindByID busca compartilhamento por ID
	FindByID(ctx context.Context, id string) (*entity.SharedInventoryBatch, error)

	// ExistsForUser verifica se lote já está compartilhado com usuário específico
	ExistsForUser(ctx context.Context, batchID, userID string) (bool, error)

	// UpdateNegotiatedPrice atualiza o preço negociado
	UpdateNegotiatedPrice(ctx context.Context, id string, price *float64) error

	// Delete remove compartilhamento (hard delete)
	Delete(ctx context.Context, id string) error

	// CountSharedBatches conta lotes compartilhados com usuário (por status)
	CountSharedBatches(ctx context.Context, userID string, status entity.BatchStatus) (int, error)

	// CreateCatalogPermission compartilha catálogo com usuário (broker ou vendedor interno)
	CreateCatalogPermission(ctx context.Context, permission *entity.SharedCatalogPermission) error

	// FindCatalogPermissionByUser busca permissão de catálogo do usuário
	FindCatalogPermissionByUser(ctx context.Context, industryID, userID string) (*entity.SharedCatalogPermission, error)

	// UpdateCatalogPermission atualiza permissão de catálogo
	UpdateCatalogPermission(ctx context.Context, permission *entity.SharedCatalogPermission) error

	// DeleteCatalogPermission remove permissão de catálogo
	DeleteCatalogPermission(ctx context.Context, id string) error
}