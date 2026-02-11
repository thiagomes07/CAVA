ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_preferred_currency;
ALTER TABLE users DROP COLUMN IF EXISTS preferred_currency;

