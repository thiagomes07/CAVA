package entity

import "time"

// SalesMetrics representa métricas de vendas
type SalesMetrics struct {
	TotalRevenue     float64 `json:"totalRevenue"`
	TotalCommissions float64 `json:"totalCommissions"`
	NetRevenue       float64 `json:"netRevenue"`
	SalesCount       int     `json:"salesCount"`
	AverageTicket    float64 `json:"averageTicket"`
	TotalSlabs       int     `json:"totalSlabs"`
	TotalArea        float64 `json:"totalArea"`
	CommissionRate   float64 `json:"commissionRate"` // Porcentagem média de comissão
	Currency         CurrencyCode `json:"currency"`
}

// ConversionMetrics representa métricas do funil de conversão (reservas)
type ConversionMetrics struct {
	TotalReservations   int     `json:"totalReservations"`
	TotalApproved       int     `json:"totalApproved"`
	TotalRejected       int     `json:"totalRejected"`
	TotalConverted      int     `json:"totalConverted"`
	TotalExpired        int     `json:"totalExpired"`
	TotalCancelled      int     `json:"totalCancelled"`
	ApprovalRate        float64 `json:"approvalRate"`        // aprovadas / total
	ConversionRate      float64 `json:"conversionRate"`      // convertidas / aprovadas
	RejectionRate       float64 `json:"rejectionRate"`       // rejeitadas / total
	AvgHoursToApprove   float64 `json:"avgHoursToApprove"`   // horas médias para aprovação
	AvgDaysToConvert    float64 `json:"avgDaysToConvert"`    // dias médios para converter
}

// InventoryMetrics representa métricas de inventário
type InventoryMetrics struct {
	TotalBatches    int     `json:"totalBatches"`
	TotalSlabs      int     `json:"totalSlabs"`
	AvailableSlabs  int     `json:"availableSlabs"`
	ReservedSlabs   int     `json:"reservedSlabs"`
	SoldSlabs       int     `json:"soldSlabs"`
	InventoryValue  float64 `json:"inventoryValue"`  // Valor total em estoque
	AvgDaysInStock  int     `json:"avgDaysInStock"`  // Dias médios em estoque
	LowStockCount   int     `json:"lowStockCount"`   // Lotes com <= 3 chapas disponíveis
	StaleBatchCount int     `json:"staleBatchCount"` // Lotes > 90 dias sem movimento
	Turnover        float64 `json:"turnover"`        // Rotatividade do estoque
	OccupancyRate   float64 `json:"occupancyRate"`   // Taxa de ocupação (reserved/available)
	Currency        CurrencyCode `json:"currency"`
}

// BrokerPerformance representa performance de um broker/vendedor
type BrokerPerformance struct {
	BrokerID        string  `json:"brokerId"`
	BrokerName      string  `json:"brokerName"`
	SalesCount      int     `json:"salesCount"`
	TotalRevenue    float64 `json:"totalRevenue"`
	TotalCommission float64 `json:"totalCommission"`
	AverageTicket   float64 `json:"averageTicket"`
	ApprovalRate    float64 `json:"approvalRate"`    // Taxa de aprovação das reservas
	ConversionRate  float64 `json:"conversionRate"`  // Taxa de conversão para venda
	AvgDaysToClose  float64 `json:"avgDaysToClose"`  // Dias médios para fechar venda
	Rank            int     `json:"rank"`            // Posição no ranking
	TrendPercent    float64 `json:"trendPercent"`    // % variação vs período anterior
	Currency        CurrencyCode `json:"currency"`
}

// TrendPoint representa um ponto de dados em série temporal
type TrendPoint struct {
	Date  string  `json:"date"`  // Formato: YYYY-MM-DD ou YYYY-MM
	Value float64 `json:"value"` // Valor (ex: receita)
	Count int     `json:"count"` // Contagem (ex: número de vendas)
	Currency CurrencyCode `json:"currency"`
}

// ProductMetric representa métricas de um produto
type ProductMetric struct {
	ProductID   string  `json:"productId"`
	ProductName string  `json:"productName"`
	Material    string  `json:"material"`
	SalesCount  int     `json:"salesCount"`
	Revenue     float64 `json:"revenue"`
	SlabsSold   int     `json:"slabsSold"`
	AreaSold    float64 `json:"areaSold"`
	Currency    CurrencyCode `json:"currency"`
}

// BIDashboard representa o dashboard completo de BI
type BIDashboard struct {
	Period           string              `json:"period"` // Ex: "2024-01-01 a 2024-01-31"
	Currency         CurrencyCode        `json:"currency"`
	ExchangeRateUsed *float64            `json:"exchangeRateUsed,omitempty"`
	Sales            SalesMetrics        `json:"sales"`
	Conversion       ConversionMetrics   `json:"conversion"`
	Inventory        InventoryMetrics    `json:"inventory"`
	TopBrokers       []BrokerPerformance `json:"topBrokers"`
	SalesTrend       []TrendPoint        `json:"salesTrend"`
	TopProducts      []ProductMetric     `json:"topProducts"`
	PendingApprovals int                 `json:"pendingApprovals"` // Reservas aguardando aprovação
}

// BIFilters representa filtros para queries de BI
type BIFilters struct {
	IndustryID  string     `json:"industryId"`
	Currency    CurrencyCode `json:"currency"`
	StartDate   *time.Time `json:"startDate,omitempty"`
	EndDate     *time.Time `json:"endDate,omitempty"`
	BrokerID    *string    `json:"brokerId,omitempty"`
	ProductID   *string    `json:"productId,omitempty"`
	Granularity string     `json:"granularity,omitempty"` // day, week, month
	Limit       int        `json:"limit,omitempty"`
}

// SetDefaults define valores padrão para os filtros
func (f *BIFilters) SetDefaults() {
	if f.Limit == 0 {
		f.Limit = 10
	}
	if f.Currency == "" {
		f.Currency = CurrencyBRL
	}
	if f.Granularity == "" {
		f.Granularity = "day"
	}
	// Se não tiver período definido, usa último mês
	if f.StartDate == nil {
		now := time.Now()
		start := now.AddDate(0, -1, 0)
		f.StartDate = &start
	}
	if f.EndDate == nil {
		now := time.Now()
		f.EndDate = &now
	}
}

// BiRefreshLog representa um log de refresh das views
type BiRefreshLog struct {
	ID           int        `json:"id"`
	ViewName     string     `json:"viewName"`
	RefreshedAt  time.Time  `json:"refreshedAt"`
	DurationMs   *int       `json:"durationMs,omitempty"`
	RowsAffected *int       `json:"rowsAffected,omitempty"`
	Status       string     `json:"status"`
	ErrorMessage *string    `json:"errorMessage,omitempty"`
}
