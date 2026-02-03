package repository

import (
	"context"
	"time"

	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
)

// BIRepository define o contrato para operações de Business Intelligence
type BIRepository interface {
	// GetSalesMetrics retorna métricas de vendas para um período
	GetSalesMetrics(ctx context.Context, filters entity.BIFilters) (*entity.SalesMetrics, error)

	// GetConversionMetrics retorna métricas do funil de conversão de reservas
	GetConversionMetrics(ctx context.Context, filters entity.BIFilters) (*entity.ConversionMetrics, error)

	// GetInventoryMetrics retorna métricas de inventário
	GetInventoryMetrics(ctx context.Context, industryID string) (*entity.InventoryMetrics, error)

	// GetBrokerPerformance retorna ranking de performance dos brokers
	GetBrokerPerformance(ctx context.Context, filters entity.BIFilters) ([]entity.BrokerPerformance, error)

	// GetSalesTrend retorna tendência de vendas ao longo do tempo
	GetSalesTrend(ctx context.Context, filters entity.BIFilters) ([]entity.TrendPoint, error)

	// GetTopProducts retorna os produtos mais vendidos
	GetTopProducts(ctx context.Context, filters entity.BIFilters) ([]entity.ProductMetric, error)

	// CountPendingApprovals conta reservas pendentes de aprovação
	CountPendingApprovals(ctx context.Context, industryID string) (int, error)

	// RefreshMaterializedViews atualiza as views materializadas
	RefreshMaterializedViews(ctx context.Context) error

	// LogRefresh registra uma execução de refresh
	LogRefresh(ctx context.Context, viewName string, durationMs int, status string, errorMsg *string) error

	// GetLastRefresh retorna a última atualização das views
	GetLastRefresh(ctx context.Context) (*time.Time, error)
}
