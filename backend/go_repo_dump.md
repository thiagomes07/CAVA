# 📁 Dump Completo do Projeto Go

## 📄 Arquivos analisados

### `.\cmd\api\main.go`

```go
﻿package main

import (
    "log"
    "os"
    "os/signal"
    "syscall"
)

func main() {
    log.Println(" CAVA Backend iniciando...")
    
    // TODO: Implementar bootstrap completo
    // 1. Carregar configurações
    // 2. Conectar ao banco
    // 3. Conectar ao storage
    // 4. Inicializar router
    // 5. Registrar middlewares
    // 6. Registrar rotas
    // 7. Iniciar servidor
    
    // Graceful shutdown
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
    <-quit
    
    log.Println(" CAVA Backend encerrando...")
}
```

---

### `.\docker-compose.yml`

```go
version: '3.8'

networks:
  cava-network:
    driver: bridge

volumes:
  postgres-data:
  minio-data:

services:
  # =============================================
  # POSTGRESQL
  # =============================================
  postgres:
    image: postgres:16-alpine
    container_name: cava-postgres
    restart: always
    environment:
      POSTGRES_USER: cava_user
      POSTGRES_PASSWORD: cava_password_dev
      POSTGRES_DB: cava_db
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - cava-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U cava_user -d cava_db"]
      interval: 10s
      timeout: 5s
      retries: 5

  # =============================================
  # MINIO (S3-Compatible Storage)
  # =============================================
  minio:
    image: minio/minio:latest
    container_name: cava-minio
    restart: always
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minio_access_key
      MINIO_ROOT_PASSWORD: minio_secret_key
    ports:
      - "9000:9000"  # API
      - "9001:9001"  # Console Web
    volumes:
      - minio-data:/data
    networks:
      - cava-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 10s
      retries: 3

  # =============================================
  # MINIO INIT (Criar bucket automaticamente)
  # =============================================
  minio-init:
    image: minio/mc:latest
    container_name: cava-minio-init
    depends_on:
      minio:
        condition: service_healthy
    entrypoint: >
      /bin/sh -c "
      mc alias set minio http://minio:9000 minio_access_key minio_secret_key;
      mc mb --ignore-existing minio/cava-media;
      mc anonymous set download minio/cava-media;
      exit 0;
      "
    networks:
      - cava-network

  # =============================================
  # API (Backend Go)
  # =============================================
  api:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: cava-api
    restart: unless-stopped
    env_file:
      - .env
    environment:
      DB_HOST: postgres
      STORAGE_ENDPOINT: http://minio:9000
    ports:
      - "3001:3001"
    depends_on:
      postgres:
        condition: service_healthy
      minio:
        condition: service_healthy
    networks:
      - cava-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

---

### `.\Dockerfile`

```go
# =============================================
# STAGE 1: Build
# =============================================
FROM golang:1.21-alpine AS builder

# Instalar dependências de build
RUN apk add --no-cache git ca-certificates tzdata

WORKDIR /app

# Copiar go.mod e go.sum primeiro (cache de dependências)
COPY go.mod go.sum ./
RUN go mod download

# Copiar código fonte
COPY . .

# Build do binário
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-w -s" \
    -o /app/bin/api \
    ./cmd/api

# =============================================
# STAGE 2: Runtime
# =============================================
FROM alpine:latest

# Instalar certificados SSL e timezone data
RUN apk --no-cache add ca-certificates tzdata curl

WORKDIR /app

# Copiar binário do stage de build
COPY --from=builder /app/bin/api ./api

# Copiar migrations
COPY --from=builder /app/migrations ./migrations

# Criar usuário não-root
RUN addgroup -g 1000 appuser && \
    adduser -D -u 1000 -G appuser appuser && \
    chown -R appuser:appuser /app

USER appuser

# Expor porta
EXPOSE 3001

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Executar aplicação
CMD ["./api"]
```

---

### `.\go.mod`

```go
module github.com/thiagomes07/CAVA/backend

go 1.25.1

require (
	github.com/Masterminds/squirrel v1.5.4 // indirect
	github.com/aws/aws-sdk-go-v2 v1.41.0 // indirect
	github.com/aws/aws-sdk-go-v2/aws/protocol/eventstream v1.7.4 // indirect
	github.com/aws/aws-sdk-go-v2/config v1.32.6 // indirect
	github.com/aws/aws-sdk-go-v2/credentials v1.19.6 // indirect
	github.com/aws/aws-sdk-go-v2/feature/ec2/imds v1.18.16 // indirect
	github.com/aws/aws-sdk-go-v2/internal/configsources v1.4.16 // indirect
	github.com/aws/aws-sdk-go-v2/internal/endpoints/v2 v2.7.16 // indirect
	github.com/aws/aws-sdk-go-v2/internal/ini v1.8.4 // indirect
	github.com/aws/aws-sdk-go-v2/internal/v4a v1.4.16 // indirect
	github.com/aws/aws-sdk-go-v2/service/internal/accept-encoding v1.13.4 // indirect
	github.com/aws/aws-sdk-go-v2/service/internal/checksum v1.9.7 // indirect
	github.com/aws/aws-sdk-go-v2/service/internal/presigned-url v1.13.16 // indirect
	github.com/aws/aws-sdk-go-v2/service/internal/s3shared v1.19.16 // indirect
	github.com/aws/aws-sdk-go-v2/service/s3 v1.95.0 // indirect
	github.com/aws/aws-sdk-go-v2/service/signin v1.0.4 // indirect
	github.com/aws/aws-sdk-go-v2/service/sso v1.30.8 // indirect
	github.com/aws/aws-sdk-go-v2/service/ssooidc v1.35.12 // indirect
	github.com/aws/aws-sdk-go-v2/service/sts v1.41.5 // indirect
	github.com/aws/smithy-go v1.24.0 // indirect
	github.com/dustin/go-humanize v1.0.1 // indirect
	github.com/gabriel-vasile/mimetype v1.4.12 // indirect
	github.com/go-chi/chi/v5 v5.2.3 // indirect
	github.com/go-chi/cors v1.2.2 // indirect
	github.com/go-ini/ini v1.67.0 // indirect
	github.com/go-playground/locales v0.14.1 // indirect
	github.com/go-playground/universal-translator v0.18.1 // indirect
	github.com/go-playground/validator/v10 v10.30.1 // indirect
	github.com/golang-jwt/jwt/v5 v5.3.0 // indirect
	github.com/golang-migrate/migrate/v4 v4.19.1 // indirect
	github.com/google/uuid v1.6.0 // indirect
	github.com/gosimple/slug v1.15.0 // indirect
	github.com/gosimple/unidecode v1.0.1 // indirect
	github.com/joho/godotenv v1.5.1 // indirect
	github.com/klauspost/compress v1.18.0 // indirect
	github.com/klauspost/cpuid/v2 v2.2.11 // indirect
	github.com/klauspost/crc32 v1.3.0 // indirect
	github.com/lann/builder v0.0.0-20180802200727-47ae307949d0 // indirect
	github.com/lann/ps v0.0.0-20150810152359-62de8c46ede0 // indirect
	github.com/leodido/go-urn v1.4.0 // indirect
	github.com/lib/pq v1.10.9 // indirect
	github.com/minio/crc64nvme v1.1.0 // indirect
	github.com/minio/md5-simd v1.1.2 // indirect
	github.com/minio/minio-go/v7 v7.0.97 // indirect
	github.com/philhofer/fwd v1.2.0 // indirect
	github.com/rs/xid v1.6.0 // indirect
	github.com/shopspring/decimal v1.4.0 // indirect
	github.com/tinylib/msgp v1.3.0 // indirect
	go.uber.org/multierr v1.10.0 // indirect
	go.uber.org/zap v1.27.1 // indirect
	golang.org/x/crypto v0.46.0 // indirect
	golang.org/x/net v0.47.0 // indirect
	golang.org/x/sys v0.39.0 // indirect
	golang.org/x/text v0.32.0 // indirect
	golang.org/x/time v0.14.0 // indirect
	gopkg.in/yaml.v3 v3.0.1 // indirect
)
```

---

### `.\go.sum`

```go
github.com/Masterminds/squirrel v1.5.4 h1:uUcX/aBc8O7Fg9kaISIUsHXdKuqehiXAMQTYX8afzqM=
github.com/Masterminds/squirrel v1.5.4/go.mod h1:NNaOrjSoIDfDA40n7sr2tPNZRfjzjA400rg+riTZj10=
github.com/aws/aws-sdk-go-v2 v1.41.0 h1:tNvqh1s+v0vFYdA1xq0aOJH+Y5cRyZ5upu6roPgPKd4=
github.com/aws/aws-sdk-go-v2 v1.41.0/go.mod h1:MayyLB8y+buD9hZqkCW3kX1AKq07Y5pXxtgB+rRFhz0=
github.com/aws/aws-sdk-go-v2/aws/protocol/eventstream v1.7.4 h1:489krEF9xIGkOaaX3CE/Be2uWjiXrkCH6gUX+bZA/BU=
github.com/aws/aws-sdk-go-v2/aws/protocol/eventstream v1.7.4/go.mod h1:IOAPF6oT9KCsceNTvvYMNHy0+kMF8akOjeDvPENWxp4=
github.com/aws/aws-sdk-go-v2/config v1.32.6 h1:hFLBGUKjmLAekvi1evLi5hVvFQtSo3GYwi+Bx4lpJf8=
github.com/aws/aws-sdk-go-v2/config v1.32.6/go.mod h1:lcUL/gcd8WyjCrMnxez5OXkO3/rwcNmvfno62tnXNcI=
github.com/aws/aws-sdk-go-v2/credentials v1.19.6 h1:F9vWao2TwjV2MyiyVS+duza0NIRtAslgLUM0vTA1ZaE=
github.com/aws/aws-sdk-go-v2/credentials v1.19.6/go.mod h1:SgHzKjEVsdQr6Opor0ihgWtkWdfRAIwxYzSJ8O85VHY=
github.com/aws/aws-sdk-go-v2/feature/ec2/imds v1.18.16 h1:80+uETIWS1BqjnN9uJ0dBUaETh+P1XwFy5vwHwK5r9k=
github.com/aws/aws-sdk-go-v2/feature/ec2/imds v1.18.16/go.mod h1:wOOsYuxYuB/7FlnVtzeBYRcjSRtQpAW0hCP7tIULMwo=
github.com/aws/aws-sdk-go-v2/internal/configsources v1.4.16 h1:rgGwPzb82iBYSvHMHXc8h9mRoOUBZIGFgKb9qniaZZc=
github.com/aws/aws-sdk-go-v2/internal/configsources v1.4.16/go.mod h1:L/UxsGeKpGoIj6DxfhOWHWQ/kGKcd4I1VncE4++IyKA=
github.com/aws/aws-sdk-go-v2/internal/endpoints/v2 v2.7.16 h1:1jtGzuV7c82xnqOVfx2F0xmJcOw5374L7N6juGW6x6U=
github.com/aws/aws-sdk-go-v2/internal/endpoints/v2 v2.7.16/go.mod h1:M2E5OQf+XLe+SZGmmpaI2yy+J326aFf6/+54PoxSANc=
github.com/aws/aws-sdk-go-v2/internal/ini v1.8.4 h1:WKuaxf++XKWlHWu9ECbMlha8WOEGm0OUEZqm4K/Gcfk=
github.com/aws/aws-sdk-go-v2/internal/ini v1.8.4/go.mod h1:ZWy7j6v1vWGmPReu0iSGvRiise4YI5SkR3OHKTZ6Wuc=
github.com/aws/aws-sdk-go-v2/internal/v4a v1.4.16 h1:CjMzUs78RDDv4ROu3JnJn/Ig1r6ZD7/T2DXLLRpejic=
github.com/aws/aws-sdk-go-v2/internal/v4a v1.4.16/go.mod h1:uVW4OLBqbJXSHJYA9svT9BluSvvwbzLQ2Crf6UPzR3c=
github.com/aws/aws-sdk-go-v2/service/internal/accept-encoding v1.13.4 h1:0ryTNEdJbzUCEWkVXEXoqlXV72J5keC1GvILMOuD00E=
github.com/aws/aws-sdk-go-v2/service/internal/accept-encoding v1.13.4/go.mod h1:HQ4qwNZh32C3CBeO6iJLQlgtMzqeG17ziAA/3KDJFow=
github.com/aws/aws-sdk-go-v2/service/internal/checksum v1.9.7 h1:DIBqIrJ7hv+e4CmIk2z3pyKT+3B6qVMgRsawHiR3qso=
github.com/aws/aws-sdk-go-v2/service/internal/checksum v1.9.7/go.mod h1:vLm00xmBke75UmpNvOcZQ/Q30ZFjbczeLFqGx5urmGo=
github.com/aws/aws-sdk-go-v2/service/internal/presigned-url v1.13.16 h1:oHjJHeUy0ImIV0bsrX0X91GkV5nJAyv1l1CC9lnO0TI=
github.com/aws/aws-sdk-go-v2/service/internal/presigned-url v1.13.16/go.mod h1:iRSNGgOYmiYwSCXxXaKb9HfOEj40+oTKn8pTxMlYkRM=
github.com/aws/aws-sdk-go-v2/service/internal/s3shared v1.19.16 h1:NSbvS17MlI2lurYgXnCOLvCFX38sBW4eiVER7+kkgsU=
github.com/aws/aws-sdk-go-v2/service/internal/s3shared v1.19.16/go.mod h1:SwT8Tmqd4sA6G1qaGdzWCJN99bUmPGHfRwwq3G5Qb+A=
github.com/aws/aws-sdk-go-v2/service/s3 v1.95.0 h1:MIWra+MSq53CFaXXAywB2qg9YvVZifkk6vEGl/1Qor0=
github.com/aws/aws-sdk-go-v2/service/s3 v1.95.0/go.mod h1:79S2BdqCJpScXZA2y+cpZuocWsjGjJINyXnOsf5DTz8=
github.com/aws/aws-sdk-go-v2/service/signin v1.0.4 h1:HpI7aMmJ+mm1wkSHIA2t5EaFFv5EFYXePW30p1EIrbQ=
github.com/aws/aws-sdk-go-v2/service/signin v1.0.4/go.mod h1:C5RdGMYGlfM0gYq/tifqgn4EbyX99V15P2V3R+VHbQU=
github.com/aws/aws-sdk-go-v2/service/sso v1.30.8 h1:aM/Q24rIlS3bRAhTyFurowU8A0SMyGDtEOY/l/s/1Uw=
github.com/aws/aws-sdk-go-v2/service/sso v1.30.8/go.mod h1:+fWt2UHSb4kS7Pu8y+BMBvJF0EWx+4H0hzNwtDNRTrg=
github.com/aws/aws-sdk-go-v2/service/ssooidc v1.35.12 h1:AHDr0DaHIAo8c9t1emrzAlVDFp+iMMKnPdYy6XO4MCE=
github.com/aws/aws-sdk-go-v2/service/ssooidc v1.35.12/go.mod h1:GQ73XawFFiWxyWXMHWfhiomvP3tXtdNar/fi8z18sx0=
github.com/aws/aws-sdk-go-v2/service/sts v1.41.5 h1:SciGFVNZ4mHdm7gpD1dgZYnCuVdX1s+lFTg4+4DOy70=
github.com/aws/aws-sdk-go-v2/service/sts v1.41.5/go.mod h1:iW40X4QBmUxdP+fZNOpfmkdMZqsovezbAeO+Ubiv2pk=
github.com/aws/smithy-go v1.24.0 h1:LpilSUItNPFr1eY85RYgTIg5eIEPtvFbskaFcmmIUnk=
github.com/aws/smithy-go v1.24.0/go.mod h1:LEj2LM3rBRQJxPZTB4KuzZkaZYnZPnvgIhb4pu07mx0=
github.com/davecgh/go-spew v1.1.1/go.mod h1:J7Y8YcW2NihsgmVo/mv3lAwl/skON4iLHjSsI+c5H38=
github.com/dustin/go-humanize v1.0.1 h1:GzkhY7T5VNhEkwH0PVJgjz+fX1rhBrR7pRT3mDkpeCY=
github.com/dustin/go-humanize v1.0.1/go.mod h1:Mu1zIs6XwVuF/gI1OepvI0qD18qycQx+mFykh5fBlto=
github.com/gabriel-vasile/mimetype v1.4.12 h1:e9hWvmLYvtp846tLHam2o++qitpguFiYCKbn0w9jyqw=
github.com/gabriel-vasile/mimetype v1.4.12/go.mod h1:d+9Oxyo1wTzWdyVUPMmXFvp4F9tea18J8ufA774AB3s=
github.com/go-chi/chi/v5 v5.2.3 h1:WQIt9uxdsAbgIYgid+BpYc+liqQZGMHRaUwp0JUcvdE=
github.com/go-chi/chi/v5 v5.2.3/go.mod h1:L2yAIGWB3H+phAw1NxKwWM+7eUH/lU8pOMm5hHcoops=
github.com/go-chi/cors v1.2.2 h1:Jmey33TE+b+rB7fT8MUy1u0I4L+NARQlK6LhzKPSyQE=
github.com/go-chi/cors v1.2.2/go.mod h1:sSbTewc+6wYHBBCW7ytsFSn836hqM7JxpglAy2Vzc58=
github.com/go-ini/ini v1.67.0 h1:z6ZrTEZqSWOTyH2FlglNbNgARyHG8oLW9gMELqKr06A=
github.com/go-ini/ini v1.67.0/go.mod h1:ByCAeIL28uOIIG0E3PJtZPDL8WnHpFKFOtgjp+3Ies8=
github.com/go-playground/locales v0.14.1 h1:EWaQ/wswjilfKLTECiXz7Rh+3BjFhfDFKv/oXslEjJA=
github.com/go-playground/locales v0.14.1/go.mod h1:hxrqLVvrK65+Rwrd5Fc6F2O76J/NuW9t0sjnWqG1slY=
github.com/go-playground/universal-translator v0.18.1 h1:Bcnm0ZwsGyWbCzImXv+pAJnYK9S473LQFuzCbDbfSFY=
github.com/go-playground/universal-translator v0.18.1/go.mod h1:xekY+UJKNuX9WP91TpwSH2VMlDf28Uj24BCp08ZFTUY=
github.com/go-playground/validator/v10 v10.30.1 h1:f3zDSN/zOma+w6+1Wswgd9fLkdwy06ntQJp0BBvFG0w=
github.com/go-playground/validator/v10 v10.30.1/go.mod h1:oSuBIQzuJxL//3MelwSLD5hc2Tu889bF0Idm9Dg26cM=
github.com/golang-jwt/jwt/v5 v5.3.0 h1:pv4AsKCKKZuqlgs5sUmn4x8UlGa0kEVt/puTpKx9vvo=
github.com/golang-jwt/jwt/v5 v5.3.0/go.mod h1:fxCRLWMO43lRc8nhHWY6LGqRcf+1gQWArsqaEUEa5bE=
github.com/golang-migrate/migrate/v4 v4.19.1 h1:OCyb44lFuQfYXYLx1SCxPZQGU7mcaZ7gH9yH4jSFbBA=
github.com/golang-migrate/migrate/v4 v4.19.1/go.mod h1:CTcgfjxhaUtsLipnLoQRWCrjYXycRz/g5+RWDuYgPrE=
github.com/google/uuid v1.6.0 h1:NIvaJDMOsjHA8n1jAhLSgzrAzy1Hgr+hNrb57e+94F0=
github.com/google/uuid v1.6.0/go.mod h1:TIyPZe4MgqvfeYDBFedMoGGpEw/LqOeaOT+nhxU+yHo=
github.com/gosimple/slug v1.15.0 h1:wRZHsRrRcs6b0XnxMUBM6WK1U1Vg5B0R7VkIf1Xzobo=
github.com/gosimple/slug v1.15.0/go.mod h1:UiRaFH+GEilHstLUmcBgWcI42viBN7mAb818JrYOeFQ=
github.com/gosimple/unidecode v1.0.1 h1:hZzFTMMqSswvf0LBJZCZgThIZrpDHFXux9KeGmn6T/o=
github.com/gosimple/unidecode v1.0.1/go.mod h1:CP0Cr1Y1kogOtx0bJblKzsVWrqYaqfNOnHzpgWw4Awc=
github.com/joho/godotenv v1.5.1 h1:7eLL/+HRGLY0ldzfGMeQkb7vMd0as4CfYvUVzLqw0N0=
github.com/joho/godotenv v1.5.1/go.mod h1:f4LDr5Voq0i2e/R5DDNOoa2zzDfwtkZa6DnEwAbqwq4=
github.com/klauspost/compress v1.18.0 h1:c/Cqfb0r+Yi+JtIEq73FWXVkRonBlf0CRNYc8Zttxdo=
github.com/klauspost/compress v1.18.0/go.mod h1:2Pp+KzxcywXVXMr50+X0Q/Lsb43OQHYWRCY2AiWywWQ=
github.com/klauspost/cpuid/v2 v2.0.1/go.mod h1:FInQzS24/EEf25PyTYn52gqo7WaD8xa0213Md/qVLRg=
github.com/klauspost/cpuid/v2 v2.2.11 h1:0OwqZRYI2rFrjS4kvkDnqJkKHdHaRnCm68/DY4OxRzU=
github.com/klauspost/cpuid/v2 v2.2.11/go.mod h1:hqwkgyIinND0mEev00jJYCxPNVRVXFQeu1XKlok6oO0=
github.com/klauspost/crc32 v1.3.0 h1:sSmTt3gUt81RP655XGZPElI0PelVTZ6YwCRnPSupoFM=
github.com/klauspost/crc32 v1.3.0/go.mod h1:D7kQaZhnkX/Y0tstFGf8VUzv2UofNGqCjnC3zdHB0Hw=
github.com/lann/builder v0.0.0-20180802200727-47ae307949d0 h1:SOEGU9fKiNWd/HOJuq6+3iTQz8KNCLtVX6idSoTLdUw=
github.com/lann/builder v0.0.0-20180802200727-47ae307949d0/go.mod h1:dXGbAdH5GtBTC4WfIxhKZfyBF/HBFgRZSWwZ9g/He9o=
github.com/lann/ps v0.0.0-20150810152359-62de8c46ede0 h1:P6pPBnrTSX3DEVR4fDembhRWSsG5rVo6hYhAB/ADZrk=
github.com/lann/ps v0.0.0-20150810152359-62de8c46ede0/go.mod h1:vmVJ0l/dxyfGW6FmdpVm2joNMFikkuWg0EoCKLGUMNw=
github.com/leodido/go-urn v1.4.0 h1:WT9HwE9SGECu3lg4d/dIA+jxlljEa1/ffXKmRjqdmIQ=
github.com/leodido/go-urn v1.4.0/go.mod h1:bvxc+MVxLKB4z00jd1z+Dvzr47oO32F/QSNjSBOlFxI=
github.com/lib/pq v1.10.9 h1:YXG7RB+JIjhP29X+OtkiDnYaXQwpS4JEWq7dtCCRUEw=
github.com/lib/pq v1.10.9/go.mod h1:AlVN5x4E4T544tWzH6hKfbfQvm3HdbOxrmggDNAPY9o=
github.com/minio/crc64nvme v1.1.0 h1:e/tAguZ+4cw32D+IO/8GSf5UVr9y+3eJcxZI2WOO/7Q=
github.com/minio/crc64nvme v1.1.0/go.mod h1:eVfm2fAzLlxMdUGc0EEBGSMmPwmXD5XiNRpnu9J3bvg=
github.com/minio/md5-simd v1.1.2 h1:Gdi1DZK69+ZVMoNHRXJyNcxrMA4dSxoYHZSQbirFg34=
github.com/minio/md5-simd v1.1.2/go.mod h1:MzdKDxYpY2BT9XQFocsiZf/NKVtR7nkE4RoEpN+20RM=
github.com/minio/minio-go/v7 v7.0.97 h1:lqhREPyfgHTB/ciX8k2r8k0D93WaFqxbJX36UZq5occ=
github.com/minio/minio-go/v7 v7.0.97/go.mod h1:re5VXuo0pwEtoNLsNuSr0RrLfT/MBtohwdaSmPPSRSk=
github.com/philhofer/fwd v1.2.0 h1:e6DnBTl7vGY+Gz322/ASL4Gyp1FspeMvx1RNDoToZuM=
github.com/philhofer/fwd v1.2.0/go.mod h1:RqIHx9QI14HlwKwm98g9Re5prTQ6LdeRQn+gXJFxsJM=
github.com/pmezard/go-difflib v1.0.0/go.mod h1:iKH77koFhYxTK1pcRnkKkqfTogsbg7gZNVY4sRDYZ/4=
github.com/rs/xid v1.6.0 h1:fV591PaemRlL6JfRxGDEPl69wICngIQ3shQtzfy2gxU=
github.com/rs/xid v1.6.0/go.mod h1:7XoLgs4eV+QndskICGsho+ADou8ySMSjJKDIan90Nz0=
github.com/shopspring/decimal v1.4.0 h1:bxl37RwXBklmTi0C79JfXCEBD1cqqHt0bbgBAGFp81k=
github.com/shopspring/decimal v1.4.0/go.mod h1:gawqmDU56v4yIKSwfBSFip1HdCCXN8/+DMd9qYNcwME=
github.com/stretchr/testify v1.2.2/go.mod h1:a8OnRcib4nhh0OaRAV+Yts87kKdq0PP7pXfy6kDkUVs=
github.com/tinylib/msgp v1.3.0 h1:ULuf7GPooDaIlbyvgAxBV/FI7ynli6LZ1/nVUNu+0ww=
github.com/tinylib/msgp v1.3.0/go.mod h1:ykjzy2wzgrlvpDCRc4LA8UXy6D8bzMSuAF3WD57Gok0=
go.uber.org/multierr v1.10.0 h1:S0h4aNzvfcFsC3dRF1jLoaov7oRaKqRGC/pUEJ2yvPQ=
go.uber.org/multierr v1.10.0/go.mod h1:20+QtiLqy0Nd6FdQB9TLXag12DsQkrbs3htMFfDN80Y=
go.uber.org/zap v1.27.1 h1:08RqriUEv8+ArZRYSTXy1LeBScaMpVSTBhCeaZYfMYc=
go.uber.org/zap v1.27.1/go.mod h1:GB2qFLM7cTU87MWRP2mPIjqfIDnGu+VIO4V/SdhGo2E=
golang.org/x/crypto v0.46.0 h1:cKRW/pmt1pKAfetfu+RCEvjvZkA9RimPbh7bhFjGVBU=
golang.org/x/crypto v0.46.0/go.mod h1:Evb/oLKmMraqjZ2iQTwDwvCtJkczlDuTmdJXoZVzqU0=
golang.org/x/net v0.47.0 h1:Mx+4dIFzqraBXUugkia1OOvlD6LemFo1ALMHjrXDOhY=
golang.org/x/net v0.47.0/go.mod h1:/jNxtkgq5yWUGYkaZGqo27cfGZ1c5Nen03aYrrKpVRU=
golang.org/x/sys v0.39.0 h1:CvCKL8MeisomCi6qNZ+wbb0DN9E5AATixKsvNtMoMFk=
golang.org/x/sys v0.39.0/go.mod h1:OgkHotnGiDImocRcuBABYBEXf8A9a87e/uXjp9XT3ks=
golang.org/x/text v0.32.0 h1:ZD01bjUt1FQ9WJ0ClOL5vxgxOI/sVCNgX1YtKwcY0mU=
golang.org/x/text v0.32.0/go.mod h1:o/rUWzghvpD5TXrTIBuJU77MTaN0ljMWE47kxGJQ7jY=
golang.org/x/time v0.14.0 h1:MRx4UaLrDotUKUdCIqzPC48t1Y9hANFKIRpNx+Te8PI=
golang.org/x/time v0.14.0/go.mod h1:eL/Oa2bBBK0TkX57Fyni+NgnyQQN4LitPmob2Hjnqw4=
gopkg.in/check.v1 v0.0.0-20161208181325-20d25e280405/go.mod h1:Co6ibVJAznAaIkqp8huTwlJQCZ016jof/cbN4VW5Yz0=
gopkg.in/yaml.v3 v3.0.1 h1:fxVm/GzAzEWqLHuvctI91KS9hhNmmWOoWu0XTYJS7CA=
gopkg.in/yaml.v3 v3.0.1/go.mod h1:K4uyk7z7BCEPqu6E+C64Yfv1cQ7kz7rIZviUmN+EgEM=
```

---

### `.\internal\config\config.go`

```go
﻿package config

import (
    "fmt"
    "os"
    "strconv"
    "time"

    "github.com/joho/godotenv"
)

type Config struct {
    Database  DatabaseConfig
    Storage   StorageConfig
    Auth      AuthConfig
    App       AppConfig
    SMTP      SMTPConfig
}

type DatabaseConfig struct {
    Host            string
    Port            int
    User            string
    Password        string
    Name            string
    SSLMode         string
    MaxOpenConns    int
    MaxIdleConns    int
    ConnMaxLifetime time.Duration
}

type StorageConfig struct {
    Type          string
    Endpoint      string
    AccessKey     string
    SecretKey     string
    BucketName    string
    Region        string
    UseSSL        bool
    PublicURL     string
}

type AuthConfig struct {
    JWTSecret              string
    AccessTokenDuration    time.Duration
    RefreshTokenDuration   time.Duration
    PasswordPepper         string
    CSRFSecret            string
    CookieSecure          bool
    CookieDomain          string
    BcryptCost            int
}

type AppConfig struct {
    Env                        string
    Host                       string
    Port                       int
    FrontendURL               string
    PublicLinkBaseURL         string
    AllowedOrigins            []string
    RateLimitAuthRPM          int
    RateLimitPublicRPM        int
    RateLimitAuthenticatedRPM int
    LogLevel                  string
    LogFormat                 string
    MigrationsPath            string
    AutoMigrate               bool
}

type SMTPConfig struct {
    Host     string
    Port     int
    User     string
    Password string
    From     string
}

func Load() (*Config, error) {
    // Carregar .env se existir
    _ = godotenv.Load()

    cfg := &Config{
        Database: DatabaseConfig{
            Host:            getEnv("DB_HOST", "localhost"),
            Port:            getEnvAsInt("DB_PORT", 5432),
            User:            getEnv("DB_USER", "cava_user"),
            Password:        getEnv("DB_PASSWORD", ""),
            Name:            getEnv("DB_NAME", "cava_db"),
            SSLMode:         getEnv("DB_SSL_MODE", "disable"),
            MaxOpenConns:    getEnvAsInt("DB_MAX_OPEN_CONNS", 25),
            MaxIdleConns:    getEnvAsInt("DB_MAX_IDLE_CONNS", 5),
            ConnMaxLifetime: getEnvAsDuration("DB_CONN_MAX_LIFETIME", 5*time.Minute),
        },
        Storage: StorageConfig{
            Type:       getEnv("STORAGE_TYPE", "minio"),
            Endpoint:   getEnv("STORAGE_ENDPOINT", "http://localhost:9000"),
            AccessKey:  getEnv("STORAGE_ACCESS_KEY", ""),
            SecretKey:  getEnv("STORAGE_SECRET_KEY", ""),
            BucketName: getEnv("STORAGE_BUCKET_NAME", "cava-media"),
            Region:     getEnv("STORAGE_REGION", "us-east-1"),
            UseSSL:     getEnvAsBool("STORAGE_USE_SSL", false),
            PublicURL:  getEnv("STORAGE_PUBLIC_URL", ""),
        },
        Auth: AuthConfig{
            JWTSecret:            getEnv("JWT_SECRET", ""),
            AccessTokenDuration:  getEnvAsDuration("JWT_ACCESS_TOKEN_DURATION", 15*time.Minute),
            RefreshTokenDuration: getEnvAsDuration("JWT_REFRESH_TOKEN_DURATION", 168*time.Hour),
            PasswordPepper:       getEnv("PASSWORD_PEPPER", ""),
            CSRFSecret:          getEnv("CSRF_SECRET", ""),
            CookieSecure:        getEnvAsBool("COOKIE_SECURE", false),
            CookieDomain:        getEnv("COOKIE_DOMAIN", "localhost"),
            BcryptCost:          getEnvAsInt("BCRYPT_COST", 12),
        },
        App: AppConfig{
            Env:                        getEnv("APP_ENV", "development"),
            Host:                       getEnv("APP_HOST", "0.0.0.0"),
            Port:                       getEnvAsInt("APP_PORT", 3001),
            FrontendURL:               getEnv("FRONTEND_URL", "http://localhost:3000"),
            PublicLinkBaseURL:         getEnv("PUBLIC_LINK_BASE_URL", "http://localhost:3000"),
            AllowedOrigins:            getEnvAsSlice("ALLOWED_ORIGINS", []string{"http://localhost:3000"}),
            RateLimitAuthRPM:          getEnvAsInt("RATE_LIMIT_AUTH_RPM", 5),
            RateLimitPublicRPM:        getEnvAsInt("RATE_LIMIT_PUBLIC_RPM", 30),
            RateLimitAuthenticatedRPM: getEnvAsInt("RATE_LIMIT_AUTHENTICATED_RPM", 100),
            LogLevel:                  getEnv("LOG_LEVEL", "info"),
            LogFormat:                 getEnv("LOG_FORMAT", "json"),
            MigrationsPath:            getEnv("MIGRATIONS_PATH", "file://migrations"),
            AutoMigrate:               getEnvAsBool("AUTO_MIGRATE", true),
        },
        SMTP: SMTPConfig{
            Host:     getEnv("SMTP_HOST", ""),
            Port:     getEnvAsInt("SMTP_PORT", 587),
            User:     getEnv("SMTP_USER", ""),
            Password: getEnv("SMTP_PASSWORD", ""),
            From:     getEnv("EMAIL_FROM", ""),
        },
    }

    if err := cfg.Validate(); err != nil {
        return nil, err
    }

    return cfg, nil
}

func (c *Config) Validate() error {
    if c.Database.Password == "" {
        return fmt.Errorf("DB_PASSWORD é obrigatório")
    }
    if c.Auth.JWTSecret == "" {
        return fmt.Errorf("JWT_SECRET é obrigatório")
    }
    if c.Auth.PasswordPepper == "" {
        return fmt.Errorf("PASSWORD_PEPPER é obrigatório")
    }
    if c.Storage.AccessKey == "" {
        return fmt.Errorf("STORAGE_ACCESS_KEY é obrigatório")
    }
    if c.Storage.SecretKey == "" {
        return fmt.Errorf("STORAGE_SECRET_KEY é obrigatório")
    }
    return nil
}

// Helpers para parsing de env vars
func getEnv(key, defaultValue string) string {
    if value := os.Getenv(key); value != "" {
        return value
    }
    return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
    if value := os.Getenv(key); value != "" {
        if intVal, err := strconv.Atoi(value); err == nil {
            return intVal
        }
    }
    return defaultValue
}

func getEnvAsBool(key string, defaultValue bool) bool {
    if value := os.Getenv(key); value != "" {
        if boolVal, err := strconv.ParseBool(value); err == nil {
            return boolVal
        }
    }
    return defaultValue
}

func getEnvAsDuration(key string, defaultValue time.Duration) time.Duration {
    if value := os.Getenv(key); value != "" {
        if duration, err := time.ParseDuration(value); err == nil {
            return duration
        }
    }
    return defaultValue
}

func getEnvAsSlice(key string, defaultValue []string) []string {
    if value := os.Getenv(key); value != "" {
        return strings.Split(value, ",")
    }
    return defaultValue
}
```

---

### `.\internal\domain\errors\errors.go`

```go
﻿package errors

import "fmt"

type AppError struct {
    Code    string
    Message string
    Details map[string]interface{}
    Err     error
}

func (e *AppError) Error() string {
    if e.Err != nil {
        return fmt.Sprintf("%s: %v", e.Message, e.Err)
    }
    return e.Message
}

func NewNotFoundError(message string) *AppError {
    return &AppError{
        Code:    "NOT_FOUND",
        Message: message,
    }
}

func NewValidationError(message string, details map[string]interface{}) *AppError {
    return &AppError{
        Code:    "VALIDATION_ERROR",
        Message: message,
        Details: details,
    }
}

func NewConflictError(message string) *AppError {
    return &AppError{
        Code:    "CONFLICT",
        Message: message,
    }
}

func NewUnauthorizedError(message string) *AppError {
    return &AppError{
        Code:    "UNAUTHORIZED",
        Message: message,
    }
}

func NewForbiddenError(message string) *AppError {
    return &AppError{
        Code:    "FORBIDDEN",
        Message: message,
    }
}

func NewInternalError(message string, err error) *AppError {
    return &AppError{
        Code:    "INTERNAL_ERROR",
        Message: message,
        Err:     err,
    }
}

func NewBatchNotAvailableError() *AppError {
    return &AppError{
        Code:    "BATCH_NOT_AVAILABLE",
        Message: "Lote não disponível para reserva",
    }
}
```

---


# 📌 Resumo Final

## ✅ Arquivos com conteúdo
- .\cmd\api\main.go
- .\docker-compose.yml
- .\Dockerfile
- .\go.mod
- .\go.sum
- .\internal\config\config.go
- .\internal\domain\errors\errors.go

## ⚠️ Arquivos sem conteúdo
- .\internal\domain\entity\batch.go
- .\internal\domain\entity\dashboard.go
- .\internal\domain\entity\industry.go
- .\internal\domain\entity\lead.go
- .\internal\domain\entity\media.go
- .\internal\domain\entity\product.go
- .\internal\domain\entity\reservation.go
- .\internal\domain\entity\sale.go
- .\internal\domain\entity\sales_link.go
- .\internal\domain\entity\shared_inventory.go
- .\internal\domain\entity\user.go
- .\internal\domain\repository\batch_repository.go
- .\internal\domain\repository\industry_repository.go
- .\internal\domain\repository\lead_interaction_repository.go
- .\internal\domain\repository\lead_repository.go
- .\internal\domain\repository\media_repository.go
- .\internal\domain\repository\product_repository.go
- .\internal\domain\repository\reservation_repository.go
- .\internal\domain\repository\sales_history_repository.go
- .\internal\domain\repository\sales_link_repository.go
- .\internal\domain\repository\shared_inventory_repository.go
- .\internal\domain\repository\user_repository.go
- .\internal\domain\service\auth_service.go
- .\internal\domain\service\batch_service.go
- .\internal\domain\service\dashboard_service.go
- .\internal\domain\service\lead_service.go
- .\internal\domain\service\product_service.go
- .\internal\domain\service\reservation_service.go
- .\internal\domain\service\sales_history_service.go
- .\internal\domain\service\sales_link_service.go
- .\internal\domain\service\shared_inventory_service.go
- .\internal\domain\service\storage_service.go
- .\internal\domain\service\user_service.go
- .\internal\handler\auth_handler.go
- .\internal\handler\batch_handler.go
- .\internal\handler\dashboard_handler.go
- .\internal\handler\lead_handler.go
- .\internal\handler\product_handler.go
- .\internal\handler\public_handler.go
- .\internal\handler\reservation_handler.go
- .\internal\handler\routes.go
- .\internal\handler\sales_history_handler.go
- .\internal\handler\sales_link_handler.go
- .\internal\handler\shared_inventory_handler.go
- .\internal\handler\upload_handler.go
- .\internal\handler\user_handler.go
- .\internal\middleware\auth.go
- .\internal\middleware\cors.go
- .\internal\middleware\csrf.go
- .\internal\middleware\logger.go
- .\internal\middleware\rate_limit.go
- .\internal\middleware\rbac.go
- .\internal\middleware\recovery.go
- .\internal\middleware\request_id.go
- .\internal\repository\batch_repository.go
- .\internal\repository\db.go
- .\internal\repository\industry_repository.go
- .\internal\repository\lead_interaction_repository.go
- .\internal\repository\lead_repository.go
- .\internal\repository\media_repository.go
- .\internal\repository\product_repository.go
- .\internal\repository\reservation_repository.go
- .\internal\repository\sales_history_repository.go
- .\internal\repository\sales_link_repository.go
- .\internal\repository\shared_inventory_repository.go
- .\internal\repository\user_repository.go
- .\internal\service\auth_service.go
- .\internal\service\batch_service.go
- .\internal\service\dashboard_service.go
- .\internal\service\lead_service.go
- .\internal\service\product_service.go
- .\internal\service\reservation_service.go
- .\internal\service\sales_history_service.go
- .\internal\service\sales_link_service.go
- .\internal\service\shared_inventory_service.go
- .\internal\service\storage_service.go
- .\internal\service\user_service.go
- .\internal\storage\s3_adapter.go
- .\migrations\000001_create_extensions.down.sql
- .\migrations\000001_create_extensions.up.sql
- .\migrations\000002_create_enums.down.sql
- .\migrations\000002_create_enums.up.sql
- .\migrations\000003_create_core_tables.down.sql
- .\migrations\000003_create_core_tables.up.sql
- .\migrations\000004_create_product_tables.down.sql
- .\migrations\000004_create_product_tables.up.sql
- .\migrations\000005_create_batch_tables.down.sql
- .\migrations\000005_create_batch_tables.up.sql
- .\migrations\000006_create_sharing_tables.down.sql
- .\migrations\000006_create_sharing_tables.up.sql
- .\migrations\000007_create_sales_tables.down.sql
- .\migrations\000007_create_sales_tables.up.sql
- .\migrations\000008_create_lead_tables.down.sql
- .\migrations\000008_create_lead_tables.up.sql
- .\migrations\000009_create_operational_tables.down.sql
- .\migrations\000009_create_operational_tables.up.sql
- .\migrations\000010_create_indexes.down.sql
- .\migrations\000010_create_indexes.up.sql
- .\migrations\000011_seed_data.down.sql
- .\migrations\000011_seed_data.up.sql
- .\pkg\jwt\token.go
- .\pkg\pagination\pagination.go
- .\pkg\password\argon2.go
- .\pkg\response\json.go
- .\pkg\utils\slug.go
- .\pkg\utils\uuid.go
- .\pkg\validator\validator.go
