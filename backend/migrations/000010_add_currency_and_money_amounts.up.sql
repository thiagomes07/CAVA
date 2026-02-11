-- =============================================
-- Migration: 000010_add_currency_and_money_amounts
-- Description: Adiciona moeda e valores monetários em centavos para links
-- =============================================

ALTER TABLE sales_links
    ADD COLUMN display_price_amount BIGINT,
    ADD COLUMN display_currency VARCHAR(3) NOT NULL DEFAULT 'BRL';

ALTER TABLE sales_links
    ADD CONSTRAINT chk_sales_links_display_currency
    CHECK (display_currency IN ('BRL', 'USD'));

ALTER TABLE sales_link_items
    ADD COLUMN unit_price_amount BIGINT,
    ADD COLUMN currency VARCHAR(3) NOT NULL DEFAULT 'BRL';

ALTER TABLE sales_link_items
    ADD CONSTRAINT chk_sales_link_items_currency
    CHECK (currency IN ('BRL', 'USD'));

ALTER TABLE catalog_links
    ADD COLUMN display_currency VARCHAR(3) NOT NULL DEFAULT 'BRL';

ALTER TABLE catalog_links
    ADD CONSTRAINT chk_catalog_links_display_currency
    CHECK (display_currency IN ('BRL', 'USD'));

UPDATE sales_links
SET display_price_amount = ROUND(display_price * 100)
WHERE display_price IS NOT NULL AND display_price_amount IS NULL;

UPDATE sales_link_items
SET unit_price_amount = ROUND(unit_price * 100)
WHERE unit_price IS NOT NULL AND unit_price_amount IS NULL;

ALTER TABLE sales_links
    ALTER COLUMN display_price_amount SET DEFAULT 0;

ALTER TABLE sales_link_items
    ALTER COLUMN unit_price_amount SET DEFAULT 0;

ALTER TABLE sales_links
    ALTER COLUMN display_price_amount SET NOT NULL;

ALTER TABLE sales_link_items
    ALTER COLUMN unit_price_amount SET NOT NULL;

