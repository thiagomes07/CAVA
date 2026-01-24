-- =============================================
-- Migration: 000016_add_deleted_at_batches (down)
-- Description: Remove coluna deleted_at de lotes
-- =============================================

DROP INDEX IF EXISTS idx_batches_deleted_at;
ALTER TABLE batches DROP COLUMN IF EXISTS deleted_at;
