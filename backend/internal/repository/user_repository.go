package repository

import (
	"context"
	"database/sql"

	"github.com/lib/pq"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
	"github.com/thiagomes07/CAVA/backend/internal/domain/errors"
)

type userRepository struct {
	db *DB
}

// NewUserRepository cria novo repositório de usuários
func NewUserRepository(db *DB) *userRepository {
	return &userRepository{db: db}
}

func (r *userRepository) Create(ctx context.Context, user *entity.User) error {
	query := `
		INSERT INTO users (id, industry_id, name, email, password_hash, phone, role, is_active)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING created_at, updated_at
	`

	err := r.db.QueryRowContext(ctx, query,
		user.ID, user.IndustryID, user.Name, user.Email,
		user.Password, user.Phone, user.Role, user.IsActive,
	).Scan(&user.CreatedAt, &user.UpdatedAt)

	if err != nil {
		if pqErr, ok := err.(*pq.Error); ok {
			if pqErr.Code == "23505" { // unique_violation
				return errors.EmailExistsError(user.Email)
			}
		}
		return errors.DatabaseError(err)
	}

	return nil
}

func (r *userRepository) FindByID(ctx context.Context, id string) (*entity.User, error) {
	query := `
		SELECT id, industry_id, name, email, password_hash, phone, role, 
		       is_active, created_at, updated_at
		FROM users
		WHERE id = $1
	`

	user := &entity.User{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&user.ID, &user.IndustryID, &user.Name, &user.Email,
		&user.Password, &user.Phone, &user.Role,
		&user.IsActive, &user.CreatedAt, &user.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, errors.NewNotFoundError("Usuário")
	}
	if err != nil {
		return nil, errors.DatabaseError(err)
	}

	return user, nil
}

func (r *userRepository) FindByEmail(ctx context.Context, email string) (*entity.User, error) {
	query := `
		SELECT id, industry_id, name, email, password_hash, phone, role, 
		       is_active, created_at, updated_at
		FROM users
		WHERE email = $1
	`

	user := &entity.User{}
	err := r.db.QueryRowContext(ctx, query, email).Scan(
		&user.ID, &user.IndustryID, &user.Name, &user.Email,
		&user.Password, &user.Phone, &user.Role,
		&user.IsActive, &user.CreatedAt, &user.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, errors.NewNotFoundError("Usuário")
	}
	if err != nil {
		return nil, errors.DatabaseError(err)
	}

	return user, nil
}

func (r *userRepository) FindByIndustryID(ctx context.Context, industryID string) ([]entity.User, error) {
	query := `
		SELECT id, industry_id, name, email, phone, role, 
		       is_active, created_at, updated_at
		FROM users
		WHERE industry_id = $1
		ORDER BY created_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query, industryID)
	if err != nil {
		return nil, errors.DatabaseError(err)
	}
	defer rows.Close()

	users := []entity.User{}
	for rows.Next() {
		var u entity.User
		if err := rows.Scan(
			&u.ID, &u.IndustryID, &u.Name, &u.Email,
			&u.Phone, &u.Role, &u.IsActive, &u.CreatedAt, &u.UpdatedAt,
		); err != nil {
			return nil, errors.DatabaseError(err)
		}
		users = append(users, u)
	}

	return users, nil
}

func (r *userRepository) FindByRole(ctx context.Context, role entity.UserRole) ([]entity.User, error) {
	query := `
		SELECT id, industry_id, name, email, phone, role, 
		       is_active, created_at, updated_at
		FROM users
		WHERE role = $1 AND is_active = TRUE
		ORDER BY name
	`

	rows, err := r.db.QueryContext(ctx, query, role)
	if err != nil {
		return nil, errors.DatabaseError(err)
	}
	defer rows.Close()

	users := []entity.User{}
	for rows.Next() {
		var u entity.User
		if err := rows.Scan(
			&u.ID, &u.IndustryID, &u.Name, &u.Email,
			&u.Phone, &u.Role, &u.IsActive, &u.CreatedAt, &u.UpdatedAt,
		); err != nil {
			return nil, errors.DatabaseError(err)
		}
		users = append(users, u)
	}

	return users, nil
}

func (r *userRepository) FindBrokers(ctx context.Context, industryID string) ([]entity.BrokerWithStats, error) {
	query := `
		SELECT 
			u.id, u.name, u.email, u.phone, u.role, 
			u.is_active, u.created_at, u.updated_at,
			COALESCE(COUNT(DISTINCT sib.id), 0) as shared_batches_count
		FROM users u
		LEFT JOIN shared_inventory_batches sib 
			ON u.id = sib.broker_user_id 
			AND sib.industry_owner_id = $1
			AND sib.is_active = TRUE
		WHERE u.role = 'BROKER'
		GROUP BY u.id
		ORDER BY u.name
	`

	rows, err := r.db.QueryContext(ctx, query, industryID)
	if err != nil {
		return nil, errors.DatabaseError(err)
	}
	defer rows.Close()

	brokers := []entity.BrokerWithStats{}
	for rows.Next() {
		var b entity.BrokerWithStats
		if err := rows.Scan(
			&b.ID, &b.Name, &b.Email, &b.Phone, &b.Role,
			&b.IsActive, &b.CreatedAt, &b.UpdatedAt,
			&b.SharedBatchesCount,
		); err != nil {
			return nil, errors.DatabaseError(err)
		}
		brokers = append(brokers, b)
	}

	return brokers, nil
}

func (r *userRepository) Update(ctx context.Context, user *entity.User) error {
	query := `
		UPDATE users
		SET name = $1, phone = $2, updated_at = CURRENT_TIMESTAMP
		WHERE id = $3
		RETURNING updated_at
	`

	err := r.db.QueryRowContext(ctx, query,
		user.Name, user.Phone, user.ID,
	).Scan(&user.UpdatedAt)

	if err == sql.ErrNoRows {
		return errors.NewNotFoundError("Usuário")
	}
	if err != nil {
		return errors.DatabaseError(err)
	}

	return nil
}

func (r *userRepository) UpdateStatus(ctx context.Context, id string, isActive bool) error {
	query := `
		UPDATE users
		SET is_active = $1, updated_at = CURRENT_TIMESTAMP
		WHERE id = $2
	`

	result, err := r.db.ExecContext(ctx, query, isActive, id)
	if err != nil {
		return errors.DatabaseError(err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return errors.DatabaseError(err)
	}

	if rows == 0 {
		return errors.NewNotFoundError("Usuário")
	}

	return nil
}

func (r *userRepository) ExistsByEmail(ctx context.Context, email string) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)`

	var exists bool
	err := r.db.QueryRowContext(ctx, query, email).Scan(&exists)
	if err != nil {
		return false, errors.DatabaseError(err)
	}

	return exists, nil
}

func (r *userRepository) List(ctx context.Context, role *entity.UserRole) ([]entity.User, error) {
	query := `
		SELECT id, industry_id, name, email, phone, role, 
		       is_active, created_at, updated_at
		FROM users
		WHERE 1=1
	`
	args := []interface{}{}

	if role != nil {
		query += ` AND role = $1`
		args = append(args, *role)
	}

	query += ` ORDER BY name`

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, errors.DatabaseError(err)
	}
	defer rows.Close()

	users := []entity.User{}
	for rows.Next() {
		var u entity.User
		if err := rows.Scan(
			&u.ID, &u.IndustryID, &u.Name, &u.Email,
			&u.Phone, &u.Role, &u.IsActive, &u.CreatedAt, &u.UpdatedAt,
		); err != nil {
			return nil, errors.DatabaseError(err)
		}
		users = append(users, u)
	}

	return users, nil
}
