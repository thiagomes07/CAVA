package service

import (
	"context"

	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
)

// ClienteService define o contrato para operações com clientes
type ClienteService interface {
	// CaptureInterest captura cliente de landing page (cria cliente e interação em transação)
	CaptureInterest(ctx context.Context, input entity.CreateClienteInput) error

	// CreateManual cria cliente manualmente (usuário autenticado)
	CreateManual(ctx context.Context, input entity.CreateClienteManualInput) (*entity.Cliente, error)

	// GetByID busca cliente por ID
	GetByID(ctx context.Context, id string) (*entity.Cliente, error)

	// List lista clientes com filtros
	List(ctx context.Context, filters entity.ClienteFilters) (*entity.ClienteListResponse, error)

	// UpdateStatus atualiza status do cliente
	UpdateStatus(ctx context.Context, id string, status entity.ClienteStatus) (*entity.Cliente, error)

	// GetInteractions busca interações do cliente
	GetInteractions(ctx context.Context, clienteID string) ([]entity.ClienteInteraction, error)
}
