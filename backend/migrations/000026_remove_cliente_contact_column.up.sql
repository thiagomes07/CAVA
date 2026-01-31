-- Remover coluna contact da tabela clientes (deprecated)

-- Remover índice antigo
DROP INDEX IF EXISTS idx_clientes_contact;

-- Remover coluna
ALTER TABLE clientes DROP COLUMN IF EXISTS contact;
