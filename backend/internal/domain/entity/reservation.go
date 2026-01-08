package entity

import (
	"time"
)

// ReservationStatus representa o status de uma reserva
type ReservationStatus string

const (
	ReservationStatusAtiva           ReservationStatus = "ATIVA"
	ReservationStatusConfirmadaVenda ReservationStatus = "CONFIRMADA_VENDA"
	ReservationStatusExpirada        ReservationStatus = "EXPIRADA"
	ReservationStatusCancelada       ReservationStatus = "CANCELADA"
)

// IsValid verifica se o status da reserva é válido
func (r ReservationStatus) IsValid() bool {
	switch r {
	case ReservationStatusAtiva, ReservationStatusConfirmadaVenda,
		ReservationStatusExpirada, ReservationStatusCancelada:
		return true
	}
	return false
}

// Reservation representa uma reserva de lote
type Reservation struct {
	ID         string            `json:"id"`
	BatchID    string            `json:"batchId"`
	LeadID     *string           `json:"leadId,omitempty"`
	ReservedByUserID string      `json:"reservedByUserId"`
	Status     ReservationStatus `json:"status"`
	Notes      *string           `json:"notes,omitempty"`
	ExpiresAt  time.Time         `json:"expiresAt"`
	CreatedAt  time.Time         `json:"createdAt"`
	IsActive   bool              `json:"isActive"`
	Batch      *Batch            `json:"batch,omitempty"`      // Populated quando necessário
	Lead       *Lead             `json:"lead,omitempty"`       // Populated quando necessário
	ReservedBy *User             `json:"reservedBy,omitempty"` // Populated quando necessário
}

// IsExpired verifica se a reserva está expirada
func (r *Reservation) IsExpired() bool {
	return time.Now().After(r.ExpiresAt) && r.Status == ReservationStatusAtiva
}

// CreateReservationInput representa os dados para criar uma reserva
type CreateReservationInput struct {
	BatchID         string  `json:"batchId" validate:"required,uuid"`
	LeadID          *string `json:"leadId,omitempty" validate:"omitempty,uuid"`
	CustomerName    *string `json:"customerName,omitempty" validate:"omitempty,min=2"`
	CustomerContact *string `json:"customerContact,omitempty"`
	ExpiresAt       *string `json:"expiresAt,omitempty"` // ISO date, default +7 dias
	Notes           *string `json:"notes,omitempty" validate:"omitempty,max=500"`
}

// ConfirmSaleInput representa os dados para confirmar uma venda
type ConfirmSaleInput struct {
	FinalSoldPrice float64 `json:"finalSoldPrice" validate:"required,gt=0"`
	InvoiceURL     *string `json:"invoiceUrl,omitempty" validate:"omitempty,url"`
	Notes          *string `json:"notes,omitempty" validate:"omitempty,max=1000"`
}

// ReservationFilters representa os filtros para busca de reservas
type ReservationFilters struct {
	BatchID *string            `json:"batchId,omitempty"`
	Status  *ReservationStatus `json:"status,omitempty"`
	Page    int                `json:"page" validate:"min=1"`
	Limit   int                `json:"limit" validate:"min=1,max=100"`
}