-- =============================================
-- Migration: 000027_update_reservation_status (DOWN)
-- Description: Remove novos status de reserva
-- =============================================

-- Remover indices
DROP INDEX IF EXISTS idx_reservations_pending_approval;
DROP INDEX IF EXISTS idx_reservations_approved;

-- Remover colunas de aprovacao
ALTER TABLE reservations DROP COLUMN IF EXISTS approved_by;
ALTER TABLE reservations DROP COLUMN IF EXISTS approved_at;
ALTER TABLE reservations DROP COLUMN IF EXISTS rejection_reason;
ALTER TABLE reservations DROP COLUMN IF EXISTS approval_expires_at;

-- Nota: Nao e possivel remover valores de enum no PostgreSQL
-- Os valores PENDENTE_APROVACAO, APROVADA, REJEITADA permanecerao no tipo
