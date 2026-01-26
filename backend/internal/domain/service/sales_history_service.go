package service

import (
	"context"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
)

// SalesHistoryService define o contrato para operações com histórico de vendas
type SalesHistoryService interface {
	// RegisterSale registra venda (calcula comissão, net value, cria registro)
	RegisterSale(ctx context.Context, input entity.CreateSaleInput) (*entity.Sale, error)

	// GetByID busca venda por ID
	GetByID(ctx context.Context, id string) (*entity.Sale, error)

	// List lista vendas com filtros
	List(ctx context.Context, filters entity.SaleFilters) (*entity.SaleListResponse, error)

	// GetSummary calcula sumário de vendas (total, comissões, ticket médio)
	GetSummary(ctx context.Context, filters entity.SaleSummaryFilters) (*entity.SaleSummary, error)

	// GetBrokerSales busca vendas de um broker
	GetBrokerSales(ctx context.Context, brokerID string, limit int) ([]entity.Sale, error)

	// Delete remove um registro de venda (undo)
	Delete(ctx context.Context, id string) error
}