-- =============================================
-- Migration: 000017_add_public_catalog_fields (down)
-- Description: Remove campos de catálogo público
-- =============================================

DROP INDEX IF EXISTS idx_batches_public;
DROP INDEX IF EXISTS idx_industries_public;

ALTER TABLE batches DROP COLUMN IF EXISTS is_public;
ALTER TABLE industries DROP COLUMN IF EXISTS is_public;
ALTER TABLE industries DROP COLUMN IF EXISTS logo_url;
ALTER TABLE industries DROP COLUMN IF EXISTS banner_url;
ALTER TABLE industries DROP COLUMN IF EXISTS state;
ALTER TABLE industries DROP COLUMN IF EXISTS city;
