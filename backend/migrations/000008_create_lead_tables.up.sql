-- =============================================
-- Migration: 000008_create_lead_tables
-- Description: Cria tabelas de leads e interações
-- =============================================

-- Tabela: Leads (Clientes Potenciais)
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sales_link_id UUID NOT NULL REFERENCES sales_links(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    contact VARCHAR(255) NOT NULL,
    message TEXT,
    marketing_opt_in BOOLEAN DEFAULT FALSE,
    status lead_status_type DEFAULT 'NOVO',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_interaction TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para leads
CREATE INDEX idx_leads_sales_link ON leads(sales_link_id);
CREATE INDEX idx_leads_contact ON leads(contact);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX idx_leads_marketing_opt_in ON leads(marketing_opt_in) WHERE marketing_opt_in = TRUE;
CREATE INDEX idx_leads_contact_search ON leads USING gin(to_tsvector('portuguese', name || ' ' || contact));

-- Comentários
COMMENT ON TABLE leads IS 'Leads (clientes potenciais) capturados';
COMMENT ON COLUMN leads.contact IS 'Email ou telefone do lead';
COMMENT ON COLUMN leads.marketing_opt_in IS 'Se aceitou receber comunicações de marketing';
COMMENT ON COLUMN leads.status IS 'Status de acompanhamento: NOVO, CONTATADO, RESOLVIDO';

-- Tabela: Interações de Leads
CREATE TABLE lead_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    sales_link_id UUID NOT NULL REFERENCES sales_links(id) ON DELETE SET NULL,
    target_batch_id UUID REFERENCES batches(id) ON DELETE SET NULL,
    target_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    message TEXT,
    interaction_type interaction_type_enum DEFAULT 'INTERESSE_LOTE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para lead_interactions
CREATE INDEX idx_lead_interactions_lead ON lead_interactions(lead_id, created_at DESC);
CREATE INDEX idx_lead_interactions_sales_link ON lead_interactions(sales_link_id);
CREATE INDEX idx_lead_interactions_batch ON lead_interactions(target_batch_id) 
    WHERE target_batch_id IS NOT NULL;
CREATE INDEX idx_lead_interactions_product ON lead_interactions(target_product_id) 
    WHERE target_product_id IS NOT NULL;

-- Comentários
COMMENT ON TABLE lead_interactions IS 'Histórico de interações dos leads';
COMMENT ON COLUMN lead_interactions.interaction_type IS 'Tipo: INTERESSE_LOTE, INTERESSE_CATALOGO, DUVIDA_GERAL';

-- Tabela: Assinaturas de Leads (Interesse em novidades)
CREATE TABLE lead_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    linked_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para lead_subscriptions
CREATE INDEX idx_lead_subscriptions_lead ON lead_subscriptions(lead_id);
CREATE INDEX idx_lead_subscriptions_product ON lead_subscriptions(product_id);
CREATE INDEX idx_lead_subscriptions_user ON lead_subscriptions(linked_user_id);

-- Comentários
COMMENT ON TABLE lead_subscriptions IS 'Assinaturas de interesse em produtos específicos';
COMMENT ON COLUMN lead_subscriptions.linked_user_id IS 'Vendedor responsável pelo lead';

-- Trigger para atualizar updated_at e last_interaction
CREATE TRIGGER update_leads_updated_at
    BEFORE UPDATE ON leads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para atualizar last_interaction quando houver nova interação
CREATE OR REPLACE FUNCTION update_lead_last_interaction()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE leads 
    SET last_interaction = NEW.created_at 
    WHERE id = NEW.lead_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_lead_interaction_timestamp
    AFTER INSERT ON lead_interactions
    FOR EACH ROW
    EXECUTE FUNCTION update_lead_last_interaction();