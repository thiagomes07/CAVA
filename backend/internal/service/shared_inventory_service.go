package service

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
	domainErrors "github.com/thiagomes07/CAVA/backend/internal/domain/errors"
	"github.com/thiagomes07/CAVA/backend/internal/domain/repository"
	"go.uber.org/zap"
)

type sharedInventoryService struct {
	sharedRepo  repository.SharedInventoryRepository
	batchRepo   repository.BatchRepository
	userRepo    repository.UserRepository
	logger      *zap.Logger
}

func NewSharedInventoryService(
	sharedRepo repository.SharedInventoryRepository,
	batchRepo repository.BatchRepository,
	userRepo repository.UserRepository,
	logger *zap.Logger,
) *sharedInventoryService {
	return &sharedInventoryService{
		sharedRepo: sharedRepo,
		batchRepo:  batchRepo,
		userRepo:   userRepo,
		logger:     logger,
	}
}

func (s *sharedInventoryService) ShareBatch(ctx context.Context, industryID string, input entity.CreateSharedInventoryInput) (*entity.SharedInventoryBatch, error) {
	// Validar que batch existe e pertence à indústria
	batch, err := s.batchRepo.FindByID(ctx, input.BatchID)
	if err != nil {
		return nil, err
	}
	if batch.IndustryID != industryID {
		return nil, domainErrors.ForbiddenError()
	}

	// Validar que broker existe e tem role BROKER
	broker, err := s.userRepo.FindByID(ctx, input.BrokerUserID)
	if err != nil {
		return nil, err
	}
	if broker.Role != entity.RoleBroker {
		return nil, domainErrors.ValidationError("Usuário não é um broker")
	}
	if !broker.IsActive {
		return nil, domainErrors.ValidationError("Broker inativo")
	}

	// Verificar se lote já está compartilhado com este broker
	exists, err := s.sharedRepo.ExistsForBroker(ctx, input.BatchID, input.BrokerUserID)
	if err != nil {
		s.logger.Error("erro ao verificar compartilhamento existente", zap.Error(err))
		return nil, domainErrors.InternalError(err)
	}
	if exists {
		return nil, domainErrors.NewConflictError("Lote já compartilhado com este broker")
	}

	// Validar preço negociado (se fornecido)
	if input.NegotiatedPrice != nil && *input.NegotiatedPrice <= 0 {
		return nil, domainErrors.ValidationError("Preço negociado deve ser maior que 0")
	}

	// Criar compartilhamento
	shared := &entity.SharedInventoryBatch{
		ID:              uuid.New().String(),
		BatchID:         input.BatchID,
		BrokerUserID:    input.BrokerUserID,
		IndustryOwnerID: industryID,
		NegotiatedPrice: input.NegotiatedPrice,
		SharedAt:        time.Now(),
		IsActive:        true,
	}

	if err := s.sharedRepo.CreateSharedBatch(ctx, shared); err != nil {
		s.logger.Error("erro ao compartilhar lote",
			zap.String("batchId", input.BatchID),
			zap.String("brokerId", input.BrokerUserID),
			zap.Error(err),
		)
		return nil, err
	}

	s.logger.Info("lote compartilhado com sucesso",
		zap.String("sharedId", shared.ID),
		zap.String("batchId", input.BatchID),
		zap.String("brokerId", input.BrokerUserID),
	)

	return shared, nil
}

func (s *sharedInventoryService) RemoveSharedBatch(ctx context.Context, id string) error {
	// Verificar se compartilhamento existe
	_, err := s.sharedRepo.FindByID(ctx, id)
	if err != nil {
		return err
	}

	// Remover compartilhamento (hard delete)
	if err := s.sharedRepo.Delete(ctx, id); err != nil {
		s.logger.Error("erro ao remover compartilhamento",
			zap.String("sharedId", id),
			zap.Error(err),
		)
		return err
	}

	s.logger.Info("compartilhamento removido com sucesso", zap.String("sharedId", id))
	return nil
}

func (s *sharedInventoryService) UpdateNegotiatedPrice(ctx context.Context, id, brokerID string, price *float64) (*entity.SharedInventoryBatch, error) {
	// Buscar compartilhamento
	shared, err := s.sharedRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Verificar se broker é o dono do compartilhamento
	if shared.BrokerUserID != brokerID {
		return nil, domainErrors.ForbiddenError()
	}

	// Validar preço (se fornecido)
	if price != nil && *price <= 0 {
		return nil, domainErrors.ValidationError("Preço negociado deve ser maior que 0")
	}

	// Atualizar preço negociado
	if err := s.sharedRepo.UpdateNegotiatedPrice(ctx, id, price); err != nil {
		s.logger.Error("erro ao atualizar preço negociado",
			zap.String("sharedId", id),
			zap.Error(err),
		)
		return nil, err
	}

	s.logger.Info("preço negociado atualizado",
		zap.String("sharedId", id),
		zap.String("brokerId", brokerID),
	)

	// Retornar compartilhamento atualizado
	return s.sharedRepo.FindByID(ctx, id)
}

func (s *sharedInventoryService) GetBrokerInventory(ctx context.Context, brokerID string, filters entity.SharedInventoryFilters) ([]entity.SharedInventoryBatch, error) {
	// Buscar inventário compartilhado do broker
	shared, err := s.sharedRepo.FindByBrokerID(ctx, brokerID, filters)
	if err != nil {
		s.logger.Error("erro ao buscar inventário do broker",
			zap.String("brokerId", brokerID),
			zap.Error(err),
		)
		return nil, err
	}

	// Buscar dados relacionados para cada item
	for i := range shared {
		// Buscar batch
		batch, err := s.batchRepo.FindByID(ctx, shared[i].BatchID)
		if err != nil {
			s.logger.Warn("erro ao buscar lote compartilhado",
				zap.String("batchId", shared[i].BatchID),
				zap.Error(err),
			)
		} else {
			shared[i].Batch = batch
		}

		// Buscar broker
		broker, err := s.userRepo.FindByID(ctx, shared[i].BrokerUserID)
		if err != nil {
			s.logger.Warn("erro ao buscar broker",
				zap.String("brokerId", shared[i].BrokerUserID),
				zap.Error(err),
			)
		} else {
			broker.Password = "" // Limpar senha
			shared[i].Broker = broker
		}
	}

	return shared, nil
}

func (s *sharedInventoryService) GetSharedBatchesByBatchID(ctx context.Context, batchID string) ([]entity.SharedInventoryBatch, error) {
	// Buscar todos os compartilhamentos do lote
	shared, err := s.sharedRepo.FindByBatchID(ctx, batchID)
	if err != nil {
		s.logger.Error("erro ao buscar compartilhamentos do lote",
			zap.String("batchId", batchID),
			zap.Error(err),
		)
		return nil, err
	}

	// Buscar dados relacionados
	for i := range shared {
		// Buscar broker
		broker, err := s.userRepo.FindByID(ctx, shared[i].BrokerUserID)
		if err != nil {
			s.logger.Warn("erro ao buscar broker",
				zap.String("brokerId", shared[i].BrokerUserID),
				zap.Error(err),
			)
		} else {
			broker.Password = ""
			shared[i].Broker = broker
		}
	}

	return shared, nil
}

func (s *sharedInventoryService) ShareCatalog(ctx context.Context, industryID string, input entity.CreateSharedCatalogInput) (*entity.SharedCatalogPermission, error) {
	// Validar que broker existe e tem role BROKER
	broker, err := s.userRepo.FindByID(ctx, input.BrokerUserID)
	if err != nil {
		return nil, err
	}
	if broker.Role != entity.RoleBroker {
		return nil, domainErrors.ValidationError("Usuário não é um broker")
	}
	if !broker.IsActive {
		return nil, domainErrors.ValidationError("Broker inativo")
	}

	// Criar permissão de catálogo
	permission := &entity.SharedCatalogPermission{
		ID:            uuid.New().String(),
		IndustryID:    industryID,
		BrokerUserID:  input.BrokerUserID,
		CanShowPrices: input.CanShowPrices,
		GrantedAt:     time.Now(),
		IsActive:      true,
	}

	if err := s.sharedRepo.CreateCatalogPermission(ctx, permission); err != nil {
		s.logger.Error("erro ao criar permissão de catálogo",
			zap.String("industryId", industryID),
			zap.String("brokerId", input.BrokerUserID),
			zap.Error(err),
		)
		return nil, err
	}

	s.logger.Info("catálogo compartilhado com sucesso",
		zap.String("permissionId", permission.ID),
		zap.String("industryId", industryID),
		zap.String("brokerId", input.BrokerUserID),
	)

	return permission, nil
}

func (s *sharedInventoryService) RevokeCatalogAccess(ctx context.Context, industryID, brokerID string) error {
	// Buscar permissão
	permission, err := s.sharedRepo.FindCatalogPermissionByBroker(ctx, industryID, brokerID)
	if err != nil {
		return err
	}

	// Remover permissão
	if err := s.sharedRepo.DeleteCatalogPermission(ctx, permission.ID); err != nil {
		s.logger.Error("erro ao revogar acesso ao catálogo",
			zap.String("permissionId", permission.ID),
			zap.Error(err),
		)
		return err
	}

	s.logger.Info("acesso ao catálogo revogado",
		zap.String("industryId", industryID),
		zap.String("brokerId", brokerID),
	)

	return nil
}