-- =============================================
-- Migration: 000033_add_portfolio_display_settings (DOWN)
-- Description: Remove configurações de exibição do portfolio
-- =============================================

ALTER TABLE industries DROP COLUMN IF EXISTS portfolio_display_settings;

-- Nota: Não é possível remover valores de ENUM no PostgreSQL
-- O valor 'PORTFOLIO_LEAD' permanecerá no enum
