package repository

import (
	"context"
	"database/sql"

	sq "github.com/Masterminds/squirrel"
	"github.com/lib/pq"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
	"github.com/thiagomes07/CAVA/backend/internal/domain/errors"
)

type salesLinkRepository struct {
	db *DB
}

func NewSalesLinkRepository(db *DB) *salesLinkRepository {
	return &salesLinkRepository{db: db}
}

func (r *salesLinkRepository) Create(ctx context.Context, link *entity.SalesLink) error {
	query := `
		INSERT INTO sales_links (
			id, created_by_user_id, industry_id, batch_id, product_id,
			link_type, slug_token, title, custom_message, display_price,
			show_price, expires_at, is_active
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		RETURNING created_at, updated_at
	`

	err := r.db.QueryRowContext(ctx, query,
		link.ID, link.CreatedByUserID, link.IndustryID, link.BatchID,
		link.ProductID, link.LinkType, link.SlugToken, link.Title,
		link.CustomMessage, link.DisplayPrice, link.ShowPrice,
		link.ExpiresAt, link.IsActive,
	).Scan(&link.CreatedAt, &link.UpdatedAt)

	if err != nil {
		if pqErr, ok := err.(*pq.Error); ok {
			if pqErr.Code == "23505" {
				return errors.SlugExistsError(link.SlugToken)
			}
		}
		return errors.DatabaseError(err)
	}

	return nil
}

func (r *salesLinkRepository) FindByID(ctx context.Context, id string) (*entity.SalesLink, error) {
	query := `
		SELECT id, created_by_user_id, industry_id, batch_id, product_id,
		       link_type, slug_token, title, custom_message, display_price,
		       show_price, views_count, expires_at, is_active, 
		       created_at, updated_at
		FROM sales_links
		WHERE id = $1
	`

	link := &entity.SalesLink{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&link.ID, &link.CreatedByUserID, &link.IndustryID, &link.BatchID,
		&link.ProductID, &link.LinkType, &link.SlugToken, &link.Title,
		&link.CustomMessage, &link.DisplayPrice, &link.ShowPrice,
		&link.ViewsCount, &link.ExpiresAt, &link.IsActive,
		&link.CreatedAt, &link.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, errors.NewNotFoundError("Link de venda")
	}
	if err != nil {
		return nil, errors.DatabaseError(err)
	}

	return link, nil
}

func (r *salesLinkRepository) FindBySlug(ctx context.Context, slug string) (*entity.SalesLink, error) {
	query := `
		SELECT id, created_by_user_id, industry_id, batch_id, product_id,
		       link_type, slug_token, title, custom_message, display_price,
		       show_price, views_count, expires_at, is_active, 
		       created_at, updated_at
		FROM sales_links
		WHERE slug_token = $1
	`

	link := &entity.SalesLink{}
	err := r.db.QueryRowContext(ctx, query, slug).Scan(
		&link.ID, &link.CreatedByUserID, &link.IndustryID, &link.BatchID,
		&link.ProductID, &link.LinkType, &link.SlugToken, &link.Title,
		&link.CustomMessage, &link.DisplayPrice, &link.ShowPrice,
		&link.ViewsCount, &link.ExpiresAt, &link.IsActive,
		&link.CreatedAt, &link.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, errors.NewNotFoundError("Link de venda")
	}
	if err != nil {
		return nil, errors.DatabaseError(err)
	}

	return link, nil
}

func (r *salesLinkRepository) FindByCreatorID(ctx context.Context, userID string, filters entity.SalesLinkFilters) ([]entity.SalesLink, int, error) {
	return r.listWithFilters(ctx, &userID, filters)
}

func (r *salesLinkRepository) FindByType(ctx context.Context, linkType entity.LinkType) ([]entity.SalesLink, error) {
	query := `
		SELECT id, created_by_user_id, industry_id, batch_id, product_id,
		       link_type, slug_token, title, custom_message, display_price,
		       show_price, views_count, expires_at, is_active, 
		       created_at, updated_at
		FROM sales_links
		WHERE link_type = $1 AND is_active = TRUE
		ORDER BY created_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query, linkType)
	if err != nil {
		return nil, errors.DatabaseError(err)
	}
	defer rows.Close()

	return r.scanLinks(rows)
}

func (r *salesLinkRepository) List(ctx context.Context, filters entity.SalesLinkFilters) ([]entity.SalesLink, int, error) {
	return r.listWithFilters(ctx, nil, filters)
}

func (r *salesLinkRepository) listWithFilters(ctx context.Context, userID *string, filters entity.SalesLinkFilters) ([]entity.SalesLink, int, error) {
	psql := sq.StatementBuilder.PlaceholderFormat(sq.Dollar)

	query := psql.Select(
		"id", "created_by_user_id", "industry_id", "batch_id", "product_id",
		"link_type", "slug_token", "title", "custom_message", "display_price",
		"show_price", "views_count", "expires_at", "is_active",
		"created_at", "updated_at",
	).From("sales_links")

	if userID != nil {
		query = query.Where(sq.Eq{"created_by_user_id": *userID})
	}

	if filters.Type != nil {
		query = query.Where(sq.Eq{"link_type": *filters.Type})
	}

	if filters.Status != nil {
		if *filters.Status == "ATIVO" {
			query = query.Where(sq.Eq{"is_active": true})
			query = query.Where(sq.Or{
				sq.Eq{"expires_at": nil},
				sq.Gt{"expires_at": sq.Expr("CURRENT_TIMESTAMP")},
			})
		} else if *filters.Status == "EXPIRADO" {
			query = query.Where(sq.Lt{"expires_at": sq.Expr("CURRENT_TIMESTAMP")})
		}
	}

	if filters.Search != nil && *filters.Search != "" {
		search := "%" + *filters.Search + "%"
		query = query.Where(sq.Or{
			sq.ILike{"title": search},
			sq.ILike{"slug_token": search},
		})
	}

	// Count
	countQuery := psql.Select("COUNT(*)").From("sales_links")
	if userID != nil {
		countQuery = countQuery.Where(sq.Eq{"created_by_user_id": *userID})
	}
	if filters.Type != nil {
		countQuery = countQuery.Where(sq.Eq{"link_type": *filters.Type})
	}
	if filters.Status != nil {
		if *filters.Status == "ATIVO" {
			countQuery = countQuery.Where(sq.Eq{"is_active": true})
		}
	}
	if filters.Search != nil && *filters.Search != "" {
		search := "%" + *filters.Search + "%"
		countQuery = countQuery.Where(sq.Or{
			sq.ILike{"title": search},
			sq.ILike{"slug_token": search},
		})
	}

	countSQL, countArgs, _ := countQuery.ToSql()
	var total int
	if err := r.db.QueryRowContext(ctx, countSQL, countArgs...).Scan(&total); err != nil {
		return nil, 0, errors.DatabaseError(err)
	}

	// Pagination
	offset := (filters.Page - 1) * filters.Limit
	query = query.OrderBy("created_at DESC").Limit(uint64(filters.Limit)).Offset(uint64(offset))

	sql, args, err := query.ToSql()
	if err != nil {
		return nil, 0, errors.DatabaseError(err)
	}

	rows, err := r.db.QueryContext(ctx, sql, args...)
	if err != nil {
		return nil, 0, errors.DatabaseError(err)
	}
	defer rows.Close()

	links, err := r.scanLinks(rows)
	if err != nil {
		return nil, 0, err
	}

	return links, total, nil
}

func (r *salesLinkRepository) Update(ctx context.Context, link *entity.SalesLink) error {
	query := `
		UPDATE sales_links
		SET title = $1, custom_message = $2, display_price = $3,
		    show_price = $4, expires_at = $5, is_active = $6,
		    updated_at = CURRENT_TIMESTAMP
		WHERE id = $7
		RETURNING updated_at
	`

	err := r.db.QueryRowContext(ctx, query,
		link.Title, link.CustomMessage, link.DisplayPrice,
		link.ShowPrice, link.ExpiresAt, link.IsActive, link.ID,
	).Scan(&link.UpdatedAt)

	if err == sql.ErrNoRows {
		return errors.NewNotFoundError("Link de venda")
	}
	if err != nil {
		return errors.DatabaseError(err)
	}

	return nil
}

func (r *salesLinkRepository) SoftDelete(ctx context.Context, id string) error {
	query := `
		UPDATE sales_links
		SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
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
		return errors.NewNotFoundError("Link de venda")
	}

	return nil
}

func (r *salesLinkRepository) ExistsBySlug(ctx context.Context, slug string) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM sales_links WHERE slug_token = $1)`

	var exists bool
	err := r.db.QueryRowContext(ctx, query, slug).Scan(&exists)
	if err != nil {
		return false, errors.DatabaseError(err)
	}

	return exists, nil
}

func (r *salesLinkRepository) IncrementViews(ctx context.Context, id string) error {
	query := `
		UPDATE sales_links
		SET views_count = views_count + 1
		WHERE id = $1
	`

	_, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return errors.DatabaseError(err)
	}

	return nil
}

func (r *salesLinkRepository) CountActive(ctx context.Context, userID string) (int, error) {
	query := `
		SELECT COUNT(*) 
		FROM sales_links 
		WHERE created_by_user_id = $1 
		  AND is_active = TRUE
		  AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
	`

	var count int
	err := r.db.QueryRowContext(ctx, query, userID).Scan(&count)
	if err != nil {
		return 0, errors.DatabaseError(err)
	}

	return count, nil
}

func (r *salesLinkRepository) scanLinks(rows *sql.Rows) ([]entity.SalesLink, error) {
	links := []entity.SalesLink{}
	for rows.Next() {
		var l entity.SalesLink
		if err := rows.Scan(
			&l.ID, &l.CreatedByUserID, &l.IndustryID, &l.BatchID, &l.ProductID,
			&l.LinkType, &l.SlugToken, &l.Title, &l.CustomMessage,
			&l.DisplayPrice, &l.ShowPrice, &l.ViewsCount, &l.ExpiresAt,
			&l.IsActive, &l.CreatedAt, &l.UpdatedAt,
		); err != nil {
			return nil, errors.DatabaseError(err)
		}
		links = append(links, l)
	}
	return links, nil
}