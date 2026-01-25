-- =============================================
-- Migration: 000017_add_public_catalog_fields
-- Description: Adiciona campos para catálogo público de depósitos
-- =============================================

-- Adicionar campos em industries
ALTER TABLE industries ADD COLUMN city VARCHAR(100) DEFAULT NULL;
ALTER TABLE industries ADD COLUMN state VARCHAR(2) DEFAULT NULL;
ALTER TABLE industries ADD COLUMN banner_url VARCHAR(500) DEFAULT NULL;
ALTER TABLE industries ADD COLUMN logo_url VARCHAR(500) DEFAULT NULL;
ALTER TABLE industries ADD COLUMN is_public BOOLEAN DEFAULT FALSE;

-- Adicionar campo is_public em batches
ALTER TABLE batches ADD COLUMN is_public BOOLEAN DEFAULT FALSE;

-- Índices para busca pública
CREATE INDEX idx_industries_public ON industries(is_public) WHERE is_public = TRUE;
CREATE INDEX idx_batches_public ON batches(industry_id, is_public, deleted_at) WHERE is_public = TRUE AND deleted_at IS NULL;

-- Comentários
COMMENT ON COLUMN industries.city IS 'Cidade do depósito';
COMMENT ON COLUMN industries.state IS 'Estado do depósito (UF)';
COMMENT ON COLUMN industries.banner_url IS 'URL do banner personalizado do depósito';
COMMENT ON COLUMN industries.logo_url IS 'URL do logo personalizado do depósito';
COMMENT ON COLUMN industries.is_public IS 'Se o depósito aparece no catálogo público';
COMMENT ON COLUMN batches.is_public IS 'Se o lote aparece na página pública do depósito';
