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

export interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<AuthResponse>;
  signOut: () => Promise<void>;
  authService: AuthService | null;
  documentService: DocumentService | null;
}
