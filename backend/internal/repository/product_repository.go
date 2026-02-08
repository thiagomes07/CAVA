package repository

import (
	"context"
	"database/sql"

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
		                      material_type, finish_type, base_price, price_unit, is_public_catalog)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING created_at, updated_at
	`

	// Default price unit to M2 if not set
	priceUnit := product.PriceUnit
	if priceUnit == "" {
		priceUnit = entity.PriceUnitM2
	}

	err := r.db.QueryRowContext(ctx, query,
		product.ID, product.IndustryID, product.Name, product.SKU,
		product.Description, product.Material, product.Finish,
		product.BasePrice, priceUnit, product.IsPublicCatalog,
	).Scan(&product.CreatedAt, &product.UpdatedAt)

	if err != nil {
		return errors.DatabaseError(err)
	}

	return nil
}

func (r *productRepository) FindByID(ctx context.Context, id string) (*entity.Product, error) {
	query := `
		SELECT id, industry_id, name, sku_code, description, material_type, 
		       finish_type, base_price, price_unit, is_public_catalog, created_at, updated_at
		FROM products
		WHERE id = $1 AND deleted_at IS NULL
	`

	product := &entity.Product{IsActive: true}
	var priceUnit sql.NullString
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&product.ID, &product.IndustryID, &product.Name, &product.SKU,
		&product.Description, &product.Material, &product.Finish,
		&product.BasePrice, &priceUnit, &product.IsPublicCatalog,
		&product.CreatedAt, &product.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, errors.NewNotFoundError("Produto")
	}
	if err != nil {
		return nil, errors.DatabaseError(err)
	}

	// Set price unit, default to M2
	if priceUnit.Valid {
		product.PriceUnit = entity.PriceUnit(priceUnit.String)
	} else {
		product.PriceUnit = entity.PriceUnitM2
	}

	return product, nil
}

func (r *productRepository) FindByIndustryID(ctx context.Context, industryID string, filters entity.ProductFilters) ([]entity.Product, int, error) {
	psql := sq.StatementBuilder.PlaceholderFormat(sq.Dollar)

	// Query principal com aggregate para disponibilidade
	query := psql.Select(
		"p.id", "p.industry_id", "p.name", "p.sku_code", "p.description",
		"p.material_type", "p.finish_type", "p.base_price", "p.price_unit", "p.is_public_catalog",
		"p.created_at", "p.updated_at",
		"COALESCE(COUNT(b.id), 0) as batch_count",
		"COALESCE(SUM(CASE WHEN b.available_slabs > 0 THEN 1 ELSE 0 END), 0) as available_batch_count",
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

	// Filtro de acabamento
	if filters.Finish != nil {
		query = query.Where(sq.Eq{"p.finish_type": *filters.Finish})
	}

	// Filtro apenas públicos (para portfolio)
	if filters.OnlyPublic {
		query = query.Where(sq.Eq{"p.is_public_catalog": true})
	}

	// Filtro de busca multi-campo (nome, SKU, material, descrição)
	if filters.Search != nil && *filters.Search != "" {
		search := "%" + *filters.Search + "%"
		query = query.Where(sq.Or{
			sq.Expr("p.name ILIKE ?", search),
			sq.Expr("p.sku_code ILIKE ?", search),
			sq.Expr("p.material_type ILIKE ?", search),
			sq.Expr("p.description ILIKE ?", search),
		})
	}

	// Contar total dos produtos filtrados (query parametrizada, segura contra SQL injection)
	countQueryDirect := psql.Select("COUNT(DISTINCT p.id)").
		From("products p").
		Where(sq.Eq{"p.industry_id": industryID})

	if !filters.IncludeInactive {
		countQueryDirect = countQueryDirect.Where("p.deleted_at IS NULL")
	}
	if filters.Material != nil {
		countQueryDirect = countQueryDirect.Where(sq.Eq{"p.material_type": *filters.Material})
	}
	if filters.Finish != nil {
		countQueryDirect = countQueryDirect.Where(sq.Eq{"p.finish_type": *filters.Finish})
	}
	if filters.OnlyPublic {
		countQueryDirect = countQueryDirect.Where(sq.Eq{"p.is_public_catalog": true})
	}
	if filters.Search != nil && *filters.Search != "" {
		search := "%" + *filters.Search + "%"
		countQueryDirect = countQueryDirect.Where(sq.Or{
			sq.Expr("p.name ILIKE ?", search),
			sq.Expr("p.sku_code ILIKE ?", search),
			sq.Expr("p.material_type ILIKE ?", search),
			sq.Expr("p.description ILIKE ?", search),
		})
	}

	countSQL, countArgs, _ := countQueryDirect.ToSql()
	var total int
	if err := r.db.QueryRowContext(ctx, countSQL, countArgs...).Scan(&total); err != nil {
		return nil, 0, errors.DatabaseError(err)
	}

	// Ordenação
	orderBy := "p.created_at DESC" // default
	if filters.SortBy != nil {
		order := "DESC"
		if filters.SortOrder != nil && *filters.SortOrder == "asc" {
			order = "ASC"
		}
		switch *filters.SortBy {
		case "name":
			orderBy = "p.name " + order
		case "created_at":
			orderBy = "p.created_at " + order
		case "batch_count":
			orderBy = "batch_count " + order
		case "availability":
			orderBy = "available_batch_count " + order + ", p.name ASC"
		}
	}
	query = query.OrderBy(orderBy)

	// Paginação
	offset := (filters.Page - 1) * filters.Limit
	query = query.Limit(uint64(filters.Limit)).Offset(uint64(offset))

	sqlStr, args, err := query.ToSql()
	if err != nil {
		return nil, 0, errors.DatabaseError(err)
	}

	rows, err := r.db.QueryContext(ctx, sqlStr, args...)
	if err != nil {
		return nil, 0, errors.DatabaseError(err)
	}
	defer rows.Close()

	products := []entity.Product{}
	for rows.Next() {
		var p entity.Product
		var batchCount int
		var availableBatchCount int
		var priceUnit sql.NullString
		if err := rows.Scan(
			&p.ID, &p.IndustryID, &p.Name, &p.SKU, &p.Description,
			&p.Material, &p.Finish, &p.BasePrice, &priceUnit, &p.IsPublicCatalog,
			&p.CreatedAt, &p.UpdatedAt, &batchCount, &availableBatchCount,
		); err != nil {
			return nil, 0, errors.DatabaseError(err)
		}
		p.BatchCount = &batchCount
		p.IsActive = true
		if priceUnit.Valid {
			p.PriceUnit = entity.PriceUnit(priceUnit.String)
		} else {
			p.PriceUnit = entity.PriceUnitM2
		}
		products = append(products, p)
	}

	// Filtro pós-query para HasAvailableBatches (precisa dos aggregates)
	if filters.HasAvailableBatches != nil {
		filtered := []entity.Product{}
		for _, p := range products {
			// This is a simplification - we'd need to add availableBatchCount to entity
			// For now, filter based on batchCount > 0
			if *filters.HasAvailableBatches && p.BatchCount != nil && *p.BatchCount > 0 {
				filtered = append(filtered, p)
			} else if !*filters.HasAvailableBatches {
				filtered = append(filtered, p)
			}
		}
		products = filtered
	}

	return products, total, nil
}

func (r *productRepository) Update(ctx context.Context, product *entity.Product) error {
	query := `
		UPDATE products
		SET name = $1, sku_code = $2, description = $3, 
		    material_type = $4, finish_type = $5, base_price = $6, price_unit = $7,
		    is_public_catalog = $8, updated_at = CURRENT_TIMESTAMP
		WHERE id = $9 AND deleted_at IS NULL
		RETURNING updated_at
	`

	// Default price unit to M2 if not set
	priceUnit := product.PriceUnit
	if priceUnit == "" {
		priceUnit = entity.PriceUnitM2
	}

	err := r.db.QueryRowContext(ctx, query,
		product.Name, product.SKU, product.Description,
		product.Material, product.Finish, product.BasePrice, priceUnit,
		product.IsPublicCatalog, product.ID,
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

func (r *productRepository) CountBlockingBatchesByProductID(ctx context.Context, productID string) (int, error) {
	query := `
		SELECT COUNT(*) 
		FROM batches 
		WHERE product_id = $1 
		  AND is_active = TRUE
		  AND status NOT IN ('VENDIDO', 'INATIVO')
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
