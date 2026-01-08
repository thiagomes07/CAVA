package service

import (
	"context"
	"sync"
	"time"

	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
	domainErrors "github.com/thiagomes07/CAVA/backend/internal/domain/errors"
	"github.com/thiagomes07/CAVA/backend/internal/domain/repository"
	"go.uber.org/zap"
)

type dashboardService struct {
	batchRepo  repository.BatchRepository
	salesRepo  repository.SalesHistoryRepository
	linkRepo   repository.SalesLinkRepository
	leadRepo   repository.LeadRepository
	sharedRepo repository.SharedInventoryRepository
	logger     *zap.Logger
}

func NewDashboardService(
	batchRepo repository.BatchRepository,
	salesRepo repository.SalesHistoryRepository,
	linkRepo repository.SalesLinkRepository,
	leadRepo repository.LeadRepository,
	sharedRepo repository.SharedInventoryRepository,
	logger *zap.Logger,
) *dashboardService {
	return &dashboardService{
		batchRepo:  batchRepo,
		salesRepo:  salesRepo,
		linkRepo:   linkRepo,
		leadRepo:   leadRepo,
		sharedRepo: sharedRepo,
		logger:     logger,
	}
}

func (s *dashboardService) GetIndustryMetrics(ctx context.Context, industryID string) (*entity.IndustryMetrics, error) {
	metrics := &entity.IndustryMetrics{}
	var wg sync.WaitGroup
	var mu sync.Mutex
	errChan := make(chan error, 5)

	currentMonth := time.Now()

	// Executar queries em paralelo
	wg.Add(5)

	// 1. Lotes disponíveis
	go func() {
		defer wg.Done()
		count, err := s.batchRepo.CountByStatus(ctx, industryID, entity.BatchStatusDisponivel)
		if err != nil {
			s.logger.Error("erro ao contar lotes disponíveis", zap.Error(err))
			errChan <- err
			return
		}
		mu.Lock()
		metrics.AvailableBatches = count
		mu.Unlock()
	}()

	// 2. Lotes reservados
	go func() {
		defer wg.Done()
		count, err := s.batchRepo.CountByStatus(ctx, industryID, entity.BatchStatusReservado)
		if err != nil {
			s.logger.Error("erro ao contar lotes reservados", zap.Error(err))
			errChan <- err
			return
		}
		mu.Lock()
		metrics.ReservedBatches = count
		mu.Unlock()
	}()

	// 3. Vendas mensais
	go func() {
		defer wg.Done()
		total, err := s.salesRepo.SumMonthlySales(ctx, industryID, currentMonth)
		if err != nil {
			s.logger.Error("erro ao calcular vendas mensais", zap.Error(err))
			errChan <- err
			return
		}
		mu.Lock()
		metrics.MonthlySales = total
		mu.Unlock()
	}()

	// 4. Links ativos
	go func() {
		defer wg.Done()
		count, err := s.linkRepo.CountActive(ctx, industryID)
		if err != nil {
			s.logger.Error("erro ao contar links ativos", zap.Error(err))
			errChan <- err
			return
		}
		mu.Lock()
		metrics.ActiveLinks = &count
		mu.Unlock()
	}()

	// 5. Total de leads
	go func() {
		defer wg.Done()
		count, err := s.leadRepo.CountByIndustry(ctx, industryID)
		if err != nil {
			s.logger.Error("erro ao contar leads", zap.Error(err))
			errChan <- err
			return
		}
		mu.Lock()
		metrics.LeadsCount = &count
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

	s.logger.Info("métricas da indústria calculadas",
		zap.String("industryId", industryID),
		zap.Int("availableBatches", metrics.AvailableBatches),
		zap.Float64("monthlySales", metrics.MonthlySales),
	)

	return metrics, nil
}

func (s *dashboardService) GetBrokerMetrics(ctx context.Context, brokerID string) (*entity.BrokerMetrics, error) {
	metrics := &entity.BrokerMetrics{}
	var wg sync.WaitGroup
	var mu sync.Mutex
	errChan := make(chan error, 4)

	currentMonth := time.Now()

	// Executar queries em paralelo
	wg.Add(4)

	// 1. Lotes disponíveis compartilhados
	go func() {
		defer wg.Done()
		count, err := s.sharedRepo.CountSharedBatches(ctx, brokerID, entity.BatchStatusDisponivel)
		if err != nil {
			s.logger.Error("erro ao contar lotes compartilhados", zap.Error(err))
			errChan <- err
			return
		}
		mu.Lock()
		metrics.AvailableBatches = count
		mu.Unlock()
	}()

	// 2. Vendas mensais
	go func() {
		defer wg.Done()
		total, err := s.salesRepo.SumMonthlySales(ctx, brokerID, currentMonth)
		if err != nil {
			s.logger.Error("erro ao calcular vendas mensais do broker", zap.Error(err))
			errChan <- err
			return
		}
		mu.Lock()
		metrics.MonthlySales = total
		mu.Unlock()
	}()

	// 3. Comissão mensal
	go func() {
		defer wg.Done()
		total, err := s.salesRepo.SumMonthlyCommission(ctx, brokerID, currentMonth)
		if err != nil {
			s.logger.Error("erro ao calcular comissão mensal", zap.Error(err))
			errChan <- err
			return
		}
		mu.Lock()
		metrics.MonthlyCommission = total
		mu.Unlock()
	}()

	// 4. Links ativos
	go func() {
		defer wg.Done()
		count, err := s.linkRepo.CountActive(ctx, brokerID)
		if err != nil {
			s.logger.Error("erro ao contar links ativos do broker", zap.Error(err))
			errChan <- err
			return
		}
		mu.Lock()
		metrics.ActiveLinks = count
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

	s.logger.Info("métricas do broker calculadas",
		zap.String("brokerId", brokerID),
		zap.Int("availableBatches", metrics.AvailableBatches),
		zap.Float64("monthlySales", metrics.MonthlySales),
		zap.Float64("monthlyCommission", metrics.MonthlyCommission),
	)

	return metrics, nil
}

func (s *dashboardService) GetRecentActivities(ctx context.Context, industryID string) ([]entity.Activity, error) {
	// Nota: Esta implementação é simplificada.
	// Em produção, seria ideal ter uma tabela dedicada para atividades
	// ou usar uma view materializada para melhor performance.

	activities := []entity.Activity{}

	// Buscar últimas vendas (últimas 5)
	salesFilters := entity.SaleFilters{
		Page:  1,
		Limit: 5,
	}
	salesResult, _, err := s.salesRepo.FindByIndustryID(ctx, industryID, salesFilters)
	if err != nil {
		s.logger.Error("erro ao buscar vendas recentes", zap.Error(err))
	} else {
		for _, sale := range salesResult {
			// Buscar batch para obter código
			batch, err := s.batchRepo.FindByID(ctx, sale.BatchID)
			if err != nil {
				s.logger.Warn("erro ao buscar batch da venda",
					zap.String("batchId", sale.BatchID),
					zap.Error(err),
				)
				continue
			}

			// Buscar produto do batch
			productName := "Produto desconhecido"
			if batch.Product != nil {
				productName = batch.Product.Name
			}

			// Buscar vendedor
			sellerName := "Vendedor desconhecido"
			if sale.SoldBy != nil {
				sellerName = sale.SoldBy.Name
			}

			activities = append(activities, entity.Activity{
				ID:          sale.ID,
				BatchCode:   batch.BatchCode,
				ProductName: productName,
				SellerName:  sellerName,
				Action:      entity.ActivityActionVendido,
				Date:        sale.SaleDate,
			})
		}
	}

	// Buscar lotes recém criados (últimos 5)
	batchFilters := entity.BatchFilters{
		Page:  1,
		Limit: 5,
	}
	batchesResult, _, err := s.batchRepo.List(ctx, industryID, batchFilters)
	if err != nil {
		s.logger.Error("erro ao buscar lotes recentes", zap.Error(err))
	} else {
		for _, batch := range batchesResult {
			// Buscar produto
			productName := "Produto desconhecido"
			if batch.Product != nil {
				productName = batch.Product.Name
			}

			activities = append(activities, entity.Activity{
				ID:          batch.ID,
				BatchCode:   batch.BatchCode,
				ProductName: productName,
				SellerName:  "Sistema",
				Action:      entity.ActivityActionCriado,
				Date:        batch.CreatedAt,
			})
		}
	}

	// Ordenar por data (mais recente primeiro)
	// Nota: Em produção, fazer isso no banco seria mais eficiente
	sortActivitiesByDate(activities)

	// Limitar a 10 atividades
	if len(activities) > 10 {
		activities = activities[:10]
	}

	s.logger.Info("atividades recentes recuperadas",
		zap.String("industryId", industryID),
		zap.Int("count", len(activities)),
	)

	return activities, nil
}

// sortActivitiesByDate ordena atividades por data (mais recente primeiro)
func sortActivitiesByDate(activities []entity.Activity) {
	// Bubble sort simples (adequado para poucos itens)
	n := len(activities)
	for i := 0; i < n-1; i++ {
		for j := 0; j < n-i-1; j++ {
			if activities[j].Date.Before(activities[j+1].Date) {
				activities[j], activities[j+1] = activities[j+1], activities[j]
			}
		}
	}
}
