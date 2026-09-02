import { create } from 'zustand';
import { serviceLocator } from '@/app/services/serviceLocator';
import { AuthStorage } from './storage';
import { AuthResponse, User } from './types';

interface AuthState {
  isAuthenticated: boolean;
  // true, пакуль не вядома ні з кэшу, ні з сэрвэра, ці ўвайшоў карыстальнік
  isLoading: boolean;
  user: User | null;

  signIn: (
    email: string,
    password: string,
    turnstileToken?: string | null
  ) => Promise<AuthResponse>;
  signOut: () => Promise<void>;
  checkAuthStatus: () => Promise<boolean>;
  // Аптымістычна лічым увайшоўшым па лакальным кэшы, пакуль ідзе праверка на сэрвэры
  hydrateFromCache: () => void;
}

export const useAuthStore = create<AuthState>(set => ({
  isAuthenticated: false,
  isLoading: true,
  user: null,

  signIn: async (email, password, turnstileToken) => {
    const result = await serviceLocator.authService.signIn(
      email,
      password,
      turnstileToken
    );
    if (result.success) {
      set({ isAuthenticated: true, user: AuthStorage.get() });
    }
    return result;
  },

  signOut: async () => {
    await serviceLocator.authService.signOut();
    set({ isAuthenticated: false, user: null });
  },

  checkAuthStatus: async () => {
    try {
      const isAuth = await serviceLocator.authService.checkAuthStatus();
      set({
        isAuthenticated: isAuth,
        user: isAuth ? AuthStorage.get() : null,
        isLoading: false,
      });
      return isAuth;
    } catch (error) {
      console.error('Auth check failed:', error);
      set({ isAuthenticated: false, user: null, isLoading: false });
      return false;
    }
  },

  hydrateFromCache: () => {
    const user = AuthStorage.get();
    if (user) {
      set({ isAuthenticated: true, user, isLoading: false });
    }
  },
}));
