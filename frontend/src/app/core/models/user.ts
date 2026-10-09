// Roles are part of the API contract (in Spanish): "admin" manages everything, "usuario" only reads.
export type Role = 'admin' | 'usuario';

export interface User {
  id: number;
  nombre: string;
  email: string;
  rol: Role;
}

export interface UserInput {
  nombre: string;
  email: string;
  password: string;
  rol: Role;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  usuario: User;
}

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrador',
  usuario: 'Usuario',
};
