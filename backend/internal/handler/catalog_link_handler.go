package handler

import (
	"context"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
	"github.com/thiagomes07/CAVA/backend/internal/domain/service"
	"github.com/thiagomes07/CAVA/backend/internal/middleware"
	"github.com/thiagomes07/CAVA/backend/pkg/response"
	"github.com/thiagomes07/CAVA/backend/pkg/validator"
	"go.uber.org/zap"
)

// CatalogLinkHandler gerencia requisições de links de catálogo
type CatalogLinkHandler struct {
	catalogLinkService service.CatalogLinkService
	validator          *validator.Validator
	logger             *zap.Logger
}

// NewCatalogLinkHandler cria uma nova instância de CatalogLinkHandler
func NewCatalogLinkHandler(
	catalogLinkService service.CatalogLinkService,
	validator *validator.Validator,
	logger *zap.Logger,
) *CatalogLinkHandler {
	return &CatalogLinkHandler{
		catalogLinkService: catalogLinkService,
		validator:          validator,
		logger:             logger,
	}
}

// List godoc
// @Summary Lista links de catálogo
// @Description Lista links de catálogo da indústria
// @Tags catalog-links
// @Produce json
// @Success 200 {array} entity.CatalogLink
// @Router /api/catalog-links [get]
func (h *CatalogLinkHandler) List(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	userRole := entity.UserRole(middleware.GetUserRole(r.Context()))
	industryID := middleware.GetIndustryID(r.Context())

	var links []entity.CatalogLink
	var err error

	// Se for broker, filtrar por userID; caso contrário, filtrar por industryID
	if userRole == entity.RoleBroker {
		if userID == "" {
			response.Unauthorized(w, "Usuário não autenticado")
			return
		}
		links, err = h.catalogLinkService.List(r.Context(), "", &userID)
	} else {
		if industryID == "" {
			response.Forbidden(w, "Industry ID não encontrado")
			return
		}
		links, err = h.catalogLinkService.List(r.Context(), industryID, nil)
	}

	if err != nil {
		h.logger.Error("erro ao listar links de catálogo", zap.Error(err))
		response.HandleError(w, err)
		return
	}

	response.OK(w, links)
}

// Create godoc
// @Summary Cria link de catálogo
// @Description Cria um novo link de catálogo com lotes selecionados
// @Tags catalog-links
// @Accept json
// @Produce json
// @Param body body entity.CreateCatalogLinkInput true "Dados do link"
// @Success 201 {object} entity.CatalogLink
// @Router /api/catalog-links [post]
func (h *CatalogLinkHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	industryID := middleware.GetIndustryID(r.Context())

	if userID == "" {
		response.Unauthorized(w, "Usuário não autenticado")
		return
	}

	var input entity.CreateCatalogLinkInput
	if err := response.ParseJSON(r, &input); err != nil {
		response.HandleError(w, err)
		return
	}

	if err := h.validator.Validate(input); err != nil {
		response.HandleError(w, err)
		return
	}


	link, err := h.catalogLinkService.Create(r.Context(), industryID, userID, input)
	if err != nil {
		h.logger.Error("erro ao criar link de catálogo",
			zap.String("slug", input.SlugToken),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	h.logger.Info("link de catálogo criado",
		zap.String("linkId", link.ID),
		zap.String("slug", link.SlugToken),
	)

	response.Created(w, link)
}

// GetByID godoc
// @Summary Busca link por ID
// @Description Retorna dados de um link de catálogo
// @Tags catalog-links
// @Produce json
// @Param id path string true "ID do link"
// @Success 200 {object} entity.CatalogLink
// @Router /api/catalog-links/{id} [get]
func (h *CatalogLinkHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		response.BadRequest(w, "ID é obrigatório", nil)
		return
	}

	link, err := h.catalogLinkService.GetByID(r.Context(), id)
	if err != nil {
		response.HandleError(w, err)
		return
	}

	response.OK(w, link)
}

// Update godoc
// @Summary Atualiza link de catálogo
// @Description Atualiza dados de um link de catálogo
// @Tags catalog-links
// @Accept json
// @Produce json
// @Param id path string true "ID do link"
// @Param body body entity.UpdateCatalogLinkInput true "Dados do link"
// @Success 200 {object} entity.CatalogLink
// @Router /api/catalog-links/{id} [patch]
func (h *CatalogLinkHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	userID := middleware.GetUserID(r.Context())
	userRole := entity.UserRole(middleware.GetUserRole(r.Context()))
	industryID := middleware.GetIndustryID(r.Context())

	if id == "" {
		response.BadRequest(w, "ID é obrigatório", nil)
		return
	}

	var input entity.UpdateCatalogLinkInput
	if err := response.ParseJSON(r, &input); err != nil {
		response.HandleError(w, err)
		return
	}

	if err := h.validator.Validate(input); err != nil {
		response.HandleError(w, err)
		return
	}

	// Para brokers, usar userID; para outros, usar industryID
	if userRole == entity.RoleBroker {
		// Validar que o catálogo pertence ao broker
		link, err := h.catalogLinkService.GetByID(r.Context(), id)
		if err != nil {
			response.HandleError(w, err)
			return
		}
		if link.CreatedByUserID != userID {
			response.Forbidden(w, "Você não tem permissão para atualizar este catálogo")
			return
		}
		industryID = link.IndustryID // Usar industryID do catálogo
	} else if industryID == "" {
		response.Forbidden(w, "Industry ID não encontrado")
		return
	}

	link, err := h.catalogLinkService.Update(r.Context(), id, industryID, input)
	if err != nil {
		h.logger.Error("erro ao atualizar link de catálogo",
			zap.String("linkId", id),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	response.OK(w, link)
}

// Delete godoc
// @Summary Remove link de catálogo
// @Description Remove um link de catálogo
// @Tags catalog-links
// @Param id path string true "ID do link"
// @Success 204
// @Router /api/catalog-links/{id} [delete]
func (h *CatalogLinkHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	userID := middleware.GetUserID(r.Context())
	userRole := entity.UserRole(middleware.GetUserRole(r.Context()))
	industryID := middleware.GetIndustryID(r.Context())

	if id == "" {
		response.BadRequest(w, "ID é obrigatório", nil)
		return
	}

	// Para brokers, validar que o catálogo pertence ao broker
	if userRole == entity.RoleBroker {
		link, err := h.catalogLinkService.GetByID(r.Context(), id)
		if err != nil {
			response.HandleError(w, err)
			return
		}
		if link.CreatedByUserID != userID {
			response.Forbidden(w, "Você não tem permissão para deletar este catálogo")
			return
		}
		industryID = link.IndustryID // Usar industryID do catálogo
	} else if industryID == "" {
		response.Forbidden(w, "Industry ID não encontrado")
		return
	}

	if err := h.catalogLinkService.Delete(r.Context(), id, industryID); err != nil {
		h.logger.Error("erro ao deletar link de catálogo",
			zap.String("linkId", id),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	response.NoContent(w)
}

// GetPublicBySlug godoc
// @Summary Busca catálogo público por slug
// @Description Retorna dados públicos de um catálogo para exibição
// @Tags public
// @Produce json
// @Param slug path string true "Slug do catálogo"
// @Success 200 {object} entity.PublicCatalogLink
// @Router /api/public/catalogo/{slug} [get]
func (h *CatalogLinkHandler) GetPublicBySlug(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	if slug == "" {
		response.BadRequest(w, "Slug é obrigatório", nil)
		return
	}

	publicLink, err := h.catalogLinkService.GetPublicBySlug(r.Context(), slug)
	if err != nil {
		h.logger.Warn("catálogo não encontrado",
			zap.String("slug", slug),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	// Incrementar contador de visualizações (async)
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		link, err := h.catalogLinkService.GetBySlug(ctx, slug)
		if err == nil {
			if err := h.catalogLinkService.IncrementViews(ctx, link.ID); err != nil {
				h.logger.Error("erro ao incrementar views", zap.Error(err))
			}
		}
	}()

	h.logger.Debug("catálogo público acessado", zap.String("slug", slug))

	response.OK(w, publicLink)
}

// ValidateSlug godoc
// @Summary Valida disponibilidade de slug
// @Description Verifica se um slug está disponível para uso
// @Tags catalog-links
// @Produce json
// @Param slug query string true "Slug a validar"
// @Success 200 {object} entity.ValidateSlugResponse
// @Router /api/catalog-links/validate-slug [get]
func (h *CatalogLinkHandler) ValidateSlug(w http.ResponseWriter, r *http.Request) {
	slug := r.URL.Query().Get("slug")
	if slug == "" {
		response.BadRequest(w, "Slug é obrigatório", nil)
		return
	}

	valid, err := h.catalogLinkService.ValidateSlug(r.Context(), slug)
	if err != nil {
		h.logger.Error("erro ao validar slug", zap.Error(err))
		response.HandleError(w, err)
		return
	}

	response.OK(w, entity.ValidateSlugResponse{Valid: valid})
}
