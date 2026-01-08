-- =============================================
-- Migration: 000004_create_product_tables
-- Description: Cria tabelas de produtos e mídias de produtos
-- =============================================

-- Tabela: Produtos (Tipos de Pedra)
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    industry_id UUID NOT NULL REFERENCES industries(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    sku_code VARCHAR(100),
    description TEXT,
    material_type VARCHAR(100),
    finish_type finish_type_enum DEFAULT 'POLIDO',
    is_public_catalog BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Índices para products
CREATE INDEX idx_products_industry_id ON products(industry_id);
CREATE INDEX idx_products_material_type ON products(material_type);
CREATE INDEX idx_products_deleted_at ON products(deleted_at);
CREATE INDEX idx_products_active ON products(industry_id, deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_name_search ON products USING gin(to_tsvector('portuguese', name));

-- Comentários
COMMENT ON TABLE products IS 'Catálogo de produtos (tipos de pedra)';
COMMENT ON COLUMN products.sku_code IS 'Código interno do produto';
COMMENT ON COLUMN products.material_type IS 'Tipo de material: GRANITO, MARMORE, QUARTZITO, etc';
COMMENT ON COLUMN products.is_public_catalog IS 'Se aparece na vitrine pública';
COMMENT ON COLUMN products.deleted_at IS 'Soft delete - timestamp de exclusão';

-- Tabela: Mídias de Produtos
CREATE TABLE product_medias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    url VARCHAR(500) NOT NULL,
    display_order INTEGER DEFAULT 0,
    is_cover BOOLEAN DEFAULT FALSE,
    media_type media_type_enum DEFAULT 'IMAGE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para product_medias
CREATE INDEX idx_product_medias_product_id ON product_medias(product_id);
CREATE INDEX idx_product_medias_display_order ON product_medias(product_id, display_order);
CREATE INDEX idx_product_medias_cover ON product_medias(product_id, is_cover) WHERE is_cover = TRUE;

-- Comentários
COMMENT ON TABLE product_medias IS 'Mídias (fotos/vídeos) de marketing dos produtos';
COMMENT ON COLUMN product_medias.display_order IS 'Ordem de exibição das mídias';
COMMENT ON COLUMN product_medias.is_cover IS 'Se é a imagem de capa';

-- Trigger para atualizar updated_at
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Constraint: apenas uma imagem de capa por produto
CREATE UNIQUE INDEX idx_product_medias_unique_cover 
    ON product_medias(product_id) 
    WHERE is_cover = TRUE;