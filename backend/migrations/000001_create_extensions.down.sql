-- =============================================
-- Migration: 000001_create_extensions (DOWN)
-- Description: Remove extensões
-- =============================================

DROP EXTENSION IF EXISTS "pg_trgm";
DROP EXTENSION IF EXISTS "pgcrypto";
