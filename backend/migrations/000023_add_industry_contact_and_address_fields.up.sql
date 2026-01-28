-- =============================================
-- Migration: 000023_add_industry_contact_and_address_fields
-- Description: Adiciona campos de contato e endereço à tabela industries
-- =============================================

-- Adicionar campos de contato
ALTER TABLE industries ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(20);
ALTER TABLE industries ADD COLUMN IF NOT EXISTS description TEXT;

-- Adicionar campos de endereço
ALTER TABLE industries ADD COLUMN IF NOT EXISTS address_country VARCHAR(100);
ALTER TABLE industries ADD COLUMN IF NOT EXISTS address_state VARCHAR(100);
ALTER TABLE industries ADD COLUMN IF NOT EXISTS address_city VARCHAR(255);
ALTER TABLE industries ADD COLUMN IF NOT EXISTS address_street VARCHAR(255);
ALTER TABLE industries ADD COLUMN IF NOT EXISTS address_number VARCHAR(50);
ALTER TABLE industries ADD COLUMN IF NOT EXISTS address_zip_code VARCHAR(20);

-- Comentários
COMMENT ON COLUMN industries.whatsapp IS 'Número do WhatsApp para contato';
COMMENT ON COLUMN industries.description IS 'Descrição da indústria/depósito';
COMMENT ON COLUMN industries.address_country IS 'País do endereço';
COMMENT ON COLUMN industries.address_state IS 'Estado do endereço';
COMMENT ON COLUMN industries.address_city IS 'Cidade do endereço';
COMMENT ON COLUMN industries.address_street IS 'Rua do endereço';
COMMENT ON COLUMN industries.address_number IS 'Número do endereço';
COMMENT ON COLUMN industries.address_zip_code IS 'CEP do endereço';
