-- =============================================
-- Rollback: 000007_create_sales_tables
-- =============================================

-- Remover triggers
DROP TRIGGER IF EXISTS validate_sales_link_fields ON sales_links;
DROP TRIGGER IF EXISTS update_sales_links_updated_at ON sales_links;

-- Remover funções
DROP FUNCTION IF EXISTS validate_sales_link_polymorphism();

-- Remover tabelas
DROP TABLE IF EXISTS sales_links;