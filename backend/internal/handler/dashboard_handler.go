package handler

import (
	"net/http"

	"github.com/thiagomes07/CAVA/backend/internal/domain/service"
	"github.com/thiagomes07/CAVA/backend/internal/middleware"
	"github.com/thiagomes07/CAVA/backend/pkg/response"
	"go.uber.org/zap"
)

// DashboardHandler gerencia requisições do dashboard
type DashboardHandler struct {
	dashboardService service.DashboardService
	logger           *zap.Logger
}

// NewDashboardHandler cria uma nova instância de DashboardHandler
func NewDashboardHandler(
	dashboardService service.DashboardService,
	logger *zap.Logger,
) *DashboardHandler {
	return &DashboardHandler{
		dashboardService: dashboardService,
		logger:           logger,
	}
}

// GetIndustryMetrics godoc
// @Summary Busca métricas do dashboard
// @Description Retorna métricas para ADMIN_INDUSTRIA e VENDEDOR_INTERNO
// @Tags dashboard
// @Produce json
// @Success 200 {object} entity.IndustryMetrics
// @Router /api/dashboard/metrics [get]
func (h *DashboardHandler) GetIndustryMetrics(w http.ResponseWriter, r *http.Request) {
	// Obter industryID do contexto
	industryID := middleware.GetIndustryID(r.Context())
	if industryID == "" {
		response.Forbidden(w, "Industry ID não encontrado")
		return
	}

	// Buscar métricas
	metrics, err := h.dashboardService.GetIndustryMetrics(r.Context(), industryID)
	if err != nil {
		h.logger.Error("erro ao buscar métricas da indústria",
			zap.String("industryId", industryID),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	response.OK(w, metrics)
}

// GetRecentActivities godoc
// @Summary Busca atividades recentes
// @Description Retorna as últimas 10 atividades
// @Tags dashboard
// @Produce json
// @Success 200 {array} entity.Activity
// @Router /api/dashboard/recent-activities [get]
func (h *DashboardHandler) GetRecentActivities(w http.ResponseWriter, r *http.Request) {
	// Obter industryID do contexto
	industryID := middleware.GetIndustryID(r.Context())
	if industryID == "" {
		response.Forbidden(w, "Industry ID não encontrado")
		return
	}

	// Buscar atividades
	activities, err := h.dashboardService.GetRecentActivities(r.Context(), industryID)
	if err != nil {
		h.logger.Error("erro ao buscar atividades recentes",
			zap.String("industryId", industryID),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	response.OK(w, activities)
}

// GetBrokerMetrics godoc
// @Summary Busca métricas do broker
// @Description Retorna métricas específicas para BROKER
// @Tags dashboard
// @Produce json
// @Success 200 {object} entity.BrokerMetrics
// @Router /api/broker/dashboard/metrics [get]
func (h *DashboardHandler) GetBrokerMetrics(w http.ResponseWriter, r *http.Request) {
	// Obter userID do contexto (broker ID)
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		response.Unauthorized(w, "Usuário não autenticado")
		return
	}

	// Buscar métricas
	metrics, err := h.dashboardService.GetBrokerMetrics(r.Context(), userID)
	if err != nil {
		h.logger.Error("erro ao buscar métricas do broker",
			zap.String("brokerId", userID),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	response.OK(w, metrics)
}
