import { useEffect } from 'react';
import { useAuthStore } from '@/app/auth/store';

/**
 * Хук для кіравання візуальным станам reCAPTCHA
 * Схавае reCAPTCHA на старонках праграмы і пакажа на старонках аўтэнтыфікацыі
 */
export const useRecaptchaVisibility = (showRecaptcha: boolean = false) => {
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    const body = document.body;
    
    // Вызначаем, ці паказваць reCAPTCHA
    const shouldShow = showRecaptcha && !isAuthenticated;
    
    if (shouldShow) {
      // Паказваем reCAPTCHA
      body.classList.remove('recaptcha-hidden');
    } else {
      // Схаваем reCAPTCHA
      body.classList.add('recaptcha-hidden');
    }

    // Ачыстка пры размонтировании
    return () => {
      body.classList.remove('recaptcha-hidden');
    };
  }, [showRecaptcha, isAuthenticated]);
};
