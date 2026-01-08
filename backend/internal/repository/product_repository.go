package repository

import (
	"context"
	"database/sql"
	"fmt"

	sq "github.com/Masterminds/squirrel"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
	"github.com/thiagomes07/CAVA/backend/internal/domain/errors"
)

type productRepository struct {
	db *DB
}

func NewProductRepository(db *DB) *productRepository {
	return &productRepository{db: db}
}

func (r *productRepository) Create(ctx context.Context, product *entity.Product) error {
	query := `
		INSERT INTO products (id, industry_id, name, sku_code, description, 
		                      material_type, finish_type, is_public_catalog)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING created_at, updated_at
	`

	err := r.db.QueryRowContext(ctx, query,
		product.ID, product.IndustryID, product.Name, product.SKU,
		product.Description, product.Material, product.Finish, product.IsPublic,
	).Scan(&product.CreatedAt, &product.UpdatedAt)

	if err != nil {
		return errors.DatabaseError(err)
	}

	return nil
}

func (r *productRepository) FindByID(ctx context.Context, id string) (*entity.Product, error) {
	query := `
		SELECT id, industry_id, name, sku_code, description, material_type, 
		       finish_type, is_public_catalog, created_at, updated_at
		FROM products
		WHERE id = $1 AND deleted_at IS NULL
	`

	product := &entity.Product{IsActive: true}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&product.ID, &product.IndustryID, &product.Name, &product.SKU,
		&product.Description, &product.Material, &product.Finish,
		&product.IsPublic, &product.CreatedAt, &product.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, errors.NewNotFoundError("Produto")
	}
	if err != nil {
		return nil, errors.DatabaseError(err)
	}

	return product, nil
}

func (r *productRepository) FindByIndustryID(ctx context.Context, industryID string, filters entity.ProductFilters) ([]entity.Product, int, error) {
	psql := sq.StatementBuilder.PlaceholderFormat(sq.Dollar)

	// Query principal
	query := psql.Select(
		"p.id", "p.industry_id", "p.name", "p.sku_code", "p.description",
		"p.material_type", "p.finish_type", "p.is_public_catalog",
		"p.created_at", "p.updated_at",
		"COALESCE(COUNT(b.id), 0) as batch_count",
	).From("products p").
		LeftJoin("batches b ON p.id = b.product_id AND b.is_active = TRUE").
		Where(sq.Eq{"p.industry_id": industryID}).
		GroupBy("p.id")

	// Filtro de ativo/inativo
	if !filters.IncludeInactive {
		query = query.Where("p.deleted_at IS NULL")
	}

	// Filtro de material
	if filters.Material != nil {
		query = query.Where(sq.Eq{"p.material_type": *filters.Material})
	}

	// Filtro de busca
	if filters.Search != nil && *filters.Search != "" {
		search := "%" + *filters.Search + "%"
		query = query.Where("p.name ILIKE ?", search)
	}

	// Contar total
	countQuery := psql.Select("COUNT(DISTINCT p.id)").
		From("products p").
		Where(sq.Eq{"p.industry_id": industryID})

	if !filters.IncludeInactive {
		countQuery = countQuery.Where("p.deleted_at IS NULL")
	}
	if filters.Material != nil {
		countQuery = countQuery.Where(sq.Eq{"p.material_type": *filters.Material})
	}
	if filters.Search != nil && *filters.Search != "" {
		search := "%" + *filters.Search + "%"
		countQuery = countQuery.Where("p.name ILIKE ?", search)
	}

	countSQL, countArgs, _ := countQuery.ToSql()
	var total int
	if err := r.db.QueryRowContext(ctx, countSQL, countArgs...).Scan(&total); err != nil {
		return nil, 0, errors.DatabaseError(err)
	}

	// Paginação
	offset := (filters.Page - 1) * filters.Limit
	query = query.OrderBy("p.created_at DESC").Limit(uint64(filters.Limit)).Offset(uint64(offset))

	sql, args, err := query.ToSql()
	if err != nil {
		return nil, 0, errors.DatabaseError(err)
	}

	rows, err := r.db.QueryContext(ctx, sql, args...)
	if err != nil {
		return nil, 0, errors.DatabaseError(err)
	}
	defer rows.Close()

	products := []entity.Product{}
	for rows.Next() {
		var p entity.Product
		var batchCount int
		if err := rows.Scan(
			&p.ID, &p.IndustryID, &p.Name, &p.SKU, &p.Description,
			&p.Material, &p.Finish, &p.IsPublic,
			&p.CreatedAt, &p.UpdatedAt, &batchCount,
		); err != nil {
			return nil, 0, errors.DatabaseError(err)
		}
		p.BatchCount = &batchCount
		p.IsActive = true
		products = append(products, p)
	}

	return products, total, nil
}

func (r *productRepository) Update(ctx context.Context, product *entity.Product) error {
	query := `
		UPDATE products
		SET name = $1, sku_code = $2, description = $3, 
		    material_type = $4, finish_type = $5, is_public_catalog = $6,
		    updated_at = CURRENT_TIMESTAMP
		WHERE id = $7 AND deleted_at IS NULL
		RETURNING updated_at
	`

	err := r.db.QueryRowContext(ctx, query,
		product.Name, product.SKU, product.Description,
		product.Material, product.Finish, product.IsPublic, product.ID,
	).Scan(&product.UpdatedAt)

	if err == sql.ErrNoRows {
		return errors.NewNotFoundError("Produto")
	}
	if err != nil {
		return errors.DatabaseError(err)
	}

	return nil
}

func (r *productRepository) SoftDelete(ctx context.Context, id string) error {
	query := `
		UPDATE products
		SET deleted_at = CURRENT_TIMESTAMP
		WHERE id = $1 AND deleted_at IS NULL
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
		return errors.NewNotFoundError("Produto")
	}

	return nil
}

func (r *productRepository) CountBatchesByProductID(ctx context.Context, productID string) (int, error) {
	query := `
		SELECT COUNT(*) 
		FROM batches 
		WHERE product_id = $1 AND is_active = TRUE
	`

	var count int
	err := r.db.QueryRowContext(ctx, query, productID).Scan(&count)
	if err != nil {
		return 0, errors.DatabaseError(err)
	}

	return count, nil
}

func (r *productRepository) ExistsBySKU(ctx context.Context, industryID, sku string) (bool, error) {
	query := `
		SELECT EXISTS(
			SELECT 1 FROM products 
			WHERE industry_id = $1 AND sku_code = $2 AND deleted_at IS NULL
		)
	`

	var exists bool
	err := r.db.QueryRowContext(ctx, query, industryID, sku).Scan(&exists)
	if err != nil {
		return false, errors.DatabaseError(err)
	}

	return exists, nil
}