package service

import (
	"context"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
)

// LeadService define o contrato para operações com leads
type LeadService interface {
	// CaptureInterest captura lead de landing page (cria lead e interação em transação)
	CaptureInterest(ctx context.Context, input entity.CreateLeadInput) error

	// GetByID busca lead por ID
	GetByID(ctx context.Context, id string) (*entity.Lead, error)

	// List lista leads com filtros
	List(ctx context.Context, filters entity.LeadFilters) (*entity.LeadListResponse, error)

	// UpdateStatus atualiza status do lead
	UpdateStatus(ctx context.Context, id string, status entity.LeadStatus) (*entity.Lead, error)

	// GetInteractions busca interações do lead
	GetInteractions(ctx context.Context, leadID string) ([]entity.LeadInteraction, error)
}