import { configService } from './configService';

interface TurnstileRenderParams {
  sitekey: string;
  action?: string;
  callback?: (token: string) => void;
  'error-callback'?: () => void;
  'expired-callback'?: () => void;
}

declare global {
  interface Window {
    turnstile: {
      render: (container: HTMLElement, params: TurnstileRenderParams) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

class TurnstileService {
  private siteKey: string | null = null;
  private scriptPromise: Promise<void> | null = null;

  async initialize(): Promise<void> {
    const config = await configService.getConfig();
    this.siteKey = config.turnstileSiteKey;

    if (!this.scriptPromise) {
      this.scriptPromise = this.loadScript();
    }
    await this.scriptPromise;
  }

  private loadScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.turnstile) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src =
        'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;

      script.onload = () => resolve();
      script.onerror = () => {
        reject(new Error('Не ўдалося загрузіць скрыпт Turnstile'));
      };

      document.head.appendChild(script);
    });
  }

  renderWidget(
    container: HTMLElement,
    action: string,
    onToken: (token: string | null) => void
  ): string | null {
    if (!window.turnstile || !this.siteKey) {
      console.error('Turnstile не гатовая');
      return null;
    }

    return window.turnstile.render(container, {
      sitekey: this.siteKey,
      action,
      callback: token => onToken(token),
      'error-callback': () => onToken(null),
      'expired-callback': () => onToken(null),
    });
  }

  reset(widgetId: string): void {
    window.turnstile?.reset(widgetId);
  }

  remove(widgetId: string): void {
    window.turnstile?.remove(widgetId);
  }
}

export const turnstileService = new TurnstileService();
