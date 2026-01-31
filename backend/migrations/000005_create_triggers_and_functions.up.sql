-- =============================================
-- Migration: 000005_create_triggers_and_functions
-- Description: Cria funções e triggers do sistema
-- =============================================

-- =============================================
-- FUNÇÃO: Atualizar updated_at automaticamente
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_updated_at_column() IS 'Atualiza automaticamente a coluna updated_at';

-- =============================================
-- TRIGGERS: updated_at para todas as tabelas
-- =============================================
CREATE TRIGGER update_industries_updated_at
    BEFORE UPDATE ON industries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_batches_updated_at
    BEFORE UPDATE ON batches
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sales_links_updated_at
    BEFORE UPDATE ON sales_links
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clientes_updated_at
    BEFORE UPDATE ON clientes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_catalog_links_updated_at
    BEFORE UPDATE ON catalog_links
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- FUNÇÃO: Validar polimorfismo de sales_links
-- =============================================
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

COMMENT ON FUNCTION validate_sales_link_polymorphism() IS 'Valida campos polimórficos de sales_links';

-- =============================================
-- TRIGGER: Validar sales_links
-- =============================================
CREATE TRIGGER validate_sales_link_fields
    BEFORE INSERT OR UPDATE ON sales_links
    FOR EACH ROW
    EXECUTE FUNCTION validate_sales_link_polymorphism();

-- =============================================
-- FUNÇÃO: Atualizar last_interaction de clientes
-- =============================================
CREATE OR REPLACE FUNCTION update_cliente_last_interaction()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE clientes 
    SET last_interaction = NEW.created_at 
    WHERE id = NEW.cliente_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_cliente_last_interaction() IS 'Atualiza last_interaction quando cliente interage';

-- =============================================
-- TRIGGER: Atualizar last_interaction
-- =============================================
CREATE TRIGGER update_cliente_interaction_timestamp
    AFTER INSERT ON cliente_interactions
    FOR EACH ROW
    EXECUTE FUNCTION update_cliente_last_interaction();
