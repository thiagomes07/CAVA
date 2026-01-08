package repository

import (
	"context"

	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
)

// SessionRepository define o contrato para operações com sessões de usuário
type SessionRepository interface {
	// Create cria uma nova sessão
	Create(ctx context.Context, session *entity.UserSession) error

	// FindByTokenHash busca sessão pelo hash do refresh token
	FindByTokenHash(ctx context.Context, tokenHash string) (*entity.UserSession, error)

	// FindActiveByUserID busca sessões ativas de um usuário
	FindActiveByUserID(ctx context.Context, userID string) ([]entity.UserSession, error)

	// Invalidate invalida uma sessão (usado em logout e rotação)
	Invalidate(ctx context.Context, id string) error

	// InvalidateByTokenHash invalida sessão pelo hash do token
	InvalidateByTokenHash(ctx context.Context, tokenHash string) error

	// InvalidateAllByUserID invalida todas as sessões de um usuário
	InvalidateAllByUserID(ctx context.Context, userID string) error

	// UpdateLastUsed atualiza o timestamp de último uso
	UpdateLastUsed(ctx context.Context, id string) error

	// CleanupExpired remove sessões expiradas
	CleanupExpired(ctx context.Context) (int64, error)

	// EnforceSessionLimit garante no máximo N sessões ativas por usuário
	EnforceSessionLimit(ctx context.Context, userID string, maxActive int) error
}
