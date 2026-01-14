# CAVA - Plataforma B2B de Gestão de Rochas Ornamentais

Sistema completo para gestão de estoque e vendas de rochas ornamentais, conectando indústrias, vendedores internos e brokers externos.

## 🏗️ Tecnologias

- **Backend**: Go 1.24 + PostgreSQL 16 + MinIO (S3)
- **Frontend**: Next.js 16 + React 19 + TypeScript + Tailwind CSS
- **Infraestrutura**: Docker + Docker Compose

## 🚀 Funcionalidades

- 📦 Gestão de catálogo de produtos e lotes físicos
- 🤝 Compartilhamento de estoque com brokers
- 🔗 Criação de links de venda públicos personalizados
- 📊 Dashboard com métricas em tempo real
- 👥 Gestão de clientes e histórico de vendas
- 🔐 Autenticação JWT com refresh tokens e controle de acesso por roles

## 📋 Pré-requisitos

- Docker e Docker Compose
- Node.js 20+ e npm
- Go 1.24+ (opcional, para desenvolvimento local)

## ⚙️ Instalação e Execução

### 1. Backend (API + Banco de Dados + Storage)

```bash
cd backend

# Criar arquivo .env a partir do exemplo
cp .env.example .env

# Subir containers (PostgreSQL, MinIO, API)
docker-compose up -d

# Verificar status
docker-compose ps

# Ver logs
docker-compose logs -f api
```

A API estará disponível em: `http://localhost:3001`  
MinIO Console: `http://localhost:9001` (usuário: `minio_access_key`, senha: `minio_secret_key`)

### 2. Frontend (Next.js)

```bash
cd frontend

# Instalar dependências
npm install

# Rodar em modo desenvolvimento
npm run dev

# OU fazer build de produção
npm run build
npm start
```

O frontend estará disponível em: `http://localhost:3000`

## 🔑 Acesso ao Sistema

O sistema possui 3 tipos de usuários (seeds automáticos criados no primeiro run):

| Role | Email | Senha | Permissões |
|------|-------|-------|------------|
| Admin Indústria | admin@pedrasdemo.com | Admin@123 | Acesso total |
| Vendedor Interno | vendedor@pedrasdemo.com | Vendedor@123 | Gestão de estoque e vendas |
| Broker | broker@example.com | Broker@123 | Estoque compartilhado e clientes |

## 🗄️ Estrutura do Projeto

```
CAVA/
├── backend/              # API Go
│   ├── cmd/api/         # Entry point
│   ├── internal/        # Lógica de negócio
│   │   ├── handler/    # HTTP handlers
│   │   ├── service/    # Camada de serviço
│   │   ├── repository/ # Acesso ao banco
│   │   └── domain/     # Entidades e interfaces
│   ├── migrations/      # SQL migrations
│   ├── docker-compose.yml
│   └── Dockerfile
│
└── frontend/            # Next.js App
    ├── app/            # App Router (rotas)
    │   ├── (auth)/    # Login
    │   ├── (industry)/ # Dashboard indústria
    │   ├── (public)/  # Links públicos
    │   └── api/       # API routes
    ├── components/     # Componentes React
    ├── lib/           # Utilitários e API client
    └── store/         # Estado global (Zustand)
```

## 🔧 Comandos Úteis

### Backend

```bash
# Parar containers
docker-compose down

# Rebuild e restart
docker-compose up -d --build

# Limpar volumes (⚠️ apaga dados)
docker-compose down -v

# Acessar shell do banco
docker exec -it cava-postgres psql -U cava_user -d cava_db
```

### Frontend

```bash
# Lint
npm run lint

# Build de produção
npm run build

# Limpar cache
rm -rf .next node_modules && npm install
```

## 🌐 Endpoints Principais da API

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/auth/login` | Autenticação |
| GET | `/api/dashboard/metrics` | Métricas do dashboard |
| GET | `/api/products` | Lista produtos |
| GET | `/api/batches` | Lista lotes de estoque |
| POST | `/api/sales-links` | Criar link de venda |
| GET | `/api/public/links/:slug` | Acessar link público |
| POST | `/api/public/clientes/interest` | Registrar interesse (cliente) |

Documentação completa: `backend/README.md`

## 🔒 Segurança

- Autenticação via JWT com HTTP-only cookies
- Proteção CSRF em todas as rotas de mutação
- Rate limiting por role
- Bcrypt + pepper para hashing de senhas
- SSL/TLS pronto para produção

## 📄 Licença

Proprietary - Todos os direitos reservados

## 👨‍💻 Desenvolvimento

Para contribuir ou reportar problemas, consulte os READMEs específicos em `backend/` e `frontend/`.
