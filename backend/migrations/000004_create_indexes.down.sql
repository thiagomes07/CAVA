-- =============================================
-- Migration: 000004_create_indexes (DOWN)
-- Description: Remove todos os índices
-- =============================================

-- catalog_link_batches
DROP INDEX IF EXISTS idx_catalog_link_batches_display_order;
DROP INDEX IF EXISTS idx_catalog_link_batches_batch_id;
DROP INDEX IF EXISTS idx_catalog_link_batches_link_id;

-- catalog_links
DROP INDEX IF EXISTS idx_catalog_links_active;
DROP INDEX IF EXISTS idx_catalog_links_industry_id;
DROP INDEX IF EXISTS idx_catalog_links_slug_token;

-- password_reset_tokens
DROP INDEX IF EXISTS idx_password_reset_tokens_expires_at;
DROP INDEX IF EXISTS idx_password_reset_tokens_token_hash;
DROP INDEX IF EXISTS idx_password_reset_tokens_user_id;

-- user_sessions
DROP INDEX IF EXISTS idx_user_sessions_active;
DROP INDEX IF EXISTS idx_user_sessions_expires;
DROP INDEX IF EXISTS idx_user_sessions_token_hash;
DROP INDEX IF EXISTS idx_user_sessions_user_id;

-- sales_history
DROP INDEX IF EXISTS idx_sales_history_commission_calc;
DROP INDEX IF EXISTS idx_sales_monthly_summary;
DROP INDEX IF EXISTS idx_sales_history_industry_date;
DROP INDEX IF EXISTS idx_sales_history_sold_at;
DROP INDEX IF EXISTS idx_sales_history_cliente;
DROP INDEX IF EXISTS idx_sales_history_industry;
DROP INDEX IF EXISTS idx_sales_history_seller;
DROP INDEX IF EXISTS idx_sales_history_batch;

-- reservations
DROP INDEX IF EXISTS idx_reservations_expired;
DROP INDEX IF EXISTS idx_reservations_active;
DROP INDEX IF EXISTS idx_reservations_expires_at;
DROP INDEX IF EXISTS idx_reservations_status;
DROP INDEX IF EXISTS idx_reservations_cliente;
DROP INDEX IF EXISTS idx_reservations_user;
DROP INDEX IF EXISTS idx_reservations_batch;

-- cliente_subscriptions
DROP INDEX IF EXISTS idx_cliente_subscriptions_user;
DROP INDEX IF EXISTS idx_cliente_subscriptions_product;
DROP INDEX IF EXISTS idx_cliente_subscriptions_cliente;

-- cliente_interactions
DROP INDEX IF EXISTS idx_cliente_interactions_product;
DROP INDEX IF EXISTS idx_cliente_interactions_batch;
DROP INDEX IF EXISTS idx_cliente_interactions_sales_link;
DROP INDEX IF EXISTS idx_cliente_interactions_cliente;

-- clientes
DROP INDEX IF EXISTS idx_clientes_created_desc;
DROP INDEX IF EXISTS idx_clientes_name_trgm;
DROP INDEX IF EXISTS idx_clientes_created_by;
DROP INDEX IF EXISTS idx_clientes_marketing_opt_in;
DROP INDEX IF EXISTS idx_clientes_created_at;

DROP INDEX IF EXISTS idx_clientes_phone;
DROP INDEX IF EXISTS idx_clientes_email;
DROP INDEX IF EXISTS idx_clientes_sales_link;

-- sales_link_items
DROP INDEX IF EXISTS idx_sales_link_items_batch;
DROP INDEX IF EXISTS idx_sales_link_items_link;

-- sales_links
DROP INDEX IF EXISTS idx_sales_links_public_active;
DROP INDEX IF EXISTS idx_sales_links_user_type_active;
DROP INDEX IF EXISTS idx_sales_links_active;
DROP INDEX IF EXISTS idx_sales_links_product;
DROP INDEX IF EXISTS idx_sales_links_batch;
DROP INDEX IF EXISTS idx_sales_links_type;
DROP INDEX IF EXISTS idx_sales_links_industry;
DROP INDEX IF EXISTS idx_sales_links_creator;
DROP INDEX IF EXISTS idx_sales_links_slug;

-- shared_catalog_permissions
DROP INDEX IF EXISTS idx_catalog_permissions_industry;
DROP INDEX IF EXISTS idx_catalog_permissions_user;

-- shared_inventory_batches
DROP INDEX IF EXISTS idx_shared_inventory_count;
DROP INDEX IF EXISTS idx_shared_inventory_industry;
DROP INDEX IF EXISTS idx_shared_inventory_batch;
DROP INDEX IF EXISTS idx_shared_inventory_user;

-- batch_medias
DROP INDEX IF EXISTS idx_batch_medias_display_order;
DROP INDEX IF EXISTS idx_batch_medias_batch_id;

-- batches
DROP INDEX IF EXISTS idx_batches_public;
DROP INDEX IF EXISTS idx_batches_entry_date_desc;
DROP INDEX IF EXISTS idx_batches_industry_product_status;
DROP INDEX IF EXISTS idx_batches_industry_status_available;
DROP INDEX IF EXISTS idx_batches_available_slabs;
DROP INDEX IF EXISTS idx_batches_deleted_at;
DROP INDEX IF EXISTS idx_batches_count_by_status;
DROP INDEX IF EXISTS idx_batches_product_status;
DROP INDEX IF EXISTS idx_batches_available;
DROP INDEX IF EXISTS idx_batches_code;
DROP INDEX IF EXISTS idx_batches_status;
DROP INDEX IF EXISTS idx_batches_industry_id;
DROP INDEX IF EXISTS idx_batches_product_id;

-- product_medias
DROP INDEX IF EXISTS idx_product_medias_unique_cover;
DROP INDEX IF EXISTS idx_product_medias_cover;
DROP INDEX IF EXISTS idx_product_medias_display_order;
DROP INDEX IF EXISTS idx_product_medias_product_id;

-- products
DROP INDEX IF EXISTS idx_products_created_desc;
DROP INDEX IF EXISTS idx_products_name_trgm;
DROP INDEX IF EXISTS idx_products_name_search;
DROP INDEX IF EXISTS idx_products_active;
DROP INDEX IF EXISTS idx_products_deleted_at;
DROP INDEX IF EXISTS idx_products_material_type;
DROP INDEX IF EXISTS idx_products_industry_id;

-- users
DROP INDEX IF EXISTS idx_users_first_login_at;
DROP INDEX IF EXISTS idx_users_active;
DROP INDEX IF EXISTS idx_users_role;
DROP INDEX IF EXISTS idx_users_industry_id;
DROP INDEX IF EXISTS idx_users_email;

-- industries
DROP INDEX IF EXISTS idx_industries_public;
DROP INDEX IF EXISTS idx_industries_cnpj;
DROP INDEX IF EXISTS idx_industries_slug;
