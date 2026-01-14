-- =============================================
-- Migration: 000013_add_slabs_and_price_unit (DOWN)
-- Description: Remove suporte a gestão de chapas individuais e precificação por área
-- =============================================

-- 1. Remover índices
DROP INDEX IF EXISTS idx_batches_industry_status_available;
DROP INDEX IF EXISTS idx_batches_available_slabs;

-- 2. Remover campos de shared_inventory_batches
ALTER TABLE shared_inventory_batches
    DROP COLUMN IF EXISTS negotiated_price_unit;

-- 3. Remover campos de sales_history
ALTER TABLE sales_history
    DROP CONSTRAINT IF EXISTS check_quantity_sold_positive,
    DROP COLUMN IF EXISTS total_area_sold,
    DROP COLUMN IF EXISTS price_per_unit,
    DROP COLUMN IF EXISTS price_unit,
    DROP COLUMN IF EXISTS quantity_slabs_sold;

-- 4. Remover campos de reservations
ALTER TABLE reservations
    DROP CONSTRAINT IF EXISTS check_quantity_reserved_positive,
    DROP COLUMN IF EXISTS quantity_slabs_reserved;

-- 5. Remover campos e constraints de batches
ALTER TABLE batches
    DROP CONSTRAINT IF EXISTS check_available_slabs_max,
    DROP CONSTRAINT IF EXISTS check_available_slabs_non_negative,
    DROP COLUMN IF EXISTS price_unit,
    DROP COLUMN IF EXISTS available_slabs;

-- 6. Remover ENUM
DROP TYPE IF EXISTS price_unit_type;
