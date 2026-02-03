-- Migration: Adiciona broker_sold_price na tabela sales_history
-- Esse campo armazena o valor que o broker vendeu para o cliente final

ALTER TABLE sales_history 
ADD COLUMN IF NOT EXISTS broker_sold_price DECIMAL(15,2);

-- Comentário na coluna
COMMENT ON COLUMN sales_history.broker_sold_price IS 'Valor que o broker vendeu para o cliente final (uso interno do broker)';
