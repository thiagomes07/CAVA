ALTER TABLE sales_history ALTER COLUMN sold_by_user_id DROP NOT NULL;
ALTER TABLE sales_history ADD COLUMN seller_name VARCHAR(255);
