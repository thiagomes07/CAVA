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

type batchService struct {
	batchRepo   repository.BatchRepository
	productRepo repository.ProductRepository
	mediaRepo   repository.MediaRepository
	logger      *zap.Logger
}

func NewBatchService(
	batchRepo repository.BatchRepository,
	productRepo repository.ProductRepository,
	mediaRepo repository.MediaRepository,
	logger *zap.Logger,
) *batchService {
	return &batchService{
		batchRepo:   batchRepo,
		productRepo: productRepo,
		mediaRepo:   mediaRepo,
		logger:      logger,
	}
}

func (s *batchService) Create(ctx context.Context, industryID string, input entity.CreateBatchInput) (*entity.Batch, error) {
	var productID string

	// Se NewProduct é fornecido, cria o produto inline
	if input.NewProduct != nil {
		product := &entity.Product{
			ID:          uuid.New().String(),
			IndustryID:  industryID,
			Name:        input.NewProduct.Name,
			SKU:         input.NewProduct.SKU,
			Material:    input.NewProduct.Material,
			Finish:      input.NewProduct.Finish,
			Description: input.NewProduct.Description,
			IsPublic:    input.NewProduct.IsPublic,
			IsActive:    true,
			CreatedAt:   time.Now(),
			UpdatedAt:   time.Now(),
		}

		if err := s.productRepo.Create(ctx, product); err != nil {
			s.logger.Error("erro ao criar produto inline", zap.Error(err))
			return nil, err
		}
		productID = product.ID
		s.logger.Info("produto criado inline",
			zap.String("productId", product.ID),
			zap.String("productName", product.Name),
		)
	} else {
		// Validar que produto existe e pertence à indústria
		product, err := s.productRepo.FindByID(ctx, *input.ProductID)
		if err != nil {
			return nil, err
		}
		if product.IndustryID != industryID {
			return nil, domainErrors.ForbiddenError()
		}
		productID = *input.ProductID
	}

	// Validar e formatar batch code
	batchCode, err := entity.NewBatchCode(input.BatchCode)
	if err != nil {
		return nil, domainErrors.ValidationError(err.Error())
	}

	// Verificar se código de lote já existe na indústria
	exists, err := s.batchRepo.ExistsByCode(ctx, industryID, batchCode.String())
	if err != nil {
		s.logger.Error("erro ao verificar código de lote existente", zap.Error(err))
		return nil, domainErrors.InternalError(err)
	}
	if exists {
		return nil, domainErrors.BatchCodeExistsError(batchCode.String())
	}

	// Validar dimensões
	if input.Height <= 0 || input.Height > 1000 {
		return nil, domainErrors.ValidationError("Altura deve estar entre 0 e 1000 cm")
	}
	if input.Width <= 0 || input.Width > 1000 {
		return nil, domainErrors.ValidationError("Largura deve estar entre 0 e 1000 cm")
	}
	if input.Thickness <= 0 || input.Thickness > 100 {
		return nil, domainErrors.ValidationError("Espessura deve estar entre 0 e 100 cm")
	}
	if input.QuantitySlabs <= 0 {
		return nil, domainErrors.ValidationError("Quantidade de chapas deve ser maior que 0")
	}

	// Validar preço
	if input.IndustryPrice <= 0 {
		return nil, domainErrors.ValidationError("Preço deve ser maior que 0")
	}

	// Validar unidade de preço (default M2)
	priceUnit := entity.PriceUnitM2
	if input.PriceUnit != "" {
		if !input.PriceUnit.IsValid() {
			return nil, domainErrors.ValidationError("Unidade de preço inválida. Use M2 ou FT2")
		}
		priceUnit = input.PriceUnit
	}

	// Validar data de entrada (aceita ISO date ou RFC3339) e não pode ser futura
	entryDate, err := time.Parse(time.RFC3339, input.EntryDate)
	if err != nil {
		entryDate, err = time.Parse("2006-01-02", input.EntryDate)
	}
	if err != nil {
		return nil, domainErrors.ValidationError("Data de entrada inválida")
	}
	if entryDate.After(time.Now()) {
		return nil, domainErrors.ValidationError("Data de entrada não pode ser futura")
	}

	// Criar lote
	batch := &entity.Batch{
		ID:             uuid.New().String(),
		ProductID:      productID,
		IndustryID:     industryID,
		BatchCode:      batchCode.String(),
		Height:         input.Height,
		Width:          input.Width,
		Thickness:      input.Thickness,
		QuantitySlabs:  input.QuantitySlabs,
		AvailableSlabs: input.QuantitySlabs, // Inicialmente todas as chapas estão disponíveis
		IndustryPrice:  input.IndustryPrice,
		PriceUnit:      priceUnit,
		OriginQuarry:   input.OriginQuarry,
		EntryDate:      entryDate,
		Status:         entity.BatchStatusDisponivel,
		IsActive:       true,
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}

	// Calcular área total
	batch.CalculateTotalArea()

	if err := s.batchRepo.Create(ctx, batch); err != nil {
		s.logger.Error("erro ao criar lote",
			zap.String("industryId", industryID),
			zap.String("batchCode", batch.BatchCode),
			zap.Error(err),
		)
		return nil, err
	}

	s.logger.Info("lote criado com sucesso",
		zap.String("batchId", batch.ID),
		zap.String("batchCode", batch.BatchCode),
		zap.Float64("totalArea", batch.TotalArea),
		zap.String("priceUnit", string(batch.PriceUnit)),
		zap.Int("quantitySlabs", batch.QuantitySlabs),
	)

	return batch, nil
}

func (s *batchService) GetByID(ctx context.Context, id string) (*entity.Batch, error) {
	batch, err := s.batchRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Buscar produto relacionado
	product, err := s.productRepo.FindByID(ctx, batch.ProductID)
	if err != nil {
		s.logger.Warn("erro ao buscar produto do lote",
			zap.String("batchId", id),
			zap.String("productId", batch.ProductID),
			zap.Error(err),
		)
	} else {
		batch.Product = product
	}

	// Buscar mídias do lote
	medias, err := s.mediaRepo.FindBatchMedias(ctx, id)
	if err != nil {
		s.logger.Warn("erro ao buscar mídias do lote",
			zap.String("batchId", id),
			zap.Error(err),
		)
		medias = []entity.Media{}
	}
	batch.Medias = medias

	return batch, nil
}

func (s *batchService) CheckStatus(ctx context.Context, id string) (*entity.Batch, error) {
	return s.batchRepo.FindByID(ctx, id)
}

func (s *batchService) List(ctx context.Context, industryID string, filters entity.BatchFilters) (*entity.BatchListResponse, error) {
	batches, total, err := s.batchRepo.List(ctx, industryID, filters)
	if err != nil {
		s.logger.Error("erro ao listar lotes",
			zap.String("industryId", industryID),
			zap.Error(err),
		)
		return nil, err
	}

	// Buscar dados relacionados para cada lote
	for i := range batches {
		// Buscar produto
		product, err := s.productRepo.FindByID(ctx, batches[i].ProductID)
		if err != nil {
			s.logger.Warn("erro ao buscar produto do lote",
				zap.String("batchId", batches[i].ID),
				zap.Error(err),
			)
		} else {
			batches[i].Product = product
		}

		// Buscar mídias
		medias, err := s.mediaRepo.FindBatchMedias(ctx, batches[i].ID)
		if err != nil {
			s.logger.Warn("erro ao buscar mídias do lote",
				zap.String("batchId", batches[i].ID),
				zap.Error(err),
			)
			medias = []entity.Media{}
		}
		batches[i].Medias = medias
	}

	return &entity.BatchListResponse{
		Batches: batches,
		Total:   total,
		Page:    filters.Page,
	}, nil
}

func (s *batchService) Update(ctx context.Context, id string, input entity.UpdateBatchInput) (*entity.Batch, error) {
	// Buscar lote
	batch, err := s.batchRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	dimensionsChanged := false

	// Atualizar campos fornecidos
	if input.BatchCode != nil {
		batchCode, err := entity.NewBatchCode(*input.BatchCode)
		if err != nil {
			return nil, domainErrors.ValidationError(err.Error())
		}

		// Verificar se código já existe (se mudou)
		if batchCode.String() != batch.BatchCode {
			exists, err := s.batchRepo.ExistsByCode(ctx, batch.IndustryID, batchCode.String())
			if err != nil {
				s.logger.Error("erro ao verificar código de lote", zap.Error(err))
				return nil, domainErrors.InternalError(err)
			}
			if exists {
				return nil, domainErrors.BatchCodeExistsError(batchCode.String())
			}
		}

		batch.BatchCode = batchCode.String()
	}

	if input.Height != nil {
		if *input.Height <= 0 || *input.Height > 1000 {
			return nil, domainErrors.ValidationError("Altura deve estar entre 0 e 1000 cm")
		}
		batch.Height = *input.Height
		dimensionsChanged = true
	}

	if input.Width != nil {
		if *input.Width <= 0 || *input.Width > 1000 {
			return nil, domainErrors.ValidationError("Largura deve estar entre 0 e 1000 cm")
		}
		batch.Width = *input.Width
		dimensionsChanged = true
	}

	if input.Thickness != nil {
		if *input.Thickness <= 0 || *input.Thickness > 100 {
			return nil, domainErrors.ValidationError("Espessura deve estar entre 0 e 100 cm")
		}
		batch.Thickness = *input.Thickness
		dimensionsChanged = true
	}

	if input.QuantitySlabs != nil {
		if *input.QuantitySlabs <= 0 {
			return nil, domainErrors.ValidationError("Quantidade de chapas deve ser maior que 0")
		}
		// Ajustar available_slabs proporcionalmente se quantity_slabs mudar
		oldQuantity := batch.QuantitySlabs
		newQuantity := *input.QuantitySlabs
		if newQuantity < batch.QuantitySlabs-batch.AvailableSlabs {
			return nil, domainErrors.ValidationError("Quantidade não pode ser menor que chapas já reservadas/vendidas")
		}
		// Ajustar available_slabs se aumentar a quantidade
		if newQuantity > oldQuantity {
			batch.AvailableSlabs += (newQuantity - oldQuantity)
		} else if newQuantity < oldQuantity {
			// Se diminuir, reduz das disponíveis
			reduction := oldQuantity - newQuantity
			if batch.AvailableSlabs >= reduction {
				batch.AvailableSlabs -= reduction
			}
		}
		batch.QuantitySlabs = *input.QuantitySlabs
		dimensionsChanged = true
	}

	if input.IndustryPrice != nil {
		if *input.IndustryPrice <= 0 {
			return nil, domainErrors.ValidationError("Preço deve ser maior que 0")
		}
		batch.IndustryPrice = *input.IndustryPrice
	}

	if input.PriceUnit != nil {
		if !input.PriceUnit.IsValid() {
			return nil, domainErrors.ValidationError("Unidade de preço inválida. Use M2 ou FT2")
		}
		batch.PriceUnit = *input.PriceUnit
	}

	if input.OriginQuarry != nil {
		batch.OriginQuarry = input.OriginQuarry
	}

	// Recalcular área se dimensões mudaram
	if dimensionsChanged {
		batch.CalculateTotalArea()
	}

	batch.UpdatedAt = time.Now()

	// Salvar alterações
	if err := s.batchRepo.Update(ctx, batch); err != nil {
		s.logger.Error("erro ao atualizar lote",
			zap.String("batchId", id),
			zap.Error(err),
		)
		return nil, err
	}

	s.logger.Info("lote atualizado com sucesso",
		zap.String("batchId", id),
		zap.Bool("dimensionsChanged", dimensionsChanged),
	)

	// Retornar lote atualizado com dados relacionados
	return s.GetByID(ctx, id)
}

func (s *batchService) UpdateStatus(ctx context.Context, id string, status entity.BatchStatus) (*entity.Batch, error) {
	// Validar status
	if !status.IsValid() {
		return nil, domainErrors.ValidationError("Status inválido")
	}

	// Atualizar status
	if err := s.batchRepo.UpdateStatus(ctx, nil, id, status); err != nil {
		s.logger.Error("erro ao atualizar status do lote",
			zap.String("batchId", id),
			zap.String("status", string(status)),
			zap.Error(err),
		)
		return nil, err
	}

	s.logger.Info("status do lote atualizado",
		zap.String("batchId", id),
		zap.String("status", string(status)),
	)

	// Retornar lote atualizado
	return s.GetByID(ctx, id)
}

func (s *batchService) CheckAvailability(ctx context.Context, id string) (bool, error) {
	batch, err := s.batchRepo.FindByID(ctx, id)
	if err != nil {
		return false, err
	}

	return batch.IsAvailable(), nil
}

// CheckAvailabilityForQuantity verifica se o lote tem quantidade suficiente de chapas disponíveis
func (s *batchService) CheckAvailabilityForQuantity(ctx context.Context, id string, quantity int) (bool, error) {
	batch, err := s.batchRepo.FindByID(ctx, id)
	if err != nil {
		return false, err
	}

	return batch.HasAvailableSlabs(quantity), nil
}

// ConvertPrice converte um preço de uma unidade para outra
func (s *batchService) ConvertPrice(price float64, from, to entity.PriceUnit) float64 {
	return entity.ConvertPrice(price, from, to)
}

func (s *batchService) AddMedias(ctx context.Context, batchID string, medias []entity.CreateMediaInput) error {
	// Verificar se lote existe
	_, err := s.batchRepo.FindByID(ctx, batchID)
	if err != nil {
		return err
	}

	// Adicionar cada mídia
	for _, media := range medias {
		if err := s.mediaRepo.CreateBatchMedia(ctx, batchID, &media); err != nil {
			s.logger.Error("erro ao adicionar mídia ao lote",
				zap.String("batchId", batchID),
				zap.String("url", media.URL),
				zap.Error(err),
			)
			return err
		}
	}

	s.logger.Info("mídias adicionadas ao lote",
		zap.String("batchId", batchID),
		zap.Int("count", len(medias)),
	)

	return nil
}

func (s *batchService) RemoveMedia(ctx context.Context, batchID, mediaID string) error {
	// Verificar se lote existe
	_, err := s.batchRepo.FindByID(ctx, batchID)
	if err != nil {
		return err
	}

	// Remover mídia
	if err := s.mediaRepo.DeleteBatchMedia(ctx, mediaID); err != nil {
		s.logger.Error("erro ao remover mídia do lote",
			zap.String("batchId", batchID),
			zap.String("mediaId", mediaID),
			zap.Error(err),
		)
		return err
	}

	s.logger.Info("mídia removida do lote",
		zap.String("batchId", batchID),
		zap.String("mediaId", mediaID),
	)

	return nil
}
