package entity

import (
	"time"
)

// CatalogLink representa um link de catálogo público personalizado
type CatalogLink struct {
	ID              string    `json:"id"`
	CreatedByUserID string    `json:"createdByUserId"`
	IndustryID      string    `json:"industryId"`
	SlugToken       string    `json:"slugToken"`
	Title           *string   `json:"title,omitempty"`
	CustomMessage   *string   `json:"customMessage,omitempty"`
	ViewsCount      int       `json:"viewsCount"`
	ExpiresAt       *time.Time `json:"expiresAt,omitempty"`
	IsActive        bool      `json:"isActive"`
	CreatedAt       time.Time `json:"createdAt"`
	UpdatedAt       time.Time `json:"updatedAt"`
	FullURL         *string   `json:"fullUrl,omitempty"` // Gerada pelo service
	CreatedBy       *User     `json:"createdBy,omitempty"`
	Batches         []Batch   `json:"batches,omitempty"` // Lotes incluídos no catálogo
}

// IsExpired verifica se o link está expirado
func (c *CatalogLink) IsExpired() bool {
	if c.ExpiresAt == nil {
		return false
	}
	return time.Now().After(*c.ExpiresAt)
}

// CreateCatalogLinkInput representa os dados para criar um link de catálogo
type CreateCatalogLinkInput struct {
	SlugToken     string   `json:"slugToken" validate:"required,min=3,max=50,slug"`
	Title         *string  `json:"title,omitempty" validate:"omitempty,max=100"`
	CustomMessage *string  `json:"customMessage,omitempty" validate:"omitempty,max=500"`
	BatchIDs      []string `json:"batchIds" validate:"required,min=1,dive,uuid"` // IDs dos lotes a incluir
	ExpiresAt     *string  `json:"expiresAt,omitempty"` // ISO date
	IsActive      bool     `json:"isActive"`
}

// UpdateCatalogLinkInput representa os dados para atualizar um link de catálogo
type UpdateCatalogLinkInput struct {
	Title         *string  `json:"title,omitempty" validate:"omitempty,max=100"`
	CustomMessage *string  `json:"customMessage,omitempty" validate:"omitempty,max=500"`
	BatchIDs      *[]string `json:"batchIds,omitempty" validate:"omitempty,min=1,dive,uuid"`
	ExpiresAt     *string  `json:"expiresAt,omitempty"` // ISO date
	IsActive      *bool    `json:"isActive,omitempty"`
}

// PublicCatalogLink representa dados sanitizados de um catálogo para exibição pública
type PublicCatalogLink struct {
	Title         *string      `json:"title,omitempty"`
	CustomMessage *string      `json:"customMessage,omitempty"`
	Batches       []PublicBatch `json:"batches"`
	DepositName   string        `json:"depositName"`
	DepositCity   *string       `json:"depositCity,omitempty"`
	DepositState  *string       `json:"depositState,omitempty"`
	DepositLogo   *string       `json:"depositLogo,omitempty"`
}
