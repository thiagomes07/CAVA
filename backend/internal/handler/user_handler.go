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

// UserHandler gerencia requisições de usuários
type UserHandler struct {
	userService service.UserService
	validator   *validator.Validator
	logger      *zap.Logger
}

// NewUserHandler cria uma nova instância de UserHandler
func NewUserHandler(
	userService service.UserService,
	validator *validator.Validator,
	logger *zap.Logger,
) *UserHandler {
	return &UserHandler{
		userService: userService,
		validator:   validator,
		logger:      logger,
	}
}

// List godoc
// @Summary Lista usuários
// @Description Lista usuários da indústria com filtros, busca, ordenação e paginação
// @Tags users
// @Produce json
// @Param role query string false "Filtrar por role"
// @Param search query string false "Buscar por nome, email ou telefone"
// @Param isActive query bool false "Filtrar por status (true/false)"
// @Param sortBy query string false "Campo para ordenação: name, email, created_at"
// @Param sortOrder query string false "Ordem: asc ou desc"
// @Param page query int false "Número da página"
// @Param limit query int false "Itens por página"
// @Success 200 {object} entity.UserListResponse
// @Router /api/users [get]
func (h *UserHandler) List(w http.ResponseWriter, r *http.Request) {
	// Obter industryID do contexto
	industryID := middleware.GetIndustryID(r.Context())
	if industryID == "" {
		response.Forbidden(w, "Industry ID não encontrado")
		return
	}

	// Extrair filtros da query string
	filters := entity.UserFilters{
		Page:  1,
		Limit: 50,
	}

	// Role filter
	roleStr := r.URL.Query().Get("role")
	if roleStr != "" {
		role := entity.UserRole(roleStr)
		if !role.IsValid() {
			response.BadRequest(w, "Role inválido", nil)
			return
		}
		filters.Role = &role
	}

	// Search filter
	if search := r.URL.Query().Get("search"); search != "" {
		filters.Search = &search
	}

	// IsActive filter
	if isActiveStr := r.URL.Query().Get("isActive"); isActiveStr != "" {
		if isActiveStr == "true" {
			isActive := true
			filters.IsActive = &isActive
		} else if isActiveStr == "false" {
			isActive := false
			filters.IsActive = &isActive
		}
	}

	// Sort filters
	filters.SortBy = r.URL.Query().Get("sortBy")
	filters.SortOrder = r.URL.Query().Get("sortOrder")

	// Pagination
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

	// Buscar usuários da indústria com filtros
	users, total, err := h.userService.ListByIndustryWithFilters(r.Context(), industryID, filters)
	if err != nil {
		h.logger.Error("erro ao listar usuários",
			zap.String("industryId", industryID),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	// Construir resposta com metadados
	resp := entity.UserListResponse{
		Users: users,
		Total: total,
		Page:  filters.Page,
	}

	response.OK(w, resp)
}

// GetByID godoc
// @Summary Busca usuário por ID
// @Description Retorna detalhes de um usuário específico
// @Tags users
// @Produce json
// @Param id path string true "ID do usuário"
// @Success 200 {object} entity.User
// @Failure 404 {object} response.ErrorResponse
// @Router /api/users/{id} [get]
func (h *UserHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		response.BadRequest(w, "ID do usuário é obrigatório", nil)
		return
	}

	user, err := h.userService.GetByID(r.Context(), id)
	if err != nil {
		h.logger.Error("erro ao buscar usuário",
			zap.String("id", id),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	response.OK(w, user)
}

// Create godoc
// @Summary Cria um novo usuário (vendedor interno ou admin)
// @Description Cria um novo usuário vendedor interno ou admin com senha temporária gerada automaticamente
// @Tags users
// @Accept json
// @Produce json
// @Param body body entity.CreateSellerInput true "Dados do vendedor"
// @Success 201 {object} entity.User
// @Failure 400 {object} response.ErrorResponse
// @Router /api/users [post]
func (h *UserHandler) Create(w http.ResponseWriter, r *http.Request) {
	var input entity.CreateSellerInput

	// Parse JSON body
	if err := response.ParseJSON(r, &input); err != nil {
		response.HandleError(w, err)
		return
	}

	// Se isAdmin = true, role = ADMIN_INDUSTRIA, senão VENDEDOR_INTERNO
	if input.IsAdmin {
		input.Role = entity.RoleAdminIndustria
	} else {
		input.Role = entity.RoleVendedorInterno
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

	// Criar vendedor/admin com senha temporária
	user, err := h.userService.CreateSeller(r.Context(), industryID, input)
	if err != nil {
		h.logger.Error("erro ao criar usuário",
			zap.Bool("isAdmin", input.IsAdmin),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	roleDesc := "vendedor interno"
	if input.IsAdmin {
		roleDesc = "admin"
	}

	h.logger.Info(roleDesc+" criado",
		zap.String("userId", user.ID),
		zap.String("email", user.Email),
		zap.String("industryId", industryID),
	)

	response.Created(w, user)
}

// UpdateStatus godoc
// @Summary Atualiza status do usuário
// @Description Ativa ou desativa um usuário
// @Tags users
// @Accept json
// @Produce json
// @Param id path string true "ID do usuário"
// @Param body body entity.UpdateUserStatusInput true "Status do usuário"
// @Success 200 {object} entity.User
// @Failure 400 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Router /api/users/{id}/status [patch]
func (h *UserHandler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		response.BadRequest(w, "ID do usuário é obrigatório", nil)
		return
	}

	var input entity.UpdateUserStatusInput

	// Parse JSON body
	if err := response.ParseJSON(r, &input); err != nil {
		response.HandleError(w, err)
		return
	}

	// Atualizar status
	user, err := h.userService.UpdateStatus(r.Context(), id, input.IsActive)
	if err != nil {
		h.logger.Error("erro ao atualizar status do usuário",
			zap.String("id", id),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	h.logger.Info("status do usuário atualizado",
		zap.String("userId", id),
		zap.Bool("isActive", input.IsActive),
	)

	response.OK(w, user)
}

// ListBrokers godoc
// @Summary Lista brokers
// @Description Lista brokers com estatísticas, filtros, busca, ordenação e paginação
// @Tags brokers
// @Produce json
// @Param search query string false "Buscar por nome, email ou telefone"
// @Param isActive query bool false "Filtrar por status (true/false)"
// @Param sortBy query string false "Campo para ordenação: name, email, created_at"
// @Param sortOrder query string false "Ordem: asc ou desc"
// @Param page query int false "Número da página"
// @Param limit query int false "Itens por página"
// @Success 200 {object} entity.UserListResponse
// @Router /api/brokers [get]
func (h *UserHandler) ListBrokers(w http.ResponseWriter, r *http.Request) {
	// Obter industryID do contexto
	industryID := middleware.GetIndustryID(r.Context())
	if industryID == "" {
		response.Forbidden(w, "Industry ID não encontrado")
		return
	}

	// Extrair filtros da query string
	filters := entity.UserFilters{
		Page:  1,
		Limit: 50,
	}

	// Search filter
	if search := r.URL.Query().Get("search"); search != "" {
		filters.Search = &search
	}

	// IsActive filter
	if isActiveStr := r.URL.Query().Get("isActive"); isActiveStr != "" {
		if isActiveStr == "true" {
			isActive := true
			filters.IsActive = &isActive
		} else if isActiveStr == "false" {
			isActive := false
			filters.IsActive = &isActive
		}
	}

	// Sort filters
	filters.SortBy = r.URL.Query().Get("sortBy")
	filters.SortOrder = r.URL.Query().Get("sortOrder")

	// Pagination
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

	// Buscar brokers com filtros
	brokers, total, err := h.userService.GetBrokersWithFilters(r.Context(), industryID, filters)
	if err != nil {
		h.logger.Error("erro ao listar brokers",
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	// Construir resposta com metadados (reutilizando UserListResponse mas com brokers)
	resp := map[string]interface{}{
		"brokers": brokers,
		"total":   total,
		"page":    filters.Page,
	}

	response.OK(w, resp)
}

// InviteBroker godoc
// @Summary Convida um broker
// @Description Cria usuário broker e envia email de convite
// @Tags brokers
// @Accept json
// @Produce json
// @Param body body entity.InviteBrokerInput true "Dados do broker"
// @Success 201 {object} entity.User
// @Failure 400 {object} response.ErrorResponse
// @Router /api/brokers/invite [post]
func (h *UserHandler) InviteBroker(w http.ResponseWriter, r *http.Request) {
	var input entity.InviteBrokerInput

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

	// Convidar broker
	user, err := h.userService.InviteBroker(r.Context(), industryID, input)
	if err != nil {
		h.logger.Error("erro ao convidar broker",
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	h.logger.Info("broker convidado",
		zap.String("userId", user.ID),
		zap.String("email", user.Email),
	)

	response.Created(w, user)
}

// ResendInvite godoc
// @Summary Reenvia convite de acesso
// @Description Gera nova senha temporária e reenvia email (opcionalmente para novo email)
// @Tags users
// @Accept json
// @Produce json
// @Param id path string true "ID do usuário"
// @Param body body entity.ResendInviteInput false "Novo email (opcional)"
// @Success 200 {object} entity.User
// @Failure 400 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Router /api/users/{id}/resend-invite [post]
func (h *UserHandler) ResendInvite(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		response.BadRequest(w, "ID do usuário é obrigatório", nil)
		return
	}

	var input entity.ResendInviteInput

	// Parse JSON body (pode ser vazio)
	if err := response.ParseJSON(r, &input); err != nil {
		// Ignora erro de parse se body vazio
		input = entity.ResendInviteInput{}
	}

	// Reenviar convite
	user, err := h.userService.ResendInvite(r.Context(), id, input.NewEmail)
	if err != nil {
		h.logger.Error("erro ao reenviar convite",
			zap.String("id", id),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	h.logger.Info("convite reenviado",
		zap.String("userId", id),
		zap.String("email", user.Email),
	)

	response.OK(w, user)
}

// UpdateEmail godoc
// @Summary Atualiza email do usuário
// @Description Atualiza email apenas se usuário nunca logou
// @Tags users
// @Accept json
// @Produce json
// @Param id path string true "ID do usuário"
// @Param body body entity.UpdateUserEmailInput true "Novo email"
// @Success 200 {object} entity.User
// @Failure 400 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Router /api/users/{id}/email [patch]
func (h *UserHandler) UpdateEmail(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		response.BadRequest(w, "ID do usuário é obrigatório", nil)
		return
	}

	var input entity.UpdateUserEmailInput

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

	// Atualizar email
	user, err := h.userService.UpdateEmail(r.Context(), id, input.Email)
	if err != nil {
		h.logger.Error("erro ao atualizar email",
			zap.String("id", id),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	h.logger.Info("email atualizado",
		zap.String("userId", id),
		zap.String("email", user.Email),
	)

	response.OK(w, user)
}

// UpdateBroker godoc
// @Summary Atualiza informações do broker
// @Description Admin atualiza dados do broker (nome, email, telefone, whatsapp)
// @Tags brokers
// @Accept json
// @Produce json
// @Param id path string true "ID do broker"
// @Param body body entity.UpdateBrokerInput true "Dados para atualização"
// @Success 200 {object} entity.User
// @Failure 400 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Router /api/brokers/{id} [put]
func (h *UserHandler) UpdateBroker(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		response.BadRequest(w, "ID do broker é obrigatório", nil)
		return
	}

	var input entity.UpdateBrokerInput
	if err := response.ParseJSON(r, &input); err != nil {
		response.HandleError(w, err)
		return
	}

	// Validar input
	if err := h.validator.Validate(input); err != nil {
		response.HandleError(w, err)
		return
	}

	// Atualizar broker
	user, err := h.userService.UpdateBroker(r.Context(), id, input)
	if err != nil {
		h.logger.Error("erro ao atualizar broker",
			zap.String("id", id),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	h.logger.Info("broker atualizado",
		zap.String("brokerId", user.ID),
		zap.String("email", user.Email),
	)

	response.OK(w, user)
}

// DeleteBroker godoc
// @Summary Deleta um broker
// @Description Admin deleta broker (se não houver lotes compartilhados ativos)
// @Tags brokers
// @Produce json
// @Param id path string true "ID do broker"
// @Success 204
// @Failure 400 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Router /api/brokers/{id} [delete]
func (h *UserHandler) DeleteBroker(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		response.BadRequest(w, "ID do broker é obrigatório", nil)
		return
	}

	// Deletar broker
	if err := h.userService.DeleteBroker(r.Context(), id); err != nil {
		h.logger.Error("erro ao deletar broker",
			zap.String("id", id),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	h.logger.Info("broker deletado",
		zap.String("brokerId", id),
	)

	response.NoContent(w)
}

// UpdateUser godoc
// @Summary Atualiza informações do usuário
// @Description Admin atualiza dados do vendedor/admin (nome, telefone, whatsapp - email não pode ser alterado)
// @Tags users
// @Accept json
// @Produce json
// @Param id path string true "ID do usuário"
// @Param body body entity.UpdateSellerInput true "Dados para atualização"
// @Success 200 {object} entity.User
// @Failure 400 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Router /api/users/{id} [put]
func (h *UserHandler) UpdateUser(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		response.BadRequest(w, "ID do usuário é obrigatório", nil)
		return
	}

	// Obter industryID do contexto
	industryID := middleware.GetIndustryID(r.Context())
	if industryID == "" {
		response.Forbidden(w, "Industry ID não encontrado")
		return
	}

	var input entity.UpdateSellerInput
	if err := response.ParseJSON(r, &input); err != nil {
		response.HandleError(w, err)
		return
	}

	// Validar input
	if err := h.validator.Validate(input); err != nil {
		response.HandleError(w, err)
		return
	}

	// Atualizar usuário
	user, err := h.userService.UpdateSeller(r.Context(), id, industryID, input)
	if err != nil {
		h.logger.Error("erro ao atualizar usuário",
			zap.String("id", id),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	h.logger.Info("usuário atualizado",
		zap.String("userId", user.ID),
		zap.String("email", user.Email),
	)

	response.OK(w, user)
}

// DeleteUser godoc
// @Summary Deleta um usuário
// @Description Admin deleta vendedor interno (não pode deletar admins)
// @Tags users
// @Produce json
// @Param id path string true "ID do usuário"
// @Success 204
// @Failure 400 {object} response.ErrorResponse
// @Failure 403 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Router /api/users/{id} [delete]
func (h *UserHandler) DeleteUser(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		response.BadRequest(w, "ID do usuário é obrigatório", nil)
		return
	}

	// Obter industryID do contexto
	industryID := middleware.GetIndustryID(r.Context())
	if industryID == "" {
		response.Forbidden(w, "Industry ID não encontrado")
		return
	}

	// Deletar usuário
	if err := h.userService.DeleteUser(r.Context(), id, industryID); err != nil {
		h.logger.Error("erro ao deletar usuário",
			zap.String("id", id),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	h.logger.Info("usuário deletado",
		zap.String("userId", id),
	)

	response.NoContent(w)
}
