package entity

import (
	"time"
)

// LinkType representa os tipos de link de venda
type LinkType string

const (
	LinkTypeLoteUnico        LinkType = "LOTE_UNICO"
	LinkTypeProdutoGeral     LinkType = "PRODUTO_GERAL"
	LinkTypeCatalogoCompleto LinkType = "CATALOGO_COMPLETO"
)

// IsValid verifica se o tipo de link é válido
func (l LinkType) IsValid() bool {
	switch l {
	case LinkTypeLoteUnico, LinkTypeProdutoGeral, LinkTypeCatalogoCompleto:
		return true
	}
	return false
}

// SalesLink representa um link de venda público
type SalesLink struct {
	ID              string     `json:"id"`
	CreatedByUserID string     `json:"createdByUserId"`
	IndustryID      string     `json:"industryId"`
	BatchID         *string    `json:"batchId,omitempty"`
	ProductID       *string    `json:"productId,omitempty"`
	LinkType        LinkType   `json:"linkType"`
	SlugToken       string     `json:"slugToken"`
	Title           *string    `json:"title,omitempty"`
	CustomMessage   *string    `json:"customMessage,omitempty"`
	DisplayPrice    *float64   `json:"displayPrice,omitempty"`
	ShowPrice       bool       `json:"showPrice"`
	ViewsCount      int        `json:"viewsCount"`
	ExpiresAt       *time.Time `json:"expiresAt,omitempty"`
	IsActive        bool       `json:"isActive"`
	CreatedAt       time.Time  `json:"createdAt"`
	UpdatedAt       time.Time  `json:"updatedAt"`
	FullURL         *string    `json:"fullUrl,omitempty"`   // Gerada pelo service
	Batch           *Batch     `json:"batch,omitempty"`     // Populated quando necessário
	Product         *Product   `json:"product,omitempty"`   // Populated quando necessário
	CreatedBy       *User      `json:"createdBy,omitempty"` // Populated quando necessário
}

// IsExpired verifica se o link está expirado
func (s *SalesLink) IsExpired() bool {
	if s.ExpiresAt == nil {
		return false
	}
	return time.Now().After(*s.ExpiresAt)
}

// CreateSalesLinkInput representa os dados para criar um link de venda
type CreateSalesLinkInput struct {
	LinkType      LinkType `json:"linkType" validate:"required,oneof=LOTE_UNICO PRODUTO_GERAL CATALOGO_COMPLETO"`
	BatchID       *string  `json:"batchId,omitempty" validate:"omitempty,uuid"`
	ProductID     *string  `json:"productId,omitempty" validate:"omitempty,uuid"`
	Title         *string  `json:"title,omitempty" validate:"omitempty,max=100"`
	CustomMessage *string  `json:"customMessage,omitempty" validate:"omitempty,max=500"`
	SlugToken     string   `json:"slugToken" validate:"required,min=3,max=50,slug"`
	DisplayPrice  *float64 `json:"displayPrice,omitempty" validate:"omitempty,gt=0"`
	ShowPrice     bool     `json:"showPrice"`
	ExpiresAt     *string  `json:"expiresAt,omitempty"` // ISO date
	IsActive      bool     `json:"isActive"`
}

// UpdateSalesLinkInput representa os dados para atualizar um link de venda
type UpdateSalesLinkInput struct {
	Title         *string  `json:"title,omitempty" validate:"omitempty,max=100"`
	CustomMessage *string  `json:"customMessage,omitempty" validate:"omitempty,max=500"`
	DisplayPrice  *float64 `json:"displayPrice,omitempty" validate:"omitempty,gt=0"`
	ShowPrice     *bool    `json:"showPrice,omitempty"`
	ExpiresAt     *string  `json:"expiresAt,omitempty"` // ISO date
	IsActive      *bool    `json:"isActive,omitempty"`
}

// SalesLinkFilters representa os filtros para busca de links
type SalesLinkFilters struct {
	CreatedByUserID *string   `json:"createdByUserId,omitempty"`
	Type            *LinkType `json:"type,omitempty"`
	Status          *string   `json:"status,omitempty"` // ATIVO, EXPIRADO
	Search          *string   `json:"search,omitempty"` // Busca por title ou slug
	Page            int       `json:"page" validate:"min=1"`
	Limit           int       `json:"limit" validate:"min=1,max=100"`
}

// SalesLinkListResponse representa a resposta de listagem de links
type SalesLinkListResponse struct {
	Links []SalesLink `json:"links"`
	Total int         `json:"total"`
	Page  int         `json:"page"`
}

// ValidateSlugInput representa os dados para validar um slug
type ValidateSlugInput struct {
	Slug string `json:"slug" validate:"required,min=3,max=50"`
}

// ValidateSlugResponse representa a resposta da validação de slug
type ValidateSlugResponse struct {
	Valid bool `json:"valid"`
}

// CreateSalesLinkResponse representa a resposta de criação de link
type CreateSalesLinkResponse struct {
	ID      string `json:"id"`
	FullURL string `json:"fullUrl"`
}

// PublicBatch representa dados seguros de um lote para exibição pública
type PublicBatch struct {
	BatchCode    string   `json:"batchCode"`
	Height       float64  `json:"height"`
	Width        float64  `json:"width"`
	Thickness    float64  `json:"thickness"`
	TotalArea    float64  `json:"totalArea"`
	OriginQuarry *string  `json:"originQuarry,omitempty"`
	Medias       []Media  `json:"medias"`
	ProductName  string   `json:"productName,omitempty"`
	Material     string   `json:"material,omitempty"`
	Finish       string   `json:"finish,omitempty"`
	IndustryID   string   `json:"industryId,omitempty"`
	IndustryName string   `json:"industryName,omitempty"`
}

// PublicProduct representa dados seguros de um produto para exibição pública
type PublicProduct struct {
	Name        string  `json:"name"`
	Material    string  `json:"material"`
	Finish      string  `json:"finish"`
	Description *string `json:"description,omitempty"`
	Medias      []Media `json:"medias"`
}

// PublicSalesLink representa dados seguros de um link para exibição pública
type PublicSalesLink struct {
	Title         string         `json:"title,omitempty"`
	CustomMessage string         `json:"customMessage,omitempty"`
	DisplayPrice  *float64       `json:"displayPrice,omitempty"`
	ShowPrice     bool           `json:"showPrice"`
	Batch         *PublicBatch   `json:"batch,omitempty"`
	Product       *PublicProduct `json:"product,omitempty"`
}
