package service

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
	domainErrors "github.com/thiagomes07/CAVA/backend/internal/domain/errors"
	"github.com/thiagomes07/CAVA/backend/internal/domain/repository"
	"go.uber.org/zap"
)

type biService struct {
	biRepo repository.BIRepository
	logger *zap.Logger
}

func NewBIService(
	biRepo repository.BIRepository,
	logger *zap.Logger,
) *biService {
	return &biService{
		biRepo: biRepo,
		logger: logger,
	}
}

// GetDashboard retorna o dashboard completo de BI
func (s *biService) GetDashboard(ctx context.Context, filters entity.BIFilters) (*entity.BIDashboard, error) {
	filters.SetDefaults()

	dashboard := &entity.BIDashboard{
		Period: fmt.Sprintf("%s a %s",
			filters.StartDate.Format("2006-01-02"),
			filters.EndDate.Format("2006-01-02"),
		),
	}

	var wg sync.WaitGroup
	var mu sync.Mutex
	errChan := make(chan error, 7)

	// Executar queries em paralelo
	wg.Add(7)

	// 1. Métricas de vendas
	go func() {
		defer wg.Done()
		metrics, err := s.biRepo.GetSalesMetrics(ctx, filters)
		if err != nil {
			s.logger.Error("erro ao buscar métricas de vendas", zap.Error(err))
			errChan <- err
			return
		}
		mu.Lock()
		dashboard.Sales = *metrics
		mu.Unlock()
	}()

	// 2. Métricas de conversão
	go func() {
		defer wg.Done()
		metrics, err := s.biRepo.GetConversionMetrics(ctx, filters)
		if err != nil {
			s.logger.Error("erro ao buscar métricas de conversão", zap.Error(err))
			errChan <- err
			return
		}
		mu.Lock()
		dashboard.Conversion = *metrics
		mu.Unlock()
	}()

	// 3. Métricas de inventário
	go func() {
		defer wg.Done()
		metrics, err := s.biRepo.GetInventoryMetrics(ctx, filters.IndustryID)
		if err != nil {
			s.logger.Error("erro ao buscar métricas de inventário", zap.Error(err))
			errChan <- err
			return
		}
		mu.Lock()
		dashboard.Inventory = *metrics
		mu.Unlock()
	}()

	// 4. Performance de brokers
	go func() {
		defer wg.Done()
		brokerFilters := filters
		brokerFilters.Limit = 10
		brokers, err := s.biRepo.GetBrokerPerformance(ctx, brokerFilters)
		if err != nil {
			s.logger.Error("erro ao buscar performance de brokers", zap.Error(err))
			errChan <- err
			return
		}
		mu.Lock()
		dashboard.TopBrokers = brokers
		mu.Unlock()
	}()

	// 5. Tendência de vendas
	go func() {
		defer wg.Done()
		trend, err := s.biRepo.GetSalesTrend(ctx, filters)
		if err != nil {
			s.logger.Error("erro ao buscar tendência de vendas", zap.Error(err))
			errChan <- err
			return
		}
		mu.Lock()
		dashboard.SalesTrend = trend
		mu.Unlock()
	}()

	// 6. Top produtos
	go func() {
		defer wg.Done()
		productFilters := filters
		productFilters.Limit = 10
		products, err := s.biRepo.GetTopProducts(ctx, productFilters)
		if err != nil {
			s.logger.Error("erro ao buscar top produtos", zap.Error(err))
			errChan <- err
			return
		}
		mu.Lock()
		dashboard.TopProducts = products
		mu.Unlock()
	}()

	// 7. Reservas pendentes de aprovação
	go func() {
		defer wg.Done()
		count, err := s.biRepo.CountPendingApprovals(ctx, filters.IndustryID)
		if err != nil {
			s.logger.Error("erro ao contar reservas pendentes", zap.Error(err))
			errChan <- err
			return
		}
		mu.Lock()
		dashboard.PendingApprovals = count
		mu.Unlock()
	}()

	// Aguardar conclusão
	wg.Wait()
	close(errChan)

	// Verificar se houve erros
	for err := range errChan {
		if err != nil {
			return nil, domainErrors.InternalError(err)
		}
	}

	s.logger.Info("dashboard de BI carregado com sucesso",
		zap.String("industryId", filters.IndustryID),
		zap.String("period", dashboard.Period),
	)

	return dashboard, nil
}

// GetSalesMetrics retorna apenas métricas de vendas
func (s *biService) GetSalesMetrics(ctx context.Context, filters entity.BIFilters) (*entity.SalesMetrics, error) {
	filters.SetDefaults()

	metrics, err := s.biRepo.GetSalesMetrics(ctx, filters)
	if err != nil {
		s.logger.Error("erro ao buscar métricas de vendas", zap.Error(err))
		return nil, domainErrors.InternalError(err)
	}

	return metrics, nil
}

// GetConversionMetrics retorna apenas métricas de conversão
func (s *biService) GetConversionMetrics(ctx context.Context, filters entity.BIFilters) (*entity.ConversionMetrics, error) {
	filters.SetDefaults()

	metrics, err := s.biRepo.GetConversionMetrics(ctx, filters)
	if err != nil {
		s.logger.Error("erro ao buscar métricas de conversão", zap.Error(err))
		return nil, domainErrors.InternalError(err)
	}

	return metrics, nil
}

// GetInventoryMetrics retorna apenas métricas de inventário
func (s *biService) GetInventoryMetrics(ctx context.Context, industryID string) (*entity.InventoryMetrics, error) {
	metrics, err := s.biRepo.GetInventoryMetrics(ctx, industryID)
	if err != nil {
		s.logger.Error("erro ao buscar métricas de inventário", zap.Error(err))
		return nil, domainErrors.InternalError(err)
	}

	return metrics, nil
}

// GetBrokerRanking retorna ranking de performance dos brokers
func (s *biService) GetBrokerRanking(ctx context.Context, filters entity.BIFilters) ([]entity.BrokerPerformance, error) {
	filters.SetDefaults()

	brokers, err := s.biRepo.GetBrokerPerformance(ctx, filters)
	if err != nil {
		s.logger.Error("erro ao buscar ranking de brokers", zap.Error(err))
		return nil, domainErrors.InternalError(err)
	}

	return brokers, nil
}

// GetSalesTrend retorna tendência de vendas ao longo do tempo
func (s *biService) GetSalesTrend(ctx context.Context, filters entity.BIFilters) ([]entity.TrendPoint, error) {
	filters.SetDefaults()

	trend, err := s.biRepo.GetSalesTrend(ctx, filters)
	if err != nil {
		s.logger.Error("erro ao buscar tendência de vendas", zap.Error(err))
		return nil, domainErrors.InternalError(err)
	}

	return trend, nil
}

// GetTopProducts retorna os produtos mais vendidos
func (s *biService) GetTopProducts(ctx context.Context, filters entity.BIFilters) ([]entity.ProductMetric, error) {
	filters.SetDefaults()

	products, err := s.biRepo.GetTopProducts(ctx, filters)
	if err != nil {
		s.logger.Error("erro ao buscar top produtos", zap.Error(err))
		return nil, domainErrors.InternalError(err)
	}

	return products, nil
}

// RefreshViews atualiza as views materializadas
func (s *biService) RefreshViews(ctx context.Context) error {
	startTime := time.Now()

	err := s.biRepo.RefreshMaterializedViews(ctx)

	durationMs := int(time.Since(startTime).Milliseconds())
	status := "SUCCESS"
	var errorMsg *string

	if err != nil {
		status = "ERROR"
		errStr := err.Error()
		errorMsg = &errStr
		s.logger.Error("erro ao atualizar views materializadas",
			zap.Error(err),
			zap.Int("durationMs", durationMs),
		)
	} else {
		s.logger.Info("views materializadas atualizadas com sucesso",
			zap.Int("durationMs", durationMs),
		)
	}

	// Registrar log de refresh
	logErr := s.biRepo.LogRefresh(ctx, "ALL_VIEWS", durationMs, status, errorMsg)
	if logErr != nil {
		s.logger.Warn("erro ao registrar log de refresh", zap.Error(logErr))
	}

	if err != nil {
		return domainErrors.InternalError(err)
	}

	return nil
}

// GetLastRefresh retorna a última atualização das views
func (s *biService) GetLastRefresh(ctx context.Context) (*time.Time, error) {
	return s.biRepo.GetLastRefresh(ctx)
}
