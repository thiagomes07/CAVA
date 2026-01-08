-- =============================================
-- Rollback: 000005_create_batch_tables
-- =============================================

-- Remover triggers
DROP TRIGGER IF EXISTS update_batches_updated_at ON batches;

-- Remover tabelas (ordem reversa)
DROP TABLE IF EXISTS batch_medias;
DROP TABLE IF EXISTS batches;