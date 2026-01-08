package service

import (
	"context"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
)

// DashboardService define o contrato para operações de dashboard
type DashboardService interface {
	// GetIndustryMetrics busca métricas do dashboard admin/vendedor
	GetIndustryMetrics(ctx context.Context, industryID string) (*entity.IndustryMetrics, error)

	// GetBrokerMetrics busca métricas do dashboard broker
	GetBrokerMetrics(ctx context.Context, brokerID string) (*entity.BrokerMetrics, error)

	// GetRecentActivities busca atividades recentes (últimas 10)
	GetRecentActivities(ctx context.Context, industryID string) ([]entity.Activity, error)
}