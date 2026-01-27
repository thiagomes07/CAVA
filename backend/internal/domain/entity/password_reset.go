package entity

import "time"

// ForgotPasswordInput representa a solicitação de recuperação de senha
type ForgotPasswordInput struct {
	Email string `json:"email" validate:"required,email"`
}

// ResetPasswordInput representa a submissão do novo password com código de verificação
type ResetPasswordInput struct {
	Email       string `json:"email" validate:"required,email"`
	Code        string `json:"code" validate:"required,len=6"`
	NewPassword string `json:"newPassword" validate:"required,min=8"`
}

// PasswordResetToken representa um token de recuperação de senha no banco
type PasswordResetToken struct {
	ID        string     `json:"id" db:"id"`
	UserID    string     `json:"userId" db:"user_id"`
	TokenHash string     `json:"-" db:"token_hash"` // SHA256 hash do código
	Code      string     `json:"-" db:"code"`       // Código de 6 dígitos (apenas para email)
	ExpiresAt time.Time  `json:"expiresAt" db:"expires_at"`
	UsedAt    *time.Time `json:"usedAt,omitempty" db:"used_at"`
	CreatedAt time.Time  `json:"createdAt" db:"created_at"`
}

// IsExpired verifica se o token expirou
func (t *PasswordResetToken) IsExpired() bool {
	return time.Now().After(t.ExpiresAt)
}

// IsUsed verifica se o token já foi utilizado
func (t *PasswordResetToken) IsUsed() bool {
	return t.UsedAt != nil
}
