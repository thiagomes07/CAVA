-- =============================================
-- Migration: 000001_create_extensions
-- Description: Habilita extensões necessárias
-- =============================================

-- Extensão para gerar UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Comentário descritivo
COMMENT ON EXTENSION pgcrypto IS 'Extensão para funções criptográficas e geração de UUIDs';