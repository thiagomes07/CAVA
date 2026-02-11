package handler

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
	"github.com/thiagomes07/CAVA/backend/internal/domain/repository"
	"github.com/thiagomes07/CAVA/backend/internal/domain/service"
	"github.com/thiagomes07/CAVA/backend/pkg/response"
	"github.com/thiagomes07/CAVA/backend/pkg/validator"
	"go.uber.org/zap"
)

// SuperAdminHandler gerencia operações exclusivas do super admin
type SuperAdminHandler struct {
	industryRepo repository.IndustryRepository
	userRepo     repository.UserRepository
	userService  service.UserService
	validator    *validator.Validator
	logger       *zap.Logger
}

// NewSuperAdminHandler cria uma nova instância de SuperAdminHandler
func NewSuperAdminHandler(
	industryRepo repository.IndustryRepository,
	userRepo repository.UserRepository,
	userService service.UserService,
	validator *validator.Validator,
	logger *zap.Logger,
) *SuperAdminHandler {
	return &SuperAdminHandler{
		industryRepo: industryRepo,
		userRepo:     userRepo,
		userService:  userService,
		validator:    validator,
		logger:       logger,
	}
}

// IndustryWithAdmin representa a resposta de uma industry com seu admin
type IndustryWithAdmin struct {
	entity.Industry
	Admin *entity.User `json:"admin,omitempty"`
}

// ListIndustries godoc
// @Summary Lista todas as indústrias
// @Description Retorna todas as indústrias cadastradas na plataforma (apenas super admin)
// @Tags super-admin
// @Produce json
// @Success 200 {array} entity.Industry
// @Failure 401 {object} response.ErrorResponse
// @Failure 403 {object} response.ErrorResponse
// @Router /api/admin/industries [get]
func (h *SuperAdminHandler) ListIndustries(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	industries, err := h.industryRepo.List(ctx)
	if err != nil {
		h.logger.Error("erro ao listar indústrias",
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	response.OK(w, industries)
}

// CreateIndustryWithAdminInput representa os dados para criar uma indústria com admin
type CreateIndustryWithAdminInput struct {
	// Dados da indústria
	IndustryName string  `json:"industryName" validate:"required,min=2,max=255"`
	IndustryCNPJ *string `json:"industryCnpj,omitempty" validate:"omitempty,len=14"`
	IndustrySlug string  `json:"industrySlug" validate:"required,min=3,max=100"`
	ContactEmail *string `json:"contactEmail,omitempty" validate:"omitempty,email"`
	ContactPhone *string `json:"contactPhone,omitempty"`

	// Dados do primeiro admin
	AdminName     *string `json:"adminName,omitempty" validate:"omitempty,min=2,max=255"`
	AdminEmail    string  `json:"adminEmail" validate:"required,email"`
	AdminPassword string  `json:"adminPassword" validate:"required,min=8"`
	AdminPreferredCurrency entity.CurrencyCode `json:"adminPreferredCurrency" validate:"omitempty,oneof=BRL USD"`
}

// CreateIndustryWithAdmin godoc
// @Summary Cria uma nova indústria com seu primeiro admin
// @Description Cria uma nova indústria e o primeiro usuário admin associado (apenas super admin)
// @Tags super-admin
// @Accept json
// @Produce json
// @Param input body CreateIndustryWithAdminInput true "Dados da indústria e admin"
// @Success 201 {object} IndustryWithAdmin
// @Failure 400 {object} response.ErrorResponse
// @Failure 401 {object} response.ErrorResponse
// @Failure 403 {object} response.ErrorResponse
// @Failure 409 {object} response.ErrorResponse
// @Router /api/admin/industries [post]
func (h *SuperAdminHandler) CreateIndustryWithAdmin(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	var input CreateIndustryWithAdminInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.BadRequest(w, "Payload inválido", nil)
		return
	}

	// Validar input
	if err := h.validator.Validate(input); err != nil {
		response.HandleError(w, err)
		return
	}

	// Normalizar slug
	slug := strings.ToLower(strings.TrimSpace(input.IndustrySlug))
	slug = strings.ReplaceAll(slug, " ", "-")

	// Verificar se slug já existe
	exists, err := h.industryRepo.ExistsBySlug(ctx, slug)
	if err != nil {
		h.logger.Error("erro ao verificar slug",
			zap.String("slug", slug),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}
	if exists {
		response.Error(w, http.StatusConflict, "SLUG_EXISTS", "Este slug já está em uso", nil)
		return
	}

	// Verificar se CNPJ já existe (apenas se informado)
	var cnpj *string
	if input.IndustryCNPJ != nil && *input.IndustryCNPJ != "" {
		trimmedCNPJ := strings.TrimSpace(*input.IndustryCNPJ)
		exists, err = h.industryRepo.ExistsByCNPJ(ctx, trimmedCNPJ)
		if err != nil {
			h.logger.Error("erro ao verificar CNPJ",
				zap.String("cnpj", trimmedCNPJ),
				zap.Error(err),
			)
			response.HandleError(w, err)
			return
		}
		if exists {
			response.Error(w, http.StatusConflict, "CNPJ_EXISTS", "Este CNPJ já está cadastrado", nil)
			return
		}
		cnpj = &trimmedCNPJ
	}

	// Verificar se email do admin já existe
	exists, err = h.userRepo.ExistsByEmail(ctx, input.AdminEmail)
	if err != nil {
		h.logger.Error("erro ao verificar email do admin",
			zap.String("email", input.AdminEmail),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}
	if exists {
		response.Error(w, http.StatusConflict, "EMAIL_EXISTS", "Este email já está cadastrado", nil)
		return
	}

	// Criar indústria
	name := strings.TrimSpace(input.IndustryName)
	industry := &entity.Industry{
		ID:           uuid.New().String(),
		Name:         &name,
		CNPJ:         cnpj,
		Slug:         &slug,
		ContactEmail: input.ContactEmail,
		ContactPhone: input.ContactPhone,
		IsPublic:     false,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	if err := h.industryRepo.Create(ctx, industry); err != nil {
		h.logger.Error("erro ao criar indústria",
			zap.String("name", name),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	// Criar admin com senha definida pelo super admin
	adminName := strings.TrimSpace(input.AdminEmail)
	if input.AdminName != nil && *input.AdminName != "" {
		adminName = strings.TrimSpace(*input.AdminName)
	} else {
		// Usar parte do email antes do @ como nome
		if idx := strings.Index(input.AdminEmail, "@"); idx > 0 {
			adminName = input.AdminEmail[:idx]
		}
	}

	adminInput := entity.CreateUserInput{
		IndustryID: &industry.ID,
		Name:       adminName,
		Email:      strings.TrimSpace(input.AdminEmail),
		Password:   input.AdminPassword,
		PreferredCurrency: input.AdminPreferredCurrency,
		Role:       entity.RoleAdminIndustria,
	}

	admin, err := h.userService.Create(ctx, adminInput)
	if err != nil {
		h.logger.Error("erro ao criar admin da indústria",
			zap.String("industryId", industry.ID),
			zap.String("email", input.AdminEmail),
			zap.Error(err),
		)
		// Se falhar ao criar admin, remover indústria criada
		// TODO: implementar transaction
		response.HandleError(w, err)
		return
	}

	h.logger.Info("indústria criada com admin",
		zap.String("industryId", industry.ID),
		zap.String("industryName", name),
		zap.String("adminId", admin.ID),
		zap.String("adminEmail", admin.Email),
	)

	result := IndustryWithAdmin{
		Industry: *industry,
		Admin:    admin,
	}

	response.Created(w, result)
}

// GetIndustry godoc
// @Summary Obtém detalhes de uma indústria
// @Description Retorna os dados completos de uma indústria (apenas super admin)
// @Tags super-admin
// @Produce json
// @Param id path string true "ID da indústria"
// @Success 200 {object} entity.Industry
// @Failure 401 {object} response.ErrorResponse
// @Failure 403 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Router /api/admin/industries/{id} [get]
func (h *SuperAdminHandler) GetIndustry(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id := chi.URLParam(r, "id")

	industry, err := h.industryRepo.FindByID(ctx, id)
	if err != nil {
		h.logger.Error("erro ao buscar indústria",
			zap.String("industryId", id),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	response.OK(w, industry)
}

// UpdateIndustryInput representa os dados para atualizar uma indústria
type UpdateIndustryInput struct {
	Name         *string `json:"name,omitempty" validate:"omitempty,min=2,max=255"`
	CNPJ         *string `json:"cnpj,omitempty" validate:"omitempty,len=14"`
	Slug         *string `json:"slug,omitempty" validate:"omitempty,min=3,max=100"`
	ContactEmail *string `json:"contactEmail,omitempty" validate:"omitempty,email"`
	ContactPhone *string `json:"contactPhone,omitempty"`
	IsPublic     *bool   `json:"isPublic,omitempty"`
}

// UpdateIndustry godoc
// @Summary Atualiza uma indústria
// @Description Atualiza os dados de uma indústria (apenas super admin)
// @Tags super-admin
// @Accept json
// @Produce json
// @Param id path string true "ID da indústria"
// @Param input body UpdateIndustryInput true "Dados para atualização"
// @Success 200 {object} entity.Industry
// @Failure 400 {object} response.ErrorResponse
// @Failure 401 {object} response.ErrorResponse
// @Failure 403 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Router /api/admin/industries/{id} [patch]
func (h *SuperAdminHandler) UpdateIndustry(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id := chi.URLParam(r, "id")

	var input UpdateIndustryInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.BadRequest(w, "Payload inválido", nil)
		return
	}

	// Validar input
	if err := h.validator.Validate(input); err != nil {
		response.HandleError(w, err)
		return
	}

	// Buscar indústria
	industry, err := h.industryRepo.FindByID(ctx, id)
	if err != nil {
		h.logger.Error("erro ao buscar indústria para atualização",
			zap.String("industryId", id),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	// Verificar slug único se foi alterado
	if input.Slug != nil {
		slug := strings.ToLower(strings.TrimSpace(*input.Slug))
		if industry.Slug == nil || slug != *industry.Slug {
			exists, err := h.industryRepo.ExistsBySlug(ctx, slug)
			if err != nil {
				response.HandleError(w, err)
				return
			}
			if exists {
				response.Error(w, http.StatusConflict, "SLUG_EXISTS", "Este slug já está em uso", nil)
				return
			}
			industry.Slug = &slug
		}
	}

	// Verificar CNPJ único se foi alterado
	if input.CNPJ != nil {
		cnpj := strings.TrimSpace(*input.CNPJ)
		if industry.CNPJ == nil || cnpj != *industry.CNPJ {
			exists, err := h.industryRepo.ExistsByCNPJ(ctx, cnpj)
			if err != nil {
				response.HandleError(w, err)
				return
			}
			if exists {
				response.Error(w, http.StatusConflict, "CNPJ_EXISTS", "Este CNPJ já está cadastrado", nil)
				return
			}
			industry.CNPJ = &cnpj
		}
	}

	// Aplicar atualizações
	if input.Name != nil {
		name := strings.TrimSpace(*input.Name)
		industry.Name = &name
	}
	if input.ContactEmail != nil {
		industry.ContactEmail = input.ContactEmail
	}
	if input.ContactPhone != nil {
		industry.ContactPhone = input.ContactPhone
	}
	if input.IsPublic != nil {
		industry.IsPublic = *input.IsPublic
	}

	industry.UpdatedAt = time.Now()

	// Salvar
	if err := h.industryRepo.Update(ctx, industry); err != nil {
		h.logger.Error("erro ao atualizar indústria",
			zap.String("industryId", industry.ID),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	h.logger.Info("indústria atualizada pelo super admin",
		zap.String("industryId", industry.ID),
	)

	response.OK(w, industry)
}

// DeleteIndustry godoc
// @Summary Remove uma indústria
// @Description Remove uma indústria e todos os dados associados (apenas super admin)
// @Tags super-admin
// @Produce json
// @Param id path string true "ID da indústria"
// @Success 200 {object} map[string]bool
// @Failure 401 {object} response.ErrorResponse
// @Failure 403 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Router /api/admin/industries/{id} [delete]
func (h *SuperAdminHandler) DeleteIndustry(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id := chi.URLParam(r, "id")

	// Verificar se indústria existe
	_, err := h.industryRepo.FindByID(ctx, id)
	if err != nil {
		h.logger.Error("erro ao buscar indústria para exclusão",
			zap.String("industryId", id),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	// TODO: Implementar delete com cascade ou soft delete
	// Por enquanto, retornar erro indicando que não está implementado
	response.Error(w, http.StatusNotImplemented, "NOT_IMPLEMENTED", "Exclusão de indústria não implementada. Use soft delete desativando os usuários.", nil)
}

// GetIndustryBySlug godoc
// @Summary Obtém indústria por slug
// @Description Retorna os dados de uma indústria pelo slug (para validação de acesso)
// @Tags industries
// @Produce json
// @Param slug path string true "Slug da indústria"
// @Success 200 {object} entity.Industry
// @Failure 404 {object} response.ErrorResponse
// @Router /api/industries/by-slug/{slug} [get]
func (h *SuperAdminHandler) GetIndustryBySlug(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	slug := chi.URLParam(r, "slug")

	industry, err := h.industryRepo.FindBySlug(ctx, slug)
	if err != nil {
		h.logger.Error("erro ao buscar indústria por slug",
			zap.String("slug", slug),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	response.OK(w, industry)
}
