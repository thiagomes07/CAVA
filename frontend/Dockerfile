# =============================================
# STAGE 1: Dependencies
# =============================================
FROM node:22-alpine AS deps

WORKDIR /app

# Copiar apenas arquivos de dependências para melhor cache
COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm install --prefer-offline --no-audit; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
  else npm i; \
  fi

# =============================================
# STAGE 2: Build
# =============================================
FROM node:22-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build args que viram env vars no build time
# Variáveis NEXT_PUBLIC_* são inlined no bundle JS durante o build
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_IMAGE_HOSTNAME

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_IMAGE_HOSTNAME=$NEXT_PUBLIC_IMAGE_HOSTNAME

# Desabilitar telemetria do Next.js durante build
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# =============================================
# STAGE 3: Runtime (standalone output)
# =============================================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Criar usuário não-root para segurança
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copiar arquivos públicos
COPY --from=builder /app/public ./public

# Copiar standalone output (inclui server.js e dependências mínimas)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# INTERNAL_API_URL é definido em runtime (não build time)
# para SSR dentro da rede Docker/ECS apontar direto ao backend
# Exemplo: INTERNAL_API_URL=http://backend:3001/api
# ENV INTERNAL_API_URL=http://backend:3001/api

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Labels para metadata
LABEL maintainer="CAVA Team"
LABEL version="1.0"
LABEL description="CAVA Frontend - Next.js SSR Application"

CMD ["node", "server.js"]
