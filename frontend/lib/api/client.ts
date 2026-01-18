import type { ApiResponse, ErrorResponse, PaginatedResponse } from '@/lib/types/api';

interface RequestConfig extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  timeoutMs?: number;
  skipAuthRetry?: boolean;
}

export class ApiError extends Error {
  status?: number;
  code?: string;

  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type QueueEntry = {
  resolve: () => void;
  reject: (error: Error) => void;
};

class ApiClient {
  private baseURL: string;
  private defaultTimeout = Number(process.env.NEXT_PUBLIC_API_TIMEOUT_MS) || 15000;
  private isRefreshing = false;
  private failedQueue: QueueEntry[] = [];

  constructor() {
    // INTERNAL_API_URL is used for server-side requests (SSR) within the Docker network
    // NEXT_PUBLIC_API_URL / NEXT_PUBLIC_API_BASE is for client-side requests
    this.baseURL =
      process.env.INTERNAL_API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      process.env.NEXT_PUBLIC_API_BASE ||
      'http://localhost:3001/api';
  }

  private processQueue(error: Error | null) {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
    this.failedQueue = [];
  }

  private getCsrfToken(): string | null {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(/(?:^|; )csrf_token=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  }

  /**
   * Garante que o CSRF token existe fazendo uma requisição GET ao backend.
   * Deve ser chamado antes de operações de autenticação (login).
   */
  async ensureCsrfToken(): Promise<void> {
    if (this.getCsrfToken()) return;

    // Fazer uma requisição GET para obter o cookie CSRF
    // Se baseURL for http://localhost/api, isso chama http://localhost/api/health
    // O Nginx reescreve /api/health -> /health no backend
    await fetch(`${this.baseURL}/health`, {
      method: 'GET',
      credentials: 'include',
    });
  }

  private buildURL(endpoint: string, params?: Record<string, string | number | boolean | undefined>): string {
    const url = new URL(endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint}`);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          url.searchParams.append(key, String(value));
        }
      });
    }

    return url.toString();
  }

  private async refreshToken(): Promise<void> {
    if (this.isRefreshing) {
      return new Promise<void>((resolve, reject) => {
        this.failedQueue.push({ resolve, reject });
      });
    }

    this.isRefreshing = true;

    try {
      const csrfToken = this.getCsrfToken();
      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
        },
      });

      if (!response.ok) {
        throw new ApiError('Failed to refresh token', response.status);
      }

      this.processQueue(null);
    } catch (error) {
      this.processQueue(error as Error);

      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname;
        if (!currentPath.startsWith('/login')) {
          window.location.href = `/login?callbackUrl=${encodeURIComponent(currentPath)}`;
        }
      }

      throw error;
    } finally {
      this.isRefreshing = false;
    }
  }

  private withTimeout(timeoutMs: number) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    return { controller, timer };
  }

  private async request<T>(endpoint: string, config: RequestConfig = {}): Promise<T> {
    const { params, timeoutMs = this.defaultTimeout, skipAuthRetry, ...fetchConfig } = config;
    const url = this.buildURL(endpoint, params);
    const csrfToken = this.getCsrfToken();

    // Surface missing CSRF token early for state-changing requests
    const method = (fetchConfig.method || 'GET').toUpperCase();
    const isStateChanging = method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS';
    if (isStateChanging && !csrfToken) {
      throw new ApiError('CSRF token ausente. Recarregue a página para continuar.', 419);
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      ...fetchConfig.headers,
    };

    const { controller, timer } = this.withTimeout(timeoutMs);

    const doFetch = () =>
      fetch(url, {
        ...fetchConfig,
        headers,
        credentials: 'include',
        signal: controller.signal,
      });

    try {
      let response = await doFetch();

      if (response.status === 401 && !skipAuthRetry) {
        await this.refreshToken();
        response = await doFetch();
      }

      if (!response.ok) {
        const contentType = response.headers.get('content-type') || '';
        const isJson = contentType.includes('application/json');
        const errorData: ErrorResponse | undefined = isJson
          ? await response.clone().json().catch(() => undefined)
          : undefined;

        throw new ApiError(
          errorData?.error.message || 'Request failed',
          response.status,
          errorData?.error.code
        );
      }

      const data: ApiResponse<T> = await response.json();
      return data.data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new ApiError('Request timed out', 408, 'NETWORK_TIMEOUT');
      }

      if (error instanceof TypeError && error.message.toLowerCase().includes('fetch')) {
        throw new ApiError('Erro de conexão. Verifique sua internet ou o servidor.', 0, 'NETWORK_ERROR');
      }

      throw new ApiError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      clearTimeout(timer);
    }
  }

  async get<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'GET' });
  }

  async post<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' });
  }

  async upload<T>(endpoint: string, formData: FormData, config?: Omit<RequestConfig, 'body'>): Promise<T> {
    const { params, timeoutMs = Math.max(this.defaultTimeout, 60000), ...fetchConfig } = config || {};
    const url = this.buildURL(endpoint, params);
    const csrfToken = this.getCsrfToken();

    const headers: HeadersInit = {
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      ...fetchConfig.headers,
    };

    const { controller, timer } = this.withTimeout(timeoutMs);

    const doFetch = () =>
      fetch(url, {
        method: 'POST',
        body: formData,
        credentials: 'include',
        headers,
        signal: controller.signal,
        ...fetchConfig,
      });

    try {
      let response = await doFetch();

      if (response.status === 401) {
        await this.refreshToken();
        response = await doFetch();
      }

      if (!response.ok) {
        const errorData: ErrorResponse | undefined = await response
          .clone()
          .json()
          .catch(() => undefined);

        throw new ApiError(
          errorData?.error.message || 'Upload failed',
          response.status,
          errorData?.error.code
        );
      }

      const data: ApiResponse<T> = await response.json();
      return data.data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new ApiError('Upload timed out', 408);
      }

      throw new ApiError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      clearTimeout(timer);
    }
  }
}

export const apiClient = new ApiClient();

export type { ApiResponse, ErrorResponse, PaginatedResponse };