-- =============================================
-- Migration: 000024_create_sales_link_items
-- Description: Adiciona suporte a múltiplos itens por link de venda
-- =============================================

-- Adicionar novo tipo de link para múltiplos lotes
ALTER TYPE link_type_enum ADD VALUE IF NOT EXISTS 'MULTIPLOS_LOTES';

-- Tabela: Itens de Links de Venda
CREATE TABLE sales_link_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sales_link_id UUID NOT NULL REFERENCES sales_links(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    
    -- Quantidade e preço
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price DECIMAL(12,2) NOT NULL CHECK (unit_price >= 0),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint: cada batch só pode aparecer uma vez por link
    UNIQUE (sales_link_id, batch_id)
);

-- Índices
CREATE INDEX idx_sales_link_items_link ON sales_link_items(sales_link_id);
CREATE INDEX idx_sales_link_items_batch ON sales_link_items(batch_id);

-- Comentários
COMMENT ON TABLE sales_link_items IS 'Itens individuais de um link de venda com múltiplos lotes';
COMMENT ON COLUMN sales_link_items.quantity IS 'Quantidade de peças/chapas do lote';
COMMENT ON COLUMN sales_link_items.unit_price IS 'Preço unitário por peça/chapa';

-- Atualizar a função de validação para aceitar o novo tipo
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
    ELSIF NEW.link_type = 'MULTIPLOS_LOTES' THEN
        -- MULTIPLOS_LOTES: batch_id e product_id devem ser NULL (itens em sales_link_items)
        IF NEW.batch_id IS NOT NULL OR NEW.product_id IS NOT NULL THEN
            RAISE EXCEPTION 'MULTIPLOS_LOTES não pode ter batch_id nem product_id diretos';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
