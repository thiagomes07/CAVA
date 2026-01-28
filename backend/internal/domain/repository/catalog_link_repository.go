package repository

import (
	"context"

	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
)

// CatalogLinkRepository define o contrato para operações com links de catálogo
type CatalogLinkRepository interface {
	// Create cria um novo link de catálogo
	Create(ctx context.Context, link *entity.CatalogLink, batchIDs []string) error

	// FindByID busca link por ID
	FindByID(ctx context.Context, id string) (*entity.CatalogLink, error)

	// FindBySlug busca link por slug token
	FindBySlug(ctx context.Context, slug string) (*entity.CatalogLink, error)

	// List lista links de catálogo de uma indústria ou de um usuário específico
	// Se userID for fornecido, filtra por created_by_user_id (para brokers)
	// Caso contrário, filtra por industryID
	List(ctx context.Context, industryID string, userID *string) ([]entity.CatalogLink, error)

	// Update atualiza um link de catálogo
	Update(ctx context.Context, link *entity.CatalogLink, batchIDs *[]string) error

	// Delete remove um link de catálogo
	Delete(ctx context.Context, id string) error

	// IncrementViews incrementa o contador de visualizações
	IncrementViews(ctx context.Context, id string) error

	// ExistsBySlug verifica se o slug já está em uso
	ExistsBySlug(ctx context.Context, slug string) (bool, error)
}
