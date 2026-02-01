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

// ReservationHandler gerencia requisições de reservas
type ReservationHandler struct {
	reservationService service.ReservationService
	validator          *validator.Validator
	logger             *zap.Logger
}

// NewReservationHandler cria uma nova instância de ReservationHandler
func NewReservationHandler(
	reservationService service.ReservationService,
	validator *validator.Validator,
	logger *zap.Logger,
) *ReservationHandler {
	return &ReservationHandler{
		reservationService: reservationService,
		validator:          validator,
		logger:             logger,
	}
}

// Create godoc
// @Summary Cria uma nova reserva
// @Description Cria uma reserva de chapas de um lote (reserva quantidade específica de chapas)
// @Tags reservations
// @Accept json
// @Produce json
// @Param body body entity.CreateReservationInput true "Dados da reserva (incluindo quantitySlabsReserved)"
// @Success 201 {object} entity.Reservation
// @Failure 400 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Router /api/reservations [post]
func (h *ReservationHandler) Create(w http.ResponseWriter, r *http.Request) {
	var input entity.CreateReservationInput

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

	// Obter userID do contexto
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		response.Unauthorized(w, "Usuário não autenticado")
		return
	}

	// Obter role do usuário
	userRole := entity.UserRole(middleware.GetUserRole(r.Context()))

	// Criar reserva
	reservation, err := h.reservationService.Create(r.Context(), userID, userRole, input)
	if err != nil {
		h.logger.Error("erro ao criar reserva",
			zap.String("batchId", input.BatchID),
			zap.String("userId", userID),
			zap.Int("slabsRequested", input.QuantitySlabsReserved),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	h.logger.Info("reserva criada",
		zap.String("reservationId", reservation.ID),
		zap.String("batchId", reservation.BatchID),
		zap.String("userId", userID),
		zap.Int("slabsReserved", reservation.QuantitySlabsReserved),
	)

	response.Created(w, reservation)
}

// ConfirmSale godoc
// @Summary Confirma venda de uma reserva
// @Description Confirma venda de chapas reservadas (pode ser venda parcial ou total)
// @Tags reservations
// @Accept json
// @Produce json
// @Param id path string true "ID da reserva"
// @Param body body entity.ConfirmSaleInput true "Dados da venda (incluindo quantitySlabsSold)"
// @Success 200 {object} entity.Sale
// @Failure 400 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Router /api/reservations/{id}/confirm-sale [post]
func (h *ReservationHandler) ConfirmSale(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		response.BadRequest(w, "ID da reserva é obrigatório", nil)
		return
	}

	var input entity.ConfirmSaleInput

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

	// Obter userID do contexto
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		response.Unauthorized(w, "Usuário não autenticado")
		return
	}

	// Confirmar venda
	sale, err := h.reservationService.ConfirmSale(r.Context(), id, userID, input)
	if err != nil {
		h.logger.Error("erro ao confirmar venda",
			zap.String("reservationId", id),
			zap.String("userId", userID),
			zap.Int("slabsSold", input.QuantitySlabsSold),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	h.logger.Info("venda confirmada",
		zap.String("saleId", sale.ID),
		zap.String("reservationId", id),
		zap.String("userId", userID),
		zap.Int("slabsSold", sale.QuantitySlabsSold),
		zap.Float64("totalAreaSold", sale.TotalAreaSold),
	)

	response.OK(w, sale)
}

// Cancel godoc
// @Summary Cancela uma reserva
// @Description Cancela reserva (volta status do lote para DISPONIVEL)
// @Tags reservations
// @Produce json
// @Param id path string true "ID da reserva"
// @Success 200 {object} map[string]bool
// @Failure 400 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Router /api/reservations/{id} [delete]
func (h *ReservationHandler) Cancel(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		response.BadRequest(w, "ID da reserva é obrigatório", nil)
		return
	}

	// Cancelar reserva
	if err := h.reservationService.Cancel(r.Context(), id); err != nil {
		h.logger.Error("erro ao cancelar reserva",
			zap.String("reservationId", id),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	h.logger.Info("reserva cancelada",
		zap.String("reservationId", id),
	)

	response.OK(w, map[string]bool{"success": true})
}

// ListMy godoc
// @Summary Lista minhas reservas
// @Description Lista todas as reservas do usuário logado (broker)
// @Tags reservations
// @Produce json
// @Success 200 {array} entity.Reservation
// @Failure 401 {object} response.ErrorResponse
// @Router /api/reservations/my [get]
func (h *ReservationHandler) ListMy(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		response.Unauthorized(w, "Usuário não autenticado")
		return
	}

	reservations, err := h.reservationService.ListByUser(r.Context(), userID)
	if err != nil {
		h.logger.Error("erro ao listar minhas reservas",
			zap.String("userId", userID),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	response.OK(w, reservations)
}

// ListAll godoc
// @Summary Lista todas as reservas da indústria
// @Description Lista todas as reservas da indústria (admin)
// @Tags reservations
// @Produce json
// @Success 200 {array} entity.Reservation
// @Failure 403 {object} response.ErrorResponse
// @Router /api/reservations [get]
func (h *ReservationHandler) ListAll(w http.ResponseWriter, r *http.Request) {
	industryID := middleware.GetIndustryID(r.Context())
	if industryID == "" {
		response.Forbidden(w, "Industry ID não encontrado")
		return
	}

	reservations, err := h.reservationService.ListByIndustry(r.Context(), industryID)
	if err != nil {
		h.logger.Error("erro ao listar reservas da indústria",
			zap.String("industryId", industryID),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	// Ocultar brokerSoldPrice para admin (só visível para o broker)
	for i := range reservations {
		reservations[i].BrokerSoldPrice = nil
	}

	response.OK(w, reservations)
}

// ListPending godoc
// @Summary Lista reservas pendentes de aprovação
// @Description Lista todas as reservas com status PENDENTE_APROVACAO (apenas admin)
// @Tags reservations
// @Produce json
// @Success 200 {array} entity.Reservation
// @Failure 403 {object} response.ErrorResponse
// @Router /api/reservations/pending [get]
func (h *ReservationHandler) ListPending(w http.ResponseWriter, r *http.Request) {
	industryID := middleware.GetIndustryID(r.Context())
	if industryID == "" {
		response.Forbidden(w, "Industry ID não encontrado")
		return
	}

	reservations, err := h.reservationService.ListPending(r.Context(), industryID)
	if err != nil {
		h.logger.Error("erro ao listar reservas pendentes",
			zap.String("industryId", industryID),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	// Ocultar brokerSoldPrice para admin (só visível para o broker)
	for i := range reservations {
		reservations[i].BrokerSoldPrice = nil
	}

	response.OK(w, reservations)
}

// Approve godoc
// @Summary Aprova uma reserva
// @Description Admin aprova uma reserva pendente (status: APROVADA)
// @Tags reservations
// @Produce json
// @Param id path string true "ID da reserva"
// @Success 200 {object} entity.Reservation
// @Failure 400 {object} response.ErrorResponse
// @Failure 403 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Router /api/reservations/{id}/approve [post]
func (h *ReservationHandler) Approve(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		response.BadRequest(w, "ID da reserva é obrigatório", nil)
		return
	}

	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		response.Unauthorized(w, "Usuário não autenticado")
		return
	}

	reservation, err := h.reservationService.Approve(r.Context(), id, userID)
	if err != nil {
		h.logger.Error("erro ao aprovar reserva",
			zap.String("reservationId", id),
			zap.String("approverId", userID),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	h.logger.Info("reserva aprovada",
		zap.String("reservationId", id),
		zap.String("approverId", userID),
	)

	// Ocultar brokerSoldPrice para admin
	reservation.BrokerSoldPrice = nil

	response.OK(w, reservation)
}

// RejectInput representa os dados para rejeitar uma reserva
type RejectInput struct {
	Reason string `json:"reason" validate:"required,min=5,max=500"`
}

// Reject godoc
// @Summary Rejeita uma reserva
// @Description Admin rejeita uma reserva pendente (status: REJEITADA)
// @Tags reservations
// @Accept json
// @Produce json
// @Param id path string true "ID da reserva"
// @Param body body RejectInput true "Motivo da rejeição"
// @Success 200 {object} entity.Reservation
// @Failure 400 {object} response.ErrorResponse
// @Failure 403 {object} response.ErrorResponse
// @Failure 404 {object} response.ErrorResponse
// @Router /api/reservations/{id}/reject [post]
func (h *ReservationHandler) Reject(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		response.BadRequest(w, "ID da reserva é obrigatório", nil)
		return
	}

	var input RejectInput
	if err := response.ParseJSON(r, &input); err != nil {
		response.HandleError(w, err)
		return
	}

	if err := h.validator.Validate(input); err != nil {
		response.HandleError(w, err)
		return
	}

	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		response.Unauthorized(w, "Usuário não autenticado")
		return
	}

	reservation, err := h.reservationService.Reject(r.Context(), id, userID, input.Reason)
	if err != nil {
		h.logger.Error("erro ao rejeitar reserva",
			zap.String("reservationId", id),
			zap.String("approverId", userID),
			zap.String("reason", input.Reason),
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	h.logger.Info("reserva rejeitada",
		zap.String("reservationId", id),
		zap.String("approverId", userID),
		zap.String("reason", input.Reason),
	)

	// Ocultar brokerSoldPrice para admin
	reservation.BrokerSoldPrice = nil

	response.OK(w, reservation)
}
