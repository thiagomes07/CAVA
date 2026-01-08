package entity

import (
	"time"
)

// Sale representa um registro de venda (histórico)
type Sale struct {
	ID               string    `json:"id"`
	BatchID          string    `json:"batchId"`
	SoldByUserID     string    `json:"soldByUserId"`
	IndustryID       string    `json:"industryId"`
	LeadID           *string   `json:"leadId,omitempty"`
	CustomerName     string    `json:"customerName"`
	CustomerContact  string    `json:"customerContact"`
	SalePrice        float64   `json:"salePrice"`        // Preço final pago pelo cliente
	BrokerCommission float64   `json:"brokerCommission"` // Comissão do broker/vendedor
	NetIndustryValue float64   `json:"netIndustryValue"` // Valor líquido para indústria
	SaleDate         time.Time `json:"saleDate"`
	InvoiceURL       *string   `json:"invoiceUrl,omitempty"`
	Notes            *string   `json:"notes,omitempty"`
	CreatedAt        time.Time `json:"createdAt"`
	Batch            *Batch    `json:"batch,omitempty"`   // Populated quando necessário
	SoldBy           *User     `json:"soldBy,omitempty"`  // Populated quando necessário
	Lead             *Lead     `json:"lead,omitempty"`    // Populated quando necessário
}

// CreateSaleInput representa os dados para registrar uma venda
type CreateSaleInput struct {
	BatchID          string  `json:"batchId" validate:"required,uuid"`
	SoldByUserID     string  `json:"soldByUserId" validate:"required,uuid"`
	IndustryID       string  `json:"industryId" validate:"required,uuid"`
	LeadID           *string `json:"leadId,omitempty" validate:"omitempty,uuid"`
	CustomerName     string  `json:"customerName" validate:"required,min=2,max=255"`
	CustomerContact  string  `json:"customerContact" validate:"required,min=10"`
	SalePrice        float64 `json:"salePrice" validate:"required,gt=0"`
	BrokerCommission float64 `json:"brokerCommission" validate:"gte=0"`
	NetIndustryValue float64 `json:"netIndustryValue" validate:"required,gt=0"`
	InvoiceURL       *string `json:"invoiceUrl,omitempty" validate:"omitempty,url"`
	Notes            *string `json:"notes,omitempty" validate:"omitempty,max=1000"`
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
	TotalSales        float64 `json:"totalSales"`
	TotalCommissions  float64 `json:"totalCommissions"`
	AverageTicket     float64 `json:"averageTicket"`
}

// SaleSummaryFilters representa os filtros para sumário de vendas
type SaleSummaryFilters struct {
	Period    *string `json:"period,omitempty"`    // e.g., 'month', 'year'
	StartDate *string `json:"startDate,omitempty"` // ISO date
	EndDate   *string `json:"endDate,omitempty"`   // ISO date
}