# Configuração de Imagens em Emails

## Problema

Imagens com URLs `localhost` não aparecem em emails HTML porque:

- Emails são visualizados no cliente de email (Gmail, Outlook, etc.)
- O cliente de email não consegue acessar `localhost:9000` do servidor
- URLs precisam ser publicamente acessíveis na internet

## Solução para Produção

### Opção 1: Amazon CloudFront (Recomendado)

1. Configure uma distribuição CloudFront apontando para seu bucket S3
2. Atualize o `.env` com a URL do CloudFront:
   ```env
   STORAGE_PUBLIC_URL=https://d1234567.cloudfront.net
   ```

### Opção 2: S3 Bucket Público

1. Configure o bucket S3 como público
2. Atualize o `.env`:
   ```env
   STORAGE_PUBLIC_URL=https://cava-media.s3.us-east-1.amazonaws.com
   ```

### Opção 3: MinIO Público

1. Configure MinIO com IP público ou domínio
2. Atualize o `.env`:
   ```env
   STORAGE_PUBLIC_URL=https://storage.seudominio.com/cava-media
   ```

## Desenvolvimento Local

Em ambiente de desenvolvimento com `localhost`, as imagens **não aparecerão** nos emails enviados. Isso é esperado e não afeta a funcionalidade do sistema.

O sistema já possui validação para:

- Não incluir URLs localhost em emails quando em produção
- Funcionar normalmente no frontend (localhost funciona para navegador)

## Verificar Configuração

Para verificar se suas imagens aparecerão nos emails:

```bash
# Checar se STORAGE_PUBLIC_URL não é localhost
cat backend/.env | grep STORAGE_PUBLIC_URL

# Se retornar localhost, precisa configurar URL pública para produção
```

## Testando em Desenvolvimento

Para testar imagens em emails durante desenvolvimento, você pode:

1. Usar um serviço de túnel (ngrok) para expor MinIO
2. Usar um bucket S3 real temporário
3. Aceitar que as imagens não aparecerão (texto e links funcionam)
