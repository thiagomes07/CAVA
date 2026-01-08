-- =============================================
-- Rollback: 000008_create_lead_tables
-- =============================================

-- Remover triggers
DROP TRIGGER IF EXISTS update_lead_interaction_timestamp ON lead_interactions;
DROP TRIGGER IF EXISTS update_leads_updated_at ON leads;

-- Remover funções
DROP FUNCTION IF EXISTS update_lead_last_interaction();

-- Remover tabelas (ordem reversa)
DROP TABLE IF EXISTS lead_subscriptions;
DROP TABLE IF EXISTS lead_interactions;
DROP TABLE IF EXISTS leads;