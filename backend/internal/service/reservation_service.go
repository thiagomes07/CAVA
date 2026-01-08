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
	leadRepo        repository.LeadRepository
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
	leadRepo repository.LeadRepository,
	salesRepo repository.SalesHistoryRepository,
	db ReservationDB,
	logger *zap.Logger,
) *reservationService {
	return &reservationService{
		reservationRepo: reservationRepo,
		batchRepo:       batchRepo,
		leadRepo:        leadRepo,
		salesRepo:       salesRepo,
		db:              db,
		logger:          logger,
	}
}

func (s *reservationService) Create(ctx context.Context, userID string, input entity.CreateReservationInput) (*entity.Reservation, error) {
	// Validar leadId OU customerName/Contact
	if input.LeadID == nil && (input.CustomerName == nil || input.CustomerContact == nil) {
		return nil, domainErrors.ValidationError("LeadId ou CustomerName/CustomerContact são obrigatórios")
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

		// 2. Verificar disponibilidade
		if !batch.IsAvailable() {
			s.logger.Warn("tentativa de reserva de lote não disponível",
				zap.String("batchId", input.BatchID),
				zap.String("status", string(batch.Status)),
			)
			return domainErrors.BatchNotAvailableError()
		}

		// 3. Atualizar status do lote para RESERVADO
		if err := s.batchRepo.UpdateStatus(ctx, tx, input.BatchID, entity.BatchStatusReservado); err != nil {
			return err
		}

		// 4. Criar reserva
		reservation = &entity.Reservation{
			ID:               uuid.New().String(),
			BatchID:          input.BatchID,
			LeadID:           input.LeadID,
			ReservedByUserID: userID,
			Status:           entity.ReservationStatusAtiva,
			Notes:            input.Notes,
			ExpiresAt:        expiresAt,
			IsActive:         true,
			CreatedAt:        time.Now(),
		}

		if err := s.reservationRepo.Create(ctx, tx, reservation); err != nil {
			return err
		}

		s.logger.Info("reserva criada com sucesso",
			zap.String("reservationId", reservation.ID),
			zap.String("batchId", input.BatchID),
			zap.String("userId", userID),
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

	// Buscar lead relacionado (se houver)
	if reservation.LeadID != nil {
		lead, err := s.leadRepo.FindByID(ctx, *reservation.LeadID)
		if err != nil {
			s.logger.Warn("erro ao buscar lead da reserva",
				zap.String("reservationId", id),
				zap.Error(err),
			)
		} else {
			reservation.Lead = lead
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

		// 4. Voltar status do lote para DISPONIVEL
		if err := s.batchRepo.UpdateStatus(ctx, tx, reservation.BatchID, entity.BatchStatusDisponivel); err != nil {
			return err
		}

		s.logger.Info("reserva cancelada com sucesso",
			zap.String("reservationId", id),
			zap.String("batchId", reservation.BatchID),
		)

		return nil
	})
}

func (s *reservationService) ConfirmSale(ctx context.Context, reservationID, userID string, input entity.ConfirmSaleInput) (*entity.Sale, error) {
	// Validar preço
	if input.FinalSoldPrice <= 0 {
		return nil, domainErrors.ValidationError("Preço de venda deve ser maior que 0")
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

		// 4. Buscar batch para obter industryPrice
		batch, err := s.batchRepo.FindByID(ctx, reservation.BatchID)
		if err != nil {
			return err
		}

		// 5. Calcular comissão e net value
		netIndustryValue := batch.IndustryPrice
		brokerCommission := input.FinalSoldPrice - netIndustryValue

		// Validar que preço de venda >= preço da indústria
		if input.FinalSoldPrice < netIndustryValue {
			return domainErrors.InvalidPriceError("Preço de venda não pode ser menor que o preço da indústria")
		}

		// 6. Criar registro de venda
		sale = &entity.Sale{
			ID:               uuid.New().String(),
			BatchID:          reservation.BatchID,
			SoldByUserID:     userID,
			IndustryID:       batch.IndustryID,
			LeadID:           reservation.LeadID,
			CustomerName:     "", // Será preenchido com dados do lead ou input
			CustomerContact:  "",
			SalePrice:        input.FinalSoldPrice,
			BrokerCommission: brokerCommission,
			NetIndustryValue: netIndustryValue,
			InvoiceURL:       input.InvoiceURL,
			Notes:            input.Notes,
			SaleDate:         time.Now(),
			CreatedAt:        time.Now(),
		}

		// Preencher dados do cliente
		if reservation.LeadID != nil {
			lead, err := s.leadRepo.FindByID(ctx, *reservation.LeadID)
			if err == nil {
				sale.CustomerName = lead.Name
				sale.CustomerContact = lead.Contact
			}
		}

		if err := s.salesRepo.Create(ctx, tx, sale); err != nil {
			return err
		}

		// 7. Atualizar status do lote para VENDIDO
		if err := s.batchRepo.UpdateStatus(ctx, tx, reservation.BatchID, entity.BatchStatusVendido); err != nil {
			return err
		}

		// 8. Atualizar status da reserva para CONFIRMADA_VENDA
		if err := s.reservationRepo.UpdateStatus(ctx, tx, reservationID, entity.ReservationStatusConfirmadaVenda); err != nil {
			return err
		}

		s.logger.Info("venda confirmada com sucesso",
			zap.String("saleId", sale.ID),
			zap.String("reservationId", reservationID),
			zap.String("batchId", reservation.BatchID),
			zap.Float64("salePrice", input.FinalSoldPrice),
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

		if reservations[i].LeadID != nil {
			lead, err := s.leadRepo.FindByID(ctx, *reservations[i].LeadID)
			if err != nil {
				s.logger.Warn("erro ao buscar lead", zap.Error(err))
			} else {
				reservations[i].Lead = lead
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

			// 2. Voltar status do lote para DISPONIVEL
			if err := s.batchRepo.UpdateStatus(ctx, tx, reservation.BatchID, entity.BatchStatusDisponivel); err != nil {
				return err
			}

			count++
			s.logger.Info("reserva expirada",
				zap.String("reservationId", reservation.ID),
				zap.String("batchId", reservation.BatchID),
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