package repository

import (
	"context"

	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
)

// SharedCatalogPermissionRepository define o contrato para operações com permissões de catálogo compartilhado
type SharedCatalogPermissionRepository interface {
	// Create cria uma nova permissão de compartilhamento
	Create(ctx context.Context, permission *entity.SharedCatalogPermission) error

	// FindByID busca permissão por ID
	FindByID(ctx context.Context, id string) (*entity.SharedCatalogPermission, error)

	// FindByIndustryID busca todas as permissões de uma indústria
	FindByIndustryID(ctx context.Context, industryID string) ([]entity.SharedCatalogPermission, error)

	// FindByUserID busca todas as permissões de um usuário (broker)
	FindByUserID(ctx context.Context, userID string) ([]entity.SharedCatalogPermission, error)

	// FindByIndustryAndUser busca permissão específica
	FindByIndustryAndUser(ctx context.Context, industryID, userID string) (*entity.SharedCatalogPermission, error)

	// Update atualiza uma permissão
	Update(ctx context.Context, permission *entity.SharedCatalogPermission) error

	// Delete remove uma permissão
	Delete(ctx context.Context, industryID, userID string) error

	// ExistsByIndustryAndUser verifica se a permissão já existe
	ExistsByIndustryAndUser(ctx context.Context, industryID, userID string) (bool, error)
}
