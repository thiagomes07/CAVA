package entity

import (
	"time"
)

// UserRole representa os tipos de usuário no sistema
type UserRole string

const (
	RoleAdminIndustria  UserRole = "ADMIN_INDUSTRIA"
	RoleVendedorInterno UserRole = "VENDEDOR_INTERNO"
	RoleBroker          UserRole = "BROKER"
)

// IsValid verifica se o role é válido
func (r UserRole) IsValid() bool {
	switch r {
	case RoleAdminIndustria, RoleVendedorInterno, RoleBroker:
		return true
	}
	return false
}

// User representa um usuário do sistema
type User struct {
	ID           string     `json:"id"`
	IndustryID   *string    `json:"industryId,omitempty"` // NULL para brokers freelancers
	Name         string     `json:"name"`
	Email        string     `json:"email"`
	Password     string     `json:"-"` // Nunca serializar senha
	Phone        *string    `json:"phone,omitempty"`
	Role         UserRole   `json:"role"`
	IsActive     bool       `json:"isActive"`
	FirstLoginAt *time.Time `json:"firstLoginAt,omitempty"` // NULL = nunca logou
	CreatedAt    time.Time  `json:"createdAt"`
	UpdatedAt    time.Time  `json:"updatedAt"`
}

// CreateUserInput representa os dados para criar um usuário (com senha manual)
type CreateUserInput struct {
	IndustryID *string  `json:"industryId,omitempty" validate:"omitempty,uuid"`
	Name       string   `json:"name" validate:"required,min=2,max=255"`
	Email      string   `json:"email" validate:"required,email"`
	Password   string   `json:"password" validate:"required,min=8"`
	Phone      *string  `json:"phone,omitempty" validate:"omitempty,min=10,max=11"`
	Role       UserRole `json:"role" validate:"required,oneof=ADMIN_INDUSTRIA VENDEDOR_INTERNO BROKER"`
}

// CreateSellerInput representa os dados para criar um vendedor interno (senha gerada automaticamente)
type CreateSellerInput struct {
	Name    string   `json:"name" validate:"required,min=2,max=255"`
	Email   string   `json:"email" validate:"required,email"`
	Phone   *string  `json:"phone,omitempty" validate:"omitempty,min=10,max=11"`
	Role    UserRole `json:"role" validate:"required,oneof=VENDEDOR_INTERNO ADMIN_INDUSTRIA"`
	IsAdmin bool     `json:"isAdmin"`
}

// UpdateUserInput representa os dados para atualizar um usuário
type UpdateUserInput struct {
	Name  *string `json:"name,omitempty" validate:"omitempty,min=2,max=255"`
	Phone *string `json:"phone,omitempty" validate:"omitempty,min=10,max=11"`
}

// UpdateUserStatusInput representa os dados para atualizar status do usuário
type UpdateUserStatusInput struct {
	IsActive bool `json:"isActive"`
}

// UpdateUserEmailInput representa os dados para atualizar email do usuário (antes do primeiro login)
type UpdateUserEmailInput struct {
	Email string `json:"email" validate:"required,email"`
}

// ResendInviteInput representa os dados para reenviar convite (pode incluir novo email)
type ResendInviteInput struct {
	NewEmail *string `json:"newEmail,omitempty" validate:"omitempty,email"`
}

// LoginInput representa os dados de login
type LoginInput struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=8"`
}

// LoginResponse representa a resposta do login
type LoginResponse struct {
	User User     `json:"user"`
	Role UserRole `json:"role"`
}

// RefreshTokenResponse representa a resposta do refresh token
type RefreshTokenResponse struct {
	User User `json:"user"`
}

// InviteBrokerInput representa os dados para convidar um broker
type InviteBrokerInput struct {
	Name     string  `json:"name" validate:"required,min=2,max=255"`
	Email    string  `json:"email" validate:"required,email"`
	Phone    *string `json:"phone,omitempty" validate:"omitempty,min=10,max=11"`
	Whatsapp *string `json:"whatsapp,omitempty" validate:"omitempty,min=10,max=11"`
}

// BrokerWithStats representa um broker com estatísticas
type BrokerWithStats struct {
	User
	SharedBatchesCount int `json:"sharedBatchesCount"`
}

// ChangePasswordInput representa os dados para trocar senha
type ChangePasswordInput struct {
	CurrentPassword string `json:"currentPassword" validate:"required,min=8"`
	NewPassword     string `json:"newPassword" validate:"required,min=8"`
}

// UserSession representa uma sessão de usuário (refresh token)
type UserSession struct {
	ID               string    `json:"id"`
	UserID           string    `json:"userId"`
	RefreshTokenHash string    `json:"-"` // Nunca serializar hash do token
	ExpiresAt        time.Time `json:"expiresAt"`
	IsActive         bool      `json:"isActive"`
	CreatedAt        time.Time `json:"createdAt"`
	LastUsedAt       time.Time `json:"lastUsedAt"`
	UserAgent        *string   `json:"userAgent,omitempty"`
	IPAddress        *string   `json:"ipAddress,omitempty"`
}
