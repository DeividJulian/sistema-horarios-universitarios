// Roles are part of the API contract (in Spanish).
// admin: manages everything · usuario: reads everything · profesor: sees and adjusts their own classes ·
// estudiante: sees only their group's schedule.
export type Role = 'admin' | 'usuario' | 'profesor' | 'estudiante';

export interface User {
  id: number;
  nombre: string;
  email: string;
  rol: Role;
  profesor_id?: number | null;
  grupo_id?: number | null;
}

export interface UserInput {
  nombre: string;
  email: string;
  password: string;
  rol: Role;
  grupo_id?: number | null;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  usuario: User;
}

/** Self sign-up: students choose their group; teachers activate the account of their registered email. */
export interface RegisterInput {
  rol: 'estudiante' | 'profesor';
  email: string;
  password: string;
  nombre?: string;
  grupo_id?: number;
}

/** Group offered in the sign-up form (GET /auth/register-options). */
export interface RegisterGroup {
  id: number;
  nombre: string;
  jornada: string;
}

/** Test account offered on the login page (GET /auth/demo-accounts). */
export interface DemoAccount {
  rol: Role;
  etiqueta: string;
  descripcion: string;
  email: string;
  password: string;
}

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrador',
  usuario: 'Consulta',
  profesor: 'Profesor',
  estudiante: 'Estudiante',
};
