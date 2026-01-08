package handler

import (
	"net/http"

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
// @Description Cria uma reserva de lote (atualiza status do lote para RESERVADO)
// @Tags reservations
// @Accept json
// @Produce json
// @Param body body entity.CreateReservationInput true "Dados da reserva"
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
			zap.Error(err),
		)
		response.HandleError(w, err)
		return
	}

	h.logger.Info("reserva criada",
		zap.String("reservationId", reservation.ID),
		zap.String("batchId", reservation.BatchID),
		zap.String("userId", userID),
	)

	response.Created(w, reservation)
}
