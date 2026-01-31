-- =============================================
-- Migration: 000002_create_enums
-- Description: Cria tipos ENUM para garantir integridade dos dados
-- =============================================

-- ENUM: Roles de usuários
CREATE TYPE user_role_type AS ENUM (
    'ADMIN_INDUSTRIA',
    'VENDEDOR_INTERNO',
    'BROKER'
);

-- ENUM: Status de lotes
CREATE TYPE batch_status_type AS ENUM (
    'DISPONIVEL',
    'RESERVADO',
    'VENDIDO',
    'INATIVO'
);

-- ENUM: Tipos de links de venda
CREATE TYPE link_type_enum AS ENUM (
    'LOTE_UNICO',
    'PRODUTO_GERAL',
    'CATALOGO_COMPLETO',
    'MULTIPLOS_LOTES'
);

-- ENUM: Tipos de mídia
CREATE TYPE media_type_enum AS ENUM (
    'IMAGE',
    'VIDEO'
);

-- ENUM: Tipos de interação de clientes
CREATE TYPE interaction_type_enum AS ENUM (
    'INTERESSE_LOTE',
    'INTERESSE_CATALOGO',
    'DUVIDA_GERAL'
);

-- ENUM: Status de reservas
CREATE TYPE reservation_status_type AS ENUM (
    'ATIVA',
    'CONFIRMADA_VENDA',
    'EXPIRADA',
    'CANCELADA'
);

-- ENUM: Tipos de acabamento
CREATE TYPE finish_type_enum AS ENUM (
    'POLIDO',
    'LEVIGADO',
    'BRUTO',
    'APICOADO',
    'FLAMEADO'
);

-- ENUM: Status de clientes
CREATE TYPE cliente_status_type AS ENUM (
    'NOVO',
    'CONTATADO',
    'RESOLVIDO'
);

-- ENUM: Unidade de preço
CREATE TYPE price_unit_type AS ENUM (
    'M2',
    'FT2'
);

-- Comentários descritivos
COMMENT ON TYPE user_role_type IS 'Tipos de roles de usuários no sistema';
COMMENT ON TYPE batch_status_type IS 'Status possíveis de um lote de estoque';
COMMENT ON TYPE link_type_enum IS 'Tipos de links de venda públicos';
COMMENT ON TYPE media_type_enum IS 'Tipos de mídia suportados';
COMMENT ON TYPE interaction_type_enum IS 'Tipos de interação de clientes';
COMMENT ON TYPE reservation_status_type IS 'Status de reservas de lotes';
COMMENT ON TYPE finish_type_enum IS 'Tipos de acabamento de produtos';
COMMENT ON TYPE cliente_status_type IS 'Status de acompanhamento de clientes';
COMMENT ON TYPE price_unit_type IS 'Unidade de preço: M2 (metro quadrado) ou FT2 (pé quadrado)';
