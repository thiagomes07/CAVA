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

// ClienteHandler gerencia requisições de clientes
type ClienteHandler struct {
	clienteService service.ClienteService
	validator      *validator.Validator
	logger         *zap.Logger
}

// NewClienteHandler cria uma nova instância de ClienteHandler
func NewClienteHandler(
	clienteService service.ClienteService,
	validator *validator.Validator,
	logger *zap.Logger,
) *ClienteHandler {
	return &ClienteHandler{
		clienteService: clienteService,
		validator:      validator,
		logger:         logger,
	}
}

// Create godoc
// @Summary Cria um cliente manualmente
// @Description Cria um novo cliente manualmente (usuário autenticado)
// @Tags clientes
// @Accept json
// @Produce json
// @Param body body entity.CreateClienteManualInput true "Dados do cliente"
// @Success 201 {object} entity.CreateClienteResponse
// @Failure 400 {object} response.ErrorResponse
// @Failure 409 {object} response.ErrorResponse
// @Router /api/clientes [post]
func (h *ClienteHandler) Create(w http.ResponseWriter, r *http.Request) {
	var input entity.CreateClienteManualInput

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

	// Criar cliente
	cliente, err := h.clienteService.CreateManual(r.Context(), input)
	if err != nil {
		h.logger.Error("erro ao criar cliente",
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	h.logger.Info("cliente criado manualmente",
		zap.String("clienteId", cliente.ID),
		zap.String("name", cliente.Name),
	)

	response.Created(w, entity.CreateClienteResponse{Success: true, Cliente: cliente})
}

// List godoc
// @Summary Lista clientes
// @Description Lista clientes com filtros e paginação
// @Tags clientes
// @Produce json
// @Param search query string false "Buscar por nome ou contato"
// @Param linkId query string false "Filtrar por link de venda"
// @Param status query string false "Filtrar por status"
// @Param startDate query string false "Data inicial"
// @Param endDate query string false "Data final"
// @Param optIn query bool false "Filtrar por opt-in"
// @Param page query int false "Número da página"
// @Param limit query int false "Itens por página"
// @Success 200 {object} entity.ClienteListResponse
// @Router /api/clientes [get]
func (h *ClienteHandler) List(w http.ResponseWriter, r *http.Request) {
	// Extrair filtros da query string
	filters := entity.ClienteFilters{
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
		s := entity.ClienteStatus(status)
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

	// Buscar clientes
	result, err := h.clienteService.List(r.Context(), filters)
	if err != nil {
		h.logger.Error("erro ao listar clientes",
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	response.OK(w, result)
}

// GetByID godoc
// @Summary Busca cliente por ID
// @Description Retorna detalhes de um cliente específico
// @Tags clientes
// @Produce json
// @Param id path string true "ID do cliente"
// @Success 200 {object} entity.Cliente
// @Failure 404 {object} response.ErrorResponse
// @Router /api/clientes/{id} [get]
func (h *ClienteHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		response.BadRequest(w, "ID do cliente é obrigatório", nil)
		return
	}

	cliente, err := h.clienteService.GetByID(r.Context(), id)
	if err != nil {
		h.logger.Error("erro ao buscar cliente",
			zap.String("id", id),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	response.OK(w, cliente)
}

// GetInteractions godoc
// @Summary Busca interações do cliente
// @Description Retorna histórico de interações de um cliente
// @Tags clientes
// @Produce json
// @Param id path string true "ID do cliente"
// @Success 200 {array} entity.ClienteInteraction
// @Failure 404 {object} response.ErrorResponse
// @Router /api/clientes/{id}/interactions [get]
func (h *ClienteHandler) GetInteractions(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		response.BadRequest(w, "ID do cliente é obrigatório", nil)
		return
	}

	interactions, err := h.clienteService.GetInteractions(r.Context(), id)
	if err != nil {
		h.logger.Error("erro ao buscar interações do cliente",
			zap.String("id", id),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	response.OK(w, interactions)
}

// UpdateStatus godoc
// @Summary Atualiza status do cliente
// @Description Atualiza o status de um cliente
// @Tags clientes
// @Accept json
// @Produce json
// @Param id path string true "ID do cliente"
// @Param body body entity.UpdateClienteStatusInput true "Status do cliente"
// @Success 200 {object} entity.Cliente
// @Failure 400 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Router /api/clientes/{id}/status [patch]
func (h *ClienteHandler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		response.BadRequest(w, "ID do cliente é obrigatório", nil)
		return
	}

	var input entity.UpdateClienteStatusInput

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
	cliente, err := h.clienteService.UpdateStatus(r.Context(), id, input.Status)
	if err != nil {
		h.logger.Error("erro ao atualizar status do cliente",
			zap.String("id", id),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	h.logger.Info("status do cliente atualizado",
		zap.String("clienteId", id),
		zap.String("status", string(input.Status)),
	)

	response.OK(w, cliente)
}

// SendLinks godoc
// @Summary Envia links de lotes para clientes
// @Description Envia email com links de lotes para clientes selecionados
// @Tags clientes
// @Accept json
// @Produce json
// @Param body body entity.SendLinksToClientesInput true "IDs de clientes e links"
// @Success 200 {object} entity.SendLinksResponse
// @Failure 400 {object} response.ErrorResponse
// @Failure 500 {object} response.ErrorResponse
// @Router /api/clientes/send-links [post]
func (h *ClienteHandler) SendLinks(w http.ResponseWriter, r *http.Request) {
	var input entity.SendLinksToClientesInput

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

	// Enviar links
	result, err := h.clienteService.SendLinksToClientes(r.Context(), input)
	if err != nil {
		h.logger.Error("erro ao enviar links para clientes",
			zap.Int("totalClientes", len(input.ClienteIDs)),
			zap.Int("totalLinks", len(input.SalesLinkIDs)),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	h.logger.Info("links enviados para clientes",
		zap.Int("totalSent", result.TotalSent),
		zap.Int("totalFailed", result.TotalFailed),
		zap.Int("totalSkipped", result.TotalSkipped),
	)

	response.OK(w, result)
}
