import { ApiClient, unwrap } from '@/app/apiClient';
import { EditorUserDto, EditorUserCreateDto } from './types';

export class UserService {
  constructor(private readonly apiClient: ApiClient) {}

  async fetchUsers(): Promise<EditorUserDto[]> {
    return unwrap(await this.apiClient.get<EditorUserDto[]>('/users'));
  }

  async fetchUser(id: string): Promise<EditorUserDto> {
    return unwrap(await this.apiClient.get<EditorUserDto>(`/users/${id}`));
  }

  async createUser(userData: EditorUserCreateDto): Promise<EditorUserDto> {
    return unwrap(await this.apiClient.post<EditorUserDto>('/users', userData));
  }

  async updateUser(
    id: string,
    userData: EditorUserCreateDto
  ): Promise<EditorUserDto> {
    return unwrap(
      await this.apiClient.put<EditorUserDto>(`/users/${id}`, userData)
    );
  }

  async inviteUser(userId: string): Promise<void> {
    unwrap(await this.apiClient.post(`/users/${userId}/invite`, { userId }));
  }
}
