package service

import (
	"context"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
)

// SalesLinkService define o contrato para operações com links de venda
type SalesLinkService interface {
	// Create cria link de venda (valida slug único, linkType vs batchId/productId)
	Create(ctx context.Context, userID, industryID string, input entity.CreateSalesLinkInput) (*entity.CreateSalesLinkResponse, error)

	// GetByID busca link por ID
	GetByID(ctx context.Context, id string) (*entity.SalesLink, error)

	// GetBySlug busca link por slug (para landing page pública)
	GetBySlug(ctx context.Context, slug string) (*entity.SalesLink, error)

	// List lista links com filtros
	List(ctx context.Context, filters entity.SalesLinkFilters) (*entity.SalesLinkListResponse, error)

	// Update atualiza link
	Update(ctx context.Context, id string, input entity.UpdateSalesLinkInput) (*entity.SalesLink, error)

	// Delete desativa link
	Delete(ctx context.Context, id string) error

	// ValidateSlug valida se slug está disponível
	ValidateSlug(ctx context.Context, slug string) (bool, error)

	// IncrementViews incrementa contador de visualizações
	IncrementViews(ctx context.Context, id string) error

	// GenerateFullURL gera URL completa do link
	GenerateFullURL(slug string) string
}