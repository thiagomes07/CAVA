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

// SharedInventoryHandler gerencia requisições de inventário compartilhado
type SharedInventoryHandler struct {
	sharedInventoryService service.SharedInventoryService
	validator              *validator.Validator
	logger                 *zap.Logger
}

// NewSharedInventoryHandler cria uma nova instância de SharedInventoryHandler
func NewSharedInventoryHandler(
	sharedInventoryService service.SharedInventoryService,
	validator *validator.Validator,
	logger *zap.Logger,
) *SharedInventoryHandler {
	return &SharedInventoryHandler{
		sharedInventoryService: sharedInventoryService,
		validator:              validator,
		logger:                 logger,
	}
}

// GetBrokerSharedInventory godoc
// @Summary Busca inventário compartilhado de um broker
// @Description Retorna lotes compartilhados com um broker específico (visão admin)
// @Tags shared-inventory
// @Produce json
// @Param brokerId path string true "ID do broker"
// @Success 200 {array} entity.SharedInventoryBatch
// @Failure 404 {object} response.ErrorResponse
// @Router /api/brokers/{brokerId}/shared-inventory [get]
func (h *SharedInventoryHandler) GetBrokerSharedInventory(w http.ResponseWriter, r *http.Request) {
	brokerID := chi.URLParam(r, "brokerId")
	if brokerID == "" {
		response.BadRequest(w, "ID do broker é obrigatório", nil)
		return
	}

	// Buscar inventário compartilhado
	filters := entity.SharedInventoryFilters{}
	batches, err := h.sharedInventoryService.GetUserInventory(r.Context(), brokerID, filters)
	if err != nil {
		h.logger.Error("erro ao buscar inventário compartilhado",
			zap.String("brokerId", brokerID),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	response.OK(w, batches)
}

// ShareBatch godoc
// @Summary Compartilha lote com broker
// @Description Compartilha um lote específico com um broker
// @Tags shared-inventory
// @Accept json
// @Produce json
// @Param body body entity.CreateSharedInventoryInput true "Dados do compartilhamento"
// @Success 201 {object} entity.SharedInventoryBatch
// @Failure 400 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Router /api/shared-inventory-batches [post]
func (h *SharedInventoryHandler) ShareBatch(w http.ResponseWriter, r *http.Request) {
	var input entity.CreateSharedInventoryInput

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

	// Obter industryID do contexto
	industryID := middleware.GetIndustryID(r.Context())
	if industryID == "" {
		response.Forbidden(w, "Industry ID não encontrado")
		return
	}

	// Compartilhar lote
	shared, err := h.sharedInventoryService.ShareBatch(r.Context(), industryID, input)
	if err != nil {
		h.logger.Error("erro ao compartilhar lote",
			zap.String("batchId", input.BatchID),
			zap.String("userId", input.SharedWithUserID),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	h.logger.Info("lote compartilhado",
		zap.String("sharedId", shared.ID),
		zap.String("batchId", input.BatchID),
		zap.String("userId", input.SharedWithUserID),
	)

	response.Created(w, shared)
}

// RemoveSharedBatch godoc
// @Summary Remove compartilhamento de lote
// @Description Remove um lote do inventário compartilhado de um broker
// @Tags shared-inventory
// @Produce json
// @Param id path string true "ID do compartilhamento"
// @Success 200 {object} map[string]bool
// @Failure 404 {object} response.ErrorResponse
// @Router /api/shared-inventory-batches/{id} [delete]
func (h *SharedInventoryHandler) RemoveSharedBatch(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		response.BadRequest(w, "ID do compartilhamento é obrigatório", nil)
		return
	}

	// Remover compartilhamento
	if err := h.sharedInventoryService.RemoveSharedBatch(r.Context(), id); err != nil {
		h.logger.Error("erro ao remover compartilhamento",
			zap.String("id", id),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	h.logger.Info("compartilhamento removido",
		zap.String("sharedId", id),
	)

	response.OK(w, map[string]bool{"success": true})
}

// GetMySharedInventory godoc
// @Summary Busca meu inventário compartilhado
// @Description Retorna lotes compartilhados com o broker autenticado
// @Tags shared-inventory
// @Produce json
// @Param recent query bool false "Retornar apenas itens recentes"
// @Param status query string false "Filtrar por status do lote"
// @Param limit query int false "Limite de resultados"
// @Success 200 {array} entity.SharedInventoryBatch
// @Router /api/broker/shared-inventory [get]
func (h *SharedInventoryHandler) GetMySharedInventory(w http.ResponseWriter, r *http.Request) {
	// Obter userID do contexto (broker ID)
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		response.Unauthorized(w, "Usuário não autenticado")
		return
	}

	// Extrair filtros da query string
	filters := entity.SharedInventoryFilters{}

	if recent := r.URL.Query().Get("recent"); recent != "" {
		if b, err := strconv.ParseBool(recent); err == nil {
			filters.Recent = b
		}
	}

	if status := r.URL.Query().Get("status"); status != "" {
		filters.Status = status
	}

	if limit := r.URL.Query().Get("limit"); limit != "" {
		if l, err := strconv.Atoi(limit); err == nil && l > 0 && l <= 100 {
			filters.Limit = l
		}
	}

	// Buscar inventário compartilhado
	batches, err := h.sharedInventoryService.GetUserInventory(r.Context(), userID, filters)
	if err != nil {
		h.logger.Error("erro ao buscar meu inventário compartilhado",
			zap.String("userId", userID),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	response.OK(w, batches)
}

// UpdateNegotiatedPrice godoc
// @Summary Atualiza preço negociado
// @Description Broker atualiza seu preço negociado para um lote compartilhado
// @Tags shared-inventory
// @Accept json
// @Produce json
// @Param id path string true "ID do compartilhamento"
// @Param body body entity.UpdateNegotiatedPriceInput true "Preço negociado"
// @Success 200 {object} entity.SharedInventoryBatch
// @Failure 400 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Router /api/broker/shared-inventory/{id}/price [patch]
func (h *SharedInventoryHandler) UpdateNegotiatedPrice(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		response.BadRequest(w, "ID do compartilhamento é obrigatório", nil)
		return
	}

	var input entity.UpdateNegotiatedPriceInput

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

	// Obter userID do contexto (broker ID)
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		response.Unauthorized(w, "Usuário não autenticado")
		return
	}

	// Atualizar preço negociado
	shared, err := h.sharedInventoryService.UpdateNegotiatedPrice(r.Context(), id, userID, input.NegotiatedPrice)
	if err != nil {
		h.logger.Error("erro ao atualizar preço negociado",
			zap.String("id", id),
			zap.String("brokerId", userID),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	h.logger.Info("preço negociado atualizado",
		zap.String("sharedId", id),
		zap.String("brokerId", userID),
	)

	response.OK(w, shared)
}

// GetSharedBatchesByBatchID godoc
// @Summary Busca compartilhamentos de um lote
// @Description Retorna todos os compartilhamentos de um lote específico
// @Tags shared-inventory
// @Produce json
// @Param batchId path string true "ID do lote"
// @Success 200 {array} entity.SharedInventoryBatch
// @Failure 404 {object} response.ErrorResponse
// @Router /api/batches/{batchId}/shared [get]
func (h *SharedInventoryHandler) GetSharedBatchesByBatchID(w http.ResponseWriter, r *http.Request) {
	batchID := chi.URLParam(r, "batchId")
	if batchID == "" {
		response.BadRequest(w, "ID do lote é obrigatório", nil)
		return
	}

	// Buscar compartilhamentos
	shared, err := h.sharedInventoryService.GetSharedBatchesByBatchID(r.Context(), batchID)
	if err != nil {
		h.logger.Error("erro ao buscar compartilhamentos do lote",
			zap.String("batchId", batchID),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	response.OK(w, shared)
}
