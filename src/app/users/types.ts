import { Roles } from '@/app/auth/types';

export interface EditorUserDto {
  id: string;
  userName: string;
  email: string;
  role: Roles;
}

export interface EditorUserCreateDto {
  userName: string;
  email: string;
  role: Roles;
}

export interface FormErrors {
  userName?: string;
  email?: string;
  role?: string;
  submit?: string;
}
