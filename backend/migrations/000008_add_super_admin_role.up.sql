-- =============================================
-- Migration: 000008_add_super_admin_role
-- Description: Adiciona role SUPER_ADMIN para administradores da plataforma
-- =============================================

-- Adicionar novo valor ao enum user_role_type
ALTER TYPE user_role_type ADD VALUE 'SUPER_ADMIN';

-- Atualizar comentário
COMMENT ON TYPE user_role_type IS 'Tipos de roles de usuários: SUPER_ADMIN (admin da plataforma), ADMIN_INDUSTRIA, VENDEDOR_INTERNO, BROKER';
