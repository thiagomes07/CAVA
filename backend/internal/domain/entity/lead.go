package entity

import (
	"time"
)

// InteractionType representa os tipos de interação
type InteractionType string

const (
	InteractionInteresseLote     InteractionType = "INTERESSE_LOTE"
	InteractionInteresseCatalogo InteractionType = "INTERESSE_CATALOGO"
	InteractionDuvidaGeral       InteractionType = "DUVIDA_GERAL"
	InteractionPortfolioLead     InteractionType = "PORTFOLIO_LEAD"
)

// Cliente representa um cliente potencial
type Cliente struct {
	ID             string        `json:"id"`
	SalesLinkID    string        `json:"salesLinkId"`
	IndustryID     *string       `json:"industryId,omitempty"`   // Para leads vindos diretamente (portfolio)
	Source         string        `json:"source"`                  // MANUAL, PORTFOLIO, SALES_LINK
	Name           string        `json:"name"`
	Email          *string       `json:"email,omitempty"`
	Phone          *string       `json:"phone,omitempty"`
	Whatsapp       *string       `json:"whatsapp,omitempty"`
	Message        *string       `json:"message,omitempty"`
	MarketingOptIn bool          `json:"marketingOptIn"`
	CreatedAt      time.Time     `json:"createdAt"`
	UpdatedAt      time.Time     `json:"updatedAt"`
	SalesLink      *SalesLink    `json:"salesLink,omitempty"` // Populated quando necessário
	CreatedByUserID *string      `json:"createdByUserId,omitempty"`
	Contact        string        `json:"contact"` // Computed: email ou phone
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
	SalesLinkID    string  `json:"salesLinkId,omitempty" validate:"omitempty,uuid"`
	ProductID      *string `json:"productId,omitempty" validate:"omitempty,uuid"` // Produto de interesse (para portfolio)
	Name           string  `json:"name" validate:"required,min=2,max=100"`
	Email          *string `json:"email,omitempty" validate:"omitempty,email"`
	Phone          *string `json:"phone,omitempty" validate:"omitempty,min=10,max=11"`
	Whatsapp       *string `json:"whatsapp,omitempty" validate:"omitempty,min=10,max=11"`
	Message        *string `json:"message,omitempty" validate:"omitempty,max=500"`
	MarketingOptIn bool    `json:"marketingOptIn"`
}

// CreateClienteManualInput representa os dados para criar um cliente manualmente (autenticado)
type CreateClienteManualInput struct {
	Name           string  `json:"name" validate:"required,min=2,max=100"`
	Email          *string `json:"email,omitempty" validate:"omitempty,email"`
	Phone          *string `json:"phone,omitempty" validate:"omitempty,min=10,max=11"`
	Whatsapp       *string `json:"whatsapp,omitempty" validate:"omitempty,min=10,max=11"`
	Message        *string `json:"message,omitempty" validate:"omitempty,max=500"`
	MarketingOptIn bool    `json:"marketingOptIn"`
}

// ClienteFilters representa os filtros para busca de clientes
type ClienteFilters struct {
	Search          *string `json:"search,omitempty"` // Busca por nome ou contato
	LinkID          *string `json:"linkId,omitempty"`
	StartDate       *string `json:"startDate,omitempty"` // ISO date
	EndDate         *string `json:"endDate,omitempty"`   // ISO date
	OptIn           *bool   `json:"optIn,omitempty"`
	Page            int     `json:"page" validate:"min=1"`
	Limit           int     `json:"limit" validate:"min=1,max=100"`
	SortBy          string  `json:"sortBy,omitempty"`    // Campo para ordenação: name, email, created_at
	SortOrder       string  `json:"sortOrder,omitempty"` // Ordem: asc ou desc
	IndustryID      *string `json:"-"`                   // Filtro interno: clientes de links da indústria
	CreatedByUserID *string `json:"-"`                   // Filtro interno: clientes de links criados pelo usuário (broker)
}

// ValidClienteSortFields retorna os campos válidos para ordenação de clientes
func ValidClienteSortFields() []string {
	return []string{"name", "email", "phone", "created_at"}
}

// IsValidSortField verifica se o campo de ordenação é válido
func (f *ClienteFilters) IsValidSortField() bool {
	if f.SortBy == "" {
		return true
	}
	validFields := ValidClienteSortFields()
	for _, field := range validFields {
		if f.SortBy == field {
			return true
		}
	}
	return false
}

// IsValidSortOrder verifica se a ordem de ordenação é válida
func (f *ClienteFilters) IsValidSortOrder() bool {
	if f.SortOrder == "" {
		return true
	}
	return f.SortOrder == "asc" || f.SortOrder == "desc"
}

// GetSortBy retorna o campo de ordenação com valor padrão
func (f *ClienteFilters) GetSortBy() string {
	if f.SortBy == "" {
		return "created_at"
	}
	return f.SortBy
}

// GetSortOrder retorna a ordem de ordenação com valor padrão
func (f *ClienteFilters) GetSortOrder() string {
	if f.SortOrder == "" {
		return "desc"
	}
	return f.SortOrder
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

// SendLinksToClientesInput representa os dados para enviar links para clientes
type SendLinksToClientesInput struct {
	ClienteIDs    []string `json:"clienteIds" validate:"required,min=1,max=50,dive,uuid"`
	SalesLinkIDs  []string `json:"salesLinkIds" validate:"required,min=1,max=10,dive,uuid"`
	CustomMessage *string  `json:"customMessage,omitempty" validate:"omitempty,max=500"`
}

// SendLinkResult representa o resultado do envio para um cliente
type SendLinkResult struct {
	ClienteID   string `json:"clienteId"`
	ClienteName string `json:"clienteName"`
	Email       string `json:"email"`
	Success     bool   `json:"success"`
	Error       string `json:"error,omitempty"`
}

// SendLinksResponse representa a resposta do envio de links para clientes
type SendLinksResponse struct {
	TotalClientes  int              `json:"totalClientes"`
	TotalSent      int              `json:"totalSent"`
	TotalFailed    int              `json:"totalFailed"`
	TotalSkipped   int              `json:"totalSkipped"` // Clientes sem email válido
	Results        []SendLinkResult `json:"results"`
	LinksIncluded  int              `json:"linksIncluded"`
}
