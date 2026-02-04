-- =============================================
-- Migration: 000004_create_indexes
-- Description: Cria todos os índices para performance
-- =============================================

-- =============================================
-- ÍNDICES: industries
-- =============================================
CREATE INDEX idx_industries_slug ON industries(slug);
CREATE INDEX idx_industries_cnpj ON industries(cnpj);
CREATE INDEX idx_industries_public ON industries(is_public) WHERE is_public = TRUE;

-- =============================================
-- ÍNDICES: users
-- =============================================
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_industry_id ON users(industry_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_users_first_login_at ON users(first_login_at) WHERE first_login_at IS NULL;

-- =============================================
-- ÍNDICES: products
-- =============================================
CREATE INDEX idx_products_industry_id ON products(industry_id);
CREATE INDEX idx_products_material_type ON products(material_type);
CREATE INDEX idx_products_deleted_at ON products(deleted_at);
CREATE INDEX idx_products_active ON products(industry_id, deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_name_search ON products USING gin(to_tsvector('portuguese', name));
CREATE INDEX idx_products_name_trgm ON products USING gin(name gin_trgm_ops);
CREATE INDEX idx_products_created_desc ON products(industry_id, created_at DESC) WHERE deleted_at IS NULL;

-- =============================================
-- ÍNDICES: product_medias
-- =============================================
CREATE INDEX idx_product_medias_product_id ON product_medias(product_id);
CREATE INDEX idx_product_medias_display_order ON product_medias(product_id, display_order);
CREATE INDEX idx_product_medias_cover ON product_medias(product_id, is_cover) WHERE is_cover = TRUE;

-- Constraint: apenas uma imagem de capa por produto
CREATE UNIQUE INDEX idx_product_medias_unique_cover ON product_medias(product_id) WHERE is_cover = TRUE;

-- =============================================
-- ÍNDICES: batches
-- =============================================
CREATE INDEX idx_batches_product_id ON batches(product_id);
CREATE INDEX idx_batches_industry_id ON batches(industry_id);
CREATE INDEX idx_batches_status ON batches(status);
CREATE INDEX idx_batches_code ON batches(batch_code);
CREATE INDEX idx_batches_available ON batches(industry_id, status, is_active) 
    WHERE status = 'DISPONIVEL' AND is_active = TRUE;
CREATE INDEX idx_batches_product_status ON batches(product_id, status, is_active) 
    WHERE is_active = TRUE;
CREATE INDEX idx_batches_count_by_status ON batches(industry_id, status) 
    WHERE is_active = TRUE;
CREATE INDEX idx_batches_deleted_at ON batches(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_batches_available_slabs ON batches(industry_id, available_slabs) 
    WHERE available_slabs > 0 AND is_active = TRUE;
CREATE INDEX idx_batches_industry_status_available ON batches(industry_id, status, available_slabs) 
    WHERE is_active = TRUE;
CREATE INDEX idx_batches_industry_product_status ON batches(industry_id, product_id, status, is_active);
CREATE INDEX idx_batches_entry_date_desc ON batches(industry_id, entry_date DESC) 
    WHERE is_active = TRUE;
CREATE INDEX idx_batches_public ON batches(industry_id, is_public, deleted_at) 
    WHERE is_public = TRUE AND deleted_at IS NULL;
CREATE INDEX idx_batches_activity ON batches(last_activity_at DESC) WHERE is_active = TRUE;

-- =============================================
-- ÍNDICES: batch_medias
-- =============================================
CREATE INDEX idx_batch_medias_batch_id ON batch_medias(batch_id);
CREATE INDEX idx_batch_medias_display_order ON batch_medias(batch_id, display_order);

-- =============================================
-- ÍNDICES: shared_inventory_batches
-- =============================================
CREATE INDEX idx_shared_inventory_user ON shared_inventory_batches(shared_with_user_id, is_active) 
    WHERE is_active = TRUE;
CREATE INDEX idx_shared_inventory_batch ON shared_inventory_batches(batch_id);
CREATE INDEX idx_shared_inventory_industry ON shared_inventory_batches(industry_owner_id);
CREATE INDEX idx_shared_inventory_count ON shared_inventory_batches(shared_with_user_id, is_active);

-- =============================================
-- ÍNDICES: shared_catalog_permissions
-- =============================================
CREATE INDEX idx_catalog_permissions_user ON shared_catalog_permissions(shared_with_user_id, is_active) 
    WHERE is_active = TRUE;
CREATE INDEX idx_catalog_permissions_industry ON shared_catalog_permissions(industry_id);

-- =============================================
-- ÍNDICES: sales_links
-- =============================================
CREATE INDEX idx_sales_links_slug ON sales_links(slug_token);
CREATE INDEX idx_sales_links_creator ON sales_links(created_by_user_id, is_active) 
    WHERE is_active = TRUE;
CREATE INDEX idx_sales_links_industry ON sales_links(industry_id);
CREATE INDEX idx_sales_links_type ON sales_links(link_type);
CREATE INDEX idx_sales_links_batch ON sales_links(batch_id) WHERE batch_id IS NOT NULL;
CREATE INDEX idx_sales_links_product ON sales_links(product_id) WHERE product_id IS NOT NULL;
CREATE INDEX idx_sales_links_active ON sales_links(is_active, expires_at) 
    WHERE is_active = TRUE;
CREATE INDEX idx_sales_links_user_type_active ON sales_links(created_by_user_id, link_type, is_active);
CREATE INDEX idx_sales_links_public_active ON sales_links(slug_token, is_active) 
    WHERE is_active = TRUE;

-- =============================================
-- ÍNDICES: sales_link_items
-- =============================================
CREATE INDEX idx_sales_link_items_link ON sales_link_items(sales_link_id);
CREATE INDEX idx_sales_link_items_batch ON sales_link_items(batch_id);

-- =============================================
-- ÍNDICES: clientes
-- =============================================
CREATE INDEX idx_clientes_sales_link ON clientes(sales_link_id);
CREATE INDEX idx_clientes_email ON clientes(email);
CREATE INDEX idx_clientes_phone ON clientes(phone);
CREATE INDEX idx_clientes_created_at ON clientes(created_at DESC);
CREATE INDEX idx_clientes_marketing_opt_in ON clientes(marketing_opt_in) WHERE marketing_opt_in = TRUE;
CREATE INDEX idx_clientes_created_by ON clientes(created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_clientes_name_trgm ON clientes USING gin(name gin_trgm_ops);
CREATE INDEX idx_clientes_created_desc ON clientes(sales_link_id, created_at DESC);
CREATE INDEX idx_clientes_source ON clientes(source);
CREATE INDEX idx_clientes_industry_id ON clientes(industry_id);
CREATE INDEX idx_clientes_source_batch ON clientes(source_batch_id) WHERE source_batch_id IS NOT NULL;

-- =============================================
-- ÍNDICES: cliente_interactions
-- =============================================
CREATE INDEX idx_cliente_interactions_cliente ON cliente_interactions(cliente_id, created_at DESC);
CREATE INDEX idx_cliente_interactions_sales_link ON cliente_interactions(sales_link_id);
CREATE INDEX idx_cliente_interactions_batch ON cliente_interactions(target_batch_id) 
    WHERE target_batch_id IS NOT NULL;
CREATE INDEX idx_cliente_interactions_product ON cliente_interactions(target_product_id) 
    WHERE target_product_id IS NOT NULL;

-- =============================================
-- ÍNDICES: cliente_subscriptions
-- =============================================
CREATE INDEX idx_cliente_subscriptions_cliente ON cliente_subscriptions(cliente_id);
CREATE INDEX idx_cliente_subscriptions_product ON cliente_subscriptions(product_id);
CREATE INDEX idx_cliente_subscriptions_user ON cliente_subscriptions(linked_user_id);

-- =============================================
-- ÍNDICES: reservations
-- =============================================
CREATE INDEX idx_reservations_batch ON reservations(batch_id);
CREATE INDEX idx_reservations_user ON reservations(reserved_by_user_id);
CREATE INDEX idx_reservations_cliente ON reservations(cliente_id);
CREATE INDEX idx_reservations_status ON reservations(status);
CREATE INDEX idx_reservations_expires_at ON reservations(expires_at) 
    WHERE status = 'ATIVA';
CREATE INDEX idx_reservations_active ON reservations(is_active, status) 
    WHERE is_active = TRUE;
CREATE INDEX idx_reservations_expired ON reservations(expires_at, status) 
    WHERE status = 'ATIVA';
CREATE INDEX idx_reservations_industry ON reservations(industry_id);
CREATE INDEX idx_reservations_pending_approval ON reservations(status, created_at) 
    WHERE status = 'PENDENTE_APROVACAO';
CREATE INDEX idx_reservations_approved ON reservations(status, approved_at) 
    WHERE status = 'APROVADA';

-- =============================================
-- ÍNDICES: sales_history
-- =============================================
CREATE INDEX idx_sales_history_batch ON sales_history(batch_id);
CREATE INDEX idx_sales_history_seller ON sales_history(sold_by_user_id);
CREATE INDEX idx_sales_history_industry ON sales_history(industry_id);
CREATE INDEX idx_sales_history_cliente ON sales_history(cliente_id);
CREATE INDEX idx_sales_history_sold_at ON sales_history(sold_at DESC);
CREATE INDEX idx_sales_history_industry_date ON sales_history(industry_id, sold_at DESC);
CREATE INDEX idx_sales_monthly_summary ON sales_history(industry_id, sold_by_user_id, sold_at);
CREATE INDEX idx_sales_history_commission_calc ON sales_history(sold_by_user_id, sold_at, broker_commission);
CREATE INDEX idx_sales_history_reservation ON sales_history(reservation_id) WHERE reservation_id IS NOT NULL;
CREATE INDEX idx_sales_history_source ON sales_history(source);

-- =============================================
-- ÍNDICES: user_sessions
-- =============================================
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token_hash ON user_sessions(refresh_token_hash);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at) 
    WHERE is_active = TRUE;
CREATE INDEX idx_user_sessions_active ON user_sessions(user_id, is_active) 
    WHERE is_active = TRUE;

-- =============================================
-- ÍNDICES: password_reset_tokens
-- =============================================
CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_tokens_token_hash ON password_reset_tokens(token_hash);
CREATE INDEX idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

-- =============================================
-- ÍNDICES: catalog_links
-- =============================================
CREATE INDEX idx_catalog_links_slug_token ON catalog_links(slug_token);
CREATE INDEX idx_catalog_links_industry_id ON catalog_links(industry_id);
CREATE INDEX idx_catalog_links_active ON catalog_links(is_active, expires_at) WHERE is_active = TRUE;

-- =============================================
-- ÍNDICES: catalog_link_batches
-- =============================================
CREATE INDEX idx_catalog_link_batches_link_id ON catalog_link_batches(catalog_link_id);
CREATE INDEX idx_catalog_link_batches_batch_id ON catalog_link_batches(batch_id);
CREATE INDEX idx_catalog_link_batches_display_order ON catalog_link_batches(catalog_link_id, display_order);

-- =============================================
-- COMENTÁRIOS
-- =============================================
COMMENT ON INDEX idx_batches_count_by_status IS 'Índice para contagem rápida de lotes por status';
COMMENT ON INDEX idx_sales_monthly_summary IS 'Índice para sumário mensal de vendas';
COMMENT ON INDEX idx_reservations_expired IS 'Índice para job de expiração de reservas';
