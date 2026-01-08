-- =============================================
-- Migration: 000007_create_sales_tables
-- Description: Cria tabelas de links de venda públicos
-- =============================================

-- Tabela: Links de Venda (Polimórfica)
CREATE TABLE sales_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    industry_id UUID NOT NULL REFERENCES industries(id) ON DELETE CASCADE,
    
    -- Campos polimórficos
    batch_id UUID REFERENCES batches(id) ON DELETE SET NULL,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    
    -- Configurações do link
    link_type link_type_enum NOT NULL,
    slug_token VARCHAR(100) NOT NULL UNIQUE,
    title VARCHAR(255),
    custom_message TEXT,
    display_price DECIMAL(12,2) CHECK (display_price IS NULL OR display_price > 0),
    show_price BOOLEAN DEFAULT TRUE,
    
    -- Métricas e controle
    views_count INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para sales_links
CREATE INDEX idx_sales_links_slug ON sales_links(slug_token);
CREATE INDEX idx_sales_links_creator ON sales_links(created_by_user_id, is_active) 
    WHERE is_active = TRUE;
CREATE INDEX idx_sales_links_industry ON sales_links(industry_id);
CREATE INDEX idx_sales_links_type ON sales_links(link_type);
CREATE INDEX idx_sales_links_batch ON sales_links(batch_id) WHERE batch_id IS NOT NULL;
CREATE INDEX idx_sales_links_product ON sales_links(product_id) WHERE product_id IS NOT NULL;
CREATE INDEX idx_sales_links_active_not_expired ON sales_links(is_active, expires_at) 
    WHERE is_active = TRUE AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP);

-- Comentários
COMMENT ON TABLE sales_links IS 'Links públicos de venda (landing pages)';
COMMENT ON COLUMN sales_links.slug_token IS 'Token único da URL (ex: marmore-carrara-2024)';
COMMENT ON COLUMN sales_links.link_type IS 'Tipo: LOTE_UNICO, PRODUTO_GERAL ou CATALOGO_COMPLETO';
COMMENT ON COLUMN sales_links.display_price IS 'Preço exibido ao cliente final';
COMMENT ON COLUMN sales_links.show_price IS 'Se exibe preço ou "Sob Consulta"';
COMMENT ON COLUMN sales_links.views_count IS 'Contador de visualizações';

-- Trigger para atualizar updated_at
CREATE TRIGGER update_sales_links_updated_at
    BEFORE UPDATE ON sales_links
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Constraint: validação de campos polimórficos
-- LOTE_UNICO: batch_id obrigatório, product_id NULL
-- PRODUTO_GERAL: product_id obrigatório, batch_id NULL
-- CATALOGO_COMPLETO: ambos NULL
CREATE OR REPLACE FUNCTION validate_sales_link_polymorphism()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.link_type = 'LOTE_UNICO' THEN
        IF NEW.batch_id IS NULL OR NEW.product_id IS NOT NULL THEN
            RAISE EXCEPTION 'LOTE_UNICO requer batch_id e não pode ter product_id';
        END IF;
    ELSIF NEW.link_type = 'PRODUTO_GERAL' THEN
        IF NEW.product_id IS NULL OR NEW.batch_id IS NOT NULL THEN
            RAISE EXCEPTION 'PRODUTO_GERAL requer product_id e não pode ter batch_id';
        END IF;
    ELSIF NEW.link_type = 'CATALOGO_COMPLETO' THEN
        IF NEW.batch_id IS NOT NULL OR NEW.product_id IS NOT NULL THEN
            RAISE EXCEPTION 'CATALOGO_COMPLETO não pode ter batch_id nem product_id';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_sales_link_fields
    BEFORE INSERT OR UPDATE ON sales_links
    FOR EACH ROW
    EXECUTE FUNCTION validate_sales_link_polymorphism();