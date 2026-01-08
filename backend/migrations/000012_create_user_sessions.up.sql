-- =============================================
-- Migration: 000012_create_user_sessions
-- Description: Cria tabela para sessões de usuário (refresh tokens)
-- =============================================

-- Tabela: Sessões de Usuário (para refresh token rotation)
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_agent VARCHAR(500),
    ip_address VARCHAR(50)
);

-- Índices para user_sessions
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token_hash ON user_sessions(refresh_token_hash);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at) 
    WHERE is_active = TRUE;
CREATE INDEX idx_user_sessions_active ON user_sessions(user_id, is_active) 
    WHERE is_active = TRUE;

-- Comentários
COMMENT ON TABLE user_sessions IS 'Sessões de usuário para gerenciamento de refresh tokens';
COMMENT ON COLUMN user_sessions.refresh_token_hash IS 'Hash SHA-256 do refresh token (nunca armazenar token em texto puro)';
COMMENT ON COLUMN user_sessions.expires_at IS 'Data de expiração do refresh token';
COMMENT ON COLUMN user_sessions.is_active IS 'Se FALSE, sessão foi invalidada (logout ou rotação)';
COMMENT ON COLUMN user_sessions.last_used_at IS 'Última vez que o refresh token foi usado';
