package handler

import (
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
	"github.com/thiagomes07/CAVA/backend/internal/domain/service"
	"github.com/thiagomes07/CAVA/backend/pkg/response"
	"github.com/thiagomes07/CAVA/backend/pkg/validator"
	"go.uber.org/zap"
)

// LeadHandler gerencia requisições de leads
type LeadHandler struct {
	leadService service.LeadService
	validator   *validator.Validator
	logger      *zap.Logger
}

// NewLeadHandler cria uma nova instância de LeadHandler
func NewLeadHandler(
	leadService service.LeadService,
	validator *validator.Validator,
	logger *zap.Logger,
) *LeadHandler {
	return &LeadHandler{
		leadService: leadService,
		validator:   validator,
		logger:      logger,
	}
}

// List godoc
// @Summary Lista leads
// @Description Lista leads com filtros e paginação
// @Tags leads
// @Produce json
// @Param search query string false "Buscar por nome ou contato"
// @Param linkId query string false "Filtrar por link de venda"
// @Param status query string false "Filtrar por status"
// @Param startDate query string false "Data inicial"
// @Param endDate query string false "Data final"
// @Param optIn query bool false "Filtrar por opt-in"
// @Param page query int false "Número da página"
// @Param limit query int false "Itens por página"
// @Success 200 {object} entity.LeadListResponse
// @Router /api/leads [get]
func (h *LeadHandler) List(w http.ResponseWriter, r *http.Request) {
	// Extrair filtros da query string
	filters := entity.LeadFilters{
		Page:  1,
		Limit: 50,
	}

	if search := r.URL.Query().Get("search"); search != "" {
		filters.Search = &search
	}

	if linkID := r.URL.Query().Get("linkId"); linkID != "" {
		filters.LinkID = &linkID
	}

	if status := r.URL.Query().Get("status"); status != "" {
		s := entity.LeadStatus(status)
		if s.IsValid() {
			filters.Status = &s
		}
	}

	if startDate := r.URL.Query().Get("startDate"); startDate != "" {
		filters.StartDate = &startDate
	}

	if endDate := r.URL.Query().Get("endDate"); endDate != "" {
		filters.EndDate = &endDate
	}

	if optIn := r.URL.Query().Get("optIn"); optIn != "" {
		b, err := strconv.ParseBool(optIn)
		if err == nil {
			filters.OptIn = &b
		}
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

	// Buscar leads
	result, err := h.leadService.List(r.Context(), filters)
	if err != nil {
		h.logger.Error("erro ao listar leads",
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	response.OK(w, result)
}

// GetByID godoc
// @Summary Busca lead por ID
// @Description Retorna detalhes de um lead específico
// @Tags leads
// @Produce json
// @Param id path string true "ID do lead"
// @Success 200 {object} entity.Lead
// @Failure 404 {object} response.ErrorResponse
// @Router /api/leads/{id} [get]
func (h *LeadHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		response.BadRequest(w, "ID do lead é obrigatório", nil)
		return
	}

	lead, err := h.leadService.GetByID(r.Context(), id)
	if err != nil {
		h.logger.Error("erro ao buscar lead",
			zap.String("id", id),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	response.OK(w, lead)
}

// GetInteractions godoc
// @Summary Busca interações do lead
// @Description Retorna histórico de interações de um lead
// @Tags leads
// @Produce json
// @Param id path string true "ID do lead"
// @Success 200 {array} entity.LeadInteraction
// @Failure 404 {object} response.ErrorResponse
// @Router /api/leads/{id}/interactions [get]
func (h *LeadHandler) GetInteractions(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		response.BadRequest(w, "ID do lead é obrigatório", nil)
		return
	}

	interactions, err := h.leadService.GetInteractions(r.Context(), id)
	if err != nil {
		h.logger.Error("erro ao buscar interações do lead",
			zap.String("id", id),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	response.OK(w, interactions)
}

// UpdateStatus godoc
// @Summary Atualiza status do lead
// @Description Atualiza o status de um lead
// @Tags leads
// @Accept json
// @Produce json
// @Param id path string true "ID do lead"
// @Param body body entity.UpdateLeadStatusInput true "Status do lead"
// @Success 200 {object} entity.Lead
// @Failure 400 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Router /api/leads/{id}/status [patch]
func (h *LeadHandler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		response.BadRequest(w, "ID do lead é obrigatório", nil)
		return
	}

	var input entity.UpdateLeadStatusInput

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

	// Atualizar status
	lead, err := h.leadService.UpdateStatus(r.Context(), id, input.Status)
	if err != nil {
		h.logger.Error("erro ao atualizar status do lead",
			zap.String("id", id),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	h.logger.Info("status do lead atualizado",
		zap.String("leadId", id),
		zap.String("status", string(input.Status)),
	)

	response.OK(w, lead)
}
