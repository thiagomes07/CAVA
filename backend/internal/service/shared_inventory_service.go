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
	mediaRepo   repository.MediaRepository
	productRepo repository.ProductRepository
	logger      *zap.Logger
}

func NewSharedInventoryService(
	sharedRepo repository.SharedInventoryRepository,
	batchRepo repository.BatchRepository,
	userRepo repository.UserRepository,
	mediaRepo repository.MediaRepository,
	productRepo repository.ProductRepository,
	logger *zap.Logger,
) *sharedInventoryService {
	return &sharedInventoryService{
		sharedRepo:  sharedRepo,
		batchRepo:   batchRepo,
		userRepo:    userRepo,
		mediaRepo:   mediaRepo,
		productRepo: productRepo,
		logger:      logger,
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

	// Validar que usuário existe e tem role BROKER ou VENDEDOR_INTERNO
	user, err := s.userRepo.FindByID(ctx, input.SharedWithUserID)
	if err != nil {
		return nil, err
	}
	if user.Role != entity.RoleBroker && user.Role != entity.RoleVendedorInterno {
		return nil, domainErrors.ValidationError("Usuário deve ser um broker ou vendedor interno")
	}
	if !user.IsActive {
		return nil, domainErrors.ValidationError("Usuário inativo")
	}

	// Verificar se lote já está compartilhado com este usuário
	exists, err := s.sharedRepo.ExistsForUser(ctx, input.BatchID, input.SharedWithUserID)
	if err != nil {
		s.logger.Error("erro ao verificar compartilhamento existente", zap.Error(err))
		return nil, domainErrors.InternalError(err)
	}
	if exists {
		return nil, domainErrors.NewConflictError("Lote já compartilhado com este usuário")
	}

	// Validar preço negociado (se fornecido)
	if input.NegotiatedPrice != nil && *input.NegotiatedPrice <= 0 {
		return nil, domainErrors.ValidationError("Preço negociado deve ser maior que 0")
	}

	// Criar compartilhamento
	shared := &entity.SharedInventoryBatch{
		ID:                  uuid.New().String(),
		BatchID:             input.BatchID,
		SharedWithUserID:    input.SharedWithUserID,
		IndustryOwnerID:     industryID,
		NegotiatedPrice:     input.NegotiatedPrice,
		NegotiatedPriceUnit: input.NegotiatedPriceUnit,
		SharedAt:            time.Now(),
		IsActive:            true,
	}

	if err := s.sharedRepo.CreateSharedBatch(ctx, shared); err != nil {
		s.logger.Error("erro ao compartilhar lote",
			zap.String("batchId", input.BatchID),
			zap.String("userId", input.SharedWithUserID),
			zap.Error(err),
		)
		return nil, err
	}

	s.logger.Info("lote compartilhado com sucesso",
		zap.String("sharedId", shared.ID),
		zap.String("batchId", input.BatchID),
		zap.String("userId", input.SharedWithUserID),
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

func (s *sharedInventoryService) UpdateNegotiatedPrice(ctx context.Context, id, userID string, price *float64) (*entity.SharedInventoryBatch, error) {
	// Buscar compartilhamento
	shared, err := s.sharedRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Verificar se usuário é o dono do compartilhamento
	if shared.SharedWithUserID != userID {
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
		zap.String("userId", userID),
	)

	// Retornar compartilhamento atualizado
	return s.sharedRepo.FindByID(ctx, id)
}

func (s *sharedInventoryService) GetUserInventory(ctx context.Context, userID string, filters entity.SharedInventoryFilters) ([]entity.SharedInventoryBatch, error) {
	// Buscar inventário compartilhado do usuário (broker ou vendedor interno)
	shared, err := s.sharedRepo.FindByUserID(ctx, userID, filters)
	if err != nil {
		s.logger.Error("erro ao buscar inventário do usuário",
			zap.String("userId", userID),
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
			// Buscar mídias do lote
			medias, err := s.mediaRepo.FindBatchMedias(ctx, batch.ID)
			if err != nil {
				s.logger.Warn("erro ao buscar mídias do lote",
					zap.String("batchId", batch.ID),
					zap.Error(err),
				)
				medias = []entity.Media{}
			}
			batch.Medias = medias

			// Buscar produto do lote
			product, err := s.productRepo.FindByID(ctx, batch.ProductID)
			if err != nil {
				s.logger.Warn("erro ao buscar produto do lote",
					zap.String("batchId", batch.ID),
					zap.String("productId", batch.ProductID),
					zap.Error(err),
				)
			} else {
				batch.Product = product
			}

			shared[i].Batch = batch
			// Populate calculated fields (effectivePrice, effectiveSlabPrice)
			shared[i].PopulateCalculatedFields()
		}

		// Buscar usuário com quem foi compartilhado
		user, err := s.userRepo.FindByID(ctx, shared[i].SharedWithUserID)
		if err != nil {
			s.logger.Warn("erro ao buscar usuário",
				zap.String("userId", shared[i].SharedWithUserID),
				zap.Error(err),
			)
		} else {
			user.Password = "" // Limpar senha
			shared[i].SharedWith = user
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
		// Buscar usuário com quem foi compartilhado
		user, err := s.userRepo.FindByID(ctx, shared[i].SharedWithUserID)
		if err != nil {
			s.logger.Warn("erro ao buscar usuário",
				zap.String("userId", shared[i].SharedWithUserID),
				zap.Error(err),
			)
		} else {
			user.Password = ""
			shared[i].SharedWith = user
		}
	}

	return shared, nil
}

func (s *sharedInventoryService) ExistsForUser(ctx context.Context, batchID, userID string) (bool, error) {
	exists, err := s.sharedRepo.ExistsForUser(ctx, batchID, userID)
	if err != nil {
		s.logger.Error("erro ao verificar compartilhamento",
			zap.String("batchId", batchID),
			zap.String("userId", userID),
			zap.Error(err),
		)
		return false, err
	}
	return exists, nil
}

func (s *sharedInventoryService) ShareCatalog(ctx context.Context, industryID string, input entity.CreateSharedCatalogInput) (*entity.SharedCatalogPermission, error) {
	// Validar que usuário existe e tem role BROKER ou VENDEDOR_INTERNO
	user, err := s.userRepo.FindByID(ctx, input.SharedWithUserID)
	if err != nil {
		return nil, err
	}
	if user.Role != entity.RoleBroker && user.Role != entity.RoleVendedorInterno {
		return nil, domainErrors.ValidationError("Usuário deve ser um broker ou vendedor interno")
	}
	if !user.IsActive {
		return nil, domainErrors.ValidationError("Usuário inativo")
	}

	// Criar permissão de catálogo
	permission := &entity.SharedCatalogPermission{
		ID:              uuid.New().String(),
		IndustryID:      industryID,
		SharedWithUserID: input.SharedWithUserID,
		CanShowPrices:   input.CanShowPrices,
		GrantedAt:       time.Now(),
		IsActive:        true,
	}

	if err := s.sharedRepo.CreateCatalogPermission(ctx, permission); err != nil {
		s.logger.Error("erro ao criar permissão de catálogo",
			zap.String("industryId", industryID),
			zap.String("userId", input.SharedWithUserID),
			zap.Error(err),
		)
		return nil, err
	}

	s.logger.Info("catálogo compartilhado com sucesso",
		zap.String("permissionId", permission.ID),
		zap.String("industryId", industryID),
		zap.String("userId", input.SharedWithUserID),
	)

	return permission, nil
}

func (s *sharedInventoryService) RevokeCatalogAccess(ctx context.Context, industryID, userID string) error {
	// Buscar permissão
	permission, err := s.sharedRepo.FindCatalogPermissionByUser(ctx, industryID, userID)
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
		zap.String("userId", userID),
	)

	return nil
}