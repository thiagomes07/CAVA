-- =============================================
-- Migration: 000013_add_slabs_and_price_unit
-- Description: Adiciona suporte a gestão de chapas individuais e precificação por área
-- =============================================

-- 1. Criar ENUM para unidade de preço
CREATE TYPE price_unit_type AS ENUM ('M2', 'FT2');

COMMENT ON TYPE price_unit_type IS 'Unidade de preço: M2 (metro quadrado) ou FT2 (pé quadrado)';

-- 2. Adicionar novos campos na tabela batches
ALTER TABLE batches
    ADD COLUMN available_slabs INTEGER,
    ADD COLUMN reserved_slabs INTEGER,
    ADD COLUMN sold_slabs INTEGER,
    ADD COLUMN inactive_slabs INTEGER,
    ADD COLUMN price_unit price_unit_type DEFAULT 'M2';

-- 3. Adicionar campo quantity_slabs_reserved na tabela reservations
ALTER TABLE reservations
    ADD COLUMN quantity_slabs_reserved INTEGER DEFAULT 1;

UPDATE reservations 
SET quantity_slabs_reserved = 1 
WHERE quantity_slabs_reserved IS NULL;

ALTER TABLE reservations
    ALTER COLUMN quantity_slabs_reserved SET NOT NULL,
    ADD CONSTRAINT check_quantity_reserved_positive CHECK (quantity_slabs_reserved > 0);

-- 4. Adicionar campos na tabela sales_history
ALTER TABLE sales_history
    ADD COLUMN quantity_slabs_sold INTEGER DEFAULT 1,
    ADD COLUMN price_unit price_unit_type DEFAULT 'M2',
    ADD COLUMN price_per_unit DECIMAL(12,4),
    ADD COLUMN total_area_sold DECIMAL(10,2);

UPDATE sales_history 
SET quantity_slabs_sold = 1 
WHERE quantity_slabs_sold IS NULL;

ALTER TABLE sales_history
    ALTER COLUMN quantity_slabs_sold SET NOT NULL,
    ADD CONSTRAINT check_quantity_sold_positive CHECK (quantity_slabs_sold > 0);

-- 5. Inicializar novos campos com base em dados existentes
UPDATE batches
SET reserved_slabs = 0,
    sold_slabs = 0,
    inactive_slabs = 0
WHERE reserved_slabs IS NULL OR sold_slabs IS NULL OR inactive_slabs IS NULL;

-- Backfill reserved_slabs (reservas ativas)
UPDATE batches b
SET reserved_slabs = COALESCE(r.total_reserved, 0)
FROM (
    SELECT batch_id, SUM(quantity_slabs_reserved) AS total_reserved
    FROM reservations
    WHERE status = 'ATIVA'
    GROUP BY batch_id
) r
WHERE b.id = r.batch_id;

-- Backfill sold_slabs (histórico de vendas)
UPDATE batches b
SET sold_slabs = COALESCE(s.total_sold, 0)
FROM (
    SELECT batch_id, SUM(quantity_slabs_sold) AS total_sold
    FROM sales_history
    GROUP BY batch_id
) s
WHERE b.id = s.batch_id;

-- Ajustar available_slabs para fechar o total
UPDATE batches
SET available_slabs = GREATEST(quantity_slabs - reserved_slabs - sold_slabs - inactive_slabs, 0);

-- 6. Tornar available_slabs NOT NULL após inicialização
ALTER TABLE batches
    ALTER COLUMN available_slabs SET NOT NULL,
    ALTER COLUMN available_slabs SET DEFAULT 0;

ALTER TABLE batches
    ALTER COLUMN reserved_slabs SET NOT NULL,
    ALTER COLUMN reserved_slabs SET DEFAULT 0,
    ALTER COLUMN sold_slabs SET NOT NULL,
    ALTER COLUMN sold_slabs SET DEFAULT 0,
    ALTER COLUMN inactive_slabs SET NOT NULL,
    ALTER COLUMN inactive_slabs SET DEFAULT 0;

-- 7. Adicionar constraints de validação
ALTER TABLE batches
    ADD CONSTRAINT check_available_slabs_non_negative CHECK (available_slabs >= 0),
    ADD CONSTRAINT check_available_slabs_max CHECK (available_slabs <= quantity_slabs),
    ADD CONSTRAINT check_reserved_slabs_non_negative CHECK (reserved_slabs >= 0),
    ADD CONSTRAINT check_sold_slabs_non_negative CHECK (sold_slabs >= 0),
    ADD CONSTRAINT check_inactive_slabs_non_negative CHECK (inactive_slabs >= 0),
    ADD CONSTRAINT check_total_slabs_consistency CHECK (available_slabs + reserved_slabs + sold_slabs + inactive_slabs = quantity_slabs);

-- 8. Adicionar campo negotiated_price_unit na tabela shared_inventory_batches
ALTER TABLE shared_inventory_batches
    ADD COLUMN negotiated_price_unit price_unit_type DEFAULT 'M2';

-- 9. Criar índice para consultas por disponibilidade de chapas
CREATE INDEX idx_batches_available_slabs ON batches(industry_id, available_slabs) 
    WHERE available_slabs > 0 AND is_active = TRUE;

-- 10. Criar índice composto para queries de lotes disponíveis por status
CREATE INDEX idx_batches_industry_status_available ON batches(industry_id, status, available_slabs) 
    WHERE is_active = TRUE;

-- 10. Atualizar comentários
COMMENT ON COLUMN batches.available_slabs IS 'Quantidade de chapas disponíveis para reserva/venda';
COMMENT ON COLUMN batches.reserved_slabs IS 'Quantidade de chapas reservadas';
COMMENT ON COLUMN batches.sold_slabs IS 'Quantidade de chapas vendidas';
COMMENT ON COLUMN batches.inactive_slabs IS 'Quantidade de chapas inativas';
COMMENT ON COLUMN batches.price_unit IS 'Unidade de preço: M2 (metro quadrado) ou FT2 (pé quadrado)';
COMMENT ON COLUMN batches.industry_price IS 'Preço por unidade de área (conforme price_unit)';
COMMENT ON COLUMN reservations.quantity_slabs_reserved IS 'Quantidade de chapas reservadas nesta reserva';
COMMENT ON COLUMN sales_history.quantity_slabs_sold IS 'Quantidade de chapas vendidas';
COMMENT ON COLUMN sales_history.price_unit IS 'Unidade de preço usada na venda';
COMMENT ON COLUMN sales_history.price_per_unit IS 'Preço por unidade de área na venda';
COMMENT ON COLUMN sales_history.total_area_sold IS 'Área total vendida em m²';
COMMENT ON COLUMN shared_inventory_batches.negotiated_price_unit IS 'Unidade do preço negociado';
