-- =============================================
-- Migration: 000019_extend_sharing_to_sellers
-- Description: Estende compartilhamento de lotes para incluir VENDEDOR_INTERNO
-- =============================================

-- Renomear coluna broker_user_id para shared_with_user_id para suportar brokers e vendedores
ALTER TABLE shared_inventory_batches 
    RENAME COLUMN broker_user_id TO shared_with_user_id;

-- Renomear constraint único
ALTER TABLE shared_inventory_batches
    DROP CONSTRAINT IF EXISTS unique_batch_share;

ALTER TABLE shared_inventory_batches
    ADD CONSTRAINT unique_batch_share UNIQUE (batch_id, shared_with_user_id);

-- Renomear índices
DROP INDEX IF EXISTS idx_shared_inventory_broker;
CREATE INDEX idx_shared_inventory_user ON shared_inventory_batches(shared_with_user_id, is_active) 
    WHERE is_active = TRUE;

-- Atualizar comentários
COMMENT ON COLUMN shared_inventory_batches.shared_with_user_id IS 'ID do usuário (broker ou vendedor interno) com quem o lote foi compartilhado';

-- Renomear coluna broker_user_id para shared_with_user_id na tabela de permissões de catálogo
ALTER TABLE shared_catalog_permissions 
    RENAME COLUMN broker_user_id TO shared_with_user_id;

-- Renomear constraint único
ALTER TABLE shared_catalog_permissions
    DROP CONSTRAINT IF EXISTS unique_catalog_share;

ALTER TABLE shared_catalog_permissions
    ADD CONSTRAINT unique_catalog_share UNIQUE (industry_id, shared_with_user_id);

-- Renomear índices
DROP INDEX IF EXISTS idx_catalog_permissions_broker;
CREATE INDEX idx_catalog_permissions_user ON shared_catalog_permissions(shared_with_user_id, is_active) 
    WHERE is_active = TRUE;

-- Atualizar comentários
COMMENT ON COLUMN shared_catalog_permissions.shared_with_user_id IS 'ID do usuário (broker ou vendedor interno) com quem o catálogo foi compartilhado';
