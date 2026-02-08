# 🚀 CAVA — Guia Completo de Deploy na AWS (2026)

> **Projeto**: CAVA Stone Platform  
> **Stack**: Go 1.24 (backend) + Next.js 16 (frontend)  
> **Domínio**: `usecava.com`  
> **Arquitetura**: Same-domain proxy (`usecava.com/*` → frontend, `usecava.com/api/*` → backend)  
> **Custo estimado**: ~R$ 200–500/mês (início)

---

## 📋 Índice

1. [Visão Geral da Arquitetura](#1-visão-geral-da-arquitetura)
2. [Pré-requisitos](#2-pré-requisitos)
3. [IAM — Usuários, Roles e Policies](#3-iam--usuários-roles-e-policies)
4. [RDS — PostgreSQL](#4-rds--postgresql)
5. [S3 — Bucket de Mídia](#5-s3--bucket-de-mídia)
6. [SES — Emails Transacionais](#6-ses--emails-transacionais)
7. [ECR — Repositório de Imagens Docker](#7-ecr--repositório-de-imagens-docker)
8. [ECS Fargate — Backend](#8-ecs-fargate--backend)
9. [ECS Fargate — Frontend](#9-ecs-fargate--frontend)
10. [CloudFront + ALB — CDN e Roteamento](#10-cloudfront--alb--cdn-e-roteamento)
11. [Route 53 — DNS](#11-route-53--dns)
12. [ACM — Certificados SSL](#12-acm--certificados-ssl)
13. [CI/CD — GitHub Actions](#13-cicd--github-actions)
14. [Variáveis de Ambiente — Configuração Final](#14-variáveis-de-ambiente--configuração-final)
15. [Checklist de Pré-Go-Live](#15-checklist-de-pré-go-live)
16. [Monitoramento e Observabilidade](#16-monitoramento-e-observabilidade)
17. [Custos Detalhados](#17-custos-detalhados)
18. [Troubleshooting](#18-troubleshooting)

---

## 1. Visão Geral da Arquitetura

```
                    ┌─────────────────────┐
                    │    Route 53         │
                    │  usecava.com → CF   │
                    └────────┬────────────┘
                             │
                    ┌────────▼────────────┐
                    │    CloudFront       │
                    │  (CDN + SSL)        │
                    │                     │
                    │  /api/*  → ALB:3001 │
                    │  /media/* → S3      │
                    │  /*      → ALB:3000 │
                    └────────┬────────────┘
                             │
                    ┌────────▼────────────┐
                    │  ALB (interno)      │
                    │  Target Groups:     │
                    │  :3000 → Frontend   │
                    │  :3001 → Backend    │
                    └────────┬────────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
     ┌────────▼───────┐ ┌───▼────────┐ ┌───▼────────┐
     │ ECS Fargate    │ │ ECS Fargate│ │    RDS     │
     │ Frontend :3000 │ │ Backend    │ │ PostgreSQL │
     │ (Next.js SSR)  │ │ :3001 (Go) │ │ 16        │
     └────────────────┘ └─────┬──────┘ └────────────┘
                              │
                    ┌─────────┼─────────┐
                    │         │         │
               ┌────▼──┐ ┌───▼──┐ ┌────▼──┐
               │  S3   │ │ SES  │ │  RDS  │
               │ Media │ │Email │ │  DB   │
               └───────┘ └──────┘ └───────┘
```

### Por que esta arquitetura?

| Decisão | Motivo |
|---------|--------|
| **ECS Fargate** (não EC2) | Sem gerenciar servidores, paga por uso, auto-scaling |
| **CloudFront na frente** | SSL gratuito, cache de assets, DDoS básico (Shield Standard) |
| **Same-domain proxy** | Cookies `SameSite=Lax` funcionam sem CORS cross-origin |
| **ALB** (não API Gateway) | Mais barato pra tráfego contínuo, suporta WebSocket futuro |
| **RDS** (não Aurora) | Mais barato para início, migra pra Aurora se precisar |
| **S3 direto** (não MinIO) | Gerenciado, 99.999999999% durabilidade, IAM nativo |

---

## 2. Pré-requisitos

### 2.1 Conta AWS
- Conta AWS ativa com **cartão de crédito** cadastrado
- **MFA habilitado** no root user (obrigatório: vá em `IAM > Security credentials > MFA`)
- **AWS Organizations**: não é necessário agora, mas recomendado no futuro

### 2.2 Ferramentas Locais
```bash
# AWS CLI v2 (Windows)
winget install Amazon.AWSCLI

# Verificar
aws --version
# aws-cli/2.x.x ...

# Docker Desktop (já instalado se roda docker-compose)
docker --version

# Git (já instalado)
git --version
```

### 2.3 Configurar AWS CLI
```bash
aws configure
# AWS Access Key ID: (da IAM user que vamos criar)
# AWS Secret Access Key: (da IAM user)
# Default region: us-east-1
# Default output format: json
```

### 2.4 Repositório GitHub
- Repositório `thiagomes07/CAVA` deve estar no GitHub
- Branch `main` é a branch de produção
- GitHub Actions habilitado (já vem por padrão)

---

## 3. IAM — Usuários, Roles e Policies

> ⚠️ **NUNCA use o root user para tarefas do dia-a-dia.** Crie um admin user.

### 3.1 Criar IAM User para Administração

1. Vá ao **Console AWS** → **IAM** → **Users** → **Create user**
2. **User name**: `cava-admin`
3. **Provide user access to the AWS Management Console**: ✅ Sim
4. **Console password**: Custom password (anote!)
5. **Users must create a new password at next sign-in**: ❌ Desmarque
6. Click **Next**
7. **Attach policies directly** → selecione:
   - `AdministratorAccess`
8. Click **Next** → **Create user**
9. **Baixe o CSV** com as credenciais ou anote

> 💡 **No futuro**, substitua `AdministratorAccess` por policies específicas.

### 3.2 Criar IAM User para CI/CD (GitHub Actions)

1. **IAM** → **Users** → **Create user**
2. **User name**: `cava-github-deployer`
3. **Console access**: ❌ Não marcar (apenas acesso programático)
4. Click **Next**
5. **Attach policies directly** → **Create policy** (nova aba):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ECRAccess",
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload"
      ],
      "Resource": "*"
    },
    {
      "Sid": "ECSAccess",
      "Effect": "Allow",
      "Action": [
        "ecs:UpdateService",
        "ecs:DescribeServices",
        "ecs:DescribeTaskDefinition",
        "ecs:RegisterTaskDefinition",
        "ecs:DeregisterTaskDefinition",
        "ecs:ListTasks",
        "ecs:DescribeTasks"
      ],
      "Resource": "*"
    },
    {
      "Sid": "PassRole",
      "Effect": "Allow",
      "Action": "iam:PassRole",
      "Resource": [
        "arn:aws:iam::*:role/cava-*"
      ]
    },
    {
      "Sid": "CloudFrontInvalidation",
      "Effect": "Allow",
      "Action": [
        "cloudfront:CreateInvalidation",
        "cloudfront:GetInvalidation"
      ],
      "Resource": "*"
    }
  ]
}
```

6. **Policy name**: `CavaGitHubDeployerPolicy`
7. Volte à aba de criação do user → Recarrege → selecione `CavaGitHubDeployerPolicy`
8. **Create user**
9. Vá no user criado → **Security credentials** → **Create access key**
10. Selecione **Third-party service** → ✅ Confirme
11. **Description**: "GitHub Actions CI/CD"
12. **Salve o Access Key ID e Secret Access Key** (único momento que aparecem!)

### 3.3 Criar ECS Task Execution Role

> Esta role permite que o Fargate puxe imagens do ECR e leia secrets.

1. **IAM** → **Roles** → **Create role**
2. **Trusted entity type**: AWS service
3. **Service**: Elastic Container Service → **Elastic Container Service Task**
4. Click **Next**
5. Attach policies:
   - `AmazonECSTaskExecutionRolePolicy` (managed)
6. Opcional mas recomendado — **Add inline policy**:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ssm:GetParameters",
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:ssm:us-east-1:*:parameter/cava/*"
    }
  ]
}
```

7. **Role name**: `cava-ecs-task-execution-role`
8. **Create role**

### 3.4 Criar ECS Task Role (Backend)

> Esta role é usada pelo **container em runtime** para acessar S3 e SES.

1. **IAM** → **Roles** → **Create role**
2. **Trusted entity type**: AWS service
3. **Service**: Elastic Container Service → **Elastic Container Service Task**
4. Click **Next**
5. **Create policy** (nova aba):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3MediaAccess",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket",
        "s3:GetBucketLocation"
      ],
      "Resource": [
        "arn:aws:s3:::cava-media-prod",
        "arn:aws:s3:::cava-media-prod/*"
      ]
    },
    {
      "Sid": "SESEmailAccess",
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail"
      ],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "ses:FromAddress": "noreply@usecava.com"
        }
      }
    }
  ]
}
```

6. **Policy name**: `CavaBackendTaskPolicy`
7. Volte à criação de role → selecione `CavaBackendTaskPolicy`
8. **Role name**: `cava-backend-task-role`
9. **Create role**

---

## 4. RDS — PostgreSQL

### 4.1 Criar Security Group do RDS

1. **VPC** → **Security Groups** → **Create security group**
2. **Name**: `cava-rds-sg`
3. **Description**: "PostgreSQL access from ECS tasks"
4. **VPC**: selecione a VPC padrão
5. **Inbound rules**:
   - **Type**: PostgreSQL
   - **Port**: 5432
   - **Source**: Selecione por Security Group → `default` (ECS tasks usarão este SG)
   - **Description**: "ECS tasks"
6. **Outbound rules**: manter padrão (All traffic)
7. **Create**

### 4.2 Criar Subnet Group

1. **RDS** → **Subnet groups** → **Create DB subnet group**
2. **Name**: `cava-db-subnet-group`
3. **Description**: "Subnets para RDS CAVA"
4. **VPC**: VPC padrão
5. **Availability Zones**: selecione **pelo menos 2** (ex: `us-east-1a`, `us-east-1b`)
6. **Subnets**: selecione todas as subnets disponíveis nas AZs escolhidas
7. **Create**

### 4.3 Criar Instância RDS

1. **RDS** → **Databases** → **Create database**
2. **Choose a database creation method**: Standard create
3. **Engine options**:
   - **Engine type**: PostgreSQL
   - **Engine version**: PostgreSQL 16.x (mais recente LTS disponível)
4. **Templates**: ✅ **Free tier** (se disponível) ou **Dev/Test**

> ⚠️ **ARMADILHA**: Free tier só tem `db.t3.micro` (1 vCPU, 1GB RAM). Para produção real, use **`db.t4g.micro`** ou **`db.t4g.small`** (ARM, mais barato).

5. **Settings**:
   - **DB instance identifier**: `cava-db`
   - **Master username**: `cava_admin` (NÃO use `postgres` — boa prática)
   - **Credentials management**: Self managed
   - **Master password**: Gere uma senha forte (ex: `openssl rand -base64 24`)
   - **Anote esta senha!** Você vai precisar dela.

6. **Instance configuration**:
   - **DB instance class**: `db.t4g.micro` (2 vCPU, 1 GiB) — ~$12/mês
   - Para mais carga: `db.t4g.small` (2 vCPU, 2 GiB) — ~$25/mês

7. **Storage**:
   - **Type**: gp3
   - **Allocated storage**: 20 GiB (mínimo)
   - **Storage autoscaling**: ✅ Enable
   - **Maximum storage threshold**: 100 GiB

8. **Connectivity**:
   - **Compute resource**: Don't connect to an EC2 compute resource
   - **Network type**: IPv4
   - **VPC**: VPC padrão (mesma dos ECS tasks)
   - **DB subnet group**: `cava-db-subnet-group`
   - **Public access**: ❌ **No** (NUNCA expor RDS à internet!)
   - **VPC security group**: Choose existing → `cava-rds-sg`
   - **Availability Zone**: No preference

> ⚠️ **ARMADILHA COMUM**: Se marcar "Public access: Yes", qualquer IP com a senha acessa seu banco. **NUNCA faça isso em produção.**

9. **Database authentication**: Password authentication

10. **Additional configuration**:
    - **Initial database name**: `cava_db`
    - **DB parameter group**: default
    - **Backup**:
      - ✅ Enable automated backups
      - **Retention period**: 7 days
      - **Backup window**: No preference
    - **Encryption**: ✅ Enable encryption (AES-256, aws/rds key)
    - **Monitoring**:
      - ✅ Enable Enhanced monitoring
      - **Granularity**: 60 seconds
      - **Monitoring Role**: Default
    - **Log exports**: ✅ PostgreSQL log
    - **Maintenance**:
      - ✅ Enable auto minor version upgrade
      - **Maintenance window**: No preference
    - **Deletion protection**: ✅ Enable (IMPORTANTE!)

11. Click **Create database** (levará ~10 minutos)

### 4.4 Obter Endpoint do RDS

1. Após criação, vá em **RDS** → **Databases** → `cava-db`
2. Em **Connectivity & security**, copie o **Endpoint**:
   - Ex: `cava-db.abc123xyz.us-east-1.rds.amazonaws.com`
3. **Port**: 5432

### 4.5 Testar Conexão (temporário — via bastion)

> Como o RDS não é público, para rodar migrations ou testar, use um EC2 temporário ou CloudShell:

```bash
# No AWS CloudShell (que já está na VPC):
sudo dnf install -y postgresql16

psql -h cava-db.abc123xyz.us-east-1.rds.amazonaws.com \
     -U cava_admin \
     -d cava_db \
     -p 5432

# Verificar se conectou:
# cava_db=> \dt
```

> 💡 **Não se preocupe com migrations** — o backend roda automaticamente com `AUTO_MIGRATE=true`.

---

## 5. S3 — Bucket de Mídia

### 5.1 Criar Bucket

1. **S3** → **Create bucket**
2. **Bucket name**: `cava-media-prod` (nomes são globais, deve ser único)
3. **AWS Region**: `us-east-1`
4. **Object Ownership**: ACLs disabled (recommended)
5. **Block Public Access settings**:
   - ✅ **Mantenha TUDO bloqueado** (Block all public access = ON)
   
> ✅ **SEGURANÇA**: O bucket fica 100% privado. Somente o CloudFront (via OAC) e o backend (via IAM Role) acessam os objetos. Ninguém consegue acessar diretamente pela URL do S3.

6. **Bucket Versioning**: Disable (para economia; habilite se precisar de versionamento)
7. **Encryption**:
   - **Type**: Server-side encryption with Amazon S3 managed keys (SSE-S3)
   - **Bucket Key**: ✅ Enable
8. **Create bucket**

### 5.2 Configurar Bucket Policy (acesso SOMENTE via CloudFront OAC)

> ⚠️ Esta policy será gerada automaticamente quando associar o OAC ao CloudFront (seção 10). Caso precise criar manualmente, use esta:

1. Vá ao bucket `cava-media-prod` → **Permissions** → **Bucket policy** → **Edit**
2. Cole (substitua `<CLOUDFRONT_DISTRIBUTION_ARN>` pelo ARN da sua distribuição):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontOAC",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::cava-media-prod/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "<CLOUDFRONT_DISTRIBUTION_ARN>"
        }
      }
    }
  ]
}
```

> 💡 **Resultado**: Somente sua distribuição CloudFront pode ler objetos do S3. Acesso direto por `https://cava-media-prod.s3.amazonaws.com/...` retorna **403 Forbidden**.

3. **Save changes**

### 5.3 Configurar CORS

1. No bucket → **Permissions** → **Cross-origin resource sharing (CORS)** → **Edit**
2. Cole:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET"],
    "AllowedOrigins": ["https://usecava.com"],
    "ExposeHeaders": [],
    "MaxAgeSeconds": 86400
  }
]
```

3. **Save changes**

### 5.4 Criar Estrutura de Pastas

As pastas são criadas automaticamente pelo backend ao fazer upload (ex: `products/uuid/timestamp_file.jpg`, `batches/uuid/timestamp_file.jpg`), então **não precisa criar manualmente**.

---

## 6. SES — Emails Transacionais

> O backend já integra com SES via `aws-sdk-go-v2`. O SES usa a credencial chain padrão (IAM Role em Fargate).

### 6.1 Verificar Domínio

1. **SES** → **Identities** → **Create identity**
2. **Identity type**: Domain
3. **Domain**: `usecava.com`
4. **Assign a default configuration set**: Não por enquanto
5. **DKIM**: ✅ Easy DKIM
   - **DKIM signing key length**: 2048
   - **Publish DNS records in Route 53**: ✅ Enabled (se o domínio está no Route53)
6. **Create identity**

> O SES criará automaticamente os registros DKIM no Route53. Aguarde ~24-72h para propagação DNS.

### 6.2 Verificar Email Remetente

1. **SES** → **Identities** → **Create identity**
2. **Identity type**: Email address
3. **Email address**: `noreply@usecava.com`
4. **Create identity**
5. Acesse o email e confirme o link de verificação

### 6.3 Sair do Sandbox (OBRIGATÓRIO para produção)

> ⚠️ **SES Sandbox** só permite enviar para emails verificados. Em produção, você precisa enviar para qualquer email.

1. **SES** → **Account dashboard** → **Request production access**
2. Preencha:
   - **Mail type**: Transactional
   - **Website URL**: `https://usecava.com`
   - **Use case description**:
     ```
     We are a B2B Stone/Marble inventory management platform (CAVA).
     We send transactional emails only:
     - User invitation emails (when admins invite team members)
     - Password reset verification codes
     - Client offer/quotation notifications
     We do NOT send marketing emails. Expected volume: <1000 emails/day initially.
     All emails include unsubscribe mechanism and comply with anti-spam regulations.
     ```
   - **Acknowledgments**: ✅ Check all
3. **Submit request** (aprovação leva 24-48h)

### 6.4 Configurar MAIL FROM Domain (opcional mas recomendado)

1. **SES** → **Identities** → `usecava.com` → **Custom MAIL FROM domain**
2. **MAIL FROM domain**: `mail.usecava.com`
3. **Behavior on MX failure**: Use default MAIL FROM domain
4. **Publish DNS records in Route 53**: ✅ Sim
5. Aguarde propagação DNS

---

## 7. ECR — Repositório de Imagens Docker

### 7.1 Criar Repositório para Backend

1. **ECR** → **Repositories** → **Create repository**
2. **Visibility**: Private
3. **Repository name**: `cava/backend`
4. **Tag immutability**: Disabled (queremos sobrescrever `latest`)
5. **Image scan on push**: ✅ Enabled (escaneia vulnerabilidades)
6. **Encryption**: AES-256 (padrão)
7. **Create**

### 7.2 Criar Repositório para Frontend

1. Repita o processo:
   - **Repository name**: `cava/frontend`
   - Mesmas configurações

### 7.3 Configurar Lifecycle Policy (economia)

Para cada repositório, vá em **Lifecycle Policy** → **Create rule**:

```json
{
  "rules": [
    {
      "rulePriority": 1,
      "description": "Keep last 10 images",
      "selection": {
        "tagStatus": "any",
        "countType": "imageCountMoreThan",
        "countNumber": 10
      },
      "action": {
        "type": "expire"
      }
    }
  ]
}
```

> Isso mantém apenas as 10 imagens mais recentes, evitando custos de storage.

### 7.4 Push Inicial (teste manual)

```bash
# Login no ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com

# Build e push backend
cd backend
docker build -t cava/backend .
docker tag cava/backend:latest <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/cava/backend:latest
docker push <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/cava/backend:latest

# Build e push frontend
cd ../frontend
docker build \
  --build-arg NEXT_PUBLIC_API_URL=https://usecava.com/api \
  --build-arg NEXT_PUBLIC_APP_URL=https://usecava.com \
  --build-arg NEXT_PUBLIC_IMAGE_HOSTNAME=usecava.com \
  -t cava/frontend .
docker tag cava/frontend:latest <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/cava/frontend:latest
docker push <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/cava/frontend:latest
```

> 💡 Substitua `<ACCOUNT_ID>` pelo seu AWS Account ID (12 dígitos). Encontre em **IAM Dashboard** no canto superior direito.

---

## 8. ECS Fargate — Backend

### 8.1 Criar Cluster ECS

1. **ECS** → **Clusters** → **Create cluster**
2. **Cluster name**: `cava-cluster`
3. **Infrastructure**: ✅ AWS Fargate (serverless)
4. **Monitoring**: ✅ Use Container Insights
5. **Create**

### 8.2 Criar Task Definition — Backend

1. **ECS** → **Task definitions** → **Create new task definition**
2. **Task definition family**: `cava-backend`
3. **Launch type**: AWS Fargate
4. **Operating system/Architecture**: Linux/X86_64
5. **Task size**:
   - **CPU**: 0.25 vCPU (256)
   - **Memory**: 0.5 GB (512)
   
> O backend Go é muito leve. 256 CPU / 512 MB é suficiente para início.

6. **Task role**: `cava-backend-task-role` (a que criamos com S3+SES)
7. **Task execution role**: `cava-ecs-task-execution-role`

8. **Container — 1**: Click **Add container**
   - **Name**: `backend`
   - **Image URI**: `<ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/cava/backend:latest`
   - **Essential container**: ✅ Yes
   - **Port mappings**:
     - Container port: `3001`
     - Protocol: TCP
     - App protocol: HTTP
   - **Environment variables** (⚠️ cada variável é crítica):

| Key | Value | Observação |
|-----|-------|------------|
| `APP_ENV` | `production` | |
| `APP_HOST` | `0.0.0.0` | |
| `APP_PORT` | `3001` | |
| `DB_HOST` | `cava-db.xxx.us-east-1.rds.amazonaws.com` | Endpoint RDS |
| `DB_PORT` | `5432` | |
| `DB_USER` | `cava_admin` | |
| `DB_PASSWORD` | `<sua-senha-rds>` | ⚠️ Em prod, use Secrets Manager |
| `DB_NAME` | `cava_db` | |
| `DB_SSL_MODE` | `require` | ⚠️ OBRIGATÓRIO com RDS |
| `DB_MAX_OPEN_CONNS` | `25` | |
| `DB_MAX_IDLE_CONNS` | `5` | |
| `DB_CONN_MAX_LIFETIME` | `5m` | |
| `STORAGE_TYPE` | `s3` | |
| `STORAGE_ENDPOINT` | `https://s3.us-east-1.amazonaws.com` | |
| `STORAGE_ACCESS_KEY` | ` ` (vazio) | IAM Role |
| `STORAGE_SECRET_KEY` | ` ` (vazio) | IAM Role |
| `STORAGE_BUCKET_NAME` | `cava-media-prod` | |
| `STORAGE_REGION` | `us-east-1` | |
| `STORAGE_USE_SSL` | `true` | |
| `STORAGE_PUBLIC_URL` | `https://usecava.com/media` | Via CloudFront |
| `JWT_SECRET` | `<gerar com: openssl rand -base64 64>` | ≥32 chars |
| `JWT_ACCESS_TOKEN_DURATION` | `15m` | |
| `JWT_REFRESH_TOKEN_DURATION` | `168h` | 7 dias |
| `PASSWORD_PEPPER` | `<gerar com: openssl rand -base64 32>` | ≥16 chars |
| `CSRF_SECRET` | `<gerar com: openssl rand -base64 32>` | ≥32 chars |
| `BCRYPT_COST` | `12` | |
| `COOKIE_SECURE` | `true` | HTTPS em produção |
| `COOKIE_DOMAIN` | `usecava.com` | |
| `FRONTEND_URL` | `https://usecava.com` | |
| `PUBLIC_LINK_BASE_URL` | `https://usecava.com` | |
| `ALLOWED_ORIGINS` | `https://usecava.com` | |
| `RATE_LIMIT_AUTH_RPM` | `5` | |
| `RATE_LIMIT_PUBLIC_RPM` | `30` | |
| `RATE_LIMIT_AUTHENTICATED_RPM` | `100` | |
| `LOG_LEVEL` | `info` | Não use debug em prod |
| `LOG_FORMAT` | `json` | CloudWatch precisa JSON |
| `MIGRATIONS_PATH` | `file://migrations` | |
| `AUTO_MIGRATE` | `true` | |
| `USE_SES` | `true` | |
| `SES_REGION` | `us-east-1` | |
| `SES_SENDER_EMAIL` | `noreply@usecava.com` | Deve estar verificado |
| `SES_SENDER_NAME` | `CAVA` | |

> ⚠️ **SEGURANÇA**: Para `DB_PASSWORD`, `JWT_SECRET`, `PASSWORD_PEPPER`, `CSRF_SECRET`, é **altamente recomendado** usar **AWS Secrets Manager** em vez de plain text. Veja seção 8.2.1.

   - **HealthCheck**:
     - Command: `CMD-SHELL,wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1`
     - Interval: 30s
     - Timeout: 10s
     - Retries: 3
     - Start period: 40s

   - **Log configuration**:
     - **Log driver**: awslogs
     - **awslogs-group**: `/ecs/cava-backend`
     - **awslogs-region**: `us-east-1`
     - **awslogs-stream-prefix**: `backend`

9. Click **Create**

#### 8.2.1 (Recomendado) Usar AWS Secrets Manager

Em vez de colocar senhas como plain text nas env vars da Task Definition:

1. **Secrets Manager** → **Store a new secret**
2. **Secret type**: Other type of secret
3. **Key/value pairs**:
   ```
   DB_PASSWORD = sua-senha-rds-aqui
   JWT_SECRET = seu-jwt-secret-aqui
   PASSWORD_PEPPER = seu-pepper-aqui
   CSRF_SECRET = seu-csrf-secret-aqui
   ```
4. **Secret name**: `cava/backend/secrets`
5. **Create secret**
6. Na Task Definition, em vez de `Value`, use `ValueFrom`:
   - **Key**: `DB_PASSWORD`
   - **ValueFrom**: `arn:aws:secretsmanager:us-east-1:ACCOUNT_ID:secret:cava/backend/secrets:DB_PASSWORD::`
7. Adicione na `cava-ecs-task-execution-role` a policy:
```json
{
  "Effect": "Allow",
  "Action": "secretsmanager:GetSecretValue",
  "Resource": "arn:aws:secretsmanager:us-east-1:*:secret:cava/backend/*"
}
```

### 8.3 Criar Security Group para ECS

1. **VPC** → **Security Groups** → **Create security group**
2. **Name**: `cava-ecs-sg`
3. **VPC**: VPC padrão
4. **Inbound rules**:
   - Type: Custom TCP, Port: 3001, Source: `cava-alb-sg` (Security Group do ALB, criaremos depois)
   - Type: Custom TCP, Port: 3000, Source: `cava-alb-sg`
5. **Outbound**: All traffic

### 8.4 Criar ALB (Application Load Balancer)

1. **EC2** → **Load Balancers** → **Create Load Balancer** → **Application Load Balancer**
2. **Name**: `cava-alb`
3. **Scheme**: Internet-facing
4. **IP address type**: IPv4
5. **Network mapping**:
   - **VPC**: VPC padrão
   - Selecione **pelo menos 2 AZs** (ex: us-east-1a, us-east-1b)
6. **Security groups**: Create new → `cava-alb-sg`
   - Inbound: HTTP (80) from 0.0.0.0/0, HTTPS (443) from 0.0.0.0/0
   - Outbound: All traffic
7. **Listeners**:
   - HTTP:80 → Redirect to HTTPS:443
   - HTTPS:443 → Forward to target group (criaremos abaixo)
   
> ⚠️ Para o HTTPS listener, você precisa do certificado ACM. Crie-o ANTES (seção 12) ou adicione depois.

8. **Create load balancer**

### 8.5 Criar Target Groups

**Target Group — Backend:**
1. **EC2** → **Target Groups** → **Create target group**
2. **Target type**: IP addresses (Fargate usa IPs)
3. **Name**: `cava-backend-tg`
4. **Protocol**: HTTP
5. **Port**: 3001
6. **VPC**: VPC padrão
7. **Health check**:
   - **Path**: `/health`
   - **Healthy threshold**: 2
   - **Unhealthy threshold**: 3
   - **Timeout**: 10s
   - **Interval**: 30s
   - **Success codes**: 200
8. **Create**

**Target Group — Frontend:**
1. Repita:
   - **Name**: `cava-frontend-tg`
   - **Port**: 3000
   - **Health check path**: `/`
   - **Success codes**: 200,301,302 (Next.js pode redirecionar para locale)

### 8.6 Configurar Listener Rules no ALB

1. Vá ao ALB `cava-alb` → **Listeners** → HTTPS:443
2. **Manage rules** → **Add rule**:
   - **Rule 1** (Backend):
     - **Condition**: Path pattern = `/api/*`
     - **Action**: Forward to `cava-backend-tg`
     - **Priority**: 1
   - **Rule 2** (Health check backend):
     - **Condition**: Path pattern = `/health`
     - **Action**: Forward to `cava-backend-tg`
     - **Priority**: 2
3. **Default action**: Forward to `cava-frontend-tg`
4. **Save**

### 8.7 Criar ECS Service — Backend

1. **ECS** → **Clusters** → `cava-cluster` → **Services** → **Create**
2. **Compute options**: Launch type → Fargate
3. **Platform version**: LATEST
4. **Task definition**:
   - **Family**: `cava-backend`
   - **Revision**: LATEST
5. **Service name**: `cava-backend-service`
6. **Desired tasks**: 1 (início com 1, escale depois)
7. **Networking**:
   - **VPC**: VPC padrão
   - **Subnets**: selecione pelo menos 2
   - **Security group**: `cava-ecs-sg`
   - **Public IP**: ✅ (necessário para pull de ECR e acesso a RDS na mesma VPC)

> 💡 **Alternativa sem IP público**: Crie VPC Endpoints para ECR, S3, e CloudWatch Logs. Mais seguro mas mais complexo.

8. **Load balancing**:
   - **Type**: Application Load Balancer
   - **Load balancer**: `cava-alb`
   - **Container**: `backend:3001`
   - **Target group**: `cava-backend-tg`
9. **Service auto scaling**: Não configurar agora
10. **Create**

---

## 9. ECS Fargate — Frontend

### 9.1 Criar Task Definition — Frontend

1. **ECS** → **Task definitions** → **Create new task definition**
2. **Family**: `cava-frontend`
3. **Launch type**: Fargate
4. **OS/Arch**: Linux/X86_64
5. **Task size**:
   - **CPU**: 0.25 vCPU (256)
   - **Memory**: 0.5 GB (512)
6. **Task role**: Nenhum (frontend não acessa AWS services diretamente)
7. **Task execution role**: `cava-ecs-task-execution-role`

8. **Container**:
   - **Name**: `frontend`
   - **Image URI**: `<ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/cava/frontend:latest`
   - **Port**: 3000, TCP, HTTP
   - **Environment variables**:

| Key | Value |
|-----|-------|
| `INTERNAL_API_URL` | `http://cava-backend-service.cava-cluster.local:3001/api` |
| `NODE_ENV` | `production` |

> ⚠️ **INTERNAL_API_URL**: Este é o endereço de service discovery dentro do ECS. Veja a nota 9.1.1 abaixo.

> ⚠️ **NEXT_PUBLIC_*** não vai aqui: Essas variáveis são inlined no build do Docker (build args).

   - **HealthCheck**: `CMD-SHELL,wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1`
   - **Logs**: awslogs, group `/ecs/cava-frontend`, region `us-east-1`, prefix `frontend`

9. **Create**

#### 9.1.1 Service Discovery (INTERNAL_API_URL)

Para que o frontend acesse o backend internamente (sem sair pela internet):

1. **Cloud Map** → **Create namespace** (ou via ECS)
   - **Namespace name**: `cava.local`
   - **Namespace type**: API calls and VPC DNS queries (HTTP & DNS)
   - **VPC**: VPC padrão
2. Ao criar o backend service (passo 8.7), ative **Service Discovery**:
   - **Namespace**: `cava.local`
   - **Service discovery name**: `backend`
3. O frontend usa: `INTERNAL_API_URL=http://backend.cava.local:3001/api`

> Se não quiser configurar Service Discovery agora, use a **IP privada do ALB**:
> `INTERNAL_API_URL=http://cava-alb-internal-xxx.us-east-1.elb.amazonaws.com:3001/api`
> Ou simplesmente: `INTERNAL_API_URL=http://cava-alb-xxx.us-east-1.elb.amazonaws.com/api` (via ALB público)

### 9.2 Criar ECS Service — Frontend

1. **ECS** → **Clusters** → `cava-cluster` → **Services** → **Create**
2. **Launch type**: Fargate
3. **Task definition**: `cava-frontend` (LATEST)
4. **Service name**: `cava-frontend-service`
5. **Desired tasks**: 1
6. **Networking**: mesma configuração do backend (mesma VPC, subnets, `cava-ecs-sg`)
7. **Load balancing**:
   - **ALB**: `cava-alb`
   - **Container**: `frontend:3000`
   - **Target group**: `cava-frontend-tg`
8. **Create**

---

## 10. CloudFront + ALB — CDN e Roteamento

### 10.1 Criar Distribuição CloudFront

1. **CloudFront** → **Distributions** → **Create distribution**

2. **Origin 1 — ALB** (frontend + backend):
   - **Origin domain**: `cava-alb-xxx.us-east-1.elb.amazonaws.com` (selecione o ALB)
   - **Protocol**: HTTPS only
   - **HTTP Port**: 80
   - **HTTPS Port**: 443
   - **Origin name**: `alb-origin`

3. **Origin 2 — S3** (mídia — acesso privado via OAC):
   - Click **Add origin**
   - **Origin domain**: `cava-media-prod.s3.us-east-1.amazonaws.com`
   - **Origin access**: ✅ **Origin access control settings (recommended)**
   - **Create new OAC**:
     - **Name**: `cava-media-oac`
     - **Signing protocol**: SigV4
     - **Signing behavior**: Always sign requests
     - **Origin type**: S3
     - Click **Create**
   - **Origin name**: `s3-media`
   - ⚠️ Após salvar, o CloudFront exibirá um banner: "The S3 bucket policy needs to be updated". Click **Copy policy** e aplique no bucket (seção 5.2).

4. **Default cache behavior** (/* → ALB → Frontend):
   - **Origin**: `alb-origin`
   - **Viewer protocol policy**: Redirect HTTP to HTTPS
   - **Allowed HTTP methods**: GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE
   - **Cache policy**: `CachingDisabled` (SSR precisa bypasear cache)
   - **Origin request policy**: `AllViewerExceptHostHeader`
   
> ⚠️ **ARMADILHA CRÍTICA**: Se usar cache no default behavior, o SSR do Next.js não funcionará (páginas estáticas serão servidas para todos os usuários). Use `CachingDisabled`.

5. **Behaviors adicionais** (clicar **Add behavior**):

   **Behavior 2 — API**:
   - **Path pattern**: `/api/*`
   - **Origin**: `alb-origin`
   - **Viewer protocol policy**: HTTPS only
   - **Allowed HTTP methods**: GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE
   - **Cache policy**: `CachingDisabled`
   - **Origin request policy**: `AllViewerExceptHostHeader`

   **Behavior 3 — Health**:
   - **Path pattern**: `/health`
   - **Origin**: `alb-origin`
   - **Cache policy**: `CachingDisabled`
   - **Origin request policy**: `AllViewerExceptHostHeader`

   **Behavior 4 — S3 Media**:
   - **Path pattern**: `/media/*`
   - **Origin**: `s3-media`
   - **Viewer protocol policy**: HTTPS only
   - **Allowed HTTP methods**: GET, HEAD
   - **Cache policy**: `CachingOptimized` (cache agressivo para imagens)
   - **Compress objects automatically**: ✅ Yes

   **Behavior 5 — Next.js Static Assets**:
   - **Path pattern**: `/_next/static/*`
   - **Origin**: `alb-origin`
   - **Cache policy**: `CachingOptimized` (assets têm hash no nome, cache eterno)
   - **Compress objects automatically**: ✅ Yes

6. **Settings**:
   - **Price class**: Use only North America and Europe (mais barato) ou Use all edge locations
   - **Alternate domain name (CNAME)**: `usecava.com`
   - **Custom SSL certificate**: Selecione o certificado ACM (veja seção 12)
   - **Default root object**: Deixe vazio (Next.js cuida)
   - **Standard logging**: ✅ Optional (S3 bucket para logs)
   - **IPv6**: ✅ On
   - **HTTP/2**: ✅ On
   - **HTTP/3**: ✅ On

7. **Create distribution** (leva ~5-15 minutos para deploy)

### 10.2 Configurar S3 Path — Rewrite

> **Problema**: O CloudFront envia `/media/products/uuid/file.jpg` para o S3, mas o objeto no S3 é `products/uuid/file.jpg` (sem `/media/`).

**Solução — CloudFront Function para strip prefix:**

1. **CloudFront** → **Functions** → **Create function**
2. **Name**: `strip-media-prefix`
3. **Code**:

```javascript
function handler(event) {
    var request = event.request;
    // Remove /media prefix: /media/products/x/y.jpg → /products/x/y.jpg
    request.uri = request.uri.replace(/^\/media/, '');
    return request;
}
```

4. **Publish** → **Associate**:
   - **Distribution**: sua distribuição
   - **Event type**: Viewer request
   - **Cache behavior**: `/media/*`

### 10.3 Nota sobre Cookies no CloudFront

O CloudFront **deve** forward cookies para o ALB (frontend/backend), caso contrário a autenticação não funciona.

- No behavior default e `/api/*`, a **origin request policy** `AllViewerExceptHostHeader` já encaminha todos os cookies
- Se criar uma policy customizada, certifique-se que os cookies `access_token`, `refresh_token`, `csrf_token`, e `NEXT_LOCALE` sejam incluídos

---

## 11. Route 53 — DNS

### 11.1 Configurar Hosted Zone

> Se você já comprou `usecava.com` e apontou os nameservers para Route53, pule para 11.2.

1. **Route 53** → **Hosted zones** → confirme que `usecava.com` existe
2. Se não existir: **Create hosted zone** → Domain: `usecava.com` → Public hosted zone

### 11.2 Criar Registro A para CloudFront

1. Na hosted zone `usecava.com` → **Create record**
2. **Record name**: (deixe vazio para `usecava.com`)
3. **Record type**: A
4. **Alias**: ✅ Sim
5. **Route traffic to**: Alias to CloudFront distribution
6. **Distribution**: selecione a distribuição criada
7. **Routing policy**: Simple
8. **Create records**

### 11.3 (Opcional) Redirect www

1. **Create record**
2. **Record name**: `www`
3. **Record type**: CNAME
4. **Value**: `usecava.com`
5. **TTL**: 300
6. **Create records**

---

## 12. ACM — Certificados SSL

> ⚠️ **IMPORTANTE**: Certificados para CloudFront DEVEM ser criados na região **us-east-1**, independente de onde estão seus outros recursos.

### 12.1 Solicitar Certificado

1. **ACM** (em **us-east-1**!) → **Request certificate**
2. **Certificate type**: Request a public certificate
3. **Domain names**:
   - `usecava.com`
   - `*.usecava.com` (wildcard para futuros subdomínios)
4. **Validation method**: DNS validation (recomendado com Route53)
5. **Key algorithm**: RSA 2048
6. **Request**

### 12.2 Validar Certificado

1. Na lista de certificados, click no certificado pendente
2. Click **Create records in Route 53** (botão aparece se domínio está no Route53)
3. **Create records**
4. Aguarde 5-30 minutos para status mudar para **Issued**

### 12.3 Associar ao CloudFront

1. **CloudFront** → sua distribuição → **Edit**
2. **Custom SSL certificate**: selecione o certificado ACM `usecava.com`
3. **Save changes**

### 12.4 Associar ao ALB (opcional mas recomendado)

1. **EC2** → **Load Balancers** → `cava-alb` → **Listeners**
2. HTTPS:443 → **Edit** → **Default SSL certificate**: selecione o certificado ACM
3. Se você criou o certificado em outra região, precisa de um certificado **na mesma região do ALB**

---

## 13. CI/CD — GitHub Actions

### 13.1 Configurar Secrets no GitHub

1. Vá ao repositório no GitHub → **Settings** → **Secrets and variables** → **Actions**
2. Adicione os seguintes **Repository secrets**:

| Secret Name | Valor |
|-------------|-------|
| `AWS_ACCESS_KEY_ID` | Access Key do user `cava-github-deployer` |
| `AWS_SECRET_ACCESS_KEY` | Secret Key do user `cava-github-deployer` |
| `AWS_REGION` | `us-east-1` |
| `AWS_ACCOUNT_ID` | Seu Account ID (12 dígitos) |
| `NEXT_PUBLIC_API_URL` | `https://usecava.com/api` |
| `NEXT_PUBLIC_APP_URL` | `https://usecava.com` |
| `NEXT_PUBLIC_IMAGE_HOSTNAME` | `usecava.com` |
| `CLOUDFRONT_DISTRIBUTION_ID` | ID da distribuição CloudFront (ex: `E1234ABCDEF`) |

### 13.2 Criar Workflow File

Crie o arquivo `.github/workflows/deploy.yml`:

```yaml
name: Deploy to AWS

on:
  push:
    branches: [main]

env:
  AWS_REGION: ${{ secrets.AWS_REGION }}
  ECR_REGISTRY: ${{ secrets.AWS_ACCOUNT_ID }}.dkr.ecr.${{ secrets.AWS_REGION }}.amazonaws.com
  ECS_CLUSTER: cava-cluster
  BACKEND_ECR_REPO: cava/backend
  FRONTEND_ECR_REPO: cava/frontend
  BACKEND_SERVICE: cava-backend-service
  FRONTEND_SERVICE: cava-frontend-service
  BACKEND_TASK_DEF: cava-backend
  FRONTEND_TASK_DEF: cava-frontend

permissions:
  contents: read

jobs:
  # ========================================
  # Detectar quais partes mudaram
  # ========================================
  changes:
    name: Detect Changes
    runs-on: ubuntu-latest
    outputs:
      backend: ${{ steps.filter.outputs.backend }}
      frontend: ${{ steps.filter.outputs.frontend }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            backend:
              - 'backend/**'
            frontend:
              - 'frontend/**'

  # ========================================
  # Build & Deploy Backend
  # ========================================
  deploy-backend:
    name: Deploy Backend
    needs: changes
    if: needs.changes.outputs.backend == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build, tag, push Backend image
        working-directory: backend
        run: |
          IMAGE_TAG="${{ github.sha }}"
          docker build \
            -t $ECR_REGISTRY/$BACKEND_ECR_REPO:$IMAGE_TAG \
            -t $ECR_REGISTRY/$BACKEND_ECR_REPO:latest \
            .
          docker push $ECR_REGISTRY/$BACKEND_ECR_REPO:$IMAGE_TAG
          docker push $ECR_REGISTRY/$BACKEND_ECR_REPO:latest
          echo "IMAGE_TAG=$IMAGE_TAG" >> $GITHUB_ENV

      - name: Download current task definition
        run: |
          aws ecs describe-task-definition \
            --task-definition $BACKEND_TASK_DEF \
            --query 'taskDefinition' \
            --output json > backend-task-def.json

          # Remover campos que não podem ser re-registrados
          jq 'del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities, .registeredAt, .registeredBy)' \
            backend-task-def.json > backend-task-def-clean.json

      - name: Update image in task definition
        id: task-def-backend
        uses: aws-actions/amazon-ecs-render-task-definition@v1
        with:
          task-definition: backend-task-def-clean.json
          container-name: backend
          image: ${{ env.ECR_REGISTRY }}/${{ env.BACKEND_ECR_REPO }}:${{ env.IMAGE_TAG }}

      - name: Deploy Backend to ECS
        uses: aws-actions/amazon-ecs-deploy-task-definition@v2
        with:
          task-definition: ${{ steps.task-def-backend.outputs.task-definition }}
          service: ${{ env.BACKEND_SERVICE }}
          cluster: ${{ env.ECS_CLUSTER }}
          wait-for-service-stability: true
          wait-for-minutes: 10

  # ========================================
  # Build & Deploy Frontend
  # ========================================
  deploy-frontend:
    name: Deploy Frontend
    needs: changes
    if: needs.changes.outputs.frontend == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build, tag, push Frontend image
        working-directory: frontend
        run: |
          IMAGE_TAG="${{ github.sha }}"
          docker build \
            --build-arg NEXT_PUBLIC_API_URL=${{ secrets.NEXT_PUBLIC_API_URL }} \
            --build-arg NEXT_PUBLIC_APP_URL=${{ secrets.NEXT_PUBLIC_APP_URL }} \
            --build-arg NEXT_PUBLIC_IMAGE_HOSTNAME=${{ secrets.NEXT_PUBLIC_IMAGE_HOSTNAME }} \
            -t $ECR_REGISTRY/$FRONTEND_ECR_REPO:$IMAGE_TAG \
            -t $ECR_REGISTRY/$FRONTEND_ECR_REPO:latest \
            .
          docker push $ECR_REGISTRY/$FRONTEND_ECR_REPO:$IMAGE_TAG
          docker push $ECR_REGISTRY/$FRONTEND_ECR_REPO:latest
          echo "IMAGE_TAG=$IMAGE_TAG" >> $GITHUB_ENV

      - name: Download current task definition
        run: |
          aws ecs describe-task-definition \
            --task-definition $FRONTEND_TASK_DEF \
            --query 'taskDefinition' \
            --output json > frontend-task-def.json

          jq 'del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities, .registeredAt, .registeredBy)' \
            frontend-task-def.json > frontend-task-def-clean.json

      - name: Update image in task definition
        id: task-def-frontend
        uses: aws-actions/amazon-ecs-render-task-definition@v1
        with:
          task-definition: frontend-task-def-clean.json
          container-name: frontend
          image: ${{ env.ECR_REGISTRY }}/${{ env.FRONTEND_ECR_REPO }}:${{ env.IMAGE_TAG }}

      - name: Deploy Frontend to ECS
        uses: aws-actions/amazon-ecs-deploy-task-definition@v2
        with:
          task-definition: ${{ steps.task-def-frontend.outputs.task-definition }}
          service: ${{ env.FRONTEND_SERVICE }}
          cluster: ${{ env.ECS_CLUSTER }}
          wait-for-service-stability: true
          wait-for-minutes: 10

      - name: Invalidate CloudFront cache
        run: |
          aws cloudfront create-invalidation \
            --distribution-id ${{ secrets.CLOUDFRONT_DISTRIBUTION_ID }} \
            --paths "/*"

  # ========================================
  # Deploy Both (quando ambos mudam)
  # ========================================
  post-deploy:
    name: Post-Deploy Validation
    needs: [deploy-backend, deploy-frontend]
    if: always() && (needs.deploy-backend.result == 'success' || needs.deploy-frontend.result == 'success')
    runs-on: ubuntu-latest
    steps:
      - name: Health Check Backend
        run: |
          sleep 30
          STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://usecava.com/health)
          if [ "$STATUS" != "200" ]; then
            echo "❌ Backend health check failed: $STATUS"
            exit 1
          fi
          echo "✅ Backend healthy"

      - name: Health Check Frontend
        run: |
          STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://usecava.com/)
          if [ "$STATUS" != "200" ] && [ "$STATUS" != "301" ] && [ "$STATUS" != "302" ]; then
            echo "❌ Frontend health check failed: $STATUS"
            exit 1
          fi
          echo "✅ Frontend healthy"
```

### 13.3 Criar o Arquivo no Repositório

Salve o arquivo acima em `.github/workflows/deploy.yml` no repositório CAVA e faça push.

### 13.4 Fluxo do CI/CD

```
Developer pushes to main
    ↓
GitHub Actions triggered
    ↓
Detect changes (backend? frontend? both?)
    ↓
┌─────────────────────┬──────────────────────┐
│ Backend changed?    │ Frontend changed?    │
│ ↓                   │ ↓                    │
│ Build Docker image  │ Build Docker image   │
│ Push to ECR         │ (with build args)    │
│ Update Task Def     │ Push to ECR          │
│ Deploy to ECS       │ Update Task Def      │
│ Wait for stability  │ Deploy to ECS        │
│                     │ Invalidate CF cache  │
└─────────┬───────────┴──────────┬───────────┘
          │                      │
          └──────────┬───────────┘
                     ↓
            Health check validation
                     ↓
                  ✅ Done!
```

---

## 14. Variáveis de Ambiente — Configuração Final

### 14.1 Backend (ECS Task Definition)

Todas as variáveis já listadas na seção 8.2. Resumo dos valores de produção:

```env
# APP
APP_ENV=production
APP_HOST=0.0.0.0
APP_PORT=3001
LOG_LEVEL=info
LOG_FORMAT=json

# DATABASE (RDS)
DB_HOST=cava-db.xxxx.us-east-1.rds.amazonaws.com
DB_PORT=5432
DB_USER=cava_admin
DB_PASSWORD=<via-secrets-manager>
DB_NAME=cava_db
DB_SSL_MODE=require

# STORAGE (S3)
STORAGE_TYPE=s3
STORAGE_ENDPOINT=https://s3.us-east-1.amazonaws.com
STORAGE_ACCESS_KEY=
STORAGE_SECRET_KEY=
STORAGE_BUCKET_NAME=cava-media-prod
STORAGE_REGION=us-east-1
STORAGE_USE_SSL=true
STORAGE_PUBLIC_URL=https://usecava.com/media

# AUTH
JWT_SECRET=<via-secrets-manager>
PASSWORD_PEPPER=<via-secrets-manager>
CSRF_SECRET=<via-secrets-manager>
COOKIE_SECURE=true
COOKIE_DOMAIN=usecava.com

# SERVER
FRONTEND_URL=https://usecava.com
PUBLIC_LINK_BASE_URL=https://usecava.com
ALLOWED_ORIGINS=https://usecava.com

# EMAIL
USE_SES=true
SES_REGION=us-east-1
SES_SENDER_EMAIL=noreply@usecava.com
SES_SENDER_NAME=CAVA

# MIGRATIONS
MIGRATIONS_PATH=file://migrations
AUTO_MIGRATE=true
```

### 14.2 Frontend (Build Args + Runtime)

**Build time** (Docker build args, definidos no CI/CD):
```
NEXT_PUBLIC_API_URL=https://usecava.com/api
NEXT_PUBLIC_APP_URL=https://usecava.com
NEXT_PUBLIC_IMAGE_HOSTNAME=usecava.com
```

**Runtime** (ECS Task Definition env vars):
```
INTERNAL_API_URL=http://backend.cava.local:3001/api
NODE_ENV=production
```

---

## 15. Checklist de Pré-Go-Live

Execute cada item ANTES de liberar o domínio para usuários:

### Infraestrutura
- [ ] RDS criado e acessível na VPC
- [ ] S3 bucket criado com policy de leitura pública
- [ ] SES domínio verificado e fora do Sandbox
- [ ] ECR repositórios criados (backend + frontend)
- [ ] ECS cluster criado
- [ ] Task definitions criadas e revisadas
- [ ] ALB criado com listener rules configuradas
- [ ] Target groups com health checks passando (verde)
- [ ] CloudFront distribuição deployed e com SSL
- [ ] Route53 registro A apontando para CloudFront
- [ ] Certificado ACM validado e associado

### Segurança
- [ ] MFA habilitado no root user
- [ ] IAM Roles com least privilege
- [ ] RDS não é público (Public access: No)
- [ ] DB_SSL_MODE=require no backend
- [ ] COOKIE_SECURE=true
- [ ] COOKIE_DOMAIN=usecava.com
- [ ] ALLOWED_ORIGINS=https://usecava.com (somente)
- [ ] JWT_SECRET com ≥32 chars (gerado aleatoriamente)
- [ ] PASSWORD_PEPPER com ≥16 chars
- [ ] CSRF_SECRET com ≥32 chars
- [ ] Secrets sensíveis no AWS Secrets Manager (não plain text)
- [ ] Security Groups restritivos (apenas portas necessárias)
- [ ] Deletion protection habilitada no RDS

### Funcionalidade
- [ ] `https://usecava.com/health` retorna 200
- [ ] `https://usecava.com/` carrega o frontend
- [ ] Login funciona (cookies são setados)
- [ ] Upload de imagem funciona (vai pro S3)
- [ ] Imagens carregam via `https://usecava.com/media/*`
- [ ] Email de reset de senha chega (SES)
- [ ] Refresh de token funciona (middleware)
- [ ] CSRF protection funciona (POST requer token)
- [ ] Logout limpa cookies

### CI/CD
- [ ] GitHub Secrets configurados
- [ ] Push para `main` dispara deploy
- [ ] Backend deploya com sucesso
- [ ] Frontend deploya com sucesso
- [ ] CloudFront invalidation executa
- [ ] Health checks passam pós-deploy

---

## 16. Monitoramento e Observabilidade

### 16.1 CloudWatch Logs

Os logs já vão para CloudWatch automaticamente via awslogs driver:
- **Backend**: `/ecs/cava-backend`
- **Frontend**: `/ecs/cava-frontend`

Para visualizar:
1. **CloudWatch** → **Log groups** → `/ecs/cava-backend`
2. Click num log stream para ver os logs

O backend usa **JSON logging em produção** (`LOG_FORMAT=json`), o que permite:
- Queries estruturadas no CloudWatch Insights
- Filtros por level, error, user, etc.

### 16.2 CloudWatch Alarms (recomendado)

1. **CloudWatch** → **Alarms** → **Create alarm**

**Alarm 1 — Backend Unhealthy**:
- **Metric**: ECS → Service → `CPUUtilization`
- **Condition**: ≥ 80% por 5 minutos
- **Action**: SNS → seu email

**Alarm 2 — RDS CPU**:
- **Metric**: RDS → `CPUUtilization` para `cava-db`
- **Condition**: ≥ 80% por 10 minutos

**Alarm 3 — RDS Free Storage**:
- **Metric**: RDS → `FreeStorageSpace`
- **Condition**: ≤ 5 GB

**Alarm 4 — ALB 5xx Errors**:
- **Metric**: ALB → `HTTPCode_Target_5XX_Count`
- **Condition**: ≥ 10 em 5 minutos

### 16.3 Container Insights

Já habilitado na criação do cluster. Visualize em:
- **CloudWatch** → **Container Insights** → **Performance monitoring**
- Métricas: CPU, Memory, Network, Task count

---

## 17. Custos Detalhados

### Estimativa mensal (us-east-1, fev 2026)

| Serviço | Especificação | Custo/mês (USD) |
|---------|--------------|-----------------|
| **ECS Fargate — Backend** | 0.25 vCPU, 0.5 GB, 24/7 | ~$9 |
| **ECS Fargate — Frontend** | 0.25 vCPU, 0.5 GB, 24/7 | ~$9 |
| **RDS PostgreSQL** | db.t4g.micro, 20GB gp3 | ~$12 |
| **ALB** | 1 ALB + LCUs | ~$16 + ~$5 LCU |
| **CloudFront** | 50GB transfer + 1M requests | ~$5 |
| **S3** | 10GB storage + requests | ~$0.25 |
| **ECR** | 2 repos, ~5GB images | ~$0.50 |
| **SES** | <1000 emails/mês | ~$0.10 |
| **Route 53** | 1 hosted zone | $0.50 |
| **CloudWatch** | Logs + metrics | ~$3 |
| **Data Transfer** | VPC + internet | ~$5 |
| **Total estimado** | | **~$65-75 USD** |
| **Em reais (BRL ~5.5)** | | **~R$ 360-415/mês** |

### Otimizações de custo

1. **Savings Plans**: Compromisso de 1 ano → 40% de desconto em Fargate
2. **Reserved Instances**: RDS t4g.micro RI 1yr → ~$7/mês (vs $12)
3. **NAT Gateway**: **NÃO crie** — use IPs públicos nos tasks Fargate + Security Groups
4. **Cache no CloudFront**: Quanto mais cache, menos ALB requests (mais barato)
5. **Spot Fargate**: Considere para tasks não-críticas (60-70% desconto)

### O que NÃO pagar no início

| Serviço | Quando adicionar |
|---------|-----------------|
| NAT Gateway ($32/mês) | Só se precisar de IP fixo de saída |
| WAF ($5/mês + regras) | Quando tiver tráfego significativo |
| ElastiCache/Redis | Se precisar de cache centralizado |
| Multi-AZ RDS | Quando uptime 99.95% for necessário |
| Aurora | Quando precisar de mais performance de DB |

---

## 18. Troubleshooting

### 🔴 "Target group unhealthy"

**Causa**: Health check falhando.

**Diagnóstico**:
1. **EC2** → **Target Groups** → selecione o TG → **Targets** → veja o status
2. Se status é "unhealthy":
   - Verifique se o container está rodando: **ECS** → **Cluster** → **Tasks** → veja logs
   - Confirme que o health check path está correto (`/health` para backend, `/` para frontend)
   - Verifique Security Groups: o ALB precisa alcançar a porta do container

### 🔴 "Task stopped" no ECS

**Diagnóstico**:
1. **ECS** → **Cluster** → **Tasks** → tab **Stopped** → click na task
2. Veja **Stopped reason** e **Containers** → **Exit code**
3. Exit code 1 = erro da aplicação → veja logs no CloudWatch

**Causas comuns**:
- `DB_HOST` errado → container não conecta ao RDS
- Security Group do RDS não permite tráfego do ECS
- `DB_SSL_MODE=disable` mas RDS exige SSL → mude para `require`
- Secrets (JWT_SECRET, etc.) vazios ou curtos demais

### 🔴 "502 Bad Gateway" no CloudFront

**Causa**: CloudFront não consegue alcançar o ALB.

**Fix**:
1. Verifique se o ALB está healthy
2. Confirme que o Origin no CloudFront aponta para o ALB correto
3. Protocol Match: CloudFront → ALB deve ser HTTPS (se ALB tem certificado) ou HTTP
4. Se o ALB só tem HTTP listener, configure o origin protocol como HTTP

### 🔴 "403 Forbidden" em imagens do S3

**Causa**: OAC não configurado corretamente ou bucket policy incorreta.

**Fix**:
1. Verifique se o **OAC** está associado ao origin S3 no CloudFront (seção 10.1)
2. Verifique se a **Bucket Policy** contém o `Condition` com o ARN da distribuição (seção 5.2)
3. Confirme que "Block Public Access" está **habilitado** (tudo bloqueado — acesso é só via OAC)
4. Verifique se a CloudFront Function de strip prefix está funcionando (`/media/` → `/`)
5. Teste acessando `https://usecava.com/media/products/...` (deve funcionar) vs `https://cava-media-prod.s3.amazonaws.com/products/...` (deve dar 403)

### 🔴 Cookies não funcionam (não faz login)

**Diagnóstico**: Abra DevTools → Application → Cookies.

**Causas comuns**:
- `COOKIE_DOMAIN` não é `usecava.com`
- `COOKIE_SECURE=false` mas site usa HTTPS
- CloudFront não está encaminhando cookies → verifique Origin Request Policy
- CORS_ORIGINS não inclui `https://usecava.com`

### 🔴 CSRF token missing

**Causa**: O cookie `csrf_token` não foi setado.

**Fix**:
1. Acesse `https://usecava.com/health` (qualquer GET seta o cookie CSRF)
2. Confirme que o CloudFront encaminha cookies
3. Confirme que `COOKIE_DOMAIN=usecava.com`

### 🔴 Emails não chegam (SES)

**Diagnóstico**:
1. **SES** → **Account dashboard** → veja se está em Sandbox
2. Verifique logs do backend: procure por `[SES_EMAIL_ERROR]`

**Causas comuns**:
- SES em modo Sandbox (só envia para emails verificados)
- `SES_SENDER_EMAIL` não verificado no SES
- IAM Role do backend sem permissão `ses:SendEmail`
- Região errada (SES em `us-east-1` mas backend usa `sa-east-1`)

### 🔴 Migrations falham

**Diagnóstico**: Logs do backend → procure "erro ao aplicar migrations"

**Causas comuns**:
- RDS não acessível (Security Group)
- Extensão `uuid-ossp` não disponível no RDS → **RDS suporta por padrão**, mas precisa ser public
- User `cava_admin` sem permissão → confira que é o master user

### 🟡 Deploy lento no GitHub Actions

**Otimizações**:
1. Cache Docker layers: use `docker/build-push-action` com cache
2. Parallel builds: backend e frontend deployam em paralelo (já configurado)
3. Imagem menor: Alpine base images (já usado)

### 🟡 CloudFront cache serve conteúdo antigo

**Fix**:
1. O CI/CD já faz invalidation automática (`/*`)
2. Para invalidar manualmente:
   ```bash
   aws cloudfront create-invalidation \
     --distribution-id E1234ABCDEF \
     --paths "/*"
   ```

---

## 🎉 Resumo — Ordem de Execução

Para referência rápida, execute nesta ordem:

```
 1. ✅ Conta AWS + MFA no root
 2. ✅ ACM — Solicitar certificado SSL (leva tempo para validar)
 3. ✅ IAM — Criar users, roles, policies
 4. ✅ RDS — Criar instância PostgreSQL
 5. ✅ S3 — Criar bucket + policy + CORS
 6. ✅ SES — Verificar domínio + sair do sandbox
 7. ✅ ECR — Criar repos + push inicial
 8. ✅ ALB — Criar load balancer + target groups
 9. ✅ ECS — Criar cluster + task definitions + services
10. ✅ CloudFront — Criar distribuição + behaviors + function
11. ✅ Route53 — Apontar domínio para CloudFront
12. ✅ GitHub — Configurar secrets + criar workflow
13. ✅ Testar — Rodar checklist completo
14. 🚀 GO LIVE!
```

---

> **Dica final**: Guarde este documento. Quando precisar escalar (mais tráfego, mais features), a arquitetura base está pronta para evoluir sem refazer tudo. Basta ajustar task sizes, adicionar auto-scaling, ou migrar RDS para Aurora.
