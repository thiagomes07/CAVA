package service

import (
	"context"

	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
)

// CatalogLinkService define o contrato para operações com links de catálogo
type CatalogLinkService interface {
	// Create cria um novo link de catálogo
	Create(ctx context.Context, industryID, userID string, input entity.CreateCatalogLinkInput) (*entity.CatalogLink, error)

	// GetByID busca um link por ID
	GetByID(ctx context.Context, id string) (*entity.CatalogLink, error)

	// GetBySlug busca um link por slug
	GetBySlug(ctx context.Context, slug string) (*entity.CatalogLink, error)

	// GetPublicBySlug busca dados públicos de um link por slug
	GetPublicBySlug(ctx context.Context, slug string) (*entity.PublicCatalogLink, error)

	// List lista links de catálogo de uma indústria ou de um usuário específico
	// Se userID for fornecido, filtra por created_by_user_id (para brokers)
	List(ctx context.Context, industryID string, userID *string) ([]entity.CatalogLink, error)

	// Update atualiza um link de catálogo
	Update(ctx context.Context, id, industryID string, input entity.UpdateCatalogLinkInput) (*entity.CatalogLink, error)

	// Delete remove um link de catálogo
	Delete(ctx context.Context, id, industryID string) error

	// IncrementViews incrementa o contador de visualizações
	IncrementViews(ctx context.Context, id string) error

	// ValidateSlug valida se slug está disponível
	ValidateSlug(ctx context.Context, slug string) (bool, error)

	// GenerateFullURL gera URL completa do link
	GenerateFullURL(slug string) string
}
