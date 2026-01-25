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
	NegotiatedPrice     *float64  `json:"negotiatedPrice,omitempty"`
	NegotiatedPriceUnit PriceUnit `json:"negotiatedPriceUnit"` // Unidade do preço negociado
	SharedAt            time.Time `json:"sharedAt"`
	IsActive            bool      `json:"isActive"`
	Batch               *Batch    `json:"batch,omitempty"`  // Populated quando necessário
	SharedWith          *User     `json:"sharedWith,omitempty"` // Populated quando necessário (broker ou vendedor)
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
