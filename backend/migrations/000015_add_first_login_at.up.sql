-- =============================================
-- Migration: 000015_add_first_login_at
-- Description: Adiciona coluna first_login_at para rastrear primeiro login
-- =============================================

-- Adiciona coluna first_login_at à tabela users
-- NULL significa que o usuário nunca fez login
ALTER TABLE users 
ADD COLUMN first_login_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Comentário explicativo
COMMENT ON COLUMN users.first_login_at IS 'Data/hora do primeiro login do usuário. NULL significa que nunca logou.';

-- Índice para facilitar busca de usuários que nunca logaram
CREATE INDEX idx_users_first_login_at ON users(first_login_at) WHERE first_login_at IS NULL;
