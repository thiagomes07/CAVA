-- =============================================
-- Migration: 000019_extend_sharing_to_sellers (ROLLBACK)
-- Description: Reverte extensão de compartilhamento para vendedores
-- =============================================

-- Reverter shared_inventory_batches
DROP INDEX IF EXISTS idx_shared_inventory_user;
CREATE INDEX idx_shared_inventory_broker ON shared_inventory_batches(shared_with_user_id, is_active) 
    WHERE is_active = TRUE;

ALTER TABLE shared_inventory_batches
    DROP CONSTRAINT IF EXISTS unique_batch_share;

ALTER TABLE shared_inventory_batches
    ADD CONSTRAINT unique_batch_share UNIQUE (batch_id, shared_with_user_id);

ALTER TABLE shared_inventory_batches 
    RENAME COLUMN shared_with_user_id TO broker_user_id;

-- Reverter shared_catalog_permissions
DROP INDEX IF EXISTS idx_catalog_permissions_user;
CREATE INDEX idx_catalog_permissions_broker ON shared_catalog_permissions(shared_with_user_id, is_active) 
    WHERE is_active = TRUE;

ALTER TABLE shared_catalog_permissions
    DROP CONSTRAINT IF EXISTS unique_catalog_share;

ALTER TABLE shared_catalog_permissions
    ADD CONSTRAINT unique_catalog_share UNIQUE (industry_id, shared_with_user_id);

ALTER TABLE shared_catalog_permissions 
    RENAME COLUMN shared_with_user_id TO broker_user_id;
