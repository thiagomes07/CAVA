-- =============================================
-- Rollback: 000011_seed_data
-- =============================================

-- Remover dados de seed em ordem reversa (devido a foreign keys)
DELETE FROM product_medias WHERE product_id IN (
    SELECT id FROM products WHERE industry_id = '00000000-0000-0000-0000-000000000001'
);

DELETE FROM batches WHERE industry_id = '00000000-0000-0000-0000-000000000001';

DELETE FROM products WHERE industry_id = '00000000-0000-0000-0000-000000000001';

DELETE FROM users WHERE id IN (
    '00000000-0000-0000-0000-000000000011',
    '00000000-0000-0000-0000-000000000012',
    '00000000-0000-0000-0000-000000000013'
);

DELETE FROM industries WHERE id = '00000000-0000-0000-0000-000000000001';