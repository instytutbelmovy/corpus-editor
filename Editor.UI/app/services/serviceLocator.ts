import { ApiClient } from '@/app/apiClient';
import { AuthService } from '@/app/auth/service';
import { DocumentService } from '@/app/docs/service';
import { UserService } from '@/app/users/service';

class ServiceLocator {
  private static instance: ServiceLocator;

  private _apiClient: ApiClient | null = null;
  private _authService: AuthService | null = null;
  private _documentService: DocumentService | null = null;
  private _userService: UserService | null = null;

  private constructor() { }

  public static getInstance(): ServiceLocator {
    if (!ServiceLocator.instance) {
      ServiceLocator.instance = new ServiceLocator();
    }
    return ServiceLocator.instance;
  }

  public initialize(onUnauthorized: () => void) {
    // Re-initialization is allowed to update the callback if needed,
    // though typically it happens once.
    this._apiClient = new ApiClient(onUnauthorized);
    this._authService = new AuthService(onUnauthorized);
    this._documentService = new DocumentService(this._apiClient);
    this._userService = new UserService(this._apiClient);
  }

  public get apiClient(): ApiClient {
    if (!this._apiClient) throw new Error('ServiceLocator not initialized');
    return this._apiClient;
  }

  public get authService(): AuthService {
    if (!this._authService) throw new Error('ServiceLocator not initialized');
    return this._authService;
  }

  public get documentService(): DocumentService {
    if (!this._documentService) throw new Error('ServiceLocator not initialized');
    return this._documentService;
  }

  public get userService(): UserService {
    if (!this._userService) throw new Error('ServiceLocator not initialized');
    return this._userService;
  }

  public isInitialized(): boolean {
    return !!this._apiClient;
  }
}

export const serviceLocator = ServiceLocator.getInstance();
