-- =============================================
-- Migration: 000029_create_bi_materialized_views
-- Description: Cria views materializadas para dashboard de BI
-- =============================================

-- View materializada: Metricas diarias de vendas
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_sales AS
SELECT
    DATE(sold_at) as sale_date,
    industry_id,
    sold_by_user_id,
    COUNT(*) as sales_count,
    SUM(sale_price) as total_revenue,
    SUM(broker_commission) as total_commission,
    SUM(net_industry_value) as net_revenue,
    AVG(sale_price) as avg_ticket,
    SUM(quantity_slabs_sold) as total_slabs,
    SUM(total_area_sold) as total_area
FROM sales_history
GROUP BY DATE(sold_at), industry_id, sold_by_user_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_daily_sales
ON mv_daily_sales(sale_date, industry_id, sold_by_user_id);

-- View materializada: Funil de reservas (conversao)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_reservation_funnel AS
SELECT
    DATE(r.created_at) as date,
    r.industry_id,
    r.reserved_by_user_id as broker_id,
    COUNT(*) as total_created,
    COUNT(*) FILTER (WHERE r.status IN ('APROVADA', 'CONFIRMADA_VENDA')) as total_approved,
    COUNT(*) FILTER (WHERE r.status = 'REJEITADA') as total_rejected,
    COUNT(*) FILTER (WHERE r.status = 'CONFIRMADA_VENDA') as total_converted,
    COUNT(*) FILTER (WHERE r.status = 'EXPIRADA') as total_expired,
    COUNT(*) FILTER (WHERE r.status = 'CANCELADA') as total_cancelled,
    AVG(EXTRACT(EPOCH FROM (r.approved_at - r.created_at))/3600)
        FILTER (WHERE r.approved_at IS NOT NULL) as avg_hours_to_approve
FROM reservations r
WHERE r.industry_id IS NOT NULL
GROUP BY DATE(r.created_at), r.industry_id, r.reserved_by_user_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_reservation_funnel
ON mv_reservation_funnel(date, industry_id, broker_id);

-- View materializada: Metricas de inventario por produto
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_inventory_by_product AS
SELECT
    b.industry_id,
    b.product_id,
    p.name as product_name,
    p.material_type as material,
    COUNT(DISTINCT b.id) as batch_count,
    SUM(b.quantity_slabs) as total_slabs,
    SUM(b.available_slabs) as available_slabs,
    SUM(b.reserved_slabs) as reserved_slabs,
    SUM(b.sold_slabs) as sold_slabs,
    SUM(b.net_area) as total_area,
    SUM(b.available_slabs * b.industry_price * (b.height * b.width / 10000)) as available_value,
    AVG(EXTRACT(EPOCH FROM (NOW() - b.entry_date))/86400)::INTEGER as avg_days_in_stock
FROM batches b
JOIN products p ON b.product_id = p.id
WHERE b.is_active = true AND b.deleted_at IS NULL
GROUP BY b.industry_id, b.product_id, p.name, p.material_type;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_inventory
ON mv_inventory_by_product(industry_id, product_id);

-- View materializada: Performance de brokers/vendedores
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_seller_performance AS
SELECT
    sh.sold_by_user_id as seller_id,
    u.name as seller_name,
    sh.industry_id,
    DATE_TRUNC('month', sh.sold_at) as month,
    COUNT(*) as sales_count,
    SUM(sh.sale_price) as total_revenue,
    SUM(sh.broker_commission) as total_commission,
    AVG(sh.sale_price) as avg_ticket,
    AVG(sh.days_to_close) as avg_days_to_close
FROM sales_history sh
LEFT JOIN users u ON sh.sold_by_user_id = u.id
GROUP BY sh.sold_by_user_id, u.name, sh.industry_id, DATE_TRUNC('month', sh.sold_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_seller_perf
ON mv_seller_performance(seller_id, industry_id, month);

-- View materializada: Top produtos vendidos
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_top_products AS
SELECT
    sh.industry_id,
    b.product_id,
    p.name as product_name,
    p.material_type as material,
    DATE_TRUNC('month', sh.sold_at) as month,
    COUNT(*) as sales_count,
    SUM(sh.sale_price) as total_revenue,
    SUM(sh.quantity_slabs_sold) as total_slabs_sold,
    SUM(sh.total_area_sold) as total_area_sold
FROM sales_history sh
JOIN batches b ON sh.batch_id = b.id
JOIN products p ON b.product_id = p.id
GROUP BY sh.industry_id, b.product_id, p.name, p.material_type, DATE_TRUNC('month', sh.sold_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_top_products
ON mv_top_products(industry_id, product_id, month);

-- Funcao para refresh de todas as views
CREATE OR REPLACE FUNCTION refresh_bi_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_sales;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_reservation_funnel;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_inventory_by_product;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_seller_performance;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_top_products;
END;
$$ LANGUAGE plpgsql;

-- Tabela de log para controle de refresh
CREATE TABLE IF NOT EXISTS bi_refresh_log (
    id SERIAL PRIMARY KEY,
    view_name VARCHAR(100) NOT NULL,
    refreshed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    duration_ms INTEGER,
    rows_affected INTEGER,
    status VARCHAR(20) DEFAULT 'SUCCESS',
    error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_bi_refresh_log_view ON bi_refresh_log(view_name, refreshed_at DESC);

-- Comentarios
COMMENT ON MATERIALIZED VIEW mv_daily_sales IS 'Metricas de vendas agregadas por dia, industria e vendedor';
COMMENT ON MATERIALIZED VIEW mv_reservation_funnel IS 'Funil de conversao de reservas: criadas -> aprovadas -> vendas';
COMMENT ON MATERIALIZED VIEW mv_inventory_by_product IS 'Metricas de inventario agregadas por produto';
COMMENT ON MATERIALIZED VIEW mv_seller_performance IS 'Performance de vendedores/brokers por mes';
COMMENT ON MATERIALIZED VIEW mv_top_products IS 'Top produtos mais vendidos por mes';
COMMENT ON FUNCTION refresh_bi_views IS 'Atualiza todas as views materializadas de BI';
COMMENT ON TABLE bi_refresh_log IS 'Log de execucao do refresh das views de BI';
