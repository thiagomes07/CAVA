-- =============================================
-- Rollback: 000010_create_indexes
-- =============================================

-- Remover índices adicionais
DROP INDEX IF EXISTS idx_sales_history_commission_calc;
DROP INDEX IF EXISTS idx_sales_links_public_active;
DROP INDEX IF EXISTS idx_reservations_expired;
DROP INDEX IF EXISTS idx_clientes_created_desc;
DROP INDEX IF EXISTS idx_batches_entry_date_desc;
DROP INDEX IF EXISTS idx_products_created_desc;
DROP INDEX IF EXISTS idx_sales_links_user_type_active;
DROP INDEX IF EXISTS idx_batches_industry_product_status;
DROP INDEX IF EXISTS idx_clientes_name_trgm;
DROP INDEX IF EXISTS idx_products_name_trgm;
DROP INDEX IF EXISTS idx_shared_inventory_count;
DROP INDEX IF EXISTS idx_sales_monthly_summary;
DROP INDEX IF EXISTS idx_batches_count_by_status;