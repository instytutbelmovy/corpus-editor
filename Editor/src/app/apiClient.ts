import { AuthStorage } from './auth/storage';

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  status: number;
}

export class ApiClient {
  private baseUrl: string;
  private onUnauthorized: () => void;

  constructor(onUnauthorized: () => void) {
    this.baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    this.onUnauthorized = onUnauthorized;
  }

  private buildUrl(url: string): string {
    return `${this.baseUrl}/api${url}`;
  }

  private async handleResponse<T>(response: Response, skipUnauthorizedRedirect = false): Promise<ApiResponse<T>> {
    if (response.status === 401) {
      // Ачысціць аўтэнтыфікацыю
      AuthStorage.clear();

      // Перанакіраваць на ўваход толькі калі гэта не праверка аўтэнтыфікацыі
      if (!skipUnauthorizedRedirect) {
        this.onUnauthorized();
      }

      return { status: 401, error: 'Unauthorized' };
    }

    let data: T | undefined;
    let error: string | undefined;

    try {
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        }
      } else {
        try {
          const errorData = await response.json();
          // Праверка розных фарматаў паведамленьняў пра памылкі
          if (errorData.message) {
            error = errorData.message;
          } else if (errorData.error) {
            error = errorData.error;
          } else if (errorData.detail) {
            error = errorData.detail;
          } else {
            error = `HTTP ${response.status}`;
          }
        } catch {
          error = `HTTP ${response.status}`;
        }
      }
    } catch {
      error = 'Памылка апрацоўкі адказу';
    }

    return {
      data,
      error,
      status: response.status
    };
  }

  async get<T>(url: string, options: RequestInit = {}, skipUnauthorizedRedirect = false): Promise<ApiResponse<T>> {
    const fullUrl = this.buildUrl(url);
    const response = await fetch(fullUrl, {
      method: 'GET',
      credentials: 'include',
      ...options
    });

    return this.handleResponse<T>(response, skipUnauthorizedRedirect);
  }

  async post<T>(url: string, body?: unknown, options: RequestInit = {}, skipUnauthorizedRedirect = false): Promise<ApiResponse<T>> {
    const fullUrl = this.buildUrl(url);
    const response = await fetch(fullUrl, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: body ? JSON.stringify(body) : undefined,
      ...options
    });

    return this.handleResponse<T>(response, skipUnauthorizedRedirect);
  }

  async put<T>(url: string, body?: unknown, options: RequestInit = {}, skipUnauthorizedRedirect = false): Promise<ApiResponse<T>> {
    const fullUrl = this.buildUrl(url);
    const response = await fetch(fullUrl, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: body ? JSON.stringify(body) : undefined,
      ...options
    });

    return this.handleResponse<T>(response, skipUnauthorizedRedirect);
  }

  async delete<T>(url: string, options: RequestInit = {}, skipUnauthorizedRedirect = false): Promise<ApiResponse<T>> {
    const fullUrl = this.buildUrl(url);
    const response = await fetch(fullUrl, {
      method: 'DELETE',
      credentials: 'include',
      ...options
    });

    return this.handleResponse<T>(response, skipUnauthorizedRedirect);
  }

  async postFormData<T>(url: string, formData: FormData, options: RequestInit = {}, skipUnauthorizedRedirect = false): Promise<ApiResponse<T>> {
    const fullUrl = this.buildUrl(url);
    const response = await fetch(fullUrl, {
      method: 'POST',
      credentials: 'include',
      body: formData,
      ...options
    });

    return this.handleResponse<T>(response, skipUnauthorizedRedirect);
  }
}
