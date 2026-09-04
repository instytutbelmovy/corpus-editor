import { ApiClient, unwrap } from '@/app/apiClient';
import { AuthStorage } from './storage';
import { AuthResponse, Roles, User } from './types';

interface WhoAmIResponse {
  id: string;
  role: number;
}

const toUser = (response: WhoAmIResponse): User => ({
  id: response.id,
  role: response.role as Roles,
});

export class AuthService {
  constructor(private readonly apiClient: ApiClient) {}

  async signIn(
    email: string,
    password: string,
    turnstileToken?: string | null
  ): Promise<AuthResponse> {
    // 401 тут - няправільны пароль, а не пратэрмінаваная сэсія: не перанакіроўваем
    const response = await this.apiClient.post<WhoAmIResponse>(
      '/auth/sign-in',
      { email, password, turnstileToken },
      { skipUnauthorizedRedirect: true }
    );

    if (response.data) {
      AuthStorage.set(toUser(response.data));
      return { success: true };
    }

    if (response.status === 401) {
      return { success: false, message: 'Няправільны email або пароль' };
    }

    if (response.status === 423) {
      return {
        success: false,
        message: 'Карыстальнік часова заблякаваны, паспрабуйце пазьней',
      };
    }

    return {
      success: false,
      message: response.error || 'Памылка ўваходу ў сістэму',
    };
  }

  async signOut(): Promise<void> {
    await this.apiClient.post('/auth/sign-out');
    AuthStorage.clear();
  }

  // Праверка сэсіі на сэрвэры; пры 401 ApiClient ачышчае кэш, але не перанакіроўвае
  async checkAuthStatus(): Promise<boolean> {
    const response = await this.apiClient.get<WhoAmIResponse>(
      '/auth/who-am-i',
      { skipUnauthorizedRedirect: true }
    );

    if (!response.data) return false;

    AuthStorage.set(toUser(response.data));
    return true;
  }

  async forgotPassword(
    email: string,
    turnstileToken: string | null
  ): Promise<void> {
    unwrap(
      await this.apiClient.post('/auth/forgot-password', {
        email,
        turnstileToken,
      })
    );
  }

  async resetPassword(
    email: string,
    token: string,
    newPassword: string,
    turnstileToken: string | null
  ): Promise<void> {
    unwrap(
      await this.apiClient.post('/auth/reset-password', {
        email,
        token,
        newPassword,
        turnstileToken,
      })
    );
  }
}
