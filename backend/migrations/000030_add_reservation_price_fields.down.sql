-- Remove price fields from reservations table
ALTER TABLE reservations DROP COLUMN IF EXISTS reserved_price;
ALTER TABLE reservations DROP COLUMN IF EXISTS broker_sold_price;
