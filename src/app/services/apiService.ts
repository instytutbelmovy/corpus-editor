import { ApiClient } from '@/app/apiClient';

class ApiService {
  private static instance: ApiClient | null = null;

  static getInstance(): ApiClient {
    if (!this.instance) {
      this.instance = new ApiClient(() => {
        // Пустая функцыя для onUnauthorized, бо для config запытаў гэта не патрэбна
      });
    }
    return this.instance;
  }
}

export const apiService = ApiService.getInstance();
