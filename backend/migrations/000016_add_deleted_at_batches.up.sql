-- =============================================
-- Migration: 000016_add_deleted_at_batches
-- Description: Adiciona coluna deleted_at para soft delete de lotes
-- =============================================

ALTER TABLE batches ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

CREATE INDEX idx_batches_deleted_at ON batches(deleted_at) WHERE deleted_at IS NULL;

COMMENT ON COLUMN batches.deleted_at IS 'Data de exclusão (soft delete)';
