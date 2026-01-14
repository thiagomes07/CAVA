package repository

import (
	"context"
	"database/sql"

	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
)

// ClienteInteractionRepository define o contrato para operações com interações de clientes
type ClienteInteractionRepository interface {
	// Create cria uma nova interação
	Create(ctx context.Context, tx *sql.Tx, interaction *entity.ClienteInteraction) error

	// FindByClienteID busca interações de um cliente
	FindByClienteID(ctx context.Context, clienteID string) ([]entity.ClienteInteraction, error)

	// FindBySalesLinkID busca interações de um link de venda
	FindBySalesLinkID(ctx context.Context, salesLinkID string) ([]entity.ClienteInteraction, error)

	// FindByID busca interação por ID
	FindByID(ctx context.Context, id string) (*entity.ClienteInteraction, error)
}
