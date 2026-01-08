package entity

import (
	"time"
)

// IndustryMetrics representa as métricas do dashboard da indústria
type IndustryMetrics struct {
	AvailableBatches int     `json:"availableBatches"`
	MonthlySales     float64 `json:"monthlySales"`
	ReservedBatches  int     `json:"reservedBatches"`
	ActiveLinks      *int    `json:"activeLinks,omitempty"`
	LeadsCount       *int    `json:"leadsCount,omitempty"`
}

// BrokerMetrics representa as métricas do dashboard do broker
type BrokerMetrics struct {
	AvailableBatches  int     `json:"availableBatches"`
	MonthlySales      float64 `json:"monthlySales"`
	ActiveLinks       int     `json:"activeLinks"`
	MonthlyCommission float64 `json:"monthlyCommission"`
}

// ActivityAction representa os tipos de ação em atividades
type ActivityAction string

const (
	ActivityActionReservado     ActivityAction = "RESERVADO"
	ActivityActionVendido       ActivityAction = "VENDIDO"
	ActivityActionCompartilhado ActivityAction = "COMPARTILHADO"
	ActivityActionCriado        ActivityAction = "CRIADO"
)

// Activity representa uma atividade recente
type Activity struct {
	ID          string         `json:"id"`
	BatchCode   string         `json:"batchCode"`
	ProductName string         `json:"productName"`
	SellerName  string         `json:"sellerName"`
	Action      ActivityAction `json:"action"`
	Date        time.Time      `json:"date"`
}