-- =============================================
-- Rollback: 000003_create_core_tables
-- =============================================

-- Remover triggers
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_industries_updated_at ON industries;

-- Remover função de trigger
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Remover tabelas (ordem reversa devido a foreign keys)
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS industries;