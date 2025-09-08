import { create } from 'zustand';
import { AuthService } from './service';
import { AuthStorage } from './storage';
import { User } from './types';

interface AuthState {
  // Стан аўтэнтыфікацыі
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  
  // Сэрвіс
  authService: AuthService | null;
  
  // Дзеянні
  setAuthService: (service: AuthService) => void;
  signIn: (email: string, password: string, recaptchaToken?: string | null) => Promise<{ success: boolean; message?: string }>;
  signOut: () => Promise<void>;
  checkAuthStatus: () => Promise<boolean>;
  setAuthenticated: (authenticated: boolean) => void;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  // Пачатковы стан
  isAuthenticated: false,
  isLoading: true,
  user: null,
  authService: null,

  // Дзеянні
  setAuthService: (service) => set({ authService: service }),

  signIn: async (email, password, recaptchaToken) => {
    const { authService } = get();
    if (!authService) {
      return { success: false, message: 'Сэрвіс не ініцыялізаваны' };
    }

    const result = await authService.signIn(email, password, recaptchaToken);
    if (result.success) {
      const user = AuthStorage.get();
      set({ 
        isAuthenticated: true, 
        user: user || null 
      });
    }
    return result;
  },

  signOut: async () => {
    const { authService } = get();
    if (authService) {
      await authService.signOut();
    }
    set({ 
      isAuthenticated: false, 
      user: null 
    });
  },

  checkAuthStatus: async () => {
    const { authService } = get();
    if (!authService) {
      set({ isAuthenticated: false, isLoading: false });
      return false;
    }

    try {
      const isAuth = await authService.checkAuthStatus();
      if (isAuth) {
        const user = AuthStorage.get();
        set({ 
          isAuthenticated: true, 
          user: user || null,
          isLoading: false 
        });
      } else {
        set({ 
          isAuthenticated: false, 
          user: null,
          isLoading: false 
        });
      }
      return isAuth;
    } catch (error) {
      console.error('Auth check failed:', error);
      set({ 
        isAuthenticated: false, 
        user: null,
        isLoading: false 
      });
      return false;
    }
  },

  setAuthenticated: (authenticated) => set({ isAuthenticated: authenticated }),
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ isLoading: loading }),
}));
