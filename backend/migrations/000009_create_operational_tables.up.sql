-- =============================================
-- Migration: 000009_create_operational_tables
-- Description: Cria tabelas de reservas e vendas
-- =============================================

-- Tabela: Reservas
CREATE TABLE reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE RESTRICT,
    reserved_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    status reservation_status_type DEFAULT 'ATIVA',
    notes TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Índices para reservations
CREATE INDEX idx_reservations_batch ON reservations(batch_id);
CREATE INDEX idx_reservations_user ON reservations(reserved_by_user_id);
CREATE INDEX idx_reservations_lead ON reservations(lead_id);
CREATE INDEX idx_reservations_status ON reservations(status);
CREATE INDEX idx_reservations_expires_at ON reservations(expires_at) 
    WHERE status = 'ATIVA';
CREATE INDEX idx_reservations_active ON reservations(is_active, status) 
    WHERE is_active = TRUE;

-- Comentários
COMMENT ON TABLE reservations IS 'Reservas de lotes';
COMMENT ON COLUMN reservations.reserved_by_user_id IS 'Usuário que fez a reserva (vendedor ou broker)';
COMMENT ON COLUMN reservations.expires_at IS 'Data de expiração da reserva';
COMMENT ON COLUMN reservations.status IS 'Status: ATIVA, CONFIRMADA_VENDA, EXPIRADA, CANCELADA';

-- Tabela: Histórico de Vendas
CREATE TABLE sales_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES batches(id),
    sold_by_user_id UUID NOT NULL REFERENCES users(id),
    industry_id UUID NOT NULL REFERENCES industries(id),
    lead_id UUID REFERENCES leads(id),
    customer_name VARCHAR(255) NOT NULL,
    customer_contact VARCHAR(255) NOT NULL,
    sale_price DECIMAL(12,2) NOT NULL CHECK (sale_price > 0),
    broker_commission DECIMAL(12,2) DEFAULT 0 CHECK (broker_commission >= 0),
    net_industry_value DECIMAL(12,2) NOT NULL CHECK (net_industry_value > 0),
    invoice_url VARCHAR(500),
    notes TEXT,
    sold_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para sales_history
CREATE INDEX idx_sales_history_batch ON sales_history(batch_id);
CREATE INDEX idx_sales_history_seller ON sales_history(sold_by_user_id);
CREATE INDEX idx_sales_history_industry ON sales_history(industry_id);
CREATE INDEX idx_sales_history_lead ON sales_history(lead_id);
CREATE INDEX idx_sales_history_sold_at ON sales_history(sold_at DESC);
CREATE INDEX idx_sales_history_industry_date ON sales_history(industry_id, sold_at DESC);

-- Comentários
COMMENT ON TABLE sales_history IS 'Histórico de vendas realizadas';
COMMENT ON COLUMN sales_history.sale_price IS 'Preço final pago pelo cliente';
COMMENT ON COLUMN sales_history.broker_commission IS 'Comissão do broker/vendedor';
COMMENT ON COLUMN sales_history.net_industry_value IS 'Valor líquido para a indústria';
COMMENT ON COLUMN sales_history.customer_name IS 'Nome do cliente final';
COMMENT ON COLUMN sales_history.customer_contact IS 'Contato do cliente final';

-- Constraint: validar cálculo de comissão
ALTER TABLE sales_history 
    ADD CONSTRAINT check_commission_calculation 
    CHECK (sale_price >= net_industry_value);