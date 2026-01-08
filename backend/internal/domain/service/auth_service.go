package service

import (
	"context"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
)

// AuthService define o contrato para operações de autenticação
type AuthService interface {
	// Register registra um novo usuário (hash senha, criar registro)
	Register(ctx context.Context, input entity.CreateUserInput) (*entity.User, error)

	// Login valida credenciais e gera tokens
	Login(ctx context.Context, input entity.LoginInput) (*entity.LoginResponse, string, string, error)

	// Logout invalida refresh token
	Logout(ctx context.Context, refreshToken string) error

	// RefreshToken renova access token e rotaciona refresh token
	RefreshToken(ctx context.Context, refreshToken string) (*entity.User, string, string, error)

	// ChangePassword troca senha do usuário
	ChangePassword(ctx context.Context, userID string, input entity.ChangePasswordInput) error

	// ValidateToken valida token JWT
	ValidateToken(ctx context.Context, token string) (string, entity.UserRole, *string, error)

	// GenerateTemporaryPassword gera senha temporária para novo usuário
	GenerateTemporaryPassword() string

	// HashPassword faz hash da senha com argon2
	HashPassword(password string) (string, error)

	// VerifyPassword verifica se senha corresponde ao hash
	VerifyPassword(password, hash string) error
}