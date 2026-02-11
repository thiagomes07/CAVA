export type UserRole = "SUPER_ADMIN" | "ADMIN_INDUSTRIA" | "VENDEDOR_INTERNO" | "BROKER";

export type BatchStatus = "DISPONIVEL" | "RESERVADO" | "VENDIDO" | "INATIVO";

export type PriceUnit = "M2" | "FT2";
export type CurrencyCode = "BRL" | "USD";

export type MaterialType =
  | "GRANITO"
  | "MARMORE"
  | "QUARTZITO"
  | "LIMESTONE"
  | "TRAVERTINO"
  | "OUTROS";

export type FinishType =
  | "POLIDO"
  | "LEVIGADO"
  | "BRUTO"
  | "APICOADO"
  | "FLAMEADO";

export type LinkType =
  | "LOTE_UNICO"
  | "PRODUTO_GERAL"
  | "CATALOGO_COMPLETO"
  | "MULTIPLOS_LOTES";

export type ReservationStatus =
  | "ATIVA"
  | "PENDENTE_APROVACAO"
  | "APROVADA"
  | "REJEITADA"
  | "CONFIRMADA_VENDA"
  | "EXPIRADA"
  | "CANCELADA";

export interface User {
  id: string;
  name: string;
  email: string;
  preferredCurrency: CurrencyCode;
  phone?: string;
  whatsapp?: string;
  role: UserRole;
  industryId?: string;
  industrySlug?: string;
  isActive: boolean;
  firstLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BrokerWithStats extends User {
  sharedBatchesCount: number;
}

export interface Industry {
  id: string;
  name: string;
  cnpj: string;
  slug: string;
  contactEmail: string;
  contactPhone?: string;
  whatsapp?: string;
  description?: string;
  logoUrl?: string;
  addressCountry?: string;
  addressState?: string;
  addressCity?: string;
  addressStreet?: string;
  addressNumber?: string;
  addressZipCode?: string;
  policyTerms?: string;
  isActive?: boolean;
  socialLinks?: SocialLink[];
  portfolioDisplaySettings?: PortfolioDisplaySettings;
  createdAt: string;
  updatedAt: string;
}

export interface SocialLink {
  name: string;
  url: string;
}

export interface PortfolioDisplaySettings {
  showName: boolean;
  showDescription: boolean;
  showLogo: boolean;
  showCNPJ: boolean;
  showContact: boolean;
  showLocation: boolean;
  locationLevel: 'none' | 'country' | 'state' | 'city' | 'full';
  isPublished: boolean;
}

export interface Media {
  id: string;
  url: string;
  displayOrder: number;
  isCover: boolean;
  createdAt: string;
}

export interface Product {
  id: string;
  industryId: string;
  name: string;
  sku?: string;
  material: MaterialType;
  finish: FinishType;
  description?: string;
  isPublic: boolean;
  isActive: boolean;
  medias: Media[];
  batchCount?: number;
  basePrice?: number | null;
  priceUnit?: PriceUnit;
  createdAt: string;
  updatedAt: string;
}

export interface Batch {
  id: string;
  productId: string;
  industryId: string;
  batchCode: string;
  height: number;
  width: number;
  thickness: number;
  quantitySlabs: number;
  availableSlabs: number;
  reservedSlabs: number;
  soldSlabs: number;
  inactiveSlabs: number;
  totalArea: number;
  industryPrice: number;
  priceUnit: PriceUnit;
  priceOverride?: boolean;
  slabArea?: number; // Área de uma chapa (calculado: height * width / 10000)
  slabPrice?: number; // Preço por chapa (calculado: industryPrice * slabArea)
  originQuarry?: string;
  entryDate: string;
  status: BatchStatus;
  isActive: boolean;
  isPublic?: boolean;
  medias: Media[];
  product?: Product;
  createdAt: string;
  updatedAt: string;
}

export interface SharedInventoryBatch {
  id: string;
  batchId: string;
  sharedWithUserId: string; // Broker ou Vendedor Interno
  negotiatedPrice?: number;
  negotiatedPriceUnit?: PriceUnit;
  effectivePrice?: number; // Preço efetivo (negociado ou do lote)
  effectiveSlabPrice?: number; // Preço por chapa efetivo (calculado)
  sharedAt: string;
  batch: Batch;
  sharedWith: User; // Broker ou Vendedor Interno
}

export interface SalesLinkItem {
  id: string;
  salesLinkId: string;
  batchId: string;
  quantity: number;
  unitPriceAmount: number;
  currency: CurrencyCode;
  unitPrice: number;
  createdAt: string;
  batch?: Batch;
}

export interface SalesLink {
  id: string;
  createdByUserId: string;
  linkType: LinkType;
  batchId?: string;
  productId?: string;
  title?: string;
  customMessage?: string;
  displayPriceAmount?: number;
  displayCurrency: CurrencyCode;
  slugToken: string;
  displayPrice?: number;
  showPrice: boolean;
  viewsCount: number;
  expiresAt?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  fullUrl?: string;
  batch?: Batch;
  product?: Product;
  createdBy?: User;
  items?: SalesLinkItem[];
}

export interface Cliente {
  id: string;
  salesLinkId: string;
  createdByUserId?: string;
  name: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  message?: string;
  marketingOptIn: boolean;
  createdAt: string;
  updatedAt: string;
  salesLink?: SalesLink;
  contact: string; // Computed field
}

export interface Reservation {
  id: string;
  batchId: string;
  industryId?: string;
  clienteId?: string;
  reservedByUserId: string;
  quantitySlabsReserved: number;
  status: ReservationStatus;
  expiresAt: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  // Campos de preço do broker
  reservedPrice?: number; // Preço indicado pelo broker (visível para admin)
  brokerSoldPrice?: number; // Preço interno do broker (só visível para o broker)
  // Campos de aprovação
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  approvalExpiresAt?: string;
  // Relacionamentos
  batch?: Batch;
  cliente?: Cliente;
  reservedBy?: User;
  approvedByUser?: User;
}

export interface Sale {
  id: string;
  batchId: string;
  soldByUserId?: string;
  sellerName?: string;
  clienteId?: string;
  customerName: string;
  customerContact: string;
  salePrice: number;
  brokerSoldPrice?: number;
  quantitySlabsSold: number;
  totalAreaSold: number;
  pricePerUnit: number;
  priceUnit: PriceUnit;
  brokerCommission?: number;
  netIndustryValue: number;
  saleDate: string;
  invoiceUrl?: string;
  notes?: string;
  createdAt: string;
  batch?: Batch;
  soldBy?: User;
  cliente?: Cliente;
}

export interface DashboardMetrics {
  availableBatches: number;
  monthlySales: number;
  reservedBatches: number;
  activeLinks?: number;
  clientesCount?: number;
  monthlyCommission?: number;
}

export interface Activity {
  id: string;
  batchCode: string;
  productName: string;
  sellerName: string;
  action: "RESERVADO" | "VENDIDO" | "COMPARTILHADO" | "CRIADO";
  date: string;
}

// Tipos para envio de links para clientes
export interface SendLinksInput {
  clienteIds: string[];
  salesLinkIds: string[];
  customMessage?: string;
}

export interface SendLinkResult {
  clienteId: string;
  clienteName: string;
  email: string;
  success: boolean;
  error?: string;
}

export interface SendLinksResponse {
  totalClientes: number;
  totalSent: number;
  totalFailed: number;
  totalSkipped: number;
  results: SendLinkResult[];
  linksIncluded: number;
}

// ====================================
// BI (Business Intelligence) Types
// ====================================

export interface SalesMetrics {
  totalRevenue: number;
  totalCommissions: number;
  netRevenue: number;
  salesCount: number;
  averageTicket: number;
  totalSlabs: number;
  totalArea: number;
  commissionRate: number;
  currency: CurrencyCode;
}

export interface ConversionMetrics {
  totalReservations: number;
  totalApproved: number;
  totalRejected: number;
  totalConverted: number;
  totalExpired: number;
  approvalRate: number;
  conversionRate: number;
  avgHoursToApprove: number;
  avgDaysToConvert: number;
}

export interface InventoryMetrics {
  totalBatches: number;
  totalSlabs: number;
  availableSlabs: number;
  reservedSlabs: number;
  soldSlabs: number;
  inventoryValue: number;
  avgDaysInStock: number;
  lowStockCount: number;
  staleBatchCount: number;
  turnover: number;
  currency: CurrencyCode;
}

export interface BrokerPerformance {
  brokerId: string;
  brokerName: string;
  salesCount: number;
  totalRevenue: number;
  totalCommission: number;
  averageTicket: number;
  approvalRate: number;
  conversionRate: number;
  rank: number;
  currency: CurrencyCode;
}

export interface TrendPoint {
  date: string;
  value: number;
  count: number;
  currency: CurrencyCode;
}

export interface ProductMetric {
  productId: string;
  productName: string;
  material: MaterialType;
  salesCount: number;
  revenue: number;
  slabsSold: number;
  areaSold: number;
  rank?: number;
  currency: CurrencyCode;
}

export interface BIDashboard {
  period: string;
  currency: CurrencyCode;
  exchangeRateUsed?: number;
  sales: SalesMetrics;
  conversion: ConversionMetrics;
  inventory: InventoryMetrics;
  topBrokers: BrokerPerformance[];
  salesTrend: TrendPoint[];
  topProducts: ProductMetric[];
  pendingApprovals: number;
  lastRefresh?: string;
}

export interface BIFilters {
  startDate?: string;
  endDate?: string;
  currency?: CurrencyCode;
  brokerId?: string;
  productId?: string;
  granularity?: "day" | "week" | "month";
  limit?: number;
}

// Input types for reservation approval
export interface ApproveReservationInput {
  reservationId: string;
}

export interface RejectReservationInput {
  reservationId: string;
  reason: string;
}
