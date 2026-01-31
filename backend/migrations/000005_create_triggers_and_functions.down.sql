-- =============================================
-- Migration: 000005_create_triggers_and_functions (DOWN)
-- Description: Remove funções e triggers
-- =============================================

-- Remover triggers
DROP TRIGGER IF EXISTS update_cliente_interaction_timestamp ON cliente_interactions;
DROP TRIGGER IF EXISTS validate_sales_link_fields ON sales_links;
DROP TRIGGER IF EXISTS update_catalog_links_updated_at ON catalog_links;
DROP TRIGGER IF EXISTS update_clientes_updated_at ON clientes;
DROP TRIGGER IF EXISTS update_sales_links_updated_at ON sales_links;
DROP TRIGGER IF EXISTS update_batches_updated_at ON batches;
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_industries_updated_at ON industries;

-- Remover funções
DROP FUNCTION IF EXISTS update_cliente_last_interaction();
DROP FUNCTION IF EXISTS validate_sales_link_polymorphism();
DROP FUNCTION IF EXISTS update_updated_at_column();
