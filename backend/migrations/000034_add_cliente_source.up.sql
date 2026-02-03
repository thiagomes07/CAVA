-- =============================================
-- Migration: 000034_add_cliente_source
-- Description: Adiciona campo source para identificar origem do cliente/lead
-- =============================================

-- Adiciona coluna source para identificar de onde o cliente veio
ALTER TABLE clientes 
ADD COLUMN source VARCHAR(50) DEFAULT 'MANUAL';

-- Adiciona coluna industry_id para vincular leads diretos à indústria (sem sales_link)
ALTER TABLE clientes 
ADD COLUMN industry_id UUID REFERENCES industries(id) ON DELETE CASCADE;

COMMENT ON COLUMN clientes.source IS 'Origem do cliente: MANUAL, PORTFOLIO, SALES_LINK, IMPORT';
COMMENT ON COLUMN clientes.industry_id IS 'Indústria dona do cliente (para leads capturados diretamente no portfolio)';

-- Cria índice para filtrar por source
CREATE INDEX idx_clientes_source ON clientes(source);
CREATE INDEX idx_clientes_industry_id ON clientes(industry_id);

-- Atualiza clientes existentes: se tem sales_link_id, source = SALES_LINK
UPDATE clientes SET source = 'SALES_LINK' WHERE sales_link_id IS NOT NULL;
