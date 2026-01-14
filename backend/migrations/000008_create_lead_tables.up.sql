-- =============================================
-- Migration: 000008_create_cliente_tables
-- Description: Cria tabelas de clientes e interações
-- =============================================

-- Tabela: Clientes (Clientes Potenciais)
CREATE TABLE clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sales_link_id UUID NOT NULL REFERENCES sales_links(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    contact VARCHAR(255) NOT NULL,
    message TEXT,
    marketing_opt_in BOOLEAN DEFAULT FALSE,
    status cliente_status_type DEFAULT 'NOVO',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_interaction TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para clientes
CREATE INDEX idx_clientes_sales_link ON clientes(sales_link_id);
CREATE INDEX idx_clientes_contact ON clientes(contact);
CREATE INDEX idx_clientes_status ON clientes(status);
CREATE INDEX idx_clientes_created_at ON clientes(created_at DESC);
CREATE INDEX idx_clientes_marketing_opt_in ON clientes(marketing_opt_in) WHERE marketing_opt_in = TRUE;
CREATE INDEX idx_clientes_contact_search ON clientes USING gin(to_tsvector('portuguese', name || ' ' || contact));

-- Comentários
COMMENT ON TABLE clientes IS 'Clientes (clientes potenciais) capturados';
COMMENT ON COLUMN clientes.contact IS 'Email ou telefone do cliente';
COMMENT ON COLUMN clientes.marketing_opt_in IS 'Se aceitou receber comunicações de marketing';
COMMENT ON COLUMN clientes.status IS 'Status de acompanhamento: NOVO, CONTATADO, RESOLVIDO';

-- Tabela: Interações de Clientes
CREATE TABLE cliente_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    sales_link_id UUID NOT NULL REFERENCES sales_links(id) ON DELETE SET NULL,
    target_batch_id UUID REFERENCES batches(id) ON DELETE SET NULL,
    target_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    message TEXT,
    interaction_type interaction_type_enum DEFAULT 'INTERESSE_LOTE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para cliente_interactions
CREATE INDEX idx_cliente_interactions_cliente ON cliente_interactions(cliente_id, created_at DESC);
CREATE INDEX idx_cliente_interactions_sales_link ON cliente_interactions(sales_link_id);
CREATE INDEX idx_cliente_interactions_batch ON cliente_interactions(target_batch_id) 
    WHERE target_batch_id IS NOT NULL;
CREATE INDEX idx_cliente_interactions_product ON cliente_interactions(target_product_id) 
    WHERE target_product_id IS NOT NULL;

-- Comentários
COMMENT ON TABLE cliente_interactions IS 'Histórico de interações dos clientes';
COMMENT ON COLUMN cliente_interactions.interaction_type IS 'Tipo: INTERESSE_LOTE, INTERESSE_CATALOGO, DUVIDA_GERAL';

-- Tabela: Assinaturas de Clientes (Interesse em novidades)
CREATE TABLE cliente_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    linked_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para cliente_subscriptions
CREATE INDEX idx_cliente_subscriptions_cliente ON cliente_subscriptions(cliente_id);
CREATE INDEX idx_cliente_subscriptions_product ON cliente_subscriptions(product_id);
CREATE INDEX idx_cliente_subscriptions_user ON cliente_subscriptions(linked_user_id);

-- Comentários
COMMENT ON TABLE cliente_subscriptions IS 'Assinaturas de interesse em produtos específicos';
COMMENT ON COLUMN cliente_subscriptions.linked_user_id IS 'Vendedor responsável pelo cliente';

-- Trigger para atualizar updated_at e last_interaction
CREATE TRIGGER update_clientes_updated_at
    BEFORE UPDATE ON clientes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para atualizar last_interaction quando houver nova interação
CREATE OR REPLACE FUNCTION update_cliente_last_interaction()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE clientes 
    SET last_interaction = NEW.created_at 
    WHERE id = NEW.cliente_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_cliente_interaction_timestamp
    AFTER INSERT ON cliente_interactions
    FOR EACH ROW
    EXECUTE FUNCTION update_cliente_last_interaction();