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
    ADD COLUMN price_unit price_unit_type DEFAULT 'M2';

-- 3. Inicializar available_slabs com o valor de quantity_slabs para lotes existentes
UPDATE batches 
SET available_slabs = quantity_slabs 
WHERE available_slabs IS NULL;

-- 4. Tornar available_slabs NOT NULL após inicialização
ALTER TABLE batches
    ALTER COLUMN available_slabs SET NOT NULL,
    ALTER COLUMN available_slabs SET DEFAULT 0;

-- 5. Adicionar constraints de validação
ALTER TABLE batches
    ADD CONSTRAINT check_available_slabs_non_negative CHECK (available_slabs >= 0),
    ADD CONSTRAINT check_available_slabs_max CHECK (available_slabs <= quantity_slabs);

-- 6. Adicionar campo quantity_slabs_reserved na tabela reservations
ALTER TABLE reservations
    ADD COLUMN quantity_slabs_reserved INTEGER DEFAULT 1;

UPDATE reservations 
SET quantity_slabs_reserved = 1 
WHERE quantity_slabs_reserved IS NULL;

ALTER TABLE reservations
    ALTER COLUMN quantity_slabs_reserved SET NOT NULL,
    ADD CONSTRAINT check_quantity_reserved_positive CHECK (quantity_slabs_reserved > 0);

-- 7. Adicionar campos na tabela sales_history
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
COMMENT ON COLUMN batches.price_unit IS 'Unidade de preço: M2 (metro quadrado) ou FT2 (pé quadrado)';
COMMENT ON COLUMN batches.industry_price IS 'Preço por unidade de área (conforme price_unit)';
COMMENT ON COLUMN reservations.quantity_slabs_reserved IS 'Quantidade de chapas reservadas nesta reserva';
COMMENT ON COLUMN sales_history.quantity_slabs_sold IS 'Quantidade de chapas vendidas';
COMMENT ON COLUMN sales_history.price_unit IS 'Unidade de preço usada na venda';
COMMENT ON COLUMN sales_history.price_per_unit IS 'Preço por unidade de área na venda';
COMMENT ON COLUMN sales_history.total_area_sold IS 'Área total vendida em m²';
COMMENT ON COLUMN shared_inventory_batches.negotiated_price_unit IS 'Unidade do preço negociado';
