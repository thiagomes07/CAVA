package entity

import (
	"time"
)

// SharedInventoryBatch representa um lote compartilhado com um broker ou vendedor interno
type SharedInventoryBatch struct {
	ID                  string    `json:"id"`
	BatchID             string    `json:"batchId"`
	SharedWithUserID    string    `json:"sharedWithUserId"` // Broker ou Vendedor Interno
	IndustryOwnerID     string    `json:"industryOwnerId"`
	NegotiatedPrice     *float64  `json:"negotiatedPrice,omitempty"`     // Preço negociado por m² (se diferente do lote)
	NegotiatedPriceUnit PriceUnit `json:"negotiatedPriceUnit"`           // Unidade do preço negociado
	SharedAt            time.Time `json:"sharedAt"`
	IsActive            bool      `json:"isActive"`
	Batch               *Batch    `json:"batch,omitempty"`               // Populated quando necessário
	SharedWith          *User     `json:"sharedWith,omitempty"`          // Populated quando necessário (broker ou vendedor)

	// Campos calculados (não persistidos, preenchidos na API)
	EffectivePrice     float64 `json:"effectivePrice,omitempty"`     // Preço efetivo por m² (negociado ou do lote)
	EffectiveSlabPrice float64 `json:"effectiveSlabPrice,omitempty"` // Preço efetivo da chapa (calculado)
}

// GetEffectivePrice retorna o preço efetivo por m² (negociado se existir, senão do lote)
func (s *SharedInventoryBatch) GetEffectivePrice() float64 {
	if s.NegotiatedPrice != nil && *s.NegotiatedPrice > 0 {
		// Converte para M2 se necessário
		return ConvertPrice(*s.NegotiatedPrice, s.NegotiatedPriceUnit, PriceUnitM2)
	}
	if s.Batch != nil {
		return s.Batch.GetPriceInUnit(PriceUnitM2)
	}
	return 0
}

// GetEffectiveSlabPrice retorna o preço efetivo da chapa
func (s *SharedInventoryBatch) GetEffectiveSlabPrice() float64 {
	if s.Batch == nil {
		return 0
	}
	effectivePricePerM2 := s.GetEffectivePrice()
	slabArea := s.Batch.CalculateSlabArea()
	return effectivePricePerM2 * slabArea
}

// PopulateCalculatedFields preenche os campos calculados
func (s *SharedInventoryBatch) PopulateCalculatedFields() {
	s.EffectivePrice = s.GetEffectivePrice()
	s.EffectiveSlabPrice = s.GetEffectiveSlabPrice()
	// Também preenche os campos calculados do batch
	if s.Batch != nil {
		s.Batch.PopulateCalculatedFields()
	}
}

// CreateSharedInventoryInput representa os dados para compartilhar um lote
type CreateSharedInventoryInput struct {
	BatchID             string    `json:"batchId" validate:"required,uuid"`
	SharedWithUserID    string    `json:"sharedWithUserId" validate:"required,uuid"` // Broker ou Vendedor Interno
	NegotiatedPrice     *float64  `json:"negotiatedPrice,omitempty" validate:"omitempty,gt=0"`
	NegotiatedPriceUnit PriceUnit `json:"negotiatedPriceUnit,omitempty" validate:"omitempty,oneof=M2 FT2"`
}

// UpdateNegotiatedPriceInput representa os dados para atualizar o preço negociado
type UpdateNegotiatedPriceInput struct {
	NegotiatedPrice     *float64  `json:"negotiatedPrice,omitempty" validate:"omitempty,gt=0"`
	NegotiatedPriceUnit PriceUnit `json:"negotiatedPriceUnit,omitempty" validate:"omitempty,oneof=M2 FT2"`
}

// SharedCatalogPermission representa a permissão de acesso ao catálogo geral
type SharedCatalogPermission struct {
	ID            string    `json:"id"`
	IndustryID    string    `json:"industryId"`
	SharedWithUserID string `json:"sharedWithUserId"` // Broker ou Vendedor Interno
	CanShowPrices bool      `json:"canShowPrices"`
	GrantedAt     time.Time `json:"grantedAt"`
	IsActive      bool      `json:"isActive"`
}

// CreateSharedCatalogInput representa os dados para compartilhar o catálogo
type CreateSharedCatalogInput struct {
	SharedWithUserID string `json:"sharedWithUserId" validate:"required,uuid"` // Broker ou Vendedor Interno
	CanShowPrices    bool   `json:"canShowPrices"`
}

// SharedInventoryFilters representa os filtros para inventário compartilhado
type SharedInventoryFilters struct {
	Recent bool   `json:"recent,omitempty"` // Se true, retorna itens recentes
	Status string `json:"status,omitempty"` // Filtrar por status do lote
	Limit  int    `json:"limit,omitempty" validate:"omitempty,min=1,max=100"`
}
