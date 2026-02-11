package handler

import (
	"net/http"
	"strconv"
	"time"

	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
	"github.com/thiagomes07/CAVA/backend/internal/domain/repository"
	"github.com/thiagomes07/CAVA/backend/internal/domain/service"
	"github.com/thiagomes07/CAVA/backend/internal/middleware"
	"github.com/thiagomes07/CAVA/backend/pkg/response"
	"go.uber.org/zap"
)

// BIHandler gerencia requisições de Business Intelligence
type BIHandler struct {
	biService service.BIService
	userRepo  repository.UserRepository
	logger    *zap.Logger
}

// NewBIHandler cria uma nova instância de BIHandler
func NewBIHandler(
	biService service.BIService,
	userRepo repository.UserRepository,
	logger *zap.Logger,
) *BIHandler {
	return &BIHandler{
		biService: biService,
		userRepo:  userRepo,
		logger:    logger,
	}
}

// parseFilters extrai filtros comuns da query string
func (h *BIHandler) parseFilters(r *http.Request, industryID string) entity.BIFilters {
	filters := entity.BIFilters{
		IndustryID: industryID,
		Currency:   entity.CurrencyBRL,
	}

	userID := middleware.GetUserID(r.Context())
	if userID != "" && h.userRepo != nil {
		user, err := h.userRepo.FindByID(r.Context(), userID)
		if err == nil && user != nil && user.PreferredCurrency.IsValid() {
			filters.Currency = user.PreferredCurrency
		}
	}

	// StartDate
	if startDateStr := r.URL.Query().Get("startDate"); startDateStr != "" {
		if startDate, err := time.Parse("2006-01-02", startDateStr); err == nil {
			filters.StartDate = &startDate
		}
	}

	// EndDate
	if endDateStr := r.URL.Query().Get("endDate"); endDateStr != "" {
		if endDate, err := time.Parse("2006-01-02", endDateStr); err == nil {
			// Adicionar 23:59:59 para incluir todo o dia
			endDate = endDate.Add(23*time.Hour + 59*time.Minute + 59*time.Second)
			filters.EndDate = &endDate
		}
	}

	// BrokerID
	if brokerID := r.URL.Query().Get("brokerId"); brokerID != "" {
		filters.BrokerID = &brokerID
	}

	// ProductID
	if productID := r.URL.Query().Get("productId"); productID != "" {
		filters.ProductID = &productID
	}

	if currency := r.URL.Query().Get("currency"); currency != "" {
		cc := entity.CurrencyCode(currency)
		if cc.IsValid() {
			filters.Currency = cc
		}
	}

	// Granularity
	if granularity := r.URL.Query().Get("granularity"); granularity != "" {
		filters.Granularity = granularity
	}

	// Limit
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil && limit > 0 {
			filters.Limit = limit
		}
	}

	return filters
}

// GetDashboard godoc
// @Summary Retorna dashboard completo de BI
// @Description Retorna todas as métricas de vendas, conversão, inventário e performance
// @Tags bi
// @Produce json
// @Param startDate query string false "Data inicial (YYYY-MM-DD)"
// @Param endDate query string false "Data final (YYYY-MM-DD)"
// @Success 200 {object} entity.BIDashboard
// @Router /api/bi/dashboard [get]
func (h *BIHandler) GetDashboard(w http.ResponseWriter, r *http.Request) {
	industryID := middleware.GetIndustryID(r.Context())
	if industryID == "" {
		response.Forbidden(w, "Industry ID não encontrado")
		return
	}

	filters := h.parseFilters(r, industryID)

	dashboard, err := h.biService.GetDashboard(r.Context(), filters)
	if err != nil {
		h.logger.Error("erro ao buscar dashboard de BI",
			zap.String("industryId", industryID),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	response.OK(w, dashboard)
}

// GetSalesMetrics godoc
// @Summary Retorna métricas de vendas
// @Description Retorna métricas detalhadas de vendas para o período
// @Tags bi
// @Produce json
// @Param startDate query string false "Data inicial (YYYY-MM-DD)"
// @Param endDate query string false "Data final (YYYY-MM-DD)"
// @Param brokerId query string false "Filtrar por vendedor"
// @Success 200 {object} entity.SalesMetrics
// @Router /api/bi/sales [get]
func (h *BIHandler) GetSalesMetrics(w http.ResponseWriter, r *http.Request) {
	industryID := middleware.GetIndustryID(r.Context())
	if industryID == "" {
		response.Forbidden(w, "Industry ID não encontrado")
		return
	}

	filters := h.parseFilters(r, industryID)

	metrics, err := h.biService.GetSalesMetrics(r.Context(), filters)
	if err != nil {
		h.logger.Error("erro ao buscar métricas de vendas",
			zap.String("industryId", industryID),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	response.OK(w, metrics)
}

// GetConversionMetrics godoc
// @Summary Retorna métricas do funil de conversão
// @Description Retorna métricas de reservas: aprovadas, rejeitadas, convertidas
// @Tags bi
// @Produce json
// @Param startDate query string false "Data inicial (YYYY-MM-DD)"
// @Param endDate query string false "Data final (YYYY-MM-DD)"
// @Success 200 {object} entity.ConversionMetrics
// @Router /api/bi/conversion [get]
func (h *BIHandler) GetConversionMetrics(w http.ResponseWriter, r *http.Request) {
	industryID := middleware.GetIndustryID(r.Context())
	if industryID == "" {
		response.Forbidden(w, "Industry ID não encontrado")
		return
	}

	filters := h.parseFilters(r, industryID)

	metrics, err := h.biService.GetConversionMetrics(r.Context(), filters)
	if err != nil {
		h.logger.Error("erro ao buscar métricas de conversão",
			zap.String("industryId", industryID),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	response.OK(w, metrics)
}

// GetInventoryMetrics godoc
// @Summary Retorna métricas de inventário
// @Description Retorna métricas de estoque: disponível, reservado, valor, rotatividade
// @Tags bi
// @Produce json
// @Success 200 {object} entity.InventoryMetrics
// @Router /api/bi/inventory [get]
func (h *BIHandler) GetInventoryMetrics(w http.ResponseWriter, r *http.Request) {
	industryID := middleware.GetIndustryID(r.Context())
	if industryID == "" {
		response.Forbidden(w, "Industry ID não encontrado")
		return
	}

	filters := h.parseFilters(r, industryID)
	metrics, err := h.biService.GetInventoryMetrics(r.Context(), industryID, filters.Currency)
	if err != nil {
		h.logger.Error("erro ao buscar métricas de inventário",
			zap.String("industryId", industryID),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	response.OK(w, metrics)
}

// GetBrokerRanking godoc
// @Summary Retorna ranking de performance de brokers
// @Description Retorna lista ordenada de brokers por receita gerada
// @Tags bi
// @Produce json
// @Param startDate query string false "Data inicial (YYYY-MM-DD)"
// @Param endDate query string false "Data final (YYYY-MM-DD)"
// @Param limit query int false "Limite de resultados (default: 10)"
// @Success 200 {array} entity.BrokerPerformance
// @Router /api/bi/brokers [get]
func (h *BIHandler) GetBrokerRanking(w http.ResponseWriter, r *http.Request) {
	industryID := middleware.GetIndustryID(r.Context())
	if industryID == "" {
		response.Forbidden(w, "Industry ID não encontrado")
		return
	}

	filters := h.parseFilters(r, industryID)

	brokers, err := h.biService.GetBrokerRanking(r.Context(), filters)
	if err != nil {
		h.logger.Error("erro ao buscar ranking de brokers",
			zap.String("industryId", industryID),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	response.OK(w, brokers)
}

// GetSalesTrend godoc
// @Summary Retorna tendência de vendas ao longo do tempo
// @Description Retorna série temporal de vendas por dia, semana ou mês
// @Tags bi
// @Produce json
// @Param startDate query string false "Data inicial (YYYY-MM-DD)"
// @Param endDate query string false "Data final (YYYY-MM-DD)"
// @Param granularity query string false "Granularidade: day, week, month (default: day)"
// @Success 200 {array} entity.TrendPoint
// @Router /api/bi/trends/sales [get]
func (h *BIHandler) GetSalesTrend(w http.ResponseWriter, r *http.Request) {
	industryID := middleware.GetIndustryID(r.Context())
	if industryID == "" {
		response.Forbidden(w, "Industry ID não encontrado")
		return
	}

	filters := h.parseFilters(r, industryID)

	trend, err := h.biService.GetSalesTrend(r.Context(), filters)
	if err != nil {
		h.logger.Error("erro ao buscar tendência de vendas",
			zap.String("industryId", industryID),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	response.OK(w, trend)
}

// GetTopProducts godoc
// @Summary Retorna os produtos mais vendidos
// @Description Retorna lista de produtos ordenados por receita
// @Tags bi
// @Produce json
// @Param startDate query string false "Data inicial (YYYY-MM-DD)"
// @Param endDate query string false "Data final (YYYY-MM-DD)"
// @Param limit query int false "Limite de resultados (default: 10)"
// @Success 200 {array} entity.ProductMetric
// @Router /api/bi/products [get]
func (h *BIHandler) GetTopProducts(w http.ResponseWriter, r *http.Request) {
	industryID := middleware.GetIndustryID(r.Context())
	if industryID == "" {
		response.Forbidden(w, "Industry ID não encontrado")
		return
	}

	filters := h.parseFilters(r, industryID)

	products, err := h.biService.GetTopProducts(r.Context(), filters)
	if err != nil {
		h.logger.Error("erro ao buscar top produtos",
			zap.String("industryId", industryID),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	response.OK(w, products)
}

// RefreshViews godoc
// @Summary Atualiza as views materializadas
// @Description Força atualização das views de BI (apenas admin)
// @Tags bi
// @Produce json
// @Success 200 {object} map[string]string
// @Router /api/bi/refresh [post]
func (h *BIHandler) RefreshViews(w http.ResponseWriter, r *http.Request) {
	err := h.biService.RefreshViews(r.Context())
	if err != nil {
		h.logger.Error("erro ao atualizar views materializadas", zap.Error(err))
		response.HandleError(w, err)
		return
	}

	response.OK(w, map[string]string{
		"message": "Views atualizadas com sucesso",
	})
}
