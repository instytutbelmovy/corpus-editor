import { AuthStorage } from './auth/storage';

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  status: number;
}

export interface RequestOptions {
  // Не перанакіроўваць на ўваход пры 401 (для праверкі сэсіі і самога ўваходу)
  skipUnauthorizedRedirect?: boolean;
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

// ApiClient сам не кідае памылак - гэта робяць сэрвісы праз unwrap.
export function unwrap<T>(response: ApiResponse<T>): T {
  if (response.error) {
    throw new Error(response.error);
  }
  return response.data as T;
}

export class ApiClient {
  constructor(private readonly onUnauthorized: () => void) {}

  get<T>(url: string, options?: RequestOptions) {
    return this.request<T>('GET', url, undefined, options);
  }

  post<T>(url: string, body?: unknown, options?: RequestOptions) {
    return this.request<T>('POST', url, body, options);
  }

  put<T>(url: string, body?: unknown, options?: RequestOptions) {
    return this.request<T>('PUT', url, body, options);
  }

  delete<T>(url: string, options?: RequestOptions) {
    return this.request<T>('DELETE', url, undefined, options);
  }

  postFormData<T>(url: string, formData: FormData, options?: RequestOptions) {
    return this.request<T>('POST', url, formData, options);
  }

  private async request<T>(
    method: HttpMethod,
    url: string,
    body: unknown,
    { skipUnauthorizedRedirect = false }: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const isFormData = body instanceof FormData;

    let response: Response;
    try {
      response = await fetch(`/api${url}`, {
        method,
        credentials: 'include',
        headers:
          body != null && !isFormData
            ? { 'Content-Type': 'application/json' }
            : undefined,
        body: isFormData
          ? body
          : body == null
            ? undefined
            : JSON.stringify(body),
      });
    } catch {
      return { status: 0, error: 'Памылка злучэньня з сэрвэрам' };
    }

    if (response.status === 401) {
      AuthStorage.clear();
      if (!skipUnauthorizedRedirect) {
        this.onUnauthorized();
      }
      return { status: 401, error: 'Unauthorized' };
    }

    if (!response.ok) {
      return {
        status: response.status,
        error: await readErrorMessage(response),
      };
    }

    const isJson = response.headers
      .get('content-type')
      ?.includes('application/json');
    try {
      return {
        status: response.status,
        data: isJson ? await response.json() : undefined,
      };
    } catch {
      return { status: response.status, error: 'Памылка апрацоўкі адказу' };
    }
  }
}

// Бэкенд аддае ErrorResponse { code, message }; без цела (напр. 429 ад rate limiter) - код статусу
async function readErrorMessage(response: Response): Promise<string> {
  try {
    const { message } = await response.json();
    if (typeof message === 'string' && message) {
      return message;
    }
  } catch {
    // не JSON
  }
  return `HTTP ${response.status}`;
}
