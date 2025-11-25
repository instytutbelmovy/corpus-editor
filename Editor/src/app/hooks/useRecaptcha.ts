import { useCallback, useEffect, useState } from 'react';
import { recaptchaService } from '@/app/services/recaptchaService';

export const useRecaptcha = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initializeRecaptcha = async () => {
      try {
        await recaptchaService.initialize();
        const status = recaptchaService.getStatus();
        setIsLoaded(status.isLoaded);
        setIsReady(status.isReady);
      } catch (error) {
        console.error('Памылка ініцыялізацыі reCAPTCHA:', error);
      }
    };

    initializeRecaptcha();
  }, []);

  const executeRecaptcha = useCallback(async (action: string): Promise<string | null> => {
    return recaptchaService.execute(action);
  }, []);

  return {
    isLoaded,
    isReady,
    executeRecaptcha
  };
};
