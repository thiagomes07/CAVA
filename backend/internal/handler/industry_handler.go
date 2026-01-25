package handler

import (
	"net/http"

	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
	"github.com/thiagomes07/CAVA/backend/internal/domain/repository"
	"github.com/thiagomes07/CAVA/backend/internal/middleware"
	"github.com/thiagomes07/CAVA/backend/pkg/response"
	"github.com/thiagomes07/CAVA/backend/pkg/validator"
	"go.uber.org/zap"
)

// IndustryHandler gerencia requisições de indústrias
type IndustryHandler struct {
	industryRepo repository.IndustryRepository
	validator    *validator.Validator
	logger       *zap.Logger
}

// NewIndustryHandler cria uma nova instância de IndustryHandler
func NewIndustryHandler(
	industryRepo repository.IndustryRepository,
	validator *validator.Validator,
	logger *zap.Logger,
) *IndustryHandler {
	return &IndustryHandler{
		industryRepo: industryRepo,
		validator:    validator,
		logger:       logger,
	}
}

// GetMyIndustry godoc
// @Summary Busca indústria do usuário logado
// @Description Retorna dados da indústria do usuário autenticado
// @Tags industry
// @Produce json
// @Success 200 {object} entity.Industry
// @Router /api/industry [get]
func (h *IndustryHandler) GetMyIndustry(w http.ResponseWriter, r *http.Request) {
	industryID := middleware.GetIndustryID(r.Context())
	if industryID == "" {
		response.Forbidden(w, "Industry ID não encontrado")
		return
	}

	industry, err := h.industryRepo.FindByID(r.Context(), industryID)
	if err != nil {
		h.logger.Error("erro ao buscar indústria",
			zap.String("industryId", industryID),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	response.OK(w, industry)
}

// UpdateMyIndustry godoc
// @Summary Atualiza indústria do usuário logado
// @Description Atualiza dados da indústria do usuário autenticado
// @Tags industry
// @Accept json
// @Produce json
// @Param body body entity.UpdateIndustryInput true "Dados da indústria"
// @Success 200 {object} entity.Industry
// @Router /api/industry [patch]
func (h *IndustryHandler) UpdateMyIndustry(w http.ResponseWriter, r *http.Request) {
	industryID := middleware.GetIndustryID(r.Context())
	if industryID == "" {
		response.Forbidden(w, "Industry ID não encontrado")
		return
	}

	var input entity.UpdateIndustryInput
	if err := response.ParseJSON(r, &input); err != nil {
		response.HandleError(w, err)
		return
	}

	if err := h.validator.Validate(input); err != nil {
		response.HandleError(w, err)
		return
	}

	industry, err := h.industryRepo.FindByID(r.Context(), industryID)
	if err != nil {
		response.HandleError(w, err)
		return
	}

	// Atualizar campos fornecidos
	if input.Name != nil {
		industry.Name = *input.Name
	}
	if input.ContactEmail != nil {
		industry.ContactEmail = *input.ContactEmail
	}
	if input.ContactPhone != nil {
		industry.ContactPhone = input.ContactPhone
	}
	if input.PolicyTerms != nil {
		industry.PolicyTerms = input.PolicyTerms
	}
	if input.City != nil {
		industry.City = input.City
	}
	if input.State != nil {
		industry.State = input.State
	}
	if input.BannerURL != nil {
		industry.BannerURL = input.BannerURL
	}
	if input.LogoURL != nil {
		industry.LogoURL = input.LogoURL
	}
	if input.IsPublic != nil {
		industry.IsPublic = *input.IsPublic
	}

	if err := h.industryRepo.Update(r.Context(), industry); err != nil {
		h.logger.Error("erro ao atualizar indústria",
			zap.String("industryId", industryID),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	response.OK(w, industry)
}
