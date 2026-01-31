-- =============================================
-- Migration: 000003_create_tables
-- Description: Cria todas as tabelas do sistema no estado final
-- =============================================

-- =============================================
-- TABELA: industries
-- =============================================
CREATE TABLE industries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255),
    cnpj VARCHAR(20) UNIQUE,
    slug VARCHAR(100) UNIQUE,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    whatsapp VARCHAR(20),
    description TEXT,
    logo_url VARCHAR(500),
    banner_url VARCHAR(500),
    address_country VARCHAR(100),
    address_state VARCHAR(100),
    address_city VARCHAR(255),
    address_street VARCHAR(255),
    address_number VARCHAR(50),
    address_zip_code VARCHAR(20),
    city VARCHAR(100),
    state VARCHAR(2),
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE industries IS 'Indústrias cadastradas no sistema';
COMMENT ON COLUMN industries.slug IS 'Slug único para URLs (ex: pedras-sul)';
COMMENT ON COLUMN industries.cnpj IS 'CNPJ da indústria (apenas dígitos)';
COMMENT ON COLUMN industries.whatsapp IS 'Número do WhatsApp para contato';
COMMENT ON COLUMN industries.city IS 'Cidade do depósito';
COMMENT ON COLUMN industries.state IS 'Estado do depósito (UF)';
COMMENT ON COLUMN industries.banner_url IS 'URL do banner personalizado do depósito';
COMMENT ON COLUMN industries.is_public IS 'Se o depósito aparece no catálogo público';

-- =============================================
-- TABELA: users
-- =============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    industry_id UUID REFERENCES industries(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    whatsapp VARCHAR(20),
    role user_role_type NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    first_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (name, industry_id)
);

COMMENT ON TABLE users IS 'Usuários do sistema (admin, vendedores, brokers)';
COMMENT ON COLUMN users.industry_id IS 'NULL para brokers freelancers';
COMMENT ON COLUMN users.password_hash IS 'Hash Argon2id da senha';
COMMENT ON COLUMN users.role IS 'Role do usuário: ADMIN_INDUSTRIA, VENDEDOR_INTERNO ou BROKER';
COMMENT ON COLUMN users.first_login_at IS 'Data/hora do primeiro login do usuário. NULL significa que nunca logou.';

-- =============================================
-- TABELA: products
-- =============================================
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    industry_id UUID NOT NULL REFERENCES industries(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    sku_code VARCHAR(100),
    description TEXT,
    material_type VARCHAR(100),
    finish_type finish_type_enum DEFAULT 'POLIDO',
    is_public_catalog BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE products IS 'Catálogo de produtos (tipos de pedra)';
COMMENT ON COLUMN products.sku_code IS 'Código interno do produto';
COMMENT ON COLUMN products.material_type IS 'Tipo de material: GRANITO, MARMORE, QUARTZITO, etc';
COMMENT ON COLUMN products.is_public_catalog IS 'Se aparece na vitrine pública';
COMMENT ON COLUMN products.deleted_at IS 'Soft delete - timestamp de exclusão';

-- =============================================
-- TABELA: product_medias
-- =============================================
CREATE TABLE product_medias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    url VARCHAR(500) NOT NULL,
    display_order INTEGER DEFAULT 0,
    is_cover BOOLEAN DEFAULT FALSE,
    media_type media_type_enum DEFAULT 'IMAGE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE product_medias IS 'Mídias (fotos/vídeos) de marketing dos produtos';
COMMENT ON COLUMN product_medias.display_order IS 'Ordem de exibição das mídias';
COMMENT ON COLUMN product_medias.is_cover IS 'Se é a imagem de capa';

-- =============================================
-- TABELA: batches
-- =============================================
CREATE TABLE batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    industry_id UUID NOT NULL REFERENCES industries(id) ON DELETE CASCADE,
    batch_code VARCHAR(100) NOT NULL,
    
    -- Dimensões físicas
    height DECIMAL(8,2) NOT NULL CHECK (height > 0),
    width DECIMAL(8,2) NOT NULL CHECK (width > 0),
    thickness DECIMAL(8,2) NOT NULL CHECK (thickness > 0),
    quantity_slabs INTEGER DEFAULT 1 CHECK (quantity_slabs > 0),
    net_area DECIMAL(10,2) GENERATED ALWAYS AS ((height * width * quantity_slabs) / 10000) STORED,
    
    -- Gestão de chapas individuais
    available_slabs INTEGER NOT NULL DEFAULT 0 CHECK (available_slabs >= 0),
    reserved_slabs INTEGER NOT NULL DEFAULT 0 CHECK (reserved_slabs >= 0),
    sold_slabs INTEGER NOT NULL DEFAULT 0 CHECK (sold_slabs >= 0),
    inactive_slabs INTEGER NOT NULL DEFAULT 0 CHECK (inactive_slabs >= 0),
    
    -- Preço e status
    industry_price DECIMAL(12,2) NOT NULL CHECK (industry_price > 0),
    price_unit price_unit_type DEFAULT 'M2',
    status batch_status_type DEFAULT 'DISPONIVEL',
    origin_quarry VARCHAR(255),
    
    -- Controles
    is_active BOOLEAN DEFAULT TRUE,
    is_public BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    entry_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT check_available_slabs_max CHECK (available_slabs <= quantity_slabs),
    CONSTRAINT check_total_slabs_consistency CHECK (available_slabs + reserved_slabs + sold_slabs + inactive_slabs = quantity_slabs),
    CONSTRAINT idx_batches_unique_code UNIQUE (industry_id, batch_code)
);

COMMENT ON TABLE batches IS 'Lotes físicos de estoque';
COMMENT ON COLUMN batches.batch_code IS 'Código do lote (formato: AAA-999999)';
COMMENT ON COLUMN batches.height IS 'Altura em centímetros';
COMMENT ON COLUMN batches.width IS 'Largura em centímetros';
COMMENT ON COLUMN batches.thickness IS 'Espessura em centímetros';
COMMENT ON COLUMN batches.quantity_slabs IS 'Quantidade de chapas no lote';
COMMENT ON COLUMN batches.net_area IS 'Área total em m² (calculada automaticamente)';
COMMENT ON COLUMN batches.available_slabs IS 'Quantidade de chapas disponíveis para reserva/venda';
COMMENT ON COLUMN batches.reserved_slabs IS 'Quantidade de chapas reservadas';
COMMENT ON COLUMN batches.sold_slabs IS 'Quantidade de chapas vendidas';
COMMENT ON COLUMN batches.inactive_slabs IS 'Quantidade de chapas inativas';
COMMENT ON COLUMN batches.industry_price IS 'Preço por unidade de área (conforme price_unit)';
COMMENT ON COLUMN batches.price_unit IS 'Unidade de preço: M2 (metro quadrado) ou FT2 (pé quadrado)';
COMMENT ON COLUMN batches.origin_quarry IS 'Pedreira de origem';
COMMENT ON COLUMN batches.is_public IS 'Se o lote aparece na página pública do depósito';
COMMENT ON COLUMN batches.deleted_at IS 'Data de exclusão (soft delete)';

-- =============================================
-- TABELA: batch_medias
-- =============================================
CREATE TABLE batch_medias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    url VARCHAR(500) NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE batch_medias IS 'Mídias (fotos reais) dos lotes';

-- =============================================
-- TABELA: shared_inventory_batches
-- =============================================
CREATE TABLE shared_inventory_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    shared_with_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    industry_owner_id UUID NOT NULL REFERENCES industries(id) ON DELETE CASCADE,
    negotiated_price DECIMAL(12,2) CHECK (negotiated_price IS NULL OR negotiated_price > 0),
    negotiated_price_unit price_unit_type DEFAULT 'M2',
    shared_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    CONSTRAINT unique_batch_share UNIQUE (batch_id, shared_with_user_id)
);

COMMENT ON TABLE shared_inventory_batches IS 'Lotes compartilhados com brokers/vendedores específicos';
COMMENT ON COLUMN shared_inventory_batches.shared_with_user_id IS 'ID do usuário (broker ou vendedor interno) com quem o lote foi compartilhado';
COMMENT ON COLUMN shared_inventory_batches.negotiated_price IS 'Preço especial negociado para este usuário';
COMMENT ON COLUMN shared_inventory_batches.negotiated_price_unit IS 'Unidade do preço negociado';

-- =============================================
-- TABELA: shared_catalog_permissions
-- =============================================
CREATE TABLE shared_catalog_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    industry_id UUID NOT NULL REFERENCES industries(id) ON DELETE CASCADE,
    shared_with_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    can_show_prices BOOLEAN DEFAULT FALSE,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    CONSTRAINT unique_catalog_share UNIQUE (industry_id, shared_with_user_id)
);

COMMENT ON TABLE shared_catalog_permissions IS 'Permissões de acesso ao catálogo geral da indústria';
COMMENT ON COLUMN shared_catalog_permissions.shared_with_user_id IS 'ID do usuário (broker ou vendedor interno) com quem o catálogo foi compartilhado';
COMMENT ON COLUMN shared_catalog_permissions.can_show_prices IS 'Se o usuário pode ver/exibir preços';

-- =============================================
-- TABELA: sales_links
-- =============================================
CREATE TABLE sales_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    industry_id UUID NOT NULL REFERENCES industries(id) ON DELETE CASCADE,
    
    -- Campos polimórficos
    batch_id UUID REFERENCES batches(id) ON DELETE SET NULL,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    
    -- Configurações do link
    link_type link_type_enum NOT NULL,
    slug_token VARCHAR(100) NOT NULL UNIQUE,
    title VARCHAR(255),
    custom_message TEXT,
    display_price DECIMAL(12,2) CHECK (display_price IS NULL OR display_price > 0),
    show_price BOOLEAN DEFAULT TRUE,
    
    -- Métricas e controle
    views_count INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE sales_links IS 'Links públicos de venda (landing pages)';
COMMENT ON COLUMN sales_links.slug_token IS 'Token único da URL (ex: marmore-carrara-2024)';
COMMENT ON COLUMN sales_links.link_type IS 'Tipo: LOTE_UNICO, PRODUTO_GERAL, CATALOGO_COMPLETO ou MULTIPLOS_LOTES';
COMMENT ON COLUMN sales_links.display_price IS 'Preço exibido ao cliente final';
COMMENT ON COLUMN sales_links.show_price IS 'Se exibe preço ou "Sob Consulta"';
COMMENT ON COLUMN sales_links.views_count IS 'Contador de visualizações';

-- =============================================
-- TABELA: sales_link_items
-- =============================================
CREATE TABLE sales_link_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sales_link_id UUID NOT NULL REFERENCES sales_links(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price DECIMAL(12,2) NOT NULL CHECK (unit_price >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (sales_link_id, batch_id)
);

COMMENT ON TABLE sales_link_items IS 'Itens individuais de um link de venda com múltiplos lotes';
COMMENT ON COLUMN sales_link_items.quantity IS 'Quantidade de peças/chapas do lote';
COMMENT ON COLUMN sales_link_items.unit_price IS 'Preço unitário por peça/chapa';

-- =============================================
-- TABELA: clientes
-- =============================================
CREATE TABLE clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sales_link_id UUID REFERENCES sales_links(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    whatsapp VARCHAR(20),
    message TEXT,
    marketing_opt_in BOOLEAN DEFAULT FALSE,
    status cliente_status_type DEFAULT 'NOVO',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_interaction TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE clientes IS 'Clientes (clientes potenciais) capturados';
COMMENT ON COLUMN clientes.created_by IS 'Usuário que criou o cliente manualmente (NULL se capturado via link)';
COMMENT ON COLUMN clientes.email IS 'Email do cliente';
COMMENT ON COLUMN clientes.phone IS 'Telefone do cliente';
COMMENT ON COLUMN clientes.whatsapp IS 'Número do WhatsApp do cliente';
COMMENT ON COLUMN clientes.marketing_opt_in IS 'Se aceitou receber comunicações de marketing';
COMMENT ON COLUMN clientes.status IS 'Status de acompanhamento: NOVO, CONTATADO, RESOLVIDO';

-- =============================================
-- TABELA: cliente_interactions
-- =============================================
CREATE TABLE cliente_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    sales_link_id UUID NOT NULL REFERENCES sales_links(id) ON DELETE SET NULL,
    target_batch_id UUID REFERENCES batches(id) ON DELETE SET NULL,
    target_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    message TEXT,
    interaction_type interaction_type_enum DEFAULT 'INTERESSE_LOTE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE cliente_interactions IS 'Histórico de interações dos clientes';
COMMENT ON COLUMN cliente_interactions.interaction_type IS 'Tipo: INTERESSE_LOTE, INTERESSE_CATALOGO, DUVIDA_GERAL';

-- =============================================
-- TABELA: cliente_subscriptions
-- =============================================
CREATE TABLE cliente_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    linked_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE cliente_subscriptions IS 'Assinaturas de interesse em produtos específicos';
COMMENT ON COLUMN cliente_subscriptions.linked_user_id IS 'Vendedor responsável pelo cliente';

-- =============================================
-- TABELA: reservations
-- =============================================
CREATE TABLE reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE RESTRICT,
    reserved_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
    quantity_slabs_reserved INTEGER NOT NULL DEFAULT 1 CHECK (quantity_slabs_reserved > 0),
    status reservation_status_type DEFAULT 'ATIVA',
    notes TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

COMMENT ON TABLE reservations IS 'Reservas de lotes';
COMMENT ON COLUMN reservations.reserved_by_user_id IS 'Usuário que fez a reserva (vendedor ou broker)';
COMMENT ON COLUMN reservations.quantity_slabs_reserved IS 'Quantidade de chapas reservadas nesta reserva';
COMMENT ON COLUMN reservations.expires_at IS 'Data de expiração da reserva';
COMMENT ON COLUMN reservations.status IS 'Status: ATIVA, CONFIRMADA_VENDA, EXPIRADA, CANCELADA';

-- =============================================
-- TABELA: sales_history
-- =============================================
CREATE TABLE sales_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES batches(id),
    sold_by_user_id UUID REFERENCES users(id),
    industry_id UUID NOT NULL REFERENCES industries(id),
    cliente_id UUID REFERENCES clientes(id),
    customer_name VARCHAR(255) NOT NULL,
    customer_contact VARCHAR(255) NOT NULL,
    seller_name VARCHAR(255),
    sale_price DECIMAL(12,2) NOT NULL CHECK (sale_price > 0),
    broker_commission DECIMAL(12,2) DEFAULT 0 CHECK (broker_commission >= 0),
    net_industry_value DECIMAL(12,2) NOT NULL CHECK (net_industry_value > 0),
    quantity_slabs_sold INTEGER NOT NULL DEFAULT 1 CHECK (quantity_slabs_sold > 0),
    price_unit price_unit_type DEFAULT 'M2',
    price_per_unit DECIMAL(12,4),
    total_area_sold DECIMAL(10,2),
    invoice_url VARCHAR(500),
    notes TEXT,
    sold_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_commission_calculation CHECK (sale_price >= net_industry_value)
);

COMMENT ON TABLE sales_history IS 'Histórico de vendas realizadas';
COMMENT ON COLUMN sales_history.sale_price IS 'Preço final pago pelo cliente';
COMMENT ON COLUMN sales_history.broker_commission IS 'Comissão do broker/vendedor';
COMMENT ON COLUMN sales_history.net_industry_value IS 'Valor líquido para a indústria';
COMMENT ON COLUMN sales_history.customer_name IS 'Nome do cliente final';
COMMENT ON COLUMN sales_history.customer_contact IS 'Contato do cliente final';
COMMENT ON COLUMN sales_history.seller_name IS 'Nome do vendedor (quando sold_by_user_id é NULL)';
COMMENT ON COLUMN sales_history.quantity_slabs_sold IS 'Quantidade de chapas vendidas';
COMMENT ON COLUMN sales_history.price_unit IS 'Unidade de preço usada na venda';
COMMENT ON COLUMN sales_history.price_per_unit IS 'Preço por unidade de área na venda';
COMMENT ON COLUMN sales_history.total_area_sold IS 'Área total vendida em m²';

-- =============================================
-- TABELA: user_sessions
-- =============================================
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_agent VARCHAR(500),
    ip_address VARCHAR(50)
);

COMMENT ON TABLE user_sessions IS 'Sessões de usuário para gerenciamento de refresh tokens';
COMMENT ON COLUMN user_sessions.refresh_token_hash IS 'Hash SHA-256 do refresh token (nunca armazenar token em texto puro)';
COMMENT ON COLUMN user_sessions.expires_at IS 'Data de expiração do refresh token';
COMMENT ON COLUMN user_sessions.is_active IS 'Se FALSE, sessão foi invalidada (logout ou rotação)';
COMMENT ON COLUMN user_sessions.last_used_at IS 'Última vez que o refresh token foi usado';

-- =============================================
-- TABELA: password_reset_tokens
-- =============================================
CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE password_reset_tokens IS 'Tokens temporários para recuperação de senha';
COMMENT ON COLUMN password_reset_tokens.token_hash IS 'Hash SHA256 do código para segurança';
COMMENT ON COLUMN password_reset_tokens.code IS 'Código de 6 dígitos exibido no email';

-- =============================================
-- TABELA: catalog_links
-- =============================================
CREATE TABLE catalog_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    industry_id UUID NOT NULL REFERENCES industries(id) ON DELETE CASCADE,
    slug_token VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(100),
    custom_message TEXT,
    views_count INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE catalog_links IS 'Links de catálogo público personalizados';

-- =============================================
-- TABELA: catalog_link_batches
-- =============================================
CREATE TABLE catalog_link_batches (
    catalog_link_id UUID NOT NULL REFERENCES catalog_links(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (catalog_link_id, batch_id)
);

COMMENT ON TABLE catalog_link_batches IS 'Relacionamento entre links de catálogo e lotes';
