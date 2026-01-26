# Guia de Configuração do Amazon SES para CAVA

Este guia detalha todo o processo de configuração do Amazon Simple Email Service (SES) para o projeto CAVA, tanto para desenvolvimento local quanto para produção no AWS Fargate.

---

## 📋 Índice

1. [Pré-requisitos](#pré-requisitos)
2. [Verificação de Emails no SES (Sandbox Mode)](#1-verificação-de-emails-no-ses-sandbox-mode)
3. [Configuração IAM para Desenvolvimento Local](#2-configuração-iam-para-desenvolvimento-local)
4. [Configuração de Credenciais Locais](#3-configuração-de-credenciais-locais)
5. [Configuração IAM para Produção (Fargate)](#4-configuração-iam-para-produção-fargate)
6. [Configuração do Backend Go](#5-configuração-do-backend-go)
7. [Testando a Integração](#6-testando-a-integração)
8. [Sair do Sandbox Mode (Produção)](#7-sair-do-sandbox-mode-produção)
9. [Troubleshooting](#8-troubleshooting)

---

## Pré-requisitos

- Conta AWS ativa
- AWS CLI instalado (opcional, mas recomendado)
- Acesso ao Console AWS com permissões de administrador ou IAM

---

## 1. Verificação de Emails no SES (Sandbox Mode)

> ⚠️ **IMPORTANTE:** Quando você começa a usar o SES, sua conta está em **Sandbox Mode**. Neste modo, você SÓ pode enviar emails para endereços que foram verificados previamente.

### 1.1 Acessar o Console SES

1. Acesse o [Console AWS](https://console.aws.amazon.com/)
2. Na barra de busca, digite **"SES"** e selecione **"Amazon Simple Email Service"**
3. ⚠️ **Verifique a região** no canto superior direito. Escolha a mesma região que você usará no código (ex: `us-east-1` ou `sa-east-1` para São Paulo)

### 1.2 Verificar Email do Remetente (OBRIGATÓRIO)

Este é o email que aparecerá como "De:" nos emails enviados.

1. No menu lateral, clique em **"Verified identities"**
2. Clique no botão **"Create identity"**
3. Selecione **"Email address"**
4. Digite o email que será usado como remetente (ex: `noreply@seudominio.com.br`)
5. Clique em **"Create identity"**
6. Acesse a caixa de entrada deste email e clique no link de confirmação enviado pela AWS

![Verificar Email Remetente](https://docs.aws.amazon.com/images/ses/latest/dg/images/send-email-getting-started-verify-email-address.png)

### 1.3 Verificar Emails de Destinatário (Apenas em Sandbox)

Enquanto estiver em Sandbox Mode, repita o processo para **cada email de teste** que receberá mensagens:

1. Vá para **"Verified identities"**
2. Clique em **"Create identity"**
3. Selecione **"Email address"**
4. Digite o email do destinatário de teste
5. Confirme clicando no link enviado

> 💡 **Dica:** Verifique pelo menos 2-3 emails de teste para poder testar diferentes fluxos.

---

## 2. Configuração IAM para Desenvolvimento Local

### 2.1 Criar Usuário IAM Programático

1. Acesse o console IAM: [https://console.aws.amazon.com/iam/](https://console.aws.amazon.com/iam/)
2. No menu lateral, clique em **"Users"**
3. Clique em **"Create user"**
4. **User name:** Digite `cava-ses-dev` (ou nome descritivo)
5. Clique em **"Next"**

### 2.2 Anexar Política de Permissões

Na tela de permissões:

1. Selecione **"Attach policies directly"**
2. Clique em **"Create policy"** (abrirá nova aba)
3. Selecione a aba **"JSON"**
4. Cole a seguinte política mínima:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "SESSendEmailPermissions",
            "Effect": "Allow",
            "Action": [
                "ses:SendEmail",
                "ses:SendRawEmail"
            ],
            "Resource": "*"
        }
    ]
}
```

5. Clique em **"Next"**
6. **Policy name:** Digite `CAVA-SES-SendEmail-Policy`
7. **Description:** `Permite envio de emails via SES para a aplicação CAVA`
8. Clique em **"Create policy"**

### 2.3 Finalizar Criação do Usuário

1. Volte para a aba de criação do usuário
2. Clique no botão de refresh 🔄 ao lado da lista de políticas
3. Busque e selecione `CAVA-SES-SendEmail-Policy`
4. Clique em **"Next"**
5. Revise e clique em **"Create user"**

### 2.4 Gerar Access Keys

1. Clique no usuário recém-criado (`cava-ses-dev`)
2. Vá para a aba **"Security credentials"**
3. Em "Access keys", clique em **"Create access key"**
4. Selecione **"Application running outside AWS"**
5. Clique em **"Next"**
6. **Description:** `Desenvolvimento local CAVA`
7. Clique em **"Create access key"**
8. ⚠️ **IMPORTANTE:** Copie ou baixe o CSV com as credenciais. **Você não poderá vê-las novamente!**

```
Access key ID: AKIA...
Secret access key: wJalrXUtnFEMI...
```

---

## 3. Configuração de Credenciais Locais

Você tem duas opções para configurar as credenciais:

### Opção A: Arquivo de Credenciais (RECOMENDADO)

Esta é a forma mais segura e recomendada para desenvolvimento local.

1. Crie/edite o arquivo de credenciais:

**Windows:**
```
%USERPROFILE%\.aws\credentials
```
Ou seja: `C:\Users\SeuUsuario\.aws\credentials`

**macOS/Linux:**
```
~/.aws/credentials
```

2. Adicione o seguinte conteúdo:

```ini
[default]
aws_access_key_id = AKIA...SuaAccessKeyAqui
aws_secret_access_key = wJalr...SuaSecretKeyAqui
region = us-east-1
```

3. (Opcional) Crie também o arquivo de configuração `~/.aws/config`:

```ini
[default]
region = us-east-1
output = json
```

> 💡 **Segurança:** Nunca commite esses arquivos. Eles já estão no `.gitignore` padrão.

### Opção B: Variáveis de Ambiente

Para sessão temporária ou CI/CD:

**Windows (PowerShell):**
```powershell
$env:AWS_ACCESS_KEY_ID = "AKIA...SuaAccessKeyAqui"
$env:AWS_SECRET_ACCESS_KEY = "wJalr...SuaSecretKeyAqui"
$env:AWS_REGION = "us-east-1"
```

**Windows (CMD):**
```cmd
set AWS_ACCESS_KEY_ID=AKIA...SuaAccessKeyAqui
set AWS_SECRET_ACCESS_KEY=wJalr...SuaSecretKeyAqui
set AWS_REGION=us-east-1
```

**macOS/Linux (bash):**
```bash
export AWS_ACCESS_KEY_ID="AKIA...SuaAccessKeyAqui"
export AWS_SECRET_ACCESS_KEY="wJalr...SuaSecretKeyAqui"
export AWS_REGION="us-east-1"
```

### Verificar Configuração

Para verificar se as credenciais estão funcionando, use o AWS CLI:

```bash
aws sts get-caller-identity
```

Resposta esperada:
```json
{
    "UserId": "AIDA...",
    "Account": "123456789012",
    "Arn": "arn:aws:iam::123456789012:user/cava-ses-dev"
}
```

---

## 4. Configuração IAM para Produção (Fargate)

Em produção, **NUNCA use Access Keys fixas**. Use IAM Roles que são automaticamente injetadas pelo ECS.

### 4.1 Criar IAM Role para ECS Task

1. No console IAM, vá para **"Roles"**
2. Clique em **"Create role"**
3. **Trusted entity type:** Selecione **"AWS service"**
4. **Use case:** Selecione **"Elastic Container Service"**
5. Em "Use case", selecione **"Elastic Container Service Task"**
6. Clique em **"Next"**

### 4.2 Anexar Políticas

1. Busque e selecione a política `CAVA-SES-SendEmail-Policy` (criada anteriormente)
2. (Opcional) Adicione outras políticas necessárias para o app (S3, RDS, etc)
3. Clique em **"Next"**

### 4.3 Nomear a Role

1. **Role name:** `CAVA-ECS-Task-Role`
2. **Description:** `Role para tasks ECS da aplicação CAVA`
3. Revise e clique em **"Create role"**

### 4.4 Configurar Task Definition no ECS

Na sua Task Definition do ECS Fargate:

```json
{
  "family": "cava-backend",
  "taskRoleArn": "arn:aws:iam::123456789012:role/CAVA-ECS-Task-Role",
  "executionRoleArn": "arn:aws:iam::123456789012:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "backend",
      "image": "...",
      "environment": [
        { "name": "USE_SES", "value": "true" },
        { "name": "SES_REGION", "value": "us-east-1" },
        { "name": "SES_SENDER_EMAIL", "value": "noreply@seudominio.com.br" },
        { "name": "SES_SENDER_NAME", "value": "CAVA" }
      ]
    }
  ]
}
```

> ⚠️ **Importante:** Note que NÃO passamos `AWS_ACCESS_KEY_ID` nem `AWS_SECRET_ACCESS_KEY`. O SDK Go detecta automaticamente a IAM Role do Fargate!

---

## 5. Configuração do Backend Go

### 5.1 Variáveis de Ambiente

No seu arquivo `.env` local:

```env
# Habilitar SES
USE_SES=true

# Região (use a mesma onde você verificou os emails)
SES_REGION=us-east-1

# Email verificado no SES (OBRIGATÓRIO)
SES_SENDER_EMAIL=noreply@seudominio.com.br

# Nome do remetente (opcional)
SES_SENDER_NAME=CAVA
```

### 5.2 Exemplo de Uso no Código

```go
package main

import (
    "context"
    "log"

    "github.com/thiagomes07/CAVA/backend/internal/config"
    "github.com/thiagomes07/CAVA/backend/internal/domain/service"
    "github.com/thiagomes07/CAVA/backend/internal/infra/email"
    "go.uber.org/zap"
)

func main() {
    ctx := context.Background()
    logger, _ := zap.NewProduction()
    cfg, _ := config.Load()

    // Criar o sender de email
    emailSender, err := email.NewSESEmailSenderFromAppConfig(ctx, cfg, logger)
    if err != nil {
        log.Fatalf("Erro ao criar email sender: %v", err)
    }

    // Enviar email
    err = emailSender.Send(ctx, service.EmailMessage{
        To:       "destinatario@exemplo.com",
        Subject:  "Bem-vindo ao CAVA!",
        HTMLBody: "<h1>Olá!</h1><p>Seja bem-vindo à plataforma.</p>",
        TextBody: "Olá! Seja bem-vindo à plataforma.",
    })

    if err != nil {
        // Tratar erro específico do SES
        if sesErr, ok := email.IsSESError(err); ok {
            switch sesErr.Type {
            case email.SandboxError:
                log.Printf("Email não verificado (Sandbox): %v", sesErr)
            case email.QuotaExceededError:
                log.Printf("Limite de envio excedido: %v", sesErr)
            case email.CredentialError:
                log.Printf("Problema de credenciais: %v", sesErr)
            default:
                log.Printf("Erro ao enviar: %v", sesErr)
            }
        }
        return
    }

    log.Println("Email enviado com sucesso!")
}
```

---

## 6. Testando a Integração

### 6.1 Teste Local Rápido

Crie um arquivo temporário `test_ses.go`:

```go
//go:build ignore

package main

import (
    "context"
    "fmt"
    "os"

    "github.com/aws/aws-sdk-go-v2/config"
    "github.com/aws/aws-sdk-go-v2/service/ses"
)

func main() {
    ctx := context.Background()
    
    // Carregar configuração (usa ~/.aws/credentials ou env vars)
    cfg, err := config.LoadDefaultConfig(ctx, config.WithRegion("us-east-1"))
    if err != nil {
        fmt.Printf("❌ Erro ao carregar config: %v\n", err)
        os.Exit(1)
    }

    // Criar cliente SES
    client := ses.NewFromConfig(cfg)

    // Testar listando emails verificados
    result, err := client.ListIdentities(ctx, &ses.ListIdentitiesInput{})
    if err != nil {
        fmt.Printf("❌ Erro ao conectar SES: %v\n", err)
        os.Exit(1)
    }

    fmt.Println("✅ Conexão com SES bem sucedida!")
    fmt.Println("📧 Identidades verificadas:")
    for _, id := range result.Identities {
        fmt.Printf("   - %s\n", id)
    }
}
```

Execute:
```bash
go run test_ses.go
```

---

## 7. Sair do Sandbox Mode (Produção)

Por padrão, o SES está em **Sandbox Mode** e só pode enviar para emails verificados. Para produção, você precisa solicitar acesso de produção.

### 7.1 Solicitar Acesso de Produção

1. No console SES, clique em **"Account dashboard"**
2. Na seção "Sending statistics", você verá "Your account is in the sandbox"
3. Clique em **"Request production access"**
4. Preencha o formulário:
   - **Mail type:** Transactional (para emails transacionais)
   - **Website URL:** URL da sua aplicação
   - **Use case description:** Descreva os tipos de email (boas-vindas, recuperação senha, notificações)
   - **Additional contacts:** Emails para receber notificações

5. Clique em **"Submit request"**

> ⏳ **Tempo de análise:** Geralmente 24-48 horas úteis.

### 7.2 O Que Muda no Production Mode

| Característica | Sandbox | Production |
|---------------|---------|------------|
| Destinatários | Apenas verificados | Qualquer email |
| Limite diário | 200 emails/dia | 50.000+ emails/dia |
| Taxa de envio | 1 email/segundo | 14+ emails/segundo |

---

## 8. Troubleshooting

### Erro: "Email address is not verified"

**Causa:** Você está em Sandbox Mode e o destinatário não foi verificado.

**Solução:** 
1. Verifique o email do destinatário no SES
2. Ou solicite acesso de produção

### Erro: "AccessDenied" ou "Authorization"

**Causa:** Credenciais inválidas ou política sem permissão.

**Soluções:**
1. Verifique se as Access Keys estão corretas
2. Confirme que a política `CAVA-SES-SendEmail-Policy` está anexada ao usuário/role
3. Verifique se a região está correta

### Erro: "Throttling" ou "Rate exceeded"

**Causa:** Você excedeu o limite de envio.

**Soluções:**
1. Aguarde alguns minutos e tente novamente
2. Implemente retry com exponential backoff
3. Solicite aumento de cota no console SES

### Credenciais não são encontradas localmente

**Verificações:**
1. Arquivo `~/.aws/credentials` existe e tem formato correto
2. Variáveis de ambiente estão definidas na sessão atual
3. Não há conflito entre arquivo e variáveis

```bash
# Verificar qual identidade o SDK está usando
aws sts get-caller-identity
```

### Emails não chegam (mesmo sem erro)

**Verificações:**
1. Verifique a pasta de spam
2. No console SES, verifique "Sending statistics" e "Reputation metrics"
3. Verifique se o domínio não está em supression list

---

## 📚 Referências

- [AWS SES Developer Guide](https://docs.aws.amazon.com/ses/latest/dg/Welcome.html)
- [AWS SDK for Go v2](https://aws.github.io/aws-sdk-go-v2/docs/)
- [IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [ECS Task IAM Roles](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-iam-roles.html)

---

*Última atualização: Janeiro de 2026*
