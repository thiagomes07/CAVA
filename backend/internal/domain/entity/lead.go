package entity

import (
	"time"
)

// LeadStatus representa o status de um lead
type LeadStatus string

const (
	LeadStatusNovo      LeadStatus = "NOVO"
	LeadStatusContatado LeadStatus = "CONTATADO"
	LeadStatusResolvido LeadStatus = "RESOLVIDO"
)

// IsValid verifica se o status do lead é válido
func (l LeadStatus) IsValid() bool {
	switch l {
	case LeadStatusNovo, LeadStatusContatado, LeadStatusResolvido:
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

// Lead representa um cliente potencial
type Lead struct {
	ID              string     `json:"id"`
	SalesLinkID     string     `json:"salesLinkId"`
	Name            string     `json:"name"`
	Contact         string     `json:"contact"` // Email ou telefone
	Message         *string    `json:"message,omitempty"`
	MarketingOptIn  bool       `json:"marketingOptIn"`
	Status          LeadStatus `json:"status"`
	CreatedAt       time.Time  `json:"createdAt"`
	UpdatedAt       time.Time  `json:"updatedAt"`
	SalesLink       *SalesLink `json:"salesLink,omitempty"` // Populated quando necessário
}

// LeadInteraction representa uma interação de um lead
type LeadInteraction struct {
	ID              string          `json:"id"`
	LeadID          string          `json:"leadId"`
	SalesLinkID     string          `json:"salesLinkId"`
	TargetBatchID   *string         `json:"targetBatchId,omitempty"`
	TargetProductID *string         `json:"targetProductId,omitempty"`
	Message         *string         `json:"message,omitempty"`
	InteractionType InteractionType `json:"interactionType"`
	CreatedAt       time.Time       `json:"createdAt"`
}

// LeadSubscription representa uma inscrição de interesse do lead
type LeadSubscription struct {
	ID           string    `json:"id"`
	LeadID       string    `json:"leadId"`
	ProductID    *string   `json:"productId,omitempty"`
	LinkedUserID string    `json:"linkedUserId"` // Vendedor dono do lead
	CreatedAt    time.Time `json:"createdAt"`
}

// CreateLeadInput representa os dados para capturar um lead (público)
type CreateLeadInput struct {
	SalesLinkID    string  `json:"salesLinkId" validate:"required,uuid"`
	Name           string  `json:"name" validate:"required,min=2,max=100"`
	Contact        string  `json:"contact" validate:"required,min=10"` // Email ou telefone
	Message        *string `json:"message,omitempty" validate:"omitempty,max=500"`
	MarketingOptIn bool    `json:"marketingOptIn"`
}

// UpdateLeadStatusInput representa os dados para atualizar o status de um lead
type UpdateLeadStatusInput struct {
	Status LeadStatus `json:"status" validate:"required,oneof=NOVO CONTATADO RESOLVIDO"`
}

// LeadFilters representa os filtros para busca de leads
type LeadFilters struct {
	Search    *string     `json:"search,omitempty"` // Busca por nome ou contato
	LinkID    *string     `json:"linkId,omitempty"`
	StartDate *string     `json:"startDate,omitempty"` // ISO date
	EndDate   *string     `json:"endDate,omitempty"`   // ISO date
	OptIn     *bool       `json:"optIn,omitempty"`
	Status    *LeadStatus `json:"status,omitempty"`
	Page      int         `json:"page" validate:"min=1"`
	Limit     int         `json:"limit" validate:"min=1,max=100"`
}

// LeadListResponse representa a resposta de listagem de leads
type LeadListResponse struct {
	Leads []Lead `json:"leads"`
	Total int    `json:"total"`
	Page  int    `json:"page"`
}

// CreateLeadResponse representa a resposta de criação de lead
type CreateLeadResponse struct {
	Success bool `json:"success"`
}