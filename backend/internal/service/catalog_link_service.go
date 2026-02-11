package service

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
	domainErrors "github.com/thiagomes07/CAVA/backend/internal/domain/errors"
	"github.com/thiagomes07/CAVA/backend/internal/domain/repository"
	domainService "github.com/thiagomes07/CAVA/backend/internal/domain/service"
	"go.uber.org/zap"
)

type catalogLinkService struct {
	catalogLinkRepo repository.CatalogLinkRepository
	batchRepo       repository.BatchRepository
	productRepo     repository.ProductRepository
	mediaRepo       repository.MediaRepository
	industryRepo    repository.IndustryRepository
	publicLinkBaseURL string
	logger          *zap.Logger
}

func NewCatalogLinkService(
	catalogLinkRepo repository.CatalogLinkRepository,
	batchRepo repository.BatchRepository,
	productRepo repository.ProductRepository,
	mediaRepo repository.MediaRepository,
	industryRepo repository.IndustryRepository,
	publicLinkBaseURL string,
	logger *zap.Logger,
) domainService.CatalogLinkService {
	return &catalogLinkService{
		catalogLinkRepo:   catalogLinkRepo,
		batchRepo:         batchRepo,
		productRepo:       productRepo,
		mediaRepo:         mediaRepo,
		industryRepo:      industryRepo,
		publicLinkBaseURL: publicLinkBaseURL,
		logger:            logger,
	}
}

func (s *catalogLinkService) Create(ctx context.Context, industryID, userID string, input entity.CreateCatalogLinkInput) (*entity.CatalogLink, error) {
	// Validar que o slug não existe
	exists, err := s.catalogLinkRepo.ExistsBySlug(ctx, input.SlugToken)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, domainErrors.SlugExistsError(input.SlugToken)
	}
	if !input.DisplayCurrency.IsValid() {
		return nil, domainErrors.ValidationError("Moeda de exibição inválida")
	}

	// Se industryID estiver vazio (broker), obter do primeiro lote
	if industryID == "" {
		if len(input.BatchIDs) == 0 {
			return nil, domainErrors.ValidationError("Selecione pelo menos um lote")
		}
		firstBatch, err := s.batchRepo.FindByID(ctx, input.BatchIDs[0])
		if err != nil {
			return nil, domainErrors.NewNotFoundError("Lote")
		}
		industryID = firstBatch.IndustryID
	}

	// Validar que todos os lotes pertencem à mesma indústria e estão ativos
	for _, batchID := range input.BatchIDs {
		batch, err := s.batchRepo.FindByID(ctx, batchID)
		if err != nil {
			return nil, domainErrors.NewNotFoundError("Lote")
		}
		if batch.IndustryID != industryID {
			return nil, domainErrors.ValidationError("Todos os lotes devem pertencer à mesma indústria")
		}
		if !batch.IsActive || batch.DeletedAt != nil {
			return nil, domainErrors.ValidationError("Lote não está disponível")
		}
	}

	// Parse expires_at se fornecido
	var expiresAt *time.Time
	if input.ExpiresAt != nil && *input.ExpiresAt != "" {
		parsed, err := time.Parse(time.RFC3339, *input.ExpiresAt)
		if err != nil {
			parsed, err = time.Parse("2006-01-02", *input.ExpiresAt)
		}
		if err != nil {
			return nil, domainErrors.ValidationError("Data de expiração inválida")
		}
		expiresAt = &parsed
	}

	// Criar link
	link := &entity.CatalogLink{
		ID:              uuid.New().String(),
		CreatedByUserID: userID,
		IndustryID:      industryID,
		SlugToken:       input.SlugToken,
		Title:           input.Title,
		CustomMessage:   input.CustomMessage,
		DisplayCurrency: input.DisplayCurrency,
		ExpiresAt:       expiresAt,
		IsActive:        input.IsActive,
		ViewsCount:      0,
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	fullURL := s.GenerateFullURL(input.SlugToken)
	link.FullURL = &fullURL

	if err := s.catalogLinkRepo.Create(ctx, link, input.BatchIDs); err != nil {
		s.logger.Error("erro ao criar link de catálogo", zap.Error(err))
		return nil, err
	}

	s.logger.Info("link de catálogo criado",
		zap.String("linkId", link.ID),
		zap.String("slug", link.SlugToken),
		zap.String("industryId", industryID),
	)

	return link, nil
}

func (s *catalogLinkService) GetByID(ctx context.Context, id string) (*entity.CatalogLink, error) {
	link, err := s.catalogLinkRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	fullURL := s.GenerateFullURL(link.SlugToken)
	link.FullURL = &fullURL

	return link, nil
}

func (s *catalogLinkService) GetBySlug(ctx context.Context, slug string) (*entity.CatalogLink, error) {
	link, err := s.catalogLinkRepo.FindBySlug(ctx, slug)
	if err != nil {
		return nil, err
	}

	fullURL := s.GenerateFullURL(link.SlugToken)
	link.FullURL = &fullURL

	return link, nil
}

func (s *catalogLinkService) GetPublicBySlug(ctx context.Context, slug string) (*entity.PublicCatalogLink, error) {
	link, err := s.catalogLinkRepo.FindBySlug(ctx, slug)
	if err != nil {
		return nil, err
	}

	// Validar se está ativo e não expirado
	if !link.IsActive {
		return nil, domainErrors.NewNotFoundError("Link de catálogo")
	}
	if link.IsExpired() {
		return nil, domainErrors.NewNotFoundError("Link de catálogo expirado")
	}

	// Buscar dados da indústria
	industry, err := s.industryRepo.FindByID(ctx, link.IndustryID)
	if err != nil {
		return nil, err
	}

	// Extrair nome da indústria (dereferenciar ponteiro)
	depositName := ""
	if industry.Name != nil {
		depositName = *industry.Name
	}

	// Construir resposta pública
	result := &entity.PublicCatalogLink{
		Title:           link.Title,
		CustomMessage:   link.CustomMessage,
		DisplayCurrency: link.DisplayCurrency,
		DepositName:     depositName,
		DepositCity:     industry.AddressCity,
		DepositState:    industry.AddressState,
		DepositLogo:     industry.LogoURL,
		Batches:         []entity.PublicBatch{},
	}

	// Converter lotes para formato público
	for _, batch := range link.Batches {
		// Buscar mídias do lote
		medias, _ := s.mediaRepo.FindBatchMedias(ctx, batch.ID)

		// Buscar indústria do lote
		batchIndustry, err := s.industryRepo.FindByID(ctx, batch.IndustryID)
		industryName := ""
		if err == nil && batchIndustry != nil && batchIndustry.Name != nil {
			industryName = *batchIndustry.Name
		}

		publicBatch := entity.PublicBatch{
			BatchCode:    batch.BatchCode,
			Height:       batch.Height,
			Width:        batch.Width,
			Thickness:    batch.Thickness,
			TotalArea:    batch.TotalArea,
			OriginQuarry: batch.OriginQuarry,
			Medias:       medias,
			IndustryID:   batch.IndustryID,
			IndustryName: industryName,
		}

		// Buscar produto relacionado
		if batch.ProductID != "" {
			product, err := s.productRepo.FindByID(ctx, batch.ProductID)
			if err == nil {
				publicBatch.ProductName = product.Name
				publicBatch.Material = string(product.Material)
				publicBatch.Finish = string(product.Finish)
			}
		}

		result.Batches = append(result.Batches, publicBatch)
	}

	return result, nil
}

func (s *catalogLinkService) List(ctx context.Context, industryID string, userID *string) ([]entity.CatalogLink, error) {
	links, err := s.catalogLinkRepo.List(ctx, industryID, userID)
	if err != nil {
		s.logger.Error("erro ao listar links de catálogo", zap.Error(err))
		return nil, err
	}

	// Gerar URLs completas
	for i := range links {
		fullURL := s.GenerateFullURL(links[i].SlugToken)
		links[i].FullURL = &fullURL
	}

	return links, nil
}

func (s *catalogLinkService) Update(ctx context.Context, id, industryID string, input entity.UpdateCatalogLinkInput) (*entity.CatalogLink, error) {
	link, err := s.catalogLinkRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Validar que pertence à indústria
	if link.IndustryID != industryID {
		return nil, domainErrors.ForbiddenError()
	}

	// Atualizar campos
	if input.Title != nil {
		link.Title = input.Title
	}
	if input.CustomMessage != nil {
		link.CustomMessage = input.CustomMessage
	}
	if input.DisplayCurrency != nil {
		if !input.DisplayCurrency.IsValid() {
			return nil, domainErrors.ValidationError("Moeda de exibição inválida")
		}
		link.DisplayCurrency = *input.DisplayCurrency
	}
	if input.ExpiresAt != nil {
		if *input.ExpiresAt == "" {
			link.ExpiresAt = nil
		} else {
			parsed, err := time.Parse(time.RFC3339, *input.ExpiresAt)
			if err != nil {
				parsed, err = time.Parse("2006-01-02", *input.ExpiresAt)
			}
			if err != nil {
				return nil, domainErrors.ValidationError("Data de expiração inválida")
			}
			link.ExpiresAt = &parsed
		}
	}
	if input.IsActive != nil {
		link.IsActive = *input.IsActive
	}

	// Validar lotes se fornecidos
	var batchIDs *[]string
	if input.BatchIDs != nil {
		// Validar que todos os lotes pertencem à indústria
		for _, batchID := range *input.BatchIDs {
			batch, err := s.batchRepo.FindByID(ctx, batchID)
			if err != nil {
				return nil, domainErrors.NewNotFoundError("Lote")
			}
			if batch.IndustryID != industryID {
				return nil, domainErrors.ForbiddenError()
			}
			if !batch.IsActive || batch.DeletedAt != nil {
				return nil, domainErrors.ValidationError("Lote não está disponível")
			}
		}
		batchIDs = input.BatchIDs
	}

	if err := s.catalogLinkRepo.Update(ctx, link, batchIDs); err != nil {
		s.logger.Error("erro ao atualizar link de catálogo", zap.Error(err))
		return nil, err
	}

	fullURL := s.GenerateFullURL(link.SlugToken)
	link.FullURL = &fullURL

	return link, nil
}

func (s *catalogLinkService) Delete(ctx context.Context, id, industryID string) error {
	link, err := s.catalogLinkRepo.FindByID(ctx, id)
	if err != nil {
		return err
	}

	if link.IndustryID != industryID {
		return domainErrors.ForbiddenError()
	}

	return s.catalogLinkRepo.Delete(ctx, id)
}

func (s *catalogLinkService) IncrementViews(ctx context.Context, id string) error {
	return s.catalogLinkRepo.IncrementViews(ctx, id)
}

func (s *catalogLinkService) GenerateFullURL(slug string) string {
	return s.publicLinkBaseURL + "/catalogo/" + slug
}

func (s *catalogLinkService) ValidateSlug(ctx context.Context, slug string) (bool, error) {
	exists, err := s.catalogLinkRepo.ExistsBySlug(ctx, slug)
	if err != nil {
		return false, err
	}
	return !exists, nil
}
