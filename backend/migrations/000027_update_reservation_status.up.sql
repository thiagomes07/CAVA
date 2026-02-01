-- =============================================
-- Migration: 000027_update_reservation_status
-- Description: Adiciona novos status de reserva para fluxo de aprovacao
-- =============================================

-- Adicionar novos valores ao enum de status de reserva
ALTER TYPE reservation_status_type ADD VALUE IF NOT EXISTS 'PENDENTE_APROVACAO';
ALTER TYPE reservation_status_type ADD VALUE IF NOT EXISTS 'APROVADA';
ALTER TYPE reservation_status_type ADD VALUE IF NOT EXISTS 'REJEITADA';

-- Adicionar campos de aprovacao na tabela reservations
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id);
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS approval_expires_at TIMESTAMP WITH TIME ZONE;

-- Indice para reservas pendentes de aprovacao
CREATE INDEX IF NOT EXISTS idx_reservations_pending_approval
ON reservations(status, created_at)
WHERE status = 'PENDENTE_APROVACAO';

-- Indice para reservas aprovadas
CREATE INDEX IF NOT EXISTS idx_reservations_approved
ON reservations(status, approved_at)
WHERE status = 'APROVADA';

-- Comentarios
COMMENT ON COLUMN reservations.approved_by IS 'Usuario admin que aprovou a reserva';
COMMENT ON COLUMN reservations.approved_at IS 'Data/hora da aprovacao';
COMMENT ON COLUMN reservations.rejection_reason IS 'Motivo da rejeicao (quando rejeitada)';
COMMENT ON COLUMN reservations.approval_expires_at IS 'Prazo para admin aprovar a reserva';
