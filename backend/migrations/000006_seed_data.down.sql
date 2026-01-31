-- =============================================
-- Migration: 000006_seed_data (DOWN)
-- Description: Remove dados de seed
-- =============================================

-- Remover dados em ordem reversa (respeitando foreign keys)
DELETE FROM product_medias WHERE product_id IN (
    '00000000-0000-0000-0000-000000000021',
    '00000000-0000-0000-0000-000000000022',
    '00000000-0000-0000-0000-000000000023'
);

DELETE FROM batches WHERE industry_id = '00000000-0000-0000-0000-000000000001';

DELETE FROM products WHERE industry_id = '00000000-0000-0000-0000-000000000001';

DELETE FROM users WHERE id IN (
    '00000000-0000-0000-0000-000000000011',
    '00000000-0000-0000-0000-000000000012',
    '00000000-0000-0000-0000-000000000013'
);

DELETE FROM industries WHERE id = '00000000-0000-0000-0000-000000000001';
