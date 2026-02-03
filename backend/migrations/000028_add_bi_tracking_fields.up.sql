-- =============================================
-- Migration: 000028_add_bi_tracking_fields
-- Description: Adiciona campos para tracking de metricas de BI
-- =============================================

-- Campos de tracking em batches
ALTER TABLE batches ADD COLUMN IF NOT EXISTS total_views INTEGER DEFAULT 0;
ALTER TABLE batches ADD COLUMN IF NOT EXISTS total_reservations INTEGER DEFAULT 0;
ALTER TABLE batches ADD COLUMN IF NOT EXISTS conversion_count INTEGER DEFAULT 0;
ALTER TABLE batches ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP WITH TIME ZONE;

-- Campos de tracking em sales_links
ALTER TABLE sales_links ADD COLUMN IF NOT EXISTS unique_visitors INTEGER DEFAULT 0;
ALTER TABLE sales_links ADD COLUMN IF NOT EXISTS leads_captured INTEGER DEFAULT 0;
ALTER TABLE sales_links ADD COLUMN IF NOT EXISTS conversions INTEGER DEFAULT 0;

-- Campos em sales_history para analise
ALTER TABLE sales_history ADD COLUMN IF NOT EXISTS reservation_id UUID REFERENCES reservations(id);
ALTER TABLE sales_history ADD COLUMN IF NOT EXISTS days_to_close INTEGER;
ALTER TABLE sales_history ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'RESERVATION';

-- Campos em clientes para tracking
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES users(id);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS total_purchases INTEGER DEFAULT 0;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS total_spent DECIMAL(14,2) DEFAULT 0;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS source_batch_id UUID REFERENCES batches(id);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS first_contact_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS converted_at TIMESTAMP WITH TIME ZONE;

-- Adicionar industry_id nas reservations para facilitar queries
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS industry_id UUID REFERENCES industries(id);

-- Indices para queries de BI
CREATE INDEX IF NOT EXISTS idx_batches_activity ON batches(last_activity_at DESC) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_sales_history_reservation ON sales_history(reservation_id) WHERE reservation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sales_history_source ON sales_history(source);
CREATE INDEX IF NOT EXISTS idx_clientes_source_batch ON clientes(source_batch_id) WHERE source_batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reservations_industry ON reservations(industry_id);

-- Comentarios
COMMENT ON COLUMN batches.total_views IS 'Total de visualizacoes do lote via links';
COMMENT ON COLUMN batches.total_reservations IS 'Total de reservas criadas para este lote';
COMMENT ON COLUMN batches.conversion_count IS 'Total de vendas realizadas deste lote';
COMMENT ON COLUMN batches.last_activity_at IS 'Data da ultima atividade (view, reserva ou venda)';
COMMENT ON COLUMN sales_links.unique_visitors IS 'Visitantes unicos do link';
COMMENT ON COLUMN sales_links.leads_captured IS 'Leads capturados via este link';
COMMENT ON COLUMN sales_links.conversions IS 'Vendas originadas deste link';
COMMENT ON COLUMN sales_history.reservation_id IS 'Reserva que originou esta venda';
COMMENT ON COLUMN sales_history.days_to_close IS 'Dias desde criacao da reserva ate confirmacao da venda';
COMMENT ON COLUMN sales_history.source IS 'Origem da venda: RESERVATION, QUICK_SELL';
COMMENT ON COLUMN clientes.created_by_user_id IS 'Usuario que cadastrou o cliente (se manual)';
COMMENT ON COLUMN clientes.total_purchases IS 'Total de compras realizadas';
COMMENT ON COLUMN clientes.total_spent IS 'Valor total gasto em compras';
COMMENT ON COLUMN clientes.source_batch_id IS 'Lote que gerou o interesse do cliente';

-- --- MOVIDO DA MIGRATION 000027 PARA EVITAR CONFLITO DE TRANSACAO COM ENUM ---
-- Indice para reservas pendentes de aprovacao
CREATE INDEX IF NOT EXISTS idx_reservations_pending_approval
ON reservations(status, created_at)
WHERE status = 'PENDENTE_APROVACAO';

-- Indice para reservas aprovadas
CREATE INDEX IF NOT EXISTS idx_reservations_approved
ON reservations(status, approved_at)
WHERE status = 'APROVADA';

-- Comentarios
COMMENT ON COLUMN reservations.approved_by IS 'Usuario admin que aprovou a reserva';
COMMENT ON COLUMN reservations.approved_at IS 'Data/hora da aprovacao';
COMMENT ON COLUMN reservations.rejection_reason IS 'Motivo da rejeicao (quando rejeitada)';
COMMENT ON COLUMN reservations.approval_expires_at IS 'Prazo para admin aprovar a reserva';
