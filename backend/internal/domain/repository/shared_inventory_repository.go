package repository

import (
	"context"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
)

// SharedInventoryRepository define o contrato para operações de compartilhamento
type SharedInventoryRepository interface {
	// CreateSharedBatch compartilha um lote com um broker
	CreateSharedBatch(ctx context.Context, shared *entity.SharedInventoryBatch) error

	// FindByBrokerID busca lotes compartilhados com um broker
	FindByBrokerID(ctx context.Context, brokerID string, filters entity.SharedInventoryFilters) ([]entity.SharedInventoryBatch, error)

	// FindByBatchID busca compartilhamentos de um lote específico
	FindByBatchID(ctx context.Context, batchID string) ([]entity.SharedInventoryBatch, error)

	// FindByID busca compartilhamento por ID
	FindByID(ctx context.Context, id string) (*entity.SharedInventoryBatch, error)

	// ExistsForBroker verifica se lote já está compartilhado com broker específico
	ExistsForBroker(ctx context.Context, batchID, brokerID string) (bool, error)

	// UpdateNegotiatedPrice atualiza o preço negociado
	UpdateNegotiatedPrice(ctx context.Context, id string, price *float64) error

	// Delete remove compartilhamento (hard delete)
	Delete(ctx context.Context, id string) error

	// CountSharedBatches conta lotes compartilhados com broker (por status)
	CountSharedBatches(ctx context.Context, brokerID string, status entity.BatchStatus) (int, error)

	// CreateCatalogPermission compartilha catálogo com broker
	CreateCatalogPermission(ctx context.Context, permission *entity.SharedCatalogPermission) error

	// FindCatalogPermissionByBroker busca permissão de catálogo do broker
	FindCatalogPermissionByBroker(ctx context.Context, industryID, brokerID string) (*entity.SharedCatalogPermission, error)

	// UpdateCatalogPermission atualiza permissão de catálogo
	UpdateCatalogPermission(ctx context.Context, permission *entity.SharedCatalogPermission) error

	// DeleteCatalogPermission remove permissão de catálogo
	DeleteCatalogPermission(ctx context.Context, id string) error
}