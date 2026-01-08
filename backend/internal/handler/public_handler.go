package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
	"github.com/thiagomes07/CAVA/backend/internal/domain/service"
	"github.com/thiagomes07/CAVA/backend/pkg/response"
	"github.com/thiagomes07/CAVA/backend/pkg/validator"
	"go.uber.org/zap"
)

// PublicHandler gerencia requisições públicas (sem autenticação)
type PublicHandler struct {
	salesLinkService service.SalesLinkService
	leadService      service.LeadService
	validator        *validator.Validator
	logger           *zap.Logger
}

// NewPublicHandler cria uma nova instância de PublicHandler
func NewPublicHandler(
	salesLinkService service.SalesLinkService,
	leadService service.LeadService,
	validator *validator.Validator,
	logger *zap.Logger,
) *PublicHandler {
	return &PublicHandler{
		salesLinkService: salesLinkService,
		leadService:      leadService,
		validator:        validator,
		logger:           logger,
	}
}

// GetLinkBySlug godoc
// @Summary Busca link por slug
// @Description Retorna dados do link de venda para landing page pública
// @Tags public
// @Produce json
// @Param slug path string true "Slug do link"
// @Success 200 {object} entity.SalesLink
// @Failure 404 {object} response.ErrorResponse
// @Router /api/public/links/{slug} [get]
func (h *PublicHandler) GetLinkBySlug(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	if slug == "" {
		response.BadRequest(w, "Slug é obrigatório", nil)
		return
	}

	// Buscar link
	link, err := h.salesLinkService.GetBySlug(r.Context(), slug)
	if err != nil {
		h.logger.Warn("link não encontrado",
			zap.String("slug", slug),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	// Verificar se está ativo e não expirado
	if !link.IsActive {
		response.NotFound(w, "Link não encontrado")
		return
	}

	if link.IsExpired() {
		response.NotFound(w, "Link expirado")
		return
	}

	// Incrementar contador de visualizações (async, não bloquear resposta)
	go func() {
		if err := h.salesLinkService.IncrementViews(r.Context(), link.ID); err != nil {
			h.logger.Error("erro ao incrementar views",
				zap.String("linkId", link.ID),
				zap.Error(err),
			)
		}
	}()

	h.logger.Debug("link público acessado",
		zap.String("slug", slug),
		zap.String("linkId", link.ID),
	)

	response.OK(w, link)
}

// CaptureLeadInterest godoc
// @Summary Captura interesse de lead
// @Description Captura informações de um potencial cliente
// @Tags public
// @Accept json
// @Produce json
// @Param body body entity.CreateLeadInput true "Dados do lead"
// @Success 201 {object} entity.CreateLeadResponse
// @Failure 400 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Router /api/public/leads/interest [post]
func (h *PublicHandler) CaptureLeadInterest(w http.ResponseWriter, r *http.Request) {
	var input entity.CreateLeadInput

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

	// Capturar lead
	if err := h.leadService.CaptureInterest(r.Context(), input); err != nil {
		h.logger.Error("erro ao capturar lead",
			zap.String("salesLinkId", input.SalesLinkID),
			zap.String("name", input.Name),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	h.logger.Info("lead capturado",
		zap.String("salesLinkId", input.SalesLinkID),
		zap.String("name", input.Name),
		zap.String("contact", input.Contact),
	)

	response.Created(w, entity.CreateLeadResponse{Success: true})
}
