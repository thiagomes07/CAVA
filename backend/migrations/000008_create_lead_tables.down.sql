-- =============================================
-- Rollback: 000008_create_cliente_tables
-- =============================================

-- Remover triggers
DROP TRIGGER IF EXISTS update_cliente_interaction_timestamp ON cliente_interactions;
DROP TRIGGER IF EXISTS update_clientes_updated_at ON clientes;

-- Remover funções
DROP FUNCTION IF EXISTS update_cliente_last_interaction();

-- Remover tabelas (ordem reversa)
DROP TABLE IF EXISTS cliente_subscriptions;
DROP TABLE IF EXISTS cliente_interactions;
DROP TABLE IF EXISTS clientes;