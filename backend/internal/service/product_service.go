package service

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
	domainErrors "github.com/thiagomes07/CAVA/backend/internal/domain/errors"
	"github.com/thiagomes07/CAVA/backend/internal/domain/repository"
	"go.uber.org/zap"
)

type productService struct {
	productRepo repository.ProductRepository
	mediaRepo   repository.MediaRepository
	logger      *zap.Logger
}

func NewProductService(
	productRepo repository.ProductRepository,
	mediaRepo repository.MediaRepository,
	logger *zap.Logger,
) *productService {
	return &productService{
		productRepo: productRepo,
		mediaRepo:   mediaRepo,
		logger:      logger,
	}
}

func (s *productService) Create(ctx context.Context, industryID string, input entity.CreateProductInput) (*entity.Product, error) {
	// Validar material type
	if !input.Material.IsValid() {
		return nil, domainErrors.ValidationError("Tipo de material inválido")
	}

	// Validar finish type
	if !input.Finish.IsValid() {
		return nil, domainErrors.ValidationError("Tipo de acabamento inválido")
	}

	// Verificar se SKU já existe (se fornecido)
	if input.SKU != nil && *input.SKU != "" {
		exists, err := s.productRepo.ExistsBySKU(ctx, industryID, *input.SKU)
		if err != nil {
			s.logger.Error("erro ao verificar SKU existente", zap.Error(err))
			return nil, domainErrors.InternalError(err)
		}
		if exists {
			return nil, domainErrors.NewConflictError("SKU já cadastrado para esta indústria")
		}
	}

	// Criar produto
	product := &entity.Product{
		ID:              uuid.New().String(),
		IndustryID:      industryID,
		Name:            input.Name,
		SKU:             input.SKU,
		Material:        input.Material,
		Finish:          input.Finish,
		Description:     input.Description,
		BasePrice:       input.BasePrice,
		PriceUnit:       input.PriceUnit,
		IsPublic:        input.IsPublic,
		IsPublicCatalog: input.IsPublicCatalog,
		IsActive:        true,
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	// Se não definiu PriceUnit, usar M2 como padrão
	if product.PriceUnit == "" {
		product.PriceUnit = entity.PriceUnitM2
	}

	if err := s.productRepo.Create(ctx, product); err != nil {
		s.logger.Error("erro ao criar produto",
			zap.String("industryId", industryID),
			zap.Error(err),
		)
		return nil, err
	}

	s.logger.Info("produto criado com sucesso",
		zap.String("productId", product.ID),
		zap.String("name", product.Name),
		zap.String("industryId", industryID),
	)

	return product, nil
}

func (s *productService) GetByID(ctx context.Context, id string) (*entity.Product, error) {
	product, err := s.productRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Buscar mídias do produto
	medias, err := s.mediaRepo.FindProductMedias(ctx, id)
	if err != nil {
		s.logger.Error("erro ao buscar mídias do produto",
			zap.String("productId", id),
			zap.Error(err),
		)
		// Não retornar erro, apenas log
		medias = []entity.Media{}
	}
	product.Medias = medias

	// Buscar contagem de lotes
	batchCount, err := s.productRepo.CountBatchesByProductID(ctx, id)
	if err != nil {
		s.logger.Error("erro ao contar lotes do produto",
			zap.String("productId", id),
			zap.Error(err),
		)
		// Não retornar erro, apenas log
		batchCount = 0
	}
	product.BatchCount = &batchCount

	return product, nil
}

func (s *productService) List(ctx context.Context, industryID string, filters entity.ProductFilters) (*entity.ProductListResponse, error) {
	products, total, err := s.productRepo.FindByIndustryID(ctx, industryID, filters)
	if err != nil {
		s.logger.Error("erro ao listar produtos",
			zap.String("industryId", industryID),
			zap.Error(err),
		)
		return nil, err
	}

	// Buscar mídias para cada produto
	for i := range products {
		medias, err := s.mediaRepo.FindProductMedias(ctx, products[i].ID)
		if err != nil {
			s.logger.Warn("erro ao buscar mídias do produto",
				zap.String("productId", products[i].ID),
				zap.Error(err),
			)
			medias = []entity.Media{}
		}
		products[i].Medias = medias

		// Buscar contagem de lotes
		batchCount, err := s.productRepo.CountBatchesByProductID(ctx, products[i].ID)
		if err != nil {
			s.logger.Warn("erro ao contar lotes do produto",
				zap.String("productId", products[i].ID),
				zap.Error(err),
			)
			batchCount = 0
		}
		products[i].BatchCount = &batchCount
	}

	return &entity.ProductListResponse{
		Products: products,
		Total:    total,
		Page:     filters.Page,
	}, nil
}

func (s *productService) Update(ctx context.Context, id string, input entity.UpdateProductInput) (*entity.Product, error) {
	// Buscar produto
	product, err := s.productRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Atualizar campos fornecidos
	if input.Name != nil {
		product.Name = *input.Name
	}

	if input.SKU != nil {
		// Verificar se SKU já existe (exceto para este produto)
		exists, err := s.productRepo.ExistsBySKU(ctx, product.IndustryID, *input.SKU)
		if err != nil {
			s.logger.Error("erro ao verificar SKU existente", zap.Error(err))
			return nil, domainErrors.InternalError(err)
		}
		if exists {
			// Verificar se é o mesmo produto
			existingProduct, _ := s.productRepo.FindByID(ctx, id)
			if existingProduct == nil || existingProduct.SKU == nil || *existingProduct.SKU != *input.SKU {
				return nil, domainErrors.NewConflictError("SKU já cadastrado para esta indústria")
			}
		}
		product.SKU = input.SKU
	}

	if input.Material != nil {
		if !input.Material.IsValid() {
			return nil, domainErrors.ValidationError("Tipo de material inválido")
		}
		product.Material = *input.Material
	}

	if input.Finish != nil {
		if !input.Finish.IsValid() {
			return nil, domainErrors.ValidationError("Tipo de acabamento inválido")
		}
		product.Finish = *input.Finish
	}

	if input.Description != nil {
		product.Description = input.Description
	}

	if input.BasePrice != nil {
		product.BasePrice = input.BasePrice
	}

	if input.PriceUnit != nil {
		product.PriceUnit = *input.PriceUnit
	}

	if input.IsPublic != nil {
		product.IsPublic = *input.IsPublic
	}

	if input.IsPublicCatalog != nil {
		product.IsPublicCatalog = *input.IsPublicCatalog
	}

	product.UpdatedAt = time.Now()

	// Salvar alterações
	if err := s.productRepo.Update(ctx, product); err != nil {
		s.logger.Error("erro ao atualizar produto",
			zap.String("productId", id),
			zap.Error(err),
		)
		return nil, err
	}

	s.logger.Info("produto atualizado com sucesso", zap.String("productId", id))

	// Retornar produto atualizado com dados relacionados
	return s.GetByID(ctx, id)
}

func (s *productService) Delete(ctx context.Context, id string) error {
	// Verificar se produto tem lotes associados
	batchCount, err := s.productRepo.CountBlockingBatchesByProductID(ctx, id)
	if err != nil {
		s.logger.Error("erro ao verificar lotes do produto",
			zap.String("productId", id),
			zap.Error(err),
		)
		return domainErrors.InternalError(err)
	}

	if batchCount > 0 {
		return domainErrors.NewConflictError("Não foi possível excluir este produto pois ele tem lotes ainda disponíveis ou reservados")
	}

	// Soft delete do produto
	if err := s.productRepo.SoftDelete(ctx, id); err != nil {
		s.logger.Error("erro ao excluir produto",
			zap.String("productId", id),
			zap.Error(err),
		)
		return err
	}

	s.logger.Info("produto excluído com sucesso", zap.String("productId", id))
	return nil
}

func (s *productService) AddMedias(ctx context.Context, productID string, medias []entity.CreateMediaInput) error {
	// Verificar se produto existe
	_, err := s.productRepo.FindByID(ctx, productID)
	if err != nil {
		return err
	}

	// Adicionar cada mídia
	for _, media := range medias {
		if err := s.mediaRepo.CreateProductMedia(ctx, productID, &media); err != nil {
			s.logger.Error("erro ao adicionar mídia ao produto",
				zap.String("productId", productID),
				zap.String("url", media.URL),
				zap.Error(err),
			)
			return err
		}
	}

	s.logger.Info("mídias adicionadas ao produto",
		zap.String("productId", productID),
		zap.Int("count", len(medias)),
	)

	return nil
}

func (s *productService) RemoveMedia(ctx context.Context, productID, mediaID string) error {
	// Verificar se produto existe
	_, err := s.productRepo.FindByID(ctx, productID)
	if err != nil {
		return err
	}

	// Remover mídia
	if err := s.mediaRepo.DeleteProductMedia(ctx, mediaID); err != nil {
		s.logger.Error("erro ao remover mídia do produto",
			zap.String("productId", productID),
			zap.String("mediaId", mediaID),
			zap.Error(err),
		)
		return err
	}

	s.logger.Info("mídia removida do produto",
		zap.String("productId", productID),
		zap.String("mediaId", mediaID),
	)

	return nil
}
