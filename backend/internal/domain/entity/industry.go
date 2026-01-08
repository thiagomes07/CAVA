package entity

import (
	"time"
)

// Industry representa uma indústria no sistema
type Industry struct {
	ID           string    `json:"id"`
	Name         string    `json:"name"`
	CNPJ         string    `json:"cnpj"`
	Slug         string    `json:"slug"`
	ContactEmail string    `json:"contactEmail"`
	ContactPhone *string   `json:"contactPhone,omitempty"`
	PolicyTerms  *string   `json:"policyTerms,omitempty"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

// CreateIndustryInput representa os dados para criar uma indústria
type CreateIndustryInput struct {
	Name         string  `json:"name" validate:"required,min=2,max=255"`
	CNPJ         string  `json:"cnpj" validate:"required,len=14"` // Formato: apenas dígitos
	Slug         string  `json:"slug" validate:"required,min=3,max=100"`
	ContactEmail string  `json:"contactEmail" validate:"required,email"`
	ContactPhone *string `json:"contactPhone,omitempty" validate:"omitempty,min=10,max=11"`
	PolicyTerms  *string `json:"policyTerms,omitempty" validate:"omitempty,max=5000"`
}

// UpdateIndustryInput representa os dados para atualizar uma indústria
type UpdateIndustryInput struct {
	Name         *string `json:"name,omitempty" validate:"omitempty,min=2,max=255"`
	ContactEmail *string `json:"contactEmail,omitempty" validate:"omitempty,email"`
	ContactPhone *string `json:"contactPhone,omitempty" validate:"omitempty,min=10,max=11"`
	PolicyTerms  *string `json:"policyTerms,omitempty" validate:"omitempty,max=5000"`
}