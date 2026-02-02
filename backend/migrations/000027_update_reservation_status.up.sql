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


