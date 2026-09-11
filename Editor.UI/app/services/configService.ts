import { serviceLocator } from './serviceLocator';

export interface FrontendConfig {
  turnstileSiteKey: string;
  sentryDsn: string;
  environment: string;
  version: string;
  googleSignInEnabled: boolean;
  stanzaEnabled: boolean;
}

// Ключ для захаваньня канфігу ў localStorage
const CONFIG_STORAGE_KEY = 'editor-config';

// Канфіг з проду як fallback: так імаверней заўважу, што нешта пайшло ня так
const FALLBACK_CONFIG: FrontendConfig = {
  turnstileSiteKey: '',
  sentryDsn:
    'https://659ec7317863b18f497a2ec253dad619@o4509997938638848.ingest.de.sentry.io/4509998009876560',
  environment: 'production',
  version: '0.0.42',
  googleSignInEnabled: false,
  stanzaEnabled: false,
};

class ConfigService {
  private config: FrontendConfig | null = null;
  private configPromise: Promise<FrontendConfig> | null = null;

  // Аддае кэшаваны канфіг адразу (каб не чакаць сэрвэр), але заўсёды запытвае свежы
  // і перагружае старонку, калі ён зьмяніўся
  async getConfig(): Promise<FrontendConfig> {
    if (!this.configPromise) {
      this.configPromise = this.loadConfig();
    }

    if (this.config) {
      return this.config;
    }

    const cachedConfig = this.getConfigFromStorage();
    if (cachedConfig) {
      this.config = cachedConfig;
      return cachedConfig;
    }

    return await this.configPromise;
  }

  private getConfigFromStorage(): FrontendConfig | null {
    if (typeof window === 'undefined') return null;

    try {
      const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as FrontendConfig;
        if (this.isConfigComplete(parsed)) {
          return parsed;
        }
      }
    } catch (error) {
      console.error('Памылка чытаньня канфігу з localStorage:', error);
    }

    return null;
  }

  private setConfigToStorage(config: FrontendConfig): void {
    if (typeof window === 'undefined') return;

    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
  }

  private isConfigComplete(config: FrontendConfig): boolean {
    return !!(
      config.turnstileSiteKey &&
      config.sentryDsn &&
      config.environment &&
      config.version
    );
  }

  // Вэрсія ня лічыцца дастатковаю прычынаю каб перагружаць старонку
  private configsAreDifferent(a: FrontendConfig, b: FrontendConfig): boolean {
    return (
      a.turnstileSiteKey !== b.turnstileSiteKey ||
      a.sentryDsn !== b.sentryDsn ||
      a.environment !== b.environment ||
      a.googleSignInEnabled !== b.googleSignInEnabled ||
      a.stanzaEnabled !== b.stanzaEnabled
    );
  }

  private async loadConfig(): Promise<FrontendConfig> {
    try {
      const response =
        await serviceLocator.apiClient.get<FrontendConfig>('/auth/config');
      if (!response.data) {
        throw new Error('Сэрвер не аддаў канфіг о_О');
      }
      const receivedConfig = response.data;

      const cachedConfig = this.getConfigFromStorage();
      this.setConfigToStorage(receivedConfig);
      if (
        cachedConfig &&
        this.configsAreDifferent(cachedConfig, receivedConfig)
      ) {
        console.log('Канфіг зьмяніўся, захоўваем і перагружаем старонку');
        // Перагружаем старонку, бо мы ўжо збрахалі іншым кампанэнтам, які насамрэч ёсьць канфіг
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      }

      this.config = receivedConfig;
      return receivedConfig;
    } catch (error) {
      console.error('Памылка загрузкі канфігу:', error);
      return FALLBACK_CONFIG;
    }
  }
}

export const configService = new ConfigService();
