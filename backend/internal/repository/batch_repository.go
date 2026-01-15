package repository

import (
	"context"
	"database/sql"

	sq "github.com/Masterminds/squirrel"
	"github.com/lib/pq"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
	"github.com/thiagomes07/CAVA/backend/internal/domain/errors"
)

type batchRepository struct {
	db *DB
}

func NewBatchRepository(db *DB) *batchRepository {
	return &batchRepository{db: db}
}

func (r *batchRepository) Create(ctx context.Context, batch *entity.Batch) error {
	query := `
		INSERT INTO batches (
			id, product_id, industry_id, batch_code, height, width, thickness,
			quantity_slabs, available_slabs, industry_price, price_unit, origin_quarry, entry_date, status
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
		RETURNING created_at, updated_at, net_area
	`

	err := r.db.QueryRowContext(ctx, query,
		batch.ID, batch.ProductID, batch.IndustryID, batch.BatchCode,
		batch.Height, batch.Width, batch.Thickness, batch.QuantitySlabs,
		batch.AvailableSlabs, batch.IndustryPrice, batch.PriceUnit,
		batch.OriginQuarry, batch.EntryDate, batch.Status,
	).Scan(&batch.CreatedAt, &batch.UpdatedAt, &batch.TotalArea)

	if err != nil {
		if pqErr, ok := err.(*pq.Error); ok {
			if pqErr.Code == "23505" { // unique_violation
				return errors.BatchCodeExistsError(batch.BatchCode)
			}
		}
		return errors.DatabaseError(err)
	}

	return nil
}

func (r *batchRepository) FindByID(ctx context.Context, id string) (*entity.Batch, error) {
	query := `
		SELECT id, product_id, industry_id, batch_code, height, width, thickness,
		       quantity_slabs, available_slabs, net_area, industry_price, price_unit, origin_quarry, 
		       entry_date, status, is_active, created_at, updated_at
		FROM batches
		WHERE id = $1
	`

	batch := &entity.Batch{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&batch.ID, &batch.ProductID, &batch.IndustryID, &batch.BatchCode,
		&batch.Height, &batch.Width, &batch.Thickness, &batch.QuantitySlabs,
		&batch.AvailableSlabs, &batch.TotalArea, &batch.IndustryPrice, &batch.PriceUnit,
		&batch.OriginQuarry, &batch.EntryDate, &batch.Status, &batch.IsActive,
		&batch.CreatedAt, &batch.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, errors.NewNotFoundError("Lote")
	}
	if err != nil {
		return nil, errors.DatabaseError(err)
	}

	return batch, nil
}

func (r *batchRepository) FindByIDForUpdate(ctx context.Context, tx *sql.Tx, id string) (*entity.Batch, error) {
	query := `
		SELECT id, product_id, industry_id, batch_code, height, width, thickness,
		       quantity_slabs, available_slabs, net_area, industry_price, price_unit, origin_quarry, 
		       entry_date, status, is_active, created_at, updated_at
		FROM batches
		WHERE id = $1
		FOR UPDATE
	`

	batch := &entity.Batch{}
	err := tx.QueryRowContext(ctx, query, id).Scan(
		&batch.ID, &batch.ProductID, &batch.IndustryID, &batch.BatchCode,
		&batch.Height, &batch.Width, &batch.Thickness, &batch.QuantitySlabs,
		&batch.AvailableSlabs, &batch.TotalArea, &batch.IndustryPrice, &batch.PriceUnit,
		&batch.OriginQuarry, &batch.EntryDate, &batch.Status, &batch.IsActive,
		&batch.CreatedAt, &batch.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, errors.NewNotFoundError("Lote")
	}
	if err != nil {
		return nil, errors.DatabaseError(err)
	}

	return batch, nil
}

func (r *batchRepository) FindByProductID(ctx context.Context, productID string) ([]entity.Batch, error) {
	query := `
		SELECT id, product_id, industry_id, batch_code, height, width, thickness,
		       quantity_slabs, available_slabs, net_area, industry_price, price_unit, origin_quarry, 
		       entry_date, status, is_active, created_at, updated_at
		FROM batches
		WHERE product_id = $1 AND is_active = TRUE
		ORDER BY entry_date DESC
	`

	rows, err := r.db.QueryContext(ctx, query, productID)
	if err != nil {
		return nil, errors.DatabaseError(err)
	}
	defer rows.Close()

	return r.scanBatches(rows)
}

func (r *batchRepository) FindByStatus(ctx context.Context, industryID string, status entity.BatchStatus) ([]entity.Batch, error) {
	query := `
		SELECT id, product_id, industry_id, batch_code, height, width, thickness,
		       quantity_slabs, available_slabs, net_area, industry_price, price_unit, origin_quarry, 
		       entry_date, status, is_active, created_at, updated_at
		FROM batches
		WHERE industry_id = $1 AND status = $2 AND is_active = TRUE
		ORDER BY entry_date DESC
	`

	rows, err := r.db.QueryContext(ctx, query, industryID, status)
	if err != nil {
		return nil, errors.DatabaseError(err)
	}
	defer rows.Close()

	return r.scanBatches(rows)
}

func (r *batchRepository) FindAvailable(ctx context.Context, industryID string) ([]entity.Batch, error) {
	query := `
		SELECT id, product_id, industry_id, batch_code, height, width, thickness,
		       quantity_slabs, available_slabs, net_area, industry_price, price_unit, origin_quarry, 
		       entry_date, status, is_active, created_at, updated_at
		FROM batches
		WHERE industry_id = $1 AND status = 'DISPONIVEL' AND is_active = TRUE AND available_slabs > 0
		ORDER BY entry_date DESC
	`

	rows, err := r.db.QueryContext(ctx, query, industryID)
	if err != nil {
		return nil, errors.DatabaseError(err)
	}
	defer rows.Close()

	return r.scanBatches(rows)
}

func (r *batchRepository) FindByCode(ctx context.Context, industryID, code string) ([]entity.Batch, error) {
	query := `
		SELECT id, product_id, industry_id, batch_code, height, width, thickness,
		       quantity_slabs, available_slabs, net_area, industry_price, price_unit, origin_quarry, 
		       entry_date, status, is_active, created_at, updated_at
		FROM batches
		WHERE industry_id = $1 AND batch_code ILIKE $2 AND is_active = TRUE
		ORDER BY batch_code
	`

	search := "%" + code + "%"
	rows, err := r.db.QueryContext(ctx, query, industryID, search)
	if err != nil {
		return nil, errors.DatabaseError(err)
	}
	defer rows.Close()

	return r.scanBatches(rows)
}

func (r *batchRepository) List(ctx context.Context, industryID string, filters entity.BatchFilters) ([]entity.Batch, int, error) {
	psql := sq.StatementBuilder.PlaceholderFormat(sq.Dollar)

	query := psql.Select(
		"id", "product_id", "industry_id", "batch_code", "height", "width",
		"thickness", "quantity_slabs", "available_slabs", "net_area", "industry_price", "price_unit",
		"origin_quarry", "entry_date", "status", "is_active", "created_at", "updated_at",
	).From("batches").
		Where(sq.Eq{"industry_id": industryID, "is_active": true})

	// Filtros
	if filters.ProductID != nil {
		query = query.Where(sq.Eq{"product_id": *filters.ProductID})
	}
	if filters.Status != nil {
		query = query.Where(sq.Eq{"status": *filters.Status})
	}
	if filters.Code != nil && *filters.Code != "" {
		query = query.Where("batch_code ILIKE ?", "%"+*filters.Code+"%")
	}
	if filters.OnlyWithAvailable {
		query = query.Where(sq.Gt{"available_slabs": 0})
	}
	if filters.LowStock {
		query = query.Where(sq.And{sq.Gt{"available_slabs": 0}, sq.LtOrEq{"available_slabs": 3}})
	}
	if filters.NoStock {
		query = query.Where(sq.Eq{"available_slabs": 0})
	}

	// Contar total
	countQuery := psql.Select("COUNT(*)").From("batches").
		Where(sq.Eq{"industry_id": industryID, "is_active": true})

	if filters.ProductID != nil {
		countQuery = countQuery.Where(sq.Eq{"product_id": *filters.ProductID})
	}
	if filters.Status != nil {
		countQuery = countQuery.Where(sq.Eq{"status": *filters.Status})
	}
	if filters.Code != nil && *filters.Code != "" {
		countQuery = countQuery.Where("batch_code ILIKE ?", "%"+*filters.Code+"%")
	}
	if filters.OnlyWithAvailable {
		countQuery = countQuery.Where(sq.Gt{"available_slabs": 0})
	}
	if filters.LowStock {
		countQuery = countQuery.Where(sq.And{sq.Gt{"available_slabs": 0}, sq.LtOrEq{"available_slabs": 3}})
	}
	if filters.NoStock {
		countQuery = countQuery.Where(sq.Eq{"available_slabs": 0})
	}

	countSQL, countArgs, _ := countQuery.ToSql()
	var total int
	if err := r.db.QueryRowContext(ctx, countSQL, countArgs...).Scan(&total); err != nil {
		return nil, 0, errors.DatabaseError(err)
	}

	// Paginação e ordenação
	offset := (filters.Page - 1) * filters.Limit

	// Determinar ordenação
	orderColumn := "entry_date"
	orderDir := "DESC"

	// Mapear campos de ordenação válidos
	validSortColumns := map[string]string{
		"batchCode":      "batch_code",
		"availableSlabs": "available_slabs",
		"totalArea":      "net_area",
		"industryPrice":  "industry_price",
		"entryDate":      "entry_date",
	}

	if filters.SortBy != "" {
		if col, ok := validSortColumns[filters.SortBy]; ok {
			orderColumn = col
		}
	}

	if filters.SortDir == "asc" {
		orderDir = "ASC"
	} else if filters.SortDir == "desc" {
		orderDir = "DESC"
	}

	query = query.OrderBy(orderColumn + " " + orderDir).Limit(uint64(filters.Limit)).Offset(uint64(offset))

	sql, args, err := query.ToSql()
	if err != nil {
		return nil, 0, errors.DatabaseError(err)
	}

	rows, err := r.db.QueryContext(ctx, sql, args...)
	if err != nil {
		return nil, 0, errors.DatabaseError(err)
	}
	defer rows.Close()

	batches, err := r.scanBatches(rows)
	if err != nil {
		return nil, 0, err
	}

	return batches, total, nil
}

func (r *batchRepository) Update(ctx context.Context, batch *entity.Batch) error {
	query := `
		UPDATE batches
		SET batch_code = $1, height = $2, width = $3, thickness = $4,
		    quantity_slabs = $5, available_slabs = $6, industry_price = $7, price_unit = $8,
		    origin_quarry = $9, updated_at = CURRENT_TIMESTAMP
		WHERE id = $10
		RETURNING updated_at, net_area
	`

	err := r.db.QueryRowContext(ctx, query,
		batch.BatchCode, batch.Height, batch.Width, batch.Thickness,
		batch.QuantitySlabs, batch.AvailableSlabs, batch.IndustryPrice, batch.PriceUnit,
		batch.OriginQuarry, batch.ID,
	).Scan(&batch.UpdatedAt, &batch.TotalArea)

	if err == sql.ErrNoRows {
		return errors.NewNotFoundError("Lote")
	}
	if err != nil {
		return errors.DatabaseError(err)
	}

	return nil
}

func (r *batchRepository) UpdateStatus(ctx context.Context, tx *sql.Tx, id string, status entity.BatchStatus) error {
	query := `
		UPDATE batches
		SET status = $1, updated_at = CURRENT_TIMESTAMP
		WHERE id = $2
	`

	var result sql.Result
	var err error

	if tx != nil {
		result, err = tx.ExecContext(ctx, query, status, id)
	} else {
		result, err = r.db.ExecContext(ctx, query, status, id)
	}

	if err != nil {
		return errors.DatabaseError(err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return errors.DatabaseError(err)
	}

	if rows == 0 {
		return errors.NewNotFoundError("Lote")
	}

	return nil
}

func (r *batchRepository) UpdateAvailableSlabs(ctx context.Context, tx *sql.Tx, id string, availableSlabs int) error {
	query := `
		UPDATE batches
		SET available_slabs = $1, updated_at = CURRENT_TIMESTAMP
		WHERE id = $2
	`

	var result sql.Result
	var err error

	if tx != nil {
		result, err = tx.ExecContext(ctx, query, availableSlabs, id)
	} else {
		result, err = r.db.ExecContext(ctx, query, availableSlabs, id)
	}

	if err != nil {
		return errors.DatabaseError(err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return errors.DatabaseError(err)
	}

	if rows == 0 {
		return errors.NewNotFoundError("Lote")
	}

	return nil
}

func (r *batchRepository) DecrementAvailableSlabs(ctx context.Context, tx *sql.Tx, id string, quantity int) error {
	query := `
		UPDATE batches
		SET available_slabs = available_slabs - $1, updated_at = CURRENT_TIMESTAMP
		WHERE id = $2 AND available_slabs >= $1
	`

	var result sql.Result
	var err error

	if tx != nil {
		result, err = tx.ExecContext(ctx, query, quantity, id)
	} else {
		result, err = r.db.ExecContext(ctx, query, quantity, id)
	}

	if err != nil {
		return errors.DatabaseError(err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return errors.DatabaseError(err)
	}

	if rows == 0 {
		return errors.NewNotFoundError("Lote ou quantidade insuficiente de chapas")
	}

	return nil
}

func (r *batchRepository) IncrementAvailableSlabs(ctx context.Context, tx *sql.Tx, id string, quantity int) error {
	query := `
		UPDATE batches
		SET available_slabs = LEAST(available_slabs + $1, quantity_slabs), updated_at = CURRENT_TIMESTAMP
		WHERE id = $2
	`

	var result sql.Result
	var err error

	if tx != nil {
		result, err = tx.ExecContext(ctx, query, quantity, id)
	} else {
		result, err = r.db.ExecContext(ctx, query, quantity, id)
	}

	if err != nil {
		return errors.DatabaseError(err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return errors.DatabaseError(err)
	}

	if rows == 0 {
		return errors.NewNotFoundError("Lote")
	}

	return nil
}

func (r *batchRepository) CountByStatus(ctx context.Context, industryID string, status entity.BatchStatus) (int, error) {
	query := `
		SELECT COUNT(*) 
		FROM batches 
		WHERE industry_id = $1 AND status = $2 AND is_active = TRUE
	`

	var count int
	err := r.db.QueryRowContext(ctx, query, industryID, status).Scan(&count)
	if err != nil {
		return 0, errors.DatabaseError(err)
	}

	return count, nil
}

func (r *batchRepository) ExistsByCode(ctx context.Context, industryID, code string) (bool, error) {
	query := `
		SELECT EXISTS(
			SELECT 1 FROM batches 
			WHERE industry_id = $1 AND batch_code = $2
		)
	`

	var exists bool
	err := r.db.QueryRowContext(ctx, query, industryID, code).Scan(&exists)
	if err != nil {
		return false, errors.DatabaseError(err)
	}

	return exists, nil
}

func (r *batchRepository) scanBatches(rows *sql.Rows) ([]entity.Batch, error) {
	batches := []entity.Batch{}
	for rows.Next() {
		var b entity.Batch
		if err := rows.Scan(
			&b.ID, &b.ProductID, &b.IndustryID, &b.BatchCode,
			&b.Height, &b.Width, &b.Thickness, &b.QuantitySlabs,
			&b.AvailableSlabs, &b.TotalArea, &b.IndustryPrice, &b.PriceUnit,
			&b.OriginQuarry, &b.EntryDate, &b.Status, &b.IsActive,
			&b.CreatedAt, &b.UpdatedAt,
		); err != nil {
			return nil, errors.DatabaseError(err)
		}
		batches = append(batches, b)
	}
	return batches, nil
}
