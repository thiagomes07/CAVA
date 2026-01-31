package handler

import (
	"context"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
	"github.com/thiagomes07/CAVA/backend/internal/domain/repository"
	"github.com/thiagomes07/CAVA/backend/internal/domain/service"
	"github.com/thiagomes07/CAVA/backend/pkg/response"
	"github.com/thiagomes07/CAVA/backend/pkg/validator"
	"go.uber.org/zap"
)

// PublicHandler gerencia requisições públicas (sem autenticação)
type PublicHandler struct {
	salesLinkService service.SalesLinkService
	clienteService   service.ClienteService
	industryRepo     repository.IndustryRepository
	batchRepo        repository.BatchRepository
	validator        *validator.Validator
	logger           *zap.Logger
}

// NewPublicHandler cria uma nova instância de PublicHandler
func NewPublicHandler(
	salesLinkService service.SalesLinkService,
	clienteService service.ClienteService,
	industryRepo repository.IndustryRepository,
	batchRepo repository.BatchRepository,
	validator *validator.Validator,
	logger *zap.Logger,
) *PublicHandler {
	return &PublicHandler{
		salesLinkService: salesLinkService,
		clienteService:   clienteService,
		industryRepo:     industryRepo,
		batchRepo:        batchRepo,
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

	// Buscar link com dados públicos sanitizados
	publicLink, err := h.salesLinkService.GetPublicBySlug(r.Context(), slug)
	if err != nil {
		h.logger.Warn("link não encontrado",
			zap.String("slug", slug),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	// Incrementar contador de visualizações (async)
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		// Buscar o link completo para obter o ID
		link, err := h.salesLinkService.GetBySlug(ctx, slug)
		if err == nil {
			if err := h.salesLinkService.IncrementViews(ctx, link.ID); err != nil {
				h.logger.Error("erro ao incrementar views", zap.Error(err))
			}
		}
	}()

	h.logger.Debug("link público acessado", zap.String("slug", slug))

	response.OK(w, publicLink)
}

// CaptureClienteInterest godoc
// @Summary Captura interesse de cliente
// @Description Captura informações de um potencial cliente
// @Tags public
// @Accept json
// @Produce json
// @Param body body entity.CreateClienteInput true "Dados do cliente"
// @Success 201 {object} entity.CreateClienteResponse
// @Failure 400 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Router /api/public/clientes/interest [post]
func (h *PublicHandler) CaptureClienteInterest(w http.ResponseWriter, r *http.Request) {
	var input entity.CreateClienteInput

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

	// Capturar cliente
	if err := h.clienteService.CaptureInterest(r.Context(), input); err != nil {
		h.logger.Error("erro ao capturar cliente",
			zap.String("salesLinkId", input.SalesLinkID),
			zap.String("name", input.Name),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	h.logger.Info("cliente capturado",
		zap.String("salesLinkId", input.SalesLinkID),
		zap.String("name", input.Name),
	)

	response.Created(w, entity.CreateClienteResponse{Success: true})
}

// ListPublicDeposits godoc
// @Summary Lista depósitos públicos
// @Description Retorna lista de depósitos públicos com preview de fotos
// @Tags public
// @Produce json
// @Param search query string false "Busca por nome, cidade ou estado"
// @Success 200 {object} entity.PublicDepositListResponse
// @Router /api/public/deposits [get]
func (h *PublicHandler) ListPublicDeposits(w http.ResponseWriter, r *http.Request) {
	search := r.URL.Query().Get("search")
	var searchPtr *string
	if search != "" {
		searchPtr = &search
	}

	deposits, err := h.industryRepo.FindPublicDeposits(r.Context(), searchPtr)
	if err != nil {
		h.logger.Error("erro ao buscar depósitos públicos", zap.Error(err))
		response.HandleError(w, err)
		return
	}

	response.OK(w, entity.PublicDepositListResponse{
		Deposits: deposits,
		Total:    len(deposits),
	})
}

// GetPublicDepositBySlug godoc
// @Summary Busca depósito público por slug
// @Description Retorna dados de um depósito público
// @Tags public
// @Produce json
// @Param slug path string true "Slug do depósito"
// @Success 200 {object} entity.PublicDeposit
// @Failure 404 {object} response.ErrorResponse
// @Router /api/public/deposits/{slug} [get]
func (h *PublicHandler) GetPublicDepositBySlug(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	if slug == "" {
		response.BadRequest(w, "Slug é obrigatório", nil)
		return
	}

	deposit, err := h.industryRepo.FindPublicDepositBySlug(r.Context(), slug)
	if err != nil {
		h.logger.Warn("depósito não encontrado",
			zap.String("slug", slug),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	response.OK(w, deposit)
}

// GetPublicDepositBatches godoc
// @Summary Lista lotes públicos de um depósito
// @Description Retorna lotes públicos de um depósito por slug
// @Tags public
// @Produce json
// @Param slug path string true "Slug do depósito"
// @Success 200 {array} entity.PublicBatch
// @Failure 404 {object} response.ErrorResponse
// @Router /api/public/deposits/{slug}/batches [get]
func (h *PublicHandler) GetPublicDepositBatches(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	if slug == "" {
		response.BadRequest(w, "Slug é obrigatório", nil)
		return
	}

	batches, err := h.batchRepo.FindPublicBatchesByIndustrySlug(r.Context(), slug)
	if err != nil {
		h.logger.Error("erro ao buscar lotes públicos",
			zap.String("slug", slug),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	response.OK(w, batches)
}
