package entity

import (
	"time"
)

type CurrencyCode string

const (
	CurrencyBRL CurrencyCode = "BRL"
	CurrencyUSD CurrencyCode = "USD"
)

func (c CurrencyCode) IsValid() bool {
	switch c {
	case CurrencyBRL, CurrencyUSD:
		return true
	}
	return false
}

// LinkType representa os tipos de link de venda
type LinkType string

const (
	LinkTypeLoteUnico        LinkType = "LOTE_UNICO"
	LinkTypeProdutoGeral     LinkType = "PRODUTO_GERAL"
	LinkTypeCatalogoCompleto LinkType = "CATALOGO_COMPLETO"
	LinkTypeMultiplosLotes   LinkType = "MULTIPLOS_LOTES"
)

// IsValid verifica se o tipo de link é válido
func (l LinkType) IsValid() bool {
	switch l {
	case LinkTypeLoteUnico, LinkTypeProdutoGeral, LinkTypeCatalogoCompleto, LinkTypeMultiplosLotes:
		return true
	}
	return false
}

// SalesLink representa um link de venda público
type SalesLink struct {
	ID              string           `json:"id"`
	CreatedByUserID string           `json:"createdByUserId"`
	IndustryID      string           `json:"industryId"`
	BatchID         *string          `json:"batchId,omitempty"`
	ProductID       *string          `json:"productId,omitempty"`
	LinkType        LinkType         `json:"linkType"`
	SlugToken       string           `json:"slugToken"`
	Title           *string          `json:"title,omitempty"`
	CustomMessage   *string          `json:"customMessage,omitempty"`
	DisplayPriceAmount int64         `json:"displayPriceAmount"` // Em centavos da moeda do link
	DisplayCurrency CurrencyCode     `json:"displayCurrency"`
	DisplayPrice    *float64         `json:"displayPrice,omitempty"` // Campo legado para compatibilidade
	ShowPrice       bool             `json:"showPrice"`
	ViewsCount      int              `json:"viewsCount"`
	ExpiresAt       *time.Time       `json:"expiresAt,omitempty"`
	IsActive        bool             `json:"isActive"`
	CreatedAt       time.Time        `json:"createdAt"`
	UpdatedAt       time.Time        `json:"updatedAt"`
	FullURL         *string          `json:"fullUrl,omitempty"`   // Gerada pelo service
	Batch           *Batch           `json:"batch,omitempty"`     // Populated quando necessário
	Product         *Product         `json:"product,omitempty"`   // Populated quando necessário
	CreatedBy       *User            `json:"createdBy,omitempty"` // Populated quando necessário
	Items           []SalesLinkItem  `json:"items,omitempty"`     // Itens para MULTIPLOS_LOTES
}

// IsExpired verifica se o link está expirado
func (s *SalesLink) IsExpired() bool {
	if s.ExpiresAt == nil {
		return false
	}
	return time.Now().After(*s.ExpiresAt)
}

// SalesLinkItem representa um item dentro de um link de múltiplos lotes
type SalesLinkItem struct {
	ID          string    `json:"id"`
	SalesLinkID string    `json:"salesLinkId"`
	BatchID     string    `json:"batchId"`
	Quantity    int       `json:"quantity"`
	UnitPriceAmount int64 `json:"unitPriceAmount"` // Em centavos da moeda do link
	Currency    CurrencyCode `json:"currency"`
	UnitPrice   float64   `json:"unitPrice"` // Campo legado para compatibilidade
	CreatedAt   time.Time `json:"createdAt"`
	Batch       *Batch    `json:"batch,omitempty"` // Populated quando necessário
}

// SalesLinkItemInput representa os dados de um item na criação
type SalesLinkItemInput struct {
	BatchID         string `json:"batchId" validate:"required,uuid"`
	Quantity        int    `json:"quantity" validate:"required,min=1"`
	UnitPriceAmount int64  `json:"unitPriceAmount" validate:"required,min=0"`
	UnitPrice       float64 `json:"unitPrice,omitempty"` // Campo legado
}

// CreateSalesLinkInput representa os dados para criar um link de venda
type CreateSalesLinkInput struct {
	LinkType      LinkType             `json:"linkType" validate:"required,oneof=LOTE_UNICO PRODUTO_GERAL CATALOGO_COMPLETO MULTIPLOS_LOTES"`
	BatchID       *string              `json:"batchId,omitempty" validate:"omitempty,uuid"`
	ProductID     *string              `json:"productId,omitempty" validate:"omitempty,uuid"`
	Items         []SalesLinkItemInput `json:"items,omitempty"` // Para MULTIPLOS_LOTES
	Title         *string              `json:"title,omitempty" validate:"omitempty,max=100"`
	CustomMessage *string              `json:"customMessage,omitempty" validate:"omitempty,max=500"`
	SlugToken     string               `json:"slugToken" validate:"required,min=3,max=50,slug"`
	DisplayPriceAmount *int64          `json:"displayPriceAmount,omitempty" validate:"omitempty,gt=0"`
	DisplayPrice  *float64             `json:"displayPrice,omitempty" validate:"omitempty,gt=0"` // Campo legado
	DisplayCurrency CurrencyCode       `json:"displayCurrency" validate:"required,oneof=BRL USD"`
	ShowPrice     bool                 `json:"showPrice"`
	ExpiresAt     *string              `json:"expiresAt,omitempty"` // ISO date
	IsActive      bool                 `json:"isActive"`
}

// UpdateSalesLinkInput representa os dados para atualizar um link de venda
type UpdateSalesLinkInput struct {
	Title              *string       `json:"title,omitempty" validate:"omitempty,max=100"`
	CustomMessage      *string       `json:"customMessage,omitempty" validate:"omitempty,max=500"`
	DisplayPriceAmount *int64        `json:"displayPriceAmount,omitempty" validate:"omitempty,gt=0"`
	DisplayPrice       *float64      `json:"displayPrice,omitempty" validate:"omitempty,gt=0"` // Campo legado
	DisplayCurrency    *CurrencyCode `json:"displayCurrency,omitempty" validate:"omitempty,oneof=BRL USD"`
	ShowPrice          *bool         `json:"showPrice,omitempty"`
	ExpiresAt          *string       `json:"expiresAt,omitempty"` // ISO date
	IsActive           *bool         `json:"isActive,omitempty"`
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
	BatchCode      string   `json:"batchCode"`
	Height         float64  `json:"height"`
	Width          float64  `json:"width"`
	Thickness      float64  `json:"thickness"`
	TotalArea      float64  `json:"totalArea"`
	AvailableSlabs int      `json:"availableSlabs"`
	OriginQuarry   *string  `json:"originQuarry,omitempty"`
	Medias         []Media  `json:"medias"`
	ProductName    string   `json:"productName,omitempty"`
	Material       string   `json:"material,omitempty"`
	Finish         string   `json:"finish,omitempty"`
	IndustryID     string   `json:"industryId,omitempty"`
	IndustryName   string   `json:"industryName,omitempty"`
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
	Title              string           `json:"title,omitempty"`
	CustomMessage      string           `json:"customMessage,omitempty"`
	DisplayPriceAmount int64            `json:"displayPriceAmount,omitempty"`
	DisplayCurrency    CurrencyCode     `json:"displayCurrency"`
	DisplayPrice       *float64         `json:"displayPrice,omitempty"` // Campo legado para compatibilidade
	ShowPrice          bool             `json:"showPrice"`
	Batch              *PublicBatch     `json:"batch,omitempty"`
	Product            *PublicProduct   `json:"product,omitempty"`
	Items              []PublicLinkItem `json:"items,omitempty"` // Para MULTIPLOS_LOTES
}

// PublicLinkItem representa dados seguros de um item de link para exibição pública
type PublicLinkItem struct {
	BatchCode       string       `json:"batchCode"`
	ProductName     string       `json:"productName"`
	Material        string       `json:"material"`
	Finish          string       `json:"finish"`
	Height          float64      `json:"height"`
	Width           float64      `json:"width"`
	Thickness       float64      `json:"thickness"`
	Quantity        int          `json:"quantity"`
	UnitPriceAmount int64        `json:"unitPriceAmount,omitempty"`
	TotalPriceAmount int64       `json:"totalPriceAmount,omitempty"`
	Currency        CurrencyCode `json:"currency"`
	UnitPrice       float64      `json:"unitPrice,omitempty"` // Campo legado para compatibilidade
	TotalPrice      float64      `json:"totalPrice,omitempty"` // Campo legado para compatibilidade
	Medias          []Media      `json:"medias"`
}
