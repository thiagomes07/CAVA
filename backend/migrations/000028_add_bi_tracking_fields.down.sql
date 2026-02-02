-- =============================================
-- Migration: 000028_add_bi_tracking_fields (DOWN)
-- Description: Remove campos de tracking de BI
-- =============================================

-- Remover indices
DROP INDEX IF EXISTS idx_batches_activity;
DROP INDEX IF EXISTS idx_sales_history_reservation;
DROP INDEX IF EXISTS idx_sales_history_source;
DROP INDEX IF EXISTS idx_clientes_source_batch;
DROP INDEX IF EXISTS idx_reservations_industry;
-- Indices movidos da 000027
DROP INDEX IF EXISTS idx_reservations_pending_approval;
DROP INDEX IF EXISTS idx_reservations_approved;

-- Remover colunas de batches
ALTER TABLE batches DROP COLUMN IF EXISTS total_views;
ALTER TABLE batches DROP COLUMN IF EXISTS total_reservations;
ALTER TABLE batches DROP COLUMN IF EXISTS conversion_count;
ALTER TABLE batches DROP COLUMN IF EXISTS last_activity_at;

-- Remover colunas de sales_links
ALTER TABLE sales_links DROP COLUMN IF EXISTS unique_visitors;
ALTER TABLE sales_links DROP COLUMN IF EXISTS leads_captured;
ALTER TABLE sales_links DROP COLUMN IF EXISTS conversions;

-- Remover colunas de sales_history
ALTER TABLE sales_history DROP COLUMN IF EXISTS reservation_id;
ALTER TABLE sales_history DROP COLUMN IF EXISTS days_to_close;
ALTER TABLE sales_history DROP COLUMN IF EXISTS source;

-- Remover colunas de clientes
ALTER TABLE clientes DROP COLUMN IF EXISTS created_by_user_id;
ALTER TABLE clientes DROP COLUMN IF EXISTS total_purchases;
ALTER TABLE clientes DROP COLUMN IF EXISTS total_spent;
ALTER TABLE clientes DROP COLUMN IF EXISTS source_batch_id;
ALTER TABLE clientes DROP COLUMN IF EXISTS first_contact_at;
ALTER TABLE clientes DROP COLUMN IF EXISTS converted_at;

-- Remover coluna de reservations
ALTER TABLE reservations DROP COLUMN IF EXISTS industry_id;
