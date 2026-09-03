import { useCallback, useEffect, useRef, useState } from 'react';
import { turnstileService } from '@/app/services/turnstileService';

export const useTurnstile = (action: string) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const tokenRef = useRef<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        await turnstileService.initialize();
        if (cancelled || !containerRef.current) return;

        widgetIdRef.current = turnstileService.renderWidget(
          containerRef.current,
          action,
          token => {
            tokenRef.current = token;
          }
        );
        setIsReady(widgetIdRef.current !== null);
      } catch (error) {
        console.error('Памылка ініцыялізацыі Turnstile:', error);
      }
    };

    init();

    return () => {
      cancelled = true;
      if (widgetIdRef.current) {
        turnstileService.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [action]);

  const getToken = useCallback((): string | null => tokenRef.current, []);

  // Токены Turnstile аднаразовыя — скідаем віджэт, каб атрымаць новы токен
  // перад наступнай спробай пасьля няўдалай адпраўкі формы.
  const resetToken = useCallback((): void => {
    tokenRef.current = null;
    if (widgetIdRef.current) {
      turnstileService.reset(widgetIdRef.current);
    }
  }, []);

  return { containerRef, isReady, getToken, resetToken };
};
