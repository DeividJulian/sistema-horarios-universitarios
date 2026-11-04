// Accounts and sign-in, from the backend contract.
// admin: manages everything · usuario: reads everything · profesor: sees and adjusts their own classes ·
// estudiante: sees only their group's schedule.
import type { CodeSent as CodeSentOut, RegisterGroup as RegisterGroupOut, RegisterRequest, TokenOut, UserCreate, UserOut } from '../api/generated';

export type Role = UserOut['rol'];
export type User = UserOut;
/** New account created by an administrator: the person enters with a code sent to this email. */
export type UserInput = UserCreate;
export type LoginResponse = TokenOut;
/** Self sign-up, only for students (teachers already have an account: they just sign in). */
export type RegisterInput = RegisterRequest;
/** Answer of POST /auth/register and /auth/login: a six-digit code went to this email. */
export type CodeSent = CodeSentOut;
/** Group offered in the sign-up form (GET /auth/register-options). */
export type RegisterGroup = RegisterGroupOut;

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrador',
  usuario: 'Consulta',
  profesor: 'Profesor',
  estudiante: 'Estudiante',
};
