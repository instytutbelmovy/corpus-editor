import { create } from 'zustand';
import { serviceLocator } from '@/app/services/serviceLocator';
import { AuthStorage } from './storage';
import { AuthResponse, User } from './types';

interface AuthState {
  isAuthenticated: boolean;
  // true, пакуль не вядома ні з кэшу, ні з сэрвэра, ці ўвайшоў карыстальнік
  isLoading: boolean;
  user: User | null;
  // true пасьля яўнага выхаду (кнопка "Выйсьці") - аднаразовы сыгнал для _app.tsx, каб не дадаваць returnTo да /sign-in, у адрозьненьне ад страты сэсіі (401)
  explicitSignOut: boolean;

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
  explicitSignOut: false,

  signIn: async (email, password, turnstileToken) => {
    const result = await serviceLocator.authService.signIn(
      email,
      password,
      turnstileToken
    );
    if (result.success) {
      set({ isAuthenticated: true, user: result.user ?? null });
    }
    return result;
  },

  signOut: async () => {
    await serviceLocator.authService.signOut();
    set({ isAuthenticated: false, user: null, explicitSignOut: true });
  },

  checkAuthStatus: async () => {
    try {
      const user = await serviceLocator.authService.checkAuthStatus();
      set({
        isAuthenticated: user !== null,
        user,
        isLoading: false,
      });
      return user !== null;
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
