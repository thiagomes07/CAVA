-- Adicionar campos separados para email, phone e whatsapp na tabela clientes
-- O campo contact existente será migrado para o campo apropriado

-- Adicionar novas colunas
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(20);

-- Migrar dados existentes do campo contact para email ou phone
-- Se contém @, é email; senão é telefone
UPDATE clientes 
SET email = contact 
WHERE contact LIKE '%@%';

UPDATE clientes 
SET phone = contact 
WHERE contact NOT LIKE '%@%' AND contact IS NOT NULL AND contact != '';

-- Criar índices para os novos campos
CREATE INDEX IF NOT EXISTS idx_clientes_email ON clientes(email);
CREATE INDEX IF NOT EXISTS idx_clientes_phone ON clientes(phone);

-- Comentários
COMMENT ON COLUMN clientes.email IS 'Email do cliente';
COMMENT ON COLUMN clientes.phone IS 'Telefone do cliente';
COMMENT ON COLUMN clientes.whatsapp IS 'Número do WhatsApp do cliente';
