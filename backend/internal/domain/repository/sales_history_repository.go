package repository

import (
	"context"
	"database/sql"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
	"time"
)

// SalesHistoryRepository define o contrato para operações com histórico de vendas
type SalesHistoryRepository interface {
	// Create cria um novo registro de venda
	Create(ctx context.Context, tx *sql.Tx, sale *entity.Sale) error

	// FindByID busca venda por ID
	FindByID(ctx context.Context, id string) (*entity.Sale, error)

	// FindBySellerID busca vendas de um vendedor
	FindBySellerID(ctx context.Context, sellerID string, filters entity.SaleFilters) ([]entity.Sale, int, error)

	// FindByIndustryID busca vendas de uma indústria
	FindByIndustryID(ctx context.Context, industryID string, filters entity.SaleFilters) ([]entity.Sale, int, error)

	// FindByBrokerID busca vendas de um broker
	FindByBrokerID(ctx context.Context, brokerID string, limit int) ([]entity.Sale, error)

	// FindByPeriod busca vendas por período
	FindByPeriod(ctx context.Context, industryID string, startDate, endDate time.Time) ([]entity.Sale, error)

	// List lista vendas com filtros e paginação
	List(ctx context.Context, filters entity.SaleFilters) ([]entity.Sale, int, error)

	// CalculateSummary calcula sumário de vendas (total, comissões, ticket médio)
	CalculateSummary(ctx context.Context, filters entity.SaleSummaryFilters) (*entity.SaleSummary, error)

	// SumMonthlySales soma vendas do mês atual
	SumMonthlySales(ctx context.Context, entityID string, month time.Time) (float64, error)

	// SumMonthlyCommission soma comissões do mês atual (para broker)
	SumMonthlyCommission(ctx context.Context, brokerID string, month time.Time) (float64, error)

	// Delete remove um registro de venda
	Delete(ctx context.Context, tx *sql.Tx, id string) error
}