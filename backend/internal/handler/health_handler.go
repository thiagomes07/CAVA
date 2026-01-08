package handler

import (
	"context"
	"net/http"
	"time"

	"github.com/thiagomes07/CAVA/backend/pkg/response"
)

// HealthCheckResponse representa a resposta do health check
type HealthCheckResponse struct {
	Status    string            `json:"status"`
	Timestamp string            `json:"timestamp"`
	Services  map[string]string `json:"services"`
}

// DatabaseChecker define interface para verificação de saúde do banco
type DatabaseChecker interface {
	HealthCheck(ctx context.Context) error
}

// StorageChecker define interface para verificação de saúde do storage
type StorageChecker interface {
	HealthCheck(ctx context.Context) error
}

// HealthHandler gerencia verificações de saúde
type HealthHandler struct {
	dbChecker      DatabaseChecker
	storageChecker StorageChecker
}

// NewHealthHandler cria uma nova instância de HealthHandler
func NewHealthHandler(dbChecker DatabaseChecker, storageChecker StorageChecker) *HealthHandler {
	return &HealthHandler{
		dbChecker:      dbChecker,
		storageChecker: storageChecker,
	}
}

// HealthCheck godoc
// @Summary Verifica saúde da aplicação
// @Description Retorna status de saúde da API e seus serviços dependentes
// @Tags health
// @Produce json
// @Success 200 {object} HealthCheckResponse
// @Failure 503 {object} HealthCheckResponse
// @Router /health [get]
func (h *HealthHandler) Check(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	services := make(map[string]string)
	allHealthy := true

	// Verificar banco de dados
	if h.dbChecker != nil {
		if err := h.dbChecker.HealthCheck(ctx); err != nil {
			services["database"] = "unhealthy"
			allHealthy = false
		} else {
			services["database"] = "healthy"
		}
	}

	// Verificar storage
	if h.storageChecker != nil {
		if err := h.storageChecker.HealthCheck(ctx); err != nil {
			services["storage"] = "unhealthy"
			allHealthy = false
		} else {
			services["storage"] = "healthy"
		}
	}

	healthResponse := HealthCheckResponse{
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Services:  services,
	}

	if allHealthy {
		healthResponse.Status = "healthy"
		response.OK(w, healthResponse)
	} else {
		healthResponse.Status = "unhealthy"
		// Retornar 503 com o body da resposta (não apenas mensagem)
		response.JSON(w, http.StatusServiceUnavailable, response.SuccessResponse{
			Success: false,
			Data:    healthResponse,
		})
	}
}
