package repository

import (
	"context"
	"database/sql"
	"strconv"

	"github.com/lib/pq"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
	"github.com/thiagomes07/CAVA/backend/internal/domain/errors"
)

type sharedInventoryRepository struct {
	db *DB
}

func NewSharedInventoryRepository(db *DB) *sharedInventoryRepository {
	return &sharedInventoryRepository{db: db}
}

func (r *sharedInventoryRepository) CreateSharedBatch(ctx context.Context, shared *entity.SharedInventoryBatch) error {
	query := `
		INSERT INTO shared_inventory_batches (
			id, batch_id, shared_with_user_id, industry_owner_id, negotiated_price
		) VALUES ($1, $2, $3, $4, $5)
		RETURNING shared_at
	`

	err := r.db.QueryRowContext(ctx, query,
		shared.ID, shared.BatchID, shared.SharedWithUserID,
		shared.IndustryOwnerID, shared.NegotiatedPrice,
	).Scan(&shared.SharedAt)

	if err != nil {
		if pqErr, ok := err.(*pq.Error); ok {
			if pqErr.Code == "23505" { // unique_violation
				return errors.NewConflictError("Lote já compartilhado com este broker")
			}
		}
		return errors.DatabaseError(err)
	}

	return nil
}

func (r *sharedInventoryRepository) FindByUserID(ctx context.Context, userID string, filters entity.SharedInventoryFilters) ([]entity.SharedInventoryBatch, error) {
	query := `
		SELECT id, batch_id, shared_with_user_id, industry_owner_id, 
		       negotiated_price, shared_at, is_active
		FROM shared_inventory_batches
		WHERE shared_with_user_id = $1 AND is_active = TRUE
	`
	args := []interface{}{userID}

	if filters.Status != "" {
		query += ` AND EXISTS (
			SELECT 1 FROM batches 
			WHERE batches.id = shared_inventory_batches.batch_id 
			AND batches.status = $2
		)`
		args = append(args, filters.Status)
	}

	if filters.Recent {
		query += ` ORDER BY shared_at DESC`
	} else {
		query += ` ORDER BY shared_at DESC`
	}

	if filters.Limit > 0 {
		query += ` LIMIT $` + strconv.Itoa(len(args)+1)
		args = append(args, filters.Limit)
	}

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, errors.DatabaseError(err)
	}
	defer rows.Close()

	return r.scanSharedBatches(rows)
}

func (r *sharedInventoryRepository) FindByBatchID(ctx context.Context, batchID string) ([]entity.SharedInventoryBatch, error) {
	query := `
		SELECT id, batch_id, shared_with_user_id, industry_owner_id, 
		       negotiated_price, shared_at, is_active
		FROM shared_inventory_batches
		WHERE batch_id = $1 AND is_active = TRUE
		ORDER BY shared_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query, batchID)
	if err != nil {
		return nil, errors.DatabaseError(err)
	}
	defer rows.Close()

	return r.scanSharedBatches(rows)
}

func (r *sharedInventoryRepository) FindByID(ctx context.Context, id string) (*entity.SharedInventoryBatch, error) {
	query := `
		SELECT id, batch_id, shared_with_user_id, industry_owner_id, 
		       negotiated_price, shared_at, is_active
		FROM shared_inventory_batches
		WHERE id = $1
	`

	shared := &entity.SharedInventoryBatch{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&shared.ID, &shared.BatchID, &shared.SharedWithUserID,
		&shared.IndustryOwnerID, &shared.NegotiatedPrice,
		&shared.SharedAt, &shared.IsActive,
	)

	if err == sql.ErrNoRows {
		return nil, errors.NewNotFoundError("Compartilhamento")
	}
	if err != nil {
		return nil, errors.DatabaseError(err)
	}

	return shared, nil
}

func (r *sharedInventoryRepository) ExistsForUser(ctx context.Context, batchID, userID string) (bool, error) {
	query := `
		SELECT EXISTS(
			SELECT 1 FROM shared_inventory_batches 
			WHERE batch_id = $1 AND shared_with_user_id = $2 AND is_active = TRUE
		)
	`

	var exists bool
	err := r.db.QueryRowContext(ctx, query, batchID, userID).Scan(&exists)
	if err != nil {
		return false, errors.DatabaseError(err)
	}

	return exists, nil
}

func (r *sharedInventoryRepository) UpdateNegotiatedPrice(ctx context.Context, id string, price *float64) error {
	query := `
		UPDATE shared_inventory_batches
		SET negotiated_price = $1
		WHERE id = $2 AND is_active = TRUE
	`

	result, err := r.db.ExecContext(ctx, query, price, id)
	if err != nil {
		return errors.DatabaseError(err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return errors.DatabaseError(err)
	}

	if rows == 0 {
		return errors.NewNotFoundError("Compartilhamento")
	}

	return nil
}

func (r *sharedInventoryRepository) Delete(ctx context.Context, id string) error {
	query := `DELETE FROM shared_inventory_batches WHERE id = $1`

	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return errors.DatabaseError(err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return errors.DatabaseError(err)
	}

	if rows == 0 {
		return errors.NewNotFoundError("Compartilhamento")
	}

	return nil
}

func (r *sharedInventoryRepository) CountSharedBatches(ctx context.Context, userID string, status entity.BatchStatus) (int, error) {
	query := `
		SELECT COUNT(DISTINCT sib.id)
		FROM shared_inventory_batches sib
		INNER JOIN batches b ON sib.batch_id = b.id
		WHERE sib.shared_with_user_id = $1 
		  AND sib.is_active = TRUE
		  AND b.status = $2
		  AND b.is_active = TRUE
	`

	var count int
	err := r.db.QueryRowContext(ctx, query, userID, status).Scan(&count)
	if err != nil {
		return 0, errors.DatabaseError(err)
	}

	return count, nil
}

func (r *sharedInventoryRepository) CreateCatalogPermission(ctx context.Context, permission *entity.SharedCatalogPermission) error {
	query := `
		INSERT INTO shared_catalog_permissions (
			id, industry_id, shared_with_user_id, can_show_prices
		) VALUES ($1, $2, $3, $4)
		RETURNING granted_at
	`

	err := r.db.QueryRowContext(ctx, query,
		permission.ID, permission.IndustryID,
		permission.SharedWithUserID, permission.CanShowPrices,
	).Scan(&permission.GrantedAt)

	if err != nil {
		if pqErr, ok := err.(*pq.Error); ok {
			if pqErr.Code == "23505" {
				return errors.NewConflictError("Permissão já existe para este broker")
			}
		}
		return errors.DatabaseError(err)
	}

	return nil
}

func (r *sharedInventoryRepository) FindCatalogPermissionByUser(ctx context.Context, industryID, userID string) (*entity.SharedCatalogPermission, error) {
	query := `
		SELECT id, industry_id, shared_with_user_id, can_show_prices, 
		       granted_at, is_active
		FROM shared_catalog_permissions
		WHERE industry_id = $1 AND shared_with_user_id = $2
	`

	perm := &entity.SharedCatalogPermission{}
	err := r.db.QueryRowContext(ctx, query, industryID, userID).Scan(
		&perm.ID, &perm.IndustryID, &perm.SharedWithUserID,
		&perm.CanShowPrices, &perm.GrantedAt, &perm.IsActive,
	)

	if err == sql.ErrNoRows {
		return nil, errors.NewNotFoundError("Permissão")
	}
	if err != nil {
		return nil, errors.DatabaseError(err)
	}

	return perm, nil
}

func (r *sharedInventoryRepository) UpdateCatalogPermission(ctx context.Context, permission *entity.SharedCatalogPermission) error {
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
		return errors.NewNotFoundError("Permissão")
	}

	return nil
}

func (r *sharedInventoryRepository) DeleteCatalogPermission(ctx context.Context, id string) error {
	query := `DELETE FROM shared_catalog_permissions WHERE id = $1`

	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return errors.DatabaseError(err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return errors.DatabaseError(err)
	}

	if rows == 0 {
		return errors.NewNotFoundError("Permissão")
	}

	return nil
}

func (r *sharedInventoryRepository) scanSharedBatches(rows *sql.Rows) ([]entity.SharedInventoryBatch, error) {
	shared := []entity.SharedInventoryBatch{}
	for rows.Next() {
		var s entity.SharedInventoryBatch
		if err := rows.Scan(
			&s.ID, &s.BatchID, &s.SharedWithUserID, &s.IndustryOwnerID,
			&s.NegotiatedPrice, &s.SharedAt, &s.IsActive,
		); err != nil {
			return nil, errors.DatabaseError(err)
		}
		shared = append(shared, s)
	}
	return shared, nil
}
