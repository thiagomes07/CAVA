# CAVA Stone Platform - Frontend Technical Specification

## 1. Arquitetura do Frontend

### 1.1. Estrutura de Diretórios (Next.js App Router)

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── layout.tsx
│   ├── (industry)/
│   │   ├── dashboard/
│   │   ├── catalog/
│   │   ├── inventory/
│   │   ├── brokers/
│   │   ├── sales/
│   │   ├── team/
│   │   └── layout.tsx
│   ├── (broker)/
│   │   ├── dashboard/
│   │   ├── shared-inventory/
│   │   ├── links/
│   │   ├── leads/
│   │   └── layout.tsx
│   ├── (seller)/
│   │   ├── dashboard/
│   │   ├── inventory/
│   │   ├── links/
│   │   └── layout.tsx
│   ├── (public)/
│   │   ├── [slug]/
│   │   └── layout.tsx
│   └── api/
│       └── (routes internos se necessário)
├── components/
│   ├── ui/
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── modal.tsx
│   │   ├── table.tsx
│   │   └── ...
│   ├── shared/
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   ├── EmptyState.tsx
│   │   └── LoadingState.tsx
│   ├── catalog/
│   ├── inventory/
│   ├── sales/
│   └── public/
├── lib/
│   ├── api/
│   │   ├── client.ts
│   │   ├── queries/
│   │   └── mutations/
│   ├── hooks/
│   ├── utils/
│   ├── schemas/
│   └── types/
├── store/
│   ├── auth.store.ts
│   ├── ui.store.ts
│   └── cart.store.ts (se aplicável)
└── middleware.ts
```

### 1.2. Estratégia de Autenticação

**Cookies e Tokens:**
- Access Token: Cookie HTTP Only, Secure, SameSite=Strict, duração 15min
- Refresh Token: Cookie HTTP Only, Secure, SameSite=Strict, duração 7d
- Armazenar `user_role` e `industry_id` em cookie separado (legível pelo client para UI condicional)

**Middleware (`middleware.ts`):**
- Intercepta todas as rotas exceto `(public)` e `(auth)`
- Valida presença de Access Token
- Se expirado, tenta renovar com Refresh Token via endpoint `/api/auth/refresh`
- Se renovação falha, redireciona para `/login` com `callbackUrl`
- Valida role do usuário contra rota acessada:
  - `(industry)/*` → requer `ADMIN_INDUSTRIA`
  - `(broker)/*` → requer `BROKER`
  - `(seller)/*` → requer `VENDEDOR_INTERNO`
- Se role inválida, redireciona para dashboard apropriado do usuário

**Hook de Autenticação (`useAuth`):**
- Expõe: `user`, `role`, `isAuthenticated`, `logout()`, `refreshSession()`
- Sincroniza com Zustand store para acesso global
- Fornece helper `hasPermission(requiredRole)` para UI condicional

**Fluxo de Login:**
1. POST `/api/auth/login` com `{ email, password }`
2. Backend retorna tokens nos cookies + dados do usuário em JSON
3. Frontend armazena user no Zustand
4. Redireciona baseado em `role`:
   - `ADMIN_INDUSTRIA` → `/dashboard`
   - `VENDEDOR_INTERNO` → `/dashboard`
   - `BROKER` → `/dashboard` (rota do broker)

---

## 2. Design System & Global UI

### 2.1. Configuração do Tailwind (`tailwind.config.js`)

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        obsidian: '#121212',
        'obsidian-hover': '#0F0F0F',
        porcelain: '#FFFFFF',
        mineral: '#F9F9FB',
        'off-white': '#FAFAFA',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['Playfair Display', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      letterSpacing: {
        widest: '0.15em',
      },
      boxShadow: {
        'premium': '0 4px 24px rgba(0, 0, 0, 0.08)',
        'premium-lg': '0 8px 40px rgba(0, 0, 0, 0.12)',
      },
    },
  },
}
```

### 2.2. Componentes Core (UI Kit)

**Button:**
- Variantes:
  - `primary`: bg-obsidian text-porcelain uppercase tracking-widest text-xs font-bold hover:shadow-premium
  - `secondary`: bg-porcelain border border-slate-200 text-slate-600 hover:border-obsidian hover:text-obsidian
  - `destructive`: bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100
  - `ghost`: transparent hover:bg-slate-50
- Tamanhos: `sm` (px-4 py-2), `md` (px-6 py-3), `lg` (px-8 py-4)
- Estados: `loading` (spinner interno), `disabled` (opacity-50 cursor-not-allowed)

**Card:**
- Base: bg-porcelain border border-slate-100 rounded-sm p-8
- Variantes:
  - `flat`: sem borda, bg-mineral
  - `elevated`: shadow-premium hover:shadow-premium-lg transition-shadow
  - `glass`: bg-white/95 backdrop-blur-md border-white/20

**Input/Textarea:**
- Base: border border-slate-200 rounded-sm px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-obsidian/20 focus:border-obsidian
- Label: uppercase tracking-widest text-[10px] text-slate-500 mb-2
- Error state: border-rose-300 focus:ring-rose-100
- Helper text: text-xs text-slate-400 mt-1

**Modal:**
- Overlay: bg-black/60 backdrop-blur-sm
- Container: bg-porcelain rounded-xl shadow-premium-lg max-w-2xl mx-auto p-10
- Header: font-serif text-3xl mb-6
- Footer: flex justify-end gap-3 pt-6 border-t border-slate-100

**Table:**
- Header: bg-mineral border-b-2 border-slate-200
- Header cell: uppercase tracking-widest text-[10px] text-slate-500 font-semibold py-4 px-6
- Row: border-b border-slate-100 hover:bg-slate-50/50 transition-colors
- Cell: py-4 px-6 text-sm
- Dados técnicos (IDs, dimensões): font-mono text-slate-600

**Badge/Tag:**
- Base: inline-flex items-center px-3 py-1 rounded-full text-[10px] uppercase tracking-widest font-semibold
- Status:
  - `DISPONIVEL`: bg-emerald-50 text-emerald-700 border border-emerald-200
  - `RESERVADO`: bg-blue-50 text-blue-700 border border-blue-200
  - `VENDIDO`: bg-slate-100 text-slate-600 border border-slate-200
  - `INATIVO`: bg-rose-50 text-rose-600 border border-rose-200

**LoadingState (Skeleton):**
- Usar `animate-pulse` com bg-slate-200/50
- Preservar estrutura visual da tela (mesma quantidade de linhas/cards)
- Bordas arredondadas `rounded-sm`

**EmptyState:**
- Centralizado verticalmente: `flex items-center justify-center min-h-[400px]`
- Ícone: Lucide icon em `slate-300` tamanho 48px
- Título: font-serif text-2xl text-slate-400 mb-2
- Descrição: text-sm text-slate-400 max-w-md text-center
- CTA opcional: Button primary

---

## 3. Mapeamento de Rotas e Fluxos

### 3.1. Rotas por Persona

| Rota | Acesso | Descrição |
|------|--------|-----------|
| `/login` | Público | Autenticação |
| `/dashboard` | ADMIN_INDUSTRIA, VENDEDOR_INTERNO | Dashboard com métricas |
| `/catalog` | ADMIN_INDUSTRIA | Gestão de Produtos (nível conceitual) |
| `/catalog/new` | ADMIN_INDUSTRIA | Criar novo produto |
| `/catalog/[id]` | ADMIN_INDUSTRIA | Editar produto |
| `/inventory` | ADMIN_INDUSTRIA, VENDEDOR_INTERNO | Listagem de Lotes |
| `/inventory/new` | ADMIN_INDUSTRIA | Cadastrar novo lote |
| `/inventory/[id]` | ADMIN_INDUSTRIA | Editar lote |
| `/inventory/[id]/photos` | ADMIN_INDUSTRIA | Upload de fotos do lote |
| `/brokers` | ADMIN_INDUSTRIA | Gestão de Brokers (usuários) |
| `/brokers/[id]/shared` | ADMIN_INDUSTRIA | Ver estoque compartilhado com broker |
| `/sales` | ADMIN_INDUSTRIA, VENDEDOR_INTERNO | Histórico de vendas |
| `/team` | ADMIN_INDUSTRIA | Gestão de Vendedores Internos |
| `/links` | ADMIN_INDUSTRIA, VENDEDOR_INTERNO, BROKER | Links de venda gerados |
| `/links/new` | ADMIN_INDUSTRIA, VENDEDOR_INTERNO, BROKER | Criar novo link |
| `/leads` | ADMIN_INDUSTRIA, VENDEDOR_INTERNO, BROKER | Gestão de leads capturados |
| `/dashboard` | BROKER | Dashboard do broker |
| `/shared-inventory` | BROKER | Lotes compartilhados comigo |
| `/[slug]` | Público | Visualização do link (Landing Page) |

### 3.2. Hierarquia de Navegação

**Sidebar (ADMIN_INDUSTRIA):**
- Dashboard
- Catálogo
  - Produtos
  - Novo Produto
- Estoque
  - Lotes
  - Novo Lote
- Vendas
  - Histórico
  - Reservas
- Links
  - Meus Links
  - Novo Link
- Leads
- Parceiros
  - Brokers
  - Vendedores Internos
- Configurações

**Sidebar (BROKER):**
- Dashboard
- Estoque Compartilhado
- Meus Links
- Leads

**Sidebar (VENDEDOR_INTERNO):**
- Dashboard
- Estoque
- Meus Links
- Leads

---

## 4. Detalhamento de Telas

### 4.1. Autenticação

#### **`/login`**

**Acesso:** Público (redireciona se autenticado)

**Objetivo:** Autenticar usuário no sistema.

**Layout & UI:**
- Split screen (50/50):
  - **Esquerda:** Formulário centralizado
    - Logo (monocromático, obsidian)
    - Título em font-serif: "Acesse sua conta"
    - Input email (com ícone Lucide `Mail`)
    - Input password (com ícone Lucide `Lock` e toggle visibility)
    - Button primary: "ENTRAR"
    - Link secundário: "Esqueci minha senha" (text-slate-500)
  - **Direita:** Imagem hero de pedra em alta resolução (filtro overlay black/40 + texto sobreposto em porcelain: frase institucional em font-serif)
- Background da esquerda: mineral
- Padding generoso (p-12)

**Dados & Integração:**
- Mutation: `POST /api/auth/login`
- Input: `{ email: string, password: string }`
- Output: cookies (auto-setados) + `{ user: User, role: UserRole }`
- Erro: exibir em text-rose-600 abaixo do form

**Estados:**
- Loading: button com spinner, inputs disabled
- Error: borda rose nos inputs, mensagem abaixo
- Success: redirect automático

---

### 4.2. Dashboard (Indústria e Vendedor Interno)

#### **`/dashboard`**

**Acesso:** ADMIN_INDUSTRIA, VENDEDOR_INTERNO

**Objetivo:** Visão geral de métricas e ações rápidas.

**Layout & UI:**
- **Header:** bg-obsidian text-porcelain p-6
  - Título em font-serif text-4xl: "Painel de Controle"
  - Subtítulo em text-porcelain/60: nome da indústria
- **Grid de Cards (3 colunas, gap-6, p-8):**
  - Card "Estoque Disponível"
    - Número grande em font-serif text-5xl: quantidade de lotes DISPONIVEL
    - Label em uppercase tracking-widest text-[10px] text-slate-500: "LOTES ATIVOS"
    - Ícone Lucide `Package`
  - Card "Vendas no Mês"
    - Número em font-serif + sufixo currency
    - Label: "FATURAMENTO MENSAL"
    - Ícone Lucide `TrendingUp`
  - Card "Lotes Reservados"
    - Número
    - Label: "AGUARDANDO CONFIRMAÇÃO"
    - Ícone Lucide `Clock`
- **Seção "Ações Rápidas" (abaixo dos cards):**
  - Grid horizontal de botões secondary:
    - "Cadastrar Lote" → `/inventory/new`
    - "Ver Estoque" → `/inventory`
    - "Histórico de Vendas" → `/sales`
- **Tabela "Últimas Movimentações":**
  - Colunas: Lote (código), Produto (nome), Vendedor, Ação (Reservado/Vendido), Data
  - Mostrar últimas 10 linhas
  - Link "Ver tudo" → `/sales`

**Dados & Integração:**
- Query: `GET /api/dashboard/metrics`
  - Retorna: `{ availableBatches: number, monthlySales: number, reservedBatches: number }`
- Query: `GET /api/dashboard/recent-activities`
  - Retorna: `Activity[]` (últimas 10)

**Estados:**
- Loading: Skeleton nos cards (retângulos com altura fixa) + skeleton table rows
- Empty: Se sem atividades, EmptyState com "Nenhuma movimentação recente"

---

### 4.3. Gestão de Catálogo (Produtos - Nível Conceitual)

#### **`/catalog`**

**Acesso:** ADMIN_INDUSTRIA

**Objetivo:** Listar e gerenciar Produtos (tipos de pedra).

**Layout & UI:**
- **Header:**
  - Título font-serif text-3xl: "Catálogo"
  - Button primary: "+ NOVO PRODUTO" (direita)
- **Filtros (horizontal, mb-6):**
  - Input search: placeholder "Buscar por nome ou SKU"
  - Dropdown "Tipo de Material" (Granito, Mármore, etc.)
  - Toggle "Mostrar Inativos"
- **Grid de Cards (3 colunas, gap-6):**
  - Cada card:
    - Imagem cover (aspect-ratio 4:3, object-cover, bg-slate-200 se sem foto)
    - Overlay glass (bg-black/60 backdrop-blur-sm) no hover, mostrando:
      - Button secondary small: "Editar"
      - Button secondary small: "Ver Lotes"
    - Footer do card:
      - Nome do produto em font-serif text-xl
      - SKU em font-mono text-xs text-slate-400
      - Badge status (Ativo/Inativo)
      - Microcopy: "X lotes cadastrados" (text-slate-500)

**Dados & Integração:**
- Query: `GET /api/products?search=&material=&includeInactive=false`
  - Retorna: `Product[]` com `batchCount`
- Mutation (delete): `DELETE /api/products/[id]` (soft delete)

**Estados:**
- Loading: Grid com skeleton cards
- Empty: EmptyState "Nenhum produto cadastrado" + CTA "Criar primeiro produto"
- Empty search: "Nenhum resultado para 'X'"

---

#### **`/catalog/new` e `/catalog/[id]`**

**Acesso:** ADMIN_INDUSTRIA

**Objetivo:** Criar ou editar Produto.

**Layout & UI:**
- **Form vertical (max-w-3xl, mx-auto, p-8):**
  - Título font-serif: "Novo Produto" ou "Editar Produto"
  - Seção "Informações Básicas":
    - Input "Nome do Produto" (required)
    - Input "Código SKU" (optional)
    - Select "Tipo de Material" (Granito, Mármore, etc.)
    - Select "Acabamento" (Polido, Levigado, etc.)
  - Seção "Descrição Técnica":
    - Textarea (rows: 6) placeholder: "Características técnicas, origem, recomendações..."
  - Seção "Fotos de Catálogo":
    - Upload zone (drag & drop)
    - Preview thumbnails (com botão delete e opção "Marcar como capa")
  - Seção "Visibilidade":
    - Toggle "Exibir no catálogo público"
  - Footer:
    - Button secondary: "Cancelar" → volta
    - Button primary: "SALVAR PRODUTO"

**Dados & Integração:**
- Query (edit): `GET /api/products/[id]`
- Mutation (create): `POST /api/products`
  - Input: `{ name, sku, material, finish, description, isPublic, medias: File[] }`
- Mutation (update): `PUT /api/products/[id]`
- Upload de imagens: `POST /api/upload/product-medias`
  - Retorna: `{ urls: string[] }`

**Estados:**
- Loading save: button com spinner, form disabled
- Validation errors: bordas rose nos inputs + mensagem
- Success: toast + redirect para `/catalog`

---

### 4.4. Gestão de Estoque (Lotes - Nível Físico)

#### **`/inventory`**

**Acesso:** ADMIN_INDUSTRIA, VENDEDOR_INTERNO

**Objetivo:** Listar todos os lotes físicos com filtros avançados.

**Layout & UI:**
- **Header:**
  - Título font-serif: "Estoque de Lotes"
  - Button primary: "+ NOVO LOTE" (apenas ADMIN_INDUSTRIA)
- **Filtros (grid 4 colunas, gap-4, mb-6):**
  - Dropdown "Produto" (autocomplete)
  - Dropdown "Status" (Disponível, Reservado, Vendido, Inativo)
  - Input "Código do Lote"
  - Button secondary: "Limpar Filtros"
- **Tabela:**
  - Colunas:
    - Foto thumbnail (80x80, object-cover, rounded-sm)
    - Código do Lote (font-mono, link para `/inventory/[id]`)
    - Produto (nome, text-slate-600)
    - Dimensões (font-mono, formato: "H×W×E cm")
    - Área Total (m², font-mono)
    - Preço Indústria (currency, font-serif)
    - Status (Badge)
    - Ações (ícones: Edit, Eye, Archive - apenas ADMIN_INDUSTRIA)
  - Paginação: 50 itens por página
  - Ordenação: clicável nos headers

**Dados & Integração:**
- Query: `GET /api/batches?productId=&status=&code=&page=1&limit=50`
  - Retorna: `{ batches: Batch[], total: number, page: number }`
- Mutation (inativar): `PATCH /api/batches/[id]/status` → `{ status: 'INATIVO' }`

**Estados:**
- Loading: Skeleton table rows (preservar altura)
- Empty: EmptyState "Nenhum lote cadastrado"
- Empty filtered: "Nenhum lote encontrado com estes filtros"

---

#### **`/inventory/new` e `/inventory/[id]`**

**Acesso:** ADMIN_INDUSTRIA

**Objetivo:** Cadastrar ou editar Lote físico.

**Layout & UI:**
- **Form (max-w-4xl, mx-auto):**
  - Título font-serif: "Novo Lote" ou "Editar Lote #XXX"
  - **Seção "Vinculação":**
    - Select "Produto" (required, com preview da foto do produto)
  - **Seção "Identificação":**
    - Input "Código do Lote" (auto-gerado se vazio, editável)
    - Input "Pedreira de Origem" (opcional)
    - Date picker "Data de Entrada"
  - **Seção "Dimensões Físicas" (grid 2 colunas):**
    - Input "Altura (cm)" (number, required)
    - Input "Largura (cm)" (number, required)
    - Input "Espessura (cm)" (number, required)
    - Input "Quantidade de Chapas" (number, default: 1)
    - Display calculado: "Área Total: X.XX m²" (auto-calcula)
  - **Seção "Precificação":**
    - Input "Preço Base Indústria (R$)" (currency, required)
    - Helper text: "Este é o preço de repasse para brokers"
  - **Seção "Fotos do Lote":**
    - Upload zone (aceita múltiplas)
    - Preview grid (3 colunas)
    - Botões: delete, reorder (drag), zoom
    - Indicação: "Primeira foto será a capa"
  - Footer:
    - Button secondary: "Cancelar"
    - Button primary: "SALVAR LOTE"

**Dados & Integração:**
- Query (edit): `GET /api/batches/[id]`
- Mutation (create): `POST /api/batches`
  - Input: `{ productId, batchCode, height, width, thickness, quantitySlabs, industryPrice, originQuarry, entryDate, medias: File[] }`
- Mutation (update): `PUT /api/batches/[id]`
- Upload: `POST /api/upload/batch-medias`

**Estados:**
- Loading: skeleton form
- Validation: real-time no blur dos inputs (ex: dimensões > 0)
- Success: toast + redirect `/inventory` ou `/inventory/[id]` (se edit)

---

### 4.5. Gestão de Brokers e Compartilhamento

#### **`/brokers`**

**Acesso:** ADMIN_INDUSTRIA

**Objetivo:** Gerenciar usuários Brokers e controlar acesso ao estoque.

**Layout & UI:**
- **Header:**
  - Título font-serif: "Parceiros (Brokers)"
  - Button primary: "+ CONVIDAR BROKER"
- **Tabela:**
  - Colunas:
    - Nome
    - Email
    - Telefone
    - Lotes Compartilhados (número, link para `/brokers/[id]/shared`)
    - Status (Ativo/Inativo - toggle)
    - Ações (Edit, View)
- **Modal "Convidar Broker":**
  - Input Nome, Email, Telefone, WhatsApp
  - Button: "ENVIAR CONVITE" (cria usuário com senha temporária e envia email)

**Dados & Integração:**
- Query: `GET /api/brokers`
  - Retorna: `User[]` com `sharedBatchesCount`
- Mutation: `POST /api/brokers/invite`
- Mutation: `PATCH /api/users/[id]/status`

---

#### **`/brokers/[id]/shared`**

**Acesso:** ADMIN_INDUSTRIA

**Objetivo:** Gerenciar quais lotes estão compartilhados com este Broker.

**Layout & UI:**
- **Header:**
  - Breadcrumb: Brokers > [Nome do Broker]
  - Título font-serif: "Estoque Compartilhado"
  - Button primary: "+ COMPARTILHAR LOTE"
- **Duas Colunas (gap-8):**
  - **Esquerda (60%):** Lotes Compartilhados
    - Tabela: Código, Produto, Preço Negociado, Data Compartilhamento, Ação (Remover)
  - **Direita (40%):** Catálogo Disponível
    - Toggle: "Permitir acesso ao catálogo completo"
    - Helper: "Broker poderá ver todos os produtos, mas não necessariamente os lotes"
- **Modal "Compartilhar Lote":**
  - Autocomplete "Selecionar Lote" (busca por código ou produto)
  - Preview do lote selecionado (foto + dados)
  - Input "Preço de Repasse para este Broker" (currency)
  - Helper: "Deixe vazio para usar preço padrão do lote"
  - Button: "COMPARTILHAR"

**Dados & Integração:**
- Query: `GET /api/brokers/[id]/shared-inventory`
- Mutation: `POST /api/shared-inventory-batches`
  - Input: `{ batchId, brokerUserId, negotiatedPrice? }`
- Mutation: `DELETE /api/shared-inventory-batches/[id]`
- Mutation (catálogo): `POST /api/shared-catalog-permissions`

---

### 4.6. Dashboard do Broker

#### **`/dashboard` (Broker)**

**Acesso:** BROKER

**Objetivo:** Visão geral de vendas e estoque disponível.

**Layout & UI:**
- **Header:** similar ao dashboard indústria, mas com dados do broker
- **Grid Métricas (4 cards):**
  - Lotes Disponíveis para Mim
  - Links Ativos Gerados
  - Leads Capturados
  - Comissão do Mês (R$)
- **Seção "Novos Lotes Compartilhados":**
  - Cards horizontais (foto + info rápida + Button: "Criar Link")
  - Mostrar últimos 5 lotes compartilhados
- **Tabela "Minhas Vendas Recentes":**
  - Colunas: Lote, Cliente, Valor Vendido, Minha Comissão, Data

**Dados & Integração:**
- Query: `GET /api/broker/dashboard/metrics`
- Query: `GET /api/broker/shared-inventory?recent=true&limit=5`
- Query: `GET /api/broker/sales?limit=10`

---

#### **`/shared-inventory` (Broker)**

**Acesso:** BROKER

**Objetivo:** Ver todos os lotes que a indústria compartilhou comigo.

**Layout & UI:**
- **Header:**
  - Título font-serif: "Estoque Disponível"
  - Button primary: "CRIAR LINK DE VENDA"
- **Filtros:**
  - Search por produto
  - Dropdown Status (apenas Disponível e Reservado visíveis)
- **Grid de Cards (3 colunas):**
  - Foto principal (aspect 4:3)
  - Badge status (canto superior direito)
  - Nome do Produto (font-serif)
  - Código do Lote (font-mono, text-xs)
  - Dimensões (font-mono)
  - **Seção Preços (destaque):**
    - "Preço Base Indústria": valor (text-slate-500, line-through se broker aplicou markup)
    - "Meu Preço Sugerido": input inline editável (currency) ou display
  - Button primary: "GERAR LINK"
  - Button ghost: "Ver Detalhes"

**Dados & Integração:**
- Query: `GET /api/broker/shared-inventory`
  - Retorna: `SharedInventoryBatch[]` com batch populado
- Mutation: `PATCH /api/broker/shared-inventory/[id]/price`
  - Atualiza preço sugerido do broker

---

### 4.7. Criação de Links de Venda

#### **`/links/new`**

**Acesso:** ADMIN_INDUSTRIA, VENDEDOR_INTERNO, BROKER

**Objetivo:** Criar link público personalizado para enviar ao cliente.

**Layout & UI:**
- **Wizard (3 Steps):**

**Step 1: Selecionar Conteúdo**
- Radio Group:
  - "Link de Lote Específico" → abre autocomplete de lotes disponíveis
  - "Link de Produto (Catálogo)" → abre autocomplete de produtos
  - "Link de Catálogo Completo" (apenas BROKER se tiver permissão)
- Preview do item selecionado (card compacto)

**Step 2: Definir Preço e Visibilidade**
- Apenas para BROKER:
  - Input "Preço Final para o Cliente" (currency, required)
  - Display calculado: "Minha Margem: R$ X (Y%)"
- Para VENDEDOR_INTERNO:
  - Display: "Preço Indústria: R$ X" (read-only)
  - Checkbox: "Exibir preço no link" (default: true)
  - Se false, mostra "Sob Consulta"
- Input "Título Personalizado" (opcional, placeholder: usa nome do produto/lote)
- Textarea "Mensagem Personalizada" (opcional, aparece no topo da landing page)

**Step 3: Configurações do Link**
- Input "Slug do Link" (auto-gerado, editável, valida unicidade)
  - Preview: `cava.app/[slug]`
- Date picker "Data de Expiração" (opcional)
- Toggle "Link Ativo" (default: true)
- Footer:
  - Button secondary: "Voltar"
  - Button primary: "GERAR LINK"
- Success: Modal com link gerado, botões "Copiar Link" e "Abrir Preview"

**Dados & Integração:**
- Mutation: `POST /api/sales-links`
  - Input: `{ linkType, batchId?, productId?, title?, displayPrice, showPrice, slugToken, expiresAt?, isActive }`
  - Output: `{ id, fullUrl }`
- Validation: verificar se lote está disponível (status check)

**Estados:**
- Loading step: skeleton
- Validation error: mensagem inline
- Success: confetti animation + modal

---

#### **`/links`**

**Acesso:** ADMIN_INDUSTRIA, VENDEDOR_INTERNO, BROKER

**Objetivo:** Gerenciar todos os links criados.

**Layout & UI:**
- **Header:**
  - Título font-serif: "Meus Links de Venda"
  - Button primary: "+ NOVO LINK"
- **Filtros:**
  - Dropdown "Tipo de Link"
  - Dropdown "Status" (Ativo/Expirado)
  - Search "Buscar por título ou slug"
- **Tabela:**
  - Colunas:
    - Preview (thumbnail se for lote único)
    - Título/Slug (link clicável que abre em nova aba)
    - Tipo (Badge: Lote/Produto/Catálogo)
    - Preço (se aplicável)
    - Visualizações (número + ícone `Eye`)
    - Interações (número de leads + ícone `Users`)
    - Status (Badge: Ativo/Expirado)
    - Criado em (date format)
    - Ações: Copy Link, Edit, Archive
- Paginação

**Dados & Integração:**
- Query: `GET /api/sales-links?type=&status=&search=&page=1`
- Mutation: `PATCH /api/sales-links/[id]` (update)
- Mutation: `DELETE /api/sales-links/[id]` (soft delete)

**Estados:**
- Empty: EmptyState "Nenhum link criado ainda"
- Click em visualizações: Modal com analytics (gráfico de views por dia)

---

### 4.8. Landing Page Pública (Cliente Final)

#### **`/[slug]`**

**Acesso:** Público (sem autenticação)

**Objetivo:** Apresentar produto/lote de forma premium e capturar interesse.

**Layout & UI (Tipo: LOTE_UNICO):**

**Hero Section (full-width, min-h-screen):**
- Background: imagem principal do lote (fixed attachment)
- Overlay: bg-black/40 backdrop-blur-sm
- Content centralizado:
  - Badge glass: tipo de material (bg-white/20 backdrop-blur-md border-white/40)
  - Título font-serif text-6xl text-porcelain: Nome do Produto
  - Subtítulo font-mono text-porcelain/80: Código do Lote
  - CTA Button (obsidian bg, porcelain text): "TENHO INTERESSE"
  - Scroll indicator (ícone `ChevronDown` animado)

**Seção Galeria:**
- Grid de fotos (2 colunas em desktop, 1 em mobile)
- Lightbox ao clicar (fullscreen com navegação)
- Thumbnails com border-white/20

**Seção Especificações (bg-mineral, py-20):**
- Container max-w-4xl, mx-auto
- Título font-serif text-4xl mb-12: "Especificações Técnicas"
- Grid 2 colunas (gap-12):
  - **Dimensões:**
    - Lista vertical de specs (font-mono):
      - Altura: X cm
      - Largura: X cm
      - Espessura: X cm
      - Área Total: X m²
      - Chapas: X
  - **Origem e Detalhes:**
    - Pedreira: [nome]
    - Acabamento: [tipo]
    - Data de Entrada: [date]

**Seção Preço (se aplicável):**
- Centralizado, bg-porcelain, py-16
- Título font-serif text-5xl: valor (ou "Preço Sob Consulta")
- Microcopy: "Valor já inclui margem do parceiro comercial"

**CTA Section (bg-obsidian, text-porcelain, py-20):**
- Título font-serif text-4xl: "Interessado nesta pedra?"
- Descrição: breve texto sobre próximos passos
- Form inline:
  - Input Nome
  - Input Email ou WhatsApp
  - Textarea "Mensagem" (opcional)
  - Button primary (porcelain bg, obsidian text): "ENVIAR INTERESSE"
- Helper: "Seu contato será enviado para o vendedor responsável"
- Checkbox: "Quero receber novidades sobre pedras similares"

**Footer minimalista:**
- Logo CAVA (pequeno)
- Text: "Powered by CAVA Stone Platform"
- Link: "Política de Privacidade"

**Layout para PRODUTO_GERAL ou CATALOGO_COMPLETO:**
- Similar mas troca galeria única por grid de lotes disponíveis
- Cada card de lote é clicável (modal ou nova página)

**Dados & Integração:**
- Query: `GET /api/public/links/[slug]`
  - Retorna: `SalesLink` populado com batch/product e medias
  - Incrementa `views_count` no backend
- Mutation: `POST /api/public/leads/interest`
  - Input: `{ salesLinkId, name, contact, message, marketingOptIn }`
  - Output: `{ success: true }`
- Tracking: Google Analytics event ao carregar e ao interagir

**Estados:**
- Loading: Skeleton hero + sections
- 404: tela customizada "Link não encontrado ou expirado"
- Form loading: button com spinner
- Form success: substituir form por mensagem de sucesso com ícone `CheckCircle`

---

### 4.9. Gestão de Leads

#### **`/leads`**

**Acesso:** ADMIN_INDUSTRIA, VENDEDOR_INTERNO, BROKER

**Objetivo:** Visualizar e gerenciar leads capturados via links.

**Layout & UI:**
- **Header:**
  - Título font-serif: "Meus Leads"
  - Button secondary: "Exportar CSV"
- **Filtros:**
  - Search "Nome ou Contato"
  - Dropdown "Link de Origem"
  - Date range "Período"
  - Toggle "Apenas Opt-in Marketing"
- **Tabela:**
  - Colunas:
    - Nome
    - Contato (email/phone com ícone clicável para copiar)
    - Origem (link title + badge tipo)
    - Produto Interessado
    - Mensagem (truncada, expandir com modal)
    - Opt-in (ícone `Check` ou `-`)
    - Data
    - Ações: Ver Detalhes, Marcar Resolvido
- Click na linha: abre sidebar com histórico completo do lead

**Dados & Integração:**
- Query: `GET /api/leads?search=&linkId=&startDate=&endDate=&optIn=`
- Query (detail): `GET /api/leads/[id]/interactions`
- Mutation: `PATCH /api/leads/[id]/status`

**Estados:**
- Empty: EmptyState "Nenhum lead capturado ainda"
- Sidebar loading: skeleton

---

### 4.10. Histórico de Vendas

#### **`/sales`**

**Acesso:** ADMIN_INDUSTRIA, VENDEDOR_INTERNO

**Objetivo:** Visualizar vendas concretizadas.

**Layout & UI:**
- **Header:**
  - Título font-serif: "Histórico de Vendas"
  - Filtros inline: Date range, Vendedor, Status
  - Button secondary: "Exportar Relatório"
- **Cards de Resumo (acima da tabela):**
  - Total Vendido (currency)
  - Comissões Pagas (currency)
  - Ticket Médio (currency)
- **Tabela:**
  - Colunas:
    - Nº Venda (ID)
    - Lote/Produto
    - Cliente
    - Vendedor
    - Valor Total
    - Comissão Broker (se aplicável)
    - Valor Líquido Indústria
    - Data Venda
    - Nota Fiscal (link se houver)
  - Row expandível: mostra mais detalhes (dimensões, fotos thumbnail)

**Dados & Integração:**
- Query: `GET /api/sales-history?startDate=&endDate=&sellerId=`
- Query (summary): `GET /api/sales-history/summary?period=month`

---

### 4.11. Reserva de Lotes

#### **Fluxo de Reserva (Modal)**

**Trigger:** Botão "Reservar" em card de lote (em `/inventory` ou `/shared-inventory`)

**Modal UI:**
- Título font-serif: "Reservar Lote"
- Preview do lote (foto + código + dimensões)
- Form:
  - Select "Cliente" (autocomplete de leads existentes ou "Novo Cliente")
  - Se novo: inputs Nome, Contato
  - Date picker "Validade da Reserva" (default: +7 dias)
  - Textarea "Observações"
- Footer:
  - Button secondary: "Cancelar"
  - Button primary: "CONFIRMAR RESERVA"

**Dados & Integração:**
- Mutation: `POST /api/reservations`
  - Input: `{ batchId, leadId?, expiresAt, notes }`
- Optimistic update: atualiza status do lote localmente para `RESERVADO` antes do response
- WebSocket (opcional): notifica outros usuários que lote foi reservado

**Estados:**
- Success: toast + atualiza lista
- Error (lote já reservado por outro): modal de erro explicativo

---

### 4.12. Gestão de Equipe

#### **`/team`**

**Acesso:** ADMIN_INDUSTRIA

**Objetivo:** Gerenciar Vendedores Internos.

**Layout & UI:**
- Título font-serif: "Equipe Interna"
- Button primary: "+ ADICIONAR VENDEDOR"
- Tabela:
  - Colunas: Nome, Email, Links Criados, Vendas, Status, Ações
- Modal "Adicionar Vendedor":
  - Inputs: Nome, Email, Telefone
  - Button: "CRIAR ACESSO" (gera senha temporária e envia email)

**Dados & Integração:**
- Query: `GET /api/users?role=VENDEDOR_INTERNO&industryId=[id]`
- Mutation: `POST /api/users`
  - Input: `{ name, email, phone, role: 'VENDEDOR_INTERNO', industryId }`

---

## 5. Fluxos Críticos (Frontend Logic)

### 5.1. Fluxo: Criação de Link de Venda (Broker)

**Passo a Passo:**

1. **Entrada:** Broker acessa `/links/new`
2. **Step 1 - Seleção:**
   - Frontend carrega: `GET /api/broker/shared-inventory` (lotes disponíveis)
   - Broker seleciona um lote
   - Estado: `selectedBatch` armazenado em state
3. **Step 2 - Precificação:**
   - Frontend calcula margem: `displayPrice - batch.negotiatedPrice`
   - Validação: `displayPrice >= batch.negotiatedPrice` (não pode vender abaixo)
   - Estado: `pricingData` armazenado
4. **Step 3 - Configuração:**
   - Frontend gera slug aleatório (client-side) com `nanoid` ou similar
   - Valida unicidade: debounced `GET /api/sales-links/validate-slug?slug=[x]`
   - Estado: `linkConfig` armazenado
5. **Submissão:**
   - Mutation: `POST /api/sales-links` com todos os dados
   - Response: `{ id, fullUrl }`
   - Frontend copia URL para clipboard automaticamente
   - Mostra modal de sucesso com QR Code do link (usar lib `qrcode.react`)
6. **Redirect:** Broker é levado para `/links` (listagem)

**Tratamento de Erros:**
- Se lote foi reservado/vendido entre steps: erro "Lote não está mais disponível"
- Se slug já existe: sugerir novo slug automaticamente
- Network error: retry automático (React Query)

---

### 5.2. Fluxo: Reserva de Lote

**Passo a Passo:**

1. **Entrada:** Vendedor/Broker vê lote com status `DISPONIVEL`
2. **Ação:** Click em "Reservar"
3. **Verificação (Frontend):**
   - Query: `GET /api/batches/[id]/status` (double-check disponibilidade)
   - Se não disponível: modal de erro "Lote foi reservado por outro usuário"
4. **Modal de Reserva:**
   - Form preenchido pelo vendedor
   - Validade: default calculado como `new Date(+7 days)`
5. **Submissão:**
   - Mutation: `POST /api/reservations`
   - Optimistic update: batch status vira `RESERVADO` localmente (na UI)
   - Se mutation falha: rollback do status
6. **Sincronização:**
   - React Query invalida cache: `queryClient.invalidateQueries(['batches'])`
   - Todos os componentes que listam lotes re-renderizam com novo status
7. **Notificação (opcional):**
   - Toast: "Lote reservado com sucesso até [data]"
   - Email/Push para admin (backend task)

**Edge Cases:**
- Reserva expira: Cron job backend muda status de volta para `DISPONIVEL`
- Frontend: exibir countdown nos lotes reservados pelo usuário atual

---

### 5.3. Fluxo: Upload de Fotos (Batch)

**Passo a Passo:**

1. **Entrada:** Admin em `/inventory/[id]` (edit mode)
2. **Upload Zone:** Drag & drop ou click to browse
3. **Preview Imediato:**
   - Frontend lê File com `FileReader.readAsDataURL()`
   - Mostra preview thumbnail com loading spinner sobreposto
4. **Upload Paralelo:**
   - Para cada File: `POST /api/upload/batch-medias` (FormData)
   - Backend retorna: `{ url: string }`
   - Frontend armazena URLs em array local
5. **Reordenação:**
   - Drag & drop nas thumbnails (usar `dnd-kit`)
   - Ordem é salva no array: `[{ url, displayOrder }]`
6. **Salvar:**
   - Mutation: `PUT /api/batches/[id]` com `medias: [{ url, displayOrder }]`
7. **Delete:**
   - Click em X sobre thumbnail: remove do array local
   - Mutation (opcional): `DELETE /api/batch-medias/[id]` para liberar storage

**Tratamento:**
- Limite: máximo 10 fotos por lote (validação frontend)
- Formato: apenas jpg, png, webp (validação no input)
- Size: máximo 5MB por foto (validação e resize no backend)
- Loading state: skeleton nas thumbnails durante upload

---

## 6. Patterns e Convenções

### 6.1. Naming Conventions

**Arquivos:**
- Componentes: PascalCase (`BatchCard.tsx`)
- Hooks: camelCase com prefixo `use` (`useBatchFilters.ts`)
- Utils: camelCase (`formatCurrency.ts`)
- Types: PascalCase com sufixo `Type` (`BatchStatusType`)

**Variáveis:**
- Booleanos: prefixo `is`, `has`, `can` (`isLoading`, `hasPermission`)
- Handlers: prefixo `handle` (`handleSubmit`)
- Queries: prefixo `use` + entidade (`useBatches`, `useBatchById`)

### 6.2. Error Handling

**Pattern Global:**
- React Query: configurar `onError` global no `QueryClient`
- Exibir toast com mensagem user-friendly
- Log completo no console (dev mode)

**Mensagens de Erro:**
- Backend retorna: `{ error: { code: string, message: string } }`
- Frontend mapeia códigos para mensagens em português:
  - `BATCH_NOT_AVAILABLE` → "Este lote não está mais disponível"
  - `UNAUTHORIZED` → "Você não tem permissão para esta ação"
  - `VALIDATION_ERROR` → usar `message` do backend

### 6.3. Loading States

**Skeleton Pattern:**
- Manter estrutura visual idêntica ao conteúdo real
- Usar `animate-pulse` do Tailwind
- Altura fixa nos skeletons para evitar layout shift

**Loading Buttons:**
- Substituir texto por spinner (Lucide `Loader2` com `animate-spin`)
- Manter largura do botão (evitar resize)
- Desabilitar durante loading

### 6.4. Form Validation

**Strategy:**
- Validação client-side: usar `react-hook-form` + `zod`
- Validação on blur para feedback rápido
- Validação on submit para garantir integridade
- Mostrar erros abaixo dos inputs (text-rose-600 text-xs)

**Mensagens Padrão:**
- Required: "Este campo é obrigatório"
- Email: "Email inválido"
- Min/Max: "Valor deve ser entre X e Y"
- Phone: "Telefone inválido"
- CPF/CNPJ: "Documento inválido"
- URL: "URL inválida"
- Password min: "Senha deve ter no mínimo 8 caracteres"
- Password match: "As senhas não coincidem"
- Unique slug: "Este slug já está em uso"
- Price min: "Preço deve ser maior que zero"
- Dimension: "Dimensão deve ser um número positivo"

---

### 6.5. Input Masks (Máscaras de Campos)

**Biblioteca Recomendada:** `react-input-mask` ou `@react-input/mask`

**Máscaras Definidas:**

| Campo | Máscara | Exemplo | Validação |
|-------|---------|---------|-----------|
| Telefone | `(99) 99999-9999` | (11) 98765-4321 | 10-11 dígitos |
| CPF | `999.999.999-99` | 123.456.789-00 | Validar dígitos verificadores |
| CNPJ | `99.999.999/9999-99` | 12.345.678/0001-90 | Validar dígitos verificadores |
| CEP | `99999-999` | 01310-100 | 8 dígitos |
| Data | `99/99/9999` | 25/12/2025 | Date válido |
| Moeda (BRL) | `R$ #.##0,00` | R$ 1.234,56 | Usar `Intl.NumberFormat` |
| Dimensões (cm) | `#.##0,0 cm` | 180,5 cm | Número positivo |
| Área (m²) | `#.##0,00 m²` | 12,50 m² | Calculado automaticamente |
| Código do Lote | `AAA-999999` | GRN-000123 | Uppercase auto |

**Comportamento:**
- Aplicar máscara em tempo real durante digitação
- Remover máscara antes de enviar ao backend (apenas números/dados limpos)
- Exibir placeholder com formato esperado (ex: `(00) 00000-0000`)
- Cursor deve pular automaticamente para próximo grupo

**Formatação de Exibição (Display Only):**
- Valores monetários: `R$ 1.234,56` (usar `toLocaleString('pt-BR')`)
- Datas: `25 de dezembro de 2025` ou `25/12/2025` (formato curto em tabelas)
- Dimensões em tabelas: `180 × 120 × 3 cm` (usar símbolo ×, não x)
- Área: `2,16 m²` (duas casas decimais)

---

### 6.6. Toast Messages (Notificações)

**Biblioteca Recomendada:** `sonner` ou `react-hot-toast`

**Posicionamento:** Top-right, stack de até 3 toasts visíveis

**Duração:**
- Success: 3 segundos (auto-dismiss)
- Error: 5 segundos (auto-dismiss) ou persistent se crítico
- Warning: 4 segundos
- Info: 3 segundos

**Estilos:**
- Success: bg-emerald-50 border-emerald-200 text-emerald-800, ícone `CheckCircle`
- Error: bg-rose-50 border-rose-200 text-rose-800, ícone `XCircle`
- Warning: bg-amber-50 border-amber-200 text-amber-800, ícone `AlertTriangle`
- Info: bg-blue-50 border-blue-200 text-blue-800, ícone `Info`

**Catálogo de Mensagens:**

| Ação | Tipo | Mensagem |
|------|------|----------|
| Login sucesso | Success | "Bem-vindo de volta, [Nome]!" |
| Login erro | Error | "Email ou senha incorretos" |
| Sessão expirada | Warning | "Sua sessão expirou. Faça login novamente." |
| Produto criado | Success | "Produto cadastrado com sucesso" |
| Produto atualizado | Success | "Produto atualizado com sucesso" |
| Produto excluído | Success | "Produto removido do catálogo" |
| Lote criado | Success | "Lote cadastrado com sucesso" |
| Lote atualizado | Success | "Lote atualizado com sucesso" |
| Lote reservado | Success | "Lote reservado até [data]" |
| Lote indisponível | Error | "Este lote não está mais disponível" |
| Reserva cancelada | Info | "Reserva cancelada" |
| Link criado | Success | "Link criado! Copiado para área de transferência" |
| Link copiado | Info | "Link copiado!" |
| Link expirado | Warning | "Este link expirou" |
| Broker convidado | Success | "Convite enviado para [email]" |
| Vendedor criado | Success | "Vendedor cadastrado. Email de acesso enviado." |
| Estoque compartilhado | Success | "Lote compartilhado com [Broker]" |
| Compartilhamento removido | Info | "Compartilhamento removido" |
| Lead capturado | Success | "Novo lead recebido!" |
| Foto enviada | Success | "Foto enviada com sucesso" |
| Foto removida | Info | "Foto removida" |
| Upload erro | Error | "Erro ao enviar arquivo. Tente novamente." |
| Arquivo muito grande | Error | "Arquivo excede o limite de 5MB" |
| Formato inválido | Error | "Formato não suportado. Use JPG, PNG ou WebP" |
| Erro de rede | Error | "Erro de conexão. Verifique sua internet." |
| Erro genérico | Error | "Algo deu errado. Tente novamente." |
| Dados salvos | Success | "Alterações salvas" |
| Exportação iniciada | Info | "Exportação iniciada. O download começará em breve." |
| Permissão negada | Error | "Você não tem permissão para esta ação" |

**Toast com Ação:**
- Para ações reversíveis, incluir botão "Desfazer" no toast
- Exemplo: "Lote arquivado" + [Desfazer]

---

### 6.7. Empty States (Estados Vazios)

**Estrutura Padrão:**
```
┌─────────────────────────────────────┐
│                                     │
│            [Ícone 48px]             │
│                                     │
│     Título em font-serif 2xl        │
│                                     │
│   Descrição explicativa em          │
│   text-slate-400 text-sm            │
│   max-w-md text-center              │
│                                     │
│        [Button CTA] (opcional)      │
│                                     │
└─────────────────────────────────────┘
```

**Catálogo de Empty States por Tela:**

| Tela | Ícone | Título | Descrição | CTA |
|------|-------|--------|-----------|-----|
| `/catalog` | `Package` | "Nenhum produto cadastrado" | "Comece adicionando seu primeiro produto ao catálogo" | "+ Novo Produto" |
| `/catalog` (busca) | `Search` | "Nenhum resultado" | "Não encontramos produtos para '[termo]'" | "Limpar busca" |
| `/inventory` | `Layers` | "Estoque vazio" | "Cadastre seu primeiro lote para começar a vender" | "+ Novo Lote" |
| `/inventory` (filtro) | `Filter` | "Nenhum lote encontrado" | "Tente ajustar os filtros de busca" | "Limpar filtros" |
| `/brokers` | `Users` | "Nenhum parceiro cadastrado" | "Convide brokers para expandir sua rede de vendas" | "+ Convidar Broker" |
| `/brokers/[id]/shared` | `Share2` | "Nenhum lote compartilhado" | "Compartilhe lotes do seu estoque com este broker" | "+ Compartilhar Lote" |
| `/team` | `UserPlus` | "Nenhum vendedor cadastrado" | "Adicione vendedores internos para ajudar nas vendas" | "+ Adicionar Vendedor" |
| `/links` | `Link` | "Nenhum link criado" | "Crie links personalizados para compartilhar com seus clientes" | "+ Novo Link" |
| `/leads` | `Inbox` | "Nenhum lead ainda" | "Quando clientes demonstrarem interesse, eles aparecerão aqui" | — |
| `/sales` | `Receipt` | "Nenhuma venda registrada" | "O histórico de vendas aparecerá aqui" | — |
| `/shared-inventory` (Broker) | `PackageOpen` | "Nenhum lote disponível" | "Aguarde a indústria compartilhar lotes com você" | — |
| Dashboard (atividades) | `Activity` | "Nenhuma movimentação recente" | "As últimas atividades do sistema aparecerão aqui" | — |

**Empty State para Erros:**
- Ícone: `AlertCircle` em rose-300
- Título: "Erro ao carregar dados"
- Descrição: "Não foi possível carregar as informações"
- CTA: "Tentar novamente" (button secondary)

---

### 6.8. Hover States (Estados de Hover)

**Padrão de Transição:** `transition-all duration-200 ease-in-out`

**Componentes e seus Hover States:**

| Componente | Estado Normal | Estado Hover |
|------------|---------------|--------------|
| Button primary | bg-obsidian | shadow-premium, scale-[1.02] |
| Button secondary | border-slate-200 | border-obsidian, text-obsidian |
| Button ghost | transparent | bg-slate-50 |
| Button destructive | bg-rose-50 | bg-rose-100 |
| Card elevated | shadow-premium | shadow-premium-lg, translate-y-[-2px] |
| Card flat | bg-mineral | bg-slate-100 |
| Table row | bg-transparent | bg-slate-50/50 |
| Link/Anchor | text-current | text-obsidian, underline |
| Sidebar item | bg-transparent | bg-slate-100 |
| Sidebar item (ativo) | bg-obsidian text-porcelain | — (sem mudança) |
| Icon button | text-slate-400 | text-slate-600 |
| Image thumbnail | — | scale-105, shadow-lg |
| Badge | — | cursor-default (sem hover) |
| Toggle | bg-slate-200 | bg-slate-300 |
| Dropdown option | bg-transparent | bg-slate-50 |
| Card de produto (catálogo) | — | overlay glass aparece com fade-in |
| Copy button | text-slate-400 | text-obsidian + tooltip "Copiar" |

**Focus States (Acessibilidade):**
- Todos elementos interativos: `focus:outline-none focus:ring-2 focus:ring-obsidian/20`
- Não remover outline sem substituir por ring visível
- Tab navigation deve ser visualmente clara

**Active/Pressed States:**
- Buttons: `active:scale-[0.98]`
- Cards clicáveis: `active:shadow-none`

---

### 6.9. Paginação

**Componente de Paginação:**

**Estrutura Visual:**
```
┌─────────────────────────────────────────────────────────────┐
│  Mostrando 1-50 de 247 itens    │  ◀  1  2  3  ...  5  ▶   │
└─────────────────────────────────────────────────────────────┘
```

**Estilos:**
- Container: `flex items-center justify-between py-4 border-t border-slate-100`
- Info text: `text-sm text-slate-500`
- Botões de página: `w-10 h-10 rounded-sm flex items-center justify-center`
  - Normal: `bg-transparent text-slate-600 hover:bg-slate-50`
  - Ativo: `bg-obsidian text-porcelain`
  - Disabled: `opacity-50 cursor-not-allowed`
- Setas: ícones Lucide `ChevronLeft` / `ChevronRight`
- Ellipsis: `text-slate-400`

**Configurações por Tela:**

| Tela | Itens por Página | Variante |
|------|------------------|----------|
| `/inventory` | 50 | Completa (com info + números) |
| `/catalog` | 24 (grid 3x8) | Simplificada (apenas setas) |
| `/links` | 25 | Completa |
| `/leads` | 50 | Completa |
| `/sales` | 50 | Completa |
| `/brokers` | 25 | Simplificada |
| `/team` | 25 | Simplificada |
| Dashboard tables | 10 | Apenas "Ver mais" link |

**Comportamento:**
- Scroll to top ao mudar de página
- Preservar filtros na URL: `/inventory?status=DISPONIVEL&page=2`
- Loading: skeleton apenas nas rows, manter paginação visível
- Keyboard: suportar ← e → para navegar (quando foco na paginação)

**Variante "Load More" (para grids de cards):**
- Botão centralizado: "Carregar mais"
- Mostra contagem: "Exibindo 24 de 72 produtos"
- Infinite scroll opcional em mobile

---

### 6.10. Loading States Detalhados por Tela

**Princípios:**
- Skeleton deve ter mesma estrutura do conteúdo final
- Usar `animate-pulse` com `bg-slate-200/50`
- Altura fixa para evitar layout shift
- Mínimo 300ms de loading (evitar flash)

**Catálogo de Skeletons:**

**Dashboard:**
```
┌─────────────────────────────────────────────────────────────┐
│  ████████████████  (header)                                 │
├───────────────────┬───────────────────┬─────────────────────┤
│  ┌─────────────┐  │  ┌─────────────┐  │  ┌─────────────┐    │
│  │ ████████    │  │  │ ████████    │  │  │ ████████    │    │
│  │ ██          │  │  │ ██          │  │  │ ██          │    │
│  └─────────────┘  │  └─────────────┘  │  └─────────────┘    │
├───────────────────┴───────────────────┴─────────────────────┤
│  ████  ████  ████  (quick actions)                          │
├─────────────────────────────────────────────────────────────┤
│  ████████████████████████████████████ (table header)        │
│  ██████████████████████████████████                         │
│  ██████████████████████████████████                         │
│  ██████████████████████████████████                         │
└─────────────────────────────────────────────────────────────┘
```

**Grid de Cards (Catálogo/Inventário):**
- 3 colunas de cards skeleton
- Cada card: retângulo 4:3 (imagem) + 3 linhas de texto

**Tabela:**
- Header real (não skeleton)
- 10 rows skeleton com altura fixa
- Colunas respeitam proporção real

**Form (Edit):**
- Labels reais
- Inputs como retângulos skeleton
- Botões reais (disabled)

**Sidebar de Detalhes:**
- Foto skeleton (quadrado)
- 5-6 linhas de texto skeleton

**Estados de Loading em Botões:**
- Spinner centralizado (Lucide `Loader2` com `animate-spin`)
- Texto oculto mas presente (mantém largura)
- Botão desabilitado durante loading

**Overlay Loading (Ações Destrutivas):**
- Para delete/archive: overlay semi-transparente sobre item
- Spinner centralizado
- Impede interação até conclusão

---

### 6.11. Estados de Formulário

**Estrutura de Campo:**
```
┌─────────────────────────────────────┐
│  LABEL EM UPPERCASE                 │  ← text-[10px] tracking-widest text-slate-500
├─────────────────────────────────────┤
│  ┌─────────────────────────────────┐│
│  │ Input value                     ││  ← border-slate-200, focus:border-obsidian
│  └─────────────────────────────────┘│
│  Helper text opcional               │  ← text-xs text-slate-400
│  Mensagem de erro                   │  ← text-xs text-rose-600
└─────────────────────────────────────┘
```

**Estados Visuais:**

| Estado | Border | Background | Label | Helper |
|--------|--------|------------|-------|--------|
| Default | slate-200 | white | slate-500 | slate-400 |
| Focus | obsidian | white | obsidian | slate-400 |
| Filled | slate-200 | white | slate-500 | slate-400 |
| Error | rose-300 | rose-50/30 | rose-600 | rose-600 |
| Disabled | slate-100 | slate-50 | slate-300 | — |
| Success | emerald-300 | emerald-50/30 | emerald-600 | emerald-600 |

**Validações por Campo:**

| Campo | Regras | Quando Valida |
|-------|--------|---------------|
| Email | formato email, required | blur + submit |
| Senha | min 8 chars, 1 número, 1 maiúscula | blur + submit |
| Nome | required, min 2 chars | blur + submit |
| Telefone | 10-11 dígitos | blur |
| CPF/CNPJ | dígitos verificadores | blur |
| Preço | > 0, number | change (real-time) |
| Dimensões | > 0, number | change (real-time) |
| Slug | alphanumeric + hífens, único | debounced change (500ms) |
| Data | data válida, >= hoje (para expiração) | blur |
| Quantidade | integer > 0 | change |
| URL | formato URL válido | blur |
| Upload | formato (jpg/png/webp), size (< 5MB) | change |

**Feedback Visual de Validação:**
- ✅ Campo válido: borda verde sutil + ícone `Check` (16px) à direita
- ❌ Campo inválido: borda rose + ícone `AlertCircle` + mensagem abaixo
- ⏳ Validando (async): spinner pequeno à direita do input

**Comportamento de Submit:**
1. Desabilitar botão de submit
2. Validar todos os campos
3. Se erro: scroll até primeiro campo com erro, focus nele
4. Mostrar toast de erro genérico se múltiplos erros
5. Se sucesso: toast + redirect

---

### 6.12. Confirmações e Modais de Ação

**Modal de Confirmação (Ações Destrutivas):**

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│     ⚠️  (ícone AlertTriangle em amber)              │
│                                                     │
│     Confirmar exclusão                              │  ← font-serif text-2xl
│                                                     │
│     Tem certeza que deseja excluir o produto        │
│     "Granito Preto São Gabriel"?                    │  ← text-slate-600
│                                                     │
│     Esta ação não pode ser desfeita.                │  ← text-rose-600 text-sm
│                                                     │
│  ┌───────────────┐  ┌───────────────────────────┐   │
│  │   Cancelar    │  │   SIM, EXCLUIR            │   │
│  └───────────────┘  └───────────────────────────┘   │
│   (secondary)           (destructive)               │
└─────────────────────────────────────────────────────┘
```

**Tipos de Confirmação:**

| Ação | Título | Botão Confirma | Cor |
|------|--------|----------------|-----|
| Excluir produto | "Excluir produto?" | "SIM, EXCLUIR" | destructive |
| Arquivar lote | "Arquivar lote?" | "ARQUIVAR" | secondary |
| Remover broker | "Remover parceiro?" | "SIM, REMOVER" | destructive |
| Cancelar reserva | "Cancelar reserva?" | "CANCELAR RESERVA" | destructive |
| Desativar link | "Desativar link?" | "DESATIVAR" | secondary |
| Sair sem salvar | "Descartar alterações?" | "DESCARTAR" | secondary |

**Ações que NÃO precisam confirmação:**
- Salvar/Atualizar (feedback via toast)
- Copiar link
- Filtrar/Buscar
- Navegar entre páginas
- Toggle de visibilidade
