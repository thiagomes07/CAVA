package handler

import (
	"net/http"

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
// @Description Lista usuários com filtro opcional por role
// @Tags users
// @Produce json
// @Param role query string false "Filtrar por role"
// @Success 200 {array} entity.User
// @Router /api/users [get]
func (h *UserHandler) List(w http.ResponseWriter, r *http.Request) {
	// Extrair filtro de role da query
	roleStr := r.URL.Query().Get("role")

	var roleFilter *entity.UserRole
	if roleStr != "" {
		role := entity.UserRole(roleStr)
		if !role.IsValid() {
			response.BadRequest(w, "Role inválido", nil)
			return
		}
		roleFilter = &role
	}

	// Buscar usuários
	users, err := h.userService.List(r.Context(), roleFilter)
	if err != nil {
		h.logger.Error("erro ao listar usuários",
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	response.OK(w, users)
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
// @Summary Cria um novo usuário (vendedor interno)
// @Description Cria um novo usuário vendedor interno com senha temporária gerada automaticamente
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

	// Forçar role como VENDEDOR_INTERNO (única opção permitida)
	input.Role = entity.RoleVendedorInterno

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

	// Criar vendedor com senha temporária
	user, err := h.userService.CreateSeller(r.Context(), industryID, input)
	if err != nil {
		h.logger.Error("erro ao criar vendedor interno",
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	h.logger.Info("vendedor interno criado",
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
// @Description Lista brokers com estatísticas
// @Tags brokers
// @Produce json
// @Success 200 {array} entity.BrokerWithStats
// @Router /api/brokers [get]
func (h *UserHandler) ListBrokers(w http.ResponseWriter, r *http.Request) {
	// Obter industryID do contexto
	industryID := middleware.GetIndustryID(r.Context())
	if industryID == "" {
		response.Forbidden(w, "Industry ID não encontrado")
		return
	}

	// Buscar brokers
	brokers, err := h.userService.GetBrokers(r.Context(), industryID)
	if err != nil {
		h.logger.Error("erro ao listar brokers",
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	response.OK(w, brokers)
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
