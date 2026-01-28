-- =============================================
-- Migration: 000003_create_core_tables
-- Description: Cria tabelas core (industries, users)
-- =============================================

-- Tabela: Indústrias
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
    address_country VARCHAR(100),
    address_state VARCHAR(100),
    address_city VARCHAR(255),
    address_street VARCHAR(255),
    address_number VARCHAR(50),
    address_zip_code VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para industries
CREATE INDEX idx_industries_slug ON industries(slug);
CREATE INDEX idx_industries_cnpj ON industries(cnpj);

-- Comentários
COMMENT ON TABLE industries IS 'Indústrias cadastradas no sistema';
COMMENT ON COLUMN industries.slug IS 'Slug único para URLs (ex: pedras-sul)';
COMMENT ON COLUMN industries.cnpj IS 'CNPJ da indústria (apenas dígitos)';


-- Tabela: Usuários
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    industry_id UUID REFERENCES industries(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    role user_role_type NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- Unique constraint: nome único por indústria
    UNIQUE (name, industry_id)
);

-- Índices para users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_industry_id ON users(industry_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = TRUE;

-- Comentários
COMMENT ON TABLE users IS 'Usuários do sistema (admin, vendedores, brokers)';
COMMENT ON COLUMN users.industry_id IS 'NULL para brokers freelancers';
COMMENT ON COLUMN users.password_hash IS 'Hash Argon2id da senha';
COMMENT ON COLUMN users.role IS 'Role do usuário: ADMIN_INDUSTRIA, VENDEDOR_INTERNO ou BROKER';

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_industries_updated_at
    BEFORE UPDATE ON industries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();