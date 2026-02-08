package service

import (
	"context"
	"database/sql"
	"time"

	"github.com/google/uuid"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
	domainErrors "github.com/thiagomes07/CAVA/backend/internal/domain/errors"
	"github.com/thiagomes07/CAVA/backend/internal/domain/repository"
	"go.uber.org/zap"
)

type BatchDB interface {
	BeginTx(ctx context.Context) (*sql.Tx, error)
	ExecuteInTx(ctx context.Context, fn func(*sql.Tx) error) error
}

type batchService struct {
	batchRepo   repository.BatchRepository
	productRepo repository.ProductRepository
	mediaRepo   repository.MediaRepository
	salesRepo   repository.SalesHistoryRepository
	clienteRepo repository.ClienteRepository
	sharedRepo  repository.SharedInventoryRepository
	userRepo    repository.UserRepository
	db          BatchDB
	logger      *zap.Logger
}

func NewBatchService(
	batchRepo repository.BatchRepository,
	productRepo repository.ProductRepository,
	mediaRepo repository.MediaRepository,
	salesRepo repository.SalesHistoryRepository,
	clienteRepo repository.ClienteRepository,
	sharedRepo repository.SharedInventoryRepository,
	userRepo repository.UserRepository,
	db BatchDB,
	logger *zap.Logger,
) *batchService {
	return &batchService{
		batchRepo:   batchRepo,
		productRepo: productRepo,
		mediaRepo:   mediaRepo,
		salesRepo:   salesRepo,
		clienteRepo: clienteRepo,
		sharedRepo:  sharedRepo,
		userRepo:    userRepo,
		db:          db,
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
		ReservedSlabs:  0,
		SoldSlabs:      0,
		InactiveSlabs:  0,
		IndustryPrice:  input.IndustryPrice,
		PriceUnit:      priceUnit,
		OriginQuarry:   input.OriginQuarry,
		EntryDate:      entryDate,
		Status:         entity.BatchStatusDisponivel,
		IsActive:       true,
		IsPublic:       false, // Por padrão, lotes não são públicos
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

	// Compartilhar automaticamente com todos os vendedores internos da indústria
	s.shareWithInternalSellers(ctx, batch.ID, industryID)

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
		newQuantity := *input.QuantitySlabs
		unavailable := batch.ReservedSlabs + batch.SoldSlabs + batch.InactiveSlabs
		if newQuantity < unavailable {
			return nil, domainErrors.ValidationError("Quantidade não pode ser menor que chapas já reservadas/vendidas/inativas")
		}
		// Recalcular disponíveis com base na nova quantidade
		batch.AvailableSlabs = newQuantity - unavailable
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

	if input.IsPublic != nil {
		batch.IsPublic = *input.IsPublic
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

func (s *batchService) UpdateAvailability(ctx context.Context, id string, status entity.BatchStatus, fromStatus *entity.BatchStatus, quantity int) (*entity.Batch, error) {
	if !status.IsValid() {
		return nil, domainErrors.ValidationError("Status inválido")
	}
	if fromStatus != nil && !fromStatus.IsValid() {
		return nil, domainErrors.ValidationError("Status de origem inválido")
	}
	if quantity <= 0 {
		return nil, domainErrors.ValidationError("Quantidade deve ser maior que 0")
	}

	batch, err := s.batchRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	newAvailable := batch.AvailableSlabs
	newReserved := batch.ReservedSlabs
	newSold := batch.SoldSlabs
	newInactive := batch.InactiveSlabs

	if fromStatus != nil {
		origin := *fromStatus
		if origin == status {
			return nil, domainErrors.ValidationError("Origem e destino são iguais")
		}
		if origin == entity.BatchStatusVendido {
			return nil, domainErrors.ValidationError("Para remover itens vendidos, utiliza a tela de Vendas para desfazer a venda.")
		}

		getCount := func(st entity.BatchStatus) int {
			switch st {
			case entity.BatchStatusDisponivel:
				return newAvailable
			case entity.BatchStatusReservado:
				return newReserved
			case entity.BatchStatusVendido:
				return newSold
			case entity.BatchStatusInativo:
				return newInactive
			default:
				return 0
			}
		}

		if quantity > getCount(origin) {
			return nil, domainErrors.ValidationError("Quantidade excede chapas na origem")
		}

		switch origin {
		case entity.BatchStatusDisponivel:
			newAvailable -= quantity
		case entity.BatchStatusReservado:
			newReserved -= quantity
		case entity.BatchStatusVendido:
			newSold -= quantity
		case entity.BatchStatusInativo:
			newInactive -= quantity
		}

		switch status {
		case entity.BatchStatusDisponivel:
			newAvailable += quantity
		case entity.BatchStatusReservado:
			newReserved += quantity
		case entity.BatchStatusVendido:
			newSold += quantity
		case entity.BatchStatusInativo:
			newInactive += quantity
		}
	} else if status == entity.BatchStatusDisponivel {
		totalNonAvailable := batch.ReservedSlabs + batch.SoldSlabs + batch.InactiveSlabs
		if totalNonAvailable <= 0 {
			return nil, domainErrors.ValidationError("Não há chapas indisponíveis para liberar")
		}
		if quantity > totalNonAvailable {
			return nil, domainErrors.ValidationError("Quantidade excede chapas indisponíveis")
		}
		newAvailable = batch.AvailableSlabs + quantity
		remaining := quantity
		if remaining > 0 {
			take := minInt(remaining, newInactive)
			newInactive -= take
			remaining -= take
		}
		if remaining > 0 {
			take := minInt(remaining, newReserved)
			newReserved -= take
			remaining -= take
		}
		if remaining > 0 {
			take := minInt(remaining, newSold)
			newSold -= take
			remaining -= take
		}
	} else {
		if quantity > batch.AvailableSlabs {
			return nil, domainErrors.ValidationError("Quantidade excede chapas disponíveis")
		}
		newAvailable = batch.AvailableSlabs - quantity
		switch status {
		case entity.BatchStatusReservado:
			newReserved += quantity
		case entity.BatchStatusVendido:
			newSold += quantity
		case entity.BatchStatusInativo:
			newInactive += quantity
		}
	}

	newStatus := deriveBatchStatus(newAvailable, newReserved, newSold, newInactive)

	if err := s.batchRepo.UpdateSlabCounts(ctx, nil, id, newAvailable, newReserved, newSold, newInactive); err != nil {
		s.logger.Error("erro ao ajustar chapas do lote",
			zap.String("batchId", id),
			zap.Error(err),
		)
		return nil, err
	}

	if newStatus != batch.Status {
		if err := s.batchRepo.UpdateStatus(ctx, nil, id, newStatus); err != nil {
			s.logger.Error("erro ao ajustar status do lote",
				zap.String("batchId", id),
				zap.String("status", string(newStatus)),
				zap.Error(err),
			)
			return nil, err
		}
	}

	s.logger.Info("lote ajustado por quantidade",
		zap.String("batchId", id),
		zap.String("status", string(status)),
		zap.Int("quantity", quantity),
		zap.Int("availableSlabs", newAvailable),
	)

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

func minInt(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// shareWithInternalSellers compartilha automaticamente o lote com todos os vendedores internos da indústria
func (s *batchService) shareWithInternalSellers(ctx context.Context, batchID, industryID string) {
	// Buscar todos os usuários da indústria com role VENDEDOR_INTERNO
	vendedorRole := entity.RoleVendedorInterno
	users, err := s.userRepo.ListByIndustry(ctx, industryID, &vendedorRole)
	if err != nil {
		s.logger.Error("erro ao buscar vendedores internos para compartilhamento automático",
			zap.String("batchId", batchID),
			zap.String("industryId", industryID),
			zap.Error(err),
		)
		return
	}

	if len(users) == 0 {
		s.logger.Debug("nenhum vendedor interno encontrado para compartilhamento automático",
			zap.String("batchId", batchID),
			zap.String("industryId", industryID),
		)
		return
	}

	// Compartilhar com cada vendedor interno ativo
	sharedCount := 0
	for _, user := range users {
		if !user.IsActive {
			continue
		}

		shared := &entity.SharedInventoryBatch{
			ID:               uuid.New().String(),
			BatchID:          batchID,
			SharedWithUserID: user.ID,
			IndustryOwnerID:  industryID,
			SharedAt:         time.Now(),
			IsActive:         true,
		}

		if err := s.sharedRepo.CreateSharedBatch(ctx, shared); err != nil {
			s.logger.Warn("erro ao compartilhar lote automaticamente com vendedor interno",
				zap.String("batchId", batchID),
				zap.String("userId", user.ID),
				zap.String("userName", user.Name),
				zap.Error(err),
			)
			continue
		}
		sharedCount++
	}

	s.logger.Info("lote compartilhado automaticamente com vendedores internos",
		zap.String("batchId", batchID),
		zap.Int("vendedoresCompartilhados", sharedCount),
		zap.Int("totalVendedores", len(users)),
	)
}

func deriveBatchStatus(available, reserved, sold, inactive int) entity.BatchStatus {
	if available > 0 {
		return entity.BatchStatusDisponivel
	}
	if reserved > 0 {
		return entity.BatchStatusReservado
	}
	if sold > 0 {
		return entity.BatchStatusVendido
	}
	if inactive > 0 {
		return entity.BatchStatusInativo
	}
	return entity.BatchStatusDisponivel
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

func (s *batchService) Sell(ctx context.Context, userID string, input entity.CreateSaleInput) (*entity.Batch, error) {
	// Validações básicas
	if input.QuantitySlabsSold <= 0 {
		return nil, domainErrors.ValidationError("Quantidade vendida deve ser maior que 0")
	}
	if input.SalePrice <= 0 {
		return nil, domainErrors.ValidationError("Preço de venda deve ser maior que 0")
	}

	var updatedBatch *entity.Batch

	err := s.db.ExecuteInTx(ctx, func(tx *sql.Tx) error {
		// 1. Lock no Batch
		batch, err := s.batchRepo.FindByIDForUpdate(ctx, tx, input.BatchID)
		if err != nil {
			return err
		}

		// 2. Verificar disponibilidade
		if !batch.HasAvailableSlabs(input.QuantitySlabsSold) {
			return domainErrors.InsufficientSlabsError(input.QuantitySlabsSold, batch.AvailableSlabs)
		}

		// 3. Gerenciar Cliente (Criar Novo se necessário)
		var clienteID *string = input.ClienteID
		var customerName = input.CustomerName
		var customerContact = input.CustomerContact

		if input.NewClient != nil {
			// Criar novo cliente
			var email *string
			var phone *string
			if input.NewClient.Email != "" {
				email = &input.NewClient.Email
			}
		if input.NewClient.Phone != "" {
			phone = &input.NewClient.Phone
		}
		newCliente := &entity.Cliente{
			ID:             uuid.New().String(),
			SalesLinkID:    "", // Será convertido para NULL pelo NULLIF no repositório
			Name:           input.NewClient.Name,
			Email:          email,
			Phone:          phone,
			MarketingOptIn: false,
			CreatedAt:      time.Now(),
			UpdatedAt:      time.Now(),
		}

		if err := s.clienteRepo.Create(ctx, tx, newCliente); err != nil {
			s.logger.Error("erro ao criar cliente na venda", zap.Error(err))
			return err
		}
		clienteID = &newCliente.ID
			customerName = newCliente.Name
			if newCliente.Email != nil && *newCliente.Email != "" {
				customerContact = *newCliente.Email
			} else if newCliente.Phone != nil && *newCliente.Phone != "" {
				customerContact = *newCliente.Phone
			}
		}

		// 4. Criar Registro de Venda
		// Determine SoldByUserID: use input if provided, otherwise nil (for custom seller names)
		var soldByUserIDForSale *string = nil
		if input.SoldByUserID != nil && *input.SoldByUserID != "" {
			soldByUserIDForSale = input.SoldByUserID
		}

		sale := &entity.Sale{
			ID:                uuid.New().String(),
			BatchID:           batch.ID,
			SoldByUserID:      soldByUserIDForSale, // Can be nil if using custom seller name
			SellerName:        input.SellerName,
			IndustryID:        batch.IndustryID,
			ClienteID:         clienteID,
			CustomerName:      customerName,
			CustomerContact:   customerContact,
			QuantitySlabsSold: input.QuantitySlabsSold,
			TotalAreaSold:     input.TotalAreaSold,
			PricePerUnit:      input.PricePerUnit,
			PriceUnit:         input.PriceUnit,
			SalePrice:         input.SalePrice,
			BrokerCommission:  input.BrokerCommission,
			NetIndustryValue:  input.NetIndustryValue,
			InvoiceURL:        input.InvoiceURL,
			Notes:             input.Notes,
			SaleDate:          time.Now(),
			CreatedAt:         time.Now(),
		}

		if err := s.salesRepo.Create(ctx, tx, sale); err != nil {
			s.logger.Error("erro ao criar registro de venda", zap.Error(err))
			return err
		}

		// 5. Atualizar Lote (Chapas)
		newAvailable := batch.AvailableSlabs - input.QuantitySlabsSold
		newSold := batch.SoldSlabs + input.QuantitySlabsSold

		if err := s.batchRepo.UpdateSlabCounts(ctx, tx, batch.ID, newAvailable, batch.ReservedSlabs, newSold, batch.InactiveSlabs); err != nil {
			return err
		}

		// 6. Atualizar Status se necessário
		newStatus := deriveBatchStatus(newAvailable, batch.ReservedSlabs, newSold, batch.InactiveSlabs)

		if newStatus != batch.Status {
			if err := s.batchRepo.UpdateStatus(ctx, tx, batch.ID, newStatus); err != nil {
				return err
			}
		}

		// Buscar lote atualizado para retorno
		updatedBatch, err = s.batchRepo.FindByID(ctx, batch.ID)
		if err != nil {
			return err
		}

		s.logger.Info("venda realizada com sucesso",
			zap.String("saleId", sale.ID),
			zap.String("batchId", batch.ID),
			zap.Int("quantity", input.QuantitySlabsSold),
		)

		return nil
	})

	return updatedBatch, err
}

func (s *batchService) Archive(ctx context.Context, id string) error {
	batch, err := s.batchRepo.FindByID(ctx, id)
	if err != nil {
		return err
	}

	if !batch.IsActive {
		return domainErrors.ValidationError("Lote já está arquivado")
	}

	if err := s.batchRepo.Archive(ctx, id); err != nil {
		s.logger.Error("erro ao arquivar lote",
			zap.String("batchId", id),
			zap.Error(err),
		)
		return err
	}

	s.logger.Info("lote arquivado", zap.String("batchId", id))
	return nil
}

func (s *batchService) Restore(ctx context.Context, id string) error {
	batch, err := s.batchRepo.FindByID(ctx, id)
	if err != nil {
		return err
	}

	if batch.IsActive {
		return domainErrors.ValidationError("Lote não está arquivado")
	}

	if err := s.batchRepo.Restore(ctx, id); err != nil {
		s.logger.Error("erro ao restaurar lote",
			zap.String("batchId", id),
			zap.Error(err),
		)
		return err
	}

	s.logger.Info("lote restaurado", zap.String("batchId", id))
	return nil
}

func (s *batchService) Delete(ctx context.Context, id string) error {
	if err := s.batchRepo.Delete(ctx, id); err != nil {
		s.logger.Error("erro ao deletar lote",
			zap.String("batchId", id),
			zap.Error(err),
		)
		return err
	}

	s.logger.Info("lote deletado permanentemente", zap.String("batchId", id))
	return nil
}
