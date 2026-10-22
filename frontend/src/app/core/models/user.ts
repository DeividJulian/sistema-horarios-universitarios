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
  /** False until the person enters their first emailed code. */
  verificado?: boolean;
}

/** New account created by an administrator: the person enters with a code sent to this email. */
export interface UserInput {
  nombre: string;
  email: string;
  rol: Role;
  grupo_id?: number | null;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  usuario: User;
}

/** Self sign-up, only for students (teachers already have an account: they just sign in). */
export interface RegisterInput {
  nombre: string;
  email: string;
  grupo_id: number;
}

/** Answer of POST /auth/register and /auth/login: a six-digit code went to this email. */
export interface CodeSent {
  mensaje: string;
  email: string;
}

/** Group offered in the sign-up form (GET /auth/register-options). */
export interface RegisterGroup {
  id: number;
  nombre: string;
  jornada: string;
}

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrador',
  usuario: 'Consulta',
  profesor: 'Profesor',
  estudiante: 'Estudiante',
};
