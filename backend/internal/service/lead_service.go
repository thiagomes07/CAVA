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

type leadService struct {
	leadRepo        repository.LeadRepository
	interactionRepo repository.LeadInteractionRepository
	linkRepo        repository.SalesLinkRepository
	db              DatabaseExecutor
	logger          *zap.Logger
}

// DatabaseExecutor define interface para execução de transações
type DatabaseExecutor interface {
	ExecuteInTx(ctx context.Context, fn func(tx interface{}) error) error
}

func NewLeadService(
	leadRepo repository.LeadRepository,
	interactionRepo repository.LeadInteractionRepository,
	linkRepo repository.SalesLinkRepository,
	db DatabaseExecutor,
	logger *zap.Logger,
) *leadService {
	return &leadService{
		leadRepo:        leadRepo,
		interactionRepo: interactionRepo,
		linkRepo:        linkRepo,
		db:              db,
		logger:          logger,
	}
}

func (s *leadService) CaptureInterest(ctx context.Context, input entity.CreateLeadInput) error {
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

	// Verificar se lead já existe por contato
	existingLead, err := s.leadRepo.FindByContact(ctx, input.Contact)
	if err != nil && !isNotFoundError(err) {
		s.logger.Error("erro ao buscar lead por contato", zap.Error(err))
		return domainErrors.InternalError(err)
	}

	// Executar em transação
	return s.db.ExecuteInTx(ctx, func(tx interface{}) error {
		var leadID string

		if existingLead != nil {
			// Lead já existe, apenas atualizar última interação
			leadID = existingLead.ID
			if err := s.leadRepo.UpdateLastInteraction(ctx, nil, leadID); err != nil {
				return err
			}
			s.logger.Info("lead existente atualizado", zap.String("leadId", leadID))
		} else {
			// Criar novo lead
			lead := &entity.Lead{
				ID:             uuid.New().String(),
				SalesLinkID:    link.ID,
				Name:           input.Name,
				Contact:        input.Contact,
				Message:        input.Message,
				MarketingOptIn: input.MarketingOptIn,
				Status:         entity.LeadStatusNovo,
				CreatedAt:      time.Now(),
				UpdatedAt:      time.Now(),
			}

			if err := s.leadRepo.Create(ctx, nil, lead); err != nil {
				s.logger.Error("erro ao criar lead", zap.Error(err))
				return err
			}

			leadID = lead.ID
			s.logger.Info("novo lead criado", zap.String("leadId", leadID))
		}

		// Criar interação
		interaction := &entity.LeadInteraction{
			ID:              uuid.New().String(),
			LeadID:          leadID,
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
			zap.String("leadId", leadID),
			zap.String("linkId", link.ID),
		)

		return nil
	})
}

func (s *leadService) GetByID(ctx context.Context, id string) (*entity.Lead, error) {
	lead, err := s.leadRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Buscar link de venda relacionado
	if lead.SalesLinkID != "" {
		link, err := s.linkRepo.FindByID(ctx, lead.SalesLinkID)
		if err != nil {
			s.logger.Warn("erro ao buscar link do lead",
				zap.String("leadId", id),
				zap.String("linkId", lead.SalesLinkID),
				zap.Error(err),
			)
		} else {
			lead.SalesLink = link
		}
	}

	return lead, nil
}

func (s *leadService) List(ctx context.Context, filters entity.LeadFilters) (*entity.LeadListResponse, error) {
	leads, total, err := s.leadRepo.List(ctx, filters)
	if err != nil {
		s.logger.Error("erro ao listar leads", zap.Error(err))
		return nil, err
	}

	// Buscar dados relacionados para cada lead
	for i := range leads {
		if leads[i].SalesLinkID != "" {
			link, err := s.linkRepo.FindByID(ctx, leads[i].SalesLinkID)
			if err != nil {
				s.logger.Warn("erro ao buscar link do lead",
					zap.String("leadId", leads[i].ID),
					zap.Error(err),
				)
			} else {
				leads[i].SalesLink = link
			}
		}
	}

	return &entity.LeadListResponse{
		Leads: leads,
		Total: total,
		Page:  filters.Page,
	}, nil
}

func (s *leadService) UpdateStatus(ctx context.Context, id string, status entity.LeadStatus) (*entity.Lead, error) {
	// Validar status
	if !status.IsValid() {
		return nil, domainErrors.ValidationError("Status inválido")
	}

	// Atualizar status
	if err := s.leadRepo.UpdateStatus(ctx, id, status); err != nil {
		s.logger.Error("erro ao atualizar status do lead",
			zap.String("leadId", id),
			zap.String("status", string(status)),
			zap.Error(err),
		)
		return nil, err
	}

	s.logger.Info("status do lead atualizado",
		zap.String("leadId", id),
		zap.String("status", string(status)),
	)

	// Retornar lead atualizado
	return s.GetByID(ctx, id)
}

func (s *leadService) GetInteractions(ctx context.Context, leadID string) ([]entity.LeadInteraction, error) {
	// Verificar se lead existe
	_, err := s.leadRepo.FindByID(ctx, leadID)
	if err != nil {
		return nil, err
	}

	// Buscar interações
	interactions, err := s.interactionRepo.FindByLeadID(ctx, leadID)
	if err != nil {
		s.logger.Error("erro ao buscar interações do lead",
			zap.String("leadId", leadID),
			zap.Error(err),
		)
		return nil, err
	}

	return interactions, nil
}

// determineInteractionType determina o tipo de interação baseado no tipo de link
func (s *leadService) determineInteractionType(linkType entity.LinkType) entity.InteractionType {
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