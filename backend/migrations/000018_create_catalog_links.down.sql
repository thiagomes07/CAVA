-- =============================================
-- Migration: 000018_create_catalog_links (down)
-- Description: Remove tabelas de catalog links
-- =============================================

DROP TRIGGER IF EXISTS update_catalog_links_updated_at ON catalog_links;
DROP TABLE IF EXISTS catalog_link_batches;
DROP TABLE IF EXISTS catalog_links;
