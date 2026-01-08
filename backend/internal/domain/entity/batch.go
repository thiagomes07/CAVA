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
	ID            string      `json:"id"`
	ProductID     string      `json:"productId"`
	IndustryID    string      `json:"industryId"`
	BatchCode     string      `json:"batchCode"`
	Height        float64     `json:"height"`        // cm
	Width         float64     `json:"width"`         // cm
	Thickness     float64     `json:"thickness"`     // cm
	QuantitySlabs int         `json:"quantitySlabs"` // quantidade de chapas
	TotalArea     float64     `json:"totalArea"`     // m² (calculado)
	IndustryPrice float64     `json:"industryPrice"` // preço base da indústria
	OriginQuarry  *string     `json:"originQuarry,omitempty"`
	EntryDate     time.Time   `json:"entryDate"`
	Status        BatchStatus `json:"status"`
	IsActive      bool        `json:"isActive"`
	Medias        []Media     `json:"medias,omitempty"`
	Product       *Product    `json:"product,omitempty"` // Populated quando necessário
	CreatedAt     time.Time   `json:"createdAt"`
	UpdatedAt     time.Time   `json:"updatedAt"`
}

// CalculateTotalArea calcula a área total do lote
func (b *Batch) CalculateTotalArea() {
	// Fórmula: (altura * largura * quantidade) / 10000
	// Resultado em m²
	b.TotalArea = (b.Height * b.Width * float64(b.QuantitySlabs)) / 10000
}

// IsAvailable verifica se o lote está disponível
func (b *Batch) IsAvailable() bool {
	return b.Status == BatchStatusDisponivel && b.IsActive
}

// CreateBatchInput representa os dados para criar um lote
type CreateBatchInput struct {
	ProductID     string  `json:"productId" validate:"required,uuid"`
	BatchCode     string  `json:"batchCode" validate:"required,batchcode"` // AAA-999999
	Height        float64 `json:"height" validate:"required,gt=0,lte=1000"`
	Width         float64 `json:"width" validate:"required,gt=0,lte=1000"`
	Thickness     float64 `json:"thickness" validate:"required,gt=0,lte=100"`
	QuantitySlabs int     `json:"quantitySlabs" validate:"required,gt=0"`
	IndustryPrice float64 `json:"industryPrice" validate:"required,gt=0"`
	OriginQuarry  *string `json:"originQuarry,omitempty" validate:"omitempty,max=100"`
	EntryDate     string  `json:"entryDate" validate:"required"` // ISO date
}

// UpdateBatchInput representa os dados para atualizar um lote
type UpdateBatchInput struct {
	BatchCode     *string  `json:"batchCode,omitempty" validate:"omitempty,batchcode"`
	Height        *float64 `json:"height,omitempty" validate:"omitempty,gt=0,lte=1000"`
	Width         *float64 `json:"width,omitempty" validate:"omitempty,gt=0,lte=1000"`
	Thickness     *float64 `json:"thickness,omitempty" validate:"omitempty,gt=0,lte=100"`
	QuantitySlabs *int     `json:"quantitySlabs,omitempty" validate:"omitempty,gt=0"`
	IndustryPrice *float64 `json:"industryPrice,omitempty" validate:"omitempty,gt=0"`
	OriginQuarry  *string  `json:"originQuarry,omitempty" validate:"omitempty,max=100"`
}

// UpdateBatchStatusInput representa os dados para atualizar o status de um lote
type UpdateBatchStatusInput struct {
	Status BatchStatus `json:"status" validate:"required,oneof=DISPONIVEL RESERVADO VENDIDO INATIVO"`
}

// BatchFilters representa os filtros para busca de lotes
type BatchFilters struct {
	ProductID *string      `json:"productId,omitempty"`
	Status    *BatchStatus `json:"status,omitempty"`
	Code      *string      `json:"code,omitempty"` // Busca parcial
	Page      int          `json:"page" validate:"min=1"`
	Limit     int          `json:"limit" validate:"min=1,max=100"`
}

// BatchListResponse representa a resposta de listagem de lotes
type BatchListResponse struct {
	Batches []Batch `json:"batches"`
	Total   int     `json:"total"`
	Page    int     `json:"page"`
}
