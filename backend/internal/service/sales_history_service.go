package service

import (
	"context"

	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
	domainErrors "github.com/thiagomes07/CAVA/backend/internal/domain/errors"
	"github.com/thiagomes07/CAVA/backend/internal/domain/repository"
	"go.uber.org/zap"
)

type salesHistoryService struct {
	salesRepo   repository.SalesHistoryRepository
	batchRepo   repository.BatchRepository
	userRepo    repository.UserRepository
	clienteRepo repository.ClienteRepository
	logger      *zap.Logger
}

func NewSalesHistoryService(
	salesRepo repository.SalesHistoryRepository,
	batchRepo repository.BatchRepository,
	userRepo repository.UserRepository,
	clienteRepo repository.ClienteRepository,
	logger *zap.Logger,
) *salesHistoryService {
	return &salesHistoryService{
		salesRepo:   salesRepo,
		batchRepo:   batchRepo,
		userRepo:    userRepo,
		clienteRepo: clienteRepo,
		logger:      logger,
	}
}

func (s *salesHistoryService) RegisterSale(ctx context.Context, input entity.CreateSaleInput) (*entity.Sale, error) {
	// Validar preços
	if input.SalePrice <= 0 {
		return nil, domainErrors.ValidationError("Preço de venda deve ser maior que 0")
	}
	if input.NetIndustryValue <= 0 {
		return nil, domainErrors.ValidationError("Valor líquido deve ser maior que 0")
	}
	if input.BrokerCommission < 0 {
		return nil, domainErrors.ValidationError("Comissão não pode ser negativa")
	}

	// Validar cálculo: salePrice >= netIndustryValue
	if input.SalePrice < input.NetIndustryValue {
		return nil, domainErrors.InvalidPriceError("Preço de venda não pode ser menor que o valor líquido da indústria")
	}

	// Validar que batch existe
	batch, err := s.batchRepo.FindByID(ctx, input.BatchID)
	if err != nil {
		return nil, err
	}

	// Validar que batch pertence à indústria
	if batch.IndustryID != input.IndustryID {
		return nil, domainErrors.ForbiddenError()
	}

	// Validar que vendedor existe
	seller, err := s.userRepo.FindByID(ctx, input.SoldByUserID)
	if err != nil {
		return nil, err
	}
	if !seller.IsActive {
		return nil, domainErrors.ValidationError("Vendedor inativo")
	}

	// Validar cliente (se fornecido)
	if input.ClienteID != nil {
		_, err := s.clienteRepo.FindByID(ctx, *input.ClienteID)
		if err != nil {
			return nil, err
		}
	}

	// Nota: A criação do sale é normalmente feita dentro da transação
	// de confirmação de reserva no ReservationService.
	// Este método é útil para registrar vendas diretas (sem reserva prévia).

	s.logger.Info("venda registrada",
		zap.String("batchId", input.BatchID),
		zap.String("sellerId", input.SoldByUserID),
		zap.Float64("salePrice", input.SalePrice),
	)

	// Retornar entidade (criação real seria feita em transação)
	sale := &entity.Sale{
		ID:               "", // Seria gerado na transação
		BatchID:          input.BatchID,
		SoldByUserID:     input.SoldByUserID,
		IndustryID:       input.IndustryID,
		ClienteID:        input.ClienteID,
		CustomerName:     input.CustomerName,
		CustomerContact:  input.CustomerContact,
		SalePrice:        input.SalePrice,
		BrokerCommission: input.BrokerCommission,
		NetIndustryValue: input.NetIndustryValue,
		InvoiceURL:       input.InvoiceURL,
		Notes:            input.Notes,
	}

	return sale, nil
}

func (s *salesHistoryService) GetByID(ctx context.Context, id string) (*entity.Sale, error) {
	sale, err := s.salesRepo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Buscar dados relacionados
	if err := s.populateSaleData(ctx, sale); err != nil {
		s.logger.Warn("erro ao popular dados da venda",
			zap.String("saleId", id),
			zap.Error(err),
		)
	}

	return sale, nil
}

func (s *salesHistoryService) List(ctx context.Context, filters entity.SaleFilters) (*entity.SaleListResponse, error) {
	sales, total, err := s.salesRepo.List(ctx, filters)
	if err != nil {
		s.logger.Error("erro ao listar vendas", zap.Error(err))
		return nil, err
	}

	// Buscar dados relacionados para cada venda
	for i := range sales {
		if err := s.populateSaleData(ctx, &sales[i]); err != nil {
			s.logger.Warn("erro ao popular dados da venda",
				zap.String("saleId", sales[i].ID),
				zap.Error(err),
			)
		}
	}

	return &entity.SaleListResponse{
		Sales: sales,
		Total: total,
		Page:  filters.Page,
	}, nil
}

func (s *salesHistoryService) GetSummary(ctx context.Context, filters entity.SaleSummaryFilters) (*entity.SaleSummary, error) {
	summary, err := s.salesRepo.CalculateSummary(ctx, filters)
	if err != nil {
		s.logger.Error("erro ao calcular sumário de vendas", zap.Error(err))
		return nil, err
	}

	return summary, nil
}

func (s *salesHistoryService) GetBrokerSales(ctx context.Context, brokerID string, limit int) ([]entity.Sale, error) {
	// Validar que usuário é broker
	broker, err := s.userRepo.FindByID(ctx, brokerID)
	if err != nil {
		return nil, err
	}
	if broker.Role != entity.RoleBroker {
		return nil, domainErrors.ForbiddenError()
	}

	// Buscar vendas do broker
	sales, err := s.salesRepo.FindByBrokerID(ctx, brokerID, limit)
	if err != nil {
		s.logger.Error("erro ao buscar vendas do broker",
			zap.String("brokerId", brokerID),
			zap.Error(err),
		)
		return nil, err
	}

	// Buscar dados relacionados
	for i := range sales {
		if err := s.populateSaleData(ctx, &sales[i]); err != nil {
			s.logger.Warn("erro ao popular dados da venda",
				zap.String("saleId", sales[i].ID),
				zap.Error(err),
			)
		}
	}

	return sales, nil
}

// populateSaleData popula dados relacionados de uma venda
func (s *salesHistoryService) populateSaleData(ctx context.Context, sale *entity.Sale) error {
	// Buscar batch
	if sale.BatchID != "" {
		batch, err := s.batchRepo.FindByID(ctx, sale.BatchID)
		if err != nil {
			return err
		}
		sale.Batch = batch
	}

	// Buscar vendedor
	if sale.SoldByUserID != "" {
		seller, err := s.userRepo.FindByID(ctx, sale.SoldByUserID)
		if err != nil {
			return err
		}
		seller.Password = "" // Limpar senha
		sale.SoldBy = seller
	}

	// Buscar cliente (se houver)
	if sale.ClienteID != nil {
		cliente, err := s.clienteRepo.FindByID(ctx, *sale.ClienteID)
		if err != nil {
			// Não retornar erro se cliente não encontrado
			s.logger.Warn("cliente não encontrado",
				zap.String("clienteId", *sale.ClienteID),
			)
		} else {
			sale.Cliente = cliente
		}
	}

	return nil
}
