-- Restaurar coluna contact na tabela clientes

ALTER TABLE clientes ADD COLUMN IF NOT EXISTS contact VARCHAR(255);

-- Restaurar dados do email ou phone
UPDATE clientes SET contact = COALESCE(email, phone) WHERE contact IS NULL;

-- Restaurar índice
CREATE INDEX IF NOT EXISTS idx_clientes_contact ON clientes(contact);
