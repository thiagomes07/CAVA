ALTER TABLE users
    ADD COLUMN preferred_currency VARCHAR(3) NOT NULL DEFAULT 'BRL';

ALTER TABLE users
    ADD CONSTRAINT chk_users_preferred_currency
    CHECK (preferred_currency IN ('BRL', 'USD'));

