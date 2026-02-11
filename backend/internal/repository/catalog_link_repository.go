package repository

import (
	"context"
	"database/sql"

	"github.com/lib/pq"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
	"github.com/thiagomes07/CAVA/backend/internal/domain/errors"
)

type catalogLinkRepository struct {
	db *DB
}

func NewCatalogLinkRepository(db *DB) *catalogLinkRepository {
	return &catalogLinkRepository{db: db}
}

func (r *catalogLinkRepository) Create(ctx context.Context, link *entity.CatalogLink, batchIDs []string) error {
	tx, err := r.db.BeginTx(ctx)
	if err != nil {
		return errors.DatabaseError(err)
	}
	defer tx.Rollback()

	// Criar o link
	query := `
		INSERT INTO catalog_links (
			id, created_by_user_id, industry_id, slug_token, title,
			custom_message, display_currency, expires_at, is_active
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING created_at, updated_at
	`

	err = tx.QueryRowContext(ctx, query,
		link.ID, link.CreatedByUserID, link.IndustryID, link.SlugToken,
		link.Title, link.CustomMessage, link.DisplayCurrency, link.ExpiresAt, link.IsActive,
	).Scan(&link.CreatedAt, &link.UpdatedAt)

	if err != nil {
		if pqErr, ok := err.(*pq.Error); ok {
			if pqErr.Code == "23505" {
				return errors.SlugExistsError(link.SlugToken)
			}
		}
		return errors.DatabaseError(err)
	}

	// Adicionar lotes ao catálogo
	if len(batchIDs) > 0 {
		insertBatchQuery := `
			INSERT INTO catalog_link_batches (catalog_link_id, batch_id, display_order)
			VALUES ($1, $2, $3)
		`
		stmt, err := tx.PrepareContext(ctx, insertBatchQuery)
		if err != nil {
			return errors.DatabaseError(err)
		}
		defer stmt.Close()

		for i, batchID := range batchIDs {
			_, err = stmt.ExecContext(ctx, link.ID, batchID, i)
			if err != nil {
				return errors.DatabaseError(err)
			}
		}
	}

	return tx.Commit()
}

func (r *catalogLinkRepository) FindByID(ctx context.Context, id string) (*entity.CatalogLink, error) {
	query := `
		SELECT id, created_by_user_id, industry_id, slug_token, title,
		       custom_message, display_currency, views_count, expires_at, is_active,
		       created_at, updated_at
		FROM catalog_links
		WHERE id = $1
	`

	link := &entity.CatalogLink{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&link.ID, &link.CreatedByUserID, &link.IndustryID, &link.SlugToken,
		&link.Title, &link.CustomMessage, &link.DisplayCurrency, &link.ViewsCount, &link.ExpiresAt,
		&link.IsActive, &link.CreatedAt, &link.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, errors.NewNotFoundError("Link de catálogo")
	}
	if err != nil {
		return nil, errors.DatabaseError(err)
	}

	// Buscar lotes associados
	batches, err := r.findBatchesByLinkID(ctx, id)
	if err != nil {
		return nil, err
	}
	link.Batches = batches

	return link, nil
}

func (r *catalogLinkRepository) FindBySlug(ctx context.Context, slug string) (*entity.CatalogLink, error) {
	query := `
		SELECT id, created_by_user_id, industry_id, slug_token, title,
		       custom_message, display_currency, views_count, expires_at, is_active,
		       created_at, updated_at
		FROM catalog_links
		WHERE slug_token = $1
	`

	link := &entity.CatalogLink{}
	err := r.db.QueryRowContext(ctx, query, slug).Scan(
		&link.ID, &link.CreatedByUserID, &link.IndustryID, &link.SlugToken,
		&link.Title, &link.CustomMessage, &link.DisplayCurrency, &link.ViewsCount, &link.ExpiresAt,
		&link.IsActive, &link.CreatedAt, &link.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, errors.NewNotFoundError("Link de catálogo")
	}
	if err != nil {
		return nil, errors.DatabaseError(err)
	}

	// Buscar lotes associados
	batches, err := r.findBatchesByLinkID(ctx, link.ID)
	if err != nil {
		return nil, err
	}
	link.Batches = batches

	return link, nil
}

func (r *catalogLinkRepository) List(ctx context.Context, industryID string, userID *string) ([]entity.CatalogLink, error) {
	var query string
	var args []interface{}

	if userID != nil {
		// Filtrar por usuário (para brokers)
		query = `
			SELECT id, created_by_user_id, industry_id, slug_token, title,
			       custom_message, display_currency, views_count, expires_at, is_active,
			       created_at, updated_at
			FROM catalog_links
			WHERE created_by_user_id = $1
			ORDER BY created_at DESC
		`
		args = []interface{}{*userID}
	} else {
		// Filtrar por indústria (para admins/vendedores)
		query = `
			SELECT id, created_by_user_id, industry_id, slug_token, title,
			       custom_message, display_currency, views_count, expires_at, is_active,
			       created_at, updated_at
			FROM catalog_links
			WHERE industry_id = $1
			ORDER BY created_at DESC
		`
		args = []interface{}{industryID}
	}

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, errors.DatabaseError(err)
	}
	defer rows.Close()

	links := []entity.CatalogLink{}
	for rows.Next() {
		var link entity.CatalogLink
		if err := rows.Scan(
			&link.ID, &link.CreatedByUserID, &link.IndustryID, &link.SlugToken,
			&link.Title, &link.CustomMessage, &link.DisplayCurrency, &link.ViewsCount, &link.ExpiresAt,
			&link.IsActive, &link.CreatedAt, &link.UpdatedAt,
		); err != nil {
			return nil, errors.DatabaseError(err)
		}
		links = append(links, link)
	}

	return links, nil
}

func (r *catalogLinkRepository) Update(ctx context.Context, link *entity.CatalogLink, batchIDs *[]string) error {
	tx, err := r.db.BeginTx(ctx)
	if err != nil {
		return errors.DatabaseError(err)
	}
	defer tx.Rollback()

	// Atualizar o link
	query := `
		UPDATE catalog_links
		SET title = $1, custom_message = $2, display_currency = $3, expires_at = $4, is_active = $5,
		    updated_at = CURRENT_TIMESTAMP
		WHERE id = $6
		RETURNING updated_at
	`

	err = tx.QueryRowContext(ctx, query,
		link.Title, link.CustomMessage, link.DisplayCurrency, link.ExpiresAt, link.IsActive, link.ID,
	).Scan(&link.UpdatedAt)

	if err == sql.ErrNoRows {
		return errors.NewNotFoundError("Link de catálogo")
	}
	if err != nil {
		return errors.DatabaseError(err)
	}

	// Se batchIDs foi fornecido, atualizar os lotes
	if batchIDs != nil {
		// Remover lotes existentes
		_, err = tx.ExecContext(ctx, "DELETE FROM catalog_link_batches WHERE catalog_link_id = $1", link.ID)
		if err != nil {
			return errors.DatabaseError(err)
		}

		// Adicionar novos lotes
		if len(*batchIDs) > 0 {
			insertBatchQuery := `
				INSERT INTO catalog_link_batches (catalog_link_id, batch_id, display_order)
				VALUES ($1, $2, $3)
			`
			stmt, err := tx.PrepareContext(ctx, insertBatchQuery)
			if err != nil {
				return errors.DatabaseError(err)
			}
			defer stmt.Close()

			for i, batchID := range *batchIDs {
				_, err = stmt.ExecContext(ctx, link.ID, batchID, i)
				if err != nil {
					return errors.DatabaseError(err)
				}
			}
		}
	}

	return tx.Commit()
}

func (r *catalogLinkRepository) Delete(ctx context.Context, id string) error {
	query := `DELETE FROM catalog_links WHERE id = $1`

	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return errors.DatabaseError(err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return errors.DatabaseError(err)
	}

	if rows == 0 {
		return errors.NewNotFoundError("Link de catálogo")
	}

	return nil
}

func (r *catalogLinkRepository) IncrementViews(ctx context.Context, id string) error {
	query := `
		UPDATE catalog_links
		SET views_count = views_count + 1
		WHERE id = $1
	`

	_, err := r.db.ExecContext(ctx, query, id)
	return errors.DatabaseError(err)
}

func (r *catalogLinkRepository) ExistsBySlug(ctx context.Context, slug string) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM catalog_links WHERE slug_token = $1)`

	var exists bool
	err := r.db.QueryRowContext(ctx, query, slug).Scan(&exists)
	if err != nil {
		return false, errors.DatabaseError(err)
	}

	return exists, nil
}

// findBatchesByLinkID busca os lotes associados a um link de catálogo
func (r *catalogLinkRepository) findBatchesByLinkID(ctx context.Context, linkID string) ([]entity.Batch, error) {
	query := `
		SELECT b.id, b.product_id, b.industry_id, b.batch_code, b.height, b.width, b.thickness,
		       b.quantity_slabs, b.available_slabs, b.reserved_slabs, b.sold_slabs, b.inactive_slabs,
		       b.net_area, b.industry_price, b.price_unit, b.origin_quarry,
		       b.entry_date, b.status, b.is_active, b.is_public, b.created_at, b.updated_at, b.deleted_at,
		       clb.display_order
		FROM catalog_link_batches clb
		INNER JOIN batches b ON clb.batch_id = b.id
		WHERE clb.catalog_link_id = $1
		  AND b.deleted_at IS NULL
		ORDER BY clb.display_order, b.created_at
	`

	rows, err := r.db.QueryContext(ctx, query, linkID)
	if err != nil {
		return nil, errors.DatabaseError(err)
	}
	defer rows.Close()

	batches := []entity.Batch{}
	for rows.Next() {
		var b entity.Batch
		var displayOrder int
		if err := rows.Scan(
			&b.ID, &b.ProductID, &b.IndustryID, &b.BatchCode,
			&b.Height, &b.Width, &b.Thickness, &b.QuantitySlabs,
			&b.AvailableSlabs, &b.ReservedSlabs, &b.SoldSlabs, &b.InactiveSlabs,
			&b.TotalArea, &b.IndustryPrice, &b.PriceUnit, &b.OriginQuarry,
			&b.EntryDate, &b.Status, &b.IsActive, &b.IsPublic,
			&b.CreatedAt, &b.UpdatedAt, &b.DeletedAt, &displayOrder,
		); err != nil {
			return nil, errors.DatabaseError(err)
		}
		batches = append(batches, b)
	}

	return batches, nil
}
