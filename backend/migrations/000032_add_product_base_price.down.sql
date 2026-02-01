-- Remove campos de preço base do produto
ALTER TABLE products 
DROP COLUMN IF EXISTS base_price,
DROP COLUMN IF EXISTS price_unit;

-- Remove campo de override do batch
ALTER TABLE batches
DROP COLUMN IF EXISTS price_override;
