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

	// Criar reserva
	reservation, err := h.reservationService.Create(r.Context(), userID, input)
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
