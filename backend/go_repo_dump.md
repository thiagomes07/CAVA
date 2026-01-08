# 📁 Dump Completo do Projeto Go

## 📄 Arquivos analisados

### `.\cmd\api\main.go`

```go
﻿
```

---

### `.\docker-compose.yml`

```go
version: '3.9'

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
      start_period: 10s

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
      test: ["CMD", "mc", "ready", "local"]
      interval: 30s
      timeout: 20s
      retries: 3
      start_period: 20s

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
      echo 'Aguardando MinIO estar pronto...';
      sleep 5;
      mc alias set minio http://minio:9000 minio_access_key minio_secret_key;
      mc mb --ignore-existing minio/cava-media;
      mc anonymous set download minio/cava-media;
      echo 'Bucket cava-media criado e configurado com sucesso!';
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
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3001/health"]
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
	"strings"
	"time"

	"github.com/joho/godotenv"
)

// Config contém todas as configurações da aplicação
type Config struct {
	App      AppConfig
	Database DatabaseConfig
	Storage  StorageConfig
	Auth     AuthConfig
	Server   ServerConfig
	Email    EmailConfig
}

// AppConfig contém configurações gerais da aplicação
type AppConfig struct {
	Env                string
	LogLevel           string
	LogFormat          string
	MigrationsPath     string
	AutoMigrate        bool
	PublicLinkBaseURL  string
}

// DatabaseConfig contém configurações do banco de dados
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

// StorageConfig contém configurações de storage (S3/MinIO)
type StorageConfig struct {
	Type       string // "minio" ou "s3"
	Endpoint   string
	AccessKey  string
	SecretKey  string
	BucketName string
	Region     string
	UseSSL     bool
	PublicURL  string
}

// AuthConfig contém configurações de autenticação
type AuthConfig struct {
	JWTSecret              string
	JWTAccessTokenDuration time.Duration
	JWTRefreshTokenDuration time.Duration
	PasswordPepper         string
	CSRFSecret             string
	CookieSecure           bool
	CookieDomain           string
	BcryptCost             int
}

// ServerConfig contém configurações do servidor HTTP
type ServerConfig struct {
	Host                    string
	Port                    int
	FrontendURL             string
	AllowedOrigins          []string
	RateLimitAuthRPM        int
	RateLimitPublicRPM      int
	RateLimitAuthenticatedRPM int
}

// EmailConfig contém configurações de email (opcional para MVP)
type EmailConfig struct {
	SMTPHost     string
	SMTPPort     int
	SMTPUser     string
	SMTPPassword string
	EmailFrom    string
}

// Load carrega as configurações das variáveis de ambiente
func Load() (*Config, error) {
	// Tentar carregar .env (ignorar erro se não existir em produção)
	_ = godotenv.Load()

	cfg := &Config{
		App:      loadAppConfig(),
		Database: loadDatabaseConfig(),
		Storage:  loadStorageConfig(),
		Auth:     loadAuthConfig(),
		Server:   loadServerConfig(),
		Email:    loadEmailConfig(),
	}

	// Validar configurações obrigatórias
	if err := cfg.Validate(); err != nil {
		return nil, fmt.Errorf("configuração inválida: %w", err)
	}

	return cfg, nil
}

// Validate valida as configurações obrigatórias
func (c *Config) Validate() error {
	// Database
	if c.Database.Host == "" {
		return fmt.Errorf("DB_HOST é obrigatório")
	}
	if c.Database.User == "" {
		return fmt.Errorf("DB_USER é obrigatório")
	}
	if c.Database.Password == "" {
		return fmt.Errorf("DB_PASSWORD é obrigatório")
	}
	if c.Database.Name == "" {
		return fmt.Errorf("DB_NAME é obrigatório")
	}

	// Storage
	if c.Storage.Type == "" {
		return fmt.Errorf("STORAGE_TYPE é obrigatório")
	}
	if c.Storage.AccessKey == "" {
		return fmt.Errorf("STORAGE_ACCESS_KEY é obrigatório")
	}
	if c.Storage.SecretKey == "" {
		return fmt.Errorf("STORAGE_SECRET_KEY é obrigatório")
	}
	if c.Storage.BucketName == "" {
		return fmt.Errorf("STORAGE_BUCKET_NAME é obrigatório")
	}

	// Auth
	if c.Auth.JWTSecret == "" {
		return fmt.Errorf("JWT_SECRET é obrigatório")
	}
	if len(c.Auth.JWTSecret) < 32 {
		return fmt.Errorf("JWT_SECRET deve ter pelo menos 32 caracteres")
	}

	// Server
	if c.Server.FrontendURL == "" {
		return fmt.Errorf("FRONTEND_URL é obrigatório")
	}

	return nil
}

// GetDSN retorna a string de conexão do PostgreSQL
func (c *Config) GetDSN() string {
	return fmt.Sprintf(
		"host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		c.Database.Host,
		c.Database.Port,
		c.Database.User,
		c.Database.Password,
		c.Database.Name,
		c.Database.SSLMode,
	)
}

// IsDevelopment verifica se está em ambiente de desenvolvimento
func (c *Config) IsDevelopment() bool {
	return c.App.Env == "development"
}

// IsProduction verifica se está em ambiente de produção
func (c *Config) IsProduction() bool {
	return c.App.Env == "production"
}

// loadAppConfig carrega configurações da aplicação
func loadAppConfig() AppConfig {
	return AppConfig{
		Env:               getEnv("APP_ENV", "development"),
		LogLevel:          getEnv("LOG_LEVEL", "info"),
		LogFormat:         getEnv("LOG_FORMAT", "text"),
		MigrationsPath:    getEnv("MIGRATIONS_PATH", "file://migrations"),
		AutoMigrate:       getEnvAsBool("AUTO_MIGRATE", true),
		PublicLinkBaseURL: getEnv("PUBLIC_LINK_BASE_URL", "http://localhost:3000"),
	}
}

// loadDatabaseConfig carrega configurações do banco de dados
func loadDatabaseConfig() DatabaseConfig {
	return DatabaseConfig{
		Host:            getEnv("DB_HOST", "postgres"),
		Port:            getEnvAsInt("DB_PORT", 5432),
		User:            getEnv("DB_USER", "cava_user"),
		Password:        getEnv("DB_PASSWORD", ""),
		Name:            getEnv("DB_NAME", "cava_db"),
		SSLMode:         getEnv("DB_SSL_MODE", "disable"),
		MaxOpenConns:    getEnvAsInt("DB_MAX_OPEN_CONNS", 25),
		MaxIdleConns:    getEnvAsInt("DB_MAX_IDLE_CONNS", 5),
		ConnMaxLifetime: getEnvAsDuration("DB_CONN_MAX_LIFETIME", 5*time.Minute),
	}
}

// loadStorageConfig carrega configurações de storage
func loadStorageConfig() StorageConfig {
	return StorageConfig{
		Type:       getEnv("STORAGE_TYPE", "minio"),
		Endpoint:   getEnv("STORAGE_ENDPOINT", "http://minio:9000"),
		AccessKey:  getEnv("STORAGE_ACCESS_KEY", ""),
		SecretKey:  getEnv("STORAGE_SECRET_KEY", ""),
		BucketName: getEnv("STORAGE_BUCKET_NAME", "cava-media"),
		Region:     getEnv("STORAGE_REGION", "us-east-1"),
		UseSSL:     getEnvAsBool("STORAGE_USE_SSL", false),
		PublicURL:  getEnv("STORAGE_PUBLIC_URL", "http://localhost:9000/cava-media"),
	}
}

// loadAuthConfig carrega configurações de autenticação
func loadAuthConfig() AuthConfig {
	return AuthConfig{
		JWTSecret:              getEnv("JWT_SECRET", ""),
		JWTAccessTokenDuration: getEnvAsDuration("JWT_ACCESS_TOKEN_DURATION", 15*time.Minute),
		JWTRefreshTokenDuration: getEnvAsDuration("JWT_REFRESH_TOKEN_DURATION", 168*time.Hour), // 7 dias
		PasswordPepper:         getEnv("PASSWORD_PEPPER", ""),
		CSRFSecret:             getEnv("CSRF_SECRET", ""),
		CookieSecure:           getEnvAsBool("COOKIE_SECURE", false),
		CookieDomain:           getEnv("COOKIE_DOMAIN", "localhost"),
		BcryptCost:             getEnvAsInt("BCRYPT_COST", 12),
	}
}

// loadServerConfig carrega configurações do servidor
func loadServerConfig() ServerConfig {
	allowedOrigins := strings.Split(
		getEnv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001"),
		",",
	)

	return ServerConfig{
		Host:                      getEnv("APP_HOST", "0.0.0.0"),
		Port:                      getEnvAsInt("APP_PORT", 3001),
		FrontendURL:               getEnv("FRONTEND_URL", "http://localhost:3000"),
		AllowedOrigins:            allowedOrigins,
		RateLimitAuthRPM:          getEnvAsInt("RATE_LIMIT_AUTH_RPM", 5),
		RateLimitPublicRPM:        getEnvAsInt("RATE_LIMIT_PUBLIC_RPM", 30),
		RateLimitAuthenticatedRPM: getEnvAsInt("RATE_LIMIT_AUTHENTICATED_RPM", 100),
	}
}

// loadEmailConfig carrega configurações de email
func loadEmailConfig() EmailConfig {
	return EmailConfig{
		SMTPHost:     getEnv("SMTP_HOST", ""),
		SMTPPort:     getEnvAsInt("SMTP_PORT", 587),
		SMTPUser:     getEnv("SMTP_USER", ""),
		SMTPPassword: getEnv("SMTP_PASSWORD", ""),
		EmailFrom:    getEnv("EMAIL_FROM", "noreply@cava.com.br"),
	}
}

// Helper functions

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	valueStr := getEnv(key, "")
	if valueStr == "" {
		return defaultValue
	}
	value, err := strconv.Atoi(valueStr)
	if err != nil {
		return defaultValue
	}
	return value
}

func getEnvAsBool(key string, defaultValue bool) bool {
	valueStr := getEnv(key, "")
	if valueStr == "" {
		return defaultValue
	}
	value, err := strconv.ParseBool(valueStr)
	if err != nil {
		return defaultValue
	}
	return value
}

func getEnvAsDuration(key string, defaultValue time.Duration) time.Duration {
	valueStr := getEnv(key, "")
	if valueStr == "" {
		return defaultValue
	}
	value, err := time.ParseDuration(valueStr)
	if err != nil {
		return defaultValue
	}
	return value
}
```

---

### `.\internal\domain\entity\batch.go`

```go
package entity

import (
	"fmt"
	"regexp"
	"strings"
	"time"
)

// BatchStatus representa o status de um lote
type BatchStatus string

const (
	BatchStatusDisponivel BatchStatus = "DISPONIVEL"
	BatchStatusReservado  BatchStatus = "RESERVADO"
	BatchStatusVendido    BatchStatus = "VENDIDO"
	BatchStatusInativo    BatchStatus = "INATIVO"
)

// IsValid verifica se o status do lote é válido
func (b BatchStatus) IsValid() bool {
	switch b {
	case BatchStatusDisponivel, BatchStatusReservado, BatchStatusVendido, BatchStatusInativo:
		return true
	}
	return false
}

// BatchCode representa o código de um lote (AAA-999999)
type BatchCode string

var batchCodeRegex = regexp.MustCompile(`^[A-Z]{3}-\d{6}$`)

// NewBatchCode cria e valida um BatchCode
func NewBatchCode(code string) (BatchCode, error) {
	// Converter para uppercase
	code = strings.ToUpper(strings.TrimSpace(code))
	
	// Validar formato
	if !batchCodeRegex.MatchString(code) {
		return "", fmt.Errorf("código de lote inválido. Formato esperado: AAA-999999")
	}
	
	return BatchCode(code), nil
}

// String retorna a representação em string do BatchCode
func (b BatchCode) String() string {
	return string(b)
}

// Batch representa um lote físico de estoque
type Batch struct {
	ID            string       `json:"id"`
	ProductID     string       `json:"productId"`
	IndustryID    string       `json:"industryId"`
	BatchCode     string       `json:"batchCode"`
	Height        float64      `json:"height"`        // cm
	Width         float64      `json:"width"`         // cm
	Thickness     float64      `json:"thickness"`     // cm
	QuantitySlabs int          `json:"quantitySlabs"` // quantidade de chapas
	TotalArea     float64      `json:"totalArea"`     // m² (calculado)
	IndustryPrice float64      `json:"industryPrice"` // preço base da indústria
	OriginQuarry  *string      `json:"originQuarry,omitempty"`
	EntryDate     time.Time    `json:"entryDate"`
	Status        BatchStatus  `json:"status"`
	IsActive      bool         `json:"isActive"`
	Medias        []Media      `json:"medias,omitempty"`
	Product       *Product     `json:"product,omitempty"` // Populated quando necessário
	CreatedAt     time.Time    `json:"createdAt"`
	UpdatedAt     time.Time    `json:"updatedAt"`
}

// CalculateTotalArea calcula a área total do lote
func (b *Batch) CalculateTotalArea() {
	// Fórmula: (altura * largura * quantidade) / 10000
	// Resultado em m²
	b.TotalArea = (b.Height * b.Width * float64(b.QuantitySlabs)) / 10000
}

// IsAvailable verifica se o lote está disponível
func (b *Batch) IsAvailable() bool {
	return b.Status == BatchStatusDisponivel && b.IsActive
}

// CreateBatchInput representa os dados para criar um lote
type CreateBatchInput struct {
	ProductID     string  `json:"productId" validate:"required,uuid"`
	BatchCode     string  `json:"batchCode" validate:"required,min=10,max=10"` // AAA-999999
	Height        float64 `json:"height" validate:"required,gt=0,lte=1000"`
	Width         float64 `json:"width" validate:"required,gt=0,lte=1000"`
	Thickness     float64 `json:"thickness" validate:"required,gt=0,lte=100"`
	QuantitySlabs int     `json:"quantitySlabs" validate:"required,gt=0"`
	IndustryPrice float64 `json:"industryPrice" validate:"required,gt=0"`
	OriginQuarry  *string `json:"originQuarry,omitempty" validate:"omitempty,max=100"`
	EntryDate     string  `json:"entryDate" validate:"required"` // ISO date
}

// UpdateBatchInput representa os dados para atualizar um lote
type UpdateBatchInput struct {
	BatchCode     *string  `json:"batchCode,omitempty" validate:"omitempty,min=10,max=10"`
	Height        *float64 `json:"height,omitempty" validate:"omitempty,gt=0,lte=1000"`
	Width         *float64 `json:"width,omitempty" validate:"omitempty,gt=0,lte=1000"`
	Thickness     *float64 `json:"thickness,omitempty" validate:"omitempty,gt=0,lte=100"`
	QuantitySlabs *int     `json:"quantitySlabs,omitempty" validate:"omitempty,gt=0"`
	IndustryPrice *float64 `json:"industryPrice,omitempty" validate:"omitempty,gt=0"`
	OriginQuarry  *string  `json:"originQuarry,omitempty" validate:"omitempty,max=100"`
}

// UpdateBatchStatusInput representa os dados para atualizar o status de um lote
type UpdateBatchStatusInput struct {
	Status BatchStatus `json:"status" validate:"required,oneof=DISPONIVEL RESERVADO VENDIDO INATIVO"`
}

// BatchFilters representa os filtros para busca de lotes
type BatchFilters struct {
	ProductID *string      `json:"productId,omitempty"`
	Status    *BatchStatus `json:"status,omitempty"`
	Code      *string      `json:"code,omitempty"` // Busca parcial
	Page      int          `json:"page" validate:"min=1"`
	Limit     int          `json:"limit" validate:"min=1,max=100"`
}

// BatchListResponse representa a resposta de listagem de lotes
type BatchListResponse struct {
	Batches []Batch `json:"batches"`
	Total   int     `json:"total"`
	Page    int     `json:"page"`
}
```

---

### `.\internal\domain\entity\dashboard.go`

```go
package entity

import (
	"time"
)

// IndustryMetrics representa as métricas do dashboard da indústria
type IndustryMetrics struct {
	AvailableBatches int     `json:"availableBatches"`
	MonthlySales     float64 `json:"monthlySales"`
	ReservedBatches  int     `json:"reservedBatches"`
	ActiveLinks      *int    `json:"activeLinks,omitempty"`
	LeadsCount       *int    `json:"leadsCount,omitempty"`
}

// BrokerMetrics representa as métricas do dashboard do broker
type BrokerMetrics struct {
	AvailableBatches  int     `json:"availableBatches"`
	MonthlySales      float64 `json:"monthlySales"`
	ActiveLinks       int     `json:"activeLinks"`
	MonthlyCommission float64 `json:"monthlyCommission"`
}

// ActivityAction representa os tipos de ação em atividades
type ActivityAction string

const (
	ActivityActionReservado     ActivityAction = "RESERVADO"
	ActivityActionVendido       ActivityAction = "VENDIDO"
	ActivityActionCompartilhado ActivityAction = "COMPARTILHADO"
	ActivityActionCriado        ActivityAction = "CRIADO"
)

// Activity representa uma atividade recente
type Activity struct {
	ID          string         `json:"id"`
	BatchCode   string         `json:"batchCode"`
	ProductName string         `json:"productName"`
	SellerName  string         `json:"sellerName"`
	Action      ActivityAction `json:"action"`
	Date        time.Time      `json:"date"`
}
```

---

### `.\internal\domain\entity\industry.go`

```go
package entity

import (
	"time"
)

// Industry representa uma indústria no sistema
type Industry struct {
	ID           string    `json:"id"`
	Name         string    `json:"name"`
	CNPJ         string    `json:"cnpj"`
	Slug         string    `json:"slug"`
	ContactEmail string    `json:"contactEmail"`
	ContactPhone *string   `json:"contactPhone,omitempty"`
	PolicyTerms  *string   `json:"policyTerms,omitempty"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

// CreateIndustryInput representa os dados para criar uma indústria
type CreateIndustryInput struct {
	Name         string  `json:"name" validate:"required,min=2,max=255"`
	CNPJ         string  `json:"cnpj" validate:"required,len=14"` // Formato: apenas dígitos
	Slug         string  `json:"slug" validate:"required,min=3,max=100"`
	ContactEmail string  `json:"contactEmail" validate:"required,email"`
	ContactPhone *string `json:"contactPhone,omitempty" validate:"omitempty,min=10,max=11"`
	PolicyTerms  *string `json:"policyTerms,omitempty" validate:"omitempty,max=5000"`
}

// UpdateIndustryInput representa os dados para atualizar uma indústria
type UpdateIndustryInput struct {
	Name         *string `json:"name,omitempty" validate:"omitempty,min=2,max=255"`
	ContactEmail *string `json:"contactEmail,omitempty" validate:"omitempty,email"`
	ContactPhone *string `json:"contactPhone,omitempty" validate:"omitempty,min=10,max=11"`
	PolicyTerms  *string `json:"policyTerms,omitempty" validate:"omitempty,max=5000"`
}
```

---

### `.\internal\domain\entity\lead.go`

```go
package entity

import (
	"time"
)

// LeadStatus representa o status de um lead
type LeadStatus string

const (
	LeadStatusNovo      LeadStatus = "NOVO"
	LeadStatusContatado LeadStatus = "CONTATADO"
	LeadStatusResolvido LeadStatus = "RESOLVIDO"
)

// IsValid verifica se o status do lead é válido
func (l LeadStatus) IsValid() bool {
	switch l {
	case LeadStatusNovo, LeadStatusContatado, LeadStatusResolvido:
		return true
	}
	return false
}

// InteractionType representa os tipos de interação
type InteractionType string

const (
	InteractionInteresseLote     InteractionType = "INTERESSE_LOTE"
	InteractionInteresseCatalogo InteractionType = "INTERESSE_CATALOGO"
	InteractionDuvidaGeral       InteractionType = "DUVIDA_GERAL"
)

// Lead representa um cliente potencial
type Lead struct {
	ID              string     `json:"id"`
	SalesLinkID     string     `json:"salesLinkId"`
	Name            string     `json:"name"`
	Contact         string     `json:"contact"` // Email ou telefone
	Message         *string    `json:"message,omitempty"`
	MarketingOptIn  bool       `json:"marketingOptIn"`
	Status          LeadStatus `json:"status"`
	CreatedAt       time.Time  `json:"createdAt"`
	UpdatedAt       time.Time  `json:"updatedAt"`
	SalesLink       *SalesLink `json:"salesLink,omitempty"` // Populated quando necessário
}

// LeadInteraction representa uma interação de um lead
type LeadInteraction struct {
	ID              string          `json:"id"`
	LeadID          string          `json:"leadId"`
	SalesLinkID     string          `json:"salesLinkId"`
	TargetBatchID   *string         `json:"targetBatchId,omitempty"`
	TargetProductID *string         `json:"targetProductId,omitempty"`
	Message         *string         `json:"message,omitempty"`
	InteractionType InteractionType `json:"interactionType"`
	CreatedAt       time.Time       `json:"createdAt"`
}

// LeadSubscription representa uma inscrição de interesse do lead
type LeadSubscription struct {
	ID           string    `json:"id"`
	LeadID       string    `json:"leadId"`
	ProductID    *string   `json:"productId,omitempty"`
	LinkedUserID string    `json:"linkedUserId"` // Vendedor dono do lead
	CreatedAt    time.Time `json:"createdAt"`
}

// CreateLeadInput representa os dados para capturar um lead (público)
type CreateLeadInput struct {
	SalesLinkID    string  `json:"salesLinkId" validate:"required,uuid"`
	Name           string  `json:"name" validate:"required,min=2,max=100"`
	Contact        string  `json:"contact" validate:"required,min=10"` // Email ou telefone
	Message        *string `json:"message,omitempty" validate:"omitempty,max=500"`
	MarketingOptIn bool    `json:"marketingOptIn"`
}

// UpdateLeadStatusInput representa os dados para atualizar o status de um lead
type UpdateLeadStatusInput struct {
	Status LeadStatus `json:"status" validate:"required,oneof=NOVO CONTATADO RESOLVIDO"`
}

// LeadFilters representa os filtros para busca de leads
type LeadFilters struct {
	Search    *string     `json:"search,omitempty"` // Busca por nome ou contato
	LinkID    *string     `json:"linkId,omitempty"`
	StartDate *string     `json:"startDate,omitempty"` // ISO date
	EndDate   *string     `json:"endDate,omitempty"`   // ISO date
	OptIn     *bool       `json:"optIn,omitempty"`
	Status    *LeadStatus `json:"status,omitempty"`
	Page      int         `json:"page" validate:"min=1"`
	Limit     int         `json:"limit" validate:"min=1,max=100"`
}

// LeadListResponse representa a resposta de listagem de leads
type LeadListResponse struct {
	Leads []Lead `json:"leads"`
	Total int    `json:"total"`
	Page  int    `json:"page"`
}

// CreateLeadResponse representa a resposta de criação de lead
type CreateLeadResponse struct {
	Success bool `json:"success"`
}
```

---

### `.\internal\domain\entity\media.go`

```go
package entity

import (
	"time"
)

// MediaType representa os tipos de mídia
type MediaType string

const (
	MediaTypeImage MediaType = "IMAGE"
	MediaTypeVideo MediaType = "VIDEO"
)

// IsValid verifica se o tipo de mídia é válido
func (m MediaType) IsValid() bool {
	switch m {
	case MediaTypeImage, MediaTypeVideo:
		return true
	}
	return false
}

// Media representa uma mídia (foto/vídeo)
type Media struct {
	ID           string    `json:"id"`
	URL          string    `json:"url"`
	DisplayOrder int       `json:"displayOrder"`
	IsCover      bool      `json:"isCover"`
	CreatedAt    time.Time `json:"createdAt"`
}

// ProductMedia representa uma mídia de produto
type ProductMedia struct {
	Media
	ProductID string    `json:"productId"`
	MediaType MediaType `json:"mediaType"`
}

// BatchMedia representa uma mídia de lote
type BatchMedia struct {
	Media
	BatchID string `json:"batchId"`
}

// CreateMediaInput representa os dados para criar uma mídia
type CreateMediaInput struct {
	URL          string `json:"url" validate:"required,url"`
	DisplayOrder int    `json:"displayOrder" validate:"min=0"`
	IsCover      bool   `json:"isCover"`
}

// UploadMediaResponse representa a resposta de upload de mídias
type UploadMediaResponse struct {
	URLs []string `json:"urls"`
}
```

---

### `.\internal\domain\entity\product.go`

```go
package entity

import (
	"time"
)

// MaterialType representa os tipos de material
type MaterialType string

const (
	MaterialGranito    MaterialType = "GRANITO"
	MaterialMarmore    MaterialType = "MARMORE"
	MaterialQuartzito  MaterialType = "QUARTZITO"
	MaterialLimestone  MaterialType = "LIMESTONE"
	MaterialTravertino MaterialType = "TRAVERTINO"
	MaterialOutros     MaterialType = "OUTROS"
)

// IsValid verifica se o tipo de material é válido
func (m MaterialType) IsValid() bool {
	switch m {
	case MaterialGranito, MaterialMarmore, MaterialQuartzito,
		MaterialLimestone, MaterialTravertino, MaterialOutros:
		return true
	}
	return false
}

// FinishType representa os tipos de acabamento
type FinishType string

const (
	FinishPolido    FinishType = "POLIDO"
	FinishLevigado  FinishType = "LEVIGADO"
	FinishBruto     FinishType = "BRUTO"
	FinishApicoado  FinishType = "APICOADO"
	FinishFlameado  FinishType = "FLAMEADO"
)

// IsValid verifica se o tipo de acabamento é válido
func (f FinishType) IsValid() bool {
	switch f {
	case FinishPolido, FinishLevigado, FinishBruto, FinishApicoado, FinishFlameado:
		return true
	}
	return false
}

// Product representa um produto (tipo de pedra)
type Product struct {
	ID          string       `json:"id"`
	IndustryID  string       `json:"industryId"`
	Name        string       `json:"name"`
	SKU         *string      `json:"sku,omitempty"`
	Material    MaterialType `json:"material"`
	Finish      FinishType   `json:"finish"`
	Description *string      `json:"description,omitempty"`
	IsPublic    bool         `json:"isPublic"`
	IsActive    bool         `json:"isActive"`
	Medias      []Media      `json:"medias,omitempty"`
	BatchCount  *int         `json:"batchCount,omitempty"` // Contador de lotes associados
	CreatedAt   time.Time    `json:"createdAt"`
	UpdatedAt   time.Time    `json:"updatedAt"`
}

// CreateProductInput representa os dados para criar um produto
type CreateProductInput struct {
	Name        string       `json:"name" validate:"required,min=2,max=100"`
	SKU         *string      `json:"sku,omitempty" validate:"omitempty,max=50"`
	Material    MaterialType `json:"material" validate:"required,oneof=GRANITO MARMORE QUARTZITO LIMESTONE TRAVERTINO OUTROS"`
	Finish      FinishType   `json:"finish" validate:"required,oneof=POLIDO LEVIGADO BRUTO APICOADO FLAMEADO"`
	Description *string      `json:"description,omitempty" validate:"omitempty,max=1000"`
	IsPublic    bool         `json:"isPublic"`
}

// UpdateProductInput representa os dados para atualizar um produto
type UpdateProductInput struct {
	Name        *string       `json:"name,omitempty" validate:"omitempty,min=2,max=100"`
	SKU         *string       `json:"sku,omitempty" validate:"omitempty,max=50"`
	Material    *MaterialType `json:"material,omitempty" validate:"omitempty,oneof=GRANITO MARMORE QUARTZITO LIMESTONE TRAVERTINO OUTROS"`
	Finish      *FinishType   `json:"finish,omitempty" validate:"omitempty,oneof=POLIDO LEVIGADO BRUTO APICOADO FLAMEADO"`
	Description *string       `json:"description,omitempty" validate:"omitempty,max=1000"`
	IsPublic    *bool         `json:"isPublic,omitempty"`
}

// ProductFilters representa os filtros para busca de produtos
type ProductFilters struct {
	Search          *string       `json:"search,omitempty"`
	Material        *MaterialType `json:"material,omitempty"`
	IncludeInactive bool          `json:"includeInactive"`
	Page            int           `json:"page" validate:"min=1"`
	Limit           int           `json:"limit" validate:"min=1,max=100"`
}

// ProductListResponse representa a resposta de listagem de produtos
type ProductListResponse struct {
	Products []Product `json:"products"`
	Total    int       `json:"total"`
	Page     int       `json:"page"`
}
```

---

### `.\internal\domain\entity\reservation.go`

```go
package entity

import (
	"time"
)

// ReservationStatus representa o status de uma reserva
type ReservationStatus string

const (
	ReservationStatusAtiva           ReservationStatus = "ATIVA"
	ReservationStatusConfirmadaVenda ReservationStatus = "CONFIRMADA_VENDA"
	ReservationStatusExpirada        ReservationStatus = "EXPIRADA"
	ReservationStatusCancelada       ReservationStatus = "CANCELADA"
)

// IsValid verifica se o status da reserva é válido
func (r ReservationStatus) IsValid() bool {
	switch r {
	case ReservationStatusAtiva, ReservationStatusConfirmadaVenda,
		ReservationStatusExpirada, ReservationStatusCancelada:
		return true
	}
	return false
}

// Reservation representa uma reserva de lote
type Reservation struct {
	ID         string            `json:"id"`
	BatchID    string            `json:"batchId"`
	LeadID     *string           `json:"leadId,omitempty"`
	ReservedByUserID string      `json:"reservedByUserId"`
	Status     ReservationStatus `json:"status"`
	Notes      *string           `json:"notes,omitempty"`
	ExpiresAt  time.Time         `json:"expiresAt"`
	CreatedAt  time.Time         `json:"createdAt"`
	IsActive   bool              `json:"isActive"`
	Batch      *Batch            `json:"batch,omitempty"`      // Populated quando necessário
	Lead       *Lead             `json:"lead,omitempty"`       // Populated quando necessário
	ReservedBy *User             `json:"reservedBy,omitempty"` // Populated quando necessário
}

// IsExpired verifica se a reserva está expirada
func (r *Reservation) IsExpired() bool {
	return time.Now().After(r.ExpiresAt) && r.Status == ReservationStatusAtiva
}

// CreateReservationInput representa os dados para criar uma reserva
type CreateReservationInput struct {
	BatchID         string  `json:"batchId" validate:"required,uuid"`
	LeadID          *string `json:"leadId,omitempty" validate:"omitempty,uuid"`
	CustomerName    *string `json:"customerName,omitempty" validate:"omitempty,min=2"`
	CustomerContact *string `json:"customerContact,omitempty"`
	ExpiresAt       *string `json:"expiresAt,omitempty"` // ISO date, default +7 dias
	Notes           *string `json:"notes,omitempty" validate:"omitempty,max=500"`
}

// ConfirmSaleInput representa os dados para confirmar uma venda
type ConfirmSaleInput struct {
	FinalSoldPrice float64 `json:"finalSoldPrice" validate:"required,gt=0"`
	InvoiceURL     *string `json:"invoiceUrl,omitempty" validate:"omitempty,url"`
	Notes          *string `json:"notes,omitempty" validate:"omitempty,max=1000"`
}

// ReservationFilters representa os filtros para busca de reservas
type ReservationFilters struct {
	BatchID *string            `json:"batchId,omitempty"`
	Status  *ReservationStatus `json:"status,omitempty"`
	Page    int                `json:"page" validate:"min=1"`
	Limit   int                `json:"limit" validate:"min=1,max=100"`
}
```

---

### `.\internal\domain\entity\sale.go`

```go
package entity

import (
	"time"
)

// Sale representa um registro de venda (histórico)
type Sale struct {
	ID               string    `json:"id"`
	BatchID          string    `json:"batchId"`
	SoldByUserID     string    `json:"soldByUserId"`
	IndustryID       string    `json:"industryId"`
	LeadID           *string   `json:"leadId,omitempty"`
	CustomerName     string    `json:"customerName"`
	CustomerContact  string    `json:"customerContact"`
	SalePrice        float64   `json:"salePrice"`        // Preço final pago pelo cliente
	BrokerCommission float64   `json:"brokerCommission"` // Comissão do broker/vendedor
	NetIndustryValue float64   `json:"netIndustryValue"` // Valor líquido para indústria
	SaleDate         time.Time `json:"saleDate"`
	InvoiceURL       *string   `json:"invoiceUrl,omitempty"`
	Notes            *string   `json:"notes,omitempty"`
	CreatedAt        time.Time `json:"createdAt"`
	Batch            *Batch    `json:"batch,omitempty"`   // Populated quando necessário
	SoldBy           *User     `json:"soldBy,omitempty"`  // Populated quando necessário
	Lead             *Lead     `json:"lead,omitempty"`    // Populated quando necessário
}

// CreateSaleInput representa os dados para registrar uma venda
type CreateSaleInput struct {
	BatchID          string  `json:"batchId" validate:"required,uuid"`
	SoldByUserID     string  `json:"soldByUserId" validate:"required,uuid"`
	IndustryID       string  `json:"industryId" validate:"required,uuid"`
	LeadID           *string `json:"leadId,omitempty" validate:"omitempty,uuid"`
	CustomerName     string  `json:"customerName" validate:"required,min=2,max=255"`
	CustomerContact  string  `json:"customerContact" validate:"required,min=10"`
	SalePrice        float64 `json:"salePrice" validate:"required,gt=0"`
	BrokerCommission float64 `json:"brokerCommission" validate:"gte=0"`
	NetIndustryValue float64 `json:"netIndustryValue" validate:"required,gt=0"`
	InvoiceURL       *string `json:"invoiceUrl,omitempty" validate:"omitempty,url"`
	Notes            *string `json:"notes,omitempty" validate:"omitempty,max=1000"`
}

// SaleFilters representa os filtros para busca de vendas
type SaleFilters struct {
	StartDate *string `json:"startDate,omitempty"` // ISO date
	EndDate   *string `json:"endDate,omitempty"`   // ISO date
	SellerID  *string `json:"sellerId,omitempty"`
	Page      int     `json:"page" validate:"min=1"`
	Limit     int     `json:"limit" validate:"min=1,max=100"`
}

// SaleListResponse representa a resposta de listagem de vendas
type SaleListResponse struct {
	Sales []Sale `json:"sales"`
	Total int    `json:"total"`
	Page  int    `json:"page"`
}

// SaleSummary representa o sumário de vendas
type SaleSummary struct {
	TotalSales        float64 `json:"totalSales"`
	TotalCommissions  float64 `json:"totalCommissions"`
	AverageTicket     float64 `json:"averageTicket"`
}

// SaleSummaryFilters representa os filtros para sumário de vendas
type SaleSummaryFilters struct {
	Period    *string `json:"period,omitempty"`    // e.g., 'month', 'year'
	StartDate *string `json:"startDate,omitempty"` // ISO date
	EndDate   *string `json:"endDate,omitempty"`   // ISO date
}
```

---

### `.\internal\domain\entity\sales_link.go`

```go
package entity

import (
	"time"
)

// LinkType representa os tipos de link de venda
type LinkType string

const (
	LinkTypeLoteUnico         LinkType = "LOTE_UNICO"
	LinkTypeProdutoGeral      LinkType = "PRODUTO_GERAL"
	LinkTypeCatalogoCompleto  LinkType = "CATALOGO_COMPLETO"
)

// IsValid verifica se o tipo de link é válido
func (l LinkType) IsValid() bool {
	switch l {
	case LinkTypeLoteUnico, LinkTypeProdutoGeral, LinkTypeCatalogoCompleto:
		return true
	}
	return false
}

// SalesLink representa um link de venda público
type SalesLink struct {
	ID            string    `json:"id"`
	CreatedByUserID string  `json:"createdByUserId"`
	IndustryID    string    `json:"industryId"`
	BatchID       *string   `json:"batchId,omitempty"`
	ProductID     *string   `json:"productId,omitempty"`
	LinkType      LinkType  `json:"linkType"`
	SlugToken     string    `json:"slugToken"`
	Title         *string   `json:"title,omitempty"`
	CustomMessage *string   `json:"customMessage,omitempty"`
	DisplayPrice  *float64  `json:"displayPrice,omitempty"`
	ShowPrice     bool      `json:"showPrice"`
	ViewsCount    int       `json:"viewsCount"`
	ExpiresAt     *time.Time `json:"expiresAt,omitempty"`
	IsActive      bool      `json:"isActive"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
	FullURL       *string   `json:"fullUrl,omitempty"` // Gerada pelo service
	Batch         *Batch    `json:"batch,omitempty"`   // Populated quando necessário
	Product       *Product  `json:"product,omitempty"` // Populated quando necessário
	CreatedBy     *User     `json:"createdBy,omitempty"` // Populated quando necessário
}

// IsExpired verifica se o link está expirado
func (s *SalesLink) IsExpired() bool {
	if s.ExpiresAt == nil {
		return false
	}
	return time.Now().After(*s.ExpiresAt)
}

// CreateSalesLinkInput representa os dados para criar um link de venda
type CreateSalesLinkInput struct {
	LinkType      LinkType `json:"linkType" validate:"required,oneof=LOTE_UNICO PRODUTO_GERAL CATALOGO_COMPLETO"`
	BatchID       *string  `json:"batchId,omitempty" validate:"omitempty,uuid"`
	ProductID     *string  `json:"productId,omitempty" validate:"omitempty,uuid"`
	Title         *string  `json:"title,omitempty" validate:"omitempty,max=100"`
	CustomMessage *string  `json:"customMessage,omitempty" validate:"omitempty,max=500"`
	SlugToken     string   `json:"slugToken" validate:"required,min=3,max=50"`
	DisplayPrice  *float64 `json:"displayPrice,omitempty" validate:"omitempty,gt=0"`
	ShowPrice     bool     `json:"showPrice"`
	ExpiresAt     *string  `json:"expiresAt,omitempty"` // ISO date
	IsActive      bool     `json:"isActive"`
}

// UpdateSalesLinkInput representa os dados para atualizar um link de venda
type UpdateSalesLinkInput struct {
	Title         *string  `json:"title,omitempty" validate:"omitempty,max=100"`
	CustomMessage *string  `json:"customMessage,omitempty" validate:"omitempty,max=500"`
	DisplayPrice  *float64 `json:"displayPrice,omitempty" validate:"omitempty,gt=0"`
	ShowPrice     *bool    `json:"showPrice,omitempty"`
	ExpiresAt     *string  `json:"expiresAt,omitempty"` // ISO date
	IsActive      *bool    `json:"isActive,omitempty"`
}

// SalesLinkFilters representa os filtros para busca de links
type SalesLinkFilters struct {
	Type   *LinkType `json:"type,omitempty"`
	Status *string   `json:"status,omitempty"` // ATIVO, EXPIRADO
	Search *string   `json:"search,omitempty"` // Busca por title ou slug
	Page   int       `json:"page" validate:"min=1"`
	Limit  int       `json:"limit" validate:"min=1,max=100"`
}

// SalesLinkListResponse representa a resposta de listagem de links
type SalesLinkListResponse struct {
	Links []SalesLink `json:"links"`
	Total int         `json:"total"`
	Page  int         `json:"page"`
}

// ValidateSlugInput representa os dados para validar um slug
type ValidateSlugInput struct {
	Slug string `json:"slug" validate:"required,min=3,max=50"`
}

// ValidateSlugResponse representa a resposta da validação de slug
type ValidateSlugResponse struct {
	Valid bool `json:"valid"`
}

// CreateSalesLinkResponse representa a resposta de criação de link
type CreateSalesLinkResponse struct {
	ID      string `json:"id"`
	FullURL string `json:"fullUrl"`
}
```

---

### `.\internal\domain\entity\shared_inventory.go`

```go
package entity

import (
	"time"
)

// SharedInventoryBatch representa um lote compartilhado com um broker
type SharedInventoryBatch struct {
	ID              string    `json:"id"`
	BatchID         string    `json:"batchId"`
	BrokerUserID    string    `json:"brokerUserId"`
	IndustryOwnerID string    `json:"industryOwnerId"`
	NegotiatedPrice *float64  `json:"negotiatedPrice,omitempty"`
	SharedAt        time.Time `json:"sharedAt"`
	IsActive        bool      `json:"isActive"`
	Batch           *Batch    `json:"batch,omitempty"` // Populated quando necessário
	Broker          *User     `json:"broker,omitempty"` // Populated quando necessário
}

// CreateSharedInventoryInput representa os dados para compartilhar um lote
type CreateSharedInventoryInput struct {
	BatchID         string   `json:"batchId" validate:"required,uuid"`
	BrokerUserID    string   `json:"brokerUserId" validate:"required,uuid"`
	NegotiatedPrice *float64 `json:"negotiatedPrice,omitempty" validate:"omitempty,gt=0"`
}

// UpdateNegotiatedPriceInput representa os dados para atualizar o preço negociado
type UpdateNegotiatedPriceInput struct {
	NegotiatedPrice *float64 `json:"negotiatedPrice,omitempty" validate:"omitempty,gt=0"`
}

// SharedCatalogPermission representa a permissão de acesso ao catálogo geral
type SharedCatalogPermission struct {
	ID            string    `json:"id"`
	IndustryID    string    `json:"industryId"`
	BrokerUserID  string    `json:"brokerUserId"`
	CanShowPrices bool      `json:"canShowPrices"`
	GrantedAt     time.Time `json:"grantedAt"`
	IsActive      bool      `json:"isActive"`
}

// CreateSharedCatalogInput representa os dados para compartilhar o catálogo
type CreateSharedCatalogInput struct {
	BrokerUserID  string `json:"brokerUserId" validate:"required,uuid"`
	CanShowPrices bool   `json:"canShowPrices"`
}

// SharedInventoryFilters representa os filtros para inventário compartilhado
type SharedInventoryFilters struct {
	Recent bool   `json:"recent,omitempty"` // Se true, retorna itens recentes
	Status string `json:"status,omitempty"` // Filtrar por status do lote
	Limit  int    `json:"limit,omitempty" validate:"omitempty,min=1,max=100"`
}
```

---

### `.\internal\domain\entity\user.go`

```go
package entity

import (
	"time"
)

// UserRole representa os tipos de usuário no sistema
type UserRole string

const (
	RoleAdminIndustria   UserRole = "ADMIN_INDUSTRIA"
	RoleVendedorInterno  UserRole = "VENDEDOR_INTERNO"
	RoleBroker           UserRole = "BROKER"
)

// IsValid verifica se o role é válido
func (r UserRole) IsValid() bool {
	switch r {
	case RoleAdminIndustria, RoleVendedorInterno, RoleBroker:
		return true
	}
	return false
}

// User representa um usuário do sistema
type User struct {
	ID         string    `json:"id"`
	IndustryID *string   `json:"industryId,omitempty"` // NULL para brokers freelancers
	Name       string    `json:"name"`
	Email      string    `json:"email"`
	Password   string    `json:"-"` // Nunca serializar senha
	Phone      *string   `json:"phone,omitempty"`
	Role       UserRole  `json:"role"`
	IsActive   bool      `json:"isActive"`
	CreatedAt  time.Time `json:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt"`
}

// CreateUserInput representa os dados para criar um usuário
type CreateUserInput struct {
	IndustryID *string  `json:"industryId,omitempty" validate:"omitempty,uuid"`
	Name       string   `json:"name" validate:"required,min=2,max=255"`
	Email      string   `json:"email" validate:"required,email"`
	Password   string   `json:"password" validate:"required,min=8"`
	Phone      *string  `json:"phone,omitempty" validate:"omitempty,min=10,max=11"`
	Role       UserRole `json:"role" validate:"required,oneof=ADMIN_INDUSTRIA VENDEDOR_INTERNO BROKER"`
}

// UpdateUserInput representa os dados para atualizar um usuário
type UpdateUserInput struct {
	Name  *string `json:"name,omitempty" validate:"omitempty,min=2,max=255"`
	Phone *string `json:"phone,omitempty" validate:"omitempty,min=10,max=11"`
}

// UpdateUserStatusInput representa os dados para atualizar status do usuário
type UpdateUserStatusInput struct {
	IsActive bool `json:"isActive"`
}

// LoginInput representa os dados de login
type LoginInput struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=8"`
}

// LoginResponse representa a resposta do login
type LoginResponse struct {
	User User     `json:"user"`
	Role UserRole `json:"role"`
}

// RefreshTokenResponse representa a resposta do refresh token
type RefreshTokenResponse struct {
	User User `json:"user"`
}

// InviteBrokerInput representa os dados para convidar um broker
type InviteBrokerInput struct {
	Name     string  `json:"name" validate:"required,min=2,max=255"`
	Email    string  `json:"email" validate:"required,email"`
	Phone    *string `json:"phone,omitempty" validate:"omitempty,min=10,max=11"`
	Whatsapp *string `json:"whatsapp,omitempty" validate:"omitempty,min=10,max=11"`
}

// BrokerWithStats representa um broker com estatísticas
type BrokerWithStats struct {
	User
	SharedBatchesCount int `json:"sharedBatchesCount"`
}

// ChangePasswordInput representa os dados para trocar senha
type ChangePasswordInput struct {
	CurrentPassword string `json:"currentPassword" validate:"required,min=8"`
	NewPassword     string `json:"newPassword" validate:"required,min=8"`
}

// UserSession representa uma sessão de usuário (refresh token)
type UserSession struct {
	ID           string    `json:"id"`
	UserID       string    `json:"userId"`
	RefreshToken string    `json:"-"` // Nunca serializar token
	ExpiresAt    time.Time `json:"expiresAt"`
	CreatedAt    time.Time `json:"createdAt"`
	IsActive     bool      `json:"isActive"`
}
```

---

### `.\internal\domain\errors\errors.go`

```go
﻿package errors

import (
	"fmt"
	"net/http"
)

// AppError representa um erro de aplicação com contexto
type AppError struct {
	Code       string                 `json:"code"`
	Message    string                 `json:"message"`
	Details    map[string]interface{} `json:"details,omitempty"`
	StatusCode int                    `json:"-"`
	Err        error                  `json:"-"`
}

// Error implementa a interface error
func (e *AppError) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("%s: %s (%v)", e.Code, e.Message, e.Err)
	}
	return fmt.Sprintf("%s: %s", e.Code, e.Message)
}

// Unwrap retorna o erro encapsulado
func (e *AppError) Unwrap() error {
	return e.Err
}

// NewAppError cria um novo AppError
func NewAppError(code, message string, statusCode int, err error) *AppError {
	return &AppError{
		Code:       code,
		Message:    message,
		StatusCode: statusCode,
		Err:        err,
	}
}

// WithDetails adiciona detalhes ao erro
func (e *AppError) WithDetails(details map[string]interface{}) *AppError {
	e.Details = details
	return e
}

// =============================================
// ERROS DE VALIDAÇÃO
// =============================================

// NewValidationError cria um erro de validação
func NewValidationError(message string, details map[string]interface{}) *AppError {
	return &AppError{
		Code:       "VALIDATION_ERROR",
		Message:    message,
		Details:    details,
		StatusCode: http.StatusBadRequest,
	}
}

// ValidationError cria um erro de validação simples
func ValidationError(message string) *AppError {
	return NewValidationError(message, nil)
}

// =============================================
// ERROS DE NOT FOUND
// =============================================

// NewNotFoundError cria um erro de recurso não encontrado
func NewNotFoundError(resource string) *AppError {
	return &AppError{
		Code:       "NOT_FOUND",
		Message:    fmt.Sprintf("%s não encontrado", resource),
		StatusCode: http.StatusNotFound,
	}
}

// NotFoundError cria um erro de not found genérico
func NotFoundError(message string) *AppError {
	return &AppError{
		Code:       "NOT_FOUND",
		Message:    message,
		StatusCode: http.StatusNotFound,
	}
}

// =============================================
// ERROS DE CONFLITO
// =============================================

// NewConflictError cria um erro de conflito
func NewConflictError(message string) *AppError {
	return &AppError{
		Code:       "CONFLICT",
		Message:    message,
		StatusCode: http.StatusConflict,
	}
}

// ConflictError cria um erro de conflito com detalhes
func ConflictError(message string, details map[string]interface{}) *AppError {
	return &AppError{
		Code:       "CONFLICT",
		Message:    message,
		Details:    details,
		StatusCode: http.StatusConflict,
	}
}

// =============================================
// ERROS DE AUTENTICAÇÃO
// =============================================

// NewUnauthorizedError cria um erro de autenticação
func NewUnauthorizedError(message string) *AppError {
	return &AppError{
		Code:       "UNAUTHORIZED",
		Message:    message,
		StatusCode: http.StatusUnauthorized,
	}
}

// UnauthorizedError cria um erro de não autorizado
func UnauthorizedError() *AppError {
	return NewUnauthorizedError("Autenticação necessária")
}

// InvalidCredentialsError cria um erro de credenciais inválidas
func InvalidCredentialsError() *AppError {
	return NewUnauthorizedError("Email ou senha inválidos")
}

// =============================================
// ERROS DE AUTORIZAÇÃO
// =============================================

// NewForbiddenError cria um erro de permissão negada
func NewForbiddenError(message string) *AppError {
	return &AppError{
		Code:       "FORBIDDEN",
		Message:    message,
		StatusCode: http.StatusForbidden,
	}
}

// ForbiddenError cria um erro de permissão padrão
func ForbiddenError() *AppError {
	return NewForbiddenError("Você não tem permissão para acessar este recurso")
}

// =============================================
// ERROS DE NEGÓCIO
// =============================================

// BatchNotAvailableError indica que o lote não está disponível
func BatchNotAvailableError() *AppError {
	return &AppError{
		Code:       "BATCH_NOT_AVAILABLE",
		Message:    "Lote não disponível para reserva",
		StatusCode: http.StatusBadRequest,
	}
}

// SlugExistsError indica que o slug já está em uso
func SlugExistsError(slug string) *AppError {
	return &AppError{
		Code:       "SLUG_EXISTS",
		Message:    "Este slug já está em uso",
		Details:    map[string]interface{}{"slug": slug},
		StatusCode: http.StatusConflict,
	}
}

// EmailExistsError indica que o email já está cadastrado
func EmailExistsError(email string) *AppError {
	return &AppError{
		Code:       "EMAIL_EXISTS",
		Message:    "Este email já está cadastrado",
		Details:    map[string]interface{}{"email": email},
		StatusCode: http.StatusConflict,
	}
}

// BatchCodeExistsError indica que o código do lote já existe
func BatchCodeExistsError(code string) *AppError {
	return &AppError{
		Code:       "BATCH_CODE_EXISTS",
		Message:    "Este código de lote já existe",
		Details:    map[string]interface{}{"batchCode": code},
		StatusCode: http.StatusConflict,
	}
}

// ReservationExpiredError indica que a reserva expirou
func ReservationExpiredError() *AppError {
	return &AppError{
		Code:       "RESERVATION_EXPIRED",
		Message:    "Esta reserva já expirou",
		StatusCode: http.StatusBadRequest,
	}
}

// InvalidPriceError indica que o preço é inválido
func InvalidPriceError(message string) *AppError {
	return &AppError{
		Code:       "INVALID_PRICE",
		Message:    message,
		StatusCode: http.StatusBadRequest,
	}
}

// =============================================
// ERROS DE CSRF
// =============================================

// CSRFTokenMissingError indica que o token CSRF está ausente
func CSRFTokenMissingError() *AppError {
	return &AppError{
		Code:       "CSRF_TOKEN_MISSING",
		Message:    "Token CSRF ausente",
		StatusCode: 419, // Status não padrão para CSRF
	}
}

// CSRFTokenInvalidError indica que o token CSRF é inválido
func CSRFTokenInvalidError() *AppError {
	return &AppError{
		Code:       "CSRF_TOKEN_INVALID",
		Message:    "Token CSRF inválido",
		StatusCode: 419,
	}
}

// =============================================
// ERROS DE RATE LIMIT
// =============================================

// RateLimitExceededError indica que o limite de requisições foi excedido
func RateLimitExceededError() *AppError {
	return &AppError{
		Code:       "RATE_LIMIT_EXCEEDED",
		Message:    "Limite de requisições excedido. Tente novamente mais tarde",
		StatusCode: http.StatusTooManyRequests,
	}
}

// =============================================
// ERROS INTERNOS
// =============================================

// NewInternalError cria um erro interno do servidor
func NewInternalError(message string, err error) *AppError {
	return &AppError{
		Code:       "INTERNAL_ERROR",
		Message:    message,
		StatusCode: http.StatusInternalServerError,
		Err:        err,
	}
}

// InternalError cria um erro interno genérico
func InternalError(err error) *AppError {
	return NewInternalError("Erro interno do servidor", err)
}

// DatabaseError cria um erro de banco de dados
func DatabaseError(err error) *AppError {
	return NewInternalError("Erro ao acessar banco de dados", err)
}

// StorageError cria um erro de storage
func StorageError(err error) *AppError {
	return NewInternalError("Erro ao acessar storage", err)
}
```

---

### `.\internal\domain\repository\batch_repository.go`

```go
package repository

import (
	"context"
	"database/sql"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
)

// BatchRepository define o contrato para operações com lotes
type BatchRepository interface {
	// Create cria um novo lote
	Create(ctx context.Context, batch *entity.Batch) error

	// FindByID busca lote por ID
	FindByID(ctx context.Context, id string) (*entity.Batch, error)

	// FindByIDForUpdate busca lote por ID com lock pessimista (SELECT FOR UPDATE)
	FindByIDForUpdate(ctx context.Context, tx *sql.Tx, id string) (*entity.Batch, error)

	// FindByProductID busca lotes por produto
	FindByProductID(ctx context.Context, productID string) ([]entity.Batch, error)

	// FindByStatus busca lotes por status
	FindByStatus(ctx context.Context, industryID string, status entity.BatchStatus) ([]entity.Batch, error)

	// FindAvailable busca lotes disponíveis
	FindAvailable(ctx context.Context, industryID string) ([]entity.Batch, error)

	// FindByCode busca lotes por código (busca parcial)
	FindByCode(ctx context.Context, industryID, code string) ([]entity.Batch, error)

	// List lista lotes com filtros e paginação
	List(ctx context.Context, industryID string, filters entity.BatchFilters) ([]entity.Batch, int, error)

	// Update atualiza os dados do lote
	Update(ctx context.Context, batch *entity.Batch) error

	// UpdateStatus atualiza apenas o status do lote
	UpdateStatus(ctx context.Context, tx *sql.Tx, id string, status entity.BatchStatus) error

	// CountByStatus conta lotes por status
	CountByStatus(ctx context.Context, industryID string, status entity.BatchStatus) (int, error)

	// ExistsByCode verifica se o código de lote já existe na indústria
	ExistsByCode(ctx context.Context, industryID, code string) (bool, error)
}
```

---

### `.\internal\domain\repository\industry_repository.go`

```go
package repository

import (
	"context"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
)

// IndustryRepository define o contrato para operações com indústrias
type IndustryRepository interface {
	// Create cria uma nova indústria
	Create(ctx context.Context, industry *entity.Industry) error

	// FindByID busca indústria por ID
	FindByID(ctx context.Context, id string) (*entity.Industry, error)

	// FindBySlug busca indústria por slug
	FindBySlug(ctx context.Context, slug string) (*entity.Industry, error)

	// FindByCNPJ busca indústria por CNPJ
	FindByCNPJ(ctx context.Context, cnpj string) (*entity.Industry, error)

	// Update atualiza os dados da indústria
	Update(ctx context.Context, industry *entity.Industry) error

	// ExistsBySlug verifica se o slug já está em uso
	ExistsBySlug(ctx context.Context, slug string) (bool, error)

	// ExistsByCNPJ verifica se o CNPJ já está cadastrado
	ExistsByCNPJ(ctx context.Context, cnpj string) (bool, error)

	// List lista todas as indústrias
	List(ctx context.Context) ([]entity.Industry, error)
}
```

---

### `.\internal\domain\repository\lead_interaction_repository.go`

```go
package repository

import (
	"context"
	"database/sql"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
)

// LeadInteractionRepository define o contrato para operações com interações de leads
type LeadInteractionRepository interface {
	// Create cria uma nova interação
	Create(ctx context.Context, tx *sql.Tx, interaction *entity.LeadInteraction) error

	// FindByLeadID busca interações de um lead
	FindByLeadID(ctx context.Context, leadID string) ([]entity.LeadInteraction, error)

	// FindBySalesLinkID busca interações de um link de venda
	FindBySalesLinkID(ctx context.Context, salesLinkID string) ([]entity.LeadInteraction, error)

	// FindByID busca interação por ID
	FindByID(ctx context.Context, id string) (*entity.LeadInteraction, error)
}
```

---

### `.\internal\domain\repository\lead_repository.go`

```go
package repository

import (
	"context"
	"database/sql"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
)

// LeadRepository define o contrato para operações com leads
type LeadRepository interface {
	// Create cria um novo lead
	Create(ctx context.Context, tx *sql.Tx, lead *entity.Lead) error

	// FindByID busca lead por ID
	FindByID(ctx context.Context, id string) (*entity.Lead, error)

	// FindByContact busca lead por contato (email ou telefone)
	FindByContact(ctx context.Context, contact string) (*entity.Lead, error)

	// FindBySalesLinkID busca leads por link de venda
	FindBySalesLinkID(ctx context.Context, salesLinkID string) ([]entity.Lead, error)

	// List lista leads com filtros e paginação
	List(ctx context.Context, filters entity.LeadFilters) ([]entity.Lead, int, error)

	// Update atualiza os dados do lead
	Update(ctx context.Context, tx *sql.Tx, lead *entity.Lead) error

	// UpdateStatus atualiza o status do lead
	UpdateStatus(ctx context.Context, id string, status entity.LeadStatus) error

	// UpdateLastInteraction atualiza a data da última interação
	UpdateLastInteraction(ctx context.Context, tx *sql.Tx, id string) error

	// CountByIndustry conta leads de uma indústria
	CountByIndustry(ctx context.Context, industryID string) (int, error)
}
```

---

### `.\internal\domain\repository\media_repository.go`

```go
package repository

import (
	"context"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
)

// MediaRepository define o contrato para operações com mídias
type MediaRepository interface {
	// CreateProductMedia cria uma nova mídia de produto
	CreateProductMedia(ctx context.Context, productID string, media *entity.CreateMediaInput) error

	// CreateBatchMedia cria uma nova mídia de lote
	CreateBatchMedia(ctx context.Context, batchID string, media *entity.CreateMediaInput) error

	// FindProductMedias busca mídias de um produto
	FindProductMedias(ctx context.Context, productID string) ([]entity.Media, error)

	// FindBatchMedias busca mídias de um lote
	FindBatchMedias(ctx context.Context, batchID string) ([]entity.Media, error)

	// DeleteProductMedia deleta mídia de produto
	DeleteProductMedia(ctx context.Context, id string) error

	// DeleteBatchMedia deleta mídia de lote
	DeleteBatchMedia(ctx context.Context, id string) error

	// UpdateDisplayOrder atualiza ordem de exibição de uma mídia
	UpdateDisplayOrder(ctx context.Context, id string, order int) error

	// SetCover define uma mídia como capa (e remove flag de outras)
	SetCover(ctx context.Context, productID, mediaID string) error
}
```

---

### `.\internal\domain\repository\product_repository.go`

```go
package repository

import (
	"context"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
)

// ProductRepository define o contrato para operações com produtos
type ProductRepository interface {
	// Create cria um novo produto
	Create(ctx context.Context, product *entity.Product) error

	// FindByID busca produto por ID
	FindByID(ctx context.Context, id string) (*entity.Product, error)

	// FindByIndustryID busca produtos por indústria com filtros
	FindByIndustryID(ctx context.Context, industryID string, filters entity.ProductFilters) ([]entity.Product, int, error)

	// Update atualiza os dados do produto
	Update(ctx context.Context, product *entity.Product) error

	// SoftDelete desativa o produto (soft delete)
	SoftDelete(ctx context.Context, id string) error

	// CountBatchesByProductID conta quantos lotes estão associados ao produto
	CountBatchesByProductID(ctx context.Context, productID string) (int, error)

	// ExistsBySKU verifica se o SKU já está em uso na indústria
	ExistsBySKU(ctx context.Context, industryID, sku string) (bool, error)
}
```

---

### `.\internal\domain\repository\reservation_repository.go`

```go
package repository

import (
	"context"
	"database/sql"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
)

// ReservationRepository define o contrato para operações com reservas
type ReservationRepository interface {
	// Create cria uma nova reserva
	Create(ctx context.Context, tx *sql.Tx, reservation *entity.Reservation) error

	// FindByID busca reserva por ID
	FindByID(ctx context.Context, id string) (*entity.Reservation, error)

	// FindByBatchID busca reservas de um lote
	FindByBatchID(ctx context.Context, batchID string) ([]entity.Reservation, error)

	// FindActive busca reservas ativas (não expiradas)
	FindActive(ctx context.Context, userID string) ([]entity.Reservation, error)

	// FindExpired busca reservas expiradas para job de limpeza
	FindExpired(ctx context.Context) ([]entity.Reservation, error)

	// Update atualiza os dados da reserva
	Update(ctx context.Context, reservation *entity.Reservation) error

	// UpdateStatus atualiza o status da reserva
	UpdateStatus(ctx context.Context, tx *sql.Tx, id string, status entity.ReservationStatus) error

	// Cancel cancela uma reserva
	Cancel(ctx context.Context, tx *sql.Tx, id string) error

	// List lista reservas com filtros
	List(ctx context.Context, filters entity.ReservationFilters) ([]entity.Reservation, error)
}
```

---

### `.\internal\domain\repository\sales_history_repository.go`

```go
package repository

import (
	"context"
	"database/sql"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
	"time"
)

// SalesHistoryRepository define o contrato para operações com histórico de vendas
type SalesHistoryRepository interface {
	// Create cria um novo registro de venda
	Create(ctx context.Context, tx *sql.Tx, sale *entity.Sale) error

	// FindByID busca venda por ID
	FindByID(ctx context.Context, id string) (*entity.Sale, error)

	// FindBySellerID busca vendas de um vendedor
	FindBySellerID(ctx context.Context, sellerID string, filters entity.SaleFilters) ([]entity.Sale, int, error)

	// FindByIndustryID busca vendas de uma indústria
	FindByIndustryID(ctx context.Context, industryID string, filters entity.SaleFilters) ([]entity.Sale, int, error)

	// FindByBrokerID busca vendas de um broker
	FindByBrokerID(ctx context.Context, brokerID string, limit int) ([]entity.Sale, error)

	// FindByPeriod busca vendas por período
	FindByPeriod(ctx context.Context, industryID string, startDate, endDate time.Time) ([]entity.Sale, error)

	// List lista vendas com filtros e paginação
	List(ctx context.Context, filters entity.SaleFilters) ([]entity.Sale, int, error)

	// CalculateSummary calcula sumário de vendas (total, comissões, ticket médio)
	CalculateSummary(ctx context.Context, filters entity.SaleSummaryFilters) (*entity.SaleSummary, error)

	// SumMonthlySales soma vendas do mês atual
	SumMonthlySales(ctx context.Context, entityID string, month time.Time) (float64, error)

	// SumMonthlyCommission soma comissões do mês atual (para broker)
	SumMonthlyCommission(ctx context.Context, brokerID string, month time.Time) (float64, error)
}
```

---

### `.\internal\domain\repository\sales_link_repository.go`

```go
package repository

import (
	"context"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
)

// SalesLinkRepository define o contrato para operações com links de venda
type SalesLinkRepository interface {
	// Create cria um novo link de venda
	Create(ctx context.Context, link *entity.SalesLink) error

	// FindByID busca link por ID
	FindByID(ctx context.Context, id string) (*entity.SalesLink, error)

	// FindBySlug busca link por slug (para landing page pública)
	FindBySlug(ctx context.Context, slug string) (*entity.SalesLink, error)

	// FindByCreatorID busca links criados por um usuário
	FindByCreatorID(ctx context.Context, userID string, filters entity.SalesLinkFilters) ([]entity.SalesLink, int, error)

	// FindByType busca links por tipo
	FindByType(ctx context.Context, linkType entity.LinkType) ([]entity.SalesLink, error)

	// List lista links com filtros e paginação
	List(ctx context.Context, filters entity.SalesLinkFilters) ([]entity.SalesLink, int, error)

	// Update atualiza os dados do link
	Update(ctx context.Context, link *entity.SalesLink) error

	// SoftDelete desativa o link (soft delete)
	SoftDelete(ctx context.Context, id string) error

	// ExistsBySlug verifica se o slug já está em uso
	ExistsBySlug(ctx context.Context, slug string) (bool, error)

	// IncrementViews incrementa o contador de visualizações atomicamente
	IncrementViews(ctx context.Context, id string) error

	// CountActive conta links ativos de um usuário
	CountActive(ctx context.Context, userID string) (int, error)
}
```

---

### `.\internal\domain\repository\shared_inventory_repository.go`

```go
package repository

import (
	"context"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
)

// SharedInventoryRepository define o contrato para operações de compartilhamento
type SharedInventoryRepository interface {
	// CreateSharedBatch compartilha um lote com um broker
	CreateSharedBatch(ctx context.Context, shared *entity.SharedInventoryBatch) error

	// FindByBrokerID busca lotes compartilhados com um broker
	FindByBrokerID(ctx context.Context, brokerID string, filters entity.SharedInventoryFilters) ([]entity.SharedInventoryBatch, error)

	// FindByBatchID busca compartilhamentos de um lote específico
	FindByBatchID(ctx context.Context, batchID string) ([]entity.SharedInventoryBatch, error)

	// FindByID busca compartilhamento por ID
	FindByID(ctx context.Context, id string) (*entity.SharedInventoryBatch, error)

	// ExistsForBroker verifica se lote já está compartilhado com broker específico
	ExistsForBroker(ctx context.Context, batchID, brokerID string) (bool, error)

	// UpdateNegotiatedPrice atualiza o preço negociado
	UpdateNegotiatedPrice(ctx context.Context, id string, price *float64) error

	// Delete remove compartilhamento (hard delete)
	Delete(ctx context.Context, id string) error

	// CountSharedBatches conta lotes compartilhados com broker (por status)
	CountSharedBatches(ctx context.Context, brokerID string, status entity.BatchStatus) (int, error)

	// CreateCatalogPermission compartilha catálogo com broker
	CreateCatalogPermission(ctx context.Context, permission *entity.SharedCatalogPermission) error

	// FindCatalogPermissionByBroker busca permissão de catálogo do broker
	FindCatalogPermissionByBroker(ctx context.Context, industryID, brokerID string) (*entity.SharedCatalogPermission, error)

	// UpdateCatalogPermission atualiza permissão de catálogo
	UpdateCatalogPermission(ctx context.Context, permission *entity.SharedCatalogPermission) error

	// DeleteCatalogPermission remove permissão de catálogo
	DeleteCatalogPermission(ctx context.Context, id string) error
}
```

---

### `.\internal\domain\repository\user_repository.go`

```go
package repository

import (
	"context"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
)

// UserRepository define o contrato para operações com usuários
type UserRepository interface {
	// Create cria um novo usuário
	Create(ctx context.Context, user *entity.User) error

	// FindByID busca usuário por ID
	FindByID(ctx context.Context, id string) (*entity.User, error)

	// FindByEmail busca usuário por email (para login)
	FindByEmail(ctx context.Context, email string) (*entity.User, error)

	// FindByIndustryID busca usuários por indústria
	FindByIndustryID(ctx context.Context, industryID string) ([]entity.User, error)

	// FindByRole busca usuários por role
	FindByRole(ctx context.Context, role entity.UserRole) ([]entity.User, error)

	// FindBrokers busca todos os brokers com estatísticas
	FindBrokers(ctx context.Context, industryID string) ([]entity.BrokerWithStats, error)

	// Update atualiza os dados do usuário
	Update(ctx context.Context, user *entity.User) error

	// UpdateStatus atualiza o status ativo/inativo do usuário
	UpdateStatus(ctx context.Context, id string, isActive bool) error

	// ExistsByEmail verifica se o email já está cadastrado
	ExistsByEmail(ctx context.Context, email string) (bool, error)

	// List lista todos os usuários com filtros opcionais
	List(ctx context.Context, role *entity.UserRole) ([]entity.User, error)
}
```

---

### `.\internal\domain\service\auth_service.go`

```go
package service

import (
	"context"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
)

// AuthService define o contrato para operações de autenticação
type AuthService interface {
	// Register registra um novo usuário (hash senha, criar registro)
	Register(ctx context.Context, input entity.CreateUserInput) (*entity.User, error)

	// Login valida credenciais e gera tokens
	Login(ctx context.Context, input entity.LoginInput) (*entity.LoginResponse, string, string, error)

	// Logout invalida refresh token
	Logout(ctx context.Context, refreshToken string) error

	// RefreshToken renova access token e rotaciona refresh token
	RefreshToken(ctx context.Context, refreshToken string) (*entity.User, string, string, error)

	// ChangePassword troca senha do usuário
	ChangePassword(ctx context.Context, userID string, input entity.ChangePasswordInput) error

	// ValidateToken valida token JWT
	ValidateToken(ctx context.Context, token string) (string, entity.UserRole, *string, error)

	// GenerateTemporaryPassword gera senha temporária para novo usuário
	GenerateTemporaryPassword() string

	// HashPassword faz hash da senha com argon2
	HashPassword(password string) (string, error)

	// VerifyPassword verifica se senha corresponde ao hash
	VerifyPassword(password, hash string) error
}
```

---

### `.\internal\domain\service\batch_service.go`

```go
package service

import (
	"context"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
)

// BatchService define o contrato para operações com lotes
type BatchService interface {
	// Create cria um novo lote (calcula área total automaticamente)
	Create(ctx context.Context, industryID string, input entity.CreateBatchInput) (*entity.Batch, error)

	// GetByID busca lote por ID com dados relacionados
	GetByID(ctx context.Context, id string) (*entity.Batch, error)

	// CheckStatus verifica status do lote (para verificação de disponibilidade)
	CheckStatus(ctx context.Context, id string) (*entity.Batch, error)

	// List lista lotes com filtros e paginação
	List(ctx context.Context, industryID string, filters entity.BatchFilters) (*entity.BatchListResponse, error)

	// Update atualiza lote (recalcula área se dimensões mudarem)
	Update(ctx context.Context, id string, input entity.UpdateBatchInput) (*entity.Batch, error)

	// UpdateStatus atualiza apenas o status do lote
	UpdateStatus(ctx context.Context, id string, status entity.BatchStatus) (*entity.Batch, error)

	// CheckAvailability verifica se lote está disponível
	CheckAvailability(ctx context.Context, id string) (bool, error)

	// AddMedias adiciona mídias ao lote
	AddMedias(ctx context.Context, batchID string, medias []entity.CreateMediaInput) error

	// RemoveMedia remove mídia do lote
	RemoveMedia(ctx context.Context, batchID, mediaID string) error
}
```

---

### `.\internal\domain\service\dashboard_service.go`

```go
package service

import (
	"context"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
)

// DashboardService define o contrato para operações de dashboard
type DashboardService interface {
	// GetIndustryMetrics busca métricas do dashboard admin/vendedor
	GetIndustryMetrics(ctx context.Context, industryID string) (*entity.IndustryMetrics, error)

	// GetBrokerMetrics busca métricas do dashboard broker
	GetBrokerMetrics(ctx context.Context, brokerID string) (*entity.BrokerMetrics, error)

	// GetRecentActivities busca atividades recentes (últimas 10)
	GetRecentActivities(ctx context.Context, industryID string) ([]entity.Activity, error)
}
```

---

### `.\internal\domain\service\lead_service.go`

```go
package service

import (
	"context"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
)

// LeadService define o contrato para operações com leads
type LeadService interface {
	// CaptureInterest captura lead de landing page (cria lead e interação em transação)
	CaptureInterest(ctx context.Context, input entity.CreateLeadInput) error

	// GetByID busca lead por ID
	GetByID(ctx context.Context, id string) (*entity.Lead, error)

	// List lista leads com filtros
	List(ctx context.Context, filters entity.LeadFilters) (*entity.LeadListResponse, error)

	// UpdateStatus atualiza status do lead
	UpdateStatus(ctx context.Context, id string, status entity.LeadStatus) (*entity.Lead, error)

	// GetInteractions busca interações do lead
	GetInteractions(ctx context.Context, leadID string) ([]entity.LeadInteraction, error)
}
```

---

### `.\internal\domain\service\product_service.go`

```go
package service

import (
	"context"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
)

// ProductService define o contrato para operações com produtos
type ProductService interface {
	// Create cria um novo produto com validações de negócio
	Create(ctx context.Context, industryID string, input entity.CreateProductInput) (*entity.Product, error)

	// GetByID busca produto por ID com dados relacionados
	GetByID(ctx context.Context, id string) (*entity.Product, error)

	// List lista produtos com filtros
	List(ctx context.Context, industryID string, filters entity.ProductFilters) (*entity.ProductListResponse, error)

	// Update atualiza produto
	Update(ctx context.Context, id string, input entity.UpdateProductInput) (*entity.Product, error)

	// Delete desativa produto (verifica se tem lotes associados)
	Delete(ctx context.Context, id string) error

	// AddMedias adiciona mídias ao produto
	AddMedias(ctx context.Context, productID string, medias []entity.CreateMediaInput) error

	// RemoveMedia remove mídia do produto
	RemoveMedia(ctx context.Context, productID, mediaID string) error
}
```

---

### `.\internal\domain\service\reservation_service.go`

```go
package service

import (
	"context"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
)

// ReservationService define o contrato para operações com reservas
type ReservationService interface {
	// Create cria reserva (verifica disponibilidade, atualiza status lote - TRANSAÇÃO)
	Create(ctx context.Context, userID string, input entity.CreateReservationInput) (*entity.Reservation, error)

	// GetByID busca reserva por ID
	GetByID(ctx context.Context, id string) (*entity.Reservation, error)

	// Cancel cancela reserva (volta status do lote para DISPONIVEL)
	Cancel(ctx context.Context, id string) error

	// ConfirmSale confirma venda (cria SalesHistory, atualiza status lote - TRANSAÇÃO)
	ConfirmSale(ctx context.Context, reservationID, userID string, input entity.ConfirmSaleInput) (*entity.Sale, error)

	// ListActive lista reservas ativas
	ListActive(ctx context.Context, userID string) ([]entity.Reservation, error)

	// ExpireReservations job para expirar reservas vencidas
	ExpireReservations(ctx context.Context) (int, error)
}
```

---

### `.\internal\domain\service\sales_history_service.go`

```go
package service

import (
	"context"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
)

// SalesHistoryService define o contrato para operações com histórico de vendas
type SalesHistoryService interface {
	// RegisterSale registra venda (calcula comissão, net value, cria registro)
	RegisterSale(ctx context.Context, input entity.CreateSaleInput) (*entity.Sale, error)

	// GetByID busca venda por ID
	GetByID(ctx context.Context, id string) (*entity.Sale, error)

	// List lista vendas com filtros
	List(ctx context.Context, filters entity.SaleFilters) (*entity.SaleListResponse, error)

	// GetSummary calcula sumário de vendas (total, comissões, ticket médio)
	GetSummary(ctx context.Context, filters entity.SaleSummaryFilters) (*entity.SaleSummary, error)

	// GetBrokerSales busca vendas do broker
	GetBrokerSales(ctx context.Context, brokerID string, limit int) ([]entity.Sale, error)
}
```

---

### `.\internal\domain\service\sales_link_service.go`

```go
package service

import (
	"context"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
)

// SalesLinkService define o contrato para operações com links de venda
type SalesLinkService interface {
	// Create cria link de venda (valida slug único, linkType vs batchId/productId)
	Create(ctx context.Context, userID, industryID string, input entity.CreateSalesLinkInput) (*entity.CreateSalesLinkResponse, error)

	// GetByID busca link por ID
	GetByID(ctx context.Context, id string) (*entity.SalesLink, error)

	// GetBySlug busca link por slug (para landing page pública)
	GetBySlug(ctx context.Context, slug string) (*entity.SalesLink, error)

	// List lista links com filtros
	List(ctx context.Context, filters entity.SalesLinkFilters) (*entity.SalesLinkListResponse, error)

	// Update atualiza link
	Update(ctx context.Context, id string, input entity.UpdateSalesLinkInput) (*entity.SalesLink, error)

	// Delete desativa link
	Delete(ctx context.Context, id string) error

	// ValidateSlug valida se slug está disponível
	ValidateSlug(ctx context.Context, slug string) (bool, error)

	// IncrementViews incrementa contador de visualizações
	IncrementViews(ctx context.Context, id string) error

	// GenerateFullURL gera URL completa do link
	GenerateFullURL(slug string) string
}
```

---

### `.\internal\domain\service\shared_inventory_service.go`

```go
package service

import (
	"context"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
)

// SharedInventoryService define o contrato para operações de compartilhamento
type SharedInventoryService interface {
	// ShareBatch compartilha lote com broker (verifica duplicata)
	ShareBatch(ctx context.Context, industryID string, input entity.CreateSharedInventoryInput) (*entity.SharedInventoryBatch, error)

	// RemoveSharedBatch remove compartilhamento
	RemoveSharedBatch(ctx context.Context, id string) error

	// UpdateNegotiatedPrice atualiza preço negociado (apenas broker pode atualizar seu próprio)
	UpdateNegotiatedPrice(ctx context.Context, id, brokerID string, price *float64) (*entity.SharedInventoryBatch, error)

	// GetBrokerInventory busca inventário compartilhado do broker
	GetBrokerInventory(ctx context.Context, brokerID string, filters entity.SharedInventoryFilters) ([]entity.SharedInventoryBatch, error)

	// GetSharedBatchesByBatchID busca todos os compartilhamentos de um lote
	GetSharedBatchesByBatchID(ctx context.Context, batchID string) ([]entity.SharedInventoryBatch, error)

	// ShareCatalog compartilha catálogo completo com broker
	ShareCatalog(ctx context.Context, industryID string, input entity.CreateSharedCatalogInput) (*entity.SharedCatalogPermission, error)

	// RevokeCatalogAccess remove acesso ao catálogo
	RevokeCatalogAccess(ctx context.Context, industryID, brokerID string) error
}
```

---

### `.\internal\domain\service\storage_service.go`

```go
package service

import (
	"context"
	"io"
)

// StorageService define o contrato para operações de storage (S3/MinIO)
type StorageService interface {
	// UploadFile faz upload de um arquivo
	UploadFile(ctx context.Context, bucket, key string, reader io.Reader, contentType string, size int64) (string, error)

	// UploadProductMedia faz upload de mídia de produto
	UploadProductMedia(ctx context.Context, productID string, reader io.Reader, filename, contentType string, size int64) (string, error)

	// UploadBatchMedia faz upload de mídia de lote
	UploadBatchMedia(ctx context.Context, batchID string, reader io.Reader, filename, contentType string, size int64) (string, error)

	// DeleteFile deleta um arquivo
	DeleteFile(ctx context.Context, bucket, key string) error

	// FileExists verifica se arquivo existe
	FileExists(ctx context.Context, bucket, key string) (bool, error)

	// GeneratePresignedURL gera URL pre-assinada (para invoices)
	GeneratePresignedURL(ctx context.Context, bucket, key string, expiration int) (string, error)

	// ExtractKeyFromURL extrai a key do storage a partir da URL
	ExtractKeyFromURL(url string) (string, error)

	// ValidateFileType valida tipo de arquivo
	ValidateFileType(contentType string, allowedTypes []string) bool

	// ValidateFileSize valida tamanho do arquivo
	ValidateFileSize(size int64, maxSize int64) bool
}
```

---

### `.\internal\domain\service\user_service.go`

```go
package service

import (
	"context"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
)

// UserService define o contrato para operações com usuários
type UserService interface {
	// Create cria um novo usuário com validações de negócio
	Create(ctx context.Context, input entity.CreateUserInput) (*entity.User, error)

	// GetByID busca usuário por ID
	GetByID(ctx context.Context, id string) (*entity.User, error)

	// GetByEmail busca usuário por email
	GetByEmail(ctx context.Context, email string) (*entity.User, error)

	// List lista usuários com filtros
	List(ctx context.Context, role *entity.UserRole) ([]entity.User, error)

	// Update atualiza dados do usuário
	Update(ctx context.Context, id string, input entity.UpdateUserInput) (*entity.User, error)

	// UpdateStatus atualiza status ativo/inativo
	UpdateStatus(ctx context.Context, id string, isActive bool) (*entity.User, error)

	// InviteBroker convida um broker (cria usuário, gera senha temporária, envia email)
	InviteBroker(ctx context.Context, industryID string, input entity.InviteBrokerInput) (*entity.User, error)

	// GetBrokers lista brokers com estatísticas
	GetBrokers(ctx context.Context, industryID string) ([]entity.BrokerWithStats, error)
}
```

---

### `.\internal\repository\batch_repository.go`

```go
package repository

import (
	"context"
	"database/sql"

	sq "github.com/Masterminds/squirrel"
	"github.com/lib/pq"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
	"github.com/thiagomes07/CAVA/backend/internal/domain/errors"
)

type batchRepository struct {
	db *DB
}

func NewBatchRepository(db *DB) *batchRepository {
	return &batchRepository{db: db}
}

func (r *batchRepository) Create(ctx context.Context, batch *entity.Batch) error {
	query := `
		INSERT INTO batches (
			id, product_id, industry_id, batch_code, height, width, thickness,
			quantity_slabs, industry_price, origin_quarry, entry_date, status
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		RETURNING created_at, updated_at, net_area
	`

	err := r.db.QueryRowContext(ctx, query,
		batch.ID, batch.ProductID, batch.IndustryID, batch.BatchCode,
		batch.Height, batch.Width, batch.Thickness, batch.QuantitySlabs,
		batch.IndustryPrice, batch.OriginQuarry, batch.EntryDate, batch.Status,
	).Scan(&batch.CreatedAt, &batch.UpdatedAt, &batch.TotalArea)

	if err != nil {
		if pqErr, ok := err.(*pq.Error); ok {
			if pqErr.Code == "23505" { // unique_violation
				return errors.BatchCodeExistsError(batch.BatchCode)
			}
		}
		return errors.DatabaseError(err)
	}

	return nil
}

func (r *batchRepository) FindByID(ctx context.Context, id string) (*entity.Batch, error) {
	query := `
		SELECT id, product_id, industry_id, batch_code, height, width, thickness,
		       quantity_slabs, net_area, industry_price, origin_quarry, 
		       entry_date, status, is_active, created_at, updated_at
		FROM batches
		WHERE id = $1
	`

	batch := &entity.Batch{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&batch.ID, &batch.ProductID, &batch.IndustryID, &batch.BatchCode,
		&batch.Height, &batch.Width, &batch.Thickness, &batch.QuantitySlabs,
		&batch.TotalArea, &batch.IndustryPrice, &batch.OriginQuarry,
		&batch.EntryDate, &batch.Status, &batch.IsActive,
		&batch.CreatedAt, &batch.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, errors.NewNotFoundError("Lote")
	}
	if err != nil {
		return nil, errors.DatabaseError(err)
	}

	return batch, nil
}

func (r *batchRepository) FindByIDForUpdate(ctx context.Context, tx *sql.Tx, id string) (*entity.Batch, error) {
	query := `
		SELECT id, product_id, industry_id, batch_code, height, width, thickness,
		       quantity_slabs, net_area, industry_price, origin_quarry, 
		       entry_date, status, is_active, created_at, updated_at
		FROM batches
		WHERE id = $1
		FOR UPDATE
	`

	batch := &entity.Batch{}
	err := tx.QueryRowContext(ctx, query, id).Scan(
		&batch.ID, &batch.ProductID, &batch.IndustryID, &batch.BatchCode,
		&batch.Height, &batch.Width, &batch.Thickness, &batch.QuantitySlabs,
		&batch.TotalArea, &batch.IndustryPrice, &batch.OriginQuarry,
		&batch.EntryDate, &batch.Status, &batch.IsActive,
		&batch.CreatedAt, &batch.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, errors.NewNotFoundError("Lote")
	}
	if err != nil {
		return nil, errors.DatabaseError(err)
	}

	return batch, nil
}

func (r *batchRepository) FindByProductID(ctx context.Context, productID string) ([]entity.Batch, error) {
	query := `
		SELECT id, product_id, industry_id, batch_code, height, width, thickness,
		       quantity_slabs, net_area, industry_price, origin_quarry, 
		       entry_date, status, is_active, created_at, updated_at
		FROM batches
		WHERE product_id = $1 AND is_active = TRUE
		ORDER BY entry_date DESC
	`

	rows, err := r.db.QueryContext(ctx, query, productID)
	if err != nil {
		return nil, errors.DatabaseError(err)
	}
	defer rows.Close()

	return r.scanBatches(rows)
}

func (r *batchRepository) FindByStatus(ctx context.Context, industryID string, status entity.BatchStatus) ([]entity.Batch, error) {
	query := `
		SELECT id, product_id, industry_id, batch_code, height, width, thickness,
		       quantity_slabs, net_area, industry_price, origin_quarry, 
		       entry_date, status, is_active, created_at, updated_at
		FROM batches
		WHERE industry_id = $1 AND status = $2 AND is_active = TRUE
		ORDER BY entry_date DESC
	`

	rows, err := r.db.QueryContext(ctx, query, industryID, status)
	if err != nil {
		return nil, errors.DatabaseError(err)
	}
	defer rows.Close()

	return r.scanBatches(rows)
}

func (r *batchRepository) FindAvailable(ctx context.Context, industryID string) ([]entity.Batch, error) {
	query := `
		SELECT id, product_id, industry_id, batch_code, height, width, thickness,
		       quantity_slabs, net_area, industry_price, origin_quarry, 
		       entry_date, status, is_active, created_at, updated_at
		FROM batches
		WHERE industry_id = $1 AND status = 'DISPONIVEL' AND is_active = TRUE
		ORDER BY entry_date DESC
	`

	rows, err := r.db.QueryContext(ctx, query, industryID)
	if err != nil {
		return nil, errors.DatabaseError(err)
	}
	defer rows.Close()

	return r.scanBatches(rows)
}

func (r *batchRepository) FindByCode(ctx context.Context, industryID, code string) ([]entity.Batch, error) {
	query := `
		SELECT id, product_id, industry_id, batch_code, height, width, thickness,
		       quantity_slabs, net_area, industry_price, origin_quarry, 
		       entry_date, status, is_active, created_at, updated_at
		FROM batches
		WHERE industry_id = $1 AND batch_code ILIKE $2 AND is_active = TRUE
		ORDER BY batch_code
	`

	search := "%" + code + "%"
	rows, err := r.db.QueryContext(ctx, query, industryID, search)
	if err != nil {
		return nil, errors.DatabaseError(err)
	}
	defer rows.Close()

	return r.scanBatches(rows)
}

func (r *batchRepository) List(ctx context.Context, industryID string, filters entity.BatchFilters) ([]entity.Batch, int, error) {
	psql := sq.StatementBuilder.PlaceholderFormat(sq.Dollar)

	query := psql.Select(
		"id", "product_id", "industry_id", "batch_code", "height", "width",
		"thickness", "quantity_slabs", "net_area", "industry_price",
		"origin_quarry", "entry_date", "status", "is_active", "created_at", "updated_at",
	).From("batches").
		Where(sq.Eq{"industry_id": industryID, "is_active": true})

	// Filtros
	if filters.ProductID != nil {
		query = query.Where(sq.Eq{"product_id": *filters.ProductID})
	}
	if filters.Status != nil {
		query = query.Where(sq.Eq{"status": *filters.Status})
	}
	if filters.Code != nil && *filters.Code != "" {
		query = query.Where("batch_code ILIKE ?", "%"+*filters.Code+"%")
	}

	// Contar total
	countQuery := psql.Select("COUNT(*)").From("batches").
		Where(sq.Eq{"industry_id": industryID, "is_active": true})

	if filters.ProductID != nil {
		countQuery = countQuery.Where(sq.Eq{"product_id": *filters.ProductID})
	}
	if filters.Status != nil {
		countQuery = countQuery.Where(sq.Eq{"status": *filters.Status})
	}
	if filters.Code != nil && *filters.Code != "" {
		countQuery = countQuery.Where("batch_code ILIKE ?", "%"+*filters.Code+"%")
	}

	countSQL, countArgs, _ := countQuery.ToSql()
	var total int
	if err := r.db.QueryRowContext(ctx, countSQL, countArgs...).Scan(&total); err != nil {
		return nil, 0, errors.DatabaseError(err)
	}

	// Paginação
	offset := (filters.Page - 1) * filters.Limit
	query = query.OrderBy("entry_date DESC").Limit(uint64(filters.Limit)).Offset(uint64(offset))

	sql, args, err := query.ToSql()
	if err != nil {
		return nil, 0, errors.DatabaseError(err)
	}

	rows, err := r.db.QueryContext(ctx, sql, args...)
	if err != nil {
		return nil, 0, errors.DatabaseError(err)
	}
	defer rows.Close()

	batches, err := r.scanBatches(rows)
	if err != nil {
		return nil, 0, err
	}

	return batches, total, nil
}

func (r *batchRepository) Update(ctx context.Context, batch *entity.Batch) error {
	query := `
		UPDATE batches
		SET batch_code = $1, height = $2, width = $3, thickness = $4,
		    quantity_slabs = $5, industry_price = $6, origin_quarry = $7,
		    updated_at = CURRENT_TIMESTAMP
		WHERE id = $8
		RETURNING updated_at, net_area
	`

	err := r.db.QueryRowContext(ctx, query,
		batch.BatchCode, batch.Height, batch.Width, batch.Thickness,
		batch.QuantitySlabs, batch.IndustryPrice, batch.OriginQuarry, batch.ID,
	).Scan(&batch.UpdatedAt, &batch.TotalArea)

	if err == sql.ErrNoRows {
		return errors.NewNotFoundError("Lote")
	}
	if err != nil {
		return errors.DatabaseError(err)
	}

	return nil
}

func (r *batchRepository) UpdateStatus(ctx context.Context, tx *sql.Tx, id string, status entity.BatchStatus) error {
	query := `
		UPDATE batches
		SET status = $1, updated_at = CURRENT_TIMESTAMP
		WHERE id = $2
	`

	var result sql.Result
	var err error

	if tx != nil {
		result, err = tx.ExecContext(ctx, query, status, id)
	} else {
		result, err = r.db.ExecContext(ctx, query, status, id)
	}

	if err != nil {
		return errors.DatabaseError(err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return errors.DatabaseError(err)
	}

	if rows == 0 {
		return errors.NewNotFoundError("Lote")
	}

	return nil
}

func (r *batchRepository) CountByStatus(ctx context.Context, industryID string, status entity.BatchStatus) (int, error) {
	query := `
		SELECT COUNT(*) 
		FROM batches 
		WHERE industry_id = $1 AND status = $2 AND is_active = TRUE
	`

	var count int
	err := r.db.QueryRowContext(ctx, query, industryID, status).Scan(&count)
	if err != nil {
		return 0, errors.DatabaseError(err)
	}

	return count, nil
}

func (r *batchRepository) ExistsByCode(ctx context.Context, industryID, code string) (bool, error) {
	query := `
		SELECT EXISTS(
			SELECT 1 FROM batches 
			WHERE industry_id = $1 AND batch_code = $2
		)
	`

	var exists bool
	err := r.db.QueryRowContext(ctx, query, industryID, code).Scan(&exists)
	if err != nil {
		return false, errors.DatabaseError(err)
	}

	return exists, nil
}

func (r *batchRepository) scanBatches(rows *sql.Rows) ([]entity.Batch, error) {
	batches := []entity.Batch{}
	for rows.Next() {
		var b entity.Batch
		if err := rows.Scan(
			&b.ID, &b.ProductID, &b.IndustryID, &b.BatchCode,
			&b.Height, &b.Width, &b.Thickness, &b.QuantitySlabs,
			&b.TotalArea, &b.IndustryPrice, &b.OriginQuarry,
			&b.EntryDate, &b.Status, &b.IsActive,
			&b.CreatedAt, &b.UpdatedAt,
		); err != nil {
			return nil, errors.DatabaseError(err)
		}
		batches = append(batches, b)
	}
	return batches, nil
}
```

---

### `.\internal\repository\db.go`

```go
package repository

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	_ "github.com/lib/pq"
	"go.uber.org/zap"
)

// DB encapsula a conexão com PostgreSQL
type DB struct {
	*sql.DB
	logger *zap.Logger
}

// Config contém configurações de conexão
type Config struct {
	Host            string
	Port            int
	User            string
	Password        string
	Database        string
	SSLMode         string
	MaxOpenConns    int
	MaxIdleConns    int
	ConnMaxLifetime time.Duration
}

// NewDB cria uma nova conexão com PostgreSQL
func NewDB(cfg *Config, logger *zap.Logger) (*DB, error) {
	dsn := fmt.Sprintf(
		"host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		cfg.Host, cfg.Port, cfg.User, cfg.Password, cfg.Database, cfg.SSLMode,
	)

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return nil, fmt.Errorf("erro ao abrir conexão: %w", err)
	}

	// Configurar pool
	db.SetMaxOpenConns(cfg.MaxOpenConns)
	db.SetMaxIdleConns(cfg.MaxIdleConns)
	db.SetConnMaxLifetime(cfg.ConnMaxLifetime)

	// Testar conexão
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := db.PingContext(ctx); err != nil {
		return nil, fmt.Errorf("erro ao pingar banco: %w", err)
	}

	logger.Info("conexão com PostgreSQL estabelecida",
		zap.String("host", cfg.Host),
		zap.Int("port", cfg.Port),
		zap.String("database", cfg.Database),
	)

	return &DB{DB: db, logger: logger}, nil
}

// Close fecha a conexão com o banco
func (db *DB) Close() error {
	db.logger.Info("fechando conexão com PostgreSQL")
	return db.DB.Close()
}

// BeginTx inicia uma transação
func (db *DB) BeginTx(ctx context.Context) (*sql.Tx, error) {
	tx, err := db.DB.BeginTx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("erro ao iniciar transação: %w", err)
	}
	return tx, nil
}

// ExecuteInTx executa função dentro de transação com rollback automático em erro
func (db *DB) ExecuteInTx(ctx context.Context, fn func(*sql.Tx) error) error {
	tx, err := db.BeginTx(ctx)
	if err != nil {
		return err
	}

	defer func() {
		if p := recover(); p != nil {
			_ = tx.Rollback()
			panic(p)
		}
	}()

	if err := fn(tx); err != nil {
		if rbErr := tx.Rollback(); rbErr != nil {
			db.logger.Error("erro ao fazer rollback", zap.Error(rbErr))
		}
		return err
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("erro ao commitar transação: %w", err)
	}

	return nil
}

// HealthCheck verifica saúde da conexão
func (db *DB) HealthCheck(ctx context.Context) error {
	ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()

	if err := db.PingContext(ctx); err != nil {
		return fmt.Errorf("healthcheck falhou: %w", err)
	}

	return nil
}
```

---

### `.\internal\repository\industry_repository.go`

```go
package repository

import (
	"context"
	"database/sql"

	"github.com/lib/pq"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
	"github.com/thiagomes07/CAVA/backend/internal/domain/errors"
)

type industryRepository struct {
	db *DB
}

func NewIndustryRepository(db *DB) *industryRepository {
	return &industryRepository{db: db}
}

func (r *industryRepository) Create(ctx context.Context, industry *entity.Industry) error {
	query := `
		INSERT INTO industries (id, name, cnpj, slug, contact_email, contact_phone, policy_terms)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING created_at, updated_at
	`

	err := r.db.QueryRowContext(ctx, query,
		industry.ID, industry.Name, industry.CNPJ, industry.Slug,
		industry.ContactEmail, industry.ContactPhone, industry.PolicyTerms,
	).Scan(&industry.CreatedAt, &industry.UpdatedAt)

	if err != nil {
		if pqErr, ok := err.(*pq.Error); ok {
			if pqErr.Code == "23505" { // unique_violation
				if pqErr.Constraint == "industries_cnpj_key" {
					return errors.NewConflictError("CNPJ já cadastrado")
				}
				if pqErr.Constraint == "industries_slug_key" {
					return errors.NewConflictError("Slug já em uso")
				}
			}
		}
		return errors.DatabaseError(err)
	}

	return nil
}

func (r *industryRepository) FindByID(ctx context.Context, id string) (*entity.Industry, error) {
	query := `
		SELECT id, name, cnpj, slug, contact_email, contact_phone, 
		       policy_terms, created_at, updated_at
		FROM industries
		WHERE id = $1
	`

	industry := &entity.Industry{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&industry.ID, &industry.Name, &industry.CNPJ, &industry.Slug,
		&industry.ContactEmail, &industry.ContactPhone, &industry.PolicyTerms,
		&industry.CreatedAt, &industry.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, errors.NewNotFoundError("Indústria")
	}
	if err != nil {
		return nil, errors.DatabaseError(err)
	}

	return industry, nil
}

func (r *industryRepository) FindBySlug(ctx context.Context, slug string) (*entity.Industry, error) {
	query := `
		SELECT id, name, cnpj, slug, contact_email, contact_phone, 
		       policy_terms, created_at, updated_at
		FROM industries
		WHERE slug = $1
	`

	industry := &entity.Industry{}
	err := r.db.QueryRowContext(ctx, query, slug).Scan(
		&industry.ID, &industry.Name, &industry.CNPJ, &industry.Slug,
		&industry.ContactEmail, &industry.ContactPhone, &industry.PolicyTerms,
		&industry.CreatedAt, &industry.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, errors.NewNotFoundError("Indústria")
	}
	if err != nil {
		return nil, errors.DatabaseError(err)
	}

	return industry, nil
}

func (r *industryRepository) FindByCNPJ(ctx context.Context, cnpj string) (*entity.Industry, error) {
	query := `
		SELECT id, name, cnpj, slug, contact_email, contact_phone, 
		       policy_terms, created_at, updated_at
		FROM industries
		WHERE cnpj = $1
	`

	industry := &entity.Industry{}
	err := r.db.QueryRowContext(ctx, query, cnpj).Scan(
		&industry.ID, &industry.Name, &industry.CNPJ, &industry.Slug,
		&industry.ContactEmail, &industry.ContactPhone, &industry.PolicyTerms,
		&industry.CreatedAt, &industry.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, errors.NewNotFoundError("Indústria")
	}
	if err != nil {
		return nil, errors.DatabaseError(err)
	}

	return industry, nil
}

func (r *industryRepository) Update(ctx context.Context, industry *entity.Industry) error {
	query := `
		UPDATE industries
		SET name = $1, contact_email = $2, contact_phone = $3, 
		    policy_terms = $4, updated_at = CURRENT_TIMESTAMP
		WHERE id = $5
		RETURNING updated_at
	`

	err := r.db.QueryRowContext(ctx, query,
		industry.Name, industry.ContactEmail, industry.ContactPhone,
		industry.PolicyTerms, industry.ID,
	).Scan(&industry.UpdatedAt)

	if err == sql.ErrNoRows {
		return errors.NewNotFoundError("Indústria")
	}
	if err != nil {
		return errors.DatabaseError(err)
	}

	return nil
}

func (r *industryRepository) ExistsBySlug(ctx context.Context, slug string) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM industries WHERE slug = $1)`

	var exists bool
	err := r.db.QueryRowContext(ctx, query, slug).Scan(&exists)
	if err != nil {
		return false, errors.DatabaseError(err)
	}

	return exists, nil
}

func (r *industryRepository) ExistsByCNPJ(ctx context.Context, cnpj string) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM industries WHERE cnpj = $1)`

	var exists bool
	err := r.db.QueryRowContext(ctx, query, cnpj).Scan(&exists)
	if err != nil {
		return false, errors.DatabaseError(err)
	}

	return exists, nil
}

func (r *industryRepository) List(ctx context.Context) ([]entity.Industry, error) {
	query := `
		SELECT id, name, cnpj, slug, contact_email, contact_phone, 
		       policy_terms, created_at, updated_at
		FROM industries
		ORDER BY name
	`

	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, errors.DatabaseError(err)
	}
	defer rows.Close()

	industries := []entity.Industry{}
	for rows.Next() {
		var ind entity.Industry
		if err := rows.Scan(
			&ind.ID, &ind.Name, &ind.CNPJ, &ind.Slug,
			&ind.ContactEmail, &ind.ContactPhone, &ind.PolicyTerms,
			&ind.CreatedAt, &ind.UpdatedAt,
		); err != nil {
			return nil, errors.DatabaseError(err)
		}
		industries = append(industries, ind)
	}

	return industries, nil
}
```

---

### `.\internal\repository\lead_interaction_repository.go`

```go
package repository

import (
	"context"
	"database/sql"

	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
	"github.com/thiagomes07/CAVA/backend/internal/domain/errors"
)

type leadInteractionRepository struct {
	db *DB
}

func NewLeadInteractionRepository(db *DB) *leadInteractionRepository {
	return &leadInteractionRepository{db: db}
}

func (r *leadInteractionRepository) Create(ctx context.Context, tx *sql.Tx, interaction *entity.LeadInteraction) error {
	query := `
		INSERT INTO lead_interactions (
			id, lead_id, sales_link_id, target_batch_id, target_product_id,
			message, interaction_type
		) VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING created_at
	`

	var err error
	if tx != nil {
		err = tx.QueryRowContext(ctx, query,
			interaction.ID, interaction.LeadID, interaction.SalesLinkID,
			interaction.TargetBatchID, interaction.TargetProductID,
			interaction.Message, interaction.InteractionType,
		).Scan(&interaction.CreatedAt)
	} else {
		err = r.db.QueryRowContext(ctx, query,
			interaction.ID, interaction.LeadID, interaction.SalesLinkID,
			interaction.TargetBatchID, interaction.TargetProductID,
			interaction.Message, interaction.InteractionType,
		).Scan(&interaction.CreatedAt)
	}

	if err != nil {
		return errors.DatabaseError(err)
	}

	return nil
}

func (r *leadInteractionRepository) FindByLeadID(ctx context.Context, leadID string) ([]entity.LeadInteraction, error) {
	query := `
		SELECT id, lead_id, sales_link_id, target_batch_id, target_product_id,
		       message, interaction_type, created_at
		FROM lead_interactions
		WHERE lead_id = $1
		ORDER BY created_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query, leadID)
	if err != nil {
		return nil, errors.DatabaseError(err)
	}
	defer rows.Close()

	return r.scanInteractions(rows)
}

func (r *leadInteractionRepository) FindBySalesLinkID(ctx context.Context, salesLinkID string) ([]entity.LeadInteraction, error) {
	query := `
		SELECT id, lead_id, sales_link_id, target_batch_id, target_product_id,
		       message, interaction_type, created_at
		FROM lead_interactions
		WHERE sales_link_id = $1
		ORDER BY created_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query, salesLinkID)
	if err != nil {
		return nil, errors.DatabaseError(err)
	}
	defer rows.Close()

	return r.scanInteractions(rows)
}

func (r *leadInteractionRepository) FindByID(ctx context.Context, id string) (*entity.LeadInteraction, error) {
	query := `
		SELECT id, lead_id, sales_link_id, target_batch_id, target_product_id,
		       message, interaction_type, created_at
		FROM lead_interactions
		WHERE id = $1
	`

	interaction := &entity.LeadInteraction{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&interaction.ID, &interaction.LeadID, &interaction.SalesLinkID,
		&interaction.TargetBatchID, &interaction.TargetProductID,
		&interaction.Message, &interaction.InteractionType, &interaction.CreatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, errors.NewNotFoundError("Interação")
	}
	if err != nil {
		return nil, errors.DatabaseError(err)
	}

	return interaction, nil
}

func (r *leadInteractionRepository) scanInteractions(rows *sql.Rows) ([]entity.LeadInteraction, error) {
	interactions := []entity.LeadInteraction{}
	for rows.Next() {
		var i entity.LeadInteraction
		if err := rows.Scan(
			&i.ID, &i.LeadID, &i.SalesLinkID, &i.TargetBatchID,
			&i.TargetProductID, &i.Message, &i.InteractionType, &i.CreatedAt,
		); err != nil {
			return nil, errors.DatabaseError(err)
		}
		interactions = append(interactions, i)
	}
	return interactions, nil
}
```

---

### `.\internal\repository\lead_repository.go`

```go
package repository

import (
	"context"
	"database/sql"
	"time"

	sq "github.com/Masterminds/squirrel"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
	"github.com/thiagomes07/CAVA/backend/internal/domain/errors"
)

type leadRepository struct {
	db *DB
}

func NewLeadRepository(db *DB) *leadRepository {
	return &leadRepository{db: db}
}

func (r *leadRepository) Create(ctx context.Context, tx *sql.Tx, lead *entity.Lead) error {
	query := `
		INSERT INTO leads (
			id, sales_link_id, name, contact, message, marketing_opt_in, status
		) VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING created_at, updated_at, last_interaction
	`

	var err error
	if tx != nil {
		err = tx.QueryRowContext(ctx, query,
			lead.ID, lead.SalesLinkID, lead.Name, lead.Contact,
			lead.Message, lead.MarketingOptIn, lead.Status,
		).Scan(&lead.CreatedAt, &lead.UpdatedAt, &lead.UpdatedAt)
	} else {
		err = r.db.QueryRowContext(ctx, query,
			lead.ID, lead.SalesLinkID, lead.Name, lead.Contact,
			lead.Message, lead.MarketingOptIn, lead.Status,
		).Scan(&lead.CreatedAt, &lead.UpdatedAt, &lead.UpdatedAt)
	}

	if err != nil {
		return errors.DatabaseError(err)
	}

	return nil
}

func (r *leadRepository) FindByID(ctx context.Context, id string) (*entity.Lead, error) {
	query := `
		SELECT id, sales_link_id, name, contact, message, marketing_opt_in,
		       status, created_at, updated_at
		FROM leads
		WHERE id = $1
	`

	lead := &entity.Lead{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&lead.ID, &lead.SalesLinkID, &lead.Name, &lead.Contact,
		&lead.Message, &lead.MarketingOptIn, &lead.Status,
		&lead.CreatedAt, &lead.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, errors.NewNotFoundError("Lead")
	}
	if err != nil {
		return nil, errors.DatabaseError(err)
	}

	return lead, nil
}

func (r *leadRepository) FindByContact(ctx context.Context, contact string) (*entity.Lead, error) {
	query := `
		SELECT id, sales_link_id, name, contact, message, marketing_opt_in,
		       status, created_at, updated_at
		FROM leads
		WHERE contact = $1
		ORDER BY created_at DESC
		LIMIT 1
	`

	lead := &entity.Lead{}
	err := r.db.QueryRowContext(ctx, query, contact).Scan(
		&lead.ID, &lead.SalesLinkID, &lead.Name, &lead.Contact,
		&lead.Message, &lead.MarketingOptIn, &lead.Status,
		&lead.CreatedAt, &lead.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, errors.NewNotFoundError("Lead")
	}
	if err != nil {
		return nil, errors.DatabaseError(err)
	}

	return lead, nil
}

func (r *leadRepository) FindBySalesLinkID(ctx context.Context, salesLinkID string) ([]entity.Lead, error) {
	query := `
		SELECT id, sales_link_id, name, contact, message, marketing_opt_in,
		       status, created_at, updated_at
		FROM leads
		WHERE sales_link_id = $1
		ORDER BY created_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query, salesLinkID)
	if err != nil {
		return nil, errors.DatabaseError(err)
	}
	defer rows.Close()

	return r.scanLeads(rows)
}

func (r *leadRepository) List(ctx context.Context, filters entity.LeadFilters) ([]entity.Lead, int, error) {
	psql := sq.StatementBuilder.PlaceholderFormat(sq.Dollar)

	query := psql.Select(
		"id", "sales_link_id", "name", "contact", "message",
		"marketing_opt_in", "status", "created_at", "updated_at",
	).From("leads")

	if filters.LinkID != nil {
		query = query.Where(sq.Eq{"sales_link_id": *filters.LinkID})
	}

	if filters.Status != nil {
		query = query.Where(sq.Eq{"status": *filters.Status})
	}

	if filters.OptIn != nil {
		query = query.Where(sq.Eq{"marketing_opt_in": *filters.OptIn})
	}

	if filters.Search != nil && *filters.Search != "" {
		search := "%" + *filters.Search + "%"
		query = query.Where(sq.Or{
			sq.ILike{"name": search},
			sq.ILike{"contact": search},
		})
	}

	if filters.StartDate != nil {
		startDate, err := time.Parse(time.RFC3339, *filters.StartDate)
		if err == nil {
			query = query.Where(sq.GtOrEq{"created_at": startDate})
		}
	}

	if filters.EndDate != nil {
		endDate, err := time.Parse(time.RFC3339, *filters.EndDate)
		if err == nil {
			query = query.Where(sq.LtOrEq{"created_at": endDate})
		}
	}

	// Count
	countQuery := psql.Select("COUNT(*)").From("leads")
	if filters.LinkID != nil {
		countQuery = countQuery.Where(sq.Eq{"sales_link_id": *filters.LinkID})
	}
	if filters.Status != nil {
		countQuery = countQuery.Where(sq.Eq{"status": *filters.Status})
	}
	if filters.OptIn != nil {
		countQuery = countQuery.Where(sq.Eq{"marketing_opt_in": *filters.OptIn})
	}
	if filters.Search != nil && *filters.Search != "" {
		search := "%" + *filters.Search + "%"
		countQuery = countQuery.Where(sq.Or{
			sq.ILike{"name": search},
			sq.ILike{"contact": search},
		})
	}
	if filters.StartDate != nil {
		startDate, err := time.Parse(time.RFC3339, *filters.StartDate)
		if err == nil {
			countQuery = countQuery.Where(sq.GtOrEq{"created_at": startDate})
		}
	}
	if filters.EndDate != nil {
		endDate, err := time.Parse(time.RFC3339, *filters.EndDate)
		if err == nil {
			countQuery = countQuery.Where(sq.LtOrEq{"created_at": endDate})
		}
	}

	countSQL, countArgs, _ := countQuery.ToSql()
	var total int
	if err := r.db.QueryRowContext(ctx, countSQL, countArgs...).Scan(&total); err != nil {
		return nil, 0, errors.DatabaseError(err)
	}

	// Pagination
	offset := (filters.Page - 1) * filters.Limit
	query = query.OrderBy("created_at DESC").Limit(uint64(filters.Limit)).Offset(uint64(offset))

	sql, args, err := query.ToSql()
	if err != nil {
		return nil, 0, errors.DatabaseError(err)
	}

	rows, err := r.db.QueryContext(ctx, sql, args...)
	if err != nil {
		return nil, 0, errors.DatabaseError(err)
	}
	defer rows.Close()

	leads, err := r.scanLeads(rows)
	if err != nil {
		return nil, 0, err
	}

	return leads, total, nil
}

func (r *leadRepository) Update(ctx context.Context, tx *sql.Tx, lead *entity.Lead) error {
	query := `
		UPDATE leads
		SET name = $1, contact = $2, message = $3, marketing_opt_in = $4,
		    status = $5, updated_at = CURRENT_TIMESTAMP
		WHERE id = $6
		RETURNING updated_at
	`

	var err error
	if tx != nil {
		err = tx.QueryRowContext(ctx, query,
			lead.Name, lead.Contact, lead.Message, lead.MarketingOptIn,
			lead.Status, lead.ID,
		).Scan(&lead.UpdatedAt)
	} else {
		err = r.db.QueryRowContext(ctx, query,
			lead.Name, lead.Contact, lead.Message, lead.MarketingOptIn,
			lead.Status, lead.ID,
		).Scan(&lead.UpdatedAt)
	}

	if err == sql.ErrNoRows {
		return errors.NewNotFoundError("Lead")
	}
	if err != nil {
		return errors.DatabaseError(err)
	}

	return nil
}

func (r *leadRepository) UpdateStatus(ctx context.Context, id string, status entity.LeadStatus) error {
	query := `
		UPDATE leads
		SET status = $1, updated_at = CURRENT_TIMESTAMP
		WHERE id = $2
	`

	result, err := r.db.ExecContext(ctx, query, status, id)
	if err != nil {
		return errors.DatabaseError(err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return errors.DatabaseError(err)
	}

	if rows == 0 {
		return errors.NewNotFoundError("Lead")
	}

	return nil
}

func (r *leadRepository) UpdateLastInteraction(ctx context.Context, tx *sql.Tx, id string) error {
	query := `
		UPDATE leads
		SET last_interaction = CURRENT_TIMESTAMP
		WHERE id = $1
	`

	var err error
	if tx != nil {
		_, err = tx.ExecContext(ctx, query, id)
	} else {
		_, err = r.db.ExecContext(ctx, query, id)
	}

	if err != nil {
		return errors.DatabaseError(err)
	}

	return nil
}

func (r *leadRepository) CountByIndustry(ctx context.Context, industryID string) (int, error) {
	query := `
		SELECT COUNT(DISTINCT l.id)
		FROM leads l
		INNER JOIN sales_links sl ON l.sales_link_id = sl.id
		WHERE sl.industry_id = $1
	`

	var count int
	err := r.db.QueryRowContext(ctx, query, industryID).Scan(&count)
	if err != nil {
		return 0, errors.DatabaseError(err)
	}

	return count, nil
}

func (r *leadRepository) scanLeads(rows *sql.Rows) ([]entity.Lead, error) {
	leads := []entity.Lead{}
	for rows.Next() {
		var l entity.Lead
		if err := rows.Scan(
			&l.ID, &l.SalesLinkID, &l.Name, &l.Contact, &l.Message,
			&l.MarketingOptIn, &l.Status, &l.CreatedAt, &l.UpdatedAt,
		); err != nil {
			return nil, errors.DatabaseError(err)
		}
		leads = append(leads, l)
	}
	return leads, nil
}
```

---

### `.\internal\repository\media_repository.go`

```go
package repository

import (
	"context"
	"database/sql"

	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
	"github.com/thiagomes07/CAVA/backend/internal/domain/errors"
)

type mediaRepository struct {
	db *DB
}

func NewMediaRepository(db *DB) *mediaRepository {
	return &mediaRepository{db: db}
}

func (r *mediaRepository) CreateProductMedia(ctx context.Context, productID string, media *entity.CreateMediaInput) error {
	query := `
		INSERT INTO product_medias (id, product_id, url, display_order, is_cover)
		VALUES (gen_random_uuid(), $1, $2, $3, $4)
	`

	_, err := r.db.ExecContext(ctx, query,
		productID, media.URL, media.DisplayOrder, media.IsCover,
	)

	if err != nil {
		return errors.DatabaseError(err)
	}

	return nil
}

func (r *mediaRepository) CreateBatchMedia(ctx context.Context, batchID string, media *entity.CreateMediaInput) error {
	query := `
		INSERT INTO batch_medias (id, batch_id, url, display_order)
		VALUES (gen_random_uuid(), $1, $2, $3)
	`

	_, err := r.db.ExecContext(ctx, query,
		batchID, media.URL, media.DisplayOrder,
	)

	if err != nil {
		return errors.DatabaseError(err)
	}

	return nil
}

func (r *mediaRepository) FindProductMedias(ctx context.Context, productID string) ([]entity.Media, error) {
	query := `
		SELECT id, url, display_order, is_cover, created_at
		FROM product_medias
		WHERE product_id = $1
		ORDER BY display_order, created_at
	`

	rows, err := r.db.QueryContext(ctx, query, productID)
	if err != nil {
		return nil, errors.DatabaseError(err)
	}
	defer rows.Close()

	medias := []entity.Media{}
	for rows.Next() {
		var m entity.Media
		if err := rows.Scan(
			&m.ID, &m.URL, &m.DisplayOrder, &m.IsCover, &m.CreatedAt,
		); err != nil {
			return nil, errors.DatabaseError(err)
		}
		medias = append(medias, m)
	}

	return medias, nil
}

func (r *mediaRepository) FindBatchMedias(ctx context.Context, batchID string) ([]entity.Media, error) {
	query := `
		SELECT id, url, display_order, created_at
		FROM batch_medias
		WHERE batch_id = $1
		ORDER BY display_order, created_at
	`

	rows, err := r.db.QueryContext(ctx, query, batchID)
	if err != nil {
		return nil, errors.DatabaseError(err)
	}
	defer rows.Close()

	medias := []entity.Media{}
	for rows.Next() {
		var m entity.Media
		m.IsCover = false // batch_medias não tem is_cover
		if err := rows.Scan(
			&m.ID, &m.URL, &m.DisplayOrder, &m.CreatedAt,
		); err != nil {
			return nil, errors.DatabaseError(err)
		}
		medias = append(medias, m)
	}

	return medias, nil
}

func (r *mediaRepository) DeleteProductMedia(ctx context.Context, id string) error {
	query := `DELETE FROM product_medias WHERE id = $1`

	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return errors.DatabaseError(err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return errors.DatabaseError(err)
	}

	if rows == 0 {
		return errors.NewNotFoundError("Mídia")
	}

	return nil
}

func (r *mediaRepository) DeleteBatchMedia(ctx context.Context, id string) error {
	query := `DELETE FROM batch_medias WHERE id = $1`

	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return errors.DatabaseError(err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return errors.DatabaseError(err)
	}

	if rows == 0 {
		return errors.NewNotFoundError("Mídia")
	}

	return nil
}

func (r *mediaRepository) UpdateDisplayOrder(ctx context.Context, id string, order int) error {
	query := `
		UPDATE product_medias 
		SET display_order = $1 
		WHERE id = $2
	`

	result, err := r.db.ExecContext(ctx, query, order, id)
	if err != nil {
		return errors.DatabaseError(err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return errors.DatabaseError(err)
	}

	if rows == 0 {
		// Tentar batch_medias
		query = `
			UPDATE batch_medias 
			SET display_order = $1 
			WHERE id = $2
		`
		result, err = r.db.ExecContext(ctx, query, order, id)
		if err != nil {
			return errors.DatabaseError(err)
		}

		rows, err = result.RowsAffected()
		if err != nil {
			return errors.DatabaseError(err)
		}

		if rows == 0 {
			return errors.NewNotFoundError("Mídia")
		}
	}

	return nil
}

func (r *mediaRepository) SetCover(ctx context.Context, productID, mediaID string) error {
	return r.db.ExecuteInTx(ctx, func(tx *sql.Tx) error {
		// Remover flag is_cover de todas as mídias do produto
		query1 := `
			UPDATE product_medias 
			SET is_cover = FALSE 
			WHERE product_id = $1
		`
		if _, err := tx.ExecContext(ctx, query1, productID); err != nil {
			return errors.DatabaseError(err)
		}

		// Setar nova capa
		query2 := `
			UPDATE product_medias 
			SET is_cover = TRUE 
			WHERE id = $1 AND product_id = $2
		`
		result, err := tx.ExecContext(ctx, query2, mediaID, productID)
		if err != nil {
			return errors.DatabaseError(err)
		}

		rows, err := result.RowsAffected()
		if err != nil {
			return errors.DatabaseError(err)
		}

		if rows == 0 {
			return errors.NewNotFoundError("Mídia")
		}

		return nil
	})
}
```

---

### `.\internal\repository\product_repository.go`

```go
package repository

import (
	"context"
	"database/sql"
	"fmt"

	sq "github.com/Masterminds/squirrel"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
	"github.com/thiagomes07/CAVA/backend/internal/domain/errors"
)

type productRepository struct {
	db *DB
}

func NewProductRepository(db *DB) *productRepository {
	return &productRepository{db: db}
}

func (r *productRepository) Create(ctx context.Context, product *entity.Product) error {
	query := `
		INSERT INTO products (id, industry_id, name, sku_code, description, 
		                      material_type, finish_type, is_public_catalog)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING created_at, updated_at
	`

	err := r.db.QueryRowContext(ctx, query,
		product.ID, product.IndustryID, product.Name, product.SKU,
		product.Description, product.Material, product.Finish, product.IsPublic,
	).Scan(&product.CreatedAt, &product.UpdatedAt)

	if err != nil {
		return errors.DatabaseError(err)
	}

	return nil
}

func (r *productRepository) FindByID(ctx context.Context, id string) (*entity.Product, error) {
	query := `
		SELECT id, industry_id, name, sku_code, description, material_type, 
		       finish_type, is_public_catalog, created_at, updated_at
		FROM products
		WHERE id = $1 AND deleted_at IS NULL
	`

	product := &entity.Product{IsActive: true}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&product.ID, &product.IndustryID, &product.Name, &product.SKU,
		&product.Description, &product.Material, &product.Finish,
		&product.IsPublic, &product.CreatedAt, &product.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, errors.NewNotFoundError("Produto")
	}
	if err != nil {
		return nil, errors.DatabaseError(err)
	}

	return product, nil
}

func (r *productRepository) FindByIndustryID(ctx context.Context, industryID string, filters entity.ProductFilters) ([]entity.Product, int, error) {
	psql := sq.StatementBuilder.PlaceholderFormat(sq.Dollar)

	// Query principal
	query := psql.Select(
		"p.id", "p.industry_id", "p.name", "p.sku_code", "p.description",
		"p.material_type", "p.finish_type", "p.is_public_catalog",
		"p.created_at", "p.updated_at",
		"COALESCE(COUNT(b.id), 0) as batch_count",
	).From("products p").
		LeftJoin("batches b ON p.id = b.product_id AND b.is_active = TRUE").
		Where(sq.Eq{"p.industry_id": industryID}).
		GroupBy("p.id")

	// Filtro de ativo/inativo
	if !filters.IncludeInactive {
		query = query.Where("p.deleted_at IS NULL")
	}

	// Filtro de material
	if filters.Material != nil {
		query = query.Where(sq.Eq{"p.material_type": *filters.Material})
	}

	// Filtro de busca
	if filters.Search != nil && *filters.Search != "" {
		search := "%" + *filters.Search + "%"
		query = query.Where("p.name ILIKE ?", search)
	}

	// Contar total
	countQuery := psql.Select("COUNT(DISTINCT p.id)").
		From("products p").
		Where(sq.Eq{"p.industry_id": industryID})

	if !filters.IncludeInactive {
		countQuery = countQuery.Where("p.deleted_at IS NULL")
	}
	if filters.Material != nil {
		countQuery = countQuery.Where(sq.Eq{"p.material_type": *filters.Material})
	}
	if filters.Search != nil && *filters.Search != "" {
		search := "%" + *filters.Search + "%"
		countQuery = countQuery.Where("p.name ILIKE ?", search)
	}

	countSQL, countArgs, _ := countQuery.ToSql()
	var total int
	if err := r.db.QueryRowContext(ctx, countSQL, countArgs...).Scan(&total); err != nil {
		return nil, 0, errors.DatabaseError(err)
	}

	// Paginação
	offset := (filters.Page - 1) * filters.Limit
	query = query.OrderBy("p.created_at DESC").Limit(uint64(filters.Limit)).Offset(uint64(offset))

	sql, args, err := query.ToSql()
	if err != nil {
		return nil, 0, errors.DatabaseError(err)
	}

	rows, err := r.db.QueryContext(ctx, sql, args...)
	if err != nil {
		return nil, 0, errors.DatabaseError(err)
	}
	defer rows.Close()

	products := []entity.Product{}
	for rows.Next() {
		var p entity.Product
		var batchCount int
		if err := rows.Scan(
			&p.ID, &p.IndustryID, &p.Name, &p.SKU, &p.Description,
			&p.Material, &p.Finish, &p.IsPublic,
			&p.CreatedAt, &p.UpdatedAt, &batchCount,
		); err != nil {
			return nil, 0, errors.DatabaseError(err)
		}
		p.BatchCount = &batchCount
		p.IsActive = true
		products = append(products, p)
	}

	return products, total, nil
}

func (r *productRepository) Update(ctx context.Context, product *entity.Product) error {
	query := `
		UPDATE products
		SET name = $1, sku_code = $2, description = $3, 
		    material_type = $4, finish_type = $5, is_public_catalog = $6,
		    updated_at = CURRENT_TIMESTAMP
		WHERE id = $7 AND deleted_at IS NULL
		RETURNING updated_at
	`

	err := r.db.QueryRowContext(ctx, query,
		product.Name, product.SKU, product.Description,
		product.Material, product.Finish, product.IsPublic, product.ID,
	).Scan(&product.UpdatedAt)

	if err == sql.ErrNoRows {
		return errors.NewNotFoundError("Produto")
	}
	if err != nil {
		return errors.DatabaseError(err)
	}

	return nil
}

func (r *productRepository) SoftDelete(ctx context.Context, id string) error {
	query := `
		UPDATE products
		SET deleted_at = CURRENT_TIMESTAMP
		WHERE id = $1 AND deleted_at IS NULL
	`

	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return errors.DatabaseError(err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return errors.DatabaseError(err)
	}

	if rows == 0 {
		return errors.NewNotFoundError("Produto")
	}

	return nil
}

func (r *productRepository) CountBatchesByProductID(ctx context.Context, productID string) (int, error) {
	query := `
		SELECT COUNT(*) 
		FROM batches 
		WHERE product_id = $1 AND is_active = TRUE
	`

	var count int
	err := r.db.QueryRowContext(ctx, query, productID).Scan(&count)
	if err != nil {
		return 0, errors.DatabaseError(err)
	}

	return count, nil
}

func (r *productRepository) ExistsBySKU(ctx context.Context, industryID, sku string) (bool, error) {
	query := `
		SELECT EXISTS(
			SELECT 1 FROM products 
			WHERE industry_id = $1 AND sku_code = $2 AND deleted_at IS NULL
		)
	`

	var exists bool
	err := r.db.QueryRowContext(ctx, query, industryID, sku).Scan(&exists)
	if err != nil {
		return false, errors.DatabaseError(err)
	}

	return exists, nil
}
```

---

### `.\internal\repository\reservation_repository.go`

```go
package repository

import (
	"context"
	"database/sql"
	"time"

	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
	"github.com/thiagomes07/CAVA/backend/internal/domain/errors"
)

type reservationRepository struct {
	db *DB
}

func NewReservationRepository(db *DB) *reservationRepository {
	return &reservationRepository{db: db}
}

func (r *reservationRepository) Create(ctx context.Context, tx *sql.Tx, reservation *entity.Reservation) error {
	query := `
		INSERT INTO reservations (
			id, batch_id, reserved_by_user_id, lead_id, status, notes, expires_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING created_at
	`

	err := tx.QueryRowContext(ctx, query,
		reservation.ID, reservation.BatchID, reservation.ReservedByUserID,
		reservation.LeadID, reservation.Status, reservation.Notes,
		reservation.ExpiresAt,
	).Scan(&reservation.CreatedAt)

	if err != nil {
		return errors.DatabaseError(err)
	}

	return nil
}

func (r *reservationRepository) FindByID(ctx context.Context, id string) (*entity.Reservation, error) {
	query := `
		SELECT id, batch_id, reserved_by_user_id, lead_id, status, notes,
		       expires_at, created_at, is_active
		FROM reservations
		WHERE id = $1
	`

	res := &entity.Reservation{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&res.ID, &res.BatchID, &res.ReservedByUserID, &res.LeadID,
		&res.Status, &res.Notes, &res.ExpiresAt, &res.CreatedAt, &res.IsActive,
	)

	if err == sql.ErrNoRows {
		return nil, errors.NewNotFoundError("Reserva")
	}
	if err != nil {
		return nil, errors.DatabaseError(err)
	}

	return res, nil
}

func (r *reservationRepository) FindByBatchID(ctx context.Context, batchID string) ([]entity.Reservation, error) {
	query := `
		SELECT id, batch_id, reserved_by_user_id, lead_id, status, notes,
		       expires_at, created_at, is_active
		FROM reservations
		WHERE batch_id = $1
		ORDER BY created_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query, batchID)
	if err != nil {
		return nil, errors.DatabaseError(err)
	}
	defer rows.Close()

	return r.scanReservations(rows)
}

func (r *reservationRepository) FindActive(ctx context.Context, userID string) ([]entity.Reservation, error) {
	query := `
		SELECT id, batch_id, reserved_by_user_id, lead_id, status, notes,
		       expires_at, created_at, is_active
		FROM reservations
		WHERE reserved_by_user_id = $1 
		  AND status = 'ATIVA'
		  AND is_active = TRUE
		  AND expires_at > CURRENT_TIMESTAMP
		ORDER BY expires_at ASC
	`

	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, errors.DatabaseError(err)
	}
	defer rows.Close()

	return r.scanReservations(rows)
}

func (r *reservationRepository) FindExpired(ctx context.Context) ([]entity.Reservation, error) {
	query := `
		SELECT id, batch_id, reserved_by_user_id, lead_id, status, notes,
		       expires_at, created_at, is_active
		FROM reservations
		WHERE status = 'ATIVA'
		  AND expires_at < CURRENT_TIMESTAMP
		ORDER BY expires_at ASC
	`

	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, errors.DatabaseError(err)
	}
	defer rows.Close()

	return r.scanReservations(rows)
}

func (r *reservationRepository) Update(ctx context.Context, reservation *entity.Reservation) error {
	query := `
		UPDATE reservations
		SET notes = $1, expires_at = $2, status = $3
		WHERE id = $4
	`

	result, err := r.db.ExecContext(ctx, query,
		reservation.Notes, reservation.ExpiresAt, reservation.Status, reservation.ID,
	)
	if err != nil {
		return errors.DatabaseError(err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return errors.DatabaseError(err)
	}

	if rows == 0 {
		return errors.NewNotFoundError("Reserva")
	}

	return nil
}

func (r *reservationRepository) UpdateStatus(ctx context.Context, tx *sql.Tx, id string, status entity.ReservationStatus) error {
	query := `
		UPDATE reservations
		SET status = $1
		WHERE id = $2
	`

	var result sql.Result
	var err error

	if tx != nil {
		result, err = tx.ExecContext(ctx, query, status, id)
	} else {
		result, err = r.db.ExecContext(ctx, query, status, id)
	}

	if err != nil {
		return errors.DatabaseError(err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return errors.DatabaseError(err)
	}

	if rows == 0 {
		return errors.NewNotFoundError("Reserva")
	}

	return nil
}

func (r *reservationRepository) Cancel(ctx context.Context, tx *sql.Tx, id string) error {
	query := `
		UPDATE reservations
		SET status = 'CANCELADA', is_active = FALSE
		WHERE id = $1
	`

	var result sql.Result
	var err error

	if tx != nil {
		result, err = tx.ExecContext(ctx, query, id)
	} else {
		result, err = r.db.ExecContext(ctx, query, id)
	}

	if err != nil {
		return errors.DatabaseError(err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return errors.DatabaseError(err)
	}

	if rows == 0 {
		return errors.NewNotFoundError("Reserva")
	}

	return nil
}

func (r *reservationRepository) List(ctx context.Context, filters entity.ReservationFilters) ([]entity.Reservation, error) {
	query := `
		SELECT id, batch_id, reserved_by_user_id, lead_id, status, notes,
		       expires_at, created_at, is_active
		FROM reservations
		WHERE 1=1
	`
	args := []interface{}{}
	argCount := 1

	if filters.BatchID != nil {
		query += ` AND batch_id = $` + string(rune('0'+argCount))
		args = append(args, *filters.BatchID)
		argCount++
	}

	if filters.Status != nil {
		query += ` AND status = $` + string(rune('0'+argCount))
		args = append(args, *filters.Status)
		argCount++
	}

	// Paginação
	offset := (filters.Page - 1) * filters.Limit
	query += ` ORDER BY created_at DESC`
	query += ` LIMIT $` + string(rune('0'+argCount))
	args = append(args, filters.Limit)
	argCount++
	query += ` OFFSET $` + string(rune('0'+argCount))
	args = append(args, offset)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, errors.DatabaseError(err)
	}
	defer rows.Close()

	return r.scanReservations(rows)
}

func (r *reservationRepository) scanReservations(rows *sql.Rows) ([]entity.Reservation, error) {
	reservations := []entity.Reservation{}
	for rows.Next() {
		var res entity.Reservation
		if err := rows.Scan(
			&res.ID, &res.BatchID, &res.ReservedByUserID, &res.LeadID,
			&res.Status, &res.Notes, &res.ExpiresAt, &res.CreatedAt, &res.IsActive,
		); err != nil {
			return nil, errors.DatabaseError(err)
		}
		reservations = append(reservations, res)
	}
	return reservations, nil
}
```

---

### `.\internal\repository\sales_history_repository.go`

```go
package repository

import (
	"context"
	"database/sql"
	"time"

	sq "github.com/Masterminds/squirrel"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
	"github.com/thiagomes07/CAVA/backend/internal/domain/errors"
)

type salesHistoryRepository struct {
	db *DB
}

func NewSalesHistoryRepository(db *DB) *salesHistoryRepository {
	return &salesHistoryRepository{db: db}
}

func (r *salesHistoryRepository) Create(ctx context.Context, tx *sql.Tx, sale *entity.Sale) error {
	query := `
		INSERT INTO sales_history (
			id, batch_id, sold_by_user_id, industry_id, lead_id,
			customer_name, customer_contact, sale_price, broker_commission,
			net_industry_value, invoice_url, notes, sold_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		RETURNING created_at
	`

	err := tx.QueryRowContext(ctx, query,
		sale.ID, sale.BatchID, sale.SoldByUserID, sale.IndustryID, sale.LeadID,
		sale.CustomerName, sale.CustomerContact, sale.SalePrice,
		sale.BrokerCommission, sale.NetIndustryValue, sale.InvoiceURL,
		sale.Notes, sale.SaleDate,
	).Scan(&sale.CreatedAt)

	if err != nil {
		return errors.DatabaseError(err)
	}

	return nil
}

func (r *salesHistoryRepository) FindByID(ctx context.Context, id string) (*entity.Sale, error) {
	query := `
		SELECT id, batch_id, sold_by_user_id, industry_id, lead_id,
		       customer_name, customer_contact, sale_price, broker_commission,
		       net_industry_value, invoice_url, notes, sold_at, created_at
		FROM sales_history
		WHERE id = $1
	`

	sale := &entity.Sale{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&sale.ID, &sale.BatchID, &sale.SoldByUserID, &sale.IndustryID, &sale.LeadID,
		&sale.CustomerName, &sale.CustomerContact, &sale.SalePrice,
		&sale.BrokerCommission, &sale.NetIndustryValue, &sale.InvoiceURL,
		&sale.Notes, &sale.SaleDate, &sale.CreatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, errors.NewNotFoundError("Venda")
	}
	if err != nil {
		return nil, errors.DatabaseError(err)
	}

	return sale, nil
}

func (r *salesHistoryRepository) FindBySellerID(ctx context.Context, sellerID string, filters entity.SaleFilters) ([]entity.Sale, int, error) {
	return r.listWithFilters(ctx, &sellerID, nil, filters)
}

func (r *salesHistoryRepository) FindByIndustryID(ctx context.Context, industryID string, filters entity.SaleFilters) ([]entity.Sale, int, error) {
	return r.listWithFilters(ctx, nil, &industryID, filters)
}

func (r *salesHistoryRepository) FindByBrokerID(ctx context.Context, brokerID string, limit int) ([]entity.Sale, error) {
	query := `
		SELECT id, batch_id, sold_by_user_id, industry_id, lead_id,
		       customer_name, customer_contact, sale_price, broker_commission,
		       net_industry_value, invoice_url, notes, sold_at, created_at
		FROM sales_history
		WHERE sold_by_user_id = $1
		ORDER BY sold_at DESC
		LIMIT $2
	`

	rows, err := r.db.QueryContext(ctx, query, brokerID, limit)
	if err != nil {
		return nil, errors.DatabaseError(err)
	}
	defer rows.Close()

	return r.scanSales(rows)
}

func (r *salesHistoryRepository) FindByPeriod(ctx context.Context, industryID string, startDate, endDate time.Time) ([]entity.Sale, error) {
	query := `
		SELECT id, batch_id, sold_by_user_id, industry_id, lead_id,
		       customer_name, customer_contact, sale_price, broker_commission,
		       net_industry_value, invoice_url, notes, sold_at, created_at
		FROM sales_history
		WHERE industry_id = $1 
		  AND sold_at >= $2 
		  AND sold_at <= $3
		ORDER BY sold_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query, industryID, startDate, endDate)
	if err != nil {
		return nil, errors.DatabaseError(err)
	}
	defer rows.Close()

	return r.scanSales(rows)
}

func (r *salesHistoryRepository) List(ctx context.Context, filters entity.SaleFilters) ([]entity.Sale, int, error) {
	return r.listWithFilters(ctx, nil, nil, filters)
}

func (r *salesHistoryRepository) listWithFilters(ctx context.Context, sellerID, industryID *string, filters entity.SaleFilters) ([]entity.Sale, int, error) {
	psql := sq.StatementBuilder.PlaceholderFormat(sq.Dollar)

	query := psql.Select(
		"id", "batch_id", "sold_by_user_id", "industry_id", "lead_id",
		"customer_name", "customer_contact", "sale_price", "broker_commission",
		"net_industry_value", "invoice_url", "notes", "sold_at", "created_at",
	).From("sales_history")

	if sellerID != nil {
		query = query.Where(sq.Eq{"sold_by_user_id": *sellerID})
	}

	if industryID != nil {
		query = query.Where(sq.Eq{"industry_id": *industryID})
	}

	if filters.SellerID != nil {
		query = query.Where(sq.Eq{"sold_by_user_id": *filters.SellerID})
	}

	if filters.StartDate != nil {
		startDate, err := time.Parse(time.RFC3339, *filters.StartDate)
		if err == nil {
			query = query.Where(sq.GtOrEq{"sold_at": startDate})
		}
	}

	if filters.EndDate != nil {
		endDate, err := time.Parse(time.RFC3339, *filters.EndDate)
		if err == nil {
			query = query.Where(sq.LtOrEq{"sold_at": endDate})
		}
	}

	// Count
	countQuery := psql.Select("COUNT(*)").From("sales_history")
	if sellerID != nil {
		countQuery = countQuery.Where(sq.Eq{"sold_by_user_id": *sellerID})
	}
	if industryID != nil {
		countQuery = countQuery.Where(sq.Eq{"industry_id": *industryID})
	}
	if filters.SellerID != nil {
		countQuery = countQuery.Where(sq.Eq{"sold_by_user_id": *filters.SellerID})
	}
	if filters.StartDate != nil {
		startDate, err := time.Parse(time.RFC3339, *filters.StartDate)
		if err == nil {
			countQuery = countQuery.Where(sq.GtOrEq{"sold_at": startDate})
		}
	}
	if filters.EndDate != nil {
		endDate, err := time.Parse(time.RFC3339, *filters.EndDate)
		if err == nil {
			countQuery = countQuery.Where(sq.LtOrEq{"sold_at": endDate})
		}
	}

	countSQL, countArgs, _ := countQuery.ToSql()
	var total int
	if err := r.db.QueryRowContext(ctx, countSQL, countArgs...).Scan(&total); err != nil {
		return nil, 0, errors.DatabaseError(err)
	}

	// Pagination
	offset := (filters.Page - 1) * filters.Limit
	query = query.OrderBy("sold_at DESC").Limit(uint64(filters.Limit)).Offset(uint64(offset))

	sql, args, err := query.ToSql()
	if err != nil {
		return nil, 0, errors.DatabaseError(err)
	}

	rows, err := r.db.QueryContext(ctx, sql, args...)
	if err != nil {
		return nil, 0, errors.DatabaseError(err)
	}
	defer rows.Close()

	sales, err := r.scanSales(rows)
	if err != nil {
		return nil, 0, err
	}

	return sales, total, nil
}

func (r *salesHistoryRepository) CalculateSummary(ctx context.Context, filters entity.SaleSummaryFilters) (*entity.SaleSummary, error) {
	query := `
		SELECT 
			COALESCE(SUM(sale_price), 0) as total_sales,
			COALESCE(SUM(broker_commission), 0) as total_commissions,
			COALESCE(AVG(sale_price), 0) as average_ticket
		FROM sales_history
		WHERE 1=1
	`
	args := []interface{}{}
	argCount := 1

	if filters.StartDate != nil {
		startDate, err := time.Parse(time.RFC3339, *filters.StartDate)
		if err == nil {
			query += ` AND sold_at >= $` + string(rune('0'+argCount))
			args = append(args, startDate)
			argCount++
		}
	}

	if filters.EndDate != nil {
		endDate, err := time.Parse(time.RFC3339, *filters.EndDate)
		if err == nil {
			query += ` AND sold_at <= $` + string(rune('0'+argCount))
			args = append(args, endDate)
			argCount++
		}
	}

	summary := &entity.SaleSummary{}
	err := r.db.QueryRowContext(ctx, query, args...).Scan(
		&summary.TotalSales, &summary.TotalCommissions, &summary.AverageTicket,
	)

	if err != nil {
		return nil, errors.DatabaseError(err)
	}

	return summary, nil
}

func (r *salesHistoryRepository) SumMonthlySales(ctx context.Context, entityID string, month time.Time) (float64, error) {
	query := `
		SELECT COALESCE(SUM(sale_price), 0)
		FROM sales_history
		WHERE (industry_id = $1 OR sold_by_user_id = $1)
		  AND sold_at >= $2
		  AND sold_at < $3
	`

	startOfMonth := time.Date(month.Year(), month.Month(), 1, 0, 0, 0, 0, time.UTC)
	endOfMonth := startOfMonth.AddDate(0, 1, 0)

	var total float64
	err := r.db.QueryRowContext(ctx, query, entityID, startOfMonth, endOfMonth).Scan(&total)
	if err != nil {
		return 0, errors.DatabaseError(err)
	}

	return total, nil
}

func (r *salesHistoryRepository) SumMonthlyCommission(ctx context.Context, brokerID string, month time.Time) (float64, error) {
	query := `
		SELECT COALESCE(SUM(broker_commission), 0)
		FROM sales_history
		WHERE sold_by_user_id = $1
		  AND sold_at >= $2
		  AND sold_at < $3
	`

	startOfMonth := time.Date(month.Year(), month.Month(), 1, 0, 0, 0, 0, time.UTC)
	endOfMonth := startOfMonth.AddDate(0, 1, 0)

	var total float64
	err := r.db.QueryRowContext(ctx, query, brokerID, startOfMonth, endOfMonth).Scan(&total)
	if err != nil {
		return 0, errors.DatabaseError(err)
	}

	return total, nil
}

func (r *salesHistoryRepository) scanSales(rows *sql.Rows) ([]entity.Sale, error) {
	sales := []entity.Sale{}
	for rows.Next() {
		var s entity.Sale
		if err := rows.Scan(
			&s.ID, &s.BatchID, &s.SoldByUserID, &s.IndustryID, &s.LeadID,
			&s.CustomerName, &s.CustomerContact, &s.SalePrice,
			&s.BrokerCommission, &s.NetIndustryValue, &s.InvoiceURL,
			&s.Notes, &s.SaleDate, &s.CreatedAt,
		); err != nil {
			return nil, errors.DatabaseError(err)
		}
		sales = append(sales, s)
	}
	return sales, nil
}
```

---

### `.\internal\repository\sales_link_repository.go`

```go
package repository

import (
	"context"
	"database/sql"

	sq "github.com/Masterminds/squirrel"
	"github.com/lib/pq"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
	"github.com/thiagomes07/CAVA/backend/internal/domain/errors"
)

type salesLinkRepository struct {
	db *DB
}

func NewSalesLinkRepository(db *DB) *salesLinkRepository {
	return &salesLinkRepository{db: db}
}

func (r *salesLinkRepository) Create(ctx context.Context, link *entity.SalesLink) error {
	query := `
		INSERT INTO sales_links (
			id, created_by_user_id, industry_id, batch_id, product_id,
			link_type, slug_token, title, custom_message, display_price,
			show_price, expires_at, is_active
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		RETURNING created_at, updated_at
	`

	err := r.db.QueryRowContext(ctx, query,
		link.ID, link.CreatedByUserID, link.IndustryID, link.BatchID,
		link.ProductID, link.LinkType, link.SlugToken, link.Title,
		link.CustomMessage, link.DisplayPrice, link.ShowPrice,
		link.ExpiresAt, link.IsActive,
	).Scan(&link.CreatedAt, &link.UpdatedAt)

	if err != nil {
		if pqErr, ok := err.(*pq.Error); ok {
			if pqErr.Code == "23505" {
				return errors.SlugExistsError(link.SlugToken)
			}
		}
		return errors.DatabaseError(err)
	}

	return nil
}

func (r *salesLinkRepository) FindByID(ctx context.Context, id string) (*entity.SalesLink, error) {
	query := `
		SELECT id, created_by_user_id, industry_id, batch_id, product_id,
		       link_type, slug_token, title, custom_message, display_price,
		       show_price, views_count, expires_at, is_active, 
		       created_at, updated_at
		FROM sales_links
		WHERE id = $1
	`

	link := &entity.SalesLink{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&link.ID, &link.CreatedByUserID, &link.IndustryID, &link.BatchID,
		&link.ProductID, &link.LinkType, &link.SlugToken, &link.Title,
		&link.CustomMessage, &link.DisplayPrice, &link.ShowPrice,
		&link.ViewsCount, &link.ExpiresAt, &link.IsActive,
		&link.CreatedAt, &link.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, errors.NewNotFoundError("Link de venda")
	}
	if err != nil {
		return nil, errors.DatabaseError(err)
	}

	return link, nil
}

func (r *salesLinkRepository) FindBySlug(ctx context.Context, slug string) (*entity.SalesLink, error) {
	query := `
		SELECT id, created_by_user_id, industry_id, batch_id, product_id,
		       link_type, slug_token, title, custom_message, display_price,
		       show_price, views_count, expires_at, is_active, 
		       created_at, updated_at
		FROM sales_links
		WHERE slug_token = $1
	`

	link := &entity.SalesLink{}
	err := r.db.QueryRowContext(ctx, query, slug).Scan(
		&link.ID, &link.CreatedByUserID, &link.IndustryID, &link.BatchID,
		&link.ProductID, &link.LinkType, &link.SlugToken, &link.Title,
		&link.CustomMessage, &link.DisplayPrice, &link.ShowPrice,
		&link.ViewsCount, &link.ExpiresAt, &link.IsActive,
		&link.CreatedAt, &link.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, errors.NewNotFoundError("Link de venda")
	}
	if err != nil {
		return nil, errors.DatabaseError(err)
	}

	return link, nil
}

func (r *salesLinkRepository) FindByCreatorID(ctx context.Context, userID string, filters entity.SalesLinkFilters) ([]entity.SalesLink, int, error) {
	return r.listWithFilters(ctx, &userID, filters)
}

func (r *salesLinkRepository) FindByType(ctx context.Context, linkType entity.LinkType) ([]entity.SalesLink, error) {
	query := `
		SELECT id, created_by_user_id, industry_id, batch_id, product_id,
		       link_type, slug_token, title, custom_message, display_price,
		       show_price, views_count, expires_at, is_active, 
		       created_at, updated_at
		FROM sales_links
		WHERE link_type = $1 AND is_active = TRUE
		ORDER BY created_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query, linkType)
	if err != nil {
		return nil, errors.DatabaseError(err)
	}
	defer rows.Close()

	return r.scanLinks(rows)
}

func (r *salesLinkRepository) List(ctx context.Context, filters entity.SalesLinkFilters) ([]entity.SalesLink, int, error) {
	return r.listWithFilters(ctx, nil, filters)
}

func (r *salesLinkRepository) listWithFilters(ctx context.Context, userID *string, filters entity.SalesLinkFilters) ([]entity.SalesLink, int, error) {
	psql := sq.StatementBuilder.PlaceholderFormat(sq.Dollar)

	query := psql.Select(
		"id", "created_by_user_id", "industry_id", "batch_id", "product_id",
		"link_type", "slug_token", "title", "custom_message", "display_price",
		"show_price", "views_count", "expires_at", "is_active",
		"created_at", "updated_at",
	).From("sales_links")

	if userID != nil {
		query = query.Where(sq.Eq{"created_by_user_id": *userID})
	}

	if filters.Type != nil {
		query = query.Where(sq.Eq{"link_type": *filters.Type})
	}

	if filters.Status != nil {
		if *filters.Status == "ATIVO" {
			query = query.Where(sq.Eq{"is_active": true})
			query = query.Where(sq.Or{
				sq.Eq{"expires_at": nil},
				sq.Gt{"expires_at": sq.Expr("CURRENT_TIMESTAMP")},
			})
		} else if *filters.Status == "EXPIRADO" {
			query = query.Where(sq.Lt{"expires_at": sq.Expr("CURRENT_TIMESTAMP")})
		}
	}

	if filters.Search != nil && *filters.Search != "" {
		search := "%" + *filters.Search + "%"
		query = query.Where(sq.Or{
			sq.ILike{"title": search},
			sq.ILike{"slug_token": search},
		})
	}

	// Count
	countQuery := psql.Select("COUNT(*)").From("sales_links")
	if userID != nil {
		countQuery = countQuery.Where(sq.Eq{"created_by_user_id": *userID})
	}
	if filters.Type != nil {
		countQuery = countQuery.Where(sq.Eq{"link_type": *filters.Type})
	}
	if filters.Status != nil {
		if *filters.Status == "ATIVO" {
			countQuery = countQuery.Where(sq.Eq{"is_active": true})
		}
	}
	if filters.Search != nil && *filters.Search != "" {
		search := "%" + *filters.Search + "%"
		countQuery = countQuery.Where(sq.Or{
			sq.ILike{"title": search},
			sq.ILike{"slug_token": search},
		})
	}

	countSQL, countArgs, _ := countQuery.ToSql()
	var total int
	if err := r.db.QueryRowContext(ctx, countSQL, countArgs...).Scan(&total); err != nil {
		return nil, 0, errors.DatabaseError(err)
	}

	// Pagination
	offset := (filters.Page - 1) * filters.Limit
	query = query.OrderBy("created_at DESC").Limit(uint64(filters.Limit)).Offset(uint64(offset))

	sql, args, err := query.ToSql()
	if err != nil {
		return nil, 0, errors.DatabaseError(err)
	}

	rows, err := r.db.QueryContext(ctx, sql, args...)
	if err != nil {
		return nil, 0, errors.DatabaseError(err)
	}
	defer rows.Close()

	links, err := r.scanLinks(rows)
	if err != nil {
		return nil, 0, err
	}

	return links, total, nil
}

func (r *salesLinkRepository) Update(ctx context.Context, link *entity.SalesLink) error {
	query := `
		UPDATE sales_links
		SET title = $1, custom_message = $2, display_price = $3,
		    show_price = $4, expires_at = $5, is_active = $6,
		    updated_at = CURRENT_TIMESTAMP
		WHERE id = $7
		RETURNING updated_at
	`

	err := r.db.QueryRowContext(ctx, query,
		link.Title, link.CustomMessage, link.DisplayPrice,
		link.ShowPrice, link.ExpiresAt, link.IsActive, link.ID,
	).Scan(&link.UpdatedAt)

	if err == sql.ErrNoRows {
		return errors.NewNotFoundError("Link de venda")
	}
	if err != nil {
		return errors.DatabaseError(err)
	}

	return nil
}

func (r *salesLinkRepository) SoftDelete(ctx context.Context, id string) error {
	query := `
		UPDATE sales_links
		SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
		WHERE id = $1
	`

	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return errors.DatabaseError(err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return errors.DatabaseError(err)
	}

	if rows == 0 {
		return errors.NewNotFoundError("Link de venda")
	}

	return nil
}

func (r *salesLinkRepository) ExistsBySlug(ctx context.Context, slug string) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM sales_links WHERE slug_token = $1)`

	var exists bool
	err := r.db.QueryRowContext(ctx, query, slug).Scan(&exists)
	if err != nil {
		return false, errors.DatabaseError(err)
	}

	return exists, nil
}

func (r *salesLinkRepository) IncrementViews(ctx context.Context, id string) error {
	query := `
		UPDATE sales_links
		SET views_count = views_count + 1
		WHERE id = $1
	`

	_, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return errors.DatabaseError(err)
	}

	return nil
}

func (r *salesLinkRepository) CountActive(ctx context.Context, userID string) (int, error) {
	query := `
		SELECT COUNT(*) 
		FROM sales_links 
		WHERE created_by_user_id = $1 
		  AND is_active = TRUE
		  AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
	`

	var count int
	err := r.db.QueryRowContext(ctx, query, userID).Scan(&count)
	if err != nil {
		return 0, errors.DatabaseError(err)
	}

	return count, nil
}

func (r *salesLinkRepository) scanLinks(rows *sql.Rows) ([]entity.SalesLink, error) {
	links := []entity.SalesLink{}
	for rows.Next() {
		var l entity.SalesLink
		if err := rows.Scan(
			&l.ID, &l.CreatedByUserID, &l.IndustryID, &l.BatchID, &l.ProductID,
			&l.LinkType, &l.SlugToken, &l.Title, &l.CustomMessage,
			&l.DisplayPrice, &l.ShowPrice, &l.ViewsCount, &l.ExpiresAt,
			&l.IsActive, &l.CreatedAt, &l.UpdatedAt,
		); err != nil {
			return nil, errors.DatabaseError(err)
		}
		links = append(links, l)
	}
	return links, nil
}
```

---

### `.\internal\repository\shared_inventory_repository.go`

```go
package repository

import (
	"context"
	"database/sql"

	"github.com/lib/pq"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
	"github.com/thiagomes07/CAVA/backend/internal/domain/errors"
)

type sharedInventoryRepository struct {
	db *DB
}

func NewSharedInventoryRepository(db *DB) *sharedInventoryRepository {
	return &sharedInventoryRepository{db: db}
}

func (r *sharedInventoryRepository) CreateSharedBatch(ctx context.Context, shared *entity.SharedInventoryBatch) error {
	query := `
		INSERT INTO shared_inventory_batches (
			id, batch_id, broker_user_id, industry_owner_id, negotiated_price
		) VALUES ($1, $2, $3, $4, $5)
		RETURNING shared_at
	`

	err := r.db.QueryRowContext(ctx, query,
		shared.ID, shared.BatchID, shared.BrokerUserID,
		shared.IndustryOwnerID, shared.NegotiatedPrice,
	).Scan(&shared.SharedAt)

	if err != nil {
		if pqErr, ok := err.(*pq.Error); ok {
			if pqErr.Code == "23505" { // unique_violation
				return errors.NewConflictError("Lote já compartilhado com este broker")
			}
		}
		return errors.DatabaseError(err)
	}

	return nil
}

func (r *sharedInventoryRepository) FindByBrokerID(ctx context.Context, brokerID string, filters entity.SharedInventoryFilters) ([]entity.SharedInventoryBatch, error) {
	query := `
		SELECT id, batch_id, broker_user_id, industry_owner_id, 
		       negotiated_price, shared_at, is_active
		FROM shared_inventory_batches
		WHERE broker_user_id = $1 AND is_active = TRUE
	`
	args := []interface{}{brokerID}

	if filters.Status != "" {
		query += ` AND EXISTS (
			SELECT 1 FROM batches 
			WHERE batches.id = shared_inventory_batches.batch_id 
			AND batches.status = $2
		)`
		args = append(args, filters.Status)
	}

	if filters.Recent {
		query += ` ORDER BY shared_at DESC`
	} else {
		query += ` ORDER BY shared_at DESC`
	}

	if filters.Limit > 0 {
		query += ` LIMIT $` + string(rune(len(args)+1))
		args = append(args, filters.Limit)
	}

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, errors.DatabaseError(err)
	}
	defer rows.Close()

	return r.scanSharedBatches(rows)
}

func (r *sharedInventoryRepository) FindByBatchID(ctx context.Context, batchID string) ([]entity.SharedInventoryBatch, error) {
	query := `
		SELECT id, batch_id, broker_user_id, industry_owner_id, 
		       negotiated_price, shared_at, is_active
		FROM shared_inventory_batches
		WHERE batch_id = $1 AND is_active = TRUE
		ORDER BY shared_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query, batchID)
	if err != nil {
		return nil, errors.DatabaseError(err)
	}
	defer rows.Close()

	return r.scanSharedBatches(rows)
}

func (r *sharedInventoryRepository) FindByID(ctx context.Context, id string) (*entity.SharedInventoryBatch, error) {
	query := `
		SELECT id, batch_id, broker_user_id, industry_owner_id, 
		       negotiated_price, shared_at, is_active
		FROM shared_inventory_batches
		WHERE id = $1
	`

	shared := &entity.SharedInventoryBatch{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&shared.ID, &shared.BatchID, &shared.BrokerUserID,
		&shared.IndustryOwnerID, &shared.NegotiatedPrice,
		&shared.SharedAt, &shared.IsActive,
	)

	if err == sql.ErrNoRows {
		return nil, errors.NewNotFoundError("Compartilhamento")
	}
	if err != nil {
		return nil, errors.DatabaseError(err)
	}

	return shared, nil
}

func (r *sharedInventoryRepository) ExistsForBroker(ctx context.Context, batchID, brokerID string) (bool, error) {
	query := `
		SELECT EXISTS(
			SELECT 1 FROM shared_inventory_batches 
			WHERE batch_id = $1 AND broker_user_id = $2 AND is_active = TRUE
		)
	`

	var exists bool
	err := r.db.QueryRowContext(ctx, query, batchID, brokerID).Scan(&exists)
	if err != nil {
		return false, errors.DatabaseError(err)
	}

	return exists, nil
}

func (r *sharedInventoryRepository) UpdateNegotiatedPrice(ctx context.Context, id string, price *float64) error {
	query := `
		UPDATE shared_inventory_batches
		SET negotiated_price = $1
		WHERE id = $2 AND is_active = TRUE
	`

	result, err := r.db.ExecContext(ctx, query, price, id)
	if err != nil {
		return errors.DatabaseError(err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return errors.DatabaseError(err)
	}

	if rows == 0 {
		return errors.NewNotFoundError("Compartilhamento")
	}

	return nil
}

func (r *sharedInventoryRepository) Delete(ctx context.Context, id string) error {
	query := `DELETE FROM shared_inventory_batches WHERE id = $1`

	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return errors.DatabaseError(err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return errors.DatabaseError(err)
	}

	if rows == 0 {
		return errors.NewNotFoundError("Compartilhamento")
	}

	return nil
}

func (r *sharedInventoryRepository) CountSharedBatches(ctx context.Context, brokerID string, status entity.BatchStatus) (int, error) {
	query := `
		SELECT COUNT(DISTINCT sib.id)
		FROM shared_inventory_batches sib
		INNER JOIN batches b ON sib.batch_id = b.id
		WHERE sib.broker_user_id = $1 
		  AND sib.is_active = TRUE
		  AND b.status = $2
		  AND b.is_active = TRUE
	`

	var count int
	err := r.db.QueryRowContext(ctx, query, brokerID, status).Scan(&count)
	if err != nil {
		return 0, errors.DatabaseError(err)
	}

	return count, nil
}

func (r *sharedInventoryRepository) CreateCatalogPermission(ctx context.Context, permission *entity.SharedCatalogPermission) error {
	query := `
		INSERT INTO shared_catalog_permissions (
			id, industry_id, broker_user_id, can_show_prices
		) VALUES ($1, $2, $3, $4)
		RETURNING granted_at
	`

	err := r.db.QueryRowContext(ctx, query,
		permission.ID, permission.IndustryID,
		permission.BrokerUserID, permission.CanShowPrices,
	).Scan(&permission.GrantedAt)

	if err != nil {
		if pqErr, ok := err.(*pq.Error); ok {
			if pqErr.Code == "23505" {
				return errors.NewConflictError("Permissão já existe para este broker")
			}
		}
		return errors.DatabaseError(err)
	}

	return nil
}

func (r *sharedInventoryRepository) FindCatalogPermissionByBroker(ctx context.Context, industryID, brokerID string) (*entity.SharedCatalogPermission, error) {
	query := `
		SELECT id, industry_id, broker_user_id, can_show_prices, 
		       granted_at, is_active
		FROM shared_catalog_permissions
		WHERE industry_id = $1 AND broker_user_id = $2
	`

	perm := &entity.SharedCatalogPermission{}
	err := r.db.QueryRowContext(ctx, query, industryID, brokerID).Scan(
		&perm.ID, &perm.IndustryID, &perm.BrokerUserID,
		&perm.CanShowPrices, &perm.GrantedAt, &perm.IsActive,
	)

	if err == sql.ErrNoRows {
		return nil, errors.NewNotFoundError("Permissão")
	}
	if err != nil {
		return nil, errors.DatabaseError(err)
	}

	return perm, nil
}

func (r *sharedInventoryRepository) UpdateCatalogPermission(ctx context.Context, permission *entity.SharedCatalogPermission) error {
	query := `
		UPDATE shared_catalog_permissions
		SET can_show_prices = $1, is_active = $2
		WHERE id = $3
	`

	result, err := r.db.ExecContext(ctx, query,
		permission.CanShowPrices, permission.IsActive, permission.ID,
	)
	if err != nil {
		return errors.DatabaseError(err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return errors.DatabaseError(err)
	}

	if rows == 0 {
		return errors.NewNotFoundError("Permissão")
	}

	return nil
}

func (r *sharedInventoryRepository) DeleteCatalogPermission(ctx context.Context, id string) error {
	query := `DELETE FROM shared_catalog_permissions WHERE id = $1`

	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return errors.DatabaseError(err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return errors.DatabaseError(err)
	}

	if rows == 0 {
		return errors.NewNotFoundError("Permissão")
	}

	return nil
}

func (r *sharedInventoryRepository) scanSharedBatches(rows *sql.Rows) ([]entity.SharedInventoryBatch, error) {
	shared := []entity.SharedInventoryBatch{}
	for rows.Next() {
		var s entity.SharedInventoryBatch
		if err := rows.Scan(
			&s.ID, &s.BatchID, &s.BrokerUserID, &s.IndustryOwnerID,
			&s.NegotiatedPrice, &s.SharedAt, &s.IsActive,
		); err != nil {
			return nil, errors.DatabaseError(err)
		}
		shared = append(shared, s)
	}
	return shared, nil
}
```

---

### `.\internal\repository\user_repository.go`

```go
package repository

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/lib/pq"
	"github.com/thiagomes07/CAVA/backend/internal/domain/entity"
	"github.com/thiagomes07/CAVA/backend/internal/domain/errors"
)

type userRepository struct {
	db *DB
}

// NewUserRepository cria novo repositório de usuários
func NewUserRepository(db *DB) *userRepository {
	return &userRepository{db: db}
}

func (r *userRepository) Create(ctx context.Context, user *entity.User) error {
	query := `
		INSERT INTO users (id, industry_id, name, email, password_hash, phone, role, is_active)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING created_at, updated_at
	`

	err := r.db.QueryRowContext(ctx, query,
		user.ID, user.IndustryID, user.Name, user.Email,
		user.Password, user.Phone, user.Role, user.IsActive,
	).Scan(&user.CreatedAt, &user.UpdatedAt)

	if err != nil {
		if pqErr, ok := err.(*pq.Error); ok {
			if pqErr.Code == "23505" { // unique_violation
				return errors.EmailExistsError(user.Email)
			}
		}
		return errors.DatabaseError(err)
	}

	return nil
}

func (r *userRepository) FindByID(ctx context.Context, id string) (*entity.User, error) {
	query := `
		SELECT id, industry_id, name, email, password_hash, phone, role, 
		       is_active, created_at, updated_at
		FROM users
		WHERE id = $1
	`

	user := &entity.User{}
	err := r.db.QueryRowContext(ctx, query, id).Scan(
		&user.ID, &user.IndustryID, &user.Name, &user.Email,
		&user.Password, &user.Phone, &user.Role,
		&user.IsActive, &user.CreatedAt, &user.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, errors.NewNotFoundError("Usuário")
	}
	if err != nil {
		return nil, errors.DatabaseError(err)
	}

	return user, nil
}

func (r *userRepository) FindByEmail(ctx context.Context, email string) (*entity.User, error) {
	query := `
		SELECT id, industry_id, name, email, password_hash, phone, role, 
		       is_active, created_at, updated_at
		FROM users
		WHERE email = $1
	`

	user := &entity.User{}
	err := r.db.QueryRowContext(ctx, query, email).Scan(
		&user.ID, &user.IndustryID, &user.Name, &user.Email,
		&user.Password, &user.Phone, &user.Role,
		&user.IsActive, &user.CreatedAt, &user.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, errors.NewNotFoundError("Usuário")
	}
	if err != nil {
		return nil, errors.DatabaseError(err)
	}

	return user, nil
}

func (r *userRepository) FindByIndustryID(ctx context.Context, industryID string) ([]entity.User, error) {
	query := `
		SELECT id, industry_id, name, email, phone, role, 
		       is_active, created_at, updated_at
		FROM users
		WHERE industry_id = $1
		ORDER BY created_at DESC
	`

	rows, err := r.db.QueryContext(ctx, query, industryID)
	if err != nil {
		return nil, errors.DatabaseError(err)
	}
	defer rows.Close()

	users := []entity.User{}
	for rows.Next() {
		var u entity.User
		if err := rows.Scan(
			&u.ID, &u.IndustryID, &u.Name, &u.Email,
			&u.Phone, &u.Role, &u.IsActive, &u.CreatedAt, &u.UpdatedAt,
		); err != nil {
			return nil, errors.DatabaseError(err)
		}
		users = append(users, u)
	}

	return users, nil
}

func (r *userRepository) FindByRole(ctx context.Context, role entity.UserRole) ([]entity.User, error) {
	query := `
		SELECT id, industry_id, name, email, phone, role, 
		       is_active, created_at, updated_at
		FROM users
		WHERE role = $1 AND is_active = TRUE
		ORDER BY name
	`

	rows, err := r.db.QueryContext(ctx, query, role)
	if err != nil {
		return nil, errors.DatabaseError(err)
	}
	defer rows.Close()

	users := []entity.User{}
	for rows.Next() {
		var u entity.User
		if err := rows.Scan(
			&u.ID, &u.IndustryID, &u.Name, &u.Email,
			&u.Phone, &u.Role, &u.IsActive, &u.CreatedAt, &u.UpdatedAt,
		); err != nil {
			return nil, errors.DatabaseError(err)
		}
		users = append(users, u)
	}

	return users, nil
}

func (r *userRepository) FindBrokers(ctx context.Context, industryID string) ([]entity.BrokerWithStats, error) {
	query := `
		SELECT 
			u.id, u.name, u.email, u.phone, u.role, 
			u.is_active, u.created_at, u.updated_at,
			COALESCE(COUNT(DISTINCT sib.id), 0) as shared_batches_count
		FROM users u
		LEFT JOIN shared_inventory_batches sib 
			ON u.id = sib.broker_user_id 
			AND sib.industry_owner_id = $1
			AND sib.is_active = TRUE
		WHERE u.role = 'BROKER'
		GROUP BY u.id
		ORDER BY u.name
	`

	rows, err := r.db.QueryContext(ctx, query, industryID)
	if err != nil {
		return nil, errors.DatabaseError(err)
	}
	defer rows.Close()

	brokers := []entity.BrokerWithStats{}
	for rows.Next() {
		var b entity.BrokerWithStats
		if err := rows.Scan(
			&b.ID, &b.Name, &b.Email, &b.Phone, &b.Role,
			&b.IsActive, &b.CreatedAt, &b.UpdatedAt,
			&b.SharedBatchesCount,
		); err != nil {
			return nil, errors.DatabaseError(err)
		}
		brokers = append(brokers, b)
	}

	return brokers, nil
}

func (r *userRepository) Update(ctx context.Context, user *entity.User) error {
	query := `
		UPDATE users
		SET name = $1, phone = $2, updated_at = CURRENT_TIMESTAMP
		WHERE id = $3
		RETURNING updated_at
	`

	err := r.db.QueryRowContext(ctx, query,
		user.Name, user.Phone, user.ID,
	).Scan(&user.UpdatedAt)

	if err == sql.ErrNoRows {
		return errors.NewNotFoundError("Usuário")
	}
	if err != nil {
		return errors.DatabaseError(err)
	}

	return nil
}

func (r *userRepository) UpdateStatus(ctx context.Context, id string, isActive bool) error {
	query := `
		UPDATE users
		SET is_active = $1, updated_at = CURRENT_TIMESTAMP
		WHERE id = $2
	`

	result, err := r.db.ExecContext(ctx, query, isActive, id)
	if err != nil {
		return errors.DatabaseError(err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return errors.DatabaseError(err)
	}

	if rows == 0 {
		return errors.NewNotFoundError("Usuário")
	}

	return nil
}

func (r *userRepository) ExistsByEmail(ctx context.Context, email string) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)`

	var exists bool
	err := r.db.QueryRowContext(ctx, query, email).Scan(&exists)
	if err != nil {
		return false, errors.DatabaseError(err)
	}

	return exists, nil
}

func (r *userRepository) List(ctx context.Context, role *entity.UserRole) ([]entity.User, error) {
	query := `
		SELECT id, industry_id, name, email, phone, role, 
		       is_active, created_at, updated_at
		FROM users
		WHERE 1=1
	`
	args := []interface{}{}

	if role != nil {
		query += ` AND role = $1`
		args = append(args, *role)
	}

	query += ` ORDER BY name`

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, errors.DatabaseError(err)
	}
	defer rows.Close()

	users := []entity.User{}
	for rows.Next() {
		var u entity.User
		if err := rows.Scan(
			&u.ID, &u.IndustryID, &u.Name, &u.Email,
			&u.Phone, &u.Role, &u.IsActive, &u.CreatedAt, &u.UpdatedAt,
		); err != nil {
			return nil, errors.DatabaseError(err)
		}
		users = append(users, u)
	}

	return users, nil
}
```

---

### `.\internal\storage\s3_adapter.go`

```go
package storage

import (
	"context"
	"fmt"
	"io"
	"path/filepath"
	"strings"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
	"go.uber.org/zap"
)

// S3Adapter implementa o storage service usando MinIO/S3
type S3Adapter struct {
	client    *minio.Client
	bucket    string
	publicURL string
	logger    *zap.Logger
}

// Config contém configurações para S3/MinIO
type Config struct {
	Endpoint   string
	AccessKey  string
	SecretKey  string
	BucketName string
	Region     string
	UseSSL     bool
	PublicURL  string
}

// NewS3Adapter cria novo adapter S3/MinIO
func NewS3Adapter(cfg *Config, logger *zap.Logger) (*S3Adapter, error) {
	// Inicializar cliente MinIO (compatível com S3)
	client, err := minio.New(cfg.Endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.AccessKey, cfg.SecretKey, ""),
		Secure: cfg.UseSSL,
		Region: cfg.Region,
	})
	if err != nil {
		return nil, fmt.Errorf("erro ao criar cliente MinIO: %w", err)
	}

	adapter := &S3Adapter{
		client:    client,
		bucket:    cfg.BucketName,
		publicURL: cfg.PublicURL,
		logger:    logger,
	}

	// Verificar se bucket existe
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	exists, err := client.BucketExists(ctx, cfg.BucketName)
	if err != nil {
		return nil, fmt.Errorf("erro ao verificar bucket: %w", err)
	}

	if !exists {
		logger.Warn("bucket não existe, criando...", zap.String("bucket", cfg.BucketName))
		if err := client.MakeBucket(ctx, cfg.BucketName, minio.MakeBucketOptions{Region: cfg.Region}); err != nil {
			return nil, fmt.Errorf("erro ao criar bucket: %w", err)
		}
		logger.Info("bucket criado com sucesso", zap.String("bucket", cfg.BucketName))
	}

	logger.Info("S3 adapter inicializado",
		zap.String("endpoint", cfg.Endpoint),
		zap.String("bucket", cfg.BucketName),
		zap.Bool("ssl", cfg.UseSSL),
	)

	return adapter, nil
}

// UploadFile faz upload de arquivo para S3/MinIO
func (s *S3Adapter) UploadFile(ctx context.Context, bucket, key string, reader io.Reader, contentType string, size int64) (string, error) {
	// Usar bucket configurado se não especificado
	if bucket == "" {
		bucket = s.bucket
	}

	// Upload do arquivo
	_, err := s.client.PutObject(ctx, bucket, key, reader, size, minio.PutObjectOptions{
		ContentType: contentType,
	})
	if err != nil {
		s.logger.Error("erro ao fazer upload",
			zap.Error(err),
			zap.String("bucket", bucket),
			zap.String("key", key),
		)
		return "", fmt.Errorf("erro ao fazer upload: %w", err)
	}

	// Gerar URL pública
	url := s.generatePublicURL(key)

	s.logger.Info("arquivo enviado com sucesso",
		zap.String("bucket", bucket),
		zap.String("key", key),
		zap.String("url", url),
	)

	return url, nil
}

// UploadProductMedia faz upload de mídia de produto
func (s *S3Adapter) UploadProductMedia(ctx context.Context, productID string, reader io.Reader, filename, contentType string, size int64) (string, error) {
	// Gerar key: products/{productID}/{timestamp}_{filename}
	ext := filepath.Ext(filename)
	timestamp := time.Now().Unix()
	sanitized := sanitizeFilename(strings.TrimSuffix(filename, ext))
	key := fmt.Sprintf("products/%s/%d_%s%s", productID, timestamp, sanitized, ext)

	return s.UploadFile(ctx, s.bucket, key, reader, contentType, size)
}

// UploadBatchMedia faz upload de mídia de lote
func (s *S3Adapter) UploadBatchMedia(ctx context.Context, batchID string, reader io.Reader, filename, contentType string, size int64) (string, error) {
	// Gerar key: batches/{batchID}/{timestamp}_{filename}
	ext := filepath.Ext(filename)
	timestamp := time.Now().Unix()
	sanitized := sanitizeFilename(strings.TrimSuffix(filename, ext))
	key := fmt.Sprintf("batches/%s/%d_%s%s", batchID, timestamp, sanitized, ext)

	return s.UploadFile(ctx, s.bucket, key, reader, contentType, size)
}

// DeleteFile deleta arquivo do storage
func (s *S3Adapter) DeleteFile(ctx context.Context, bucket, key string) error {
	if bucket == "" {
		bucket = s.bucket
	}

	err := s.client.RemoveObject(ctx, bucket, key, minio.RemoveObjectOptions{})
	if err != nil {
		s.logger.Error("erro ao deletar arquivo",
			zap.Error(err),
			zap.String("bucket", bucket),
			zap.String("key", key),
		)
		return fmt.Errorf("erro ao deletar arquivo: %w", err)
	}

	s.logger.Info("arquivo deletado",
		zap.String("bucket", bucket),
		zap.String("key", key),
	)

	return nil
}

// FileExists verifica se arquivo existe
func (s *S3Adapter) FileExists(ctx context.Context, bucket, key string) (bool, error) {
	if bucket == "" {
		bucket = s.bucket
	}

	_, err := s.client.StatObject(ctx, bucket, key, minio.StatObjectOptions{})
	if err != nil {
		errResponse := minio.ToErrorResponse(err)
		if errResponse.Code == "NoSuchKey" {
			return false, nil
		}
		return false, fmt.Errorf("erro ao verificar arquivo: %w", err)
	}

	return true, nil
}

// GeneratePresignedURL gera URL pre-assinada (para downloads privados)
func (s *S3Adapter) GeneratePresignedURL(ctx context.Context, bucket, key string, expiration int) (string, error) {
	if bucket == "" {
		bucket = s.bucket
	}

	url, err := s.client.PresignedGetObject(ctx, bucket, key, time.Duration(expiration)*time.Second, nil)
	if err != nil {
		s.logger.Error("erro ao gerar URL presigned",
			zap.Error(err),
			zap.String("bucket", bucket),
			zap.String("key", key),
		)
		return "", fmt.Errorf("erro ao gerar URL presigned: %w", err)
	}

	return url.String(), nil
}

// ExtractKeyFromURL extrai a key do storage a partir da URL
func (s *S3Adapter) ExtractKeyFromURL(url string) (string, error) {
	// Remove o public URL base
	if s.publicURL != "" && strings.HasPrefix(url, s.publicURL) {
		key := strings.TrimPrefix(url, s.publicURL)
		key = strings.TrimPrefix(key, "/")
		return key, nil
	}

	// Tentar extrair da URL do MinIO/S3
	// Formato típico: http://endpoint/bucket/key
	parts := strings.Split(url, "/")
	if len(parts) >= 2 {
		// Assumir que bucket é a primeira parte e key é o resto
		key := strings.Join(parts[len(parts)-2:], "/")
		return key, nil
	}

	return "", fmt.Errorf("não foi possível extrair key da URL: %s", url)
}

// ValidateFileType valida tipo de arquivo
func (s *S3Adapter) ValidateFileType(contentType string, allowedTypes []string) bool {
	for _, allowed := range allowedTypes {
		if contentType == allowed {
			return true
		}
	}
	return false
}

// ValidateFileSize valida tamanho do arquivo
func (s *S3Adapter) ValidateFileSize(size int64, maxSize int64) bool {
	return size > 0 && size <= maxSize
}

// generatePublicURL gera URL pública para o arquivo
func (s *S3Adapter) generatePublicURL(key string) string {
	if s.publicURL != "" {
		return fmt.Sprintf("%s/%s", strings.TrimRight(s.publicURL, "/"), key)
	}
	// Fallback para URL do MinIO
	return fmt.Sprintf("%s/%s/%s", s.client.EndpointURL(), s.bucket, key)
}

// sanitizeFilename remove caracteres inválidos do nome do arquivo
func sanitizeFilename(filename string) string {
	// Remover espaços e caracteres especiais
	replacer := strings.NewReplacer(
		" ", "-",
		"_", "-",
		"(", "",
		")", "",
		"[", "",
		"]", "",
		"{", "",
		"}", "",
		"'", "",
		"\"", "",
	)
	sanitized := replacer.Replace(filename)

	// Converter para lowercase
	sanitized = strings.ToLower(sanitized)

	// Remover múltiplos hífens consecutivos
	for strings.Contains(sanitized, "--") {
		sanitized = strings.ReplaceAll(sanitized, "--", "-")
	}

	// Remover hífens no início e fim
	sanitized = strings.Trim(sanitized, "-")

	return sanitized
}
```

---

### `.\migrations\000001_create_extensions.down.sql`

```go
-- =============================================
-- Rollback: 000001_create_extensions
-- =============================================

DROP EXTENSION IF EXISTS "pgcrypto";
```

---

### `.\migrations\000001_create_extensions.up.sql`

```go
-- =============================================
-- Migration: 000001_create_extensions
-- Description: Habilita extensões necessárias
-- =============================================

-- Extensão para gerar UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Comentário descritivo
COMMENT ON EXTENSION pgcrypto IS 'Extensão para funções criptográficas e geração de UUIDs';
```

---

### `.\migrations\000002_create_enums.down.sql`

```go
-- =============================================
-- Rollback: 000002_create_enums
-- =============================================

DROP TYPE IF EXISTS lead_status_type;
DROP TYPE IF EXISTS finish_type_enum;
DROP TYPE IF EXISTS reservation_status_type;
DROP TYPE IF EXISTS interaction_type_enum;
DROP TYPE IF EXISTS media_type_enum;
DROP TYPE IF EXISTS link_type_enum;
DROP TYPE IF EXISTS batch_status_type;
DROP TYPE IF EXISTS user_role_type;
```

---

### `.\migrations\000002_create_enums.up.sql`

```go
-- =============================================
-- Migration: 000002_create_enums
-- Description: Cria tipos ENUM para garantir integridade dos dados
-- =============================================

-- ENUM: Roles de usuários
CREATE TYPE user_role_type AS ENUM (
    'ADMIN_INDUSTRIA',
    'VENDEDOR_INTERNO',
    'BROKER'
);

-- ENUM: Status de lotes
CREATE TYPE batch_status_type AS ENUM (
    'DISPONIVEL',
    'RESERVADO',
    'VENDIDO',
    'INATIVO'
);

-- ENUM: Tipos de links de venda
CREATE TYPE link_type_enum AS ENUM (
    'LOTE_UNICO',
    'PRODUTO_GERAL',
    'CATALOGO_COMPLETO'
);

-- ENUM: Tipos de mídia
CREATE TYPE media_type_enum AS ENUM (
    'IMAGE',
    'VIDEO'
);

-- ENUM: Tipos de interação de leads
CREATE TYPE interaction_type_enum AS ENUM (
    'INTERESSE_LOTE',
    'INTERESSE_CATALOGO',
    'DUVIDA_GERAL'
);

-- ENUM: Status de reservas
CREATE TYPE reservation_status_type AS ENUM (
    'ATIVA',
    'CONFIRMADA_VENDA',
    'EXPIRADA',
    'CANCELADA'
);

-- ENUM: Tipos de acabamento
CREATE TYPE finish_type_enum AS ENUM (
    'POLIDO',
    'LEVIGADO',
    'BRUTO',
    'APICOADO',
    'FLAMEADO'
);

-- ENUM: Status de leads
CREATE TYPE lead_status_type AS ENUM (
    'NOVO',
    'CONTATADO',
    'RESOLVIDO'
);

-- Comentários descritivos
COMMENT ON TYPE user_role_type IS 'Tipos de roles de usuários no sistema';
COMMENT ON TYPE batch_status_type IS 'Status possíveis de um lote de estoque';
COMMENT ON TYPE link_type_enum IS 'Tipos de links de venda públicos';
COMMENT ON TYPE media_type_enum IS 'Tipos de mídia suportados';
COMMENT ON TYPE interaction_type_enum IS 'Tipos de interação de leads';
COMMENT ON TYPE reservation_status_type IS 'Status de reservas de lotes';
COMMENT ON TYPE finish_type_enum IS 'Tipos de acabamento de produtos';
COMMENT ON TYPE lead_status_type IS 'Status de acompanhamento de leads';
```

---

### `.\migrations\000003_create_core_tables.down.sql`

```go
-- =============================================
-- Rollback: 000003_create_core_tables
-- =============================================

-- Remover triggers
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_industries_updated_at ON industries;

-- Remover função de trigger
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Remover tabelas (ordem reversa devido a foreign keys)
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS industries;
```

---

### `.\migrations\000003_create_core_tables.up.sql`

```go
-- =============================================
-- Migration: 000003_create_core_tables
-- Description: Cria tabelas core (industries, users)
-- =============================================

-- Tabela: Indústrias
CREATE TABLE industries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    cnpj VARCHAR(20) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    contact_email VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(50),
    policy_terms TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para industries
CREATE INDEX idx_industries_slug ON industries(slug);
CREATE INDEX idx_industries_cnpj ON industries(cnpj);

-- Comentários
COMMENT ON TABLE industries IS 'Indústrias cadastradas no sistema';
COMMENT ON COLUMN industries.slug IS 'Slug único para URLs (ex: pedras-sul)';
COMMENT ON COLUMN industries.cnpj IS 'CNPJ da indústria (apenas dígitos)';
COMMENT ON COLUMN industries.policy_terms IS 'Termos e políticas de venda da indústria';

-- Tabela: Usuários
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    industry_id UUID REFERENCES industries(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    role user_role_type NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_industry_id ON users(industry_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = TRUE;

-- Comentários
COMMENT ON TABLE users IS 'Usuários do sistema (admin, vendedores, brokers)';
COMMENT ON COLUMN users.industry_id IS 'NULL para brokers freelancers';
COMMENT ON COLUMN users.password_hash IS 'Hash Argon2id da senha';
COMMENT ON COLUMN users.role IS 'Role do usuário: ADMIN_INDUSTRIA, VENDEDOR_INTERNO ou BROKER';

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_industries_updated_at
    BEFORE UPDATE ON industries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

### `.\migrations\000004_create_product_tables.down.sql`

```go
-- =============================================
-- Rollback: 000004_create_product_tables
-- =============================================

-- Remover triggers
DROP TRIGGER IF EXISTS update_products_updated_at ON products;

-- Remover tabelas (ordem reversa)
DROP TABLE IF EXISTS product_medias;
DROP TABLE IF EXISTS products;
```

---

### `.\migrations\000004_create_product_tables.up.sql`

```go
-- =============================================
-- Migration: 000004_create_product_tables
-- Description: Cria tabelas de produtos e mídias de produtos
-- =============================================

-- Tabela: Produtos (Tipos de Pedra)
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    industry_id UUID NOT NULL REFERENCES industries(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    sku_code VARCHAR(100),
    description TEXT,
    material_type VARCHAR(100),
    finish_type finish_type_enum DEFAULT 'POLIDO',
    is_public_catalog BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Índices para products
CREATE INDEX idx_products_industry_id ON products(industry_id);
CREATE INDEX idx_products_material_type ON products(material_type);
CREATE INDEX idx_products_deleted_at ON products(deleted_at);
CREATE INDEX idx_products_active ON products(industry_id, deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_name_search ON products USING gin(to_tsvector('portuguese', name));

-- Comentários
COMMENT ON TABLE products IS 'Catálogo de produtos (tipos de pedra)';
COMMENT ON COLUMN products.sku_code IS 'Código interno do produto';
COMMENT ON COLUMN products.material_type IS 'Tipo de material: GRANITO, MARMORE, QUARTZITO, etc';
COMMENT ON COLUMN products.is_public_catalog IS 'Se aparece na vitrine pública';
COMMENT ON COLUMN products.deleted_at IS 'Soft delete - timestamp de exclusão';

-- Tabela: Mídias de Produtos
CREATE TABLE product_medias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    url VARCHAR(500) NOT NULL,
    display_order INTEGER DEFAULT 0,
    is_cover BOOLEAN DEFAULT FALSE,
    media_type media_type_enum DEFAULT 'IMAGE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para product_medias
CREATE INDEX idx_product_medias_product_id ON product_medias(product_id);
CREATE INDEX idx_product_medias_display_order ON product_medias(product_id, display_order);
CREATE INDEX idx_product_medias_cover ON product_medias(product_id, is_cover) WHERE is_cover = TRUE;

-- Comentários
COMMENT ON TABLE product_medias IS 'Mídias (fotos/vídeos) de marketing dos produtos';
COMMENT ON COLUMN product_medias.display_order IS 'Ordem de exibição das mídias';
COMMENT ON COLUMN product_medias.is_cover IS 'Se é a imagem de capa';

-- Trigger para atualizar updated_at
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Constraint: apenas uma imagem de capa por produto
CREATE UNIQUE INDEX idx_product_medias_unique_cover 
    ON product_medias(product_id) 
    WHERE is_cover = TRUE;
```

---

### `.\migrations\000005_create_batch_tables.down.sql`

```go
-- =============================================
-- Rollback: 000005_create_batch_tables
-- =============================================

-- Remover triggers
DROP TRIGGER IF EXISTS update_batches_updated_at ON batches;

-- Remover tabelas (ordem reversa)
DROP TABLE IF EXISTS batch_medias;
DROP TABLE IF EXISTS batches;
```

---

### `.\migrations\000005_create_batch_tables.up.sql`

```go
-- =============================================
-- Migration: 000005_create_batch_tables
-- Description: Cria tabelas de lotes e mídias de lotes
-- =============================================

-- Tabela: Lotes (Estoque Físico)
CREATE TABLE batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    industry_id UUID NOT NULL REFERENCES industries(id) ON DELETE CASCADE,
    batch_code VARCHAR(100) NOT NULL,
    
    -- Dimensões físicas
    height DECIMAL(8,2) NOT NULL CHECK (height > 0),
    width DECIMAL(8,2) NOT NULL CHECK (width > 0),
    thickness DECIMAL(8,2) NOT NULL CHECK (thickness > 0),
    quantity_slabs INTEGER DEFAULT 1 CHECK (quantity_slabs > 0),
    net_area DECIMAL(10,2) GENERATED ALWAYS AS ((height * width * quantity_slabs) / 10000) STORED,
    
    -- Preço e status
    industry_price DECIMAL(12,2) NOT NULL CHECK (industry_price > 0),
    status batch_status_type DEFAULT 'DISPONIVEL',
    origin_quarry VARCHAR(255),
    
    -- Timestamps
    entry_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Índices para batches
CREATE INDEX idx_batches_product_id ON batches(product_id);
CREATE INDEX idx_batches_industry_id ON batches(industry_id);
CREATE INDEX idx_batches_status ON batches(status);
CREATE INDEX idx_batches_code ON batches(batch_code);
CREATE INDEX idx_batches_available ON batches(industry_id, status, is_active) 
    WHERE status = 'DISPONIVEL' AND is_active = TRUE;
CREATE INDEX idx_batches_product_status ON batches(product_id, status, is_active) 
    WHERE is_active = TRUE;

-- Constraint: batch_code único por indústria
CREATE UNIQUE INDEX idx_batches_unique_code ON batches(industry_id, batch_code);

-- Comentários
COMMENT ON TABLE batches IS 'Lotes físicos de estoque';
COMMENT ON COLUMN batches.batch_code IS 'Código do lote (formato: AAA-999999)';
COMMENT ON COLUMN batches.height IS 'Altura em centímetros';
COMMENT ON COLUMN batches.width IS 'Largura em centímetros';
COMMENT ON COLUMN batches.thickness IS 'Espessura em centímetros';
COMMENT ON COLUMN batches.quantity_slabs IS 'Quantidade de chapas no lote';
COMMENT ON COLUMN batches.net_area IS 'Área total em m² (calculada automaticamente)';
COMMENT ON COLUMN batches.industry_price IS 'Preço base da indústria';
COMMENT ON COLUMN batches.origin_quarry IS 'Pedreira de origem';

-- Tabela: Mídias de Lotes
CREATE TABLE batch_medias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    url VARCHAR(500) NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para batch_medias
CREATE INDEX idx_batch_medias_batch_id ON batch_medias(batch_id);
CREATE INDEX idx_batch_medias_display_order ON batch_medias(batch_id, display_order);

-- Comentários
COMMENT ON TABLE batch_medias IS 'Mídias (fotos reais) dos lotes';

-- Trigger para atualizar updated_at
CREATE TRIGGER update_batches_updated_at
    BEFORE UPDATE ON batches
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

### `.\migrations\000006_create_sharing_tables.down.sql`

```go
-- =============================================
-- Rollback: 000006_create_sharing_tables
-- =============================================

DROP TABLE IF EXISTS shared_catalog_permissions;
DROP TABLE IF EXISTS shared_inventory_batches;
```

---

### `.\migrations\000006_create_sharing_tables.up.sql`

```go
-- =============================================
-- Migration: 000006_create_sharing_tables
-- Description: Cria tabelas de compartilhamento B2B
-- =============================================

-- Tabela: Estoque Compartilhado (Lotes para Brokers)
CREATE TABLE shared_inventory_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    broker_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    industry_owner_id UUID NOT NULL REFERENCES industries(id) ON DELETE CASCADE,
    negotiated_price DECIMAL(12,2) CHECK (negotiated_price IS NULL OR negotiated_price > 0),
    shared_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Constraint: batch compartilhado apenas uma vez por broker
    CONSTRAINT unique_batch_share UNIQUE (batch_id, broker_user_id)
);

-- Índices para shared_inventory_batches
CREATE INDEX idx_shared_inventory_broker ON shared_inventory_batches(broker_user_id, is_active) 
    WHERE is_active = TRUE;
CREATE INDEX idx_shared_inventory_batch ON shared_inventory_batches(batch_id);
CREATE INDEX idx_shared_inventory_industry ON shared_inventory_batches(industry_owner_id);

-- Comentários
COMMENT ON TABLE shared_inventory_batches IS 'Lotes compartilhados com brokers específicos';
COMMENT ON COLUMN shared_inventory_batches.negotiated_price IS 'Preço especial negociado para este broker';

-- Tabela: Permissões de Catálogo (Vitrine para Brokers)
CREATE TABLE shared_catalog_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    industry_id UUID NOT NULL REFERENCES industries(id) ON DELETE CASCADE,
    broker_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    can_show_prices BOOLEAN DEFAULT FALSE,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Constraint: permissão única por broker/indústria
    CONSTRAINT unique_catalog_share UNIQUE (industry_id, broker_user_id)
);

-- Índices para shared_catalog_permissions
CREATE INDEX idx_catalog_permissions_broker ON shared_catalog_permissions(broker_user_id, is_active) 
    WHERE is_active = TRUE;
CREATE INDEX idx_catalog_permissions_industry ON shared_catalog_permissions(industry_id);

-- Comentários
COMMENT ON TABLE shared_catalog_permissions IS 'Permissões de acesso ao catálogo geral da indústria';
COMMENT ON COLUMN shared_catalog_permissions.can_show_prices IS 'Se o broker pode ver/exibir preços';
```

---

### `.\migrations\000007_create_sales_tables.down.sql`

```go
-- =============================================
-- Rollback: 000007_create_sales_tables
-- =============================================

-- Remover triggers
DROP TRIGGER IF EXISTS validate_sales_link_fields ON sales_links;
DROP TRIGGER IF EXISTS update_sales_links_updated_at ON sales_links;

-- Remover funções
DROP FUNCTION IF EXISTS validate_sales_link_polymorphism();

-- Remover tabelas
DROP TABLE IF EXISTS sales_links;
```

---

### `.\migrations\000007_create_sales_tables.up.sql`

```go
-- =============================================
-- Migration: 000007_create_sales_tables
-- Description: Cria tabelas de links de venda públicos
-- =============================================

-- Tabela: Links de Venda (Polimórfica)
CREATE TABLE sales_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    industry_id UUID NOT NULL REFERENCES industries(id) ON DELETE CASCADE,
    
    -- Campos polimórficos
    batch_id UUID REFERENCES batches(id) ON DELETE SET NULL,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    
    -- Configurações do link
    link_type link_type_enum NOT NULL,
    slug_token VARCHAR(100) NOT NULL UNIQUE,
    title VARCHAR(255),
    custom_message TEXT,
    display_price DECIMAL(12,2) CHECK (display_price IS NULL OR display_price > 0),
    show_price BOOLEAN DEFAULT TRUE,
    
    -- Métricas e controle
    views_count INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para sales_links
CREATE INDEX idx_sales_links_slug ON sales_links(slug_token);
CREATE INDEX idx_sales_links_creator ON sales_links(created_by_user_id, is_active) 
    WHERE is_active = TRUE;
CREATE INDEX idx_sales_links_industry ON sales_links(industry_id);
CREATE INDEX idx_sales_links_type ON sales_links(link_type);
CREATE INDEX idx_sales_links_batch ON sales_links(batch_id) WHERE batch_id IS NOT NULL;
CREATE INDEX idx_sales_links_product ON sales_links(product_id) WHERE product_id IS NOT NULL;
CREATE INDEX idx_sales_links_active_not_expired ON sales_links(is_active, expires_at) 
    WHERE is_active = TRUE AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP);

-- Comentários
COMMENT ON TABLE sales_links IS 'Links públicos de venda (landing pages)';
COMMENT ON COLUMN sales_links.slug_token IS 'Token único da URL (ex: marmore-carrara-2024)';
COMMENT ON COLUMN sales_links.link_type IS 'Tipo: LOTE_UNICO, PRODUTO_GERAL ou CATALOGO_COMPLETO';
COMMENT ON COLUMN sales_links.display_price IS 'Preço exibido ao cliente final';
COMMENT ON COLUMN sales_links.show_price IS 'Se exibe preço ou "Sob Consulta"';
COMMENT ON COLUMN sales_links.views_count IS 'Contador de visualizações';

-- Trigger para atualizar updated_at
CREATE TRIGGER update_sales_links_updated_at
    BEFORE UPDATE ON sales_links
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Constraint: validação de campos polimórficos
-- LOTE_UNICO: batch_id obrigatório, product_id NULL
-- PRODUTO_GERAL: product_id obrigatório, batch_id NULL
-- CATALOGO_COMPLETO: ambos NULL
CREATE OR REPLACE FUNCTION validate_sales_link_polymorphism()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.link_type = 'LOTE_UNICO' THEN
        IF NEW.batch_id IS NULL OR NEW.product_id IS NOT NULL THEN
            RAISE EXCEPTION 'LOTE_UNICO requer batch_id e não pode ter product_id';
        END IF;
    ELSIF NEW.link_type = 'PRODUTO_GERAL' THEN
        IF NEW.product_id IS NULL OR NEW.batch_id IS NOT NULL THEN
            RAISE EXCEPTION 'PRODUTO_GERAL requer product_id e não pode ter batch_id';
        END IF;
    ELSIF NEW.link_type = 'CATALOGO_COMPLETO' THEN
        IF NEW.batch_id IS NOT NULL OR NEW.product_id IS NOT NULL THEN
            RAISE EXCEPTION 'CATALOGO_COMPLETO não pode ter batch_id nem product_id';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_sales_link_fields
    BEFORE INSERT OR UPDATE ON sales_links
    FOR EACH ROW
    EXECUTE FUNCTION validate_sales_link_polymorphism();
```

---

### `.\migrations\000008_create_lead_tables.down.sql`

```go
-- =============================================
-- Rollback: 000008_create_lead_tables
-- =============================================

-- Remover triggers
DROP TRIGGER IF EXISTS update_lead_interaction_timestamp ON lead_interactions;
DROP TRIGGER IF EXISTS update_leads_updated_at ON leads;

-- Remover funções
DROP FUNCTION IF EXISTS update_lead_last_interaction();

-- Remover tabelas (ordem reversa)
DROP TABLE IF EXISTS lead_subscriptions;
DROP TABLE IF EXISTS lead_interactions;
DROP TABLE IF EXISTS leads;
```

---

### `.\migrations\000008_create_lead_tables.up.sql`

```go
-- =============================================
-- Migration: 000008_create_lead_tables
-- Description: Cria tabelas de leads e interações
-- =============================================

-- Tabela: Leads (Clientes Potenciais)
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sales_link_id UUID NOT NULL REFERENCES sales_links(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    contact VARCHAR(255) NOT NULL,
    message TEXT,
    marketing_opt_in BOOLEAN DEFAULT FALSE,
    status lead_status_type DEFAULT 'NOVO',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_interaction TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para leads
CREATE INDEX idx_leads_sales_link ON leads(sales_link_id);
CREATE INDEX idx_leads_contact ON leads(contact);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX idx_leads_marketing_opt_in ON leads(marketing_opt_in) WHERE marketing_opt_in = TRUE;
CREATE INDEX idx_leads_contact_search ON leads USING gin(to_tsvector('portuguese', name || ' ' || contact));

-- Comentários
COMMENT ON TABLE leads IS 'Leads (clientes potenciais) capturados';
COMMENT ON COLUMN leads.contact IS 'Email ou telefone do lead';
COMMENT ON COLUMN leads.marketing_opt_in IS 'Se aceitou receber comunicações de marketing';
COMMENT ON COLUMN leads.status IS 'Status de acompanhamento: NOVO, CONTATADO, RESOLVIDO';

-- Tabela: Interações de Leads
CREATE TABLE lead_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    sales_link_id UUID NOT NULL REFERENCES sales_links(id) ON DELETE SET NULL,
    target_batch_id UUID REFERENCES batches(id) ON DELETE SET NULL,
    target_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    message TEXT,
    interaction_type interaction_type_enum DEFAULT 'INTERESSE_LOTE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para lead_interactions
CREATE INDEX idx_lead_interactions_lead ON lead_interactions(lead_id, created_at DESC);
CREATE INDEX idx_lead_interactions_sales_link ON lead_interactions(sales_link_id);
CREATE INDEX idx_lead_interactions_batch ON lead_interactions(target_batch_id) 
    WHERE target_batch_id IS NOT NULL;
CREATE INDEX idx_lead_interactions_product ON lead_interactions(target_product_id) 
    WHERE target_product_id IS NOT NULL;

-- Comentários
COMMENT ON TABLE lead_interactions IS 'Histórico de interações dos leads';
COMMENT ON COLUMN lead_interactions.interaction_type IS 'Tipo: INTERESSE_LOTE, INTERESSE_CATALOGO, DUVIDA_GERAL';

-- Tabela: Assinaturas de Leads (Interesse em novidades)
CREATE TABLE lead_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    linked_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para lead_subscriptions
CREATE INDEX idx_lead_subscriptions_lead ON lead_subscriptions(lead_id);
CREATE INDEX idx_lead_subscriptions_product ON lead_subscriptions(product_id);
CREATE INDEX idx_lead_subscriptions_user ON lead_subscriptions(linked_user_id);

-- Comentários
COMMENT ON TABLE lead_subscriptions IS 'Assinaturas de interesse em produtos específicos';
COMMENT ON COLUMN lead_subscriptions.linked_user_id IS 'Vendedor responsável pelo lead';

-- Trigger para atualizar updated_at e last_interaction
CREATE TRIGGER update_leads_updated_at
    BEFORE UPDATE ON leads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para atualizar last_interaction quando houver nova interação
CREATE OR REPLACE FUNCTION update_lead_last_interaction()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE leads 
    SET last_interaction = NEW.created_at 
    WHERE id = NEW.lead_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_lead_interaction_timestamp
    AFTER INSERT ON lead_interactions
    FOR EACH ROW
    EXECUTE FUNCTION update_lead_last_interaction();
```

---

### `.\migrations\000009_create_operational_tables.down.sql`

```go
-- =============================================
-- Rollback: 000009_create_operational_tables
-- =============================================

DROP TABLE IF EXISTS sales_history;
DROP TABLE IF EXISTS reservations;
```

---

### `.\migrations\000009_create_operational_tables.up.sql`

```go
-- =============================================
-- Migration: 000009_create_operational_tables
-- Description: Cria tabelas de reservas e vendas
-- =============================================

-- Tabela: Reservas
CREATE TABLE reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE RESTRICT,
    reserved_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    status reservation_status_type DEFAULT 'ATIVA',
    notes TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Índices para reservations
CREATE INDEX idx_reservations_batch ON reservations(batch_id);
CREATE INDEX idx_reservations_user ON reservations(reserved_by_user_id);
CREATE INDEX idx_reservations_lead ON reservations(lead_id);
CREATE INDEX idx_reservations_status ON reservations(status);
CREATE INDEX idx_reservations_expires_at ON reservations(expires_at) 
    WHERE status = 'ATIVA';
CREATE INDEX idx_reservations_active ON reservations(is_active, status) 
    WHERE is_active = TRUE;

-- Comentários
COMMENT ON TABLE reservations IS 'Reservas de lotes';
COMMENT ON COLUMN reservations.reserved_by_user_id IS 'Usuário que fez a reserva (vendedor ou broker)';
COMMENT ON COLUMN reservations.expires_at IS 'Data de expiração da reserva';
COMMENT ON COLUMN reservations.status IS 'Status: ATIVA, CONFIRMADA_VENDA, EXPIRADA, CANCELADA';

-- Tabela: Histórico de Vendas
CREATE TABLE sales_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES batches(id),
    sold_by_user_id UUID NOT NULL REFERENCES users(id),
    industry_id UUID NOT NULL REFERENCES industries(id),
    lead_id UUID REFERENCES leads(id),
    customer_name VARCHAR(255) NOT NULL,
    customer_contact VARCHAR(255) NOT NULL,
    sale_price DECIMAL(12,2) NOT NULL CHECK (sale_price > 0),
    broker_commission DECIMAL(12,2) DEFAULT 0 CHECK (broker_commission >= 0),
    net_industry_value DECIMAL(12,2) NOT NULL CHECK (net_industry_value > 0),
    invoice_url VARCHAR(500),
    notes TEXT,
    sold_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para sales_history
CREATE INDEX idx_sales_history_batch ON sales_history(batch_id);
CREATE INDEX idx_sales_history_seller ON sales_history(sold_by_user_id);
CREATE INDEX idx_sales_history_industry ON sales_history(industry_id);
CREATE INDEX idx_sales_history_lead ON sales_history(lead_id);
CREATE INDEX idx_sales_history_sold_at ON sales_history(sold_at DESC);
CREATE INDEX idx_sales_history_industry_date ON sales_history(industry_id, sold_at DESC);

-- Comentários
COMMENT ON TABLE sales_history IS 'Histórico de vendas realizadas';
COMMENT ON COLUMN sales_history.sale_price IS 'Preço final pago pelo cliente';
COMMENT ON COLUMN sales_history.broker_commission IS 'Comissão do broker/vendedor';
COMMENT ON COLUMN sales_history.net_industry_value IS 'Valor líquido para a indústria';
COMMENT ON COLUMN sales_history.customer_name IS 'Nome do cliente final';
COMMENT ON COLUMN sales_history.customer_contact IS 'Contato do cliente final';

-- Constraint: validar cálculo de comissão
ALTER TABLE sales_history 
    ADD CONSTRAINT check_commission_calculation 
    CHECK (sale_price >= net_industry_value);
```

---

### `.\migrations\000010_create_indexes.down.sql`

```go
-- =============================================
-- Rollback: 000010_create_indexes
-- =============================================

-- Remover índices adicionais
DROP INDEX IF EXISTS idx_sales_history_commission_calc;
DROP INDEX IF EXISTS idx_sales_links_public_active;
DROP INDEX IF EXISTS idx_reservations_expired;
DROP INDEX IF EXISTS idx_leads_created_desc;
DROP INDEX IF EXISTS idx_batches_entry_date_desc;
DROP INDEX IF EXISTS idx_products_created_desc;
DROP INDEX IF EXISTS idx_sales_links_user_type_active;
DROP INDEX IF EXISTS idx_batches_industry_product_status;
DROP INDEX IF EXISTS idx_leads_name_trgm;
DROP INDEX IF EXISTS idx_products_name_trgm;
DROP INDEX IF EXISTS idx_shared_inventory_count;
DROP INDEX IF EXISTS idx_sales_monthly_summary;
DROP INDEX IF EXISTS idx_batches_count_by_status;
```

---

### `.\migrations\000010_create_indexes.up.sql`

```go
-- =============================================
-- Migration: 000010_create_indexes
-- Description: Cria índices adicionais para performance
-- =============================================

-- Índices para queries de dashboard
CREATE INDEX idx_batches_count_by_status ON batches(industry_id, status) 
    WHERE is_active = TRUE;

CREATE INDEX idx_sales_monthly_summary ON sales_history(industry_id, sold_by_user_id, sold_at);

-- Índices para contagem de brokers compartilhados
CREATE INDEX idx_shared_inventory_count ON shared_inventory_batches(broker_user_id, is_active);

-- Índices para busca textual
CREATE INDEX idx_products_name_trgm ON products USING gin(name gin_trgm_ops);
CREATE INDEX idx_leads_name_trgm ON leads USING gin(name gin_trgm_ops);

-- Nota: Para usar trigram, é necessário criar a extensão pg_trgm
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Índices compostos para queries frequentes
CREATE INDEX idx_batches_industry_product_status ON batches(industry_id, product_id, status, is_active);

CREATE INDEX idx_sales_links_user_type_active ON sales_links(created_by_user_id, link_type, is_active);

-- Índices para ordenação
CREATE INDEX idx_products_created_desc ON products(industry_id, created_at DESC) 
    WHERE deleted_at IS NULL;

CREATE INDEX idx_batches_entry_date_desc ON batches(industry_id, entry_date DESC) 
    WHERE is_active = TRUE;

CREATE INDEX idx_leads_created_desc ON leads(sales_link_id, created_at DESC);

-- Índices parciais para queries específicas
CREATE INDEX idx_reservations_expired ON reservations(expires_at) 
    WHERE status = 'ATIVA' AND expires_at < CURRENT_TIMESTAMP;

CREATE INDEX idx_sales_links_public_active ON sales_links(slug_token, is_active) 
    WHERE is_active = TRUE;

-- Índices para aggregations
CREATE INDEX idx_sales_history_commission_calc ON sales_history(sold_by_user_id, sold_at, broker_commission);

-- Comentários
COMMENT ON INDEX idx_batches_count_by_status IS 'Índice para contagem rápida de lotes por status';
COMMENT ON INDEX idx_sales_monthly_summary IS 'Índice para sumário mensal de vendas';
COMMENT ON INDEX idx_reservations_expired IS 'Índice para job de expiração de reservas';
```

---

### `.\migrations\000011_seed_data.down.sql`

```go
-- =============================================
-- Rollback: 000011_seed_data
-- =============================================

-- Remover dados de seed em ordem reversa (devido a foreign keys)
DELETE FROM product_medias WHERE product_id IN (
    SELECT id FROM products WHERE industry_id = '00000000-0000-0000-0000-000000000001'
);

DELETE FROM batches WHERE industry_id = '00000000-0000-0000-0000-000000000001';

DELETE FROM products WHERE industry_id = '00000000-0000-0000-0000-000000000001';

DELETE FROM users WHERE id IN (
    '00000000-0000-0000-0000-000000000011',
    '00000000-0000-0000-0000-000000000012',
    '00000000-0000-0000-0000-000000000013'
);

DELETE FROM industries WHERE id = '00000000-0000-0000-0000-000000000001';
```

---

### `.\migrations\000011_seed_data.up.sql`

```go
-- =============================================
-- Migration: 000011_seed_data
-- Description: Dados iniciais para desenvolvimento
-- ATENÇÃO: Executar apenas em ambiente de desenvolvimento!
-- =============================================

-- Verificar se já existe seed data
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM industries WHERE slug = 'pedras-demo') THEN
        RAISE NOTICE 'Seed data já existe. Pulando inserção.';
        RETURN;
    END IF;

    -- Inserir indústria demo
    INSERT INTO industries (id, name, cnpj, slug, contact_email, contact_phone, policy_terms)
    VALUES (
        '00000000-0000-0000-0000-000000000001',
        'Pedras Demo',
        '00000000000100',
        'pedras-demo',
        'contato@pedrasdemo.com',
        '11999999999',
        'Termos de venda e políticas da Pedras Demo'
    );

    -- Inserir usuário Admin Demo
    -- Senha: Admin@123
    -- Hash gerado com Argon2id
    INSERT INTO users (id, industry_id, name, email, password_hash, phone, role, is_active)
    VALUES (
        '00000000-0000-0000-0000-000000000011',
        '00000000-0000-0000-0000-000000000001',
        'Admin Demo',
        'admin@pedrasdemo.com',
        '$argon2id$v=19$m=65536,t=3,p=2$c29tZXNhbHQxMjM0NTY$hash_placeholder',
        '11988888888',
        'ADMIN_INDUSTRIA',
        TRUE
    );

    -- Inserir usuário Vendedor Demo
    -- Senha: Vendedor@123
    INSERT INTO users (id, industry_id, name, email, password_hash, phone, role, is_active)
    VALUES (
        '00000000-0000-0000-0000-000000000012',
        '00000000-0000-0000-0000-000000000001',
        'Vendedor Demo',
        'vendedor@pedrasdemo.com',
        '$argon2id$v=19$m=65536,t=3,p=2$c29tZXNhbHQxMjM0NTY$hash_placeholder',
        '11977777777',
        'VENDEDOR_INTERNO',
        TRUE
    );

    -- Inserir usuário Broker Demo
    -- Senha: Broker@123
    INSERT INTO users (id, industry_id, name, email, password_hash, phone, role, is_active)
    VALUES (
        '00000000-0000-0000-0000-000000000013',
        NULL, -- Broker freelancer
        'Broker Demo',
        'broker@example.com',
        '$argon2id$v=19$m=65536,t=3,p=2$c29tZXNhbHQxMjM0NTY$hash_placeholder',
        '11966666666',
        'BROKER',
        TRUE
    );

    -- Inserir produtos demo
    INSERT INTO products (id, industry_id, name, sku_code, description, material_type, finish_type, is_public_catalog)
    VALUES 
    (
        '00000000-0000-0000-0000-000000000021',
        '00000000-0000-0000-0000-000000000001',
        'Mármore Carrara',
        'MAR-CAR-001',
        'Mármore Carrara branco com veios cinzas. Origem: Itália.',
        'MARMORE',
        'POLIDO',
        TRUE
    ),
    (
        '00000000-0000-0000-0000-000000000022',
        '00000000-0000-0000-0000-000000000001',
        'Granito Preto São Gabriel',
        'GRA-PSG-001',
        'Granito preto com fundo uniforme. Origem: Brasil.',
        'GRANITO',
        'POLIDO',
        TRUE
    ),
    (
        '00000000-0000-0000-0000-000000000023',
        '00000000-0000-0000-0000-000000000001',
        'Quartzito Azul Macaubas',
        'QUA-AZU-001',
        'Quartzito com tons azulados. Origem: Brasil.',
        'QUARTZITO',
        'LEVIGADO',
        TRUE
    );

    -- Inserir lotes demo
    INSERT INTO batches (
        id, product_id, industry_id, batch_code, 
        height, width, thickness, quantity_slabs, 
        industry_price, status, origin_quarry, entry_date
    )
    VALUES 
    (
        '00000000-0000-0000-0000-000000000031',
        '00000000-0000-0000-0000-000000000021',
        '00000000-0000-0000-0000-000000000001',
        'CAR-000001',
        280.00, 180.00, 2.00, 20,
        15000.00, 'DISPONIVEL', 'Pedreira Carrara - Itália',
        CURRENT_TIMESTAMP - INTERVAL '30 days'
    ),
    (
        '00000000-0000-0000-0000-000000000032',
        '00000000-0000-0000-0000-000000000022',
        '00000000-0000-0000-0000-000000000001',
        'PSG-000001',
        300.00, 200.00, 3.00, 15,
        12000.00, 'DISPONIVEL', 'Pedreira São Gabriel - ES',
        CURRENT_TIMESTAMP - INTERVAL '20 days'
    ),
    (
        '00000000-0000-0000-0000-000000000033',
        '00000000-0000-0000-0000-000000000023',
        '00000000-0000-0000-0000-000000000001',
        'AZU-000001',
        290.00, 190.00, 2.50, 18,
        18000.00, 'RESERVADO', 'Pedreira Macaubas - BA',
        CURRENT_TIMESTAMP - INTERVAL '15 days'
    ),
    (
        '00000000-0000-0000-0000-000000000034',
        '00000000-0000-0000-0000-000000000021',
        '00000000-0000-0000-0000-000000000001',
        'CAR-000002',
        280.00, 180.00, 2.00, 25,
        16000.00, 'VENDIDO', 'Pedreira Carrara - Itália',
        CURRENT_TIMESTAMP - INTERVAL '60 days'
    );

    -- Inserir mídia placeholder para produtos
    INSERT INTO product_medias (product_id, url, display_order, is_cover, media_type)
    VALUES 
    (
        '00000000-0000-0000-0000-000000000021',
        'https://via.placeholder.com/800x600/FFFFFF/000000?text=Marmore+Carrara',
        0, TRUE, 'IMAGE'
    ),
    (
        '00000000-0000-0000-0000-000000000022',
        'https://via.placeholder.com/800x600/000000/FFFFFF?text=Granito+Preto',
        0, TRUE, 'IMAGE'
    ),
    (
        '00000000-0000-0000-0000-000000000023',
        'https://via.placeholder.com/800x600/0000FF/FFFFFF?text=Quartzito+Azul',
        0, TRUE, 'IMAGE'
    );

    RAISE NOTICE 'Seed data inserido com sucesso!';
    RAISE NOTICE 'Login Admin: admin@pedrasdemo.com / Admin@123';
    RAISE NOTICE 'Login Vendedor: vendedor@pedrasdemo.com / Vendedor@123';
    RAISE NOTICE 'Login Broker: broker@example.com / Broker@123';
    RAISE NOTICE 'ATENÇÃO: Trocar senhas em produção!';
END $$;
```

---

### `.\pkg\jwt\token.go`

```go
package jwt

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

// TokenType representa o tipo de token
type TokenType string

const (
	AccessToken  TokenType = "access"
	RefreshToken TokenType = "refresh"
)

// Claims representa os claims customizados do JWT
type Claims struct {
	UserID     string  `json:"userId"`
	Role       string  `json:"role"`
	IndustryID *string `json:"industryId,omitempty"`
	Type       string  `json:"type"` // "access" ou "refresh"
	jwt.RegisteredClaims
}

// TokenManager gerencia operações com JWT
type TokenManager struct {
	secret                  []byte
	accessTokenDuration     time.Duration
	refreshTokenDuration    time.Duration
}

// NewTokenManager cria um novo TokenManager
func NewTokenManager(secret string, accessDuration, refreshDuration time.Duration) *TokenManager {
	return &TokenManager{
		secret:                  []byte(secret),
		accessTokenDuration:     accessDuration,
		refreshTokenDuration:    refreshDuration,
	}
}

// GenerateAccessToken gera um access token JWT
func (tm *TokenManager) GenerateAccessToken(userID, role string, industryID *string) (string, error) {
	now := time.Now()
	
	claims := &Claims{
		UserID:     userID,
		Role:       role,
		IndustryID: industryID,
		Type:       string(AccessToken),
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        uuid.New().String(),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(tm.accessTokenDuration)),
			NotBefore: jwt.NewNumericDate(now),
			Issuer:    "cava-api",
			Subject:   userID,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	
	return token.SignedString(tm.secret)
}

// GenerateRefreshToken gera um refresh token JWT
func (tm *TokenManager) GenerateRefreshToken(userID string) (string, error) {
	now := time.Now()
	
	claims := &Claims{
		UserID: userID,
		Type:   string(RefreshToken),
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        uuid.New().String(),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(tm.refreshTokenDuration)),
			NotBefore: jwt.NewNumericDate(now),
			Issuer:    "cava-api",
			Subject:   userID,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	
	return token.SignedString(tm.secret)
}

// ValidateToken valida um token JWT e retorna os claims
func (tm *TokenManager) ValidateToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		// Verificar método de assinatura
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("método de assinatura inválido: %v", token.Header["alg"])
		}
		return tm.secret, nil
	})

	if err != nil {
		return nil, fmt.Errorf("erro ao validar token: %w", err)
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("token inválido")
	}

	return claims, nil
}

// ValidateAccessToken valida especificamente um access token
func (tm *TokenManager) ValidateAccessToken(tokenString string) (*Claims, error) {
	claims, err := tm.ValidateToken(tokenString)
	if err != nil {
		return nil, err
	}

	if claims.Type != string(AccessToken) {
		return nil, fmt.Errorf("token não é um access token")
	}

	return claims, nil
}

// ValidateRefreshToken valida especificamente um refresh token
func (tm *TokenManager) ValidateRefreshToken(tokenString string) (*Claims, error) {
	claims, err := tm.ValidateToken(tokenString)
	if err != nil {
		return nil, err
	}

	if claims.Type != string(RefreshToken) {
		return nil, fmt.Errorf("token não é um refresh token")
	}

	return claims, nil
}

// ExtractClaims extrai os claims de um token sem validar assinatura (útil para debugging)
// ATENÇÃO: NÃO usar para validação de autenticação
func (tm *TokenManager) ExtractClaims(tokenString string) (*Claims, error) {
	token, _, err := new(jwt.Parser).ParseUnverified(tokenString, &Claims{})
	if err != nil {
		return nil, fmt.Errorf("erro ao extrair claims: %w", err)
	}

	claims, ok := token.Claims.(*Claims)
	if !ok {
		return nil, fmt.Errorf("claims inválidos")
	}

	return claims, nil
}

// IsExpired verifica se um token está expirado
func (tm *TokenManager) IsExpired(tokenString string) bool {
	claims, err := tm.ExtractClaims(tokenString)
	if err != nil {
		return true
	}

	return claims.ExpiresAt.Before(time.Now())
}

// GetTokenID retorna o ID (jti) de um token
func (tm *TokenManager) GetTokenID(tokenString string) (string, error) {
	claims, err := tm.ExtractClaims(tokenString)
	if err != nil {
		return "", err
	}

	return claims.ID, nil
}

// GetUserID retorna o userID de um token
func (tm *TokenManager) GetUserID(tokenString string) (string, error) {
	claims, err := tm.ValidateToken(tokenString)
	if err != nil {
		return "", err
	}

	return claims.UserID, nil
}

// GetRole retorna o role de um token
func (tm *TokenManager) GetRole(tokenString string) (string, error) {
	claims, err := tm.ValidateToken(tokenString)
	if err != nil {
		return "", err
	}

	return claims.Role, nil
}

// GetIndustryID retorna o industryID de um token (pode ser nil)
func (tm *TokenManager) GetIndustryID(tokenString string) (*string, error) {
	claims, err := tm.ValidateToken(tokenString)
	if err != nil {
		return nil, err
	}

	return claims.IndustryID, nil
}
```

---

### `.\pkg\pagination\pagination.go`

```go
package pagination

import (
	"strconv"
)

const (
	// DefaultPage é a página padrão
	DefaultPage = 1
	
	// DefaultLimit é o limite padrão de itens por página
	DefaultLimit = 25
	
	// MaxLimit é o limite máximo de itens por página
	MaxLimit = 100
	
	// MinPage é a página mínima
	MinPage = 1
	
	// MinLimit é o limite mínimo de itens por página
	MinLimit = 1
)

// Params representa os parâmetros de paginação
type Params struct {
	Page   int `json:"page"`
	Limit  int `json:"limit"`
	Offset int `json:"offset"`
}

// Metadata representa os metadados de paginação na resposta
type Metadata struct {
	Page       int `json:"page"`
	Limit      int `json:"limit"`
	Total      int `json:"total"`
	TotalPages int `json:"totalPages"`
}

// NewParams cria novos parâmetros de paginação com valores validados
func NewParams(page, limit int) *Params {
	// Validar e ajustar page
	if page < MinPage {
		page = DefaultPage
	}
	
	// Validar e ajustar limit
	if limit < MinLimit {
		limit = DefaultLimit
	}
	if limit > MaxLimit {
		limit = MaxLimit
	}
	
	// Calcular offset
	offset := (page - 1) * limit
	
	return &Params{
		Page:   page,
		Limit:  limit,
		Offset: offset,
	}
}

// NewParamsFromStrings cria parâmetros de paginação a partir de strings
func NewParamsFromStrings(pageStr, limitStr string) *Params {
	page, _ := strconv.Atoi(pageStr)
	limit, _ := strconv.Atoi(limitStr)
	
	return NewParams(page, limit)
}

// NewMetadata cria metadados de paginação
func NewMetadata(page, limit, total int) *Metadata {
	totalPages := calculateTotalPages(total, limit)
	
	return &Metadata{
		Page:       page,
		Limit:      limit,
		Total:      total,
		TotalPages: totalPages,
	}
}

// calculateTotalPages calcula o número total de páginas
func calculateTotalPages(total, limit int) int {
	if limit == 0 {
		return 0
	}
	
	pages := total / limit
	if total%limit > 0 {
		pages++
	}
	
	return pages
}

// HasNextPage verifica se há próxima página
func (m *Metadata) HasNextPage() bool {
	return m.Page < m.TotalPages
}

// HasPreviousPage verifica se há página anterior
func (m *Metadata) HasPreviousPage() bool {
	return m.Page > 1
}

// NextPage retorna o número da próxima página
func (m *Metadata) NextPage() int {
	if !m.HasNextPage() {
		return m.Page
	}
	return m.Page + 1
}

// PreviousPage retorna o número da página anterior
func (m *Metadata) PreviousPage() int {
	if !m.HasPreviousPage() {
		return m.Page
	}
	return m.Page - 1
}

// Response representa uma resposta paginada genérica
type Response struct {
	Data     interface{} `json:"data"`
	Metadata *Metadata   `json:"metadata"`
}

// NewResponse cria uma nova resposta paginada
func NewResponse(data interface{}, page, limit, total int) *Response {
	return &Response{
		Data:     data,
		Metadata: NewMetadata(page, limit, total),
	}
}

// ValidatePage valida o número da página
func ValidatePage(page int) int {
	if page < MinPage {
		return DefaultPage
	}
	return page
}

// ValidateLimit valida o limite de itens por página
func ValidateLimit(limit int) int {
	if limit < MinLimit {
		return DefaultLimit
	}
	if limit > MaxLimit {
		return MaxLimit
	}
	return limit
}

// CalculateOffset calcula o offset baseado na página e limite
func CalculateOffset(page, limit int) int {
	return (page - 1) * limit
}

// GetPageRange retorna o range de itens da página atual
func GetPageRange(page, limit int) (start, end int) {
	start = (page - 1) * limit
	end = start + limit
	return start, end
}

// IsValidPageNumber verifica se o número da página é válido
func IsValidPageNumber(page, totalPages int) bool {
	return page >= MinPage && page <= totalPages
}
```

---

### `.\pkg\password\argon2.go`

```go
package password

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"fmt"
	"strings"

	"golang.org/x/crypto/argon2"
)

// Argon2Params contém os parâmetros de configuração do Argon2
type Argon2Params struct {
	Memory      uint32 // Memória em KB
	Iterations  uint32 // Número de iterações
	Parallelism uint8  // Threads paralelas
	SaltLength  uint32 // Tamanho do salt em bytes
	KeyLength   uint32 // Tamanho da chave derivada em bytes
}

// DefaultParams retorna os parâmetros padrão recomendados para Argon2id
func DefaultParams() *Argon2Params {
	return &Argon2Params{
		Memory:      64 * 1024, // 64 MB
		Iterations:  3,
		Parallelism: 2,
		SaltLength:  16,
		KeyLength:   32,
	}
}

// Hasher gerencia operações de hash de senha
type Hasher struct {
	params *Argon2Params
	pepper string // Salt global adicional
}

// NewHasher cria um novo Hasher com parâmetros customizados
func NewHasher(params *Argon2Params, pepper string) *Hasher {
	if params == nil {
		params = DefaultParams()
	}
	return &Hasher{
		params: params,
		pepper: pepper,
	}
}

// Hash gera o hash de uma senha usando Argon2id
func (h *Hasher) Hash(password string) (string, error) {
	// Adicionar pepper à senha
	password = password + h.pepper

	// Gerar salt aleatório
	salt, err := generateRandomBytes(h.params.SaltLength)
	if err != nil {
		return "", fmt.Errorf("erro ao gerar salt: %w", err)
	}

	// Gerar hash usando Argon2id
	hash := argon2.IDKey(
		[]byte(password),
		salt,
		h.params.Iterations,
		h.params.Memory,
		h.params.Parallelism,
		h.params.KeyLength,
	)

	// Codificar hash no formato: $argon2id$v=19$m=65536,t=3,p=2$salt$hash
	encodedHash := h.encodeHash(salt, hash)

	return encodedHash, nil
}

// Verify verifica se uma senha corresponde ao hash
func (h *Hasher) Verify(password, encodedHash string) error {
	// Adicionar pepper à senha
	password = password + h.pepper

	// Decodificar hash
	params, salt, hash, err := h.decodeHash(encodedHash)
	if err != nil {
		return fmt.Errorf("erro ao decodificar hash: %w", err)
	}

	// Gerar hash com a senha fornecida usando os mesmos parâmetros
	otherHash := argon2.IDKey(
		[]byte(password),
		salt,
		params.Iterations,
		params.Memory,
		params.Parallelism,
		params.KeyLength,
	)

	// Comparação constant-time para prevenir timing attacks
	if subtle.ConstantTimeCompare(hash, otherHash) != 1 {
		return fmt.Errorf("senha incorreta")
	}

	return nil
}

// encodeHash codifica o hash no formato padrão
func (h *Hasher) encodeHash(salt, hash []byte) string {
	b64Salt := base64.RawStdEncoding.EncodeToString(salt)
	b64Hash := base64.RawStdEncoding.EncodeToString(hash)

	return fmt.Sprintf(
		"$argon2id$v=%d$m=%d,t=%d,p=%d$%s$%s",
		argon2.Version,
		h.params.Memory,
		h.params.Iterations,
		h.params.Parallelism,
		b64Salt,
		b64Hash,
	)
}

// decodeHash decodifica o hash do formato padrão
func (h *Hasher) decodeHash(encodedHash string) (*Argon2Params, []byte, []byte, error) {
	parts := strings.Split(encodedHash, "$")
	if len(parts) != 6 {
		return nil, nil, nil, fmt.Errorf("formato de hash inválido")
	}

	// Verificar algoritmo
	if parts[1] != "argon2id" {
		return nil, nil, nil, fmt.Errorf("algoritmo não suportado")
	}

	// Verificar versão
	var version int
	_, err := fmt.Sscanf(parts[2], "v=%d", &version)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("versão inválida: %w", err)
	}
	if version != argon2.Version {
		return nil, nil, nil, fmt.Errorf("versão incompatível")
	}

	// Extrair parâmetros
	params := &Argon2Params{}
	_, err = fmt.Sscanf(parts[3], "m=%d,t=%d,p=%d", &params.Memory, &params.Iterations, &params.Parallelism)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("parâmetros inválidos: %w", err)
	}

	// Decodificar salt
	salt, err := base64.RawStdEncoding.DecodeString(parts[4])
	if err != nil {
		return nil, nil, nil, fmt.Errorf("salt inválido: %w", err)
	}
	params.SaltLength = uint32(len(salt))

	// Decodificar hash
	hash, err := base64.RawStdEncoding.DecodeString(parts[5])
	if err != nil {
		return nil, nil, nil, fmt.Errorf("hash inválido: %w", err)
	}
	params.KeyLength = uint32(len(hash))

	return params, salt, hash, nil
}

// generateRandomBytes gera bytes aleatórios criptograficamente seguros
func generateRandomBytes(n uint32) ([]byte, error) {
	b := make([]byte, n)
	_, err := rand.Read(b)
	if err != nil {
		return nil, err
	}
	return b, nil
}

// ValidatePasswordStrength valida a força da senha
func ValidatePasswordStrength(password string) error {
	if len(password) < 8 {
		return fmt.Errorf("senha deve ter pelo menos 8 caracteres")
	}

	var (
		hasUpper   bool
		hasLower   bool
		hasNumber  bool
		hasSpecial bool
	)

	for _, char := range password {
		switch {
		case 'A' <= char && char <= 'Z':
			hasUpper = true
		case 'a' <= char && char <= 'z':
			hasLower = true
		case '0' <= char && char <= '9':
			hasNumber = true
		case strings.ContainsRune("!@#$%^&*()_+-=[]{}|;:,.<>?", char):
			hasSpecial = true
		}
	}

	if !hasUpper {
		return fmt.Errorf("senha deve conter pelo menos uma letra maiúscula")
	}

	if !hasNumber {
		return fmt.Errorf("senha deve conter pelo menos um número")
	}

	// hasLower e hasSpecial são opcionais mas recomendados
	_ = hasLower
	_ = hasSpecial

	return nil
}
```

---

### `.\pkg\response\json.go`

```go
package response

import (
	"encoding/json"
	"net/http"

	appErrors "github.com/thiagomes07/CAVA/backend/internal/domain/errors"
)

// SuccessResponse representa uma resposta de sucesso
type SuccessResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
}

// ErrorResponse representa uma resposta de erro
type ErrorResponse struct {
	Success bool                   `json:"success"`
	Error   ErrorDetail            `json:"error"`
}

// ErrorDetail contém os detalhes do erro
type ErrorDetail struct {
	Code    string                 `json:"code"`
	Message string                 `json:"message"`
	Details map[string]interface{} `json:"details,omitempty"`
}

// JSON envia uma resposta JSON genérica
func JSON(w http.ResponseWriter, statusCode int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	
	if err := json.NewEncoder(w).Encode(data); err != nil {
		// Se falhar ao encodar, logar erro mas não fazer nada
		// (já foi escrito o status code)
		return
	}
}

// Success envia uma resposta de sucesso
func Success(w http.ResponseWriter, statusCode int, data interface{}) {
	response := SuccessResponse{
		Success: true,
		Data:    data,
	}
	JSON(w, statusCode, response)
}

// Created envia uma resposta de criação (201)
func Created(w http.ResponseWriter, data interface{}) {
	Success(w, http.StatusCreated, data)
}

// OK envia uma resposta de sucesso (200)
func OK(w http.ResponseWriter, data interface{}) {
	Success(w, http.StatusOK, data)
}

// NoContent envia uma resposta sem conteúdo (204)
func NoContent(w http.ResponseWriter) {
	w.WriteHeader(http.StatusNoContent)
}

// Error envia uma resposta de erro
func Error(w http.ResponseWriter, statusCode int, code, message string, details map[string]interface{}) {
	response := ErrorResponse{
		Success: false,
		Error: ErrorDetail{
			Code:    code,
			Message: message,
			Details: details,
		},
	}
	JSON(w, statusCode, response)
}

// ErrorFromAppError envia uma resposta de erro a partir de um AppError
func ErrorFromAppError(w http.ResponseWriter, err *appErrors.AppError) {
	Error(w, err.StatusCode, err.Code, err.Message, err.Details)
}

// HandleError trata um erro e envia a resposta apropriada
func HandleError(w http.ResponseWriter, err error) {
	// Verificar se é um AppError
	if appErr, ok := err.(*appErrors.AppError); ok {
		ErrorFromAppError(w, appErr)
		return
	}

	// Erro genérico
	InternalServerError(w, err)
}

// BadRequest envia uma resposta de bad request (400)
func BadRequest(w http.ResponseWriter, message string, details map[string]interface{}) {
	Error(w, http.StatusBadRequest, "BAD_REQUEST", message, details)
}

// ValidationError envia uma resposta de erro de validação (400)
func ValidationError(w http.ResponseWriter, details map[string]interface{}) {
	Error(w, http.StatusBadRequest, "VALIDATION_ERROR", "Dados inválidos", details)
}

// Unauthorized envia uma resposta de não autorizado (401)
func Unauthorized(w http.ResponseWriter, message string) {
	Error(w, http.StatusUnauthorized, "UNAUTHORIZED", message, nil)
}

// Forbidden envia uma resposta de proibido (403)
func Forbidden(w http.ResponseWriter, message string) {
	Error(w, http.StatusForbidden, "FORBIDDEN", message, nil)
}

// NotFound envia uma resposta de não encontrado (404)
func NotFound(w http.ResponseWriter, message string) {
	Error(w, http.StatusNotFound, "NOT_FOUND", message, nil)
}

// Conflict envia uma resposta de conflito (409)
func Conflict(w http.ResponseWriter, message string, details map[string]interface{}) {
	Error(w, http.StatusConflict, "CONFLICT", message, details)
}

// TooManyRequests envia uma resposta de rate limit excedido (429)
func TooManyRequests(w http.ResponseWriter) {
	Error(w, http.StatusTooManyRequests, "RATE_LIMIT_EXCEEDED", 
		"Limite de requisições excedido. Tente novamente mais tarde", nil)
}

// InternalServerError envia uma resposta de erro interno (500)
func InternalServerError(w http.ResponseWriter, err error) {
	// Em produção, não expor detalhes do erro interno
	message := "Erro interno do servidor"
	
	// Em desenvolvimento, pode incluir o erro (opcional)
	// if isDevelopment {
	// 	message = err.Error()
	// }
	
	Error(w, http.StatusInternalServerError, "INTERNAL_ERROR", message, nil)
}

// ServiceUnavailable envia uma resposta de serviço indisponível (503)
func ServiceUnavailable(w http.ResponseWriter, message string) {
	Error(w, http.StatusServiceUnavailable, "SERVICE_UNAVAILABLE", message, nil)
}

// ParseJSON faz parse do body JSON da requisição
func ParseJSON(r *http.Request, v interface{}) error {
	if r.Body == nil {
		return appErrors.ValidationError("corpo da requisição vazio")
	}
	
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields() // Não permitir campos desconhecidos
	
	if err := decoder.Decode(v); err != nil {
		return appErrors.ValidationError("JSON inválido")
	}
	
	return nil
}

// SetJSONContentType define o Content-Type como application/json
func SetJSONContentType(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "application/json")
}

// SetCacheControl define headers de cache
func SetCacheControl(w http.ResponseWriter, maxAge int) {
	w.Header().Set("Cache-Control", "public, max-age="+string(rune(maxAge)))
}

// SetNoCacheControl define headers para não fazer cache
func SetNoCacheControl(w http.ResponseWriter) {
	w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
	w.Header().Set("Pragma", "no-cache")
	w.Header().Set("Expires", "0")
}
```

---

### `.\pkg\utils\slug.go`

```go
package utils

import (
	"regexp"
	"strings"

	"github.com/gosimple/slug"
)

var (
	// Regex para validar formato de slug
	slugRegex = regexp.MustCompile(`^[a-z0-9]+(-[a-z0-9]+)*$`)
	
	// Regex para caracteres não permitidos
	invalidCharsRegex = regexp.MustCompile(`[^a-z0-9-]`)
	
	// Regex para múltiplos hífens consecutivos
	multipleHyphensRegex = regexp.MustCompile(`-+`)
)

// GenerateSlug gera um slug a partir de uma string
func GenerateSlug(s string) string {
	// Usar biblioteca gosimple/slug para conversão básica
	generated := slug.Make(s)
	
	// Garantir que está em lowercase
	generated = strings.ToLower(generated)
	
	// Limpar caracteres inválidos
	generated = invalidCharsRegex.ReplaceAllString(generated, "")
	
	// Remover múltiplos hífens consecutivos
	generated = multipleHyphensRegex.ReplaceAllString(generated, "-")
	
	// Remover hífens no início e fim
	generated = strings.Trim(generated, "-")
	
	return generated
}

// IsValidSlug verifica se um slug é válido
func IsValidSlug(s string) bool {
	// Verificar tamanho
	if len(s) < 3 || len(s) > 50 {
		return false
	}
	
	// Verificar formato
	return slugRegex.MatchString(s)
}

// SanitizeSlug sanitiza um slug removendo caracteres inválidos
func SanitizeSlug(s string) string {
	// Converter para lowercase
	s = strings.ToLower(s)
	
	// Remover espaços extras
	s = strings.TrimSpace(s)
	
	// Substituir espaços por hífens
	s = strings.ReplaceAll(s, " ", "-")
	
	// Remover caracteres inválidos
	s = invalidCharsRegex.ReplaceAllString(s, "")
	
	// Remover múltiplos hífens consecutivos
	s = multipleHyphensRegex.ReplaceAllString(s, "-")
	
	// Remover hífens no início e fim
	s = strings.Trim(s, "-")
	
	return s
}

// GenerateUniqueSlug gera um slug único adicionando sufixo numérico se necessário
func GenerateUniqueSlug(base string, existsFn func(string) bool) string {
	slug := GenerateSlug(base)
	
	if !existsFn(slug) {
		return slug
	}
	
	// Adicionar sufixo numérico até encontrar slug único
	counter := 1
	for {
		candidate := slug + "-" + string(rune(counter))
		if !existsFn(candidate) {
			return candidate
		}
		counter++
		
		// Limite de segurança
		if counter > 1000 {
			// Adicionar timestamp para garantir unicidade
			return slug + "-" + GenerateRandomSlug(6)
		}
	}
}

// GenerateRandomSlug gera um slug aleatório com tamanho específico
func GenerateRandomSlug(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyz0123456789"
	result := make([]byte, length)
	
	for i := range result {
		result[i] = charset[i%len(charset)]
	}
	
	return string(result)
}

// TruncateSlug trunca um slug para um tamanho máximo mantendo formato válido
func TruncateSlug(s string, maxLength int) string {
	if len(s) <= maxLength {
		return s
	}
	
	// Truncar
	truncated := s[:maxLength]
	
	// Remover hífen no final se houver
	truncated = strings.TrimRight(truncated, "-")
	
	return truncated
}

// ValidateSlugFormat valida o formato de um slug e retorna erro descritivo
func ValidateSlugFormat(s string) error {
	if len(s) < 3 {
		return ErrSlugTooShort
	}
	
	if len(s) > 50 {
		return ErrSlugTooLong
	}
	
	if !slugRegex.MatchString(s) {
		if strings.HasPrefix(s, "-") || strings.HasSuffix(s, "-") {
			return ErrSlugInvalidBoundary
		}
		
		if strings.Contains(s, "--") {
			return ErrSlugConsecutiveHyphens
		}
		
		return ErrSlugInvalidCharacters
	}
	
	return nil
}

// Erros de validação de slug
var (
	ErrSlugTooShort           = &SlugError{Message: "slug deve ter pelo menos 3 caracteres"}
	ErrSlugTooLong            = &SlugError{Message: "slug deve ter no máximo 50 caracteres"}
	ErrSlugInvalidCharacters  = &SlugError{Message: "slug deve conter apenas letras minúsculas, números e hífens"}
	ErrSlugInvalidBoundary    = &SlugError{Message: "slug não pode começar ou terminar com hífen"}
	ErrSlugConsecutiveHyphens = &SlugError{Message: "slug não pode conter hífens consecutivos"}
)

// SlugError representa um erro de validação de slug
type SlugError struct {
	Message string
}

func (e *SlugError) Error() string {
	return e.Message
}
```

---

### `.\pkg\utils\uuid.go`

```go
package utils

import (
	"github.com/google/uuid"
	appErrors "github.com/thiagomes07/CAVA/backend/internal/domain/errors"
)

// GenerateUUID gera um novo UUID v4
func GenerateUUID() string {
	return uuid.New().String()
}

// IsValidUUID verifica se uma string é um UUID válido
func IsValidUUID(str string) bool {
	_, err := uuid.Parse(str)
	return err == nil
}

// ParseUUID faz parse de uma string UUID e retorna erro se inválido
func ParseUUID(str string) (uuid.UUID, error) {
	id, err := uuid.Parse(str)
	if err != nil {
		return uuid.Nil, appErrors.ValidationError("UUID inválido")
	}
	return id, nil
}

// MustParseUUID faz parse de uma string UUID e entra em panic se inválido
// Use apenas quando tiver certeza que o UUID é válido
func MustParseUUID(str string) uuid.UUID {
	id, err := uuid.Parse(str)
	if err != nil {
		panic("UUID inválido: " + str)
	}
	return id
}

// NewUUIDFromString cria um UUID a partir de uma string
// Retorna nil UUID se inválido
func NewUUIDFromString(str string) *string {
	if !IsValidUUID(str) {
		return nil
	}
	return &str
}
```

---

### `.\pkg\validator\validator.go`

```go
package validator

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/go-playground/validator/v10"
	appErrors "github.com/thiagomes07/CAVA/backend/internal/domain/errors"
)

// Validator encapsula o validador do go-playground
type Validator struct {
	validate *validator.Validate
}

// New cria uma nova instância do Validator com validações customizadas
func New() *Validator {
	v := validator.New()
	
	// Registrar validações customizadas
	v.RegisterValidation("batchcode", validateBatchCode)
	v.RegisterValidation("cnpj", validateCNPJ)
	v.RegisterValidation("slug", validateSlug)
	
	return &Validator{
		validate: v,
	}
}

// Validate valida uma struct e retorna AppError se inválido
func (v *Validator) Validate(data interface{}) error {
	err := v.validate.Struct(data)
	if err == nil {
		return nil
	}

	// Converter erros de validação para AppError
	validationErrors, ok := err.(validator.ValidationErrors)
	if !ok {
		return appErrors.ValidationError("erro de validação desconhecido")
	}

	// Mapear erros por campo
	details := make(map[string]interface{})
	for _, fieldError := range validationErrors {
		fieldName := toSnakeCase(fieldError.Field())
		details[fieldName] = getErrorMessage(fieldError)
	}

	return appErrors.NewValidationError("Dados inválidos", details)
}

// ValidateVar valida uma variável individual
func (v *Validator) ValidateVar(field interface{}, tag string) error {
	err := v.validate.Var(field, tag)
	if err == nil {
		return nil
	}

	return appErrors.ValidationError(fmt.Sprintf("validação falhou: %s", tag))
}

// getErrorMessage retorna a mensagem de erro apropriada para cada tipo de validação
func getErrorMessage(fe validator.FieldError) string {
	field := fe.Field()
	
	switch fe.Tag() {
	case "required":
		return fmt.Sprintf("%s é obrigatório", field)
	case "email":
		return fmt.Sprintf("%s deve ser um email válido", field)
	case "min":
		return fmt.Sprintf("%s deve ter no mínimo %s caracteres", field, fe.Param())
	case "max":
		return fmt.Sprintf("%s deve ter no máximo %s caracteres", field, fe.Param())
	case "len":
		return fmt.Sprintf("%s deve ter exatamente %s caracteres", field, fe.Param())
	case "gt":
		return fmt.Sprintf("%s deve ser maior que %s", field, fe.Param())
	case "gte":
		return fmt.Sprintf("%s deve ser maior ou igual a %s", field, fe.Param())
	case "lt":
		return fmt.Sprintf("%s deve ser menor que %s", field, fe.Param())
	case "lte":
		return fmt.Sprintf("%s deve ser menor ou igual a %s", field, fe.Param())
	case "oneof":
		return fmt.Sprintf("%s deve ser um dos valores: %s", field, fe.Param())
	case "uuid":
		return fmt.Sprintf("%s deve ser um UUID válido", field)
	case "url":
		return fmt.Sprintf("%s deve ser uma URL válida", field)
	case "batchcode":
		return fmt.Sprintf("%s deve estar no formato AAA-999999", field)
	case "cnpj":
		return fmt.Sprintf("%s deve ser um CNPJ válido", field)
	case "slug":
		return fmt.Sprintf("%s deve conter apenas letras minúsculas, números e hífens", field)
	default:
		return fmt.Sprintf("%s é inválido", field)
	}
}

// toSnakeCase converte CamelCase para snake_case
func toSnakeCase(s string) string {
	var result strings.Builder
	for i, r := range s {
		if i > 0 && r >= 'A' && r <= 'Z' {
			result.WriteRune('_')
		}
		result.WriteRune(r)
	}
	return strings.ToLower(result.String())
}

// =============================================
// VALIDAÇÕES CUSTOMIZADAS
// =============================================

// validateBatchCode valida o formato do código de lote (AAA-999999)
func validateBatchCode(fl validator.FieldLevel) bool {
	value := fl.Field().String()
	
	// Regex: 3 letras maiúsculas, hífen, 6 dígitos
	matched, _ := regexp.MatchString(`^[A-Z]{3}-\d{6}$`, value)
	return matched
}

// validateCNPJ valida o formato do CNPJ (apenas dígitos)
func validateCNPJ(fl validator.FieldLevel) bool {
	value := fl.Field().String()
	
	// Validar se tem 14 dígitos
	if len(value) != 14 {
		return false
	}
	
	// Validar se contém apenas números
	matched, _ := regexp.MatchString(`^\d{14}$`, value)
	if !matched {
		return false
	}
	
	// Validação do algoritmo do CNPJ
	return validateCNPJAlgorithm(value)
}

// validateCNPJAlgorithm valida o dígito verificador do CNPJ
func validateCNPJAlgorithm(cnpj string) bool {
	// Verificar CNPJs inválidos conhecidos
	invalidCNPJs := []string{
		"00000000000000",
		"11111111111111",
		"22222222222222",
		"33333333333333",
		"44444444444444",
		"55555555555555",
		"66666666666666",
		"77777777777777",
		"88888888888888",
		"99999999999999",
	}
	
	for _, invalid := range invalidCNPJs {
		if cnpj == invalid {
			return false
		}
	}
	
	// Calcular primeiro dígito verificador
	sum := 0
	weights := []int{5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2}
	for i := 0; i < 12; i++ {
		digit := int(cnpj[i] - '0')
		sum += digit * weights[i]
	}
	remainder := sum % 11
	digit1 := 0
	if remainder >= 2 {
		digit1 = 11 - remainder
	}
	
	// Verificar primeiro dígito
	if int(cnpj[12]-'0') != digit1 {
		return false
	}
	
	// Calcular segundo dígito verificador
	sum = 0
	weights = []int{6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2}
	for i := 0; i < 13; i++ {
		digit := int(cnpj[i] - '0')
		sum += digit * weights[i]
	}
	remainder = sum % 11
	digit2 := 0
	if remainder >= 2 {
		digit2 = 11 - remainder
	}
	
	// Verificar segundo dígito
	return int(cnpj[13]-'0') == digit2
}

// validateSlug valida o formato do slug (lowercase, números, hífens)
func validateSlug(fl validator.FieldLevel) bool {
	value := fl.Field().String()
	
	// Regex: lowercase, números, hífens (não pode começar/terminar com hífen)
	matched, _ := regexp.MatchString(`^[a-z0-9]+(-[a-z0-9]+)*$`, value)
	return matched
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
- .\internal\domain\errors\errors.go
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

## ⚠️ Arquivos sem conteúdo
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
