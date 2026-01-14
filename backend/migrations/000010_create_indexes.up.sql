-- =============================================
-- Migration: 000010_create_indexes
-- Description: Cria índices adicionais para performance
-- =============================================

-- Índices para queries de dashboard
CREATE INDEX idx_batches_count_by_status ON batches(industry_id, status) 
    WHERE is_active = TRUE;

CREATE INDEX idx_sales_monthly_summary ON sales_history(industry_id, sold_by_user_id, sold_at);

-- Índices para contagem de brokers compartilhados
CREATE INDEX idx_shared_inventory_count ON shared_inventory_batches(broker_user_id, is_active);

-- Índices para busca textual
CREATE INDEX idx_products_name_trgm ON products USING gin(name gin_trgm_ops);
CREATE INDEX idx_clientes_name_trgm ON clientes USING gin(name gin_trgm_ops);

-- Nota: Para usar trigram, é necessário criar a extensão pg_trgm
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Índices compostos para queries frequentes
CREATE INDEX idx_batches_industry_product_status ON batches(industry_id, product_id, status, is_active);

CREATE INDEX idx_sales_links_user_type_active ON sales_links(created_by_user_id, link_type, is_active);

-- Índices para ordenação
CREATE INDEX idx_products_created_desc ON products(industry_id, created_at DESC) 
    WHERE deleted_at IS NULL;

CREATE INDEX idx_batches_entry_date_desc ON batches(industry_id, entry_date DESC) 
    WHERE is_active = TRUE;

CREATE INDEX idx_clientes_created_desc ON clientes(sales_link_id, created_at DESC);

-- Índices parciais para queries específicas
-- Índice para encontrar reservas expiradas (checagem feita em runtime)
CREATE INDEX idx_reservations_expired ON reservations(expires_at, status) 
    WHERE status = 'ATIVA';

CREATE INDEX idx_sales_links_public_active ON sales_links(slug_token, is_active) 
    WHERE is_active = TRUE;

-- Índices para aggregations
CREATE INDEX idx_sales_history_commission_calc ON sales_history(sold_by_user_id, sold_at, broker_commission);

-- Comentários
COMMENT ON INDEX idx_batches_count_by_status IS 'Índice para contagem rápida de lotes por status';
COMMENT ON INDEX idx_sales_monthly_summary IS 'Índice para sumário mensal de vendas';
COMMENT ON INDEX idx_reservations_expired IS 'Índice para job de expiração de reservas';