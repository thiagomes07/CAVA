package repository

import (
	"context"
	"database/sql"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
)

// LeadRepository define o contrato para operações com leads
type LeadRepository interface {
	// Create cria um novo lead
	Create(ctx context.Context, tx *sql.Tx, lead *entity.Lead) error

	// FindByID busca lead por ID
	FindByID(ctx context.Context, id string) (*entity.Lead, error)

	// FindByContact busca lead por contato (email ou telefone)
	FindByContact(ctx context.Context, contact string) (*entity.Lead, error)

	// FindBySalesLinkID busca leads por link de venda
	FindBySalesLinkID(ctx context.Context, salesLinkID string) ([]entity.Lead, error)

	// List lista leads com filtros e paginação
	List(ctx context.Context, filters entity.LeadFilters) ([]entity.Lead, int, error)

	// Update atualiza os dados do lead
	Update(ctx context.Context, tx *sql.Tx, lead *entity.Lead) error

	// UpdateStatus atualiza o status do lead
	UpdateStatus(ctx context.Context, id string, status entity.LeadStatus) error

	// UpdateLastInteraction atualiza a data da última interação
	UpdateLastInteraction(ctx context.Context, tx *sql.Tx, id string) error

	// CountByIndustry conta leads de uma indústria
	CountByIndustry(ctx context.Context, industryID string) (int, error)
}