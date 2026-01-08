package repository

import (
	"context"

	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
)

// MediaRepository define o contrato para operações com mídias
type MediaRepository interface {
	// FindProductMediaByID busca mídia de produto por ID
	FindProductMediaByID(ctx context.Context, id string) (*entity.ProductMedia, error)

	// FindBatchMediaByID busca mídia de lote por ID
	FindBatchMediaByID(ctx context.Context, id string) (*entity.BatchMedia, error)

	// CreateProductMedia cria uma nova mídia de produto
	CreateProductMedia(ctx context.Context, productID string, media *entity.CreateMediaInput) error

	// CreateBatchMedia cria uma nova mídia de lote
	CreateBatchMedia(ctx context.Context, batchID string, media *entity.CreateMediaInput) error

	// FindProductMedias busca mídias de um produto
	FindProductMedias(ctx context.Context, productID string) ([]entity.Media, error)

	// FindBatchMedias busca mídias de um lote
	FindBatchMedias(ctx context.Context, batchID string) ([]entity.Media, error)

	// DeleteProductMedia deleta mídia de produto
	DeleteProductMedia(ctx context.Context, id string) error

	// DeleteBatchMedia deleta mídia de lote
	DeleteBatchMedia(ctx context.Context, id string) error

	// UpdateDisplayOrder atualiza ordem de exibição de uma mídia
	UpdateDisplayOrder(ctx context.Context, id string, order int) error

	// SetCover define uma mídia como capa (e remove flag de outras)
	SetCover(ctx context.Context, productID, mediaID string) error
}
