-- =============================================
-- Migration: 000018_create_catalog_links
-- Description: Cria tabelas para links de catálogo personalizados
-- =============================================

-- Tabela: Catalog Links
CREATE TABLE catalog_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    industry_id UUID NOT NULL REFERENCES industries(id) ON DELETE CASCADE,
    slug_token VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(100),
    custom_message TEXT,
    views_count INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de relacionamento: Catalog Link Batches (muitos-para-muitos)
CREATE TABLE catalog_link_batches (
    catalog_link_id UUID NOT NULL REFERENCES catalog_links(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (catalog_link_id, batch_id)
);

-- Índices
CREATE INDEX idx_catalog_links_slug_token ON catalog_links(slug_token);
CREATE INDEX idx_catalog_links_industry_id ON catalog_links(industry_id);
CREATE INDEX idx_catalog_links_active ON catalog_links(is_active, expires_at) WHERE is_active = TRUE;
CREATE INDEX idx_catalog_link_batches_link_id ON catalog_link_batches(catalog_link_id);
CREATE INDEX idx_catalog_link_batches_batch_id ON catalog_link_batches(batch_id);
CREATE INDEX idx_catalog_link_batches_display_order ON catalog_link_batches(catalog_link_id, display_order);

-- Comentários
COMMENT ON TABLE catalog_links IS 'Links de catálogo público personalizados';
COMMENT ON TABLE catalog_link_batches IS 'Relacionamento entre links de catálogo e lotes';

-- Trigger para atualizar updated_at
CREATE TRIGGER update_catalog_links_updated_at
    BEFORE UPDATE ON catalog_links
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
