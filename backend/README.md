# Especificação Técnica: Backend Go - CAVA

## 1. Visão Geral

CAVA é um sistema B2B de gestão de estoque de rochas ornamentais que conecta indústrias a vendedores internos e brokers externos. O backend Go fornece uma API REST para gerenciar catálogo de produtos, lotes físicos de estoque, compartilhamento B2B de inventário, criação de links de venda públicos, captura de leads e histórico de vendas. O sistema implementa autenticação baseada em JWT com refresh tokens, controle de acesso por roles (ADMIN_INDUSTRIA, VENDEDOR_INTERNO, BROKER), proteção CSRF, rate limiting e integração com storage S3-compatible para upload de mídias.

---

## 2. API Endpoints

# CAVA Backend API Documentation

## Authentication & Authorization

All endpoints except those in `/public/*` require authentication via HTTP-only cookies:
- `access_token`: 15min duration
- `refresh_token`: 7 days duration
- CSRF protection via `X-CSRF-Token` header for state-changing requests

---

## Authentication

### `POST /api/auth/login`
**Auth**: Public  
**Body**:
```typescript
{
  email: string // email format
  password: string // min 8 characters
}
```
**Response**:
```typescript
{
  user: User
  role: UserRole
}
```
**Status**: 200 (success), 401 (invalid credentials)

Sets `access_token` and `refresh_token` cookies.

---

### `POST /api/auth/refresh`
**Auth**: Public (requires refresh_token cookie)  
**Body**: None  
**Response**:
```typescript
{
  user: User
}
```
**Status**: 200 (success), 401 (invalid/expired token)

Refreshes access_token if refresh_token is valid.

---

### `POST /api/auth/logout`
**Auth**: Required  
**Body**: None  
**Response**:
```typescript
{
  success: true
}
```
**Status**: 200

Clears authentication cookies.

---

## Dashboard

### `GET /api/dashboard/metrics`
**Auth**: Required (ADMIN_INDUSTRIA, VENDEDOR_INTERNO)  
**Response**:
```typescript
{
  availableBatches: number
  monthlySales: number
  reservedBatches: number
  activeLinks?: number
  leadsCount?: number
}
```
**Status**: 200

---

### `GET /api/dashboard/recent-activities`
**Auth**: Required (ADMIN_INDUSTRIA, VENDEDOR_INTERNO)  
**Response**:
```typescript
Activity[] // Array of last 10 activities
```
```typescript
interface Activity {
  id: string
  batchCode: string
  productName: string
  sellerName: string
  action: 'RESERVADO' | 'VENDIDO' | 'COMPARTILHADO' | 'CRIADO'
  date: string
}
```
**Status**: 200

---

### `GET /api/broker/dashboard/metrics`
**Auth**: Required (BROKER)  
**Response**:
```typescript
{
  availableBatches: number
  monthlySales: number
  activeLinks: number
  monthlyCommission: number
}
```
**Status**: 200

---

## Products (Catalog)

### `GET /api/products`
**Auth**: Required (ADMIN_INDUSTRIA, VENDEDOR_INTERNO)  
**Query Params**:
```typescript
{
  search?: string
  material?: 'GRANITO' | 'MARMORE' | 'QUARTZITO' | 'LIMESTONE' | 'TRAVERTINO' | 'OUTROS' | ''
  includeInactive?: boolean // default: false
  page?: number // default: 1, min: 1
  limit?: number // default: 24, min: 1, max: 100
}
```
**Response**:
```typescript
{
  products: Product[]
  total: number
  page: number
}
```
```typescript
interface Product {
  id: string
  industryId: string
  name: string
  sku?: string
  material: MaterialType
  finish: FinishType
  description?: string
  isPublic: boolean
  isActive: boolean
  medias: Media[]
  batchCount?: number
  createdAt: string
  updatedAt: string
}
```
**Status**: 200

---

### `GET /api/products/:id`
**Auth**: Required (ADMIN_INDUSTRIA, VENDEDOR_INTERNO)  
**Response**:
```typescript
Product
```
**Status**: 200, 404 (not found)

---

### `POST /api/products`
**Auth**: Required (ADMIN_INDUSTRIA)  
**Body**:
```typescript
{
  name: string // min: 2, max: 100
  sku?: string // max: 50
  material: 'GRANITO' | 'MARMORE' | 'QUARTZITO' | 'LIMESTONE' | 'TRAVERTINO' | 'OUTROS'
  finish: 'POLIDO' | 'LEVIGADO' | 'BRUTO' | 'APICOADO' | 'FLAMEADO'
  description?: string // max: 1000
  isPublic: boolean
  medias?: File[] // handled via separate upload endpoint
}
```
**Response**:
```typescript
Product
```
**Status**: 201, 400 (validation error)

---

### `PUT /api/products/:id`
**Auth**: Required (ADMIN_INDUSTRIA)  
**Body**: Same as POST (all fields optional)  
**Response**:
```typescript
Product
```
**Status**: 200, 404, 400

---

### `DELETE /api/products/:id`
**Auth**: Required (ADMIN_INDUSTRIA)  
**Response**:
```typescript
{ success: true }
```
**Status**: 200, 404

Soft delete (sets isActive to false).

---

## Batches (Inventory)

### `GET /api/batches`
**Auth**: Required (ADMIN_INDUSTRIA, VENDEDOR_INTERNO)  
**Query Params**:
```typescript
{
  productId?: string
  status?: 'DISPONIVEL' | 'RESERVADO' | 'VENDIDO' | 'INATIVO' | ''
  code?: string // search by batch code
  page?: number // default: 1
  limit?: number // default: 50, max: 100
}
```
**Response**:
```typescript
{
  batches: Batch[]
  total: number
  page: number
}
```
```typescript
interface Batch {
  id: string
  productId: string
  industryId: string
  batchCode: string // format: AAA-999999
  height: number // cm, positive, max: 1000
  width: number // cm, positive, max: 1000
  thickness: number // cm, positive, max: 100
  quantitySlabs: number // integer, positive
  totalArea: number // calculated: m²
  industryPrice: number // positive
  originQuarry?: string // max: 100
  entryDate: string // ISO date, cannot be future
  status: BatchStatus
  isActive: boolean
  medias: Media[]
  product?: Product
  createdAt: string
  updatedAt: string
}
```
**Status**: 200

---

### `GET /api/batches/:id`
**Auth**: Required (ADMIN_INDUSTRIA, VENDEDOR_INTERNO)  
**Response**:
```typescript
Batch
```
**Status**: 200, 404

---

### `GET /api/batches/:id/status`
**Auth**: Required  
**Response**:
```typescript
Batch // for status check
```
**Status**: 200, 404

Used to verify availability before reservation.

---

### `POST /api/batches`
**Auth**: Required (ADMIN_INDUSTRIA)  
**Body**:
```typescript
{
  productId: string
  batchCode: string // format: AAA-999999, auto-uppercase
  height: number // positive, max: 1000
  width: number // positive, max: 1000
  thickness: number // positive, max: 100
  quantitySlabs: number // integer, positive
  industryPrice: number // positive
  originQuarry?: string // max: 100
  entryDate: string // ISO date, not future
  medias?: File[] // handled via separate upload
}
```
**Response**:
```typescript
Batch
```
**Status**: 201, 400

---

### `PUT /api/batches/:id`
**Auth**: Required (ADMIN_INDUSTRIA)  
**Body**: Same as POST (all fields optional)  
**Response**:
```typescript
Batch
```
**Status**: 200, 404, 400

---

### `PATCH /api/batches/:id/status`
**Auth**: Required (ADMIN_INDUSTRIA)  
**Body**:
```typescript
{
  status: 'DISPONIVEL' | 'RESERVADO' | 'VENDIDO' | 'INATIVO'
}
```
**Response**:
```typescript
Batch
```
**Status**: 200, 404, 400

---

## Reservations

### `POST /api/reservations`
**Auth**: Required (ADMIN_INDUSTRIA, VENDEDOR_INTERNO, BROKER)  
**Body**:
```typescript
{
  batchId: string
  leadId?: string
  customerName?: string // min: 2, optional if leadId provided
  customerContact?: string // optional if leadId provided
  expiresAt: string // ISO date, must be future, default: +7 days
  notes?: string // max: 500
}
```
**Response**:
```typescript
Reservation
```
```typescript
interface Reservation {
  id: string
  batchId: string
  leadId?: string
  reservedByUserId: string
  expiresAt: string
  notes?: string
  isActive: boolean
  createdAt: string
  batch?: Batch
  lead?: Lead
  reservedBy?: User
}
```
**Status**: 201, 400 (batch not available), 404

Updates batch status to RESERVADO.

---

## Users & Brokers

### `GET /api/users`
**Auth**: Required (ADMIN_INDUSTRIA, VENDEDOR_INTERNO)  
**Query Params**:
```typescript
{
  role?: 'ADMIN_INDUSTRIA' | 'BROKER' | 'VENDEDOR_INTERNO'
}
```
**Response**:
```typescript
User[]
```
**Status**: 200

---

### `GET /api/users/:id`
**Auth**: Required  
**Response**:
```typescript
User
```
**Status**: 200, 404

---

### `POST /api/users`
**Auth**: Required (ADMIN_INDUSTRIA)  
**Body**:
```typescript
{
  name: string // min: 2
  email: string // email format
  phone?: string // 10-11 digits
  role: 'VENDEDOR_INTERNO'
}
```
**Response**:
```typescript
User
```
**Status**: 201, 400

Generates temporary password and sends email.

---

### `PATCH /api/users/:id/status`
**Auth**: Required (ADMIN_INDUSTRIA)  
**Body**:
```typescript
{
  isActive: boolean
}
```
**Response**:
```typescript
User
```
**Status**: 200, 404

---

### `GET /api/brokers`
**Auth**: Required (ADMIN_INDUSTRIA)  
**Response**:
```typescript
BrokerWithStats[]
```
```typescript
interface BrokerWithStats extends User {
  sharedBatchesCount: number
}
```
**Status**: 200

---

### `POST /api/brokers/invite`
**Auth**: Required (ADMIN_INDUSTRIA)  
**Body**:
```typescript
{
  name: string // min: 2
  email: string // email format
  phone?: string // 10-11 digits
  whatsapp?: string // 10-11 digits
}
```
**Response**:
```typescript
User
```
**Status**: 201, 400

Creates broker user with temporary password and sends invitation email.

---

## Shared Inventory

### `GET /api/brokers/:brokerId/shared-inventory`
**Auth**: Required (ADMIN_INDUSTRIA)  
**Response**:
```typescript
SharedInventoryBatch[]
```
```typescript
interface SharedInventoryBatch {
  id: string
  batchId: string
  brokerUserId: string
  negotiatedPrice?: number
  sharedAt: string
  batch: Batch
  broker: User
}
```
**Status**: 200, 404

---

### `POST /api/shared-inventory-batches`
**Auth**: Required (ADMIN_INDUSTRIA)  
**Body**:
```typescript
{
  batchId: string
  brokerUserId: string
  negotiatedPrice?: number // positive
}
```
**Response**:
```typescript
SharedInventoryBatch
```
**Status**: 201, 400, 404

---

### `DELETE /api/shared-inventory-batches/:id`
**Auth**: Required (ADMIN_INDUSTRIA)  
**Response**:
```typescript
{ success: true }
```
**Status**: 200, 404

Removes batch from broker's shared inventory.

---

### `GET /api/broker/shared-inventory`
**Auth**: Required (BROKER)  
**Query Params**:
```typescript
{
  recent?: boolean // if true, return recently shared items
  limit?: number
  status?: string
}
```
**Response**:
```typescript
SharedInventoryBatch[]
```
**Status**: 200

Returns batches shared with authenticated broker.

---

### `PATCH /api/broker/shared-inventory/:id/price`
**Auth**: Required (BROKER)  
**Body**:
```typescript
{
  negotiatedPrice?: number // positive
}
```
**Response**:
```typescript
SharedInventoryBatch
```
**Status**: 200, 404, 400

Broker updates their negotiated price for shared batch.

---

## Sales Links

### `GET /api/sales-links`
**Auth**: Required  
**Query Params**:
```typescript
{
  type?: 'LOTE_UNICO' | 'PRODUTO_GERAL' | 'CATALOGO_COMPLETO' | ''
  status?: 'ATIVO' | 'EXPIRADO' | ''
  search?: string // title or slug
  page?: number // default: 1
  limit?: number // default: 25, max: 100
}
```
**Response**:
```typescript
{
  links: SalesLink[]
  total: number
  page: number
}
```
```typescript
interface SalesLink {
  id: string
  createdByUserId: string
  linkType: LinkType
  batchId?: string
  productId?: string
  title?: string // max: 100
  customMessage?: string // max: 500
  slugToken: string // min: 3, max: 50, lowercase, no leading/trailing hyphens
  displayPrice?: number // positive
  showPrice: boolean
  viewsCount: number
  expiresAt?: string // ISO date, must be future
  isActive: boolean
  createdAt: string
  updatedAt: string
  fullUrl?: string
  batch?: Batch
  product?: Product
  createdBy?: User
}
```
**Status**: 200

---

### `GET /api/sales-links/:id`
**Auth**: Required  
**Response**:
```typescript
SalesLink
```
**Status**: 200, 404

---

### `GET /api/sales-links/validate-slug`
**Auth**: Required  
**Query Params**:
```typescript
{
  slug: string // min: 3, lowercase, numbers, hyphens only
}
```
**Response**:
```typescript
{
  valid: boolean
}
```
**Status**: 200

---

### `POST /api/sales-links`
**Auth**: Required  
**Body**:
```typescript
{
  linkType: 'LOTE_UNICO' | 'PRODUTO_GERAL' | 'CATALOGO_COMPLETO'
  batchId?: string // required if linkType = LOTE_UNICO
  productId?: string // required if linkType = PRODUTO_GERAL
  title?: string // max: 100
  customMessage?: string // max: 500
  slugToken: string // min: 3, max: 50, format: lowercase-with-hyphens
  displayPrice?: number // positive
  showPrice: boolean
  expiresAt?: string // ISO date, must be future
  isActive: boolean
}
```
**Response**:
```typescript
{
  id: string
  fullUrl: string
}
```
**Status**: 201, 400 (validation or slug exists), 404

---

### `PATCH /api/sales-links/:id`
**Auth**: Required  
**Body**: Same as POST (all fields optional)  
**Response**:
```typescript
SalesLink
```
**Status**: 200, 404, 400

---

### `DELETE /api/sales-links/:id`
**Auth**: Required  
**Response**:
```typescript
{ success: true }
```
**Status**: 200, 404

Soft delete (sets isActive to false).

---

## Public (Landing Pages)

### `GET /api/public/links/:slug`
**Auth**: Public  
**Response**:
```typescript
SalesLink // with batch/product populated, medias included
```
**Status**: 200, 404 (not found or expired)

Increments viewsCount on each request.

---

### `POST /api/public/leads/interest`
**Auth**: Public  
**Body**:
```typescript
{
  salesLinkId: string
  name: string // min: 2, max: 100
  contact: string // email or phone (10-11 digits)
  message?: string // max: 500
  marketingOptIn: boolean
}
```
**Response**:
```typescript
{
  success: true
}
```
**Status**: 201, 400, 404

---

## Leads

### `GET /api/leads`
**Auth**: Required  
**Query Params**:
```typescript
{
  search?: string // name or contact
  linkId?: string
  startDate?: string // ISO date
  endDate?: string // ISO date
  optIn?: boolean
  status?: 'NOVO' | 'CONTATADO' | 'RESOLVIDO' | ''
  page?: number // default: 1
  limit?: number // default: 50, max: 100
}
```
**Response**:
```typescript
{
  leads: Lead[]
  total: number
  page: number
}
```
```typescript
interface Lead {
  id: string
  salesLinkId: string
  name: string
  contact: string
  message?: string
  marketingOptIn: boolean
  status: 'NOVO' | 'CONTATADO' | 'RESOLVIDO'
  createdAt: string
  updatedAt: string
  salesLink?: SalesLink
}
```
**Status**: 200

---

### `GET /api/leads/:id`
**Auth**: Required  
**Response**:
```typescript
Lead
```
**Status**: 200, 404

---

### `GET /api/leads/:id/interactions`
**Auth**: Required  
**Response**:
```typescript
unknown[] // interaction history
```
**Status**: 200, 404

---

### `PATCH /api/leads/:id/status`
**Auth**: Required  
**Body**:
```typescript
{
  status: 'NOVO' | 'CONTATADO' | 'RESOLVIDO'
}
```
**Response**:
```typescript
Lead
```
**Status**: 200, 404, 400

---

## Sales History

### `GET /api/sales-history`
**Auth**: Required (ADMIN_INDUSTRIA, VENDEDOR_INTERNO)  
**Query Params**:
```typescript
{
  startDate?: string // ISO date
  endDate?: string // ISO date
  sellerId?: string
  page?: number
  limit?: number
}
```
**Response**:
```typescript
{
  sales: Sale[]
  total: number
  page: number
}
```
```typescript
interface Sale {
  id: string
  batchId: string
  soldByUserId: string
  leadId?: string
  customerName: string
  customerContact: string
  salePrice: number
  brokerCommission?: number
  netIndustryValue: number
  saleDate: string
  invoiceUrl?: string
  notes?: string
  createdAt: string
  batch?: Batch
  soldBy?: User
  lead?: Lead
}
```
**Status**: 200

---

### `GET /api/sales-history/:id`
**Auth**: Required  
**Response**:
```typescript
Sale
```
**Status**: 200, 404

---

### `GET /api/sales-history/summary`
**Auth**: Required  
**Query Params**:
```typescript
{
  period?: string // e.g., 'month'
  startDate?: string
  endDate?: string
}
```
**Response**:
```typescript
{
  totalSales: number
  totalCommissions: number
  averageTicket: number
}
```
**Status**: 200

---

### `GET /api/broker/sales`
**Auth**: Required (BROKER)  
**Query Params**:
```typescript
{
  limit?: number
}
```
**Response**:
```typescript
Sale[] // broker's sales only
```
**Status**: 200

---

## File Uploads

### `POST /api/upload/product-medias`
**Auth**: Required (ADMIN_INDUSTRIA)  
**Body**: FormData with `medias` field containing files  
**Constraints**:
- Formats: image/jpeg, image/png, image/webp
- Max size: 5MB per file
- Max files: 10

**Response**:
```typescript
{
  urls: string[]
}
```
**Status**: 201, 400 (invalid format/size)

---

### `POST /api/upload/batch-medias`
**Auth**: Required (ADMIN_INDUSTRIA)  
**Body**: FormData with `medias` field containing files  
**Constraints**: Same as product-medias

**Response**:
```typescript
{
  urls: string[]
}
```
**Status**: 201, 400

---

### `DELETE /api/product-medias/:id`
**Auth**: Required (ADMIN_INDUSTRIA)  
**Response**:
```typescript
{ success: true }
```
**Status**: 200, 404

Removes media from storage and database.

---

### `DELETE /api/batch-medias/:id`
**Auth**: Required (ADMIN_INDUSTRIA)  
**Response**:
```typescript
{ success: true }
```
**Status**: 200, 404

---

## Error Responses

All endpoints may return error responses in this format:

```typescript
{
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
  success: false
}
```

### Common Error Codes

- `VALIDATION_ERROR` - Input validation failed (400)
- `UNAUTHORIZED` - Authentication required (401)
- `FORBIDDEN` - Insufficient permissions (403)
- `NOT_FOUND` - Resource not found (404)
- `CONFLICT` - Resource conflict (409)
- `CSRF_TOKEN_MISSING` - CSRF token required (419)
- `BATCH_NOT_AVAILABLE` - Batch already reserved/sold (400)
- `SLUG_EXISTS` - Slug already in use (409)
- `INTERNAL_ERROR` - Server error (500)

---

## Common Types

```typescript
type UserRole = 'ADMIN_INDUSTRIA' | 'BROKER' | 'VENDEDOR_INTERNO'

type BatchStatus = 'DISPONIVEL' | 'RESERVADO' | 'VENDIDO' | 'INATIVO'

type MaterialType = 'GRANITO' | 'MARMORE' | 'QUARTZITO' | 'LIMESTONE' | 'TRAVERTINO' | 'OUTROS'

type FinishType = 'POLIDO' | 'LEVIGADO' | 'BRUTO' | 'APICOADO' | 'FLAMEADO'

type LinkType = 'LOTE_UNICO' | 'PRODUTO_GERAL' | 'CATALOGO_COMPLETO'

interface User {
  id: string
  name: string
  email: string
  phone?: string
  role: UserRole
  industryId?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface Media {
  id: string
  url: string
  displayOrder: number
  isCover: boolean
  createdAt: string
}
```

---

## Notes

1. **Pagination**: All list endpoints support pagination. Default limits are specified per endpoint.

2. **Filtering**: Empty string values for enum filters (`''`) mean "no filter applied".

3. **Soft Deletes**: DELETE operations typically soft delete (set `isActive: false`) rather than hard delete.

4. **Timestamps**: All dates are ISO 8601 strings.

5. **CSRF Protection**: All POST/PUT/PATCH/DELETE requests require `X-CSRF-Token` header. Token is read from `csrf_token` cookie (set by backend on first page load).

6. **Auth Cookies**: Set by backend as HTTP-only, Secure (in production), SameSite=Strict.

7. **File Uploads**: Use multipart/form-data. Images are resized/optimized server-side.

8. **Role-Based Access**: 
   - `ADMIN_INDUSTRIA`: Full access to industry management
   - `VENDEDOR_INTERNO`: Access to inventory, links, leads
   - `BROKER`: Access to shared inventory, links, leads

9. **Optimistic Updates**: Frontend performs optimistic updates for reservations. Backend must validate and may reject.

10. **View Tracking**: Public link views are tracked automatically with no authentication required.

---

## 3. Esquema do Banco de Dados

```sql
-- =============================================
-- 1. CONFIGURAÇÃO INICIAL
-- Habilita extensão para gerar UUIDs
-- =============================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- 2. CRIAÇÃO DOS ENUMS (TIPOS PERSONALIZADOS)
-- Garante integridade dos dados limitando valores
-- =============================================
CREATE TYPE user_role_type AS ENUM ('ADMIN_INDUSTRIA', 'VENDEDOR_INTERNO', 'BROKER');
CREATE TYPE batch_status_type AS ENUM ('DISPONIVEL', 'RESERVADO', 'VENDIDO', 'INATIVO');
CREATE TYPE link_type_enum AS ENUM ('LOTE_UNICO', 'CATALOGO_COMPLETO', 'PRODUTO_GERAL');
CREATE TYPE media_type_enum AS ENUM ('IMAGE', 'VIDEO');
CREATE TYPE interaction_type_enum AS ENUM ('INTERESSE_LOTE', 'INTERESSE_CATALOGO', 'DUVIDA_GERAL');
CREATE TYPE reservation_status_type AS ENUM ('ATIVA', 'CONFIRMADA_VENDA', 'EXPIRADA', 'CANCELADA');
CREATE TYPE finish_type_enum AS ENUM ('POLIDO', 'LEVIGADO', 'BRUTO', 'NATURAL', 'OUTRO');

-- =============================================
-- 3. TABELAS DO NÚCLEO (CORE)
-- =============================================

-- Tabela: Indústrias
CREATE TABLE industries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    cnpj VARCHAR(20) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE, -- Para url: sistema.com/pedras-sul
    contact_email VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(50),
    policy_terms TEXT, -- Termos de venda
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: Usuários (Sistema unificado de login)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    industry_id UUID REFERENCES industries(id) ON DELETE CASCADE, -- NULL se for Broker Freelancer
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    role user_role_type NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 4. CATÁLOGO (Nível Conceitual)
-- =============================================

-- Tabela: Produtos (Tipos de Pedra)
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    industry_id UUID NOT NULL REFERENCES industries(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL, -- Ex: Mármore Carrara
    sku_code VARCHAR(100), -- Código interno
    description TEXT,
    material_type VARCHAR(100), -- Ex: Granito, Mármore
    finish_type finish_type_enum DEFAULT 'POLIDO',
    is_public_catalog BOOLEAN DEFAULT TRUE, -- Se aparece na vitrine geral
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE -- Soft Delete
);

-- Tabela: Mídias do Produto (Fotos de Capa/Marketing)
CREATE TABLE product_medias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    url VARCHAR(500) NOT NULL,
    display_order INTEGER DEFAULT 0,
    is_cover BOOLEAN DEFAULT FALSE,
    media_type media_type_enum DEFAULT 'IMAGE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 5. ESTOQUE FÍSICO (Nível Real)
-- =============================================

-- Tabela: Lotes (Batches)
CREATE TABLE batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    batch_code VARCHAR(100) NOT NULL, -- Ex: Lote #505
    
    -- Dimensões Físicas
    height DECIMAL(8,2) NOT NULL, -- em cm
    width DECIMAL(8,2) NOT NULL, -- em cm
    thickness DECIMAL(8,2) NOT NULL, -- em cm
    quantity_slabs INTEGER DEFAULT 1, -- Qtd de chapas neste lote
    net_area DECIMAL(10,2), -- Area total em m2
    
    industry_price DECIMAL(12,2) NOT NULL, -- Preço base da industria
    status batch_status_type DEFAULT 'DISPONIVEL',
    origin_quarry VARCHAR(255), -- Pedreira
    
    entry_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: Mídias do Lote (Fotos Reais)
CREATE TABLE batch_medias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    url VARCHAR(500) NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 6. PERMISSÕES E COMPARTILHAMENTO (B2B)
-- =============================================

-- Tabela: Estoque Compartilhado (Lotes específicos p/ Brokers)
CREATE TABLE shared_inventory_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
    broker_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    industry_owner_id UUID NOT NULL REFERENCES industries(id) ON DELETE CASCADE,
    
    negotiated_price DECIMAL(12,2), -- Preço especial para este broker
    shared_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    
    CONSTRAINT unique_batch_share UNIQUE (batch_id, broker_user_id)
);

-- Tabela: Permissão de Catálogo (Vitrine p/ Brokers)
CREATE TABLE shared_catalog_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    industry_id UUID NOT NULL REFERENCES industries(id) ON DELETE CASCADE,
    broker_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    can_show_prices BOOLEAN DEFAULT FALSE, -- Se o broker pode ver/exibir preço médio
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,

    CONSTRAINT unique_catalog_share UNIQUE (industry_id, broker_user_id)
);

-- =============================================
-- 7. CANAIS DE VENDA (LINKS PÚBLICOS)
-- =============================================

-- Tabela: Links de Venda (Polimórfica)
CREATE TABLE sales_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- Quem criou
    industry_id UUID NOT NULL REFERENCES industries(id) ON DELETE CASCADE, -- Origem dos dados
    
    -- Campos Polimórficos (Preenchidos conforme o tipo do link)
    batch_id UUID REFERENCES batches(id) ON DELETE SET NULL,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    
    link_type link_type_enum NOT NULL,
    slug_token VARCHAR(100) NOT NULL UNIQUE, -- Token da URL
    title VARCHAR(255), -- Título personalizado opcional
    
    display_price DECIMAL(12,2), -- Preço mostrado ao cliente final
    show_price BOOLEAN DEFAULT TRUE, -- Exibir preço ou "Sob Consulta"
    
    views_count INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 8. CLIENTES, LEADS E INTERAÇÕES
-- =============================================

-- Tabela: Leads (Clientes Potenciais)
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255), -- Não é unique global pois pode repetir em industrias diferentes, mas idealmente seria
    phone VARCHAR(50),
    whatsapp VARCHAR(50),
    marketing_opt_in BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_interaction TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: Interações (O que o lead fez)
CREATE TABLE lead_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    sales_link_id UUID NOT NULL REFERENCES sales_links(id) ON DELETE SET NULL,
    
    -- Detalhes do interesse
    target_batch_id UUID REFERENCES batches(id) ON DELETE SET NULL,
    target_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    
    message TEXT,
    interaction_type interaction_type_enum DEFAULT 'INTERESSE_LOTE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: Assinaturas (Quero receber novidades)
CREATE TABLE lead_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE, -- Interesse neste tipo
    linked_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- Vendedor dono do lead
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 9. OPERACIONAL (RESERVAS E VENDAS)
-- =============================================

-- Tabela: Reservas
CREATE TABLE reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE RESTRICT,
    seller_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    
    status reservation_status_type DEFAULT 'ATIVA',
    notes TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela: Histórico de Vendas (Faturamento)
CREATE TABLE sales_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES batches(id),
    seller_user_id UUID NOT NULL REFERENCES users(id),
    industry_id UUID NOT NULL REFERENCES industries(id),
    lead_id UUID REFERENCES leads(id),
    
    final_sold_price DECIMAL(12,2) NOT NULL, -- Valor total pago pelo cliente
    industry_net_value DECIMAL(12,2) NOT NULL, -- Valor que fica para a industria
    broker_commission DECIMAL(12,2) DEFAULT 0, -- Margem do vendedor
    
    invoice_number VARCHAR(100),
    sold_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- =============================================
-- FIM DO SCRIPT
-- =============================================
```

---

## 4. Configuração de Ambiente

### 4.1 Database

**DB_HOST**
- Propósito: Hostname do servidor PostgreSQL
- Local (Docker): `postgres`
- Produção (AWS RDS): `cava-prod.cluster-xxx.us-east-1.rds.amazonaws.com`

**DB_PORT**
- Propósito: Porta de conexão PostgreSQL
- Local: `5432`
- Produção: `5432`

**DB_USER**
- Propósito: Usuário do banco de dados
- Local: `cava_user`
- Produção: `cava_production_user`

**DB_PASSWORD**
- Propósito: Senha do banco de dados
- Local: `cava_password_dev`
- Produção: AWS Secrets Manager reference ou valor seguro

**DB_NAME**
- Propósito: Nome do database
- Local: `cava_db`
- Produção: `cava_production`

**DB_SSL_MODE**
- Propósito: Modo SSL para conexão
- Local: `disable`
- Produção: `require`

**DB_MAX_OPEN_CONNS**
- Propósito: Máximo de conexões abertas ao pool
- Padrão: `25`

**DB_MAX_IDLE_CONNS**
- Propósito: Máximo de conexões ociosas no pool
- Padrão: `5`

**DB_CONN_MAX_LIFETIME**
- Propósito: Tempo máximo de vida de uma conexão
- Padrão: `5m`

---

### 4.2 Storage

**STORAGE_TYPE**
- Propósito: Tipo de storage backend (minio ou s3)
- Local: `minio`
- Produção: `s3`

**STORAGE_ENDPOINT**
- Propósito: URL do servidor de storage
- Local (MinIO): `http://minio:9000`
- Produção (S3): vazio (usa endpoint padrão AWS)

**STORAGE_ACCESS_KEY**
- Propósito: Access key para autenticação
- Local: `minio_access_key`
- Produção: IAM role ou access key específica

**STORAGE_SECRET_KEY**
- Propósito: Secret key para autenticação
- Local: `minio_secret_key`
- Produção: IAM role ou secret key específica

**STORAGE_BUCKET_NAME**
- Propósito: Nome do bucket principal
- Local: `cava-media`
- Produção: `cava-production-media`

**STORAGE_REGION**
- Propósito: Região do storage
- Local: `us-east-1` (MinIO usa valor dummy)
- Produção: `us-east-1` ou região AWS específica

**STORAGE_USE_SSL**
- Propósito: Usar HTTPS para conexão
- Local: `false`
- Produção: `true`

**STORAGE_PUBLIC_URL**
- Propósito: URL pública base para acesso a arquivos (se aplicável)
- Local: `http://localhost:9000/cava-media`
- Produção: CloudFront URL ou bucket URL público

---

### 4.3 Auth & Security

**JWT_SECRET**
- Propósito: Chave secreta para assinar tokens JWT
- Exemplo: Gerar com `openssl rand -base64 64`
- Crítico: NUNCA commitar, deve ser único por ambiente

**JWT_ACCESS_TOKEN_DURATION**
- Propósito: Duração do access token
- Padrão: `15m`

**JWT_REFRESH_TOKEN_DURATION**
- Propósito: Duração do refresh token
- Padrão: `168h` (7 dias)

**PASSWORD_PEPPER**
- Propósito: Salt global adicional para hashing de senhas
- Exemplo: Gerar com `openssl rand -base64 32`
- Crítico: NUNCA mudar após produção (invalida todas as senhas)

**CSRF_SECRET**
- Propósito: Chave para geração de tokens CSRF
- Exemplo: Gerar com `openssl rand -base64 32`

**COOKIE_SECURE**
- Propósito: Flag Secure para cookies
- Local: `false`
- Produção: `true`

**COOKIE_DOMAIN**
- Propósito: Domínio dos cookies
- Local: `localhost`
- Produção: `.cava.com.br` (permite subdomínios)

**BCRYPT_COST**
- Propósito: Custo computacional do bcrypt (fallback, usar Argon2id preferencialmente)
- Padrão: `12`

---

### 4.4 Application

**APP_ENV**
- Propósito: Ambiente de execução
- Valores: `development`, `staging`, `production`

**APP_HOST**
- Propósito: Host de bind do servidor HTTP
- Local: `0.0.0.0`
- Produção: `0.0.0.0`

**APP_PORT**
- Propósito: Porta de bind do servidor HTTP
- Local: `3001`
- Produção: `8080`

**FRONTEND_URL**
- Propósito: URL do frontend para CORS e redirecionamentos
- Local: `http://localhost:3000`
- Produção: `https://app.cava.com.br`

**PUBLIC_LINK_BASE_URL**
- Propósito: URL base para links de venda públicos
- Local: `http://localhost:3000`
- Produção: `https://cava.com.br`

**ALLOWED_ORIGINS**
- Propósito: Lista de origins permitidas para CORS (separadas por vírgula)
- Local: `http://localhost:3000,http://localhost:3001`
- Produção: `https://app.cava.com.br,https://cava.com.br`

**RATE_LIMIT_AUTH_RPM**
- Propósito: Rate limit para endpoints de auth (requests por minuto)
- Padrão: `5`

**RATE_LIMIT_PUBLIC_RPM**
- Propósito: Rate limit para endpoints públicos (requests por minuto)
- Padrão: `30`

**RATE_LIMIT_AUTHENTICATED_RPM**
- Propósito: Rate limit para endpoints autenticados (requests por minuto)
- Padrão: `100`

**LOG_LEVEL**
- Propósito: Nível de logging
- Local: `debug`
- Produção: `info`

**LOG_FORMAT**
- Propósito: Formato de log
- Valores: `json`, `text`
- Local: `text`
- Produção: `json`

**MIGRATIONS_PATH**
- Propósito: Caminho para arquivos de migration
- Padrão: `file://migrations`

**AUTO_MIGRATE**
- Propósito: Executar migrations automaticamente no boot
- Local: `true`
- Produção: `false` (executar via CI/CD)

---

### 4.5 Email (Opcional para MVP)

**SMTP_HOST**
- Propósito: Servidor SMTP para envio de emails
- Exemplo: `smtp.gmail.com`

**SMTP_PORT**
- Propósito: Porta do servidor SMTP
- Exemplo: `587`

**SMTP_USER**
- Propósito: Usuário SMTP
- Exemplo: `noreply@cava.com.br`

**SMTP_PASSWORD**
- Propósito: Senha SMTP
- Exemplo: AWS SES credentials

**EMAIL_FROM**
- Propósito: Email remetente padrão
- Exemplo: `noreply@cava.com.br`

---

## 5. Arquitetura de Containers

### 5.1 Serviço: PostgreSQL

**Responsabilidade**: Banco de dados relacional principal

**Dependências**: Nenhuma

**Health Check**:
- Comando: `pg_isready -U cava_user -d cava_db`
- Intervalo: 10 segundos
- Timeout: 5 segundos
- Retries: 5

**Volumes**:
- `/var/lib/postgresql/data`: Persistência dos dados do banco (CRÍTICO - perda resulta em perda total de dados)

**Rede**: Rede interna Docker (não expor publicamente em produção)

**Variáveis de Ambiente**:
- `POSTGRES_USER`: usuário administrador
- `POSTGRES_PASSWORD`: senha administrador
- `POSTGRES_DB`: nome do database inicial

**Restart Policy**: `always` (sempre reiniciar em caso de falha)

**Exposição de Portas**:
- Local: `5432:5432` (para debug/acesso externo)
- Produção: Não expor, usar apenas rede interna ou RDS

---

### 5.2 Serviço: MinIO

**Responsabilidade**: Storage S3-compatible para arquivos de mídia

**Dependências**: Nenhuma

**Health Check**:
- URL: `http://minio:9000/minio/health/live`
- Intervalo: 30 segundos
- Timeout: 10 segundos
- Retries: 3

**Volumes**:
- `/data`: Persistência dos arquivos (CRÍTICO - perda resulta em perda de mídias)

**Rede**: Rede interna Docker + expor console web em desenvolvimento

**Variáveis de Ambiente**:
- `MINIO_ROOT_USER`: access key root
- `MINIO_ROOT_PASSWORD`: secret key root

**Restart Policy**: `always`

**Exposição de Portas**:
- Local: `9000:9000` (API) e `9001:9001` (Console Web)
- Produção: Substituir por AWS S3 (não usar MinIO)

**Inicialização**:
- Após boot, um script init deve criar o bucket `cava-media` automaticamente
- Configurar política de acesso público apenas para leitura (não escrita)

---

### 5.3 Serviço: API (Backend Go)

**Responsabilidade**: Servidor HTTP da aplicação

**Dependências**:
- PostgreSQL (OBRIGATÓRIO - app não inicia sem DB funcional)
- MinIO/S3 (OBRIGATÓRIO - app valida conexão no startup)

**Health Check**:
- URL: `http://app:3001/health`
- Intervalo: 30 segundos
- Timeout: 10 segundos
- Retries: 3
- Start Period: 40 segundos (tempo para migrations e init)

**Volumes**:
- Nenhum necessário (aplicação stateless)
- Opcional: volume para logs persistentes se não usar logger externo

**Rede**: 
- Rede interna Docker para comunicação com DB e MinIO
- Expor porta HTTP para fora do container

**Variáveis de Ambiente**:
- Todas listadas na seção 4 (Database, Storage, Auth, Application)

**Restart Policy**: `unless-stopped` (não reiniciar se manualmente parado)

**Exposição de Portas**:
- Local: `3001:3001`
- Produção: `8080:8080` (atrás de load balancer/ALB)

**Ordem de Inicialização**:
1. Aguardar PostgreSQL estar healthy (via depends_on + condition: service_healthy)
2. Aguardar MinIO estar healthy
3. Executar migrations (se AUTO_MIGRATE=true)
4. Inicializar pools de conexão (DB, Storage)
5. Registrar rotas e middlewares
6. Iniciar servidor HTTP

**Falha em Inicialização**:
- Se DB não conectar após retries: PANIC e sair (não tem como funcionar)
- Se Storage não conectar após retries: PANIC e sair (não tem como funcionar)
- Se migrations falharem: PANIC e sair (estado inconsistente)

---

### 5.4 Comunicação entre Containers

**app → postgres**:
- Protocolo: PostgreSQL wire protocol (TCP)
- Host: `postgres` (resolve via DNS interno Docker)
- Porta: `5432`
- Autenticação: username/password via variáveis de ambiente

**app → minio**:
- Protocolo: HTTP/S3 API
- Host: `minio` (resolve via DNS interno Docker)
- Porta: `9000`
- Autenticação: access key / secret key via variáveis de ambiente

**Rede Docker**:
- Criar rede bridge customizada chamada `cava-network`
- Todos os containers na mesma rede para resolução de DNS automática
- Não usar rede `default` (usar rede nomeada explicitamente)

---

### 5.5 Migração para Serviços Gerenciados (AWS)

**PostgreSQL → RDS**:
- Trocar `DB_HOST` para endpoint RDS
- Habilitar `DB_SSL_MODE=require`
- Credenciais via AWS Secrets Manager (opcional)
- Security group permitindo conexão do app

**MinIO → S3**:
- Trocar `STORAGE_TYPE=s3`
- Remover `STORAGE_ENDPOINT` (usa padrão AWS)
- Trocar `STORAGE_ACCESS_KEY` e `STORAGE_SECRET_KEY` para IAM role preferencialmente
- Atualizar `STORAGE_BUCKET_NAME` para bucket S3 real
- Habilitar `STORAGE_USE_SSL=true`
- Opcionalmente configurar CloudFront na frente e atualizar `STORAGE_PUBLIC_URL`

**Nenhuma mudança de código necessária** - apenas variáveis de ambiente.

---

## 6. Estrutura de Pastas

```
.
├── cmd
│   └── api
│       └── main.go                         # Entry point: Bootstrap, DI, Router, Server
│
├── internal
│   ├── config
│   │   └── config.go                       # Load de env vars (DB, Auth, Storage, App)
│   │
│   ├── domain                              # Camada de Domínio (Puro Go)
│   │   ├── entity
│   │   │   ├── user.go                     # Structs: User, Role Enum
│   │   │   ├── industry.go                 # Structs: Industry
│   │   │   ├── product.go                  # Structs: Product, Material Enum, Finish Enum
│   │   │   ├── media.go                    # Structs: Media (Product/Batch), MediaType Enum
│   │   │   ├── batch.go                    # Structs: Batch, BatchStatus Enum
│   │   │   ├── shared_inventory.go         # Structs: SharedInventoryBatch, SharedCatalogPermissions
│   │   │   ├── sales_link.go               # Structs: SalesLink, LinkType Enum
│   │   │   ├── lead.go                     # Structs: Lead, LeadInteraction, LeadSubscription
│   │   │   ├── reservation.go              # Structs: Reservation, ReservationStatus Enum
│   │   │   ├── sale.go                     # Structs: Sale (SalesHistory), Invoice
│   │   │   └── dashboard.go                # Structs: MetricsDTO, ActivityDTO
│   │   │
│   │   ├── errors
│   │   │   └── errors.go                   # Definição de AppError, NotFound, Conflict, Validation
│   │   │
│   │   ├── repository                      # Interfaces (Contratos)
│   │   │   ├── user_repository.go
│   │   │   ├── industry_repository.go
│   │   │   ├── product_repository.go
│   │   │   ├── batch_repository.go
│   │   │   ├── media_repository.go
│   │   │   ├── shared_inventory_repository.go
│   │   │   ├── sales_link_repository.go
│   │   │   ├── lead_repository.go
│   │   │   ├── lead_interaction_repository.go
│   │   │   ├── reservation_repository.go
│   │   │   └── sales_history_repository.go
│   │   │
│   │   └── service                         # Interfaces (Contratos)
│   │       ├── auth_service.go
│   │       ├── user_service.go
│   │       ├── product_service.go
│   │       ├── batch_service.go
│   │       ├── shared_inventory_service.go
│   │       ├── sales_link_service.go
│   │       ├── lead_service.go
│   │       ├── reservation_service.go
│   │       ├── sales_history_service.go
│   │       ├── dashboard_service.go
│   │       └── storage_service.go
│   │
│   ├── handler                             # Camada de Transporte (HTTP Controllers)
│   │   ├── routes.go                       # Configuração de rotas (Chi/Echo)
│   │   ├── auth_handler.go                 # Login, Logout, Refresh, ForgotPassword
│   │   ├── user_handler.go                 # CRUD Users, Invite Broker
│   │   ├── product_handler.go              # CRUD Products
│   │   ├── batch_handler.go                # CRUD Batches, Status Update
│   │   ├── shared_inventory_handler.go     # Sharing logic, Negotiated Price
│   │   ├── sales_link_handler.go           # Link creation, Slug validation
│   │   ├── public_handler.go               # Landing pages (Leitura de links públicos)
│   │   ├── lead_handler.go                 # Lead capture, Status update
│   │   ├── reservation_handler.go          # Create Reservation, Confirm Sale
│   │   ├── sales_history_handler.go        # List sales, Summary
│   │   ├── dashboard_handler.go            # Admin/Broker Metrics
│   │   └── upload_handler.go               # Recebimento de arquivos (Multipart)
│   │
│   ├── middleware                          # Cross-cutting concerns
│   │   ├── auth.go                         # JWT Validation & Extraction
│   │   ├── rbac.go                         # Role checking (Admin/Seller/Broker)
│   │   ├── cors.go                         # CORS setup
│   │   ├── csrf.go                         # CSRF Cookie & Header validation
│   │   ├── rate_limit.go                   # Token bucket limiter
│   │   ├── logger.go                       # Structured logging
│   │   ├── recovery.go                     # Panic catcher
│   │   └── request_id.go                   # X-Request-ID injection
│   │
│   ├── repository                          # Implementação PostgreSQL
│   │   ├── db.go                           # Init DB connection pool
│   │   ├── user_repository.go
│   │   ├── industry_repository.go
│   │   ├── product_repository.go
│   │   ├── batch_repository.go
│   │   ├── media_repository.go
│   │   ├── shared_inventory_repository.go
│   │   ├── sales_link_repository.go
│   │   ├── lead_repository.go
│   │   ├── lead_interaction_repository.go
│   │   ├── reservation_repository.go
│   │   └── sales_history_repository.go
│   │
│   ├── service                             # Implementação Lógica de Negócio
│   │   ├── auth_service.go                 # Login logic, Token rotation
│   │   ├── user_service.go                 # Create user, Hash password
│   │   ├── product_service.go              # Manage products logic
│   │   ├── batch_service.go                # Area calculation, Validations
│   │   ├── shared_inventory_service.go     # Sharing rules
│   │   ├── sales_link_service.go           # Slug generation, Views increment
│   │   ├── lead_service.go                 # Capture logic, Interaction logging
│   │   ├── reservation_service.go          # Transactional reservation, Expiration job
│   │   ├── sales_history_service.go        # Commission calc, Net value calc
│   │   ├── dashboard_service.go            # Aggregation queries
│   │   └── storage_service.go              # Naming strategy, Upload execution
│   │
│   └── storage                             # Implementação Object Storage
│       └── s3_adapter.go                   # Implementação MinIO/AWS SDK
│
├── migrations                       # Scripts SQL versionados
│   ├── 000001_create_extensions.up.sql
│   ├── 000001_create_extensions.down.sql
│   ├── 000002_create_enums.up.sql
│   ├── 000003_create_core_tables.up.sql      # Users, Industries
│   ├── 000004_create_product_tables.up.sql
│   ├── 000005_create_batch_tables.up.sql
│   ├── 000006_create_sharing_tables.up.sql
│   ├── 000007_create_sales_tables.up.sql
│   ├── 000008_create_lead_tables.up.sql
│   ├── 000009_create_operational_tables.up.sql # Reservations, SalesHistory
│   ├── 000010_create_indexes.up.sql
│   └── 000011_seed_data.up.sql
│
├── pkg                                     # Shared Libraries
│   ├── jwt
│   │   └── token.go                        # Generate/Validate/Extract
│   ├── password
│   │   └── argon2.go                       # Hash/Verify implementations
│   ├── validator
│   │   └── validator.go                    # Struct validation wrapper
│   ├── response
│   │   └── json.go                         # Success/Error standard formats
│   ├── pagination
│   │   └── pagination.go                   # Limit/Offset/Page structs
│   └── utils
│       ├── uuid.go                         # UUID generation helper
│       └── slug.go                         # String sanitization/slugify
│
├── .env                                    # Configuração Local
├── .env.example                            # Exemplo de configuração
├── .gitignore                              # Arquivos ignorados pelo git
├── docker-compose.yml                      # Stack local (App, DB, MinIO)
├── Dockerfile                              # Build definition
├── go.mod                                  # Module definition
├── go.sum                                  # Dependency checksums
└── README.md                               # Documentação
```

---

## 7. Domain Layer

### 7.1 Interfaces de Repository

**UserRepository**:
- Criar novo usuário
- Buscar usuário por ID
- Buscar usuário por email (para login)
- Buscar usuários por indústria
- Buscar usuários por role
- Atualizar usuário
- Desativar usuário (soft delete via is_active=false)
- Verificar se email já existe

**ProductRepository**:
- Criar produto
- Buscar produto por ID
- Buscar produtos por indústria (com filtros: material, search, includeInactive)
- Atualizar produto
- Desativar produto (soft delete via deleted_at)
- Contar lotes associados ao produto

**BatchRepository**:
- Criar lote
- Buscar lote por ID
- Buscar lotes por produto
- Buscar lotes por status
- Buscar lotes disponíveis (status=DISPONIVEL)
- Buscar lotes por código (busca parcial)
- Atualizar lote
- Atualizar apenas status do lote
- Verificar disponibilidade do lote (atomicamente)
- Listar com paginação e filtros múltiplos

**SharedInventoryRepository**:
- Criar compartilhamento (lote para broker)
- Buscar compartilhamentos por broker
- Buscar compartilhamentos por lote
- Verificar se lote já está compartilhado com broker específico
- Atualizar preço negociado
- Remover compartilhamento (hard delete)

**SalesLinkRepository**:
- Criar link de venda
- Buscar link por ID
- Buscar link por slug (para landing page pública)
- Buscar links por usuário criador
- Buscar links por tipo
- Verificar se slug já existe
- Incrementar contador de views (atomicamente)
- Atualizar link
- Desativar link (soft delete via is_active=false)
- Listar com paginação e filtros

**LeadRepository**:
- Criar lead
- Buscar lead por ID
- Buscar lead por email (verificar duplicatas)
- Buscar leads por link de venda
- Buscar leads com filtros (data, status, optIn)
- Atualizar status do lead
- Listar com paginação

**LeadInteractionRepository**:
- Criar interação
- Buscar interações por lead
- Buscar interações por link de venda

**ReservationRepository**:
- Criar reserva
- Buscar reserva por ID
- Buscar reservas por lote
- Buscar reservas ativas (não expiradas)
- Buscar reservas expiradas (para job de limpeza)
- Atualizar status da reserva
- Cancelar reserva

**SalesHistoryRepository**:
- Criar registro de venda
- Buscar venda por ID
- Buscar vendas por vendedor
- Buscar vendas por indústria
- Buscar vendas por período (startDate, endDate)
- Buscar vendas com filtros e paginação
- Calcular sumário de vendas (total, comissões, ticket médio)

---

### 7.2 Interfaces de Service

**AuthService**:
- Registrar novo usuário (hash senha, criar registro)
- Fazer login (validar credenciais, gerar tokens)
- Fazer logout (invalidar refresh token)
- Renovar access token (validar refresh token, gerar novo access token, rotacionar refresh token)
- Trocar senha (validar senha atual, hash nova senha)
- Validar token JWT
- Gerar token temporário para novo usuário (convite)

**ProductService**:
- Criar produto com validações de negócio
- Atualizar produto
- Desativar produto (verificar se tem lotes associados)
- Buscar produtos com filtros
- Buscar produto por ID com dados relacionados (mídias, contagem de lotes)

**BatchService**:
- Criar lote (calcular área total automaticamente)
- Atualizar lote (recalcular área se dimensões mudarem)
- Atualizar status do lote
- Verificar disponibilidade (status = DISPONIVEL e não expirado)
- Buscar lotes com filtros e paginação
- Buscar lote por ID com dados relacionados (produto, mídias)

**SharedInventoryService**:
- Compartilhar lote com broker (verificar duplicata)
- Remover compartilhamento
- Atualizar preço negociado (apenas broker pode atualizar seu próprio preço)
- Buscar inventário compartilhado de broker
- Buscar todos os compartilhamentos de um lote específico

**SalesLinkService**:
- Criar link de venda (validar slug único, validar linkType vs batchId/productId)
- Atualizar link
- Desativar link
- Buscar link por slug (para landing page pública)
- Incrementar view count
- Validar se slug está disponível
- Buscar links com filtros
- Gerar URL completa do link (base URL + slug)

**LeadService**:
- Capturar lead de landing page (criar lead e interação)
- Buscar leads com filtros
- Atualizar status do lead
- Buscar interações do lead
- Associar lead a reserva

**ReservationService**:
- Criar reserva (verificar disponibilidade, atualizar status do lote, criar reserva - TUDO EM TRANSAÇÃO)
- Cancelar reserva (voltar status do lote para DISPONIVEL)
- Confirmar venda (criar registro em SalesHistory, atualizar status do lote para VENDIDO)
- Buscar reservas ativas
- Job para expirar reservas vencidas (rodar periodicamente)

**SalesHistoryService**:
- Registrar venda (calcular comissão, net value, criar registro)
- Buscar histórico de vendas com filtros
- Calcular sumário de vendas (total, comissões, ticket médio)
- Buscar vendas do broker (para dashboard broker)

**DashboardService**:
- Buscar métricas do dashboard admin/vendedor (lotes disponíveis, vendas mensais, lotes reservados, links ativos, leads count)
- Buscar métricas do dashboard broker (lotes disponíveis compartilhados, vendas mensais, links ativos, comissão mensal)
- Buscar atividades recentes (últimas 10 ações: reserva, venda, compartilhamento, criação)

---

### 7.3 Regras de Negócio

**BatchCode**:
- Formato obrigatório: AAA-999999 (3 letras maiúsculas, hífen, 6 dígitos)
- Conversão automática para uppercase
- Validação no domínio antes de persistir

**Cálculo de Área Total**:
- Fórmula: (height * width * quantitySlabs) / 10000
- Resultado em m²
- Calcular automaticamente ao criar/atualizar lote

**Disponibilidade de Lote**:
- Lote disponível se: status = DISPONIVEL AND is_active = true
- Verificação deve ser atômica (SELECT FOR UPDATE em transação)

**Reserva de Lote**:
- Apenas lotes disponíveis podem ser reservados
- Criar reserva e atualizar status do lote DEVEM ser na mesma transação
- Reserva tem data de expiração (padrão 7 dias)
- Apenas um vendedor pode reservar mesmo lote por vez

**Expiração de Reservas**:
- Job periódico (ex: rodar a cada hora)
- Buscar reservas com expires_at < NOW() e status = ATIVA
- Atualizar status da reserva para EXPIRADA
- Voltar status do lote para DISPONIVEL
- Enviar notificação ao vendedor (opcional)

**Slug de Link de Venda**:
- Deve ser único globalmente
- Formato: lowercase, números e hífens apenas
- Não pode iniciar ou terminar com hífen
- Não pode ter hífens consecutivos
- Mínimo 3 caracteres, máximo 50

**Validação de LinkType**:
- LOTE_UNICO: batchId obrigatório, productId deve ser null
- PRODUTO_GERAL: productId obrigatório, batchId deve ser null
- CATALOGO_COMPLETO: batchId e productId devem ser null

**Incremento de View Count**:
- Deve ser atômico (UPDATE ... SET views_count = views_count + 1)
- Executar sempre que link público for acessado
- Não bloquear renderização da página se falhar

**Comissão de Broker**:
- Fórmula: finalSoldPrice - industryNetValue
- Indústria define quanto quer receber (industryNetValue)
- Broker fica com a diferença
- Validação: finalSoldPrice >= industryNetValue

**Soft Delete**:
- Produtos: usar deleted_at (timestamp)
- Batches: não deletar, apenas is_active = false
- SalesLinks: is_active = false
- Users: is_active = false
- Reservas: status = CANCELADA
- Compartilhamentos: hard delete (pode recompartilhar depois)

**Senha**:
- Mínimo 8 caracteres
- Deve conter pelo menos 1 letra maiúscula
- Deve conter pelo menos 1 número
- Hash com Argon2id (não bcrypt)
- Salt único por usuário (16 bytes)
- Pepper global da aplicação

**Refresh Token Rotation**:
- A cada uso de refresh token, gerar novo refresh token
- Invalidar refresh token anterior
- Limitar refresh tokens ativos por usuário (ex: máximo 5 dispositivos)

---

### 7.4 Value Objects

**BatchCode**:
- Validação de formato no construtor
- Conversão automática para uppercase
- Método String() para representação

**Money** (Opcional):
- Representar valores monetários com precisão (usar decimal, não float)
- Validação de valor positivo
- Métodos para operações (Add, Subtract, Multiply)

**Email**:
- Validação de formato
- Normalização (lowercase, trim)

**Phone**:
- Validação de formato (10-11 dígitos)
- Normalização (remover caracteres não numéricos)

---

## 8. Repository Layer

### 8.1 Estratégia de Paginação

**Padrões**:
- Paginação baseada em offset/limit (não cursor-based)
- Parâmetros: page (começando em 1), limit (itens por página)
- Calcular offset: (page - 1) * limit
- Retornar: items, total, page, limit
- Total via COUNT(*) em query separada (ou WINDOW FUNCTION)

**Limites**:
- Limit padrão: 25-50 dependendo do endpoint
- Limit máximo: 100
- Page mínimo: 1

---

### 8.2 Filtros

**Estratégia**:
- Usar query builder para construir WHERE dinâmico
- Validar filtros no handler antes de passar para repository
- Filtros vazios/null são ignorados
- Combinar filtros com AND

**Filtros Comuns**:
- Busca textual: ILIKE para search parcial
- Status: igualdade exata
- Data: range (startDate, endDate)
- Relações: foreign key exata

---

### 8.3 Transações

**Quando Usar**:
- Criar reserva + atualizar status do lote
- Confirmar venda + criar SalesHistory + atualizar status do lote
- Criar lead + criar interação
- Qualquer operação que precise manter consistência entre múltiplas tabelas

**Como Implementar**:
- Repository recebe *sql.Tx ou *sql.DB
- Service inicia transação e passa para repositories
- Commit se sucesso, Rollback se erro
- Usar defer para garantir cleanup

---

### 8.4 Tratamento de Erros

**Erros de Constraint**:
- **UNIQUE violation**: mapear para ConflictError (ex: email já existe, slug já existe)
- **FOREIGN KEY violation**: mapear para ValidationError (ex: productId inválido)
- **NOT NULL violation**: mapear para ValidationError (campo obrigatório faltando)
- **CHECK constraint**: mapear para ValidationError

**Not Found**:
- Query que retorna 0 rows → NotFoundError
- Diferenciar de erro de query (conexão, sintaxe, etc)

**Timeout**:
- Context timeout → mapear para InternalError com mensagem apropriada

---

### 8.5 Soft Delete

**Implementação**:

**Products**:
- Campo: deleted_at (nullable timestamp)
- Delete: UPDATE products SET deleted_at = NOW() WHERE id = $1
- Queries: WHERE deleted_at IS NULL (por padrão)

**Batches**:
- Campo: is_active (boolean)
- Delete: UPDATE batches SET is_active = false WHERE id = $1
- Queries: WHERE is_active = true (por padrão)

**SalesLinks**:
- Campo: is_active (boolean)
- Delete: UPDATE sales_links SET is_active = false WHERE id = $1
- Queries: WHERE is_active = true (por padrão)

**Users**:
- Campo: is_active (boolean)
- Delete: UPDATE users SET is_active = false WHERE id = $1
- Queries: WHERE is_active = true (por padrão)

---

### 8.6 Performance

**SELECT FOR UPDATE**:
- Usar ao verificar disponibilidade de lote antes de reservar
- Garante lock pessimista (evita race condition)

**Índices Necessários** (além dos definidos no DDL):
- products(industry_id, deleted_at) - para filtrar produtos ativos por indústria
- batches(product_id, status, is_active) - para filtrar lotes disponíveis por produto
- sales_links(slug_token) UNIQUE - para busca rápida de landing page
- sales_links(created_by_user_id, is_active) - para listar links do usuário
- leads(sales_link_id, created_at) - para listar leads por link ordenados por data
- reservations(batch_id, status, expires_at) - para buscar reservas ativas e expiradas
- sales_history(industry_id, sale_date) - para relatórios de vendas por período
- shared_inventory_batches(broker_user_id, is_active) - para inventário do broker

**Connection Pooling**:
- Max open connections: 25 (ajustar baseado em carga)
- Max idle connections: 5
- Connection max lifetime: 5 minutos
- Fechar connections ociosas para evitar "too many connections"

---

## 9. Service Layer

### 9.1 Validações de Regra de Negócio

**AuthService**:
- Validar força da senha (mínimo 8 chars, 1 maiúscula, 1 número)
- Verificar se email já existe antes de registrar
- Validar credenciais no login (comparar hash)
- Validar que refresh token não está expirado
- Validar que refresh token pertence ao usuário

**BatchService**:
- Validar que productId existe e está ativo
- Validar que batchCode é único (por indústria ou globalmente)
- Calcular área total automaticamente (não confiar no input)
- Validar que entryDate não é futuro
- Validar dimensões positivas e dentro dos limites

**SalesLinkService**:
- Validar que slug é único globalmente
- Validar linkType vs batchId/productId (regra descrita em 7.3)
- Validar que batchId/productId existem se fornecidos
- Validar que expiresAt é futuro (se fornecido)
- Validar que displayPrice é positivo (se fornecido)

**ReservationService**:
- Verificar que lote está disponível (SELECT FOR UPDATE)
- Verificar que expiresAt é futuro
- Validar que leadId existe (se fornecido)
- Se customerName/Contact fornecidos, criar lead automaticamente

**SalesHistoryService**:
- Validar que finalSoldPrice >= industryNetValue
- Calcular brokerCommission automaticamente
- Validar que batchId existe e está reservado
- Validar que soldByUserId existe

---

### 9.2 Uso de Transações

**Criar Reserva**:
1. Iniciar transação
2. SELECT batch FOR UPDATE WHERE id = $1 (verificar disponibilidade com lock)
3. Verificar status = DISPONIVEL
4. UPDATE batches SET status = 'RESERVADO' WHERE id = $1
5. INSERT INTO reservations (...)
6. Commit transação

**Confirmar Venda**:
1. Iniciar transação
2. SELECT reservation WHERE id = $1
3. Verificar que reserva está ativa
4. INSERT INTO sales_history (...)
5. UPDATE batches SET status = 'VENDIDO' WHERE id = batch_id
6. UPDATE reservations SET status = 'CONFIRMADA_VENDA' WHERE id = $1
7. Commit transação

**Capturar Lead**:
1. Iniciar transação (opcional, mas recomendado)
2. INSERT INTO leads (...) ou SELECT se já existe por email
3. INSERT INTO lead_interactions (...)
4. Commit transação

---

### 9.3 Cálculos de Negócio

**Área Total do Lote**:
- Fórmula: (height_cm * width_cm * quantity_slabs) / 10000
- Resultado em m²
- Calcular no service, não confiar em valor enviado pelo frontend

**Comissão do Broker**:
- brokerCommission = finalSoldPrice - industryNetValue
- Validar que finalSoldPrice >= industryNetValue (broker não pode vender abaixo do mínimo da indústria)
- netIndustryValue = industryNetValue (o que efetivamente vai para a indústria)

**Sumário de Vendas**:
- totalSales: SUM(final_sold_price)
- totalCommissions: SUM(broker_commission)
- averageTicket: totalSales / COUNT(*)
- Filtrar por período (sale_date BETWEEN startDate AND endDate)
- Filtrar por indústria, vendedor, etc conforme necessário

---

### 9.4 Comunicação entre Services

**Evitar Dependências Circulares**:
- Services devem depender apenas de repositories, não de outros services
- Se precisar coordenar múltiplos serviços, criar service dedicado (ex: OrderService coordena Batch, Reservation, Sales)

**Exceção: AuthService**:
- Pode ser injetado em outros services se precisarem validar permissões

---

## 10. Handler Layer

### 10.1 Validação de Input

**Biblioteca Recomendada**:
- go-playground/validator/v10

**Validações Comuns**:
- `required`: campo obrigatório
- `email`: formato de email
- `min`, `max`: tamanho string ou valor numérico
- `gt`, `gte`: maior que, maior ou igual (números)
- `oneof`: valor deve ser um de uma lista
- `uuid`: formato UUID válido
- Custom validators: batchCode, phone, CPF, CNPJ

**Quando Validar**:
- Sempre validar input antes de passar para service
- Validações estruturais/formato no handler
- Validações de regra de negócio no service

**Response de Erro de Validação**:
- Status: 400 Bad Request
- Body:
  - error.code: "VALIDATION_ERROR"
  - error.message: "Dados inválidos"
  - error.details: map[string]string com erros por campo

---

### 10.2 Parsing de Request

**Body JSON**:
- Usar json.Decoder para parse
- Validar Content-Type: application/json
- Retornar 400 se JSON inválido

**Query Params**:
- Extrair usando net/url ou framework router
- Converter tipos (string para int, bool, etc)
- Valores padrão quando param não fornecido

**Path Params**:
- Extrair usando framework router
- Validar formato (ex: UUID)

**Headers**:
- Authorization: extrair token (formato: Bearer <token>)
- X-CSRF-Token: extrair e validar
- Content-Type: validar para requests com body

---

### 10.3 Mapeamento de Erros

**NotFoundError → 404**:
- error.code: "NOT_FOUND"
- error.message: "Recurso não encontrado"

**ValidationError → 400**:
- error.code: "VALIDATION_ERROR"
- error.message: descrição do erro
- error.details: detalhes por campo (se aplicável)

**ConflictError → 409**:
- error.code: "CONFLICT"
- error.message: descrição do conflito (ex: "Email já cadastrado", "Slug já existe")

**UnauthorizedError → 401**:
- error.code: "UNAUTHORIZED"
- error.message: "Autenticação necessária"

**ForbiddenError → 403**:
- error.code: "FORBIDDEN"
- error.message: "Você não tem permissão para acessar este recurso"

**BatchNotAvailableError → 400**:
- error.code: "BATCH_NOT_AVAILABLE"
- error.message: "Lote não disponível para reserva"

**CSRFTokenError → 419**:
- error.code: "CSRF_TOKEN_MISSING" ou "CSRF_TOKEN_INVALID"
- error.message: descrição apropriada

**InternalError → 500**:
- error.code: "INTERNAL_ERROR"
- error.message: "Erro interno do servidor"
- Nunca expor detalhes do erro original (segurança)

---

### 10.4 Serialização de Response

**Formato JSON**:
- CamelCase para campos (usar tags JSON nas structs)
- Omitir campos null/zero (usar `omitempty`)
- Timestamps em ISO 8601 (RFC3339)

**Response de Sucesso**:
- GET: retornar entidade ou lista
- POST: retornar entidade criada (status 201)
- PUT/PATCH: retornar entidade atualizada
- DELETE: retornar {success: true} ou 204 No Content

**Response de Erro**:
- Sempre estruturado conforme especificado em 10.3
- success: false
- error.code, error.message, error.details (opcional)

---

## 11. Middleware

### 11.1 Autenticação (Auth Middleware)

**Responsabilidades**:
1. Extrair token JWT do header Authorization
2. Verificar formato "Bearer <token>"
3. Validar assinatura do token (usando JWT_SECRET)
4. Verificar expiração (campo exp)
5. Extrair claims (userID, role, industryID)
6. Injetar dados do usuário no contexto da requisição
7. Retornar 401 se token ausente, malformado, inválido ou expirado

**Contexto**:
- Chaves do contexto: "userID", "userRole", "industryID"
- Usar context.WithValue para injetar
- Handlers extraem via context.Value

**Exceções**:
- Não aplicar em rotas públicas (/api/public/*)
- Não aplicar em rotas de auth (/api/auth/login, /api/auth/refresh)

---

### 11.2 Controle de Acesso (RBAC Middleware)

**Responsabilidades**:
1. Extrair role do contexto (injetado pelo auth middleware)
2. Verificar se role está na lista de roles permitidas para a rota
3. Retornar 403 se não autorizado

**Configuração por Rota**:
- Middleware parametrizável: recebe lista de roles permitidas
- Exemplo: /api/products (ADMIN_INDUSTRIA)
- Exemplo: /api/inventory (ADMIN_INDUSTRIA, VENDEDOR_INTERNO)
- Exemplo: /api/broker/shared-inventory (BROKER)

**Ordem de Execução**:
- Auth middleware DEVE rodar antes de RBAC
- RBAC depende de dados injetados pelo Auth

---

### 11.3 Rate Limiting

**Estratégia**:
- Token Bucket ou Sliding Window
- Identificador: IP address + user ID (se autenticado)
- Storage: sync.Map (em memória) para simplicidade, Redis para produção distribuída
- Limites diferentes por tipo de rota

**Limites por Tipo de Rota**:

**Auth endpoints** (/api/auth/*):
- Limite: 5 requests por minuto por IP
- Objetivo: prevenir brute force

**Public endpoints** (/api/public/*):
- Limite: 30 requests por minuto por IP
- Objetivo: prevenir abuso de landing pages

**Authenticated endpoints**:
- Limite: 100 requests por minuto por usuário
- Objetivo: prevenir abuso por usuário legítimo

**Response quando limite excedido**:
- Status: 429 Too Many Requests
- Headers:
  - X-RateLimit-Limit: limite configurado
  - X-RateLimit-Remaining: requests restantes
  - X-RateLimit-Reset: timestamp quando limite reseta
- Body: error.code "RATE_LIMIT_EXCEEDED"

---

### 11.4 CORS

**Configuração**:
- Allowed Origins: ler de ALLOWED_ORIGINS (lista separada por vírgula)
- Allowed Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
- Allowed Headers: Content-Type, Authorization, X-CSRF-Token
- Allow Credentials: true (necessário para cookies)
- Max Age: 3600 segundos (cache preflight)

**Validação**:
- Verificar header Origin contra lista de allowed origins
- Se não permitido, não adicionar headers CORS
- Responder OPTIONS com 204 No Content

---

### 11.5 CSRF Protection

**Geração de Token**:
- Gerar token CSRF na primeira requisição (ou endpoint dedicado)
- Token: UUID ou string random segura
- Setar cookie `csrf_token` (HTTP-only=false, Secure=prod, SameSite=Strict)
- Lifetime: mesma sessão ou 24 horas

**Validação**:
- Aplicar apenas em POST, PUT, PATCH, DELETE
- Extrair token do header X-CSRF-Token
- Extrair token do cookie csrf_token
- Comparar (constant-time comparison)
- Retornar 419 se ausente ou inválido

**Exceções**:
- Não aplicar em endpoints públicos (/api/public/*)
- Não aplicar em /api/auth/login (mas aplicar em logout)

---

### 11.6 Logging

**Campos Obrigatórios**:
- timestamp: RFC3339
- level: info, warn, error
- method: HTTP method
- path: URL path
- status: HTTP status code
- duration: tempo de processamento (ms)
- ip: client IP
- user_id: se autenticado
- request_id: UUID único da requisição

**Formato**:
- JSON em produção (para parsing por ferramentas)
- Text em desenvolvimento (legibilidade humana)

**Quando Logar**:
- Toda requisição HTTP (sucesso ou erro)
- Erros de negócio (level: warn)
- Erros internos (level: error)
- Panics capturados (level: error com stack trace)

**O que NÃO Logar**:
- Senhas
- Tokens (access, refresh, CSRF)
- Dados sensíveis de clientes (CPF, cartão)

---

### 11.7 Recovery (Panic Handler)

**Responsabilidades**:
1. Capturar panics usando defer/recover
2. Logar panic com stack trace completo
3. Retornar 500 Internal Server Error ao cliente
4. Não expor detalhes do panic ao cliente (segurança)

**Logging de Panic**:
- Level: error
- Message: "Panic recovered"
- Fields: stack trace, request details
- Enviar para sistema de monitoramento (se configurado)

---

### 11.8 Request ID

**Geração**:
- Gerar UUID para cada requisição
- Injetar no contexto
- Adicionar header de response: X-Request-ID

**Uso**:
- Incluir em todos os logs
- Útil para rastreamento distribuído
- Cliente pode enviar X-Request-ID no request (opcional)

---

## 12. Storage (MinIO/S3)

### 12.1 Interface Abstrata

**Métodos Necessários**:
- UploadFile(ctx, bucket, key, reader, contentType) → (url, error)
- DeleteFile(ctx, bucket, key) → error
- FileExists(ctx, bucket, key) → (bool, error)
- GeneratePresignedURL(ctx, bucket, key, expiration) → (url, error) [opcional]

**Implementações**:
- MinIOStorage: para desenvolvimento local
- S3Storage: para produção AWS
- Interface permite trocar sem mudar código

---

### 12.2 Estrutura de Buckets/Paths

**Bucket Único**: cava-media

**Organização de Paths**:
- Produtos: `products/{productID}/{timestamp}_{originalFilename}`
- Lotes: `batches/{batchID}/{timestamp}_{originalFilename}`
- Invoices (notas fiscais): `invoices/{saleID}/{filename}`

**Exemplo**:
- `products/123e4567-e89b-12d3-a456-426614174000/1703001234_carrara-white.jpg`
- `batches/789e4567-e89b-12d3-a456-426614174001/1703001234_IMG_20231201.jpg`

---

### 12.3 Validações de Arquivo

**Tipos Permitidos**:
- Imagens: image/jpeg, image/png, image/webp
- Documentos: application/pdf (para invoices)

**Tamanho Máximo**:
- Imagens: 5MB por arquivo
- PDFs: 10MB por arquivo

**Quantidade Máxima**:
- Upload de imagens: 10 arquivos por request

**Validação**:
- Verificar Content-Type do multipart
- Verificar tamanho do arquivo
- Verificar extensão do arquivo (não confiar apenas em Content-Type)
- Rejeitar se não passar nas validações

---

### 12.4 Naming Strategy

**Timestamp + UUID**:
- Formato: `{timestamp}_{uuid}_{sanitizedOriginalName}`
- Timestamp: Unix timestamp (segundos)
- UUID: v4 UUID (evitar colisões)
- SanitizedOriginalName: remover caracteres especiais, espaços, acentos

**Exemplo**:
- Original: `Mármore Carrara - Foto 1.jpg`
- Sanitized: `1703001234_a3f5e2d4-7b8c-4e1a-9f2d-3c6b5a4d8e7f_marmore-carrara-foto-1.jpg`

---

### 12.5 Integração com Banco de Dados

**Fluxo de Upload**:
1. Handler recebe upload (multipart/form-data)
2. Validar arquivo (tipo, tamanho)
3. Chamar StorageService.UploadFile
4. Obter URL pública do arquivo
5. Salvar URL no banco (product_medias ou batch_medias)
6. Retornar sucesso ao cliente

**Fluxo de Deleção**:
1. Handler recebe request de delete
2. Buscar media no banco (obter URL)
3. Extrair key do URL (path do arquivo)
4. Chamar StorageService.DeleteFile
5. Deletar registro do banco
6. Retornar sucesso ao cliente

**Rollback**:
- Se salvamento no banco falhar, deletar arquivo do storage
- Se upload no storage falhar, não salvar no banco

---

### 12.6 Acesso Público vs Privado

**Mídias de Produtos e Lotes**:
- Acesso público (read-only)
- Configurar bucket policy para permitir GetObject público
- URLs acessíveis diretamente (sem autenticação)

**Invoices**:
- Acesso privado (apenas autenticado)
- Gerar presigned URL com expiração (ex: 1 hora)
- Validar permissão antes de gerar URL

---

## 13. Migrations

### 13.1 Estratégia de Versionamento

**Ferramenta**: golang-migrate/migrate ou similar

**Naming Convention**:
- Formato: `NNNNNN_description.up.sql` e `NNNNNN_description.down.sql`
- NNNNNN: número sequencial de 6 dígitos (000001, 000002, etc)
- description: snake_case, curto e descritivo
- Sempre criar pares (up e down)

**Exemplo**:
- `000001_create_extensions.up.sql`
- `000001_create_extensions.down.sql`

---

### 13.2 Ordem de Execução

Seguir ordem de dependências:

1. **000001_create_extensions**: CREATE EXTENSION IF NOT EXISTS "pgcrypto"
2. **000002_create_enums**: todos os ENUMs (user_role_type, batch_status_type, etc)
3. **000003_create_industries**: tabela industries
4. **000004_create_users**: tabela users (depende de industries e enums)
5. **000005_create_products**: tabela products (depende de industries)
6. **000006_create_product_medias**: tabela product_medias (depende de products)
7. **000007_create_batches**: tabela batches (depende de products)
8. **000008_create_batch_medias**: tabela batch_medias (depende de batches)
9. **000009_create_shared_inventory**: tabelas de compartilhamento (dependem de users e batches)
10. **000010_create_sales_links**: tabela sales_links (depende de users, batches, products)
11. **000011_create_leads**: tabelas de leads (dependem de sales_links)
12. **000012_create_reservations**: tabela reservations (depende de batches, users, leads)
13. **000013_create_sales_history**: tabela sales_history (depende de várias tabelas)
14. **000014_create_indexes**: índices adicionais para performance
15. **000015_seed_initial_data**: dados iniciais (opcional)

---

### 13.3 Índices Adicionais

Além dos índices definidos no DDL base, criar:

**Performance de Queries**:
- `CREATE INDEX idx_products_industry_active ON products(industry_id) WHERE deleted_at IS NULL;`
- `CREATE INDEX idx_batches_product_status ON batches(product_id, status) WHERE is_active = true;`
- `CREATE INDEX idx_sales_links_created_by ON sales_links(created_by_user_id) WHERE is_active = true;`
- `CREATE INDEX idx_leads_link_created ON leads(sales_link_id, created_at DESC);`
- `CREATE INDEX idx_reservations_expires ON reservations(expires_at) WHERE status = 'ATIVA';`
- `CREATE INDEX idx_sales_history_date ON sales_history(industry_id, sold_at DESC);`
- `CREATE INDEX idx_shared_inventory_broker ON shared_inventory_batches(broker_user_id) WHERE is_active = true;`

---

### 13.4 Seeds de Dados

**Dados Iniciais para Desenvolvimento**:

**Indústria Demo**:
- Nome: "Pedras Demo"
- CNPJ: "00.000.000/0001-00"
- Slug: "pedras-demo"
- Email: "contato@pedrasdemo.com"

**Usuário Admin Padrão**:
- Nome: "Admin Demo"
- Email: "admin@pedrasdemo.com"
- Senha: "Admin@123" (DEVE ser trocada no primeiro login)
- Role: ADMIN_INDUSTRIA
- IndustryID: ID da indústria demo

**Usuário Vendedor Demo**:
- Nome: "Vendedor Demo"
- Email: "vendedor@pedrasdemo.com"
- Senha: "Vendedor@123"
- Role: VENDEDOR_INTERNO
- IndustryID: ID da indústria demo

**Usuário Broker Demo**:
- Nome: "Broker Demo"
- Email: "broker@example.com"
- Senha: "Broker@123"
- Role: BROKER
- IndustryID: NULL (broker freelancer)

**Produtos Demo** (3-5 produtos):
- Mármore Carrara
- Granito Preto São Gabriel
- Quartzito Azul Macaubas
- Com mídias de exemplo (URLs placeholder)

**Lotes Demo** (5-10 lotes):
- Variados status (DISPONIVEL, RESERVADO, VENDIDO)
- Associados aos produtos demo
- Com códigos no formato AAA-NNNNNN

**IMPORTANTE**: Seeds apenas em desenvolvimento. Em produção, não executar seeds automáticos.

---

### 13.5 Rollback Strategy

**Up Migration**:
- Executada automaticamente (se AUTO_MIGRATE=true)
- Ou manualmente via CLI de migration

**Down Migration**:
- NUNCA executar automaticamente
- Sempre executar manualmente após análise
- Documentar impacto de cada down (perda de dados, etc)

**Estratégia de Rollback**:
1. Identificar migration problemática
2. Analisar down migration correspondente
3. Verificar se há perda de dados
4. Fazer backup do banco antes de rollback
5. Executar down migration manualmente
6. Validar estado do banco
7. Corrigir migration e re-executar up

**Rollback em Produção**:
- Preferir "forward fix" (nova migration corretiva) ao invés de rollback
- Rollback apenas em casos críticos
- Sempre fazer backup antes
- Ter plano de comunicação com time e usuários

---

## 14. Bibliotecas Go Recomendadas

### 14.1 Router HTTP

**Recomendação**: `github.com/go-chi/chi/v5`

**Justificativa**:
- Stdlib-compatible (net/http)
- Middleware support nativo
- Routing por método e path
- Path parameters simples
- Sub-routers para organização
- Leve e rápido
- Boa documentação

**Alternativa**: `github.com/labstack/echo/v4` (mais features, mais opinado)

---

### 14.2 Database

**Driver**: `github.com/lib/pq`

**Justificativa**:
- Driver puro Go para PostgreSQL
- Bem mantido e estável
- Suporta todas as features necessárias

**Query Builder** (Opcional): `github.com/Masterminds/squirrel`

**Justificativa**:
- Facilita construção de queries dinâmicas (filtros)
- Evita concatenação de strings SQL
- Type-safe
- Não é ORM (mantém controle sobre SQL)

**Alternativa**: SQL puro com strings (mais explícito, menos mágica)

---

### 14.3 JWT

**Recomendação**: `github.com/golang-jwt/jwt/v5`

**Justificativa**:
- Biblioteca padrão de facto para JWT em Go
- Suporta múltiplos algoritmos (usar HS256)
- API simples e clara
- Bem mantida

---

### 14.4 Password Hashing

**Recomendação**: `golang.org/x/crypto/argon2`

**Justificativa**:
- Argon2id é recomendado sobre bcrypt (mais resistente a ataques)
- Parte do golang.org/x/crypto (oficial)
- Parametrizável (memory, iterations, parallelism)

**Parâmetros Recomendados**:
- Memory: 64 MB
- Iterations: 3
- Parallelism: 2
- Salt: 16 bytes
- Key length: 32 bytes

---

### 14.5 Validation

**Recomendação**: `github.com/go-playground/validator/v10`

**Justificativa**:
- Validação declarativa via tags
- Suporta validações customizadas
- Validação de structs aninhados
- Mensagens de erro customizáveis
- Amplamente usado na comunidade

---

### 14.6 Storage SDK

**MinIO**: `github.com/minio/minio-go/v7`

**AWS S3**: `github.com/aws/aws-sdk-go-v2/service/s3`

**Justificativa**:
- SDKs oficiais
- MinIO SDK é S3-compatible (facilita transição)
- Suportam todas as operações necessárias
- Bem documentados

---

### 14.7 Migration Tool

**Recomendação**: `github.com/golang-migrate/migrate/v4`

**Justificativa**:
- Ferramenta padrão para migrations em Go
- Suporta múltiplos bancos
- CLI e biblioteca Go
- Up/down migrations
- Versionamento automático

---

### 14.8 Environment Variables

**Recomendação**: `github.com/joho/godotenv`

**Justificativa**:
- Carrega .env em desenvolvimento
- Simples e leve
- Não interfere com env vars do sistema

**Alternativa**: Stdlib `os.Getenv` (suficiente se não usar .env)

---

### 14.9 Logger

**Recomendação**: `go.uber.org/zap`

**Justificativa**:
- Extremamente rápido
- Structured logging (JSON ou console)
- Levels (debug, info, warn, error)
- Zero allocations em hot path
- Usado em produção por grandes empresas

**Alternativa**: `github.com/rs/zerolog` (similar, também muito bom)

---

### 14.10 CORS

**Recomendação**: `github.com/go-chi/cors`

**Justificativa**:
- Integra nativamente com chi router
- Configuração simples
- Suporta credentials
- Preflight handling

**Alternativa**: `github.com/rs/cors` (standalone, funciona com qualquer router)

---

### 14.11 Rate Limiting

**Recomendação**: `golang.org/x/time/rate`

**Justificativa**:
- Stdlib oficial (x/time)
- Implementa token bucket
- Simples e eficiente
- Não requer dependências externas

---

### 14.13 Utilitários

**UUID**: `github.com/google/uuid`

**Slugify**: `github.com/gosimple/slug`

**Decimal (Money)**: `github.com/shopspring/decimal`

**Sanitize**: `github.com/microcosm-cc/bluemonday` (HTML sanitization se necessário)

---

## 15. Fluxos Críticos

### 15.1 Autenticação Completa

**1. Login**:

Requisição:
- POST /api/auth/login
- Body: { email, password }
- Headers: Content-Type: application/json

Backend:
1. Handler valida input (email format, password não vazio)
2. Chama AuthService.Login(email, password)
3. Service busca usuário por email via UserRepository
4. Se não encontrado → UnauthorizedError
5. Service verifica hash da senha usando pkg/password.Verify(password, user.PasswordHash, pepper)
6. Se senha incorreta → UnauthorizedError
7. Service gera access token JWT (15min) via pkg/jwt.GenerateAccessToken(userID, role, industryID)
8. Service gera refresh token JWT (7 dias) via pkg/jwt.GenerateRefreshToken(userID)
9. Service salva refresh token no banco (tabela user_sessions) com expiração
10. Handler seta cookies:
    - access_token: HTTP-only, Secure (prod), SameSite=Strict, Max-Age=15min
    - refresh_token: HTTP-only, Secure (prod), SameSite=Strict, Max-Age=7days
    - csrf_token: HTTP-only=false, Secure (prod), SameSite=Strict
11. Handler retorna 200 com { user, role }

**2. Requisição Autenticada**:

Requisição:
- GET/POST/PUT/PATCH/DELETE /api/protected-route
- Headers: Authorization: Bearer <access_token>, X-CSRF-Token: <csrf_token> (se mutating)
- Cookies: access_token, csrf_token

Backend:
1. Auth middleware extrai access_token do cookie (prioridade) ou header Authorization
2. Middleware valida token via pkg/jwt.ValidateToken(token, secret)
3. Se inválido ou expirado → 401 Unauthorized
4. Middleware extrai claims (userID, role, industryID)
5. Middleware injeta no contexto da requisição
6. RBAC middleware (se aplicável) verifica role contra roles permitidas
7. Se não autorizado → 403 Forbidden
8. CSRF middleware (se POST/PUT/PATCH/DELETE) valida X-CSRF-Token contra csrf_token cookie
9. Se inválido → 419
10. Handler processa requisição normalmente

**3. Refresh Token**:

Requisição:
- POST /api/auth/refresh
- Cookies: refresh_token

Backend:
1. Handler extrai refresh_token do cookie
2. Se ausente → 401 Unauthorized
3. Chama AuthService.RefreshToken(refreshToken)
4. Service valida refresh token via pkg/jwt.ValidateToken
5. Service verifica se refresh token existe no banco e não expirou
6. Se inválido → 401 Unauthorized
7. Service extrai userID do token
8. Service busca usuário via UserRepository
9. Service gera novo access token (15min)
10. Service gera novo refresh token (7 dias) - ROTAÇÃO
11. Service atualiza refresh token no banco (invalida anterior)
12. Handler seta novo access_token cookie
13. Handler seta novo refresh_token cookie
14. Handler retorna 200 com { user }

**4. Logout**:

Requisição:
- POST /api/auth/logout
- Cookies: refresh_token

Backend:
1. Handler extrai refresh_token do cookie (opcional)
2. Se presente, chama AuthService.Logout(refreshToken)
3. Service invalida refresh token no banco (soft delete ou flag)
4. Handler limpa cookies (Max-Age=-1):
    - access_token
    - refresh_token
    - csrf_token
5. Handler retorna 200 com { success: true }

---

### 15.2 Reserva de Lote

**Requisição**:
- POST /api/reservations
- Body: { batchId, leadId?, customerName?, customerContact?, expiresAt, notes? }
- Headers: Authorization, X-CSRF-Token

**Backend**:

1. **Handler Layer**:
   - Valida input (batchId obrigatório, expiresAt futuro)
   - Extrai userID do contexto (usuário autenticado)
   - Chama ReservationService.CreateReservation(input, userID)

2. **Service Layer**:
   - Valida regra de negócio:
     - Se leadId fornecido, verifica que lead existe
     - Se customerName/Contact fornecidos sem leadId, cria lead automaticamente
     - Valida expiresAt é futuro
   - Inicia transação no banco

3. **Repository Layer (em transação)**:
   - BatchRepository.FindByIDForUpdate(batchID) - SELECT FOR UPDATE
   - Verifica status = DISPONIVEL e is_active = true
   - Se não disponível → rollback e return BatchNotAvailableError
   - BatchRepository.UpdateStatus(batchID, "RESERVADO")
   - ReservationRepository.Create(reservation)
   - Commit transação

4. **Handler Layer**:
   - Mapeia sucesso → 201 Created
   - Mapeia BatchNotAvailableError → 400
   - Mapeia outros erros → 500
   - Retorna reservation criada

**Race Condition Prevention**:
- SELECT FOR UPDATE garante lock pessimista
- Apenas uma transação consegue reservar o lote por vez
- Outras transações aguardam ou timeout

---

### 15.3 Criação de Link de Venda

**Requisição**:
- POST /api/sales-links
- Body: { linkType, batchId?, productId?, title?, customMessage?, slugToken, displayPrice?, showPrice, expiresAt?, isActive }
- Headers: Authorization, X-CSRF-Token

**Backend**:

1. **Handler Layer**:
   - Valida input estrutural (slugToken formato correto, campos obrigatórios)
   - Extrai userID e industryID do contexto
   - Chama SalesLinkService.CreateSalesLink(input, userID, industryID)

2. **Service Layer - Validações de Negócio**:
   - Valida linkType vs batchId/productId:
     - LOTE_UNICO: batchId obrigatório, productId null
     - PRODUTO_GERAL: productId obrigatório, batchId null
     - CATALOGO_COMPLETO: ambos null
   - Valida que slugToken é único via SalesLinkRepository.ExistsBySlug(slug)
   - Se slug existe → ConflictError
   - Se batchId fornecido, valida que lote existe e pertence à indústria
   - Se productId fornecido, valida que produto existe e pertence à indústria
   - Valida expiresAt é futuro (se fornecido)
   - Valida displayPrice é positivo (se fornecido)

3. **Repository Layer**:
   - SalesLinkRepository.Create(salesLink)
   - Retorna link criado com ID

4. **Service Layer - Pós-Criação**:
   - Gera URL completa: PUBLIC_LINK_BASE_URL + "/" + slugToken
   - Retorna link com fullUrl populado

5. **Handler Layer**:
   - Mapeia sucesso → 201 Created
   - Mapeia ConflictError → 409
   - Mapeia ValidationError → 400
   - Retorna { id, fullUrl }

**Landing Page Pública**:

Requisição:
- GET /api/public/links/{slug}
- Sem autenticação

Backend:
1. Handler extrai slug do path param
2. Chama SalesLinkService.GetPublicLink(slug)
3. Service busca link via SalesLinkRepository.FindBySlug(slug)
4. Se não encontrado ou inactive → NotFoundError
5. Se expirado (expiresAt < NOW()) → NotFoundError
6. Service incrementa viewsCount atomicamente via Repository.IncrementViews(linkID)
7. Service popula relações (batch com product e medias, ou product com medias)
8. Handler retorna 200 com salesLink completo

---

### 15.4 Captura de Lead

**Requisição**:
- POST /api/public/leads/interest
- Body: { salesLinkId, name, contact, message?, marketingOptIn }
- Sem autenticação (público)

**Backend**:

1. **Handler Layer**:
   - Valida input (name, contact obrigatórios, contact formato email ou phone)
   - Chama LeadService.CaptureInterest(input)

2. **Service Layer**:
   - Valida que salesLinkId existe via SalesLinkRepository.FindByID
   - Se não encontrado → NotFoundError
   - Verifica se lead já existe por email/phone via LeadRepository.FindByContact(contact)
   - Inicia transação

3. **Repository Layer (em transação)**:
   - Se lead não existe: LeadRepository.Create(lead)
   - Se lead existe: atualizar last_interaction = NOW()
   - LeadInteractionRepository.Create(interaction) com:
     - leadID
     - salesLinkID
     - message (se fornecido)
     - interaction_type: inferir do linkType (INTERESSE_LOTE, INTERESSE_CATALOGO, etc)
     - target_batch_id ou target_product_id (se aplicável)
   - Commit transação

4. **Handler Layer**:
   - Mapeia sucesso → 201 Created
   - Retorna { success: true }

**Notificação** (assíncrono, opcional):
- Enviar email para vendedor dono do link
- Enviar notificação in-app (se implementado)

---

### 15.5 Confirmação de Venda

**Requisição**:
- POST /api/reservations/{id}/confirm-sale
- Body: { finalSoldPrice, invoiceUrl?, notes? }
- Headers: Authorization, X-CSRF-Token

**Backend**:

1. **Handler Layer**:
   - Valida input (finalSoldPrice obrigatório e positivo)
   - Extrai userID do contexto
   - Chama ReservationService.ConfirmSale(reservationID, input, userID)

2. **Service Layer - Validações**:
   - Busca reserva via ReservationRepository.FindByID
   - Verifica que reserva existe e está ativa
   - Busca batch associado
   - Calcula comissão e net value:
     - brokerCommission = finalSoldPrice - batch.industryPrice
     - Valida finalSoldPrice >= batch.industryPrice
     - netIndustryValue = batch.industryPrice
   - Inicia transação

3. **Repository Layer (em transação)**:
   - SalesHistoryRepository.Create(sale) com:
     - batchID
     - soldByUserID (do contexto)
     - industryID (da reserva/batch)
     - leadID (da reserva, se houver)
     - finalSoldPrice
     - brokerCommission
     - netIndustryValue
     - invoiceUrl (se fornecido)
     - notes
     - sold_at = NOW()
   - BatchRepository.UpdateStatus(batchID, "VENDIDO")
   - ReservationRepository.UpdateStatus(reservationID, "CONFIRMADA_VENDA")
   - Commit transação

4. **Handler Layer**:
   - Mapeia sucesso → 200 OK
   - Retorna sale criada

---

### 15.6 Job de Expiração de Reservas

**Execução**: Cron job rodando a cada hora (ou intervalo configurável)

**Lógica**:

1. **Scheduler** (pode ser package externo ou goroutine simples):
   - Rodar a cada 1 hora
   - Chamar ReservationService.ExpireReservations()

2. **Service Layer**:
   - Busca reservas expiradas via ReservationRepository.FindExpired()
   - Query: WHERE status = 'ATIVA' AND expires_at < NOW()
   - Para cada reserva:
     - Inicia transação
     - ReservationRepository.UpdateStatus(reservationID, "EXPIRADA")
     - BatchRepository.UpdateStatus(batchID, "DISPONIVEL")
     - Commit transação
   - Retorna quantidade de reservas expiradas

3. **Logging**:
   - Logar quantidade de reservas expiradas
   - Logar erros se alguma falhar

**Implementação**:
- Usar `github.com/robfig/cron/v3` para scheduler
- Ou usar Kubernetes CronJob em produção
- Ou usar AWS EventBridge + Lambda

---

### 15.7 Upload de Mídia

**Requisição**:
- POST /api/upload/product-medias
- Content-Type: multipart/form-data
- Form field: "medias" (múltiplos arquivos)
- Headers: Authorization, X-CSRF-Token

**Backend**:

1. **Handler Layer**:
   - Parse multipart form (limite 10 arquivos, 5MB cada)
   - Para cada arquivo:
     - Validar Content-Type (image/jpeg, image/png, image/webp)
     - Validar tamanho <= 5MB
   - Se validação falhar → 400 Bad Request
   - Chama StorageService.UploadMultiple(files)

2. **Storage Service**:
   - Para cada arquivo:
     - Gerar key único: `products/{uuid}/{timestamp}_{sanitized_filename}`
     - Upload para bucket via MinIO/S3 client
     - Obter URL pública
   - Retorna lista de URLs

3. **Handler Layer**:
   - Retorna 201 com { urls: [...] }
   - Frontend usa URLs para salvar em product_medias ao criar/editar produto

**Fluxo Completo com Produto**:
1. Frontend faz upload de imagens → recebe URLs
2. Frontend cria produto com { name, material, finish, ..., medias: [{ url, displayOrder, isCover }] }
3. Backend cria produto e product_medias em transação

---

### 15.8 Dashboard Metrics

**Requisição**:
- GET /api/dashboard/metrics (para ADMIN_INDUSTRIA, VENDEDOR_INTERNO)
- GET /api/broker/dashboard/metrics (para BROKER)
- Headers: Authorization

**Backend Admin/Vendedor**:

1. **Handler Layer**:
   - Extrai industryID do contexto
   - Chama DashboardService.GetIndustryMetrics(industryID)

2. **Service Layer**:
   - Executa queries em paralelo (goroutines):
     - BatchRepository.CountByStatus(industryID, "DISPONIVEL") → availableBatches
     - BatchRepository.CountByStatus(industryID, "RESERVADO") → reservedBatches
     - SalesHistoryRepository.SumMonthlySales(industryID, currentMonth) → monthlySales
     - SalesLinkRepository.CountActive(industryID) → activeLinks
     - LeadRepository.CountByIndustry(industryID) → leadsCount
   - Aguarda todas as queries completarem (sync.WaitGroup ou channels)
   - Retorna métricas

3. **Handler Layer**:
   - Retorna 200 com métricas

**Backend Broker**:

1. **Handler Layer**:
   - Extrai userID do contexto (broker)
   - Chama DashboardService.GetBrokerMetrics(brokerID)

2. **Service Layer**:
   - Executa queries em paralelo:
     - SharedInventoryRepository.CountSharedBatches(brokerID, status="DISPONIVEL") → availableBatches
     - SalesHistoryRepository.SumMonthlySales(brokerID, currentMonth) → monthlySales
     - SalesHistoryRepository.SumMonthlyCommission(brokerID, currentMonth) → monthlyCommission
     - SalesLinkRepository.CountActive(brokerID) → activeLinks
   - Retorna métricas

3. **Handler Layer**:
   - Retorna 200 com métricas

---

## 16. Considerações Finais

### 16.1 Segurança

**Princípios**:
- Defense in depth: múltiplas camadas de validação e proteção
- Least privilege: usuários só acessam o que precisam
- Fail securely: erros não devem expor informações sensíveis
- Audit logging: logar ações críticas para auditoria

---

### 16.5 Deployment

**Processo Recomendado**:
1. Build imagem Docker
2. Push para registry (Docker Hub, ECR, etc)
3. Executar migrations (job separado, não na aplicação)
4. Deploy nova versão da aplicação (rolling update)
5. Health check antes de rotear tráfego
6. Rollback automático se health check falhar

**Environment-specific**:
- Desenvolvimento: Docker Compose local
- Staging: ECS/EKS ou similar com configuração próxima de produção
- Produção: ECS/EKS com RDS e S3 gerenciados

---

### 16.6 Próximos Passos Pós-MVP

**Features**:
- Notificações (email, in-app)
- Webhooks para integrações externas
- Relatórios avançados (exportação Excel/PDF)
- Bulk operations (upload múltiplos lotes via CSV)
- Full-text search (PostgreSQL FTS ou Elasticsearch)

**Melhorias Técnicas**:
- Cache layer (Redis para queries frequentes)
- Job queue (background jobs assíncronos)
- WebSockets (notificações real-time)
- GraphQL API (alternativa a REST)