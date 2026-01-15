-- =============================================
-- Migration: 000014_allow_manual_clientes (DOWN)
-- Description: Reverte alterações para clientes manuais
-- =============================================

-- Remover índice
DROP INDEX IF EXISTS idx_clientes_created_by;

-- Remover coluna created_by
ALTER TABLE clientes DROP COLUMN IF EXISTS created_by;

-- Remover clientes sem sales_link_id (necessário antes de restaurar NOT NULL)
DELETE FROM clientes WHERE sales_link_id IS NULL;

-- Restaurar constraint NOT NULL
ALTER TABLE clientes ALTER COLUMN sales_link_id SET NOT NULL;
