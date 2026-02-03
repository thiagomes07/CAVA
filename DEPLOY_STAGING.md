
# Guia de Deploy (Staging) - CAVA

Este guia descreve as alterações realizadas para permitir o deploy simplificado do projeto CAVA em ambiente de staging (EC2) usando Docker Compose.

## 🚀 Como fazer Deploy

1.  **Clone o repositório** na sua instância EC2.
2.  **Execute o comando:**
    ```bash
    docker compose up --build -d
    ```
3.  Acesse a aplicação no navegador usando o IP Público ou DNS da sua instância (porta 80).

---

## 🛠️ Alterações Realizadas

### 1. Arquitetura de Containers (Docker Compose)
Criamos um arquivo `docker-compose.yml` na raiz do projeto que orquestra todos os serviços necessários:

| Serviço | Descrição | Configuração |
|:---|:---|:---|
| **nginx** | Reverse Proxy (Porta 80) | Redireciona tráfego para Frontend, API e MinIO. |
| **frontend** | Aplicação Next.js | Containerizado com Dockerfile multi-stage otimizado. |
| **api** | Backend Go | Conecta-se ao Postgres e MinIO. |
## 🚀 Como fazer o Deploy na EC2

### 1. Preparação da EC2
Certifique-se de que sua instância EC2 tenha:
*   **Docker** e **Docker Compose** instalados.
*   **Portas Liberadas (Security Group):**
    *   `80` (HTTP) - Para acesso web.
    *   `22` (SSH) - Para seu acesso administrativo.

### 2. Startup
No terminal da sua instância:

```bash
# 1. Clone o repositório
git clone https://seu-repositorio/cava.git
cd cava

# 2. Suba a aplicação
# O build pode demorar alguns minutos na primeira vez
docker compose up --build -d
```

### 3. Acesso
Acesse via navegador usando o IP Público da sua EC2:
`http://seu-ip-publico`

*   **Login Admin:** `admin@pedrasdemo.com` / `Admin@123`
*   **API Healthcheck:** `http://seu-ip-publico/api/health`

---

## ⚠️ Notas Importantes de Configuração

### Modo de Desenvolvimento (Atual)
O arquivo `docker-compose.yml` está configurado com `APP_ENV: development`.
*   **Por quê?** Isso permite que a API inicie sem exigir um serviço de email real (SES) configurado.
*   **Efeito:** Emails não serão enviados, apenas logados no terminal do container `cava-api`.

### Segurança (Secrets)
Para facilitar o setup inicial, as chaves de segurança (`JWT_SECRET`, `PASSWORD_PEPPER`, etc.) no `docker-compose.yml` estão sincronizadas com os valores padrão de desenvolvimento.
*   **Recomendação:** Para um ambiente de Staging público, isso é aceitável temporariamente.
*   **Produção:** **NUNCA** use esses valores. Gere novas chaves aleatórias e substitua no arquivo antes de subir a produção.

### Persistência de Dados
*   Os dados do banco (Postgres) e arquivos (MinIO) são salvos em **Volumes do Docker** (`postgres-data` e `minio-data`).
*   **Cuidado:** Rodar `docker compose down -v` (com o `-v`) **APAGARÁ** todos os dados. Para reiniciar sem perder dados, use apenas `docker compose down`.

### Solução de Problemas Comuns

**Erro de Login "Unauthorized"**
Se você não conseguir logar com o usuário padrão, verifique se o `PASSWORD_PEPPER` no `docker-compose.yml` é exatamente:
`your-password-pepper-never-change-after-production`

**Erro de Build no Frontend**
O Dockerfile foi ajustado para usar `npm install` em vez de `npm ci` para maior compatibilidade. Se tiver problemas de cache, rode:
`docker builder prune -a`

**Frontend não acessível**
Certifique-se de acessar pela porta 80 (sem porta na URL) e não porta 3000. O Nginx (porta 80) é quem redireciona para o frontend.
