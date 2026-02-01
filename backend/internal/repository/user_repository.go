package repository

import (
	"context"
	"database/sql"
	"fmt"

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
		INSERT INTO users (id, industry_id, name, email, password_hash, phone, whatsapp, role, is_active)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING created_at, updated_at
	`

	err := r.db.QueryRowContext(ctx, query,
		user.ID, user.IndustryID, user.Name, user.Email,
		user.Password, user.Phone, user.Whatsapp, user.Role, user.IsActive,
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
		SELECT id, industry_id, name, email, password_hash, phone, whatsapp, role, 
		       is_active, first_login_at, created_at, updated_at
		FROM users
		WHERE id = $1
	`

	user := &entity.User{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&user.ID, &user.IndustryID, &user.Name, &user.Email,
		&user.Password, &user.Phone, &user.Whatsapp, &user.Role,
		&user.IsActive, &user.FirstLoginAt, &user.CreatedAt, &user.UpdatedAt,
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
		SELECT id, industry_id, name, email, password_hash, phone, whatsapp, role, 
		       is_active, first_login_at, created_at, updated_at
		FROM users
		WHERE email = $1
	`

	user := &entity.User{}
	err := r.db.QueryRowContext(ctx, query, email).Scan(
		&user.ID, &user.IndustryID, &user.Name, &user.Email,
		&user.Password, &user.Phone, &user.Whatsapp, &user.Role,
		&user.IsActive, &user.FirstLoginAt, &user.CreatedAt, &user.UpdatedAt,
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
		SELECT id, industry_id, name, email, phone, whatsapp, role, 
		       is_active, first_login_at, created_at, updated_at
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
			&u.Phone, &u.Whatsapp, &u.Role, &u.IsActive, &u.FirstLoginAt, &u.CreatedAt, &u.UpdatedAt,
		); err != nil {
			return nil, errors.DatabaseError(err)
		}
		users = append(users, u)
	}

	return users, nil
}

func (r *userRepository) FindByRole(ctx context.Context, role entity.UserRole) ([]entity.User, error) {
	query := `
		SELECT id, industry_id, name, email, phone, whatsapp, role, 
		       is_active, first_login_at, created_at, updated_at
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
			&u.Phone, &u.Whatsapp, &u.Role, &u.IsActive, &u.FirstLoginAt, &u.CreatedAt, &u.UpdatedAt,
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
			u.id, u.name, u.email, u.phone, u.whatsapp, u.role, 
			u.is_active, u.first_login_at, u.created_at, u.updated_at,
			COALESCE(COUNT(DISTINCT sib.id), 0) as shared_batches_count
		FROM users u
		LEFT JOIN shared_inventory_batches sib 
			ON u.id = sib.shared_with_user_id 
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
			&b.ID, &b.Name, &b.Email, &b.Phone, &b.Whatsapp, &b.Role,
			&b.IsActive, &b.FirstLoginAt, &b.CreatedAt, &b.UpdatedAt,
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
		SET name = $1, phone = $2, whatsapp = $3, updated_at = CURRENT_TIMESTAMP
		WHERE id = $4
		RETURNING updated_at
	`

	err := r.db.QueryRowContext(ctx, query,
		user.Name, user.Phone, user.Whatsapp, user.ID,
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

func (r *userRepository) ExistsByNameInIndustry(ctx context.Context, name string, industryID string) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM users WHERE LOWER(name) = LOWER($1) AND industry_id = $2)`

	var exists bool
	err := r.db.QueryRowContext(ctx, query, name, industryID).Scan(&exists)
	if err != nil {
		return false, errors.DatabaseError(err)
	}

	return exists, nil
}

func (r *userRepository) ExistsByNameGlobally(ctx context.Context, name string) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM users WHERE LOWER(name) = LOWER($1))`

	var exists bool
	err := r.db.QueryRowContext(ctx, query, name).Scan(&exists)
	if err != nil {
		return false, errors.DatabaseError(err)
	}

	return exists, nil
}

func (r *userRepository) List(ctx context.Context, role *entity.UserRole) ([]entity.User, error) {
	query := `
		SELECT id, industry_id, name, email, phone, whatsapp, role, 
		       is_active, first_login_at, created_at, updated_at
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
			&u.Phone, &u.Whatsapp, &u.Role, &u.IsActive, &u.FirstLoginAt, &u.CreatedAt, &u.UpdatedAt,
		); err != nil {
			return nil, errors.DatabaseError(err)
		}
		users = append(users, u)
	}

	return users, nil
}

func (r *userRepository) ListByIndustry(ctx context.Context, industryID string, role *entity.UserRole) ([]entity.User, error) {
	query := `
		SELECT id, industry_id, name, email, phone, whatsapp, role, 
		       is_active, first_login_at, created_at, updated_at
		FROM users
		WHERE industry_id = $1
	`
	args := []interface{}{industryID}

	if role != nil {
		query += ` AND role = $2`
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
			&u.Phone, &u.Whatsapp, &u.Role, &u.IsActive, &u.FirstLoginAt, &u.CreatedAt, &u.UpdatedAt,
		); err != nil {
			return nil, errors.DatabaseError(err)
		}
		users = append(users, u)
	}

	return users, nil
}

func (r *userRepository) UpdatePassword(ctx context.Context, id string, hashedPassword string) error {
	query := `
		UPDATE users
		SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
		WHERE id = $2
	`

	result, err := r.db.ExecContext(ctx, query, hashedPassword, id)
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

func (r *userRepository) UpdateEmail(ctx context.Context, id string, email string) error {
	query := `
		UPDATE users
		SET email = $1, updated_at = CURRENT_TIMESTAMP
		WHERE id = $2
	`

	result, err := r.db.ExecContext(ctx, query, email, id)
	if err != nil {
		if pqErr, ok := err.(*pq.Error); ok {
			if pqErr.Code == "23505" { // unique_violation
				return errors.EmailExistsError(email)
			}
		}
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

func (r *userRepository) SetFirstLoginAt(ctx context.Context, id string) error {
	query := `
		UPDATE users
		SET first_login_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
		WHERE id = $1 AND first_login_at IS NULL
	`

	_, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return errors.DatabaseError(err)
	}

	return nil
}

// =============================================
// PASSWORD RESET TOKENS
// =============================================

func (r *userRepository) CreatePasswordResetToken(ctx context.Context, token *entity.PasswordResetToken) error {
	query := `
		INSERT INTO password_reset_tokens (id, user_id, token_hash, code, expires_at)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING created_at
	`

	err := r.db.QueryRowContext(ctx, query,
		token.ID, token.UserID, token.TokenHash, token.Code, token.ExpiresAt,
	).Scan(&token.CreatedAt)

	if err != nil {
		return errors.DatabaseError(err)
	}

	return nil
}

func (r *userRepository) GetPasswordResetToken(ctx context.Context, userID, tokenHash string) (*entity.PasswordResetToken, error) {
	query := `
		SELECT id, user_id, token_hash, code, expires_at, used_at, created_at
		FROM password_reset_tokens
		WHERE user_id = $1 AND token_hash = $2
	`

	token := &entity.PasswordResetToken{}
	err := r.db.QueryRowContext(ctx, query, userID, tokenHash).Scan(
		&token.ID, &token.UserID, &token.TokenHash, &token.Code,
		&token.ExpiresAt, &token.UsedAt, &token.CreatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, errors.NewNotFoundError("Token de recuperação")
	}
	if err != nil {
		return nil, errors.DatabaseError(err)
	}

	return token, nil
}

func (r *userRepository) GetValidPasswordResetToken(ctx context.Context, email, code string) (*entity.PasswordResetToken, error) {
	query := `
		SELECT prt.id, prt.user_id, prt.token_hash, prt.code, prt.expires_at, prt.used_at, prt.created_at
		FROM password_reset_tokens prt
		INNER JOIN users u ON u.id = prt.user_id
		WHERE u.email = $1 
		  AND prt.code = $2
		  AND prt.used_at IS NULL
		  AND prt.expires_at > NOW()
		ORDER BY prt.created_at DESC
		LIMIT 1
	`

	token := &entity.PasswordResetToken{}
	err := r.db.QueryRowContext(ctx, query, email, code).Scan(
		&token.ID, &token.UserID, &token.TokenHash, &token.Code,
		&token.ExpiresAt, &token.UsedAt, &token.CreatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, errors.NewNotFoundError("Token de recuperação")
	}
	if err != nil {
		return nil, errors.DatabaseError(err)
	}

	return token, nil
}

func (r *userRepository) MarkPasswordResetTokenUsed(ctx context.Context, tokenID string) error {
	query := `
		UPDATE password_reset_tokens
		SET used_at = NOW()
		WHERE id = $1
	`

	result, err := r.db.ExecContext(ctx, query, tokenID)
	if err != nil {
		return errors.DatabaseError(err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return errors.DatabaseError(err)
	}

	if rows == 0 {
		return errors.NewNotFoundError("Token de recuperação")
	}

	return nil
}

func (r *userRepository) InvalidatePasswordResetTokens(ctx context.Context, userID string) error {
	query := `
		UPDATE password_reset_tokens
		SET used_at = NOW()
		WHERE user_id = $1 AND used_at IS NULL
	`

	_, err := r.db.ExecContext(ctx, query, userID)
	if err != nil {
		return errors.DatabaseError(err)
	}

	return nil
}

// ListByIndustryWithFilters lista usuários com filtros, busca, ordenação e paginação
func (r *userRepository) ListByIndustryWithFilters(ctx context.Context, industryID string, filters entity.UserFilters) ([]entity.User, int, error) {
	// Build base query
	baseQuery := `
		FROM users
		WHERE industry_id = $1
	`
	args := []interface{}{industryID}
	argIndex := 2

	// Apply role filter
	if filters.Role != nil {
		baseQuery += fmt.Sprintf(` AND role = $%d`, argIndex)
		args = append(args, *filters.Role)
		argIndex++
	}

	// Apply status filter
	if filters.IsActive != nil {
		baseQuery += fmt.Sprintf(` AND is_active = $%d`, argIndex)
		args = append(args, *filters.IsActive)
		argIndex++
	}

	// Apply search filter
	if filters.Search != nil && *filters.Search != "" {
		search := "%" + *filters.Search + "%"
		baseQuery += fmt.Sprintf(` AND (LOWER(name) LIKE LOWER($%d) 
			OR LOWER(email) LIKE LOWER($%d) 
			OR LOWER(phone) LIKE LOWER($%d))`, argIndex, argIndex, argIndex)
		args = append(args, search)
		argIndex++
	}

	// Count total records
	countQuery := `SELECT COUNT(*) ` + baseQuery
	var total int
	if err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, errors.DatabaseError(err)
	}

	// Validate and apply sorting
	sortBy := filters.GetSortBy()
	sortOrder := filters.GetSortOrder()
	if !filters.IsValidSortField() {
		sortBy = "name"
	}
	if !filters.IsValidSortOrder() {
		sortOrder = "asc"
	}

	// Build select query with sorting and pagination
	selectQuery := fmt.Sprintf(`
		SELECT id, industry_id, name, email, phone, whatsapp, role, 
		       is_active, first_login_at, created_at, updated_at
	%s
		ORDER BY %s %s
		LIMIT $%d OFFSET $%d`, baseQuery, sortBy, sortOrder, argIndex, argIndex+1)

	limit := filters.Limit
	if limit <= 0 {
		limit = 50
	}
	page := filters.Page
	if page <= 0 {
		page = 1
	}
	offset := (page - 1) * limit

	args = append(args, limit, offset)

	rows, err := r.db.QueryContext(ctx, selectQuery, args...)
	if err != nil {
		return nil, 0, errors.DatabaseError(err)
	}
	defer rows.Close()

	users := []entity.User{}
	for rows.Next() {
		var u entity.User
		if err := rows.Scan(
			&u.ID, &u.IndustryID, &u.Name, &u.Email,
			&u.Phone, &u.Whatsapp, &u.Role, &u.IsActive, &u.FirstLoginAt, &u.CreatedAt, &u.UpdatedAt,
		); err != nil {
			return nil, 0, errors.DatabaseError(err)
		}
		users = append(users, u)
	}

	return users, total, nil
}

// FindBrokersWithFilters busca brokers com filtros, busca, ordenação e paginação
func (r *userRepository) FindBrokersWithFilters(ctx context.Context, industryID string, filters entity.UserFilters) ([]entity.BrokerWithStats, int, error) {
	// Build base query
	baseQuery := `
		FROM users u
		LEFT JOIN shared_inventory_batches sib 
			ON u.id = sib.shared_with_user_id 
			AND sib.industry_owner_id = $1
			AND sib.is_active = TRUE
		WHERE u.role = 'BROKER'
	`
	args := []interface{}{industryID}
	argIndex := 2

	// Apply status filter
	if filters.IsActive != nil {
		baseQuery += fmt.Sprintf(` AND u.is_active = $%d`, argIndex)
		args = append(args, *filters.IsActive)
		argIndex++
	}

	// Apply search filter
	if filters.Search != nil && *filters.Search != "" {
		search := "%" + *filters.Search + "%"
		baseQuery += fmt.Sprintf(` AND (LOWER(u.name) LIKE LOWER($%d) 
			OR LOWER(u.email) LIKE LOWER($%d) 
			OR LOWER(u.phone) LIKE LOWER($%d))`, argIndex, argIndex, argIndex)
		args = append(args, search)
		argIndex++
	}

	// Group by for count
	groupBy := ` GROUP BY u.id`

	// Count total records - need to count distinct user ids
	countQuery := `SELECT COUNT(DISTINCT u.id) ` + baseQuery
	var total int
	if err := r.db.QueryRowContext(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, errors.DatabaseError(err)
	}

	// Validate and apply sorting
	sortBy := filters.GetSortBy()
	sortOrder := filters.GetSortOrder()
	if !filters.IsValidSortField() {
		sortBy = "name"
	}
	if !filters.IsValidSortOrder() {
		sortOrder = "asc"
	}

	// Map sort fields to actual column names with table prefix
	sortColumn := "u." + sortBy
	if sortBy == "created_at" {
		sortColumn = "u.created_at"
	}

	// Build select query with sorting and pagination
	selectQuery := fmt.Sprintf(`
		SELECT 
			u.id, u.name, u.email, u.phone, u.whatsapp, u.role, 
			u.is_active, u.first_login_at, u.created_at, u.updated_at,
			COALESCE(COUNT(DISTINCT sib.id), 0) as shared_batches_count
	%s%s
		ORDER BY %s %s
		LIMIT $%d OFFSET $%d`, baseQuery, groupBy, sortColumn, sortOrder, argIndex, argIndex+1)

	limit := filters.Limit
	if limit <= 0 {
		limit = 50
	}
	page := filters.Page
	if page <= 0 {
		page = 1
	}
	offset := (page - 1) * limit

	args = append(args, limit, offset)

	rows, err := r.db.QueryContext(ctx, selectQuery, args...)
	if err != nil {
		return nil, 0, errors.DatabaseError(err)
	}
	defer rows.Close()

	brokers := []entity.BrokerWithStats{}
	for rows.Next() {
		var b entity.BrokerWithStats
		if err := rows.Scan(
			&b.ID, &b.Name, &b.Email, &b.Phone, &b.Whatsapp, &b.Role,
			&b.IsActive, &b.FirstLoginAt, &b.CreatedAt, &b.UpdatedAt,
			&b.SharedBatchesCount,
		); err != nil {
			return nil, 0, errors.DatabaseError(err)
		}
		brokers = append(brokers, b)
	}

	return brokers, total, nil
}

func (r *userRepository) Delete(ctx context.Context, id string) error {
	query := `DELETE FROM users WHERE id = $1`

	result, err := r.db.ExecContext(ctx, query, id)
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
