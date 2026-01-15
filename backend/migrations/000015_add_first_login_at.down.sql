-- =============================================
-- Migration: 000015_add_first_login_at (Rollback)
-- Description: Remove coluna first_login_at
-- =============================================

-- Remove índice
DROP INDEX IF EXISTS idx_users_first_login_at;

-- Remove coluna
ALTER TABLE users DROP COLUMN IF EXISTS first_login_at;
