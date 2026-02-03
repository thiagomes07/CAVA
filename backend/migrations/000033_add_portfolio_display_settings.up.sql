-- =============================================
-- Migration: 000033_add_portfolio_display_settings
-- Description: Adiciona configurações de exibição do portfolio público na indústria
-- =============================================

-- Adiciona coluna JSONB para configurações de exibição do portfolio
ALTER TABLE industries 
ADD COLUMN portfolio_display_settings JSONB DEFAULT '{
    "showName": true,
    "showDescription": false,
    "showLogo": false,
    "showContact": false,
    "showLocation": false,
    "locationLevel": "none",
    "isPublished": false
}'::JSONB;

COMMENT ON COLUMN industries.portfolio_display_settings IS 'Configurações de visibilidade do portfolio público: showName, showDescription, showLogo, showContact, showLocation, locationLevel (none|country|state|city|full), isPublished';

-- Adiciona enum para o tipo de interação PORTFOLIO_LEAD
ALTER TYPE interaction_type_enum ADD VALUE IF NOT EXISTS 'PORTFOLIO_LEAD';
