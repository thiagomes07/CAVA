package entity

import (
	"time"
)

// Industry representa uma indústria no sistema
type Industry struct {
	ID             string    `json:"id"`
	Name           *string   `json:"name,omitempty"`
	CNPJ           *string   `json:"cnpj,omitempty"`
	Slug           *string   `json:"slug,omitempty"`
	ContactEmail   *string   `json:"contactEmail,omitempty"`
	ContactPhone   *string   `json:"contactPhone,omitempty"`
	Whatsapp       *string   `json:"whatsapp,omitempty"`
	Description    *string   `json:"description,omitempty"`
	PolicyTerms    *string   `json:"policyTerms,omitempty"`
	City           *string   `json:"city,omitempty"`
	State          *string   `json:"state,omitempty"`
	BannerURL      *string   `json:"bannerUrl,omitempty"`
	LogoURL        *string   `json:"logoUrl,omitempty"`
	AddressCountry *string   `json:"addressCountry,omitempty"`
	AddressState   *string   `json:"addressState,omitempty"`
	AddressCity    *string   `json:"addressCity,omitempty"`
	AddressStreet  *string   `json:"addressStreet,omitempty"`
	AddressNumber  *string   `json:"addressNumber,omitempty"`
	AddressZipCode *string   `json:"addressZipCode,omitempty"`
	IsPublic       bool      `json:"isPublic"`
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
	PolicyTerms    *string `json:"policyTerms,omitempty" validate:"omitempty,max=5000"`
	City           *string `json:"city,omitempty" validate:"omitempty,max=100"`
	State          *string `json:"state,omitempty" validate:"omitempty,len=2"`
	BannerURL      *string `json:"bannerUrl,omitempty" validate:"omitempty,url,max=500"`
	LogoURL        *string `json:"logoUrl,omitempty" validate:"omitempty,max=500"`
	AddressCountry *string `json:"addressCountry,omitempty" validate:"omitempty,max=100"`
	AddressState   *string `json:"addressState,omitempty" validate:"omitempty,max=100"`
	AddressCity    *string `json:"addressCity,omitempty" validate:"omitempty,max=255"`
	AddressStreet  *string `json:"addressStreet,omitempty" validate:"omitempty,max=255"`
	AddressNumber  *string `json:"addressNumber,omitempty" validate:"omitempty,max=50"`
	AddressZipCode *string `json:"addressZipCode,omitempty" validate:"omitempty,max=20"`
	IsPublic       *bool   `json:"isPublic,omitempty"`
}

// PublicDeposit representa dados sanitizados de um depósito para exibição pública
type PublicDeposit struct {
	Name      string  `json:"name"`
	Slug      string  `json:"slug"`
	City      *string `json:"city,omitempty"`
	State     *string `json:"state,omitempty"`
	BannerURL *string `json:"bannerUrl,omitempty"`
	LogoURL   *string `json:"logoUrl,omitempty"`
	Preview   []Media `json:"preview"` // até 4 fotos de lotes públicos
}

// PublicDepositListResponse representa a resposta de listagem de depósitos públicos
type PublicDepositListResponse struct {
	Deposits []PublicDeposit `json:"deposits"`
	Total    int             `json:"total"`
}
