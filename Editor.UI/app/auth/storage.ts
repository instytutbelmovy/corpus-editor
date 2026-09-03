import { User } from './types';

const AUTH_STORAGE_KEY = 'editor-auth-user';

// Лакальны кэш карыстальніка для аптымістычнай аўтэнтыфікацыі; памылкі localStorage ігнаруем
export class AuthStorage {
  static get(): User | null {
    if (typeof window === 'undefined') return null;

    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  static set(user: User): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } catch {
      // ігнаруем
    }
  }

  static clear(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {
      // ігнаруем
    }
  }
}
