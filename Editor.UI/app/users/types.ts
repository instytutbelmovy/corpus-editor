import { Roles } from '@/app/auth/types';
import type { FormErrors as BaseFormErrors } from '@/app/types';

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

// Формы карыстальніка маюць фіксаваны набор палёў — памылка ў іншым ключы няправільная
export type FormErrors = BaseFormErrors<keyof EditorUserCreateDto>;
