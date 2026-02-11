package service

import (
	"context"
	"time"

	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
)

// BIService define o contrato para operações de Business Intelligence
type BIService interface {
	// GetDashboard retorna o dashboard completo de BI
	GetDashboard(ctx context.Context, filters entity.BIFilters) (*entity.BIDashboard, error)

	// GetSalesMetrics retorna apenas métricas de vendas
	GetSalesMetrics(ctx context.Context, filters entity.BIFilters) (*entity.SalesMetrics, error)

	// GetConversionMetrics retorna apenas métricas de conversão
	GetConversionMetrics(ctx context.Context, filters entity.BIFilters) (*entity.ConversionMetrics, error)

	// GetInventoryMetrics retorna apenas métricas de inventário
	GetInventoryMetrics(ctx context.Context, industryID string, currency entity.CurrencyCode) (*entity.InventoryMetrics, error)

	// GetBrokerRanking retorna ranking de performance dos brokers
	GetBrokerRanking(ctx context.Context, filters entity.BIFilters) ([]entity.BrokerPerformance, error)

	// GetSalesTrend retorna tendência de vendas ao longo do tempo
	GetSalesTrend(ctx context.Context, filters entity.BIFilters) ([]entity.TrendPoint, error)

	// GetTopProducts retorna os produtos mais vendidos
	GetTopProducts(ctx context.Context, filters entity.BIFilters) ([]entity.ProductMetric, error)

	// RefreshViews atualiza as views materializadas
	RefreshViews(ctx context.Context) error

	// GetLastRefresh retorna a última atualização das views
	GetLastRefresh(ctx context.Context) (*time.Time, error)
}
