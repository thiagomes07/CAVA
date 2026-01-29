-- Reverter adição dos campos de contato separados

-- Remover índices
DROP INDEX IF EXISTS idx_clientes_email;
DROP INDEX IF EXISTS idx_clientes_phone;

-- Remover colunas
ALTER TABLE clientes DROP COLUMN IF EXISTS email;
ALTER TABLE clientes DROP COLUMN IF EXISTS phone;
ALTER TABLE clientes DROP COLUMN IF EXISTS whatsapp;
