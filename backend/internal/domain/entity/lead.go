package entity

import (
	"time"
)

// ClienteStatus representa o status de um cliente
type ClienteStatus string

const (
	ClienteStatusNovo      ClienteStatus = "NOVO"
	ClienteStatusContatado ClienteStatus = "CONTATADO"
	ClienteStatusResolvido ClienteStatus = "RESOLVIDO"
)

// IsValid verifica se o status do cliente é válido
func (l ClienteStatus) IsValid() bool {
	switch l {
	case ClienteStatusNovo, ClienteStatusContatado, ClienteStatusResolvido:
		return true
	}
	return false
}

// InteractionType representa os tipos de interação
type InteractionType string

const (
	InteractionInteresseLote     InteractionType = "INTERESSE_LOTE"
	InteractionInteresseCatalogo InteractionType = "INTERESSE_CATALOGO"
	InteractionDuvidaGeral       InteractionType = "DUVIDA_GERAL"
)

// Cliente representa um cliente potencial
type Cliente struct {
	ID             string        `json:"id"`
	SalesLinkID    string        `json:"salesLinkId"`
	Name           string        `json:"name"`
	Contact        string        `json:"contact"` // Email ou telefone
	Message        *string       `json:"message,omitempty"`
	MarketingOptIn bool          `json:"marketingOptIn"`
	Status         ClienteStatus `json:"status"`
	CreatedAt      time.Time     `json:"createdAt"`
	UpdatedAt      time.Time     `json:"updatedAt"`
	SalesLink      *SalesLink    `json:"salesLink,omitempty"` // Populated quando necessário
}

// ClienteInteraction representa uma interação de um cliente
type ClienteInteraction struct {
	ID              string          `json:"id"`
	ClienteID       string          `json:"clienteId"`
	SalesLinkID     string          `json:"salesLinkId"`
	TargetBatchID   *string         `json:"targetBatchId,omitempty"`
	TargetProductID *string         `json:"targetProductId,omitempty"`
	Message         *string         `json:"message,omitempty"`
	InteractionType InteractionType `json:"interactionType"`
	CreatedAt       time.Time       `json:"createdAt"`
}

// ClienteSubscription representa uma inscrição de interesse do cliente
type ClienteSubscription struct {
	ID           string    `json:"id"`
	ClienteID    string    `json:"clienteId"`
	ProductID    *string   `json:"productId,omitempty"`
	LinkedUserID string    `json:"linkedUserId"` // Vendedor dono do cliente
	CreatedAt    time.Time `json:"createdAt"`
}

// CreateClienteInput representa os dados para capturar um cliente (público)
type CreateClienteInput struct {
	SalesLinkID    string  `json:"salesLinkId" validate:"required,uuid"`
	Name           string  `json:"name" validate:"required,min=2,max=100"`
	Contact        string  `json:"contact" validate:"required,min=10"` // Email ou telefone
	Message        *string `json:"message,omitempty" validate:"omitempty,max=500"`
	MarketingOptIn bool    `json:"marketingOptIn"`
}

// CreateClienteManualInput representa os dados para criar um cliente manualmente (autenticado)
type CreateClienteManualInput struct {
	Name           string  `json:"name" validate:"required,min=2,max=100"`
	Contact        string  `json:"contact" validate:"required,min=5"` // Email ou telefone
	Message        *string `json:"message,omitempty" validate:"omitempty,max=500"`
	MarketingOptIn bool    `json:"marketingOptIn"`
}

// UpdateClienteStatusInput representa os dados para atualizar o status de um cliente
type UpdateClienteStatusInput struct {
	Status ClienteStatus `json:"status" validate:"required,oneof=NOVO CONTATADO RESOLVIDO"`
}

// ClienteFilters representa os filtros para busca de clientes
type ClienteFilters struct {
	Search    *string        `json:"search,omitempty"` // Busca por nome ou contato
	LinkID    *string        `json:"linkId,omitempty"`
	StartDate *string        `json:"startDate,omitempty"` // ISO date
	EndDate   *string        `json:"endDate,omitempty"`   // ISO date
	OptIn     *bool          `json:"optIn,omitempty"`
	Status    *ClienteStatus `json:"status,omitempty"`
	Page      int            `json:"page" validate:"min=1"`
	Limit     int            `json:"limit" validate:"min=1,max=100"`
}

// ClienteListResponse representa a resposta de listagem de clientes
type ClienteListResponse struct {
	Clientes []Cliente `json:"clientes"`
	Total    int       `json:"total"`
	Page     int       `json:"page"`
}

// CreateClienteResponse representa a resposta de criação de cliente
type CreateClienteResponse struct {
	Success bool     `json:"success"`
	Cliente *Cliente `json:"cliente,omitempty"`
}
