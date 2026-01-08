package service

import (
	"context"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
)

// ProductService define o contrato para operações com produtos
type ProductService interface {
	// Create cria um novo produto com validações de negócio
	Create(ctx context.Context, industryID string, input entity.CreateProductInput) (*entity.Product, error)

	// GetByID busca produto por ID com dados relacionados
	GetByID(ctx context.Context, id string) (*entity.Product, error)

	// List lista produtos com filtros
	List(ctx context.Context, industryID string, filters entity.ProductFilters) (*entity.ProductListResponse, error)

	// Update atualiza produto
	Update(ctx context.Context, id string, input entity.UpdateProductInput) (*entity.Product, error)

	// Delete desativa produto (verifica se tem lotes associados)
	Delete(ctx context.Context, id string) error

	// AddMedias adiciona mídias ao produto
	AddMedias(ctx context.Context, productID string, medias []entity.CreateMediaInput) error

	// RemoveMedia remove mídia do produto
	RemoveMedia(ctx context.Context, productID, mediaID string) error
}