import { ApiClient } from '@/app/apiClient';
import { AuthStorage } from './storage';
import { Roles } from './types';

interface AuthResponse {
  success: boolean;
  message?: string;
}

interface WhoAmIResponse {
  id: string;
  role: number;
}

export class AuthService {
  private apiClient: ApiClient;

  constructor(onUnauthorized: () => void) {
    this.apiClient = new ApiClient(onUnauthorized);
  }

  async signIn(email: string, password: string, recaptchaToken?: string | null): Promise<AuthResponse> {
    const response = await this.apiClient.post<WhoAmIResponse>('/auth/sign-in', { 
      email, 
      password, 
      recaptchaToken 
    });

    if (response.data) {
      // Захоўваем інфармацыю пра карыстальніка ў localStorage
      AuthStorage.set({
        id: response.data.id,
        role: response.data.role as Roles
      });
      return { success: true };
    }

    if (response.status === 401) {
      return { success: false, message: 'Няправільны email або пароль' };
    }

    if (response.status === 423) {
      return { success: false, message: 'Карыстальнік часова заблякаваны, паспрабуйце пазьней' };
    }

    return { 
      success: false, 
      message: response.error || 'Памылка ўваходу ў сістэму' 
    };
  }

  async signOut(): Promise<void> {
    await this.apiClient.post('/auth/sign-out');
    AuthStorage.clear();
  }

  async checkAuthStatus(): Promise<boolean> {
    const response = await this.apiClient.get<WhoAmIResponse>('/auth/who-am-i', {}, true); // skipUnauthorizedRedirect = true
    
    if (response.data) {
      // Абнаўляем інфармацыю пра карыстальніка
      AuthStorage.set({
        id: response.data.id,
        role: response.data.role as Roles
      });
      return true;
    }

    // Калі 401, ачысціць localStorage (гэта ўжо зроблена ў ApiClient)
    return false;
  }

  getCurrentUser() {
    return AuthStorage.get();
  }

  isAuthenticated(): boolean {
    return AuthStorage.isAuthenticated();
  }
}

// Экспарт класа, а не экземпляра
