package entity

import (
	"time"
)

// ReservationStatus representa o status de uma reserva
type ReservationStatus string

const (
	// Status originais
	ReservationStatusAtiva           ReservationStatus = "ATIVA"
	ReservationStatusConfirmadaVenda ReservationStatus = "CONFIRMADA_VENDA"
	ReservationStatusExpirada        ReservationStatus = "EXPIRADA"
	ReservationStatusCancelada       ReservationStatus = "CANCELADA"

	// Novos status para fluxo de aprovação
	ReservationStatusPendenteAprovacao ReservationStatus = "PENDENTE_APROVACAO"
	ReservationStatusAprovada          ReservationStatus = "APROVADA"
	ReservationStatusRejeitada         ReservationStatus = "REJEITADA"
)

// IsValid verifica se o status da reserva é válido
func (r ReservationStatus) IsValid() bool {
	switch r {
	case ReservationStatusAtiva, ReservationStatusConfirmadaVenda,
		ReservationStatusExpirada, ReservationStatusCancelada,
		ReservationStatusPendenteAprovacao, ReservationStatusAprovada,
		ReservationStatusRejeitada:
		return true
	}
	return false
}

// IsPending verifica se a reserva está pendente de aprovação
func (r ReservationStatus) IsPending() bool {
	return r == ReservationStatusPendenteAprovacao
}

// IsApproved verifica se a reserva foi aprovada
func (r ReservationStatus) IsApproved() bool {
	return r == ReservationStatusAprovada || r == ReservationStatusAtiva
}

// CanBeConverted verifica se a reserva pode ser convertida em venda
func (r ReservationStatus) CanBeConverted() bool {
	return r == ReservationStatusAprovada || r == ReservationStatusAtiva
}

// Reservation representa uma reserva de lote
type Reservation struct {
	ID                    string            `json:"id"`
	BatchID               string            `json:"batchId"`
	IndustryID            *string           `json:"industryId,omitempty"`
	ClienteID             *string           `json:"clienteId,omitempty"`
	ReservedByUserID      string            `json:"reservedByUserId"`
	QuantitySlabsReserved int               `json:"quantitySlabsReserved"` // Quantidade de chapas reservadas
	Status                ReservationStatus `json:"status"`
	Notes                 *string           `json:"notes,omitempty"`
	ExpiresAt             time.Time         `json:"expiresAt"`
	CreatedAt             time.Time         `json:"createdAt"`
	IsActive              bool              `json:"isActive"`

	// Campos de preço do broker
	ReservedPrice   *float64 `json:"reservedPrice,omitempty"`   // Preço indicado pelo broker (visível para admin)
	BrokerSoldPrice *float64 `json:"brokerSoldPrice,omitempty"` // Preço interno do broker (só visível para o broker)

	// Campos de aprovação
	ApprovedBy        *string    `json:"approvedBy,omitempty"`
	ApprovedAt        *time.Time `json:"approvedAt,omitempty"`
	RejectionReason   *string    `json:"rejectionReason,omitempty"`
	ApprovalExpiresAt *time.Time `json:"approvalExpiresAt,omitempty"`

	// Relacionamentos (populated quando necessário)
	Batch          *Batch   `json:"batch,omitempty"`
	Cliente        *Cliente `json:"cliente,omitempty"`
	ReservedBy     *User    `json:"reservedBy,omitempty"`
	ApprovedByUser *User    `json:"approvedByUser,omitempty"`
}

// IsExpired verifica se a reserva está expirada
func (r *Reservation) IsExpired() bool {
	return time.Now().After(r.ExpiresAt) && r.Status == ReservationStatusAtiva
}

// CreateReservationInput representa os dados para criar uma reserva
type CreateReservationInput struct {
	BatchID               string   `json:"batchId" validate:"required,uuid"`
	QuantitySlabsReserved int      `json:"quantitySlabsReserved" validate:"required,gt=0"`
	ClienteID             *string  `json:"clienteId,omitempty" validate:"omitempty,uuid"`
	CustomerName          *string  `json:"customerName,omitempty" validate:"omitempty,min=2"`
	CustomerContact       *string  `json:"customerContact,omitempty"`
	ReservedPrice         *float64 `json:"reservedPrice,omitempty" validate:"omitempty,gt=0"`   // Preço indicado pelo broker
	BrokerSoldPrice       *float64 `json:"brokerSoldPrice,omitempty" validate:"omitempty,gt=0"` // Preço interno do broker
	ExpiresAt             *string  `json:"expiresAt,omitempty"`                                 // ISO date, default +7 dias
	Notes                 *string  `json:"notes,omitempty" validate:"omitempty,max=500"`
}

// ConfirmSaleInput representa os dados para confirmar uma venda
type ConfirmSaleInput struct {
	QuantitySlabsSold int     `json:"quantitySlabsSold" validate:"required,gt=0"`
	FinalSoldPrice    float64 `json:"finalSoldPrice" validate:"required,gt=0"`
	InvoiceURL        *string `json:"invoiceUrl,omitempty" validate:"omitempty,url"`
	Notes             *string `json:"notes,omitempty" validate:"omitempty,max=1000"`
}

// ReservationFilters representa os filtros para busca de reservas
type ReservationFilters struct {
	BatchID    *string            `json:"batchId,omitempty"`
	IndustryID *string            `json:"industryId,omitempty"`
	BrokerID   *string            `json:"brokerId,omitempty"`
	Status     *ReservationStatus `json:"status,omitempty"`
	Page       int                `json:"page" validate:"min=1"`
	Limit      int                `json:"limit" validate:"min=1,max=100"`
}

// ApproveReservationInput representa os dados para aprovar uma reserva
type ApproveReservationInput struct {
	ReservationID string `json:"reservationId" validate:"required,uuid"`
	ApproverID    string `json:"approverId" validate:"required,uuid"`
}

// RejectReservationInput representa os dados para rejeitar uma reserva
type RejectReservationInput struct {
	ReservationID string `json:"reservationId" validate:"required,uuid"`
	ApproverID    string `json:"approverId" validate:"required,uuid"`
	Reason        string `json:"reason" validate:"required,min=5,max=500"`
}
