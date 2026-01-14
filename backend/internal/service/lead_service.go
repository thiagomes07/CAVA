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

type clienteService struct {
	clienteRepo     repository.ClienteRepository
	interactionRepo repository.ClienteInteractionRepository
	linkRepo        repository.SalesLinkRepository
	db              DatabaseExecutor
	logger          *zap.Logger
}

// DatabaseExecutor define interface para execução de transações
type DatabaseExecutor interface {
	ExecuteInTx(ctx context.Context, fn func(tx interface{}) error) error
}

func NewClienteService(
	clienteRepo repository.ClienteRepository,
	interactionRepo repository.ClienteInteractionRepository,
	linkRepo repository.SalesLinkRepository,
	db DatabaseExecutor,
	logger *zap.Logger,
) *clienteService {
	return &clienteService{
		clienteRepo:     clienteRepo,
		interactionRepo: interactionRepo,
		linkRepo:        linkRepo,
		db:              db,
		logger:          logger,
	}
}

func (s *clienteService) CaptureInterest(ctx context.Context, input entity.CreateClienteInput) error {
	// Validar que link de venda existe
	link, err := s.linkRepo.FindBySlug(ctx, input.SalesLinkID)
	if err != nil {
		// Se não encontrou por slug, tentar por ID
		link, err = s.linkRepo.FindByID(ctx, input.SalesLinkID)
		if err != nil {
			return domainErrors.NewNotFoundError("Link de venda")
		}
	}

	// Verificar se link está ativo e não expirado
	if !link.IsActive || link.IsExpired() {
		return domainErrors.NewNotFoundError("Link de venda")
	}

	// Verificar se cliente já existe por contato
	existingCliente, err := s.clienteRepo.FindByContact(ctx, input.Contact)
	if err != nil && !isNotFoundError(err) {
		s.logger.Error("erro ao buscar cliente por contato", zap.Error(err))
		return domainErrors.InternalError(err)
	}

	// Executar em transação
	return s.db.ExecuteInTx(ctx, func(tx interface{}) error {
		var clienteID string

		if existingCliente != nil {
			// Cliente já existe, apenas atualizar última interação
			clienteID = existingCliente.ID
			if err := s.clienteRepo.UpdateLastInteraction(ctx, nil, clienteID); err != nil {
				return err
			}
			s.logger.Info("cliente existente atualizado", zap.String("clienteId", clienteID))
		} else {
			// Criar novo cliente
			cliente := &entity.Cliente{
				ID:             uuid.New().String(),
				SalesLinkID:    link.ID,
				Name:           input.Name,
				Contact:        input.Contact,
				Message:        input.Message,
				MarketingOptIn: input.MarketingOptIn,
				Status:         entity.ClienteStatusNovo,
				CreatedAt:      time.Now(),
				UpdatedAt:      time.Now(),
			}

			if err := s.clienteRepo.Create(ctx, nil, cliente); err != nil {
				s.logger.Error("erro ao criar cliente", zap.Error(err))
				return err
			}

			clienteID = cliente.ID
			s.logger.Info("novo cliente criado", zap.String("clienteId", clienteID))
		}

		// Criar interação
		interaction := &entity.ClienteInteraction{
			ID:              uuid.New().String(),
			ClienteID:       clienteID,
			SalesLinkID:     link.ID,
			Message:         input.Message,
			InteractionType: s.determineInteractionType(link.LinkType),
			CreatedAt:       time.Now(),
		}

		// Adicionar referências de batch/product baseado no tipo de link
		if link.BatchID != nil {
			interaction.TargetBatchID = link.BatchID
		}
		if link.ProductID != nil {
			interaction.TargetProductID = link.ProductID
		}

		if err := s.interactionRepo.Create(ctx, nil, interaction); err != nil {
			s.logger.Error("erro ao criar interação", zap.Error(err))
			return err
		}

		s.logger.Info("interação criada com sucesso",
			zap.String("clienteId", clienteID),
			zap.String("linkId", link.ID),
		)

		return nil
	})
}

func (s *clienteService) GetByID(ctx context.Context, id string) (*entity.Cliente, error) {
	cliente, err := s.clienteRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Buscar link de venda relacionado
	if cliente.SalesLinkID != "" {
		link, err := s.linkRepo.FindByID(ctx, cliente.SalesLinkID)
		if err != nil {
			s.logger.Warn("erro ao buscar link do cliente",
				zap.String("clienteId", id),
				zap.String("linkId", cliente.SalesLinkID),
				zap.Error(err),
			)
		} else {
			cliente.SalesLink = link
		}
	}

	return cliente, nil
}

func (s *clienteService) List(ctx context.Context, filters entity.ClienteFilters) (*entity.ClienteListResponse, error) {
	clientes, total, err := s.clienteRepo.List(ctx, filters)
	if err != nil {
		s.logger.Error("erro ao listar clientes", zap.Error(err))
		return nil, err
	}

	// Buscar dados relacionados para cada cliente
	for i := range clientes {
		if clientes[i].SalesLinkID != "" {
			link, err := s.linkRepo.FindByID(ctx, clientes[i].SalesLinkID)
			if err != nil {
				s.logger.Warn("erro ao buscar link do cliente",
					zap.String("clienteId", clientes[i].ID),
					zap.Error(err),
				)
			} else {
				clientes[i].SalesLink = link
			}
		}
	}

	return &entity.ClienteListResponse{
		Clientes: clientes,
		Total:    total,
		Page:     filters.Page,
	}, nil
}

func (s *clienteService) UpdateStatus(ctx context.Context, id string, status entity.ClienteStatus) (*entity.Cliente, error) {
	// Validar status
	if !status.IsValid() {
		return nil, domainErrors.ValidationError("Status inválido")
	}

	// Atualizar status
	if err := s.clienteRepo.UpdateStatus(ctx, id, status); err != nil {
		s.logger.Error("erro ao atualizar status do cliente",
			zap.String("clienteId", id),
			zap.String("status", string(status)),
			zap.Error(err),
		)
		return nil, err
	}

	s.logger.Info("status do cliente atualizado",
		zap.String("clienteId", id),
		zap.String("status", string(status)),
	)

	// Retornar cliente atualizado
	return s.GetByID(ctx, id)
}

func (s *clienteService) GetInteractions(ctx context.Context, clienteID string) ([]entity.ClienteInteraction, error) {
	// Verificar se cliente existe
	_, err := s.clienteRepo.FindByID(ctx, clienteID)
	if err != nil {
		return nil, err
	}

	// Buscar interações
	interactions, err := s.interactionRepo.FindByClienteID(ctx, clienteID)
	if err != nil {
		s.logger.Error("erro ao buscar interações do cliente",
			zap.String("clienteId", clienteID),
			zap.Error(err),
		)
		return nil, err
	}

	return interactions, nil
}

// determineInteractionType determina o tipo de interação baseado no tipo de link
func (s *clienteService) determineInteractionType(linkType entity.LinkType) entity.InteractionType {
	switch linkType {
	case entity.LinkTypeLoteUnico:
		return entity.InteractionInteresseLote
	case entity.LinkTypeProdutoGeral:
		return entity.InteractionInteresseLote
	case entity.LinkTypeCatalogoCompleto:
		return entity.InteractionInteresseCatalogo
	default:
		return entity.InteractionDuvidaGeral
	}
}

// isNotFoundError verifica se é erro de not found
func isNotFoundError(err error) bool {
	if appErr, ok := err.(*domainErrors.AppError); ok {
		return appErr.Code == "NOT_FOUND"
	}
	return false
}
