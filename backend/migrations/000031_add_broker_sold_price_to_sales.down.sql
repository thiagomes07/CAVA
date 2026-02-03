-- Rollback: Remove broker_sold_price da tabela sales_history

ALTER TABLE sales_history DROP COLUMN IF EXISTS broker_sold_price;
