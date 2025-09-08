export enum Roles {
  None = 0,
  Viewer = 10,
  Editor = 20,
  Admin = 100,
}

export function getRoleName(roleValue: number): string {
  switch (roleValue) {
    case Roles.None:
      return 'Нэактыўны';
    case Roles.Viewer:
      return 'Глядач';
    case Roles.Editor:
      return 'Рэдактар';
    case Roles.Admin:
      return 'Адміністратар';
    default:
      return 'Невядомая роля';
  }
}

export interface SignInRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
}

import { AuthService } from './service';
import { DocumentService } from '@/app/docs/service';
import { UserService } from '@/app/users/service';

export interface User {
  id: string;
  role: Roles;
}

export interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<AuthResponse>;
  signOut: () => Promise<void>;
  authService: AuthService | null;
  documentService: DocumentService | null;
  userService: UserService | null;
}
