package entity

import (
	"time"
)

// Industry representa uma indústria no sistema
type Industry struct {
	ID             string    `json:"id"`
	Name           string    `json:"name"`
	CNPJ           string    `json:"cnpj"`
	Slug           string    `json:"slug"`
	ContactEmail   string    `json:"contactEmail"`
	ContactPhone   *string   `json:"contactPhone,omitempty"`
	Whatsapp       *string   `json:"whatsapp,omitempty"`
	Description    *string   `json:"description,omitempty"`
	LogoURL        *string   `json:"logoUrl,omitempty"`
	AddressCountry *string   `json:"addressCountry,omitempty"`
	AddressState   *string   `json:"addressState,omitempty"`
	AddressCity    *string   `json:"addressCity,omitempty"`
	AddressStreet  *string   `json:"addressStreet,omitempty"`
	AddressNumber  *string   `json:"addressNumber,omitempty"`
	AddressZipCode *string   `json:"addressZipCode,omitempty"`
	CreatedAt      time.Time `json:"createdAt"`
	UpdatedAt      time.Time `json:"updatedAt"`
}

// CreateIndustryInput representa os dados para criar uma indústria
type CreateIndustryInput struct {
	Name         string  `json:"name" validate:"required,min=2,max=255"`
	CNPJ         string  `json:"cnpj" validate:"required,len=14"` // Formato: apenas dígitos
	Slug         string  `json:"slug" validate:"required,min=3,max=100"`
	ContactEmail string  `json:"contactEmail" validate:"required,email"`
	ContactPhone *string `json:"contactPhone,omitempty" validate:"omitempty,min=10,max=15"`
}

// UpdateIndustryInput representa os dados para atualizar uma indústria
type UpdateIndustryInput struct {
	Name           *string `json:"name,omitempty" validate:"omitempty,min=2,max=255"`
	ContactEmail   *string `json:"contactEmail,omitempty" validate:"omitempty,email"`
	ContactPhone   *string `json:"contactPhone,omitempty" validate:"omitempty,max=20"`
	Whatsapp       *string `json:"whatsapp,omitempty" validate:"omitempty,max=20"`
	Description    *string `json:"description,omitempty" validate:"omitempty,max=2000"`
	LogoURL        *string `json:"logoUrl,omitempty" validate:"omitempty,max=500"`
	AddressCountry *string `json:"addressCountry,omitempty" validate:"omitempty,max=100"`
	AddressState   *string `json:"addressState,omitempty" validate:"omitempty,max=100"`
	AddressCity    *string `json:"addressCity,omitempty" validate:"omitempty,max=255"`
	AddressStreet  *string `json:"addressStreet,omitempty" validate:"omitempty,max=255"`
	AddressNumber  *string `json:"addressNumber,omitempty" validate:"omitempty,max=50"`
	AddressZipCode *string `json:"addressZipCode,omitempty" validate:"omitempty,max=20"`
}
