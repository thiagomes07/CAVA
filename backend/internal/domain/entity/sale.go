package entity

import (
	"time"
)

// Sale representa um registro de venda (histórico)
type Sale struct {
	ID                string    `json:"id"`
	BatchID           string    `json:"batchId"`
	SoldByUserID      *string   `json:"soldByUserId,omitempty"`
	SellerName        string    `json:"sellerName"`        // Nome do vendedor (sistema ou custom)
	IndustryID        string    `json:"industryId"`
	ClienteID         *string   `json:"clienteId,omitempty"`
	CustomerName      string    `json:"customerName"`
	CustomerContact   string    `json:"customerContact"`
	QuantitySlabsSold int       `json:"quantitySlabsSold"` // Quantidade de chapas vendidas
	TotalAreaSold     float64   `json:"totalAreaSold"`     // Área total vendida em m²
	PricePerUnit      float64   `json:"pricePerUnit"`      // Preço por unidade de área na venda
	PriceUnit         PriceUnit `json:"priceUnit"`         // Unidade de preço usada na venda
	SalePrice         float64   `json:"salePrice"`         // Preço final pago pelo cliente (valor da indústria)
	BrokerSoldPrice   *float64  `json:"brokerSoldPrice,omitempty"` // Valor que o broker vendeu para o cliente final
	BrokerCommission  float64   `json:"brokerCommission"`  // Comissão do broker/vendedor
	NetIndustryValue  float64   `json:"netIndustryValue"`  // Valor líquido para indústria
	SaleDate          time.Time `json:"saleDate"`
	InvoiceURL        *string   `json:"invoiceUrl,omitempty"`
	Notes             *string   `json:"notes,omitempty"`
	CreatedAt         time.Time `json:"createdAt"`
	Batch             *Batch    `json:"batch,omitempty"`   // Populated quando necessário
	SoldBy            *User     `json:"soldBy,omitempty"`  // Populated quando necessário
	Cliente           *Cliente  `json:"cliente,omitempty"` // Populated quando necessário
}

// CreateSaleInput representa os dados para registrar uma venda
type CreateSaleInput struct {
	BatchID           string    `json:"batchId" validate:"required,uuid"`
	SoldByUserID      *string   `json:"soldByUserId,omitempty" validate:"omitempty,uuid"`
	SellerName        string    `json:"sellerName" validate:"required"`
	IndustryID        string    `json:"industryId" validate:"required,uuid"`
	ClienteID         *string   `json:"clienteId,omitempty" validate:"omitempty,uuid"`
	CustomerName      string    `json:"customerName" validate:"required,min=2,max=255"`
	CustomerContact   string    `json:"customerContact" validate:"required,min=10"`
	QuantitySlabsSold int       `json:"quantitySlabsSold" validate:"required,gt=0"`
	TotalAreaSold     float64   `json:"totalAreaSold" validate:"required,gt=0"`
	PricePerUnit      float64   `json:"pricePerUnit" validate:"required,gt=0"`
	PriceUnit         PriceUnit `json:"priceUnit" validate:"required,oneof=M2 FT2"`
	SalePrice         float64   `json:"salePrice" validate:"required,gt=0"`
	BrokerCommission  float64   `json:"brokerCommission" validate:"gte=0"`
	NetIndustryValue  float64   `json:"netIndustryValue" validate:"required,gt=0"`
	InvoiceURL        *string                 `json:"invoiceUrl,omitempty" validate:"omitempty,url"`
	Notes             *string                 `json:"notes,omitempty" validate:"omitempty,max=1000"`
	NewClient         *CreateSaleClientInput  `json:"newClient,omitempty"` // Para criar cliente inline
}

// CreateSaleClientInput representa os dados para criar cliente inline (renamed to avoid conflict)
type CreateSaleClientInput struct {
	Name    string `json:"name" validate:"required,min=2,max=255"`
	Phone   string `json:"phone" validate:"required,min=10"`
	Email   string `json:"email,omitempty" validate:"omitempty,email"`
	Address string `json:"address,omitempty"`
}

// SaleFilters representa os filtros para busca de vendas
type SaleFilters struct {
	StartDate *string `json:"startDate,omitempty"` // ISO date
	EndDate   *string `json:"endDate,omitempty"`   // ISO date
	SellerID  *string `json:"sellerId,omitempty"`
	Page      int     `json:"page" validate:"min=1"`
	Limit     int     `json:"limit" validate:"min=1,max=100"`
}

// SaleListResponse representa a resposta de listagem de vendas
type SaleListResponse struct {
	Sales []Sale `json:"sales"`
	Total int    `json:"total"`
	Page  int    `json:"page"`
}

// SaleSummary representa o sumário de vendas
type SaleSummary struct {
	TotalSales       float64 `json:"totalSales"`
	TotalCommissions float64 `json:"totalCommissions"`
	AverageTicket    float64 `json:"averageTicket"`
}

// SaleSummaryFilters representa os filtros para sumário de vendas
type SaleSummaryFilters struct {
	Period    *string `json:"period,omitempty"`    // e.g., 'month', 'year'
	StartDate *string `json:"startDate,omitempty"` // ISO date
	EndDate   *string `json:"endDate,omitempty"`   // ISO date
}
