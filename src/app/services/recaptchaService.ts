import { configService, FrontendConfig } from './configService';
import { apiService } from './apiService';

declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

class ReCaptchaService {
  private isLoaded = false;
  private isReady = false;
  private siteKey: string | null = null;
  private configPromise: Promise<FrontendConfig> | null = null;
  private scriptLoaded = false;

  async initialize(): Promise<void> {
    if (this.isReady) {
      return;
    }

    if (this.configPromise) {
      await this.configPromise;
      return;
    }

    this.configPromise = this.loadConfig();
    const config = await this.configPromise;
    this.siteKey = config.recaptchaSiteKey;

    if (!this.scriptLoaded) {
      await this.loadScript();
    }
  }

  private async loadConfig(): Promise<FrontendConfig> {
    return configService.getConfig(apiService);
  }

  private async loadScript(): Promise<void> {
    if (this.scriptLoaded || !this.siteKey) {
      return;
    }

    return new Promise((resolve, reject) => {
      // Правяраем, ці ўжо загружаны скрыпт
      if (window.grecaptcha) {
        this.scriptLoaded = true;
        this.isLoaded = true;
        window.grecaptcha.ready(() => {
          this.isReady = true;
          resolve();
        });
        return;
      }

      const script = document.createElement('script');
      script.src = `https://www.google.com/recaptcha/api.js?render=${this.siteKey}`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        this.scriptLoaded = true;
        this.isLoaded = true;
        window.grecaptcha.ready(() => {
          this.isReady = true;
          resolve();
        });
      };

      script.onerror = () => {
        reject(new Error('Не ўдалося загрузіць скрыпт reCAPTCHA'));
      };

      document.head.appendChild(script);
    });
  }

  async execute(action: string): Promise<string | null> {
    if (!this.isReady || !window.grecaptcha || !this.siteKey) {
      console.error('reCAPTCHA не гатовая');
      return null;
    }

    try {
      const token = await window.grecaptcha.execute(this.siteKey, { action });
      return token;
    } catch (error) {
      console.error('Памылка выканання reCAPTCHA:', error);
      return null;
    }
  }

  getStatus() {
    return {
      isLoaded: this.isLoaded,
      isReady: this.isReady,
      siteKey: this.siteKey
    };
  }
}

export const recaptchaService = new ReCaptchaService();
