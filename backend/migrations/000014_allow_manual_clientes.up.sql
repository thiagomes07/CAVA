-- =============================================
-- Migration: 000014_allow_manual_clientes
-- Description: Permite criar clientes manualmente (sem sales_link_id obrigatório)
-- =============================================

-- Remover a constraint NOT NULL de sales_link_id
ALTER TABLE clientes ALTER COLUMN sales_link_id DROP NOT NULL;

-- Adicionar coluna para rastrear quem criou o cliente manualmente
ALTER TABLE clientes ADD COLUMN created_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Índice para buscar clientes por quem criou
CREATE INDEX idx_clientes_created_by ON clientes(created_by) WHERE created_by IS NOT NULL;

-- Comentário
COMMENT ON COLUMN clientes.created_by IS 'Usuário que criou o cliente manualmente (NULL se capturado via link)';
