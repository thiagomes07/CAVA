package repository

import (
	"context"
	"database/sql"
	"time"

	sq "github.com/Masterminds/squirrel"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
	"github.com/thiagomes07/CAVA/backend/internal/domain/errors"
)

type salesHistoryRepository struct {
	db *DB
}

func NewSalesHistoryRepository(db *DB) *salesHistoryRepository {
	return &salesHistoryRepository{db: db}
}

func (r *salesHistoryRepository) Create(ctx context.Context, tx *sql.Tx, sale *entity.Sale) error {
	query := `
		INSERT INTO sales_history (
			id, batch_id, sold_by_user_id, industry_id, cliente_id,
			customer_name, customer_contact, quantity_slabs_sold, total_area_sold,
			price_per_unit, price_unit, sale_price, broker_commission,
			net_industry_value, invoice_url, notes, sold_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
		RETURNING created_at
	`

	err := tx.QueryRowContext(ctx, query,
		sale.ID, sale.BatchID, sale.SoldByUserID, sale.IndustryID, sale.ClienteID,
		sale.CustomerName, sale.CustomerContact, sale.QuantitySlabsSold, sale.TotalAreaSold,
		sale.PricePerUnit, sale.PriceUnit, sale.SalePrice,
		sale.BrokerCommission, sale.NetIndustryValue, sale.InvoiceURL,
		sale.Notes, sale.SaleDate,
	).Scan(&sale.CreatedAt)

	if err != nil {
		return errors.DatabaseError(err)
	}

	return nil
}

func (r *salesHistoryRepository) FindByID(ctx context.Context, id string) (*entity.Sale, error) {
	query := `
		SELECT id, batch_id, sold_by_user_id, industry_id, cliente_id,
		       customer_name, customer_contact, quantity_slabs_sold, total_area_sold,
		       price_per_unit, price_unit, sale_price, broker_commission,
		       net_industry_value, invoice_url, notes, sold_at, created_at
		FROM sales_history
		WHERE id = $1
	`

	sale := &entity.Sale{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&sale.ID, &sale.BatchID, &sale.SoldByUserID, &sale.IndustryID, &sale.ClienteID,
		&sale.CustomerName, &sale.CustomerContact, &sale.QuantitySlabsSold, &sale.TotalAreaSold,
		&sale.PricePerUnit, &sale.PriceUnit, &sale.SalePrice,
		&sale.BrokerCommission, &sale.NetIndustryValue, &sale.InvoiceURL,
		&sale.Notes, &sale.SaleDate, &sale.CreatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, errors.NewNotFoundError("Venda")
	}
	if err != nil {
		return nil, errors.DatabaseError(err)
	}

	return sale, nil
}

func (r *salesHistoryRepository) FindBySellerID(ctx context.Context, sellerID string, filters entity.SaleFilters) ([]entity.Sale, int, error) {
	return r.listWithFilters(ctx, &sellerID, nil, filters)
}

func (r *salesHistoryRepository) FindByIndustryID(ctx context.Context, industryID string, filters entity.SaleFilters) ([]entity.Sale, int, error) {
	return r.listWithFilters(ctx, nil, &industryID, filters)
}

func (r *salesHistoryRepository) FindByBrokerID(ctx context.Context, brokerID string, limit int) ([]entity.Sale, error) {
	query := `
		SELECT id, batch_id, sold_by_user_id, industry_id, cliente_id,
		       customer_name, customer_contact, quantity_slabs_sold, total_area_sold,
		       price_per_unit, price_unit, sale_price, broker_commission,
		       net_industry_value, invoice_url, notes, sold_at, created_at
		FROM sales_history
		WHERE sold_by_user_id = $1
		ORDER BY sold_at DESC
		LIMIT $2
	`

	rows, err := r.db.QueryContext(ctx, query, brokerID, limit)
	if err != nil {
		return nil, errors.DatabaseError(err)
	}
	defer rows.Close()

	return r.scanSales(rows)
}

func (r *salesHistoryRepository) FindByPeriod(ctx context.Context, industryID string, startDate, endDate time.Time) ([]entity.Sale, error) {
	query := `
		SELECT id, batch_id, sold_by_user_id, industry_id, cliente_id,
		       customer_name, customer_contact, quantity_slabs_sold, total_area_sold,
		       price_per_unit, price_unit, sale_price, broker_commission,
		       net_industry_value, invoice_url, notes, sold_at, created_at
		FROM sales_history
		WHERE industry_id = $1 
		  AND sold_at >= $2 
		  AND sold_at <= $3
		ORDER BY sold_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query, industryID, startDate, endDate)
	if err != nil {
		return nil, errors.DatabaseError(err)
	}
	defer rows.Close()

	return r.scanSales(rows)
}

func (r *salesHistoryRepository) List(ctx context.Context, filters entity.SaleFilters) ([]entity.Sale, int, error) {
	return r.listWithFilters(ctx, nil, nil, filters)
}

func (r *salesHistoryRepository) listWithFilters(ctx context.Context, sellerID, industryID *string, filters entity.SaleFilters) ([]entity.Sale, int, error) {
	psql := sq.StatementBuilder.PlaceholderFormat(sq.Dollar)

	query := psql.Select(
		"id", "batch_id", "sold_by_user_id", "industry_id", "cliente_id",
		"customer_name", "customer_contact", "quantity_slabs_sold", "total_area_sold",
		"price_per_unit", "price_unit", "sale_price", "broker_commission",
		"net_industry_value", "invoice_url", "notes", "sold_at", "created_at",
	).From("sales_history")

	if sellerID != nil {
		query = query.Where(sq.Eq{"sold_by_user_id": *sellerID})
	}

	if industryID != nil {
		query = query.Where(sq.Eq{"industry_id": *industryID})
	}

	if filters.SellerID != nil {
		query = query.Where(sq.Eq{"sold_by_user_id": *filters.SellerID})
	}

	if filters.StartDate != nil {
		startDate, err := time.Parse(time.RFC3339, *filters.StartDate)
		if err == nil {
			query = query.Where(sq.GtOrEq{"sold_at": startDate})
		}
	}

	if filters.EndDate != nil {
		endDate, err := time.Parse(time.RFC3339, *filters.EndDate)
		if err == nil {
			query = query.Where(sq.LtOrEq{"sold_at": endDate})
		}
	}

	// Count
	countQuery := psql.Select("COUNT(*)").From("sales_history")
	if sellerID != nil {
		countQuery = countQuery.Where(sq.Eq{"sold_by_user_id": *sellerID})
	}
	if industryID != nil {
		countQuery = countQuery.Where(sq.Eq{"industry_id": *industryID})
	}
	if filters.SellerID != nil {
		countQuery = countQuery.Where(sq.Eq{"sold_by_user_id": *filters.SellerID})
	}
	if filters.StartDate != nil {
		startDate, err := time.Parse(time.RFC3339, *filters.StartDate)
		if err == nil {
			countQuery = countQuery.Where(sq.GtOrEq{"sold_at": startDate})
		}
	}
	if filters.EndDate != nil {
		endDate, err := time.Parse(time.RFC3339, *filters.EndDate)
		if err == nil {
			countQuery = countQuery.Where(sq.LtOrEq{"sold_at": endDate})
		}
	}

	countSQL, countArgs, _ := countQuery.ToSql()
	var total int
	if err := r.db.QueryRowContext(ctx, countSQL, countArgs...).Scan(&total); err != nil {
		return nil, 0, errors.DatabaseError(err)
	}

	// Pagination
	offset := (filters.Page - 1) * filters.Limit
	query = query.OrderBy("sold_at DESC").Limit(uint64(filters.Limit)).Offset(uint64(offset))

	sql, args, err := query.ToSql()
	if err != nil {
		return nil, 0, errors.DatabaseError(err)
	}

	rows, err := r.db.QueryContext(ctx, sql, args...)
	if err != nil {
		return nil, 0, errors.DatabaseError(err)
	}
	defer rows.Close()

	sales, err := r.scanSales(rows)
	if err != nil {
		return nil, 0, err
	}

	return sales, total, nil
}

func (r *salesHistoryRepository) CalculateSummary(ctx context.Context, filters entity.SaleSummaryFilters) (*entity.SaleSummary, error) {
	query := `
		SELECT 
			COALESCE(SUM(sale_price), 0) as total_sales,
			COALESCE(SUM(broker_commission), 0) as total_commissions,
			COALESCE(AVG(sale_price), 0) as average_ticket
		FROM sales_history
		WHERE 1=1
	`
	args := []interface{}{}
	argCount := 1

	if filters.StartDate != nil {
		startDate, err := time.Parse(time.RFC3339, *filters.StartDate)
		if err == nil {
			query += ` AND sold_at >= $` + string(rune('0'+argCount))
			args = append(args, startDate)
			argCount++
		}
	}

	if filters.EndDate != nil {
		endDate, err := time.Parse(time.RFC3339, *filters.EndDate)
		if err == nil {
			query += ` AND sold_at <= $` + string(rune('0'+argCount))
			args = append(args, endDate)
			argCount++
		}
	}

	summary := &entity.SaleSummary{}
	err := r.db.QueryRowContext(ctx, query, args...).Scan(
		&summary.TotalSales, &summary.TotalCommissions, &summary.AverageTicket,
	)

	if err != nil {
		return nil, errors.DatabaseError(err)
	}

	return summary, nil
}

func (r *salesHistoryRepository) SumMonthlySales(ctx context.Context, entityID string, month time.Time) (float64, error) {
	query := `
		SELECT COALESCE(SUM(sale_price), 0)
		FROM sales_history
		WHERE (industry_id = $1 OR sold_by_user_id = $1)
		  AND sold_at >= $2
		  AND sold_at < $3
	`

	startOfMonth := time.Date(month.Year(), month.Month(), 1, 0, 0, 0, 0, time.UTC)
	endOfMonth := startOfMonth.AddDate(0, 1, 0)

	var total float64
	err := r.db.QueryRowContext(ctx, query, entityID, startOfMonth, endOfMonth).Scan(&total)
	if err != nil {
		return 0, errors.DatabaseError(err)
	}

	return total, nil
}

func (r *salesHistoryRepository) SumMonthlyCommission(ctx context.Context, brokerID string, month time.Time) (float64, error) {
	query := `
		SELECT COALESCE(SUM(broker_commission), 0)
		FROM sales_history
		WHERE sold_by_user_id = $1
		  AND sold_at >= $2
		  AND sold_at < $3
	`

	startOfMonth := time.Date(month.Year(), month.Month(), 1, 0, 0, 0, 0, time.UTC)
	endOfMonth := startOfMonth.AddDate(0, 1, 0)

	var total float64
	err := r.db.QueryRowContext(ctx, query, brokerID, startOfMonth, endOfMonth).Scan(&total)
	if err != nil {
		return 0, errors.DatabaseError(err)
	}

	return total, nil
}

func (r *salesHistoryRepository) scanSales(rows *sql.Rows) ([]entity.Sale, error) {
	sales := []entity.Sale{}
	for rows.Next() {
		var s entity.Sale
		if err := rows.Scan(
			&s.ID, &s.BatchID, &s.SoldByUserID, &s.IndustryID, &s.ClienteID,
			&s.CustomerName, &s.CustomerContact, &s.QuantitySlabsSold, &s.TotalAreaSold,
			&s.PricePerUnit, &s.PriceUnit, &s.SalePrice,
			&s.BrokerCommission, &s.NetIndustryValue, &s.InvoiceURL,
			&s.Notes, &s.SaleDate, &s.CreatedAt,
		); err != nil {
			return nil, errors.DatabaseError(err)
		}
		sales = append(sales, s)
	}
	return sales, nil
}
