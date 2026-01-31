package service

import (
	"context"
	"database/sql"
	"time"

	"github.com/google/uuid"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
	domainErrors "github.com/thiagomes07/CAVA/backend/internal/domain/errors"
	"github.com/thiagomes07/CAVA/backend/internal/domain/repository"
	"go.uber.org/zap"
)

type reservationService struct {
	reservationRepo repository.ReservationRepository
	batchRepo       repository.BatchRepository
	clienteRepo     repository.ClienteRepository
	salesRepo       repository.SalesHistoryRepository
	db              ReservationDB
	logger          *zap.Logger
}

// ReservationDB define interface para operações de banco com transações
type ReservationDB interface {
	BeginTx(ctx context.Context) (*sql.Tx, error)
	ExecuteInTx(ctx context.Context, fn func(*sql.Tx) error) error
}

func NewReservationService(
	reservationRepo repository.ReservationRepository,
	batchRepo repository.BatchRepository,
	clienteRepo repository.ClienteRepository,
	salesRepo repository.SalesHistoryRepository,
	db ReservationDB,
	logger *zap.Logger,
) *reservationService {
	return &reservationService{
		reservationRepo: reservationRepo,
		batchRepo:       batchRepo,
		clienteRepo:     clienteRepo,
		salesRepo:       salesRepo,
		db:              db,
		logger:          logger,
	}
}

func (s *reservationService) Create(ctx context.Context, userID string, input entity.CreateReservationInput) (*entity.Reservation, error) {
	// Validar clienteId OU customerName/Contact
	if input.ClienteID == nil && (input.CustomerName == nil || input.CustomerContact == nil) {
		return nil, domainErrors.ValidationError("ClienteId ou CustomerName/CustomerContact são obrigatórios")
	}

	// Validar quantidade de chapas
	if input.QuantitySlabsReserved <= 0 {
		return nil, domainErrors.ValidationError("Quantidade de chapas deve ser maior que 0")
	}

	// Validar data de expiração
	var expiresAt time.Time
	if input.ExpiresAt != nil {
		expiration, err := time.Parse(time.RFC3339, *input.ExpiresAt)
		if err != nil {
			return nil, domainErrors.ValidationError("Data de expiração inválida")
		}
		if expiration.Before(time.Now()) {
			return nil, domainErrors.ValidationError("Data de expiração deve ser futura")
		}
		expiresAt = expiration
	} else {
		// Default: +7 dias
		expiresAt = time.Now().Add(7 * 24 * time.Hour)
	}

	// Executar em transação
	var reservation *entity.Reservation
	err := s.db.ExecuteInTx(ctx, func(tx *sql.Tx) error {
		// 1. Buscar lote com lock (SELECT FOR UPDATE)
		batch, err := s.batchRepo.FindByIDForUpdate(ctx, tx, input.BatchID)
		if err != nil {
			return err
		}

		// 2. Verificar disponibilidade de chapas
		if !batch.HasAvailableSlabs(input.QuantitySlabsReserved) {
			s.logger.Warn("tentativa de reserva com quantidade insuficiente de chapas",
				zap.String("batchId", input.BatchID),
				zap.Int("requested", input.QuantitySlabsReserved),
				zap.Int("available", batch.AvailableSlabs),
			)
			return domainErrors.InsufficientSlabsError(input.QuantitySlabsReserved, batch.AvailableSlabs)
		}

		// 3. Atualizar distribuição de chapas
		newAvailableSlabs := batch.AvailableSlabs - input.QuantitySlabsReserved
		newReservedSlabs := batch.ReservedSlabs + input.QuantitySlabsReserved
		newSoldSlabs := batch.SoldSlabs
		newInactiveSlabs := batch.InactiveSlabs

		if err := s.batchRepo.UpdateSlabCounts(ctx, tx, input.BatchID, newAvailableSlabs, newReservedSlabs, newSoldSlabs, newInactiveSlabs); err != nil {
			return err
		}

		newStatus := deriveBatchStatus(newAvailableSlabs, newReservedSlabs, newSoldSlabs, newInactiveSlabs)
		if newStatus != batch.Status {
			if err := s.batchRepo.UpdateStatus(ctx, tx, input.BatchID, newStatus); err != nil {
				return err
			}
		}

		// 5. Criar reserva
		reservation = &entity.Reservation{
			ID:                    uuid.New().String(),
			BatchID:               input.BatchID,
			ClienteID:             input.ClienteID,
			ReservedByUserID:      userID,
			QuantitySlabsReserved: input.QuantitySlabsReserved,
			Status:                entity.ReservationStatusAtiva,
			Notes:                 input.Notes,
			ExpiresAt:             expiresAt,
			IsActive:              true,
			CreatedAt:             time.Now(),
		}

		if err := s.reservationRepo.Create(ctx, tx, reservation); err != nil {
			return err
		}

		s.logger.Info("reserva criada com sucesso",
			zap.String("reservationId", reservation.ID),
			zap.String("batchId", input.BatchID),
			zap.String("userId", userID),
			zap.Int("quantityReserved", input.QuantitySlabsReserved),
			zap.Int("remainingAvailable", newAvailableSlabs),
		)

		return nil
	})

	if err != nil {
		s.logger.Error("erro ao criar reserva",
			zap.String("batchId", input.BatchID),
			zap.String("userId", userID),
			zap.Error(err),
		)
		return nil, err
	}

	// Retornar reserva com dados relacionados
	return s.GetByID(ctx, reservation.ID)
}

func (s *reservationService) GetByID(ctx context.Context, id string) (*entity.Reservation, error) {
	reservation, err := s.reservationRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Buscar batch relacionado
	if reservation.BatchID != "" {
		batch, err := s.batchRepo.FindByID(ctx, reservation.BatchID)
		if err != nil {
			s.logger.Warn("erro ao buscar batch da reserva",
				zap.String("reservationId", id),
				zap.Error(err),
			)
		} else {
			reservation.Batch = batch
		}
	}

	// Buscar cliente relacionado (se houver)
	if reservation.ClienteID != nil {
		cliente, err := s.clienteRepo.FindByID(ctx, *reservation.ClienteID)
		if err != nil {
			s.logger.Warn("erro ao buscar cliente da reserva",
				zap.String("reservationId", id),
				zap.Error(err),
			)
		} else {
			reservation.Cliente = cliente
		}
	}

	return reservation, nil
}

func (s *reservationService) Cancel(ctx context.Context, id string) error {
	// Executar em transação
	return s.db.ExecuteInTx(ctx, func(tx *sql.Tx) error {
		// 1. Buscar reserva
		reservation, err := s.reservationRepo.FindByID(ctx, id)
		if err != nil {
			return err
		}

		// 2. Verificar se reserva está ativa
		if reservation.Status != entity.ReservationStatusAtiva {
			return domainErrors.ValidationError("Apenas reservas ativas podem ser canceladas")
		}

		// 3. Cancelar reserva
		if err := s.reservationRepo.Cancel(ctx, tx, id); err != nil {
			return err
		}

		// 4. Devolver chapas ao lote
		batch, err := s.batchRepo.FindByIDForUpdate(ctx, tx, reservation.BatchID)
		if err != nil {
			return err
		}

		newAvailableSlabs := batch.AvailableSlabs + reservation.QuantitySlabsReserved
		newReservedSlabs := batch.ReservedSlabs - reservation.QuantitySlabsReserved
		newSoldSlabs := batch.SoldSlabs
		newInactiveSlabs := batch.InactiveSlabs
		if newReservedSlabs < 0 {
			return domainErrors.ValidationError("Quantidade reservada inconsistente")
		}

		if err := s.batchRepo.UpdateSlabCounts(ctx, tx, reservation.BatchID, newAvailableSlabs, newReservedSlabs, newSoldSlabs, newInactiveSlabs); err != nil {
			return err
		}

		newStatus := deriveBatchStatus(newAvailableSlabs, newReservedSlabs, newSoldSlabs, newInactiveSlabs)
		if newStatus != batch.Status {
			if err := s.batchRepo.UpdateStatus(ctx, tx, reservation.BatchID, newStatus); err != nil {
				return err
			}
		}

		s.logger.Info("reserva cancelada com sucesso",
			zap.String("reservationId", id),
			zap.String("batchId", reservation.BatchID),
			zap.Int("slabsReturned", reservation.QuantitySlabsReserved),
		)

		return nil
	})
}

func (s *reservationService) ConfirmSale(ctx context.Context, reservationID, userID string, input entity.ConfirmSaleInput) (*entity.Sale, error) {
	// Validar preço
	if input.FinalSoldPrice <= 0 {
		return nil, domainErrors.ValidationError("Preço de venda deve ser maior que 0")
	}

	// Validar quantidade
	if input.QuantitySlabsSold <= 0 {
		return nil, domainErrors.ValidationError("Quantidade de chapas vendidas deve ser maior que 0")
	}

	var sale *entity.Sale

	// Executar em transação
	err := s.db.ExecuteInTx(ctx, func(tx *sql.Tx) error {
		// 1. Buscar reserva
		reservation, err := s.reservationRepo.FindByID(ctx, reservationID)
		if err != nil {
			return err
		}

		// 2. Verificar se reserva está ativa
		if reservation.Status != entity.ReservationStatusAtiva {
			return domainErrors.ValidationError("Apenas reservas ativas podem ser confirmadas")
		}

		// 3. Verificar se reserva não expirou
		if reservation.IsExpired() {
			return domainErrors.ReservationExpiredError()
		}

		// 4. Validar quantidade vendida não excede reservada
		if input.QuantitySlabsSold > reservation.QuantitySlabsReserved {
			return domainErrors.ValidationError("Quantidade vendida não pode exceder quantidade reservada")
		}

		// 5. Buscar batch para obter industryPrice e calcular valores (lock)
		batch, err := s.batchRepo.FindByIDForUpdate(ctx, tx, reservation.BatchID)
		if err != nil {
			return err
		}

		// 6. Calcular área vendida e valores
		slabArea := batch.CalculateSlabArea()
		totalAreaSold := slabArea * float64(input.QuantitySlabsSold)

		// Preço por unidade de área da indústria
		pricePerUnit := batch.IndustryPrice
		priceUnit := batch.PriceUnit

		// Calcular valor base da indústria
		pricePerM2 := batch.GetPriceInUnit(entity.PriceUnitM2)
		netIndustryValue := pricePerM2 * totalAreaSold

		// Calcular comissão
		brokerCommission := input.FinalSoldPrice - netIndustryValue

		// Validar que preço de venda >= preço da indústria
		if input.FinalSoldPrice < netIndustryValue {
			return domainErrors.InvalidPriceError("Preço de venda não pode ser menor que o preço da indústria")
		}

		// 7. Criar registro de venda
		sale = &entity.Sale{
			ID:                uuid.New().String(),
			BatchID:           reservation.BatchID,
			SoldByUserID:      &userID,
			SellerName:        "", // Default
			IndustryID:        batch.IndustryID,
			ClienteID:         reservation.ClienteID,
			CustomerName:      "", // Será preenchido com dados do cliente ou input
			CustomerContact:   "",
			QuantitySlabsSold: input.QuantitySlabsSold,
			TotalAreaSold:     totalAreaSold,
			PricePerUnit:      pricePerUnit,
			PriceUnit:         priceUnit,
			SalePrice:         input.FinalSoldPrice,
			BrokerCommission:  brokerCommission,
			NetIndustryValue:  netIndustryValue,
			InvoiceURL:        input.InvoiceURL,
			Notes:             input.Notes,
			SaleDate:          time.Now(),
			CreatedAt:         time.Now(),
		}

		// Preencher dados do cliente
		if reservation.ClienteID != nil {
			cliente, err := s.clienteRepo.FindByID(ctx, *reservation.ClienteID)
			if err == nil {
				sale.CustomerName = cliente.Name
				if cliente.Email != nil && *cliente.Email != "" {
					sale.CustomerContact = *cliente.Email
				} else if cliente.Phone != nil && *cliente.Phone != "" {
					sale.CustomerContact = *cliente.Phone
				}
			}
		}

		if err := s.salesRepo.Create(ctx, tx, sale); err != nil {
			return err
		}

		// 8. Atualizar distribuição de chapas
		slabsToReturn := reservation.QuantitySlabsReserved - input.QuantitySlabsSold
		newAvailableSlabs := batch.AvailableSlabs + slabsToReturn
		newReservedSlabs := batch.ReservedSlabs - reservation.QuantitySlabsReserved
		newSoldSlabs := batch.SoldSlabs + input.QuantitySlabsSold
		newInactiveSlabs := batch.InactiveSlabs
		if newReservedSlabs < 0 {
			return domainErrors.ValidationError("Quantidade reservada inconsistente")
		}

		if err := s.batchRepo.UpdateSlabCounts(ctx, tx, reservation.BatchID, newAvailableSlabs, newReservedSlabs, newSoldSlabs, newInactiveSlabs); err != nil {
			return err
		}

		newStatus := deriveBatchStatus(newAvailableSlabs, newReservedSlabs, newSoldSlabs, newInactiveSlabs)
		if newStatus != batch.Status {
			if err := s.batchRepo.UpdateStatus(ctx, tx, reservation.BatchID, newStatus); err != nil {
				return err
			}
		}

		// 9. Atualizar status da reserva para CONFIRMADA_VENDA
		if err := s.reservationRepo.UpdateStatus(ctx, tx, reservationID, entity.ReservationStatusConfirmadaVenda); err != nil {
			return err
		}

		s.logger.Info("venda confirmada com sucesso",
			zap.String("saleId", sale.ID),
			zap.String("reservationId", reservationID),
			zap.String("batchId", reservation.BatchID),
			zap.Float64("salePrice", input.FinalSoldPrice),
			zap.Int("quantitySold", input.QuantitySlabsSold),
			zap.Float64("totalAreaSold", totalAreaSold),
		)

		return nil
	})

	if err != nil {
		s.logger.Error("erro ao confirmar venda",
			zap.String("reservationId", reservationID),
			zap.Error(err),
		)
		return nil, err
	}

	return sale, nil
}

func (s *reservationService) ListActive(ctx context.Context, userID string) ([]entity.Reservation, error) {
	reservations, err := s.reservationRepo.FindActive(ctx, userID)
	if err != nil {
		s.logger.Error("erro ao listar reservas ativas",
			zap.String("userId", userID),
			zap.Error(err),
		)
		return nil, err
	}

	// Buscar dados relacionados
	for i := range reservations {
		if reservations[i].BatchID != "" {
			batch, err := s.batchRepo.FindByID(ctx, reservations[i].BatchID)
			if err != nil {
				s.logger.Warn("erro ao buscar batch", zap.Error(err))
			} else {
				reservations[i].Batch = batch
			}
		}

		if reservations[i].ClienteID != nil {
			cliente, err := s.clienteRepo.FindByID(ctx, *reservations[i].ClienteID)
			if err != nil {
				s.logger.Warn("erro ao buscar cliente", zap.Error(err))
			} else {
				reservations[i].Cliente = cliente
			}
		}
	}

	return reservations, nil
}

func (s *reservationService) ExpireReservations(ctx context.Context) (int, error) {
	// Buscar reservas expiradas
	expiredReservations, err := s.reservationRepo.FindExpired(ctx)
	if err != nil {
		s.logger.Error("erro ao buscar reservas expiradas", zap.Error(err))
		return 0, err
	}

	count := 0
	for _, reservation := range expiredReservations {
		// Executar cada expiração em transação
		err := s.db.ExecuteInTx(ctx, func(tx *sql.Tx) error {
			// 1. Atualizar status da reserva para EXPIRADA
			if err := s.reservationRepo.UpdateStatus(ctx, tx, reservation.ID, entity.ReservationStatusExpirada); err != nil {
				return err
			}

			// 2. Devolver chapas ao lote
			batch, err := s.batchRepo.FindByIDForUpdate(ctx, tx, reservation.BatchID)
			if err != nil {
				return err
			}

			newAvailableSlabs := batch.AvailableSlabs + reservation.QuantitySlabsReserved
			newReservedSlabs := batch.ReservedSlabs - reservation.QuantitySlabsReserved
			newSoldSlabs := batch.SoldSlabs
			newInactiveSlabs := batch.InactiveSlabs
			if newReservedSlabs < 0 {
				return domainErrors.ValidationError("Quantidade reservada inconsistente")
			}

			if err := s.batchRepo.UpdateSlabCounts(ctx, tx, reservation.BatchID, newAvailableSlabs, newReservedSlabs, newSoldSlabs, newInactiveSlabs); err != nil {
				return err
			}

			newStatus := deriveBatchStatus(newAvailableSlabs, newReservedSlabs, newSoldSlabs, newInactiveSlabs)
			if newStatus != batch.Status {
				if err := s.batchRepo.UpdateStatus(ctx, tx, reservation.BatchID, newStatus); err != nil {
					return err
				}
			}

			count++
			s.logger.Info("reserva expirada",
				zap.String("reservationId", reservation.ID),
				zap.String("batchId", reservation.BatchID),
				zap.Int("slabsReturned", reservation.QuantitySlabsReserved),
			)

			return nil
		})

		if err != nil {
			s.logger.Error("erro ao expirar reserva",
				zap.String("reservationId", reservation.ID),
				zap.Error(err),
			)
			// Continuar com as próximas reservas
		}
	}

	s.logger.Info("job de expiração concluído",
		zap.Int("expiredCount", count),
		zap.Int("totalFound", len(expiredReservations)),
	)

	return count, nil
}
