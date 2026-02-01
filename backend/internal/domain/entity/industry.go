package entity

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"time"
)

// Industry representa uma indústria no sistema
type Industry struct {
	ID             string         `json:"id"`
	Name           *string        `json:"name,omitempty"`
	CNPJ           *string        `json:"cnpj,omitempty"`
	Slug           *string        `json:"slug,omitempty"`
	ContactEmail   *string        `json:"contactEmail,omitempty"`
	ContactPhone   *string        `json:"contactPhone,omitempty"`
	Whatsapp       *string        `json:"whatsapp,omitempty"`
	Description    *string        `json:"description,omitempty"`
	City           *string        `json:"city,omitempty"`
	State          *string        `json:"state,omitempty"`
	BannerURL      *string        `json:"bannerUrl,omitempty"`
	LogoURL        *string        `json:"logoUrl,omitempty"`
	AddressCountry *string        `json:"addressCountry,omitempty"`
	AddressState   *string        `json:"addressState,omitempty"`
	AddressCity    *string        `json:"addressCity,omitempty"`
	AddressStreet  *string        `json:"addressStreet,omitempty"`
	AddressNumber  *string        `json:"addressNumber,omitempty"`
	AddressZipCode *string        `json:"addressZipCode,omitempty"`
	SocialLinks    SocialLinkList `json:"socialLinks,omitempty"`
	IsPublic       bool           `json:"isPublic"`
	CreatedAt      time.Time      `json:"createdAt"`
	UpdatedAt      time.Time      `json:"updatedAt"`
}

// SocialLink representa um link de rede social
type SocialLink struct {
	Name string `json:"name"`
	URL  string `json:"url"`
}

// SocialLinkList é uma lista de links de rede social que implementa interfaces SQL
type SocialLinkList []SocialLink

// Value implements the driver.Valuer interface
func (s SocialLinkList) Value() (driver.Value, error) {
	if len(s) == 0 {
		return "[]", nil
	}
	return json.Marshal(s)
}

// Scan implements the sql.Scanner interface
func (s *SocialLinkList) Scan(value interface{}) error {
	if value == nil {
		*s = []SocialLink{}
		return nil
	}

	bytes, ok := value.([]byte)
	if !ok {
		return errors.New("type assertion to []byte failed")
	}

	return json.Unmarshal(bytes, s)
}

// CreateIndustryInput representa os dados para criar uma indústria
type CreateIndustryInput struct {
	Name         string         `json:"name" validate:"required,min=2,max=255"`
	CNPJ         string         `json:"cnpj" validate:"required,len=14"` // Formato: apenas dígitos
	Slug         string         `json:"slug" validate:"required,min=3,max=100"`
	ContactEmail string         `json:"contactEmail" validate:"required,email"`
	ContactPhone *string        `json:"contactPhone,omitempty" validate:"omitempty,min=10,max=15"`
	SocialLinks  SocialLinkList `json:"socialLinks,omitempty" validate:"omitempty,dive"`
}

// UpdateIndustryInput representa os dados para atualizar uma indústria
type UpdateIndustryInput struct {
	Name           *string        `json:"name,omitempty" validate:"omitempty,min=2,max=255"`
	ContactEmail   *string        `json:"contactEmail,omitempty" validate:"omitempty,email"`
	ContactPhone   *string        `json:"contactPhone,omitempty" validate:"omitempty,max=20"`
	Whatsapp       *string        `json:"whatsapp,omitempty" validate:"omitempty,max=20"`
	Description    *string        `json:"description,omitempty" validate:"omitempty,max=2000"`
	City           *string        `json:"city,omitempty" validate:"omitempty,max=100"`
	State          *string        `json:"state,omitempty" validate:"omitempty,len=2"`
	BannerURL      *string        `json:"bannerUrl,omitempty" validate:"omitempty,url,max=500"`
	LogoURL        *string        `json:"logoUrl,omitempty" validate:"omitempty,max=500"`
	AddressCountry *string        `json:"addressCountry,omitempty" validate:"omitempty,max=100"`
	AddressState   *string        `json:"addressState,omitempty" validate:"omitempty,max=100"`
	AddressCity    *string        `json:"addressCity,omitempty" validate:"omitempty,max=255"`
	AddressStreet  *string        `json:"addressStreet,omitempty" validate:"omitempty,max=255"`
	AddressNumber  *string        `json:"addressNumber,omitempty" validate:"omitempty,max=50"`
	AddressZipCode *string        `json:"addressZipCode,omitempty" validate:"omitempty,max=20"`
	SocialLinks    SocialLinkList `json:"socialLinks,omitempty" validate:"omitempty,dive"`
	IsPublic       *bool          `json:"isPublic,omitempty"`
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
