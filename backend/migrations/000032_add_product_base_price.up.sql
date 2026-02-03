-- Adiciona campos de preço base ao produto
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS base_price DECIMAL(15, 2),
ADD COLUMN IF NOT EXISTS price_unit VARCHAR(10) DEFAULT 'M2';

-- Comentário explicativo
COMMENT ON COLUMN products.base_price IS 'Preço base por unidade de área (m² ou ft²) definido no produto';
COMMENT ON COLUMN products.price_unit IS 'Unidade do preço (M2 ou FT2)';

-- Adiciona campo para indicar se o preço do lote é calculado ou sobrescrito
ALTER TABLE batches
ADD COLUMN IF NOT EXISTS price_override BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN batches.price_override IS 'Se TRUE, industry_price foi definido manualmente. Se FALSE, usa o preço do produto';

-- Atualiza batches existentes para ter price_override = TRUE (já tinham preço manual)
UPDATE batches SET price_override = TRUE WHERE industry_price IS NOT NULL AND industry_price > 0;
