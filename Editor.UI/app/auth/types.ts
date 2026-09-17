export enum Roles {
  None = 0,
  Viewer = 10,
  Editor = 20,
  Admin = 100,
}

export function getRoleName(roleValue: number): string {
  switch (roleValue) {
    case Roles.None:
      return 'Неактыўны';
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

export interface User {
  id: string;
  role: Roles;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  user?: User;
}
