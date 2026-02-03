-- =============================================
-- Migration: 000034_add_cliente_source (DOWN)
-- Description: Remove campo source e industry_id de clientes
-- =============================================

DROP INDEX IF EXISTS idx_clientes_source;
DROP INDEX IF EXISTS idx_clientes_industry_id;

ALTER TABLE clientes DROP COLUMN IF EXISTS source;
ALTER TABLE clientes DROP COLUMN IF EXISTS industry_id;
