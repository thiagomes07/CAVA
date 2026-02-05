package handler

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
	"github.com/thiagomes07/CAVA/backend/internal/domain/errors"
	"github.com/thiagomes07/CAVA/backend/internal/domain/repository"
	"github.com/thiagomes07/CAVA/backend/internal/domain/service"
	"github.com/thiagomes07/CAVA/backend/internal/middleware"
	"github.com/thiagomes07/CAVA/backend/pkg/response"
	"github.com/thiagomes07/CAVA/backend/pkg/validator"
	"go.uber.org/zap"
)

// PortfolioHandler gerencia funcionalidades do portfolio de produtos
type PortfolioHandler struct {
	sharedCatalogRepo repository.SharedCatalogPermissionRepository
	userRepo          repository.UserRepository
	industryRepo      repository.IndustryRepository
	productRepo       repository.ProductRepository
	batchRepo         repository.BatchRepository
	mediaRepo         repository.MediaRepository
	clienteService    service.ClienteService
	validator         *validator.Validator
	logger            *zap.Logger
}

// NewPortfolioHandler cria uma nova instância de PortfolioHandler
func NewPortfolioHandler(
	sharedCatalogRepo repository.SharedCatalogPermissionRepository,
	userRepo repository.UserRepository,
	industryRepo repository.IndustryRepository,
	productRepo repository.ProductRepository,
	batchRepo repository.BatchRepository,
	mediaRepo repository.MediaRepository,
	clienteService service.ClienteService,
	validator *validator.Validator,
	logger *zap.Logger,
) *PortfolioHandler {
	return &PortfolioHandler{
		sharedCatalogRepo: sharedCatalogRepo,
		userRepo:          userRepo,
		industryRepo:      industryRepo,
		productRepo:       productRepo,
		batchRepo:         batchRepo,
		mediaRepo:         mediaRepo,
		clienteService:    clienteService,
		validator:         validator,
		logger:            logger,
	}
}

// SharePortfolioInput representa o input para compartilhar portfolio com brokers
type SharePortfolioInput struct {
	BrokerIDs     []string `json:"brokerIds" validate:"required,min=1"`
	CanShowPrices bool     `json:"canShowPrices"`
}

// SharedPortfolioResponse representa um portfolio compartilhado para o broker
type SharedPortfolioResponse struct {
	IndustryID    string  `json:"industryId"`
	IndustryName  string  `json:"industryName"`
	IndustrySlug  string  `json:"industrySlug"`
	LogoURL       *string `json:"logoUrl"`
	ProductCount  int     `json:"productCount"`
	CanShowPrices bool    `json:"canShowPrices"`
}

// ListSharedBrokers retorna a lista de brokers com quem o portfolio foi compartilhado
// @Summary Lista brokers com acesso ao portfolio
// @Description Retorna lista de brokers que têm permissão para ver o portfolio
// @Tags portfolio
// @Produce json
// @Success 200 {array} entity.SharedCatalogPermission
// @Router /api/portfolio/share [get]
func (h *PortfolioHandler) ListSharedBrokers(w http.ResponseWriter, r *http.Request) {
	industryID := middleware.GetIndustryID(r.Context())
	if industryID == "" {
		response.Unauthorized(w, "Não autenticado")
		return
	}

	permissions, err := h.sharedCatalogRepo.FindByIndustryID(r.Context(), industryID)
	if err != nil {
		h.logger.Error("erro ao listar brokers compartilhados", zap.Error(err))
		response.HandleError(w, err)
		return
	}

	response.OK(w, permissions)
}

// ShareWithBrokers compartilha o portfolio com brokers selecionados
// @Summary Compartilha portfolio com brokers
// @Description Adiciona permissão para brokers visualizarem o portfolio
// @Tags portfolio
// @Accept json
// @Produce json
// @Param body body SharePortfolioInput true "IDs dos brokers"
// @Success 201 {object} response.MessageResponse
// @Router /api/portfolio/share [post]
func (h *PortfolioHandler) ShareWithBrokers(w http.ResponseWriter, r *http.Request) {
	industryID := middleware.GetIndustryID(r.Context())
	if industryID == "" {
		response.Unauthorized(w, "Não autenticado")
		return
	}

	var input SharePortfolioInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.BadRequest(w, "JSON inválido", nil)
		return
	}

	if validationErrors := h.validator.Validate(input); validationErrors != nil {
		response.HandleError(w, validationErrors)
		return
	}

	successCount := 0
	for _, brokerID := range input.BrokerIDs {
		// Verificar se o broker existe e é realmente um broker
		user, err := h.userRepo.FindByID(r.Context(), brokerID)
		if err != nil {
			h.logger.Warn("broker não encontrado", zap.String("brokerId", brokerID))
			continue
		}
		if user.Role != entity.RoleBroker {
			h.logger.Warn("usuário não é broker", zap.String("userId", brokerID))
			continue
		}

		// Criar permissão
		permission := &entity.SharedCatalogPermission{
			IndustryID:       industryID,
			SharedWithUserID: brokerID,
			CanShowPrices:    input.CanShowPrices,
			IsActive:         true,
		}

		if err := h.sharedCatalogRepo.Create(r.Context(), permission); err != nil {
			// Ignora erro de duplicata (já compartilhado)
			if !errors.IsDuplicateError(err) {
				h.logger.Error("erro ao compartilhar com broker",
					zap.String("brokerId", brokerID),
					zap.Error(err),
				)
			}
			continue
		}
		successCount++
	}

	h.logger.Info("portfolio compartilhado",
		zap.String("industryId", industryID),
		zap.Int("brokersCount", successCount),
	)

	response.Created(w, map[string]interface{}{
		"message":        "Portfolio compartilhado com sucesso",
		"sharedCount":    successCount,
		"requestedCount": len(input.BrokerIDs),
	})
}

// UnshareWithBroker remove o compartilhamento com um broker
// @Summary Remove compartilhamento com broker
// @Description Remove a permissão de um broker visualizar o portfolio
// @Tags portfolio
// @Produce json
// @Param brokerId path string true "ID do broker"
// @Success 204
// @Router /api/portfolio/share/{brokerId} [delete]
func (h *PortfolioHandler) UnshareWithBroker(w http.ResponseWriter, r *http.Request) {
	industryID := middleware.GetIndustryID(r.Context())
	if industryID == "" {
		response.Unauthorized(w, "Não autenticado")
		return
	}

	brokerID := chi.URLParam(r, "brokerId")
	if brokerID == "" {
		response.BadRequest(w, "ID do broker é obrigatório", nil)
		return
	}

	if err := h.sharedCatalogRepo.Delete(r.Context(), industryID, brokerID); err != nil {
		h.logger.Error("erro ao remover compartilhamento",
			zap.String("brokerId", brokerID),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	h.logger.Info("compartilhamento removido",
		zap.String("industryId", industryID),
		zap.String("brokerId", brokerID),
	)

	response.NoContent(w)
}

// GetSharedPortfolios retorna portfolios compartilhados com o broker logado
// @Summary Lista portfolios compartilhados
// @Description Retorna lista de indústrias que compartilharam portfolio com o broker
// @Tags portfolio
// @Produce json
// @Success 200 {array} SharedPortfolioResponse
// @Router /api/broker/shared-portfolios [get]
func (h *PortfolioHandler) GetSharedPortfolios(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		response.Unauthorized(w, "Não autenticado")
		return
	}

	permissions, err := h.sharedCatalogRepo.FindByUserID(r.Context(), userID)
	if err != nil {
		h.logger.Error("erro ao listar portfolios compartilhados", zap.Error(err))
		response.HandleError(w, err)
		return
	}

	portfolios := make([]SharedPortfolioResponse, 0, len(permissions))
	for _, p := range permissions {
		if !p.IsActive {
			continue
		}

		industry, err := h.industryRepo.FindByID(r.Context(), p.IndustryID)
		if err != nil {
			h.logger.Warn("indústria não encontrada", zap.String("industryId", p.IndustryID))
			continue
		}

		// Contar produtos públicos
		filters := entity.ProductFilters{
			OnlyPublic: true,
			Page:       1,
			Limit:      1,
		}
		_, productCount, err := h.productRepo.FindByIndustryID(r.Context(), p.IndustryID, filters)
		if err != nil {
			productCount = 0
		}

		var name, slug string
		if industry.Name != nil {
			name = *industry.Name
		}
		if industry.Slug != nil {
			slug = *industry.Slug
		}

		portfolios = append(portfolios, SharedPortfolioResponse{
			IndustryID:    p.IndustryID,
			IndustryName:  name,
			IndustrySlug:  slug,
			LogoURL:       industry.LogoURL,
			ProductCount:  productCount,
			CanShowPrices: p.CanShowPrices,
		})
	}

	response.OK(w, portfolios)
}

// GetPublicPortfolio retorna o portfolio público de uma indústria
// @Summary Obtém portfolio público
// @Description Retorna produtos públicos de uma indústria pelo slug
// @Tags public
// @Produce json
// @Param slug path string true "Slug da indústria"
// @Success 200 {object} entity.PublicPortfolioResponse
// @Router /api/public/portfolio/{slug} [get]
func (h *PortfolioHandler) GetPublicPortfolio(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	if slug == "" {
		response.BadRequest(w, "Slug é obrigatório", nil)
		return
	}

	industry, err := h.industryRepo.FindBySlug(r.Context(), slug)
	if err != nil {
		h.logger.Warn("indústria não encontrada", zap.String("slug", slug))
		response.HandleError(w, err)
		return
	}

	// Verificar se o portfolio está publicado via portfolioDisplaySettings
	if !industry.PortfolioDisplaySettings.IsPublished {
		response.NotFound(w, "Portfolio não encontrado")
		return
	}

	// Buscar produtos públicos
	filters := entity.ProductFilters{
		OnlyPublic: true,
		Page:       1,
		Limit:      100, // Aumentar se necessário
	}

	// Aplicar filtros de query params
	if search := r.URL.Query().Get("search"); search != "" {
		filters.Search = &search
	}
	if material := r.URL.Query().Get("material"); material != "" {
		mat := entity.MaterialType(material)
		filters.Material = &mat
	}
	if finish := r.URL.Query().Get("finish"); finish != "" {
		fin := entity.FinishType(finish)
		filters.Finish = &fin
	}
	if page := r.URL.Query().Get("page"); page != "" {
		// Parse page
		var p int
		if _, err := fmt.Sscanf(page, "%d", &p); err == nil && p > 0 {
			filters.Page = p
		}
	}

	products, total, err := h.productRepo.FindByIndustryID(r.Context(), industry.ID, filters)
	if err != nil {
		h.logger.Error("erro ao buscar produtos", zap.Error(err))
		response.HandleError(w, err)
		return
	}

	// Carregar mídias para cada produto
	for i := range products {
		medias, err := h.mediaRepo.FindProductMedias(r.Context(), products[i].ID)
		if err != nil {
			h.logger.Warn("erro ao buscar mídias do produto",
				zap.String("productId", products[i].ID),
				zap.Error(err),
			)
			medias = []entity.Media{}
		}
		products[i].Medias = medias
	}

	// Construir resposta pública (sem preços)
	publicProducts := make([]map[string]interface{}, 0, len(products))
	for _, p := range products {
		publicProducts = append(publicProducts, map[string]interface{}{
			"id":           p.ID,
			"name":         p.Name,
			"sku":          p.SKU,
			"material":     p.Material,
			"finish":       p.Finish,
			"description":  p.Description,
			"medias":       p.Medias,
			"batchCount":   p.BatchCount,
			"hasAvailable": p.BatchCount != nil && *p.BatchCount > 0,
		})
	}

	// Construir info da indústria baseado nas configurações de visibilidade
	industryInfo := buildPublicIndustryInfo(industry)

	response.OK(w, map[string]interface{}{
		"industry": industryInfo,
		"products": publicProducts,
		"total":    total,
		"page":     filters.Page,
	})
}

// CapturePortfolioLead captura interesse de cliente no portfolio
// @Summary Captura lead do portfolio
// @Description Registra interesse de um cliente através do portfolio público
// @Tags public
// @Accept json
// @Produce json
// @Param slug path string true "Slug da indústria"
// @Param body body entity.CreateClienteInput true "Dados do cliente"
// @Success 201 {object} response.MessageResponse
// @Router /api/public/portfolio/{slug}/leads [post]
func (h *PortfolioHandler) CapturePortfolioLead(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	if slug == "" {
		response.BadRequest(w, "Slug é obrigatório", nil)
		return
	}

	industry, err := h.industryRepo.FindBySlug(r.Context(), slug)
	if err != nil {
		response.NotFound(w, "Indústria não encontrada")
		return
	}

	var input entity.CreateClienteInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.BadRequest(w, "JSON inválido", nil)
		return
	}

	if err := h.validator.Validate(input); err != nil {
		response.HandleError(w, err)
		return
	}

	// Criar cliente com fonte PORTFOLIO
	cliente := &entity.Cliente{
		Name:           input.Name,
		Email:          input.Email,
		Phone:          input.Phone,
		Whatsapp:       input.Whatsapp,
		Message:        input.Message,
		MarketingOptIn: input.MarketingOptIn,
		IndustryID:     &industry.ID,
		Source:         "PORTFOLIO",
	}

	if err := h.clienteService.CreateFromPortfolio(r.Context(), cliente, input.ProductID); err != nil {
		h.logger.Error("erro ao capturar lead", zap.Error(err))
		response.HandleError(w, err)
		return
	}

	h.logger.Info("lead capturado via portfolio",
		zap.String("industryId", industry.ID),
		zap.String("email", stringOrEmpty(input.Email)),
	)

	response.Created(w, map[string]string{
		"message": "Obrigado pelo seu interesse! Entraremos em contato em breve.",
	})
}

// buildPublicIndustryInfo constrói info pública da indústria baseado nas configurações
func buildPublicIndustryInfo(industry *entity.Industry) map[string]interface{} {
	info := make(map[string]interface{})
	settings := industry.PortfolioDisplaySettings

	// Nome da empresa
	if settings.ShowName && industry.Name != nil {
		info["name"] = *industry.Name
	}

	// Descrição
	if settings.ShowDescription && industry.Description != nil {
		info["description"] = *industry.Description
	}

	// Logo
	if settings.ShowLogo && industry.LogoURL != nil {
		info["logoUrl"] = *industry.LogoURL
	}

	// Slug (sempre incluir para navegação)
	if industry.Slug != nil {
		info["slug"] = *industry.Slug
	}

	// Contato
	if settings.ShowContact {
		contact := make(map[string]interface{})
		if industry.ContactEmail != nil {
			contact["email"] = *industry.ContactEmail
		}
		if industry.ContactPhone != nil {
			contact["phone"] = *industry.ContactPhone
		}
		if industry.Whatsapp != nil {
			contact["whatsapp"] = *industry.Whatsapp
		}
		if len(contact) > 0 {
			info["contact"] = contact
		}
	}

	// CNPJ
	if settings.ShowCNPJ && industry.CNPJ != nil {
		info["cnpj"] = *industry.CNPJ
	}

	// Localização
	if settings.ShowLocation {
		location := make(map[string]interface{})
		switch settings.LocationLevel {
		case "full":
			if industry.AddressStreet != nil {
				location["street"] = *industry.AddressStreet
			}
			if industry.AddressNumber != nil {
				location["number"] = *industry.AddressNumber
			}
			if industry.AddressZipCode != nil {
				location["zipCode"] = *industry.AddressZipCode
			}
			if industry.AddressCity != nil {
				location["city"] = *industry.AddressCity
			}
			if industry.AddressState != nil {
				location["state"] = *industry.AddressState
			}
			if industry.AddressCountry != nil {
				location["country"] = *industry.AddressCountry
			}
		case "city":
			if industry.AddressCity != nil {
				location["city"] = *industry.AddressCity
			}
			if industry.AddressState != nil {
				location["state"] = *industry.AddressState
			}
			if industry.AddressCountry != nil {
				location["country"] = *industry.AddressCountry
			}
		case "state":
			if industry.AddressState != nil {
				location["state"] = *industry.AddressState
			}
			if industry.AddressCountry != nil {
				location["country"] = *industry.AddressCountry
			}
		case "country":
			if industry.AddressCountry != nil {
				location["country"] = *industry.AddressCountry
			}
		}
		if len(location) > 0 {
			info["location"] = location
		}
	}

	// Redes sociais (se houver)
	if len(industry.SocialLinks) > 0 {
		info["socialLinks"] = industry.SocialLinks
	}

	return info
}

func stringOrEmpty(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

// GetPublicProductBatches retorna os lotes públicos de um produto específico
// @Summary Lista lotes públicos de um produto
// @Description Retorna lotes públicos de um produto específico pelo ID
// @Tags public
// @Produce json
// @Param slug path string true "Slug da indústria"
// @Param productId path string true "ID do produto"
// @Param limit query int false "Limite de lotes (padrão 10, máximo 50)"
// @Success 200 {array} entity.PublicBatch
// @Router /api/public/portfolio/{slug}/products/{productId}/batches [get]
func (h *PortfolioHandler) GetPublicProductBatches(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	productID := chi.URLParam(r, "productId")

	if slug == "" || productID == "" {
		response.BadRequest(w, "Slug e productId são obrigatórios", nil)
		return
	}

	// Verificar se a indústria existe e o portfolio está publicado
	industry, err := h.industryRepo.FindBySlug(r.Context(), slug)
	if err != nil {
		h.logger.Warn("indústria não encontrada", zap.String("slug", slug))
		response.HandleError(w, err)
		return
	}

	if !industry.PortfolioDisplaySettings.IsPublished {
		response.NotFound(w, "Portfolio não encontrado")
		return
	}

	// Verificar se o produto pertence à indústria
	product, err := h.productRepo.FindByID(r.Context(), productID)
	if err != nil {
		h.logger.Warn("produto não encontrado", zap.String("productId", productID))
		response.NotFound(w, "Produto não encontrado")
		return
	}

	if product.IndustryID != industry.ID {
		response.NotFound(w, "Produto não encontrado nesta indústria")
		return
	}

	// Parse limit
	limit := 10
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		var l int
		if _, err := fmt.Sscanf(limitStr, "%d", &l); err == nil && l > 0 {
			limit = l
		}
	}

	// Buscar lotes públicos do produto
	batches, err := h.batchRepo.FindPublicBatchesByProductID(r.Context(), productID, limit)
	if err != nil {
		h.logger.Error("erro ao buscar lotes do produto", zap.Error(err))
		response.HandleError(w, err)
		return
	}

	response.OK(w, batches)
}
