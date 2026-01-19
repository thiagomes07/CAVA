ALTER TABLE sales_history DROP COLUMN seller_name;
-- Note: This might fail if there are records with NULL sold_by_user_id
ALTER TABLE sales_history ALTER COLUMN sold_by_user_id SET NOT NULL;
