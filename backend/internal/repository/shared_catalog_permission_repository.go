package repository

import (
	"context"
	"database/sql"

	"github.com/google/uuid"
	"github.com/lib/pq"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
	"github.com/thiagomes07/CAVA/backend/internal/domain/errors"
)

type sharedCatalogPermissionRepository struct {
	db *DB
}

func NewSharedCatalogPermissionRepository(db *DB) *sharedCatalogPermissionRepository {
	return &sharedCatalogPermissionRepository{db: db}
}

func (r *sharedCatalogPermissionRepository) Create(ctx context.Context, permission *entity.SharedCatalogPermission) error {
	if permission.ID == "" {
		permission.ID = uuid.New().String()
	}

	query := `
		INSERT INTO shared_catalog_permissions (
			id, industry_id, shared_with_user_id, can_show_prices, is_active
		) VALUES ($1, $2, $3, $4, $5)
		RETURNING granted_at
	`

	err := r.db.QueryRowContext(ctx, query,
		permission.ID, permission.IndustryID, permission.SharedWithUserID,
		permission.CanShowPrices, permission.IsActive,
	).Scan(&permission.GrantedAt)

	if err != nil {
		if pqErr, ok := err.(*pq.Error); ok {
			if pqErr.Code == "23505" { // unique_violation
				return errors.NewConflictError("Portfolio já compartilhado com este broker")
			}
		}
		return errors.DatabaseError(err)
	}

	return nil
}

func (r *sharedCatalogPermissionRepository) FindByID(ctx context.Context, id string) (*entity.SharedCatalogPermission, error) {
	query := `
		SELECT id, industry_id, shared_with_user_id, can_show_prices, granted_at, is_active
		FROM shared_catalog_permissions
		WHERE id = $1
	`

	permission := &entity.SharedCatalogPermission{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&permission.ID, &permission.IndustryID, &permission.SharedWithUserID,
		&permission.CanShowPrices, &permission.GrantedAt, &permission.IsActive,
	)

	if err == sql.ErrNoRows {
		return nil, errors.NewNotFoundError("Permissão não encontrada")
	}
	if err != nil {
		return nil, errors.DatabaseError(err)
	}

	return permission, nil
}

func (r *sharedCatalogPermissionRepository) FindByIndustryID(ctx context.Context, industryID string) ([]entity.SharedCatalogPermission, error) {
	query := `
		SELECT scp.id, scp.industry_id, scp.shared_with_user_id, scp.can_show_prices, 
		       scp.granted_at, scp.is_active, u.name, u.email
		FROM shared_catalog_permissions scp
		JOIN users u ON scp.shared_with_user_id = u.id
		WHERE scp.industry_id = $1 AND scp.is_active = true
		ORDER BY scp.granted_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query, industryID)
	if err != nil {
		return nil, errors.DatabaseError(err)
	}
	defer rows.Close()

	permissions := []entity.SharedCatalogPermission{}
	for rows.Next() {
		var p entity.SharedCatalogPermission
		var brokerName, brokerEmail string
		if err := rows.Scan(
			&p.ID, &p.IndustryID, &p.SharedWithUserID, &p.CanShowPrices,
			&p.GrantedAt, &p.IsActive, &brokerName, &brokerEmail,
		); err != nil {
			return nil, errors.DatabaseError(err)
		}
		permissions = append(permissions, p)
	}

	return permissions, nil
}

func (r *sharedCatalogPermissionRepository) FindByUserID(ctx context.Context, userID string) ([]entity.SharedCatalogPermission, error) {
	query := `
		SELECT id, industry_id, shared_with_user_id, can_show_prices, granted_at, is_active
		FROM shared_catalog_permissions
		WHERE shared_with_user_id = $1 AND is_active = true
		ORDER BY granted_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, errors.DatabaseError(err)
	}
	defer rows.Close()

	permissions := []entity.SharedCatalogPermission{}
	for rows.Next() {
		var p entity.SharedCatalogPermission
		if err := rows.Scan(
			&p.ID, &p.IndustryID, &p.SharedWithUserID, &p.CanShowPrices,
			&p.GrantedAt, &p.IsActive,
		); err != nil {
			return nil, errors.DatabaseError(err)
		}
		permissions = append(permissions, p)
	}

	return permissions, nil
}

func (r *sharedCatalogPermissionRepository) FindByIndustryAndUser(ctx context.Context, industryID, userID string) (*entity.SharedCatalogPermission, error) {
	query := `
		SELECT id, industry_id, shared_with_user_id, can_show_prices, granted_at, is_active
		FROM shared_catalog_permissions
		WHERE industry_id = $1 AND shared_with_user_id = $2
	`

	permission := &entity.SharedCatalogPermission{}
	err := r.db.QueryRowContext(ctx, query, industryID, userID).Scan(
		&permission.ID, &permission.IndustryID, &permission.SharedWithUserID,
		&permission.CanShowPrices, &permission.GrantedAt, &permission.IsActive,
	)

	if err == sql.ErrNoRows {
		return nil, errors.NewNotFoundError("Permissão não encontrada")
	}
	if err != nil {
		return nil, errors.DatabaseError(err)
	}

	return permission, nil
}

func (r *sharedCatalogPermissionRepository) Update(ctx context.Context, permission *entity.SharedCatalogPermission) error {
	query := `
		UPDATE shared_catalog_permissions
		SET can_show_prices = $1, is_active = $2
		WHERE id = $3
	`

	result, err := r.db.ExecContext(ctx, query,
		permission.CanShowPrices, permission.IsActive, permission.ID,
	)
	if err != nil {
		return errors.DatabaseError(err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return errors.DatabaseError(err)
	}

	if rows == 0 {
		return errors.NewNotFoundError("Permissão não encontrada")
	}

	return nil
}

func (r *sharedCatalogPermissionRepository) Delete(ctx context.Context, industryID, userID string) error {
	query := `
		DELETE FROM shared_catalog_permissions
		WHERE industry_id = $1 AND shared_with_user_id = $2
	`

	result, err := r.db.ExecContext(ctx, query, industryID, userID)
	if err != nil {
		return errors.DatabaseError(err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return errors.DatabaseError(err)
	}

	if rows == 0 {
		return errors.NewNotFoundError("Permissão não encontrada")
	}

	return nil
}

func (r *sharedCatalogPermissionRepository) ExistsByIndustryAndUser(ctx context.Context, industryID, userID string) (bool, error) {
	query := `
		SELECT EXISTS(
			SELECT 1 FROM shared_catalog_permissions
			WHERE industry_id = $1 AND shared_with_user_id = $2
		)
	`

	var exists bool
	err := r.db.QueryRowContext(ctx, query, industryID, userID).Scan(&exists)
	if err != nil {
		return false, errors.DatabaseError(err)
	}

	return exists, nil
}
