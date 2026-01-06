import type { ApiResponse, ErrorResponse, PaginatedResponse } from '@/lib/types/api';

interface RequestConfig extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

class ApiClient {
  private baseURL: string;
  private isRefreshing: boolean = false;
  private failedQueue: Array<{
    resolve: (value?: unknown) => void;
    reject: (reason?: unknown) => void;
  }> = [];

  constructor(baseURL: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api') {
    this.baseURL = baseURL;
  }

  private processQueue(error: Error | null, token: string | null = null) {
    this.failedQueue.forEach(prom => {
      if (error) {
        prom.reject(error);
      } else {
        prom.resolve(token);
      }
    });
    this.failedQueue = [];
  }

  private async refreshToken(): Promise<void> {
    if (this.isRefreshing) {
      return new Promise((resolve, reject) => {
        this.failedQueue.push({ resolve, reject });
      });
    }

    this.isRefreshing = true;

    try {
      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }

      this.processQueue(null);
      this.isRefreshing = false;
    } catch (error) {
      this.processQueue(error as Error);
      this.isRefreshing = false;
      
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname;
        if (!currentPath.startsWith('/login')) {
          window.location.href = `/login?callbackUrl=${encodeURIComponent(currentPath)}`;
        }
      }
      
      throw error;
    }
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

  private async request<T>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<T> {
    const { params, ...fetchConfig } = config;
    const url = this.buildURL(endpoint, params);

    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
    };

    const requestConfig: RequestInit = {
      ...fetchConfig,
      headers: {
        ...defaultHeaders,
        ...fetchConfig.headers,
      },
      credentials: 'include',
    };

    try {
      const response = await fetch(url, requestConfig);

      if (response.status === 401) {
        await this.refreshToken();
        
        const retryResponse = await fetch(url, requestConfig);
        
        if (!retryResponse.ok) {
          const errorData: ErrorResponse = await retryResponse.json();
          throw new Error(errorData.error.message || 'Request failed');
        }
        
        return retryResponse.json();
      }

      if (!response.ok) {
        const errorData: ErrorResponse = await response.json();
        throw new Error(errorData.error.message || 'Request failed');
      }

      const data: ApiResponse<T> = await response.json();
      return data.data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred');
    }
  }

  async get<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'GET',
    });
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
    return this.request<T>(endpoint, {
      ...config,
      method: 'DELETE',
    });
  }

  async upload<T>(
    endpoint: string,
    formData: FormData,
    config?: Omit<RequestConfig, 'body'>
  ): Promise<T> {
    const url = this.buildURL(endpoint, config?.params);

    const requestConfig: RequestInit = {
      method: 'POST',
      body: formData,
      credentials: 'include',
      headers: config?.headers,
    };

    try {
      const response = await fetch(url, requestConfig);

      if (response.status === 401) {
        await this.refreshToken();
        const retryResponse = await fetch(url, requestConfig);
        
        if (!retryResponse.ok) {
          const errorData: ErrorResponse = await retryResponse.json();
          throw new Error(errorData.error.message || 'Upload failed');
        }
        
        return retryResponse.json();
      }

      if (!response.ok) {
        const errorData: ErrorResponse = await response.json();
        throw new Error(errorData.error.message || 'Upload failed');
      }

      const data: ApiResponse<T> = await response.json();
      return data.data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Upload failed');
    }
  }
}

export const apiClient = new ApiClient();

export type { ApiResponse, ErrorResponse, PaginatedResponse };