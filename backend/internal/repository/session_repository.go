package repository

import (
	"context"
	"database/sql"

	"github.com/lib/pq"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
	"github.com/thiagomes07/CAVA/backend/internal/domain/errors"
)

type sessionRepository struct {
	db *DB
}

// NewSessionRepository cria novo repositório de sessões
func NewSessionRepository(db *DB) *sessionRepository {
	return &sessionRepository{db: db}
}

func (r *sessionRepository) Create(ctx context.Context, session *entity.UserSession) error {
	query := `
		INSERT INTO user_sessions (id, user_id, refresh_token_hash, expires_at, is_active, user_agent, ip_address)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING created_at, last_used_at
	`

	err := r.db.QueryRowContext(ctx, query,
		session.ID, session.UserID, session.RefreshTokenHash,
		session.ExpiresAt, session.IsActive, session.UserAgent, session.IPAddress,
	).Scan(&session.CreatedAt, &session.LastUsedAt)

	if err != nil {
		return errors.DatabaseError(err)
	}

	return nil
}

func (r *sessionRepository) FindByTokenHash(ctx context.Context, tokenHash string) (*entity.UserSession, error) {
	query := `
		SELECT id, user_id, refresh_token_hash, expires_at, is_active, 
		       created_at, last_used_at, user_agent, ip_address
		FROM user_sessions
		WHERE refresh_token_hash = $1 AND is_active = TRUE
	`

	session := &entity.UserSession{}
	err := r.db.QueryRowContext(ctx, query, tokenHash).Scan(
		&session.ID, &session.UserID, &session.RefreshTokenHash,
		&session.ExpiresAt, &session.IsActive, &session.CreatedAt,
		&session.LastUsedAt, &session.UserAgent, &session.IPAddress,
	)

	if err == sql.ErrNoRows {
		return nil, errors.NewNotFoundError("Sessão")
	}
	if err != nil {
		return nil, errors.DatabaseError(err)
	}

	return session, nil
}

func (r *sessionRepository) FindActiveByUserID(ctx context.Context, userID string) ([]entity.UserSession, error) {
	query := `
		SELECT id, user_id, refresh_token_hash, expires_at, is_active, 
		       created_at, last_used_at, user_agent, ip_address
		FROM user_sessions
		WHERE user_id = $1 AND is_active = TRUE AND expires_at > CURRENT_TIMESTAMP
		ORDER BY created_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, errors.DatabaseError(err)
	}
	defer rows.Close()

	sessions := []entity.UserSession{}
	for rows.Next() {
		var s entity.UserSession
		if err := rows.Scan(
			&s.ID, &s.UserID, &s.RefreshTokenHash,
			&s.ExpiresAt, &s.IsActive, &s.CreatedAt,
			&s.LastUsedAt, &s.UserAgent, &s.IPAddress,
		); err != nil {
			return nil, errors.DatabaseError(err)
		}
		sessions = append(sessions, s)
	}

	return sessions, nil
}

func (r *sessionRepository) Invalidate(ctx context.Context, id string) error {
	query := `
		UPDATE user_sessions
		SET is_active = FALSE
		WHERE id = $1
	`

	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return errors.DatabaseError(err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return errors.DatabaseError(err)
	}

	if rows == 0 {
		return errors.NewNotFoundError("Sessão")
	}

	return nil
}

func (r *sessionRepository) InvalidateByTokenHash(ctx context.Context, tokenHash string) error {
	query := `
		UPDATE user_sessions
		SET is_active = FALSE
		WHERE refresh_token_hash = $1
	`

	_, err := r.db.ExecContext(ctx, query, tokenHash)
	if err != nil {
		return errors.DatabaseError(err)
	}

	// Não retornar erro se não encontrar - logout é idempotente
	return nil
}

func (r *sessionRepository) InvalidateAllByUserID(ctx context.Context, userID string) error {
	query := `
		UPDATE user_sessions
		SET is_active = FALSE
		WHERE user_id = $1 AND is_active = TRUE
	`

	_, err := r.db.ExecContext(ctx, query, userID)
	if err != nil {
		return errors.DatabaseError(err)
	}

	return nil
}

func (r *sessionRepository) UpdateLastUsed(ctx context.Context, id string) error {
	query := `
		UPDATE user_sessions
		SET last_used_at = CURRENT_TIMESTAMP
		WHERE id = $1
	`

	_, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return errors.DatabaseError(err)
	}

	return nil
}

func (r *sessionRepository) CleanupExpired(ctx context.Context) (int64, error) {
	query := `
		DELETE FROM user_sessions
		WHERE expires_at < CURRENT_TIMESTAMP OR is_active = FALSE
	`

	result, err := r.db.ExecContext(ctx, query)
	if err != nil {
		return 0, errors.DatabaseError(err)
	}

	count, err := result.RowsAffected()
	if err != nil {
		return 0, errors.DatabaseError(err)
	}

	return count, nil
}

// EnforceSessionLimit garante que um usuário tenha no máximo maxActive sessões ativas, removendo as mais antigas
func (r *sessionRepository) EnforceSessionLimit(ctx context.Context, userID string, maxActive int) error {
	if maxActive <= 0 {
		return nil
	}

	// Seleciona sessões excedentes (ordem da mais recente para a mais antiga, pulando as primeiras maxActive)
	querySelect := `
		SELECT id
		FROM user_sessions
		WHERE user_id = $1 AND is_active = TRUE
		ORDER BY created_at DESC
		OFFSET $2
	`

	rows, err := r.db.QueryContext(ctx, querySelect, userID, maxActive)
	if err != nil {
		return errors.DatabaseError(err)
	}
	defer rows.Close()

	var idsToInvalidate []string
	for rows.Next() {
		var id string
		if scanErr := rows.Scan(&id); scanErr != nil {
			return errors.DatabaseError(scanErr)
		}
		idsToInvalidate = append(idsToInvalidate, id)
	}

	if len(idsToInvalidate) == 0 {
		return nil
	}

	// Invalida sessões excedentes
	queryUpdate := `
		UPDATE user_sessions
		SET is_active = FALSE
		WHERE id = ANY($1)
	`

	if _, err = r.db.ExecContext(ctx, queryUpdate, pq.Array(idsToInvalidate)); err != nil {
		return errors.DatabaseError(err)
	}

	return nil
}
