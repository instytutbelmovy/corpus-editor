import { ApiClient } from '@/app/apiClient';
import { EditorUserDto, EditorUserCreateDto } from './types';

export class UserService {
  private apiClient: ApiClient;

  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient;
  }

  async fetchUsers(): Promise<EditorUserDto[]> {
    const response = await this.apiClient.get<EditorUserDto[]>('/users');
    if (response.error) {
      throw new Error(response.error);
    }
    return response.data!;
  }

  async createUser(userData: EditorUserCreateDto): Promise<EditorUserDto> {
    const response = await this.apiClient.post<EditorUserDto>('/users', userData);
    if (response.error) {
      throw new Error(response.error);
    }
    return response.data!;
  }

  async updateUser(id: string, userData: EditorUserCreateDto): Promise<EditorUserDto> {
    const response = await this.apiClient.put<EditorUserDto>(`/users/${id}`, userData);
    if (response.error) {
      throw new Error(response.error);
    }
    return response.data!;
  }
}
