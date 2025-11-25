import { ApiClient } from '@/app/apiClient';

export interface FrontendConfig {
  recaptchaSiteKey: string;
  sentryDsn: string;
  environment: string;
  version: string;
}

// Ключ для захавання канфігу ў localStorage
const CONFIG_STORAGE_KEY = 'editor-config';

class ConfigService {
  private config: FrontendConfig | null = null;
  private configPromise: Promise<FrontendConfig> | null = null;

  // Функцыі для працы з localStorage
  private getConfigFromStorage(): FrontendConfig | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as FrontendConfig;
        // Правяраем, ці ёсць усе неабходныя палі
        if (parsed.recaptchaSiteKey && parsed.sentryDsn) {
          return parsed;
        }
      }
    } catch (error) {
      console.error('Памылка чытання канфігу з localStorage:', error);
    }
    
    return null;
  }

  private setConfigToStorage(config: FrontendConfig): void {
    if (typeof window === 'undefined') return;
    
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
  }

  private isConfigComplete(config: FrontendConfig): boolean {
    return !!(config.recaptchaSiteKey && config.sentryDsn && config.environment && config.version);
  }

  private configsAreDifferent(config1: FrontendConfig, config2: FrontendConfig): boolean {
    return config1.recaptchaSiteKey !== config2.recaptchaSiteKey 
           || config1.sentryDsn !== config2.sentryDsn
           || config1.environment !== config2.environment
           //|| config1.version !== config2.version // Вэрсія ня лічыцца дастатковаю прычынаю каб перагружаць старонку
           ;
  }

  async getConfig(apiClient: ApiClient): Promise<FrontendConfig> {

    if (!this.configPromise) {
      this.configPromise = this.loadConfig(apiClient);
    }

    if (this.config) {
      return this.config;
    }

    const cachedConfig = this.getConfigFromStorage();
    if (cachedConfig && this.isConfigComplete(cachedConfig)) {
      this.config = cachedConfig;
      return cachedConfig;
    }

    return await this.configPromise;
  }

  private async loadConfig(apiClient: ApiClient): Promise<FrontendConfig> {
    try {
      const response = await apiClient.get<{ recaptchaSiteKey: string; sentryDsn: string; environment: string; version: string }>('/auth/config');
      if (!response.data) {
        throw new Error('Сэрвер не аддаў канфіг о_О');
      }

      const reseivedConfig = {
        recaptchaSiteKey: response.data.recaptchaSiteKey,
        sentryDsn: response.data.sentryDsn,
        environment: response.data.environment,
        version: response.data.version
      };

      const cachedConfig = this.getConfigFromStorage();
      this.setConfigToStorage(reseivedConfig);
      if (cachedConfig && this.isConfigComplete(cachedConfig) && this.configsAreDifferent(cachedConfig, reseivedConfig)) {
        console.log('Канфіг змяніўся, захоўваем і перагружаем старонку');

        // Перагружаем старонку бо мы ўжо збрахалі іншым кампанэнтам які насамрэч ёсьць канфіг
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      }

      this.config = reseivedConfig;
      return reseivedConfig;
    } catch (error) {
      console.error('Памылка загрузкі канфігу:', error);
      // Fallback да значэньняў па змаўчанні, канфігурацыя з проду. Таму што так я імаверней пачну разьбірацца што пайло ня так
      return {
        recaptchaSiteKey: '6LccmsUrAAAAABoGBBMbOdJWENmowzmY66pEQaME',
        sentryDsn: 'https://659ec7317863b18f497a2ec253dad619@o4509997938638848.ingest.de.sentry.io/4509998009876560',
        environment: 'production',
        version: '0.0.42'
      };
    }
  }
}

export const configService = new ConfigService();
