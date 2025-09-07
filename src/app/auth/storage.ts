import { Roles } from './types';

interface AuthUser {
  id: string;
  role: Roles;
}

const AUTH_STORAGE_KEY = 'editor_auth_user';

export class AuthStorage {
  static get(): AuthUser | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  static set(user: AuthUser): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } catch {
      // Ігнаруем памылкі localStorage
    }
  }

  static clear(): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {
      // Ігнаруем памылкі localStorage
    }
  }

  static isAuthenticated(): boolean {
    return this.get() !== null;
  }
}
