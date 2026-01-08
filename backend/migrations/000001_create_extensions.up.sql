-- =============================================
-- Migration: 000001_create_extensions
-- Description: Habilita extensões necessárias
-- =============================================

-- Extensão para gerar UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Extensão para busca textual com trigrams (necessária para índices GIN)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Comentário descritivo
COMMENT ON EXTENSION pgcrypto IS 'Extensão para funções criptográficas e geração de UUIDs';
COMMENT ON EXTENSION pg_trgm IS 'Extensão para busca textual com similarity e índices GIN';