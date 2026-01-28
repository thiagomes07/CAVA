package service

import (
	"context"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
	domainErrors "github.com/thiagomes07/CAVA/backend/internal/domain/errors"
	"github.com/thiagomes07/CAVA/backend/internal/domain/repository"
	"go.uber.org/zap"
)

var slugRegex = regexp.MustCompile(`^[a-z0-9]+(-[a-z0-9]+)*$`)

type salesLinkService struct {
	linkRepo         repository.SalesLinkRepository
	batchRepo        repository.BatchRepository
	productRepo      repository.ProductRepository
	mediaRepo        repository.MediaRepository
	userRepo         repository.UserRepository
	sharedInventoryRepo repository.SharedInventoryRepository
	baseURL          string
	logger           *zap.Logger
}

func NewSalesLinkService(
	linkRepo repository.SalesLinkRepository,
	batchRepo repository.BatchRepository,
	productRepo repository.ProductRepository,
	mediaRepo repository.MediaRepository,
	userRepo repository.UserRepository,
	sharedInventoryRepo repository.SharedInventoryRepository,
	baseURL string,
	logger *zap.Logger,
) *salesLinkService {
	return &salesLinkService{
		linkRepo:         linkRepo,
		batchRepo:        batchRepo,
		productRepo:      productRepo,
		mediaRepo:        mediaRepo,
		userRepo:         userRepo,
		sharedInventoryRepo: sharedInventoryRepo,
		baseURL:          baseURL,
		logger:           logger,
	}
}

func (s *salesLinkService) Create(ctx context.Context, userID, industryID string, input entity.CreateSalesLinkInput) (*entity.CreateSalesLinkResponse, error) {
	// Validar tipo de link
	if !input.LinkType.IsValid() {
		return nil, domainErrors.ValidationError("Tipo de link inválido")
	}

	// Validar slug
	if err := s.validateSlugFormat(input.SlugToken); err != nil {
		return nil, err
	}

	// Verificar se slug já existe
	exists, err := s.linkRepo.ExistsBySlug(ctx, input.SlugToken)
	if err != nil {
		s.logger.Error("erro ao verificar slug existente", zap.Error(err))
		return nil, domainErrors.InternalError(err)
	}
	if exists {
		return nil, domainErrors.SlugExistsError(input.SlugToken)
	}

	// Validar campos polimórficos baseado no tipo de link
	// industryID pode ser atualizado para brokers (usa industryID do batch/produto)
	updatedIndustryID, err := s.validateLinkTypeFields(ctx, userID, industryID, input)
	if err != nil {
		return nil, err
	}
	industryID = updatedIndustryID

	// Validar preço de exibição (se fornecido)
	if input.DisplayPrice != nil && *input.DisplayPrice <= 0 {
		return nil, domainErrors.ValidationError("Preço de exibição deve ser maior que 0")
	}

	// Validar data de expiração (se fornecida)
	var expiresAt *time.Time
	if input.ExpiresAt != nil {
		expiration, err := time.Parse(time.RFC3339, *input.ExpiresAt)
		if err != nil {
			return nil, domainErrors.ValidationError("Data de expiração inválida")
		}
		if expiration.Before(time.Now()) {
			return nil, domainErrors.ValidationError("Data de expiração deve ser futura")
		}
		expiresAt = &expiration
	}

	// Criar link de venda
	link := &entity.SalesLink{
		ID:              uuid.New().String(),
		CreatedByUserID: userID,
		IndustryID:      industryID,
		BatchID:         input.BatchID,
		ProductID:       input.ProductID,
		LinkType:        input.LinkType,
		SlugToken:       input.SlugToken,
		Title:           input.Title,
		CustomMessage:   input.CustomMessage,
		DisplayPrice:    input.DisplayPrice,
		ShowPrice:       input.ShowPrice,
		ViewsCount:      0,
		ExpiresAt:       expiresAt,
		IsActive:        input.IsActive,
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	if err := s.linkRepo.Create(ctx, link); err != nil {
		s.logger.Error("erro ao criar link de venda",
			zap.String("userId", userID),
			zap.String("slug", input.SlugToken),
			zap.Error(err),
		)
		return nil, err
	}

	// Gerar URL completa
	fullURL := s.GenerateFullURL(input.SlugToken)

	s.logger.Info("link de venda criado com sucesso",
		zap.String("linkId", link.ID),
		zap.String("slug", input.SlugToken),
		zap.String("type", string(input.LinkType)),
	)

	return &entity.CreateSalesLinkResponse{
		ID:      link.ID,
		FullURL: fullURL,
	}, nil
}

func (s *salesLinkService) GetByID(ctx context.Context, id string) (*entity.SalesLink, error) {
	link, err := s.linkRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Gerar URL completa
	fullURL := s.GenerateFullURL(link.SlugToken)
	link.FullURL = &fullURL

	// Buscar dados relacionados
	if err := s.populateLinkData(ctx, link); err != nil {
		s.logger.Warn("erro ao popular dados do link",
			zap.String("linkId", id),
			zap.Error(err),
		)
	}

	return link, nil
}

func (s *salesLinkService) GetBySlug(ctx context.Context, slug string) (*entity.SalesLink, error) {
	link, err := s.linkRepo.FindBySlug(ctx, slug)
	if err != nil {
		return nil, err
	}

	// Verificar se link está ativo
	if !link.IsActive {
		return nil, domainErrors.NewNotFoundError("Link de venda")
	}

	// Verificar se link expirou
	if link.IsExpired() {
		return nil, domainErrors.NewNotFoundError("Link de venda")
	}

	// Gerar URL completa
	fullURL := s.GenerateFullURL(link.SlugToken)
	link.FullURL = &fullURL

	// Buscar dados relacionados
	if err := s.populateLinkData(ctx, link); err != nil {
		s.logger.Warn("erro ao popular dados do link",
			zap.String("slug", slug),
			zap.Error(err),
		)
	}

	return link, nil
}

func (s *salesLinkService) GetPublicBySlug(ctx context.Context, slug string) (*entity.PublicSalesLink, error) {
	link, err := s.linkRepo.FindBySlug(ctx, slug)
	if err != nil {
		return nil, err
	}

	if !link.IsActive {
		return nil, domainErrors.NewNotFoundError("Link de venda")
	}

	if link.IsExpired() {
		return nil, domainErrors.NewNotFoundError("Link de venda")
	}

	result := &entity.PublicSalesLink{
		ShowPrice: link.ShowPrice,
	}

	if link.Title != nil {
		result.Title = *link.Title
	}
	if link.CustomMessage != nil {
		result.CustomMessage = *link.CustomMessage
	}
	if link.ShowPrice && link.DisplayPrice != nil {
		result.DisplayPrice = link.DisplayPrice
	}

	// Buscar batch com mídias
	if link.BatchID != nil {
		batch, err := s.batchRepo.FindByID(ctx, *link.BatchID)
		if err != nil {
			s.logger.Warn("erro ao buscar batch", zap.Error(err))
		} else {
			medias, _ := s.mediaRepo.FindBatchMedias(ctx, batch.ID)
			publicBatch := &entity.PublicBatch{
				BatchCode:    batch.BatchCode,
				Height:       batch.Height,
				Width:        batch.Width,
				Thickness:    batch.Thickness,
				TotalArea:    batch.TotalArea,
				OriginQuarry: batch.OriginQuarry,
				Medias:       medias,
			}

			// Buscar produto relacionado ao batch
			if batch.ProductID != "" {
				product, err := s.productRepo.FindByID(ctx, batch.ProductID)
				if err == nil {
					publicBatch.ProductName = product.Name
					publicBatch.Material = string(product.Material)
					publicBatch.Finish = string(product.Finish)
				}
			}

			result.Batch = publicBatch
		}
	}

	// Buscar produto (se não for lote)
	if link.ProductID != nil && link.BatchID == nil {
		product, err := s.productRepo.FindByID(ctx, *link.ProductID)
		if err != nil {
			s.logger.Warn("erro ao buscar produto", zap.Error(err))
		} else {
			medias, _ := s.mediaRepo.FindProductMedias(ctx, product.ID)
			result.Product = &entity.PublicProduct{
				Name:        product.Name,
				Material:    string(product.Material),
				Finish:      string(product.Finish),
				Description: product.Description,
				Medias:      medias,
			}
		}
	}

	return result, nil
}

func (s *salesLinkService) List(ctx context.Context, filters entity.SalesLinkFilters) (*entity.SalesLinkListResponse, error) {
	links, total, err := s.linkRepo.List(ctx, filters)
	if err != nil {
		s.logger.Error("erro ao listar links", zap.Error(err))
		return nil, err
	}

	// Gerar URLs completas e popular dados
	for i := range links {
		fullURL := s.GenerateFullURL(links[i].SlugToken)
		links[i].FullURL = &fullURL

		if err := s.populateLinkData(ctx, &links[i]); err != nil {
			s.logger.Warn("erro ao popular dados do link",
				zap.String("linkId", links[i].ID),
				zap.Error(err),
			)
		}
	}

	return &entity.SalesLinkListResponse{
		Links: links,
		Total: total,
		Page:  filters.Page,
	}, nil
}

func (s *salesLinkService) Update(ctx context.Context, id string, input entity.UpdateSalesLinkInput) (*entity.SalesLink, error) {
	// Buscar link
	link, err := s.linkRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Atualizar campos fornecidos
	if input.Title != nil {
		link.Title = input.Title
	}

	if input.CustomMessage != nil {
		link.CustomMessage = input.CustomMessage
	}

	if input.DisplayPrice != nil {
		if *input.DisplayPrice <= 0 {
			return nil, domainErrors.ValidationError("Preço de exibição deve ser maior que 0")
		}
		link.DisplayPrice = input.DisplayPrice
	}

	if input.ShowPrice != nil {
		link.ShowPrice = *input.ShowPrice
	}

	if input.ExpiresAt != nil {
		expiration, err := time.Parse(time.RFC3339, *input.ExpiresAt)
		if err != nil {
			return nil, domainErrors.ValidationError("Data de expiração inválida")
		}
		if expiration.Before(time.Now()) {
			return nil, domainErrors.ValidationError("Data de expiração deve ser futura")
		}
		link.ExpiresAt = &expiration
	}

	if input.IsActive != nil {
		link.IsActive = *input.IsActive
	}

	link.UpdatedAt = time.Now()

	// Salvar alterações
	if err := s.linkRepo.Update(ctx, link); err != nil {
		s.logger.Error("erro ao atualizar link",
			zap.String("linkId", id),
			zap.Error(err),
		)
		return nil, err
	}

	s.logger.Info("link atualizado com sucesso", zap.String("linkId", id))

	// Retornar link atualizado
	return s.GetByID(ctx, id)
}

func (s *salesLinkService) Delete(ctx context.Context, id string) error {
	// Soft delete
	if err := s.linkRepo.SoftDelete(ctx, id); err != nil {
		s.logger.Error("erro ao excluir link",
			zap.String("linkId", id),
			zap.Error(err),
		)
		return err
	}

	s.logger.Info("link excluído com sucesso", zap.String("linkId", id))
	return nil
}

func (s *salesLinkService) ValidateSlug(ctx context.Context, slug string) (bool, error) {
	// Validar formato
	if err := s.validateSlugFormat(slug); err != nil {
		return false, nil // Slug inválido no formato
	}

	// Verificar se já existe
	exists, err := s.linkRepo.ExistsBySlug(ctx, slug)
	if err != nil {
		s.logger.Error("erro ao validar slug", zap.Error(err))
		return false, domainErrors.InternalError(err)
	}

	return !exists, nil // Retorna true se NÃO existe (disponível)
}

func (s *salesLinkService) IncrementViews(ctx context.Context, id string) error {
	if err := s.linkRepo.IncrementViews(ctx, id); err != nil {
		s.logger.Error("erro ao incrementar views",
			zap.String("linkId", id),
			zap.Error(err),
		)
		// Não retornar erro - incremento de views não deve bloquear
		return nil
	}
	return nil
}

func (s *salesLinkService) GenerateFullURL(slug string) string {
	return s.baseURL + "/pt/" + slug
}

// validateSlugFormat valida o formato do slug
func (s *salesLinkService) validateSlugFormat(slug string) error {
	if len(slug) < 3 {
		return domainErrors.ValidationError("Slug deve ter pelo menos 3 caracteres")
	}
	if len(slug) > 50 {
		return domainErrors.ValidationError("Slug deve ter no máximo 50 caracteres")
	}
	if !slugRegex.MatchString(slug) {
		if strings.HasPrefix(slug, "-") || strings.HasSuffix(slug, "-") {
			return domainErrors.ValidationError("Slug não pode começar ou terminar com hífen")
		}
		if strings.Contains(slug, "--") {
			return domainErrors.ValidationError("Slug não pode conter hífens consecutivos")
		}
		return domainErrors.ValidationError("Slug deve conter apenas letras minúsculas, números e hífens")
	}
	return nil
}

// validateLinkTypeFields valida campos polimórficos baseado no tipo de link
// Retorna o industryID atualizado (pode ser diferente para brokers)
func (s *salesLinkService) validateLinkTypeFields(ctx context.Context, userID, industryID string, input entity.CreateSalesLinkInput) (string, error) {
	switch input.LinkType {
	case entity.LinkTypeLoteUnico:
		// LOTE_UNICO: batchId obrigatório, productId deve ser null
		if input.BatchID == nil {
			return "", domainErrors.ValidationError("BatchId é obrigatório para link de lote único")
		}
		if input.ProductID != nil {
			return "", domainErrors.ValidationError("ProductId não pode ser fornecido para link de lote único")
		}
		// Validar que batch existe
		batch, err := s.batchRepo.FindByID(ctx, *input.BatchID)
		if err != nil {
			return "", err
		}
		
		// Se industryID está vazio (broker), verificar se batch está compartilhado
		if industryID == "" {
			exists, err := s.sharedInventoryRepo.ExistsForUser(ctx, *input.BatchID, userID)
			if err != nil {
				return "", err
			}
			if !exists {
				return "", domainErrors.ForbiddenError()
			}
			// Usar industryID do batch para brokers
			industryID = batch.IndustryID
		} else {
			// Se industryID não está vazio (admin/vendedor), validar que batch pertence à indústria
			if batch.IndustryID != industryID {
				return "", domainErrors.ForbiddenError()
			}
		}

	case entity.LinkTypeProdutoGeral:
		// PRODUTO_GERAL: productId obrigatório, batchId deve ser null
		if input.ProductID == nil {
			return "", domainErrors.ValidationError("ProductId é obrigatório para link de produto geral")
		}
		if input.BatchID != nil {
			return "", domainErrors.ValidationError("BatchId não pode ser fornecido para link de produto geral")
		}
		// Validar que produto existe
		product, err := s.productRepo.FindByID(ctx, *input.ProductID)
		if err != nil {
			return "", err
		}
		
		// Se industryID está vazio (broker), verificar se há lotes compartilhados deste produto
		if industryID == "" {
			// Para brokers, verificar se há pelo menos um lote compartilhado deste produto
			// Buscar lotes do produto compartilhados com o broker
			batches, err := s.batchRepo.FindByProductID(ctx, *input.ProductID)
			if err != nil {
				return "", err
			}
			hasSharedBatch := false
			for _, batch := range batches {
				exists, err := s.sharedInventoryRepo.ExistsForUser(ctx, batch.ID, userID)
				if err == nil && exists {
					hasSharedBatch = true
					// Usar industryID do primeiro batch compartilhado
					industryID = batch.IndustryID
					break
				}
			}
			if !hasSharedBatch {
				return "", domainErrors.ForbiddenError()
			}
		} else {
			// Se industryID não está vazio (admin/vendedor), validar que produto pertence à indústria
			if product.IndustryID != industryID {
				return "", domainErrors.ForbiddenError()
			}
		}

	case entity.LinkTypeCatalogoCompleto:
		// CATALOGO_COMPLETO: ambos devem ser null
		if input.BatchID != nil || input.ProductID != nil {
			return "", domainErrors.ValidationError("BatchId e ProductId devem ser null para link de catálogo completo")
		}
	}

	return industryID, nil
}

// populateLinkData popula dados relacionados do link
func (s *salesLinkService) populateLinkData(ctx context.Context, link *entity.SalesLink) error {
	// Buscar batch se for lote único
	if link.BatchID != nil {
		batch, err := s.batchRepo.FindByID(ctx, *link.BatchID)
		if err != nil {
			return err
		}
		link.Batch = batch
	}

	// Buscar produto se for produto geral
	if link.ProductID != nil {
		product, err := s.productRepo.FindByID(ctx, *link.ProductID)
		if err != nil {
			return err
		}
		link.Product = product
	}

	if link.CreatedByUserID != "" {
		user, err := s.userRepo.FindByID(ctx, link.CreatedByUserID)
		if err != nil {
			s.logger.Warn("erro ao buscar usuário criador do link",
				zap.String("userId", link.CreatedByUserID),
				zap.Error(err),
			)
		} else {
			link.CreatedBy = user
		}
	}

	return nil
}