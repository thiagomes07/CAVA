package handler

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/thiagomes07/CAVA/backend/internal/domain/repository"
	"github.com/thiagomes07/CAVA/backend/internal/middleware"
	"github.com/thiagomes07/CAVA/backend/pkg/response"
	"github.com/thiagomes07/CAVA/backend/pkg/validator"
	"go.uber.org/zap"
)

// IndustryHandler gerencia operações de configuração da indústria
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

// GetConfig godoc
// @Summary Obtém configuração da indústria
// @Description Retorna os dados de configuração da indústria do usuário logado
// @Tags industry-config
// @Produce json
// @Success 200 {object} entity.Industry
// @Failure 401 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Router /api/industry-config [get]
func (h *IndustryHandler) GetConfig(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	industryID := middleware.GetIndustryID(ctx)

	if industryID == "" {
		response.Unauthorized(w, "Usuário não possui indústria associada")
		return
	}

	industry, err := h.industryRepo.FindByID(ctx, industryID)
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

// GetMyIndustry é um alias para compatibilidade com código legado
func (h *IndustryHandler) GetMyIndustry(w http.ResponseWriter, r *http.Request) {
	h.GetConfig(w, r)
}

// UpdateConfigInput representa os dados para atualização da configuração
type UpdateConfigInput struct {
	Name           *string `json:"name" validate:"omitempty"`
	CNPJ           *string `json:"cnpj" validate:"omitempty"`
	ContactEmail   *string `json:"contactEmail" validate:"omitempty"`
	ContactPhone   *string `json:"contactPhone" validate:"omitempty,max=20"`
	Whatsapp       *string `json:"whatsapp" validate:"omitempty,max=20"`
	Description    *string `json:"description" validate:"omitempty,max=2000"`
	City           *string `json:"city" validate:"omitempty,max=100"`
	State          *string `json:"state" validate:"omitempty,len=2"`
	BannerURL      *string `json:"bannerUrl" validate:"omitempty,url,max=500"`
	LogoURL        *string `json:"logoUrl" validate:"omitempty,max=500"`
	AddressCountry *string `json:"addressCountry" validate:"omitempty,max=100"`
	AddressState   *string `json:"addressState" validate:"omitempty,max=100"`
	AddressCity    *string `json:"addressCity" validate:"omitempty,max=255"`
	AddressStreet  *string `json:"addressStreet" validate:"omitempty,max=255"`
	AddressNumber  *string `json:"addressNumber" validate:"omitempty,max=50"`
	AddressZipCode *string `json:"addressZipCode" validate:"omitempty,max=20"`
	IsPublic       *bool   `json:"isPublic"`
}

// UpdateConfig godoc
// @Summary Atualiza configuração da indústria
// @Description Atualiza os dados de configuração da indústria do usuário logado
// @Tags industry-config
// @Accept json
// @Produce json
// @Param input body UpdateConfigInput true "Dados para atualização"
// @Success 200 {object} entity.Industry
// @Failure 400 {object} response.ErrorResponse
// @Failure 401 {object} response.ErrorResponse
// @Router /api/industry-config [patch]
func (h *IndustryHandler) UpdateConfig(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	industryID := middleware.GetIndustryID(ctx)

	if industryID == "" {
		response.Unauthorized(w, "Usuário não possui indústria associada")
		return
	}

	var input UpdateConfigInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		response.BadRequest(w, "Payload inválido", nil)
		return
	}

	// Validar input (não verificamos strings vazias aqui pois queremos permitir limpeza)
	if err := h.validator.Validate(input); err != nil {
		response.HandleError(w, err)
		return
	}

	// Limpar strings vazias para nil (para não atualizar o campo)
	if input.Name != nil && strings.TrimSpace(*input.Name) == "" {
		input.Name = nil
	}
	if input.ContactEmail != nil && strings.TrimSpace(*input.ContactEmail) == "" {
		input.ContactEmail = nil
	}
	// Validar formato de email apenas se não for vazio
	if input.ContactEmail != nil && strings.TrimSpace(*input.ContactEmail) != "" {
		if !strings.Contains(*input.ContactEmail, "@") {
			response.BadRequest(w, "Email inválido", nil)
			return
		}
	}
	if input.ContactPhone != nil && strings.TrimSpace(*input.ContactPhone) == "" {
		input.ContactPhone = nil
	}
	if input.Whatsapp != nil && strings.TrimSpace(*input.Whatsapp) == "" {
		input.Whatsapp = nil
	}
	if input.Description != nil && strings.TrimSpace(*input.Description) == "" {
		input.Description = nil
	}
	if input.City != nil && strings.TrimSpace(*input.City) == "" {
		input.City = nil
	}
	if input.State != nil && strings.TrimSpace(*input.State) == "" {
		input.State = nil
	}
	if input.BannerURL != nil && strings.TrimSpace(*input.BannerURL) == "" {
		input.BannerURL = nil
	}
	if input.AddressCountry != nil && strings.TrimSpace(*input.AddressCountry) == "" {
		input.AddressCountry = nil
	}
	if input.AddressState != nil && strings.TrimSpace(*input.AddressState) == "" {
		input.AddressState = nil
	}
	if input.AddressCity != nil && strings.TrimSpace(*input.AddressCity) == "" {
		input.AddressCity = nil
	}
	if input.AddressStreet != nil && strings.TrimSpace(*input.AddressStreet) == "" {
		input.AddressStreet = nil
	}
	if input.AddressNumber != nil && strings.TrimSpace(*input.AddressNumber) == "" {
		input.AddressNumber = nil
	}
	if input.AddressZipCode != nil && strings.TrimSpace(*input.AddressZipCode) == "" {
		input.AddressZipCode = nil
	}

	// Buscar indústria atual
	industry, err := h.industryRepo.FindByID(ctx, industryID)
	if err != nil {
		h.logger.Error("erro ao buscar indústria para atualização",
			zap.String("industryId", industryID),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	// Aplicar atualizações
	if input.Name != nil {
		trimmed := strings.TrimSpace(*input.Name)
		if trimmed == "" {
			industry.Name = nil
		} else {
			industry.Name = &trimmed
		}
	}
	if input.CNPJ != nil {
		trimmed := strings.TrimSpace(*input.CNPJ)
		if trimmed == "" {
			industry.CNPJ = nil
		} else {
			industry.CNPJ = &trimmed
		}
	}
	if input.ContactEmail != nil {
		trimmed := strings.TrimSpace(*input.ContactEmail)
		if trimmed == "" {
			industry.ContactEmail = nil
		} else {
			industry.ContactEmail = &trimmed
		}
	}
	if input.ContactPhone != nil {
		trimmed := strings.TrimSpace(*input.ContactPhone)
		if trimmed == "" {
			industry.ContactPhone = nil
		} else {
			industry.ContactPhone = &trimmed
		}
	}
	if input.Whatsapp != nil {
		trimmed := strings.TrimSpace(*input.Whatsapp)
		if trimmed == "" {
			industry.Whatsapp = nil
		} else {
			industry.Whatsapp = &trimmed
		}
	}
	if input.Description != nil {
		trimmed := strings.TrimSpace(*input.Description)
		if trimmed == "" {
			industry.Description = nil
		} else {
			industry.Description = &trimmed
		}
	}
	if input.City != nil {
		trimmed := strings.TrimSpace(*input.City)
		if trimmed == "" {
			industry.City = nil
		} else {
			industry.City = &trimmed
		}
	}
	if input.State != nil {
		trimmed := strings.TrimSpace(*input.State)
		if trimmed == "" {
			industry.State = nil
		} else {
			industry.State = &trimmed
		}
	}
	if input.BannerURL != nil {
		trimmed := strings.TrimSpace(*input.BannerURL)
		if trimmed == "" {
			industry.BannerURL = nil
		} else {
			industry.BannerURL = &trimmed
		}
	}
	if input.LogoURL != nil {
		trimmed := strings.TrimSpace(*input.LogoURL)
		if trimmed == "" {
			industry.LogoURL = nil
		} else {
			industry.LogoURL = &trimmed
		}
	}
	if input.AddressCountry != nil {
		trimmed := strings.TrimSpace(*input.AddressCountry)
		if trimmed == "" {
			industry.AddressCountry = nil
		} else {
			industry.AddressCountry = &trimmed
		}
	}
	if input.AddressState != nil {
		trimmed := strings.TrimSpace(*input.AddressState)
		if trimmed == "" {
			industry.AddressState = nil
		} else {
			industry.AddressState = &trimmed
		}
	}
	if input.AddressCity != nil {
		trimmed := strings.TrimSpace(*input.AddressCity)
		if trimmed == "" {
			industry.AddressCity = nil
		} else {
			industry.AddressCity = &trimmed
		}
	}
	if input.AddressStreet != nil {
		trimmed := strings.TrimSpace(*input.AddressStreet)
		if trimmed == "" {
			industry.AddressStreet = nil
		} else {
			industry.AddressStreet = &trimmed
		}
	}
	if input.AddressNumber != nil {
		trimmed := strings.TrimSpace(*input.AddressNumber)
		if trimmed == "" {
			industry.AddressNumber = nil
		} else {
			industry.AddressNumber = &trimmed
		}
	}
	if input.AddressZipCode != nil {
		trimmed := strings.TrimSpace(*input.AddressZipCode)
		if trimmed == "" {
			industry.AddressZipCode = nil
		} else {
			industry.AddressZipCode = &trimmed
		}
	}
	if input.IsPublic != nil {
		industry.IsPublic = *input.IsPublic
	}

	// Salvar
	if err := h.industryRepo.Update(ctx, industry); err != nil {
		h.logger.Error("erro ao atualizar indústria",
			zap.String("industryId", industry.ID),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	h.logger.Info("configuração da indústria atualizada",
		zap.String("industryId", industry.ID),
		zap.String("userId", middleware.GetUserID(ctx)),
	)

	response.OK(w, industry)
}

// UpdateMyIndustry é um alias para compatibilidade com código legado
func (h *IndustryHandler) UpdateMyIndustry(w http.ResponseWriter, r *http.Request) {
	h.UpdateConfig(w, r)
}

// DeleteLogo godoc
// @Summary Remove logo da indústria
// @Description Remove a logo da indústria do usuário logado
// @Tags industry-config
// @Produce json
// @Success 200 {object} map[string]bool
// @Failure 401 {object} response.ErrorResponse
// @Router /api/industry-config/logo [delete]
func (h *IndustryHandler) DeleteLogo(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	industryID := middleware.GetIndustryID(ctx)

	if industryID == "" {
		response.Unauthorized(w, "Usuário não possui indústria associada")
		return
	}

	industry, err := h.industryRepo.FindByID(ctx, industryID)
	if err != nil {
		response.HandleError(w, err)
		return
	}

	industry.LogoURL = nil

	if err := h.industryRepo.Update(ctx, industry); err != nil {
		h.logger.Error("erro ao remover logo",
			zap.String("industryId", industry.ID),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	response.OK(w, map[string]bool{"deleted": true})
}
