ALTER TABLE sales_links DROP CONSTRAINT IF EXISTS chk_sales_links_display_currency;
ALTER TABLE sales_link_items DROP CONSTRAINT IF EXISTS chk_sales_link_items_currency;
ALTER TABLE catalog_links DROP CONSTRAINT IF EXISTS chk_catalog_links_display_currency;

ALTER TABLE sales_links DROP COLUMN IF EXISTS display_price_amount;
ALTER TABLE sales_links DROP COLUMN IF EXISTS display_currency;

ALTER TABLE sales_link_items DROP COLUMN IF EXISTS unit_price_amount;
ALTER TABLE sales_link_items DROP COLUMN IF EXISTS currency;

ALTER TABLE catalog_links DROP COLUMN IF EXISTS display_currency;

