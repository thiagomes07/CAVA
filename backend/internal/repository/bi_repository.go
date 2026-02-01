package repository

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
	"github.com/thiagomes07/CAVA/backend/internal/domain/errors"
)

type biRepository struct {
	db *DB
}

func NewBIRepository(db *DB) *biRepository {
	return &biRepository{db: db}
}

// GetSalesMetrics retorna métricas de vendas para um período
func (r *biRepository) GetSalesMetrics(ctx context.Context, filters entity.BIFilters) (*entity.SalesMetrics, error) {
	query := `
		SELECT
			COALESCE(SUM(sale_price), 0) as total_revenue,
			COALESCE(SUM(broker_commission), 0) as total_commissions,
			COALESCE(SUM(net_industry_value), 0) as net_revenue,
			COUNT(*) as sales_count,
			COALESCE(AVG(sale_price), 0) as average_ticket,
			COALESCE(SUM(quantity_slabs_sold), 0) as total_slabs,
			COALESCE(SUM(total_area_sold), 0) as total_area
		FROM sales_history
		WHERE industry_id = $1
		  AND sold_at >= $2
		  AND sold_at <= $3
	`

	metrics := &entity.SalesMetrics{}
	err := r.db.QueryRowContext(ctx, query,
		filters.IndustryID, filters.StartDate, filters.EndDate,
	).Scan(
		&metrics.TotalRevenue,
		&metrics.TotalCommissions,
		&metrics.NetRevenue,
		&metrics.SalesCount,
		&metrics.AverageTicket,
		&metrics.TotalSlabs,
		&metrics.TotalArea,
	)

	if err != nil {
		return nil, errors.DatabaseError(err)
	}

	// Calcular taxa de comissão
	if metrics.TotalRevenue > 0 {
		metrics.CommissionRate = (metrics.TotalCommissions / metrics.TotalRevenue) * 100
	}

	return metrics, nil
}

// GetConversionMetrics retorna métricas do funil de conversão de reservas
func (r *biRepository) GetConversionMetrics(ctx context.Context, filters entity.BIFilters) (*entity.ConversionMetrics, error) {
	query := `
		SELECT
			COUNT(*) as total_reservations,
			COUNT(*) FILTER (WHERE status IN ('APROVADA', 'CONFIRMADA_VENDA', 'ATIVA')) as total_approved,
			COUNT(*) FILTER (WHERE status = 'REJEITADA') as total_rejected,
			COUNT(*) FILTER (WHERE status = 'CONFIRMADA_VENDA') as total_converted,
			COUNT(*) FILTER (WHERE status = 'EXPIRADA') as total_expired,
			COUNT(*) FILTER (WHERE status = 'CANCELADA') as total_cancelled,
			COALESCE(AVG(EXTRACT(EPOCH FROM (approved_at - created_at))/3600)
				FILTER (WHERE approved_at IS NOT NULL), 0) as avg_hours_to_approve
		FROM reservations
		WHERE industry_id = $1
		  AND created_at >= $2
		  AND created_at <= $3
	`

	metrics := &entity.ConversionMetrics{}
	err := r.db.QueryRowContext(ctx, query,
		filters.IndustryID, filters.StartDate, filters.EndDate,
	).Scan(
		&metrics.TotalReservations,
		&metrics.TotalApproved,
		&metrics.TotalRejected,
		&metrics.TotalConverted,
		&metrics.TotalExpired,
		&metrics.TotalCancelled,
		&metrics.AvgHoursToApprove,
	)

	if err != nil {
		return nil, errors.DatabaseError(err)
	}

	// Calcular taxas
	if metrics.TotalReservations > 0 {
		metrics.ApprovalRate = float64(metrics.TotalApproved) / float64(metrics.TotalReservations) * 100
		metrics.RejectionRate = float64(metrics.TotalRejected) / float64(metrics.TotalReservations) * 100
	}
	if metrics.TotalApproved > 0 {
		metrics.ConversionRate = float64(metrics.TotalConverted) / float64(metrics.TotalApproved) * 100
	}

	return metrics, nil
}

// GetInventoryMetrics retorna métricas de inventário
func (r *biRepository) GetInventoryMetrics(ctx context.Context, industryID string) (*entity.InventoryMetrics, error) {
	query := `
		SELECT
			COUNT(DISTINCT id) as total_batches,
			COALESCE(SUM(quantity_slabs), 0) as total_slabs,
			COALESCE(SUM(available_slabs), 0) as available_slabs,
			COALESCE(SUM(reserved_slabs), 0) as reserved_slabs,
			COALESCE(SUM(sold_slabs), 0) as sold_slabs,
			COALESCE(SUM(available_slabs * industry_price * (height * width / 10000)), 0) as inventory_value,
			COALESCE(AVG(EXTRACT(EPOCH FROM (NOW() - entry_date))/86400)::INTEGER, 0) as avg_days_in_stock,
			COUNT(*) FILTER (WHERE available_slabs <= 3 AND available_slabs > 0) as low_stock_count,
			COUNT(*) FILTER (WHERE EXTRACT(EPOCH FROM (NOW() - COALESCE(last_activity_at, entry_date)))/86400 > 90) as stale_batch_count
		FROM batches
		WHERE industry_id = $1
		  AND is_active = true
		  AND deleted_at IS NULL
	`

	metrics := &entity.InventoryMetrics{}
	err := r.db.QueryRowContext(ctx, query, industryID).Scan(
		&metrics.TotalBatches,
		&metrics.TotalSlabs,
		&metrics.AvailableSlabs,
		&metrics.ReservedSlabs,
		&metrics.SoldSlabs,
		&metrics.InventoryValue,
		&metrics.AvgDaysInStock,
		&metrics.LowStockCount,
		&metrics.StaleBatchCount,
	)

	if err != nil {
		return nil, errors.DatabaseError(err)
	}

	// Calcular taxa de ocupação
	if metrics.AvailableSlabs > 0 {
		metrics.OccupancyRate = float64(metrics.ReservedSlabs) / float64(metrics.AvailableSlabs+metrics.ReservedSlabs) * 100
	}

	return metrics, nil
}

// GetBrokerPerformance retorna ranking de performance dos brokers
func (r *biRepository) GetBrokerPerformance(ctx context.Context, filters entity.BIFilters) ([]entity.BrokerPerformance, error) {
	query := `
		WITH broker_sales AS (
			SELECT
				sh.sold_by_user_id as broker_id,
				COALESCE(u.name, sh.seller_name, 'Vendedor Externo') as broker_name,
				COUNT(*) as sales_count,
				COALESCE(SUM(sh.sale_price), 0) as total_revenue,
				COALESCE(SUM(sh.broker_commission), 0) as total_commission,
				COALESCE(AVG(sh.sale_price), 0) as avg_ticket,
				COALESCE(AVG(sh.days_to_close), 0) as avg_days_to_close
			FROM sales_history sh
			LEFT JOIN users u ON sh.sold_by_user_id = u.id
			WHERE sh.industry_id = $1
			  AND sh.sold_at >= $2
			  AND sh.sold_at <= $3
			GROUP BY sh.sold_by_user_id, u.name, sh.seller_name
		),
		broker_reservations AS (
			SELECT
				reserved_by_user_id as broker_id,
				COUNT(*) as total_reservations,
				COUNT(*) FILTER (WHERE status IN ('APROVADA', 'CONFIRMADA_VENDA', 'ATIVA')) as approved_reservations,
				COUNT(*) FILTER (WHERE status = 'CONFIRMADA_VENDA') as converted_reservations
			FROM reservations
			WHERE industry_id = $1
			  AND created_at >= $2
			  AND created_at <= $3
			GROUP BY reserved_by_user_id
		)
		SELECT
			bs.broker_id,
			bs.broker_name,
			bs.sales_count,
			bs.total_revenue,
			bs.total_commission,
			bs.avg_ticket,
			bs.avg_days_to_close,
			COALESCE(CASE WHEN br.total_reservations > 0
				THEN br.approved_reservations::float / br.total_reservations * 100
				ELSE 0 END, 0) as approval_rate,
			COALESCE(CASE WHEN br.approved_reservations > 0
				THEN br.converted_reservations::float / br.approved_reservations * 100
				ELSE 0 END, 0) as conversion_rate,
			ROW_NUMBER() OVER (ORDER BY bs.total_revenue DESC) as rank
		FROM broker_sales bs
		LEFT JOIN broker_reservations br ON bs.broker_id = br.broker_id
		ORDER BY bs.total_revenue DESC
		LIMIT $4
	`

	rows, err := r.db.QueryContext(ctx, query,
		filters.IndustryID, filters.StartDate, filters.EndDate, filters.Limit,
	)
	if err != nil {
		return nil, errors.DatabaseError(err)
	}
	defer rows.Close()

	var brokers []entity.BrokerPerformance
	for rows.Next() {
		var b entity.BrokerPerformance
		var brokerID sql.NullString
		err := rows.Scan(
			&brokerID,
			&b.BrokerName,
			&b.SalesCount,
			&b.TotalRevenue,
			&b.TotalCommission,
			&b.AverageTicket,
			&b.AvgDaysToClose,
			&b.ApprovalRate,
			&b.ConversionRate,
			&b.Rank,
		)
		if err != nil {
			return nil, errors.DatabaseError(err)
		}
		if brokerID.Valid {
			b.BrokerID = brokerID.String
		}
		brokers = append(brokers, b)
	}

	return brokers, nil
}

// GetSalesTrend retorna tendência de vendas ao longo do tempo
func (r *biRepository) GetSalesTrend(ctx context.Context, filters entity.BIFilters) ([]entity.TrendPoint, error) {
	var dateFormat, dateTrunc string
	switch filters.Granularity {
	case "week":
		dateFormat = "IYYY-IW"
		dateTrunc = "week"
	case "month":
		dateFormat = "YYYY-MM"
		dateTrunc = "month"
	default:
		dateFormat = "YYYY-MM-DD"
		dateTrunc = "day"
	}

	query := fmt.Sprintf(`
		SELECT
			TO_CHAR(DATE_TRUNC('%s', sold_at), '%s') as date,
			COALESCE(SUM(sale_price), 0) as value,
			COUNT(*) as count
		FROM sales_history
		WHERE industry_id = $1
		  AND sold_at >= $2
		  AND sold_at <= $3
		GROUP BY DATE_TRUNC('%s', sold_at)
		ORDER BY DATE_TRUNC('%s', sold_at)
	`, dateTrunc, dateFormat, dateTrunc, dateTrunc)

	rows, err := r.db.QueryContext(ctx, query,
		filters.IndustryID, filters.StartDate, filters.EndDate,
	)
	if err != nil {
		return nil, errors.DatabaseError(err)
	}
	defer rows.Close()

	var trends []entity.TrendPoint
	for rows.Next() {
		var t entity.TrendPoint
		if err := rows.Scan(&t.Date, &t.Value, &t.Count); err != nil {
			return nil, errors.DatabaseError(err)
		}
		trends = append(trends, t)
	}

	return trends, nil
}

// GetTopProducts retorna os produtos mais vendidos
func (r *biRepository) GetTopProducts(ctx context.Context, filters entity.BIFilters) ([]entity.ProductMetric, error) {
	query := `
		SELECT
			p.id as product_id,
			p.name as product_name,
			p.material_type,
			COUNT(*) as sales_count,
			COALESCE(SUM(sh.sale_price), 0) as revenue,
			COALESCE(SUM(sh.quantity_slabs_sold), 0) as slabs_sold,
			COALESCE(SUM(sh.total_area_sold), 0) as area_sold
		FROM sales_history sh
		JOIN batches b ON sh.batch_id = b.id
		JOIN products p ON b.product_id = p.id
		WHERE sh.industry_id = $1
		  AND sh.sold_at >= $2
		  AND sh.sold_at <= $3
		GROUP BY p.id, p.name, p.material_type
		ORDER BY revenue DESC
		LIMIT $4
	`

	rows, err := r.db.QueryContext(ctx, query,
		filters.IndustryID, filters.StartDate, filters.EndDate, filters.Limit,
	)
	if err != nil {
		return nil, errors.DatabaseError(err)
	}
	defer rows.Close()

	var products []entity.ProductMetric
	for rows.Next() {
		var p entity.ProductMetric
		if err := rows.Scan(
			&p.ProductID,
			&p.ProductName,
			&p.Material,
			&p.SalesCount,
			&p.Revenue,
			&p.SlabsSold,
			&p.AreaSold,
		); err != nil {
			return nil, errors.DatabaseError(err)
		}
		products = append(products, p)
	}

	return products, nil
}

// CountPendingApprovals conta reservas pendentes de aprovação
func (r *biRepository) CountPendingApprovals(ctx context.Context, industryID string) (int, error) {
	query := `
		SELECT COUNT(*)
		FROM reservations
		WHERE industry_id = $1
		  AND status = 'PENDENTE_APROVACAO'
		  AND is_active = true
	`

	var count int
	err := r.db.QueryRowContext(ctx, query, industryID).Scan(&count)
	if err != nil {
		return 0, errors.DatabaseError(err)
	}

	return count, nil
}

// RefreshMaterializedViews atualiza as views materializadas
func (r *biRepository) RefreshMaterializedViews(ctx context.Context) error {
	_, err := r.db.ExecContext(ctx, "SELECT refresh_bi_views()")
	if err != nil {
		return errors.DatabaseError(err)
	}
	return nil
}

// LogRefresh registra uma execução de refresh
func (r *biRepository) LogRefresh(ctx context.Context, viewName string, durationMs int, status string, errorMsg *string) error {
	query := `
		INSERT INTO bi_refresh_log (view_name, duration_ms, status, error_message)
		VALUES ($1, $2, $3, $4)
	`

	_, err := r.db.ExecContext(ctx, query, viewName, durationMs, status, errorMsg)
	if err != nil {
		return errors.DatabaseError(err)
	}

	return nil
}

// GetLastRefresh retorna a última atualização das views
func (r *biRepository) GetLastRefresh(ctx context.Context) (*time.Time, error) {
	query := `
		SELECT MAX(refreshed_at)
		FROM bi_refresh_log
		WHERE status = 'SUCCESS'
	`

	var lastRefresh sql.NullTime
	err := r.db.QueryRowContext(ctx, query).Scan(&lastRefresh)
	if err != nil {
		return nil, errors.DatabaseError(err)
	}

	if lastRefresh.Valid {
		return &lastRefresh.Time, nil
	}
	return nil, nil
}
