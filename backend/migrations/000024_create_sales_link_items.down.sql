-- =============================================
-- Migration: 000024_create_sales_link_items (DOWN)
-- Description: Remove suporte a múltiplos itens por link de venda
-- =============================================

-- Drop tabela de itens
DROP TABLE IF EXISTS sales_link_items;

-- Restaurar função de validação original (sem MULTIPLOS_LOTES)
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

-- Nota: Não é possível remover valores de um ENUM no PostgreSQL
-- O valor 'MULTIPLOS_LOTES' permanecerá no enum mas não será usado
