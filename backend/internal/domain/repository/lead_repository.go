package repository

import (
	"context"
	"database/sql"

	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
)

// ClienteRepository define o contrato para operações com clientes
type ClienteRepository interface {
	// Create cria um novo cliente
	Create(ctx context.Context, tx *sql.Tx, cliente *entity.Cliente) error

	// FindByID busca cliente por ID
	FindByID(ctx context.Context, id string) (*entity.Cliente, error)

	// FindByContact busca cliente por contato (email ou telefone)
	FindByContact(ctx context.Context, contact string) (*entity.Cliente, error)

	// FindBySalesLinkID busca clientes por link de venda
	FindBySalesLinkID(ctx context.Context, salesLinkID string) ([]entity.Cliente, error)

	// List lista clientes com filtros e paginação
	List(ctx context.Context, filters entity.ClienteFilters) ([]entity.Cliente, int, error)

	// Update atualiza os dados do cliente
	Update(ctx context.Context, tx *sql.Tx, cliente *entity.Cliente) error

	// UpdateLastInteraction atualiza a data da última interação
	UpdateLastInteraction(ctx context.Context, tx *sql.Tx, id string) error

	// CountByIndustry conta clientes de uma indústria
	CountByIndustry(ctx context.Context, industryID string) (int, error)
}
