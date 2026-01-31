-- =============================================
-- Migration: 000003_create_tables (DOWN)
-- Description: Remove todas as tabelas
-- =============================================

-- Remover tabelas em ordem reversa (respeitando foreign keys)
DROP TABLE IF EXISTS catalog_link_batches;
DROP TABLE IF EXISTS catalog_links;
DROP TABLE IF EXISTS password_reset_tokens;
DROP TABLE IF EXISTS user_sessions;
DROP TABLE IF EXISTS sales_history;
DROP TABLE IF EXISTS reservations;
DROP TABLE IF EXISTS cliente_subscriptions;
DROP TABLE IF EXISTS cliente_interactions;
DROP TABLE IF EXISTS clientes;
DROP TABLE IF EXISTS sales_link_items;
DROP TABLE IF EXISTS sales_links;
DROP TABLE IF EXISTS shared_catalog_permissions;
DROP TABLE IF EXISTS shared_inventory_batches;
DROP TABLE IF EXISTS batch_medias;
DROP TABLE IF EXISTS batches;
DROP TABLE IF EXISTS product_medias;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS industries;
