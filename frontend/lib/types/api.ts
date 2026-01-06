export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  success: false;
}

export type ApiResult<T> = ApiResponse<T> | ErrorResponse;

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface FilterParams {
  search?: string;
  status?: string;
  productId?: string;
  batchId?: string;
  linkId?: string;
  startDate?: string;
  endDate?: string;
  material?: string;
  includeInactive?: boolean;
  optIn?: boolean;
}

export type QueryParams = PaginationParams & FilterParams;