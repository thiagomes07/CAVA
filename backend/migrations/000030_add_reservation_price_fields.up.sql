-- Add price fields to reservations table
-- reserved_price: preço indicado pelo broker (visível para admin)
-- broker_sold_price: preço interno do broker (só visível para o broker)

ALTER TABLE reservations ADD COLUMN IF NOT EXISTS reserved_price DECIMAL(14,2);
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS broker_sold_price DECIMAL(14,2);

COMMENT ON COLUMN reservations.reserved_price IS 'Preço indicado pelo broker para a reserva (visível para admin)';
COMMENT ON COLUMN reservations.broker_sold_price IS 'Preço interno do broker - para dashboard própria (não visível para admin)';
