package repository

import (
	"context"
	"database/sql"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
)

// LeadInteractionRepository define o contrato para operações com interações de leads
type LeadInteractionRepository interface {
	// Create cria uma nova interação
	Create(ctx context.Context, tx *sql.Tx, interaction *entity.LeadInteraction) error

	// FindByLeadID busca interações de um lead
	FindByLeadID(ctx context.Context, leadID string) ([]entity.LeadInteraction, error)

	// FindBySalesLinkID busca interações de um link de venda
	FindBySalesLinkID(ctx context.Context, salesLinkID string) ([]entity.LeadInteraction, error)

	// FindByID busca interação por ID
	FindByID(ctx context.Context, id string) (*entity.LeadInteraction, error)
}