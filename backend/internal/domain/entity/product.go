package entity

import (
	"time"
)

// MaterialType representa os tipos de material
type MaterialType string

const (
	MaterialGranito    MaterialType = "GRANITO"
	MaterialMarmore    MaterialType = "MARMORE"
	MaterialQuartzito  MaterialType = "QUARTZITO"
	MaterialLimestone  MaterialType = "LIMESTONE"
	MaterialTravertino MaterialType = "TRAVERTINO"
	MaterialOutros     MaterialType = "OUTROS"
)

// IsValid verifica se o tipo de material é válido
func (m MaterialType) IsValid() bool {
	switch m {
	case MaterialGranito, MaterialMarmore, MaterialQuartzito,
		MaterialLimestone, MaterialTravertino, MaterialOutros:
		return true
	}
	return false
}

// FinishType representa os tipos de acabamento
type FinishType string

const (
	FinishPolido    FinishType = "POLIDO"
	FinishLevigado  FinishType = "LEVIGADO"
	FinishBruto     FinishType = "BRUTO"
	FinishApicoado  FinishType = "APICOADO"
	FinishFlameado  FinishType = "FLAMEADO"
)

// IsValid verifica se o tipo de acabamento é válido
func (f FinishType) IsValid() bool {
	switch f {
	case FinishPolido, FinishLevigado, FinishBruto, FinishApicoado, FinishFlameado:
		return true
	}
	return false
}

// Product representa um produto (tipo de pedra)
type Product struct {
	ID          string       `json:"id"`
	IndustryID  string       `json:"industryId"`
	Name        string       `json:"name"`
	SKU         *string      `json:"sku,omitempty"`
	Material    MaterialType `json:"material"`
	Finish      FinishType   `json:"finish"`
	Description *string      `json:"description,omitempty"`
	IsPublic    bool         `json:"isPublic"`
	IsActive    bool         `json:"isActive"`
	Medias      []Media      `json:"medias,omitempty"`
	BatchCount  *int         `json:"batchCount,omitempty"` // Contador de lotes associados
	CreatedAt   time.Time    `json:"createdAt"`
	UpdatedAt   time.Time    `json:"updatedAt"`
}

// CreateProductInput representa os dados para criar um produto
type CreateProductInput struct {
	Name        string       `json:"name" validate:"required,min=2,max=100"`
	SKU         *string      `json:"sku,omitempty" validate:"omitempty,max=50"`
	Material    MaterialType `json:"material" validate:"required,oneof=GRANITO MARMORE QUARTZITO LIMESTONE TRAVERTINO OUTROS"`
	Finish      FinishType   `json:"finish" validate:"required,oneof=POLIDO LEVIGADO BRUTO APICOADO FLAMEADO"`
	Description *string      `json:"description,omitempty" validate:"omitempty,max=1000"`
	IsPublic    bool         `json:"isPublic"`
}

// UpdateProductInput representa os dados para atualizar um produto
type UpdateProductInput struct {
	Name        *string       `json:"name,omitempty" validate:"omitempty,min=2,max=100"`
	SKU         *string       `json:"sku,omitempty" validate:"omitempty,max=50"`
	Material    *MaterialType `json:"material,omitempty" validate:"omitempty,oneof=GRANITO MARMORE QUARTZITO LIMESTONE TRAVERTINO OUTROS"`
	Finish      *FinishType   `json:"finish,omitempty" validate:"omitempty,oneof=POLIDO LEVIGADO BRUTO APICOADO FLAMEADO"`
	Description *string       `json:"description,omitempty" validate:"omitempty,max=1000"`
	IsPublic    *bool         `json:"isPublic,omitempty"`
}

// ProductFilters representa os filtros para busca de produtos
type ProductFilters struct {
	Search          *string       `json:"search,omitempty"`
	Material        *MaterialType `json:"material,omitempty"`
	IncludeInactive bool          `json:"includeInactive"`
	Page            int           `json:"page" validate:"min=1"`
	Limit           int           `json:"limit" validate:"min=1,max=100"`
}

// ProductListResponse representa a resposta de listagem de produtos
type ProductListResponse struct {
	Products []Product `json:"products"`
	Total    int       `json:"total"`
	Page     int       `json:"page"`
}