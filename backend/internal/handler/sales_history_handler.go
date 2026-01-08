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

// SalesHistoryHandler gerencia requisições de histórico de vendas
type SalesHistoryHandler struct {
	salesHistoryService service.SalesHistoryService
	validator           *validator.Validator
	logger              *zap.Logger
}

// NewSalesHistoryHandler cria uma nova instância de SalesHistoryHandler
func NewSalesHistoryHandler(
	salesHistoryService service.SalesHistoryService,
	validator *validator.Validator,
	logger *zap.Logger,
) *SalesHistoryHandler {
	return &SalesHistoryHandler{
		salesHistoryService: salesHistoryService,
		validator:           validator,
		logger:              logger,
	}
}

// List godoc
// @Summary Lista histórico de vendas
// @Description Lista vendas com filtros e paginação
// @Tags sales-history
// @Produce json
// @Param startDate query string false "Data inicial"
// @Param endDate query string false "Data final"
// @Param sellerId query string false "Filtrar por vendedor"
// @Param page query int false "Número da página"
// @Param limit query int false "Itens por página"
// @Success 200 {object} entity.SaleListResponse
// @Router /api/sales-history [get]
func (h *SalesHistoryHandler) List(w http.ResponseWriter, r *http.Request) {
	// Extrair filtros da query string
	filters := entity.SaleFilters{
		Page:  1,
		Limit: 50,
	}

	if startDate := r.URL.Query().Get("startDate"); startDate != "" {
		filters.StartDate = &startDate
	}

	if endDate := r.URL.Query().Get("endDate"); endDate != "" {
		filters.EndDate = &endDate
	}

	if sellerID := r.URL.Query().Get("sellerId"); sellerID != "" {
		filters.SellerID = &sellerID
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

	// Buscar vendas
	result, err := h.salesHistoryService.List(r.Context(), filters)
	if err != nil {
		h.logger.Error("erro ao listar histórico de vendas",
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	response.OK(w, result)
}

// GetByID godoc
// @Summary Busca venda por ID
// @Description Retorna detalhes de uma venda específica
// @Tags sales-history
// @Produce json
// @Param id path string true "ID da venda"
// @Success 200 {object} entity.Sale
// @Failure 404 {object} response.ErrorResponse
// @Router /api/sales-history/{id} [get]
func (h *SalesHistoryHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		response.BadRequest(w, "ID da venda é obrigatório", nil)
		return
	}

	sale, err := h.salesHistoryService.GetByID(r.Context(), id)
	if err != nil {
		h.logger.Error("erro ao buscar venda",
			zap.String("id", id),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	response.OK(w, sale)
}

// GetSummary godoc
// @Summary Busca sumário de vendas
// @Description Retorna totais, comissões e ticket médio
// @Tags sales-history
// @Produce json
// @Param period query string false "Período (month, year)"
// @Param startDate query string false "Data inicial"
// @Param endDate query string false "Data final"
// @Success 200 {object} entity.SaleSummary
// @Router /api/sales-history/summary [get]
func (h *SalesHistoryHandler) GetSummary(w http.ResponseWriter, r *http.Request) {
	// Extrair filtros da query string
	filters := entity.SaleSummaryFilters{}

	if period := r.URL.Query().Get("period"); period != "" {
		filters.Period = &period
	}

	if startDate := r.URL.Query().Get("startDate"); startDate != "" {
		filters.StartDate = &startDate
	}

	if endDate := r.URL.Query().Get("endDate"); endDate != "" {
		filters.EndDate = &endDate
	}

	// Buscar sumário
	summary, err := h.salesHistoryService.GetSummary(r.Context(), filters)
	if err != nil {
		h.logger.Error("erro ao buscar sumário de vendas",
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	response.OK(w, summary)
}

// GetBrokerSales godoc
// @Summary Busca vendas do broker
// @Description Retorna vendas realizadas pelo broker autenticado
// @Tags sales-history
// @Produce json
// @Param limit query int false "Limite de resultados"
// @Success 200 {array} entity.Sale
// @Router /api/broker/sales [get]
func (h *SalesHistoryHandler) GetBrokerSales(w http.ResponseWriter, r *http.Request) {
	// Obter userID do contexto (broker ID)
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		response.Unauthorized(w, "Usuário não autenticado")
		return
	}

	// Extrair limite da query string
	limit := 50
	if l := r.URL.Query().Get("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 && parsed <= 100 {
			limit = parsed
		}
	}

	// Buscar vendas do broker
	sales, err := h.salesHistoryService.GetBrokerSales(r.Context(), userID, limit)
	if err != nil {
		h.logger.Error("erro ao buscar vendas do broker",
			zap.String("brokerId", userID),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	response.OK(w, sales)
}
