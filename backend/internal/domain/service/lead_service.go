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
	CreateManual(ctx context.Context, input entity.CreateClienteManualInput, createdByUserID string) (*entity.Cliente, error)

	// GetByID busca cliente por ID
	GetByID(ctx context.Context, id string) (*entity.Cliente, error)

	// List lista clientes com filtros
	List(ctx context.Context, filters entity.ClienteFilters) (*entity.ClienteListResponse, error)

	// GetInteractions busca interações do cliente
	GetInteractions(ctx context.Context, clienteID string) ([]entity.ClienteInteraction, error)

	// SendLinksToClientes envia links de lotes para clientes selecionados via email
	// Apenas clientes com email válido como contato receberão o email
	SendLinksToClientes(ctx context.Context, input entity.SendLinksToClientesInput) (*entity.SendLinksResponse, error)
}
