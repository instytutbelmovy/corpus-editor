import { ApiClient } from '@/app/apiClient';

export interface FrontendConfig {
  recaptchaSiteKey: string;
}

class ConfigService {
  private config: FrontendConfig | null = null;
  private configPromise: Promise<FrontendConfig> | null = null;
  private lastApiClient: ApiClient | null = null;

  async getConfig(apiClient: ApiClient): Promise<FrontendConfig> {
    if (this.config) {
      return this.config;
    }

    // Калі змяніўся ApiClient, скідаем кэш
    if (this.lastApiClient !== apiClient) {
      this.configPromise = null;
      this.lastApiClient = apiClient;
    }

    if (!this.configPromise) {
      this.configPromise = this.loadConfig(apiClient);
    }

    const result = await this.configPromise;
    this.config = result;
    return result;
  }

  private async loadConfig(apiClient: ApiClient): Promise<FrontendConfig> {
    try {
      const response = await apiClient.get<{ recaptchaSiteKey: string }>('/auth/config');
      
      if (response.data) {
        return {
          recaptchaSiteKey: response.data.recaptchaSiteKey
        };
      }
      
      throw new Error('Не ўдалося загрузіць налады');
    } catch (error) {
      console.error('Памылка загрузкі наладаў:', error);
      // Fallback да значэння па змаўчанні
      return {
        recaptchaSiteKey: '6Ldcq8ErAAAAAI6JX9kEY8H_AyqHUxgUFBlm4fcH'
      };
    }
  }
}

export const configService = new ConfigService();
