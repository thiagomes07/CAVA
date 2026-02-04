-- =============================================
-- Migration: 000029_create_bi_materialized_views (DOWN)
-- Description: Remove views materializadas de BI
-- =============================================

-- Remover funcao de refresh
DROP FUNCTION IF EXISTS refresh_bi_views();

-- Remover tabela de log
DROP TABLE IF EXISTS bi_refresh_log;

-- Remover views materializadas
DROP MATERIALIZED VIEW IF EXISTS mv_top_products;
DROP MATERIALIZED VIEW IF EXISTS mv_seller_performance;
DROP MATERIALIZED VIEW IF EXISTS mv_inventory_by_product;
DROP MATERIALIZED VIEW IF EXISTS mv_reservation_funnel;
DROP MATERIALIZED VIEW IF EXISTS mv_daily_sales;
