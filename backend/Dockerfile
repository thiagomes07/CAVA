# =============================================
# STAGE 1: Build
# =============================================
FROM golang:1.22-alpine AS builder

# Instalar dependências de build
RUN apk add --no-cache git ca-certificates tzdata

WORKDIR /app

# Copiar go.mod e go.sum primeiro (melhor cache de dependências)
COPY go.mod go.sum ./
RUN go mod download && go mod verify

# Copiar código fonte
COPY . .

# Build do binário otimizado
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-w -s -X main.version=$(git describe --tags --always --dirty 2>/dev/null || echo 'dev')" \
    -a -installsuffix cgo \
    -o /app/bin/api \
    ./cmd/api/main.go

# =============================================
# STAGE 2: Runtime
# =============================================
FROM alpine:3.19

# Instalar dependências runtime
RUN apk --no-cache add \
    ca-certificates \
    tzdata \
    wget \
    && update-ca-certificates

# Criar diretório da aplicação
WORKDIR /app

# Copiar binário do stage de build
COPY --from=builder /app/bin/api ./api

# Copiar migrations
COPY --from=builder /app/migrations ./migrations

# Copiar arquivo .env.example como referência (não usar em produção)
COPY --from=builder /app/.env.example ./

# Criar usuário não-root para segurança
RUN addgroup -g 1000 appuser && \
    adduser -D -u 1000 -G appuser appuser && \
    chown -R appuser:appuser /app

# Mudar para usuário não-root
USER appuser

# Expor porta da aplicação
EXPOSE 3001

# Health check endpoint (wget é mais leve que curl)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Labels para metadata
LABEL maintainer="CAVA Team"
LABEL version="1.0"
LABEL description="CAVA Backend - Sistema B2B de gestão de estoque de rochas ornamentais"

# Executar aplicação
ENTRYPOINT ["./api"]