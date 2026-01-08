-- =============================================
-- Migration: 000005_create_batch_tables
-- Description: Cria tabelas de lotes e mídias de lotes
-- =============================================

-- Tabela: Lotes (Estoque Físico)
CREATE TABLE batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    industry_id UUID NOT NULL REFERENCES industries(id) ON DELETE CASCADE,
    batch_code VARCHAR(100) NOT NULL,
    
    -- Dimensões físicas
    height DECIMAL(8,2) NOT NULL CHECK (height > 0),
    width DECIMAL(8,2) NOT NULL CHECK (width > 0),
    thickness DECIMAL(8,2) NOT NULL CHECK (thickness > 0),
    quantity_slabs INTEGER DEFAULT 1 CHECK (quantity_slabs > 0),
    net_area DECIMAL(10,2) GENERATED ALWAYS AS ((height * width * quantity_slabs) / 10000) STORED,
    
    -- Preço e status
    industry_price DECIMAL(12,2) NOT NULL CHECK (industry_price > 0),
    status batch_status_type DEFAULT 'DISPONIVEL',
    origin_quarry VARCHAR(255),
    
    -- Timestamps
    entry_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Índices para batches
CREATE INDEX idx_batches_product_id ON batches(product_id);
CREATE INDEX idx_batches_industry_id ON batches(industry_id);
CREATE INDEX idx_batches_status ON batches(status);
CREATE INDEX idx_batches_code ON batches(batch_code);
CREATE INDEX idx_batches_available ON batches(industry_id, status, is_active) 
    WHERE status = 'DISPONIVEL' AND is_active = TRUE;
CREATE INDEX idx_batches_product_status ON batches(product_id, status, is_active) 
    WHERE is_active = TRUE;

-- Constraint: batch_code único por indústria
CREATE UNIQUE INDEX idx_batches_unique_code ON batches(industry_id, batch_code);

-- Comentários
COMMENT ON TABLE batches IS 'Lotes físicos de estoque';
COMMENT ON COLUMN batches.batch_code IS 'Código do lote (formato: AAA-999999)';
COMMENT ON COLUMN batches.height IS 'Altura em centímetros';
COMMENT ON COLUMN batches.width IS 'Largura em centímetros';
COMMENT ON COLUMN batches.thickness IS 'Espessura em centímetros';
COMMENT ON COLUMN batches.quantity_slabs IS 'Quantidade de chapas no lote';
COMMENT ON COLUMN batches.net_area IS 'Área total em m² (calculada automaticamente)';
COMMENT ON COLUMN batches.industry_price IS 'Preço base da indústria';
COMMENT ON COLUMN batches.origin_quarry IS 'Pedreira de origem';

-- Tabela: Mídias de Lotes
CREATE TABLE batch_medias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    url VARCHAR(500) NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para batch_medias
CREATE INDEX idx_batch_medias_batch_id ON batch_medias(batch_id);
CREATE INDEX idx_batch_medias_display_order ON batch_medias(batch_id, display_order);

-- Comentários
COMMENT ON TABLE batch_medias IS 'Mídias (fotos reais) dos lotes';

-- Trigger para atualizar updated_at
CREATE TRIGGER update_batches_updated_at
    BEFORE UPDATE ON batches
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();