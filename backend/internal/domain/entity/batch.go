package entity

import (
	"fmt"
	"regexp"
	"strings"
	"time"
)

// BatchStatus representa o status de um lote
type BatchStatus string

const (
	BatchStatusDisponivel BatchStatus = "DISPONIVEL"
	BatchStatusReservado  BatchStatus = "RESERVADO"
	BatchStatusVendido    BatchStatus = "VENDIDO"
	BatchStatusInativo    BatchStatus = "INATIVO"
)

// IsValid verifica se o status do lote é válido
func (b BatchStatus) IsValid() bool {
	switch b {
	case BatchStatusDisponivel, BatchStatusReservado, BatchStatusVendido, BatchStatusInativo:
		return true
	}
	return false
}

// PriceUnit representa a unidade de preço por área
type PriceUnit string

const (
	PriceUnitM2  PriceUnit = "M2"  // Metro quadrado
	PriceUnitFT2 PriceUnit = "FT2" // Pé quadrado
)

// M2ToFT2Factor é o fator de conversão de m² para ft²
const M2ToFT2Factor = 10.76391042

// IsValid verifica se a unidade de preço é válida
func (p PriceUnit) IsValid() bool {
	switch p {
	case PriceUnitM2, PriceUnitFT2:
		return true
	}
	return false
}

// ConvertPrice converte um preço de uma unidade para outra
func ConvertPrice(price float64, from, to PriceUnit) float64 {
	if from == to {
		return price
	}
	if from == PriceUnitM2 && to == PriceUnitFT2 {
		// Preço por m² → preço por ft² (divide pelo fator pois ft² é menor)
		return price / M2ToFT2Factor
	}
	// Preço por ft² → preço por m² (multiplica pelo fator)
	return price * M2ToFT2Factor
}

// ConvertArea converte uma área de uma unidade para outra
func ConvertArea(area float64, from, to PriceUnit) float64 {
	if from == to {
		return area
	}
	if from == PriceUnitM2 && to == PriceUnitFT2 {
		return area * M2ToFT2Factor
	}
	return area / M2ToFT2Factor
}

// BatchCode representa o código de um lote (AAA-999999)
type BatchCode string

var batchCodeRegex = regexp.MustCompile(`^[A-Z]{3}-\d{6}$`)

// NewBatchCode cria e valida um BatchCode
func NewBatchCode(code string) (BatchCode, error) {
	// Converter para uppercase
	code = strings.ToUpper(strings.TrimSpace(code))

	// Validar formato
	if !batchCodeRegex.MatchString(code) {
		return "", fmt.Errorf("código de lote inválido. Formato esperado: AAA-999999")
	}

	return BatchCode(code), nil
}

// String retorna a representação em string do BatchCode
func (b BatchCode) String() string {
	return string(b)
}

// Batch representa um lote físico de estoque
type Batch struct {
	ID             string      `json:"id"`
	ProductID      string      `json:"productId"`
	IndustryID     string      `json:"industryId"`
	BatchCode      string      `json:"batchCode"`
	Height         float64     `json:"height"`         // cm
	Width          float64     `json:"width"`          // cm
	Thickness      float64     `json:"thickness"`      // cm
	QuantitySlabs  int         `json:"quantitySlabs"`  // quantidade total de chapas
	AvailableSlabs int         `json:"availableSlabs"` // quantidade de chapas disponíveis
	TotalArea      float64     `json:"totalArea"`      // m² (calculado)
	IndustryPrice  float64     `json:"industryPrice"`  // preço por unidade de área
	PriceUnit      PriceUnit   `json:"priceUnit"`      // unidade de preço (M2 ou FT2)
	OriginQuarry   *string     `json:"originQuarry,omitempty"`
	EntryDate      time.Time   `json:"entryDate"`
	Status         BatchStatus `json:"status"`
	IsActive       bool        `json:"isActive"`
	Medias         []Media     `json:"medias,omitempty"`
	Product        *Product    `json:"product,omitempty"` // Populated quando necessário
	CreatedAt      time.Time   `json:"createdAt"`
	UpdatedAt      time.Time   `json:"updatedAt"`
}

// CalculateTotalArea calcula a área total do lote
func (b *Batch) CalculateTotalArea() {
	// Fórmula: (altura * largura * quantidade) / 10000
	// Resultado em m²
	b.TotalArea = (b.Height * b.Width * float64(b.QuantitySlabs)) / 10000
}

// CalculateSlabArea calcula a área de uma chapa individual em m²
func (b *Batch) CalculateSlabArea() float64 {
	return (b.Height * b.Width) / 10000
}

// IsAvailable verifica se o lote está disponível (tem chapas disponíveis)
func (b *Batch) IsAvailable() bool {
	return b.Status == BatchStatusDisponivel && b.IsActive && b.AvailableSlabs > 0
}

// HasAvailableSlabs verifica se há quantidade específica de chapas disponíveis
func (b *Batch) HasAvailableSlabs(quantity int) bool {
	return b.IsActive && b.AvailableSlabs >= quantity
}

// GetPriceInUnit retorna o preço convertido para a unidade especificada
func (b *Batch) GetPriceInUnit(unit PriceUnit) float64 {
	return ConvertPrice(b.IndustryPrice, b.PriceUnit, unit)
}

// CalculateTotalPrice calcula o preço total do lote baseado na área e preço por unidade
func (b *Batch) CalculateTotalPrice() float64 {
	// Converte preço para M2 se necessário
	pricePerM2 := b.GetPriceInUnit(PriceUnitM2)
	return pricePerM2 * b.TotalArea
}

// CalculatePriceForSlabs calcula o preço para uma quantidade específica de chapas
func (b *Batch) CalculatePriceForSlabs(quantity int) float64 {
	slabArea := b.CalculateSlabArea()
	totalArea := slabArea * float64(quantity)
	pricePerM2 := b.GetPriceInUnit(PriceUnitM2)
	return pricePerM2 * totalArea
}

// CreateBatchInput representa os dados para criar um lote
type CreateBatchInput struct {
	ProductID     *string   `json:"productId,omitempty" validate:"omitempty,uuid"`
	BatchCode     string    `json:"batchCode" validate:"required,batchcode"` // AAA-999999
	Height        float64   `json:"height" validate:"required,gt=0,lte=1000"`
	Width         float64   `json:"width" validate:"required,gt=0,lte=1000"`
	Thickness     float64   `json:"thickness" validate:"required,gt=0,lte=100"`
	QuantitySlabs int       `json:"quantitySlabs" validate:"required,gt=0"`
	IndustryPrice float64   `json:"industryPrice" validate:"required,gt=0"`
	PriceUnit     PriceUnit `json:"priceUnit" validate:"omitempty,oneof=M2 FT2"`
	OriginQuarry  *string   `json:"originQuarry,omitempty" validate:"omitempty,max=100"`
	EntryDate     string    `json:"entryDate" validate:"required"` // ISO date
	// Inline product creation support
	NewProduct *CreateProductInlineInput `json:"newProduct,omitempty"`
}

// CreateProductInlineInput representa os dados para criar produto inline ao criar lote
type CreateProductInlineInput struct {
	Name        string       `json:"name" validate:"required,min=2,max=100"`
	SKU         *string      `json:"sku,omitempty" validate:"omitempty,max=50"`
	Material    MaterialType `json:"material" validate:"required"`
	Finish      FinishType   `json:"finish" validate:"required"`
	Description *string      `json:"description,omitempty" validate:"omitempty,max=500"`
	IsPublic    bool         `json:"isPublic"`
}

// UpdateBatchInput representa os dados para atualizar um lote
type UpdateBatchInput struct {
	BatchCode     *string    `json:"batchCode,omitempty" validate:"omitempty,batchcode"`
	Height        *float64   `json:"height,omitempty" validate:"omitempty,gt=0,lte=1000"`
	Width         *float64   `json:"width,omitempty" validate:"omitempty,gt=0,lte=1000"`
	Thickness     *float64   `json:"thickness,omitempty" validate:"omitempty,gt=0,lte=100"`
	QuantitySlabs *int       `json:"quantitySlabs,omitempty" validate:"omitempty,gt=0"`
	IndustryPrice *float64   `json:"industryPrice,omitempty" validate:"omitempty,gt=0"`
	PriceUnit     *PriceUnit `json:"priceUnit,omitempty" validate:"omitempty,oneof=M2 FT2"`
	OriginQuarry  *string    `json:"originQuarry,omitempty" validate:"omitempty,max=100"`
}

// UpdateBatchStatusInput representa os dados para atualizar o status de um lote
type UpdateBatchStatusInput struct {
	Status BatchStatus `json:"status" validate:"required,oneof=DISPONIVEL RESERVADO VENDIDO INATIVO"`
}

// BatchFilters representa os filtros para busca de lotes
type BatchFilters struct {
	ProductID         *string      `json:"productId,omitempty"`
	Status            *BatchStatus `json:"status,omitempty"`
	Code              *string      `json:"code,omitempty"`              // Busca parcial
	OnlyWithAvailable bool         `json:"onlyWithAvailable,omitempty"` // Apenas lotes com chapas disponíveis
	LowStock          bool         `json:"lowStock,omitempty"`          // Apenas lotes com estoque baixo (≤3)
	NoStock           bool         `json:"noStock,omitempty"`           // Apenas lotes sem estoque
	SortBy            string       `json:"sortBy,omitempty"`            // Campo para ordenação: batchCode, availableSlabs, totalArea, industryPrice, entryDate
	SortDir           string       `json:"sortDir,omitempty"`           // Direção: asc ou desc
	Page              int          `json:"page" validate:"min=1"`
	Limit             int          `json:"limit" validate:"min=1,max=100"`
}

// BatchListResponse representa a resposta de listagem de lotes
type BatchListResponse struct {
	Batches []Batch `json:"batches"`
	Total   int     `json:"total"`
	Page    int     `json:"page"`
}
