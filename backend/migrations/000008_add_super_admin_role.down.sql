-- =============================================
-- Migration: 000008_add_super_admin_role (down)
-- Description: Remove role SUPER_ADMIN
-- =============================================

-- NOTA: PostgreSQL não permite remover valores de ENUM diretamente.
-- Para reverter, seria necessário:
-- 1. Criar novo tipo sem SUPER_ADMIN
-- 2. Alterar coluna para usar novo tipo
-- 3. Remover tipo antigo
-- 4. Renomear novo tipo

-- Esta reversão é deixada como no-op por segurança.
-- Em produção, migrar dados antes de tentar reverter.

-- Se necessário reverter manualmente:
-- 1. DELETE FROM users WHERE role = 'SUPER_ADMIN';
-- 2. Seguir procedimento de recriação do ENUM
