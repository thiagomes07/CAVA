export type UserRole = 'ADMIN_INDUSTRIA' | 'BROKER' | 'VENDEDOR_INTERNO';

export type BatchStatus = 'DISPONIVEL' | 'RESERVADO' | 'VENDIDO' | 'INATIVO';

export type PriceUnit = 'M2' | 'FT2';

export type MaterialType = 
  | 'GRANITO' 
  | 'MARMORE' 
  | 'QUARTZITO' 
  | 'LIMESTONE' 
  | 'TRAVERTINO' 
  | 'OUTROS';

export type FinishType = 
  | 'POLIDO' 
  | 'LEVIGADO' 
  | 'BRUTO' 
  | 'APICOADO' 
  | 'FLAMEADO';

export type LinkType = 'LOTE_UNICO' | 'PRODUTO_GERAL' | 'CATALOGO_COMPLETO';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  industryId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Industry {
  id: string;
  name: string;
  cnpj?: string;
  email?: string;
  phone?: string;
  address?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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
  originQuarry?: string;
  entryDate: string;
  status: BatchStatus;
  isActive: boolean;
  medias: Media[];
  product?: Product;
  createdAt: string;
  updatedAt: string;
}

export interface SharedInventoryBatch {
  id: string;
  batchId: string;
  brokerUserId: string;
  negotiatedPrice?: number;
  negotiatedPriceUnit?: PriceUnit;
  sharedAt: string;
  batch: Batch;
  broker: User;
}

export interface SalesLink {
  id: string;
  createdByUserId: string;
  linkType: LinkType;
  batchId?: string;
  productId?: string;
  title?: string;
  customMessage?: string;
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
}

export interface Cliente {
  id: string;
  salesLinkId: string;
  name: string;
  contact: string;
  message?: string;
  marketingOptIn: boolean;
  status: 'NOVO' | 'CONTATADO' | 'RESOLVIDO';
  createdAt: string;
  updatedAt: string;
  salesLink?: SalesLink;
}

export interface Reservation {
  id: string;
  batchId: string;
  clienteId?: string;
  reservedByUserId: string;
  quantitySlabsReserved: number;
  expiresAt: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  batch?: Batch;
  cliente?: Cliente;
  reservedBy?: User;
}

export interface Sale {
  id: string;
  batchId: string;
  soldByUserId: string;
  clienteId?: string;
  customerName: string;
  customerContact: string;
  salePrice: number;
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
  action: 'RESERVADO' | 'VENDIDO' | 'COMPARTILHADO' | 'CRIADO';
  date: string;
}