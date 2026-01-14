package entity

import (
	"time"
)

// SharedInventoryBatch representa um lote compartilhado com um broker
type SharedInventoryBatch struct {
	ID                  string    `json:"id"`
	BatchID             string    `json:"batchId"`
	BrokerUserID        string    `json:"brokerUserId"`
	IndustryOwnerID     string    `json:"industryOwnerId"`
	NegotiatedPrice     *float64  `json:"negotiatedPrice,omitempty"`
	NegotiatedPriceUnit PriceUnit `json:"negotiatedPriceUnit"` // Unidade do preço negociado
	SharedAt            time.Time `json:"sharedAt"`
	IsActive            bool      `json:"isActive"`
	Batch               *Batch    `json:"batch,omitempty"`  // Populated quando necessário
	Broker              *User     `json:"broker,omitempty"` // Populated quando necessário
}

// CreateSharedInventoryInput representa os dados para compartilhar um lote
type CreateSharedInventoryInput struct {
	BatchID             string    `json:"batchId" validate:"required,uuid"`
	BrokerUserID        string    `json:"brokerUserId" validate:"required,uuid"`
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
	BrokerUserID  string    `json:"brokerUserId"`
	CanShowPrices bool      `json:"canShowPrices"`
	GrantedAt     time.Time `json:"grantedAt"`
	IsActive      bool      `json:"isActive"`
}

// CreateSharedCatalogInput representa os dados para compartilhar o catálogo
type CreateSharedCatalogInput struct {
	BrokerUserID  string `json:"brokerUserId" validate:"required,uuid"`
	CanShowPrices bool   `json:"canShowPrices"`
}

// SharedInventoryFilters representa os filtros para inventário compartilhado
type SharedInventoryFilters struct {
	Recent bool   `json:"recent,omitempty"` // Se true, retorna itens recentes
	Status string `json:"status,omitempty"` // Filtrar por status do lote
	Limit  int    `json:"limit,omitempty" validate:"omitempty,min=1,max=100"`
}
