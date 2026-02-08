-- =============================================
-- Migration: 000009_seed_super_admin (down)
-- Description: Remove o super admin inicial
-- =============================================

DELETE FROM users WHERE email = 'admin@cava.com' AND role = 'SUPER_ADMIN';
