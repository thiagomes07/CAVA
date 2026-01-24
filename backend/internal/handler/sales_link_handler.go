package handler

import (
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
	"github.com/thiagomes07/CAVA/backend/internal/domain/service"
	"github.com/thiagomes07/CAVA/backend/internal/middleware"
	"github.com/thiagomes07/CAVA/backend/pkg/response"
	"github.com/thiagomes07/CAVA/backend/pkg/validator"
	"go.uber.org/zap"
)

// SalesLinkHandler gerencia requisições de links de venda
type SalesLinkHandler struct {
	salesLinkService service.SalesLinkService
	validator        *validator.Validator
	logger           *zap.Logger
}

// NewSalesLinkHandler cria uma nova instância de SalesLinkHandler
func NewSalesLinkHandler(
	salesLinkService service.SalesLinkService,
	validator *validator.Validator,
	logger *zap.Logger,
) *SalesLinkHandler {
	return &SalesLinkHandler{
		salesLinkService: salesLinkService,
		validator:        validator,
		logger:           logger,
	}
}

// List godoc
// @Summary Lista links de venda
// @Description Lista links de venda com filtros e paginação. Cada usuário só vê seus próprios links.
// @Tags sales-links
// @Produce json
// @Param type query string false "Filtrar por tipo"
// @Param status query string false "Filtrar por status"
// @Param search query string false "Buscar por título ou slug"
// @Param page query int false "Número da página"
// @Param limit query int false "Itens por página"
// @Success 200 {object} entity.SalesLinkListResponse
// @Router /api/sales-links [get]
func (h *SalesLinkHandler) List(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		response.Unauthorized(w, "Usuário não autenticado")
		return
	}

	// Extrair filtros da query string
	filters := entity.SalesLinkFilters{
		CreatedByUserID: &userID,
		Page:            1,
		Limit:           25,
	}

	if linkType := r.URL.Query().Get("type"); linkType != "" {
		lt := entity.LinkType(linkType)
		if lt.IsValid() {
			filters.Type = &lt
		}
	}

	if status := r.URL.Query().Get("status"); status != "" {
		filters.Status = &status
	}

	if search := r.URL.Query().Get("search"); search != "" {
		filters.Search = &search
	}

	if page := r.URL.Query().Get("page"); page != "" {
		if p, err := strconv.Atoi(page); err == nil && p > 0 {
			filters.Page = p
		}
	}

	if limit := r.URL.Query().Get("limit"); limit != "" {
		if l, err := strconv.Atoi(limit); err == nil && l > 0 && l <= 100 {
			filters.Limit = l
		}
	}

	// Validar filtros
	if err := h.validator.Validate(filters); err != nil {
		response.HandleError(w, err)
		return
	}

	// Buscar links
	result, err := h.salesLinkService.List(r.Context(), filters)
	if err != nil {
		h.logger.Error("erro ao listar links de venda",
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	response.OK(w, result)
}

// GetByID godoc
// @Summary Busca link de venda por ID
// @Description Retorna detalhes de um link de venda específico
// @Tags sales-links
// @Produce json
// @Param id path string true "ID do link"
// @Success 200 {object} entity.SalesLink
// @Failure 404 {object} response.ErrorResponse
// @Router /api/sales-links/{id} [get]
func (h *SalesLinkHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		response.BadRequest(w, "ID do link é obrigatório", nil)
		return
	}

	link, err := h.salesLinkService.GetByID(r.Context(), id)
	if err != nil {
		h.logger.Error("erro ao buscar link de venda",
			zap.String("id", id),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	response.OK(w, link)
}

// ValidateSlug godoc
// @Summary Valida disponibilidade de slug
// @Description Verifica se um slug está disponível para uso
// @Tags sales-links
// @Produce json
// @Param slug query string true "Slug para validar"
// @Success 200 {object} entity.ValidateSlugResponse
// @Router /api/sales-links/validate-slug [get]
func (h *SalesLinkHandler) ValidateSlug(w http.ResponseWriter, r *http.Request) {
	slug := r.URL.Query().Get("slug")
	if slug == "" {
		response.BadRequest(w, "Slug é obrigatório", nil)
		return
	}

	// Validar formato do slug
	input := entity.ValidateSlugInput{Slug: slug}
	if err := h.validator.Validate(input); err != nil {
		response.HandleError(w, err)
		return
	}

	// Verificar disponibilidade
	valid, err := h.salesLinkService.ValidateSlug(r.Context(), slug)
	if err != nil {
		h.logger.Error("erro ao validar slug",
			zap.String("slug", slug),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	response.OK(w, entity.ValidateSlugResponse{Valid: valid})
}

// Create godoc
// @Summary Cria um novo link de venda
// @Description Cria um novo link de venda público
// @Tags sales-links
// @Accept json
// @Produce json
// @Param body body entity.CreateSalesLinkInput true "Dados do link"
// @Success 201 {object} entity.CreateSalesLinkResponse
// @Failure 400 {object} response.ErrorResponse
// @Router /api/sales-links [post]
func (h *SalesLinkHandler) Create(w http.ResponseWriter, r *http.Request) {
	var input entity.CreateSalesLinkInput

	// Parse JSON body
	if err := response.ParseJSON(r, &input); err != nil {
		response.HandleError(w, err)
		return
	}

	// Validar input
	if err := h.validator.Validate(input); err != nil {
		response.HandleError(w, err)
		return
	}

	// Obter userID e industryID do contexto
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		response.Unauthorized(w, "Usuário não autenticado")
		return
	}

	industryID := middleware.GetIndustryID(r.Context())
	// industryID pode ser vazio para brokers

	// Criar link
	result, err := h.salesLinkService.Create(r.Context(), userID, industryID, input)
	if err != nil {
		h.logger.Error("erro ao criar link de venda",
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	h.logger.Info("link de venda criado",
		zap.String("linkId", result.ID),
		zap.String("slug", input.SlugToken),
	)

	response.Created(w, result)
}

// Update godoc
// @Summary Atualiza um link de venda
// @Description Atualiza dados de um link de venda existente
// @Tags sales-links
// @Accept json
// @Produce json
// @Param id path string true "ID do link"
// @Param body body entity.UpdateSalesLinkInput true "Dados do link"
// @Success 200 {object} entity.SalesLink
// @Failure 400 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Router /api/sales-links/{id} [patch]
func (h *SalesLinkHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		response.BadRequest(w, "ID do link é obrigatório", nil)
		return
	}

	var input entity.UpdateSalesLinkInput

	// Parse JSON body
	if err := response.ParseJSON(r, &input); err != nil {
		response.HandleError(w, err)
		return
	}

	// Validar input
	if err := h.validator.Validate(input); err != nil {
		response.HandleError(w, err)
		return
	}

	// Atualizar link
	link, err := h.salesLinkService.Update(r.Context(), id, input)
	if err != nil {
		h.logger.Error("erro ao atualizar link de venda",
			zap.String("id", id),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	h.logger.Info("link de venda atualizado",
		zap.String("linkId", id),
	)

	response.OK(w, link)
}

// Delete godoc
// @Summary Remove um link de venda
// @Description Desativa um link de venda (soft delete)
// @Tags sales-links
// @Produce json
// @Param id path string true "ID do link"
// @Success 200 {object} map[string]bool
// @Failure 404 {object} response.ErrorResponse
// @Router /api/sales-links/{id} [delete]
func (h *SalesLinkHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		response.BadRequest(w, "ID do link é obrigatório", nil)
		return
	}

	// Deletar link (soft delete)
	if err := h.salesLinkService.Delete(r.Context(), id); err != nil {
		h.logger.Error("erro ao deletar link de venda",
			zap.String("id", id),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	h.logger.Info("link de venda deletado",
		zap.String("linkId", id),
	)

	response.OK(w, map[string]bool{"success": true})
}
