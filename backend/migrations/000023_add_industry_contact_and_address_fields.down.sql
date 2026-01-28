-- =============================================
-- Migration: 000023_add_industry_contact_and_address_fields (Rollback)
-- =============================================

-- Remover campos de endereço
ALTER TABLE industries DROP COLUMN IF EXISTS address_zip_code;
ALTER TABLE industries DROP COLUMN IF EXISTS address_number;
ALTER TABLE industries DROP COLUMN IF EXISTS address_street;
ALTER TABLE industries DROP COLUMN IF EXISTS address_city;
ALTER TABLE industries DROP COLUMN IF EXISTS address_state;
ALTER TABLE industries DROP COLUMN IF EXISTS address_country;

-- Remover campos de contato
ALTER TABLE industries DROP COLUMN IF EXISTS description;
ALTER TABLE industries DROP COLUMN IF EXISTS whatsapp;
