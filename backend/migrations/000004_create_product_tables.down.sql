-- =============================================
-- Rollback: 000004_create_product_tables
-- =============================================

-- Remover triggers
DROP TRIGGER IF EXISTS update_products_updated_at ON products;

-- Remover tabelas (ordem reversa)
DROP TABLE IF EXISTS product_medias;
DROP TABLE IF EXISTS products;