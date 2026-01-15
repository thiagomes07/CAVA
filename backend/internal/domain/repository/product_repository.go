package repository

import (
	"context"

	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
)

// ProductRepository define o contrato para operações com produtos
type ProductRepository interface {
	// Create cria um novo produto
	Create(ctx context.Context, product *entity.Product) error

	// FindByID busca produto por ID
	FindByID(ctx context.Context, id string) (*entity.Product, error)

	// FindByIndustryID busca produtos por indústria com filtros
	FindByIndustryID(ctx context.Context, industryID string, filters entity.ProductFilters) ([]entity.Product, int, error)

	// Update atualiza os dados do produto
	Update(ctx context.Context, product *entity.Product) error

	// SoftDelete desativa o produto (soft delete)
	SoftDelete(ctx context.Context, id string) error

	// CountBatchesByProductID conta quantos lotes estão associados ao produto
	CountBatchesByProductID(ctx context.Context, productID string) (int, error)

	// CountBlockingBatchesByProductID conta lotes que impedem exclusão do produto
	CountBlockingBatchesByProductID(ctx context.Context, productID string) (int, error)

	// ExistsBySKU verifica se o SKU já está em uso na indústria
	ExistsBySKU(ctx context.Context, industryID, sku string) (bool, error)
}
