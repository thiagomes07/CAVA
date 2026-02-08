-- =============================================
-- Migration: 000009_seed_super_admin
-- Description: Cria o primeiro SUPER_ADMIN da plataforma
-- =============================================

-- NOTA: Esta migration cria um super admin com senha padrão.
-- A senha DEVE ser alterada imediatamente após o primeiro login.
-- Em produção, use variáveis de ambiente para definir credenciais.

-- Senha padrão: SuperAdmin@123 (hash Argon2id)
-- Para gerar novo hash: use o pacote password do backend
-- Hash gerado com: docker run --rm -v $(pwd):/app -w /app golang:1.24-alpine go run cmd/gen_hash/main.go "SuperAdmin@123"
INSERT INTO users (
    id,
    industry_id,
    name,
    email,
    password_hash,
    role,
    is_active,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    NULL,  -- Super admin não tem indústria
    'Super Admin',
    'admin@cava.com',
    '$argon2id$v=19$m=65536,t=3,p=2$icOEZyBncWWLx+pjzgC8sA$tBVIwSlinWS+BYkRr/8zdUC63VgZeeIxhkjXMHq7pBw',
    'SUPER_ADMIN',
    true,
    NOW(),
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- Comentário sobre segurança
COMMENT ON TABLE users IS 'Tabela de usuários. SUPER_ADMIN tem industry_id NULL.';
