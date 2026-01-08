-- =============================================
-- Migration: 000006_create_sharing_tables
-- Description: Cria tabelas de compartilhamento B2B
-- =============================================

-- Tabela: Estoque Compartilhado (Lotes para Brokers)
CREATE TABLE shared_inventory_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    broker_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    industry_owner_id UUID NOT NULL REFERENCES industries(id) ON DELETE CASCADE,
    negotiated_price DECIMAL(12,2) CHECK (negotiated_price IS NULL OR negotiated_price > 0),
    shared_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Constraint: batch compartilhado apenas uma vez por broker
    CONSTRAINT unique_batch_share UNIQUE (batch_id, broker_user_id)
);

-- Índices para shared_inventory_batches
CREATE INDEX idx_shared_inventory_broker ON shared_inventory_batches(broker_user_id, is_active) 
    WHERE is_active = TRUE;
CREATE INDEX idx_shared_inventory_batch ON shared_inventory_batches(batch_id);
CREATE INDEX idx_shared_inventory_industry ON shared_inventory_batches(industry_owner_id);

-- Comentários
COMMENT ON TABLE shared_inventory_batches IS 'Lotes compartilhados com brokers específicos';
COMMENT ON COLUMN shared_inventory_batches.negotiated_price IS 'Preço especial negociado para este broker';

-- Tabela: Permissões de Catálogo (Vitrine para Brokers)
CREATE TABLE shared_catalog_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    industry_id UUID NOT NULL REFERENCES industries(id) ON DELETE CASCADE,
    broker_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    can_show_prices BOOLEAN DEFAULT FALSE,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Constraint: permissão única por broker/indústria
    CONSTRAINT unique_catalog_share UNIQUE (industry_id, broker_user_id)
);

-- Índices para shared_catalog_permissions
CREATE INDEX idx_catalog_permissions_broker ON shared_catalog_permissions(broker_user_id, is_active) 
    WHERE is_active = TRUE;
CREATE INDEX idx_catalog_permissions_industry ON shared_catalog_permissions(industry_id);

-- Comentários
COMMENT ON TABLE shared_catalog_permissions IS 'Permissões de acesso ao catálogo geral da indústria';
COMMENT ON COLUMN shared_catalog_permissions.can_show_prices IS 'Se o broker pode ver/exibir preços';