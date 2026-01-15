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

// BatchHandler gerencia requisições de lotes
type BatchHandler struct {
	batchService service.BatchService
	validator    *validator.Validator
	logger       *zap.Logger
}

// NewBatchHandler cria uma nova instância de BatchHandler
func NewBatchHandler(
	batchService service.BatchService,
	validator *validator.Validator,
	logger *zap.Logger,
) *BatchHandler {
	return &BatchHandler{
		batchService: batchService,
		validator:    validator,
		logger:       logger,
	}
}

// List godoc
// @Summary Lista lotes
// @Description Lista lotes com filtros e paginação
// @Tags batches
// @Produce json
// @Param productId query string false "Filtrar por produto"
// @Param status query string false "Filtrar por status"
// @Param code query string false "Buscar por código"
// @Param onlyWithAvailable query bool false "Apenas lotes com chapas disponíveis"
// @Param page query int false "Número da página"
// @Param limit query int false "Itens por página"
// @Success 200 {object} entity.BatchListResponse
// @Router /api/batches [get]
func (h *BatchHandler) List(w http.ResponseWriter, r *http.Request) {
	// Obter industryID do contexto
	industryID := middleware.GetIndustryID(r.Context())
	if industryID == "" {
		response.Forbidden(w, "Industry ID não encontrado")
		return
	}

	// Extrair filtros da query string
	filters := entity.BatchFilters{
		Page:  1,
		Limit: 50,
	}

	if productID := r.URL.Query().Get("productId"); productID != "" {
		filters.ProductID = &productID
	}

	if status := r.URL.Query().Get("status"); status != "" {
		s := entity.BatchStatus(status)
		if s.IsValid() {
			filters.Status = &s
		}
	}

	if code := r.URL.Query().Get("code"); code != "" {
		filters.Code = &code
	}

	if onlyWithAvailable := r.URL.Query().Get("onlyWithAvailable"); onlyWithAvailable == "true" {
		filters.OnlyWithAvailable = true
	}

	if lowStock := r.URL.Query().Get("lowStock"); lowStock == "true" {
		filters.LowStock = true
	}

	if noStock := r.URL.Query().Get("noStock"); noStock == "true" {
		filters.NoStock = true
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

	// Parâmetros de ordenação
	if sortBy := r.URL.Query().Get("sortBy"); sortBy != "" {
		filters.SortBy = sortBy
	}

	if sortDir := r.URL.Query().Get("sortDir"); sortDir != "" {
		filters.SortDir = sortDir
	}

	// Validar filtros
	if err := h.validator.Validate(filters); err != nil {
		response.HandleError(w, err)
		return
	}

	// Buscar lotes
	result, err := h.batchService.List(r.Context(), industryID, filters)
	if err != nil {
		h.logger.Error("erro ao listar lotes",
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	response.OK(w, result)
}

// GetByID godoc
// @Summary Busca lote por ID
// @Description Retorna detalhes de um lote específico
// @Tags batches
// @Produce json
// @Param id path string true "ID do lote"
// @Success 200 {object} entity.Batch
// @Failure 404 {object} response.ErrorResponse
// @Router /api/batches/{id} [get]
func (h *BatchHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		response.BadRequest(w, "ID do lote é obrigatório", nil)
		return
	}

	batch, err := h.batchService.GetByID(r.Context(), id)
	if err != nil {
		h.logger.Error("erro ao buscar lote",
			zap.String("id", id),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	response.OK(w, batch)
}

// CheckStatus godoc
// @Summary Verifica status do lote
// @Description Retorna status atual do lote para verificação de disponibilidade
// @Tags batches
// @Produce json
// @Param id path string true "ID do lote"
// @Success 200 {object} entity.Batch
// @Failure 404 {object} response.ErrorResponse
// @Router /api/batches/{id}/status [get]
func (h *BatchHandler) CheckStatus(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		response.BadRequest(w, "ID do lote é obrigatório", nil)
		return
	}

	batch, err := h.batchService.CheckStatus(r.Context(), id)
	if err != nil {
		h.logger.Error("erro ao verificar status do lote",
			zap.String("id", id),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	response.OK(w, batch)
}

// Create godoc
// @Summary Cria um novo lote
// @Description Cria um novo lote de estoque
// @Tags batches
// @Accept json
// @Produce json
// @Param body body entity.CreateBatchInput true "Dados do lote"
// @Success 201 {object} entity.Batch
// @Failure 400 {object} response.ErrorResponse
// @Router /api/batches [post]
func (h *BatchHandler) Create(w http.ResponseWriter, r *http.Request) {
	var input entity.CreateBatchInput

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

	// Garantir que ao menos productId ou newProduct tenha sido enviado
	if (input.ProductID == nil || *input.ProductID == "") && input.NewProduct == nil {
		response.BadRequest(w, "ProductID é obrigatório quando não há novo produto", nil)
		return
	}

	// Obter industryID do contexto
	industryID := middleware.GetIndustryID(r.Context())
	if industryID == "" {
		response.Forbidden(w, "Industry ID não encontrado")
		return
	}

	// Criar lote
	batch, err := h.batchService.Create(r.Context(), industryID, input)
	if err != nil {
		h.logger.Error("erro ao criar lote",
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	h.logger.Info("lote criado",
		zap.String("batchId", batch.ID),
		zap.String("batchCode", batch.BatchCode),
	)

	response.Created(w, batch)
}

// Update godoc
// @Summary Atualiza um lote
// @Description Atualiza dados de um lote existente
// @Tags batches
// @Accept json
// @Produce json
// @Param id path string true "ID do lote"
// @Param body body entity.UpdateBatchInput true "Dados do lote"
// @Success 200 {object} entity.Batch
// @Failure 400 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Router /api/batches/{id} [put]
func (h *BatchHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		response.BadRequest(w, "ID do lote é obrigatório", nil)
		return
	}

	var input entity.UpdateBatchInput

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

	// Atualizar lote
	batch, err := h.batchService.Update(r.Context(), id, input)
	if err != nil {
		h.logger.Error("erro ao atualizar lote",
			zap.String("id", id),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	h.logger.Info("lote atualizado",
		zap.String("batchId", id),
	)

	response.OK(w, batch)
}

// UpdateStatus godoc
// @Summary Atualiza status do lote
// @Description Atualiza apenas o status de um lote
// @Tags batches
// @Accept json
// @Produce json
// @Param id path string true "ID do lote"
// @Param body body entity.UpdateBatchStatusInput true "Status do lote"
// @Success 200 {object} entity.Batch
// @Failure 400 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Router /api/batches/{id}/status [patch]
func (h *BatchHandler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		response.BadRequest(w, "ID do lote é obrigatório", nil)
		return
	}

	var input entity.UpdateBatchStatusInput

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
	batch, err := h.batchService.UpdateStatus(r.Context(), id, input.Status)
	if err != nil {
		h.logger.Error("erro ao atualizar status do lote",
			zap.String("id", id),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	h.logger.Info("status do lote atualizado",
		zap.String("batchId", id),
		zap.String("status", string(input.Status)),
	)

	response.OK(w, batch)
}

// CheckAvailability godoc
// @Summary Verifica disponibilidade de chapas
// @Description Verifica se o lote possui quantidade específica de chapas disponíveis
// @Tags batches
// @Produce json
// @Param id path string true "ID do lote"
// @Param quantity query int true "Quantidade de chapas desejada"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Router /api/batches/{id}/check-availability [get]
func (h *BatchHandler) CheckAvailability(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		response.BadRequest(w, "ID do lote é obrigatório", nil)
		return
	}

	// Obter quantidade desejada (opcional)
	quantity := 1
	if q := r.URL.Query().Get("quantity"); q != "" {
		if parsed, err := strconv.Atoi(q); err == nil && parsed > 0 {
			quantity = parsed
		}
	}

	// Verificar disponibilidade
	available, err := h.batchService.CheckAvailabilityForQuantity(r.Context(), id, quantity)
	if err != nil {
		h.logger.Error("erro ao verificar disponibilidade do lote",
			zap.String("id", id),
			zap.Int("quantity", quantity),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	// Obter informações do lote para retornar detalhes
	batch, err := h.batchService.GetByID(r.Context(), id)
	if err != nil {
		response.HandleError(w, err)
		return
	}

	response.OK(w, map[string]interface{}{
		"batchId":           id,
		"requestedQuantity": quantity,
		"available":         available,
		"availableSlabs":    batch.AvailableSlabs,
		"totalSlabs":        batch.QuantitySlabs,
	})
}
