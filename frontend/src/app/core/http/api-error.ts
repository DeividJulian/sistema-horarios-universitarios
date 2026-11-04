import { HttpErrorResponse } from '@angular/common/http';

import { zErrorOut } from '../api/generated/zod.gen';
import { ApiContractError } from '../api/parse';

/** Shown when the API answered with data that does not follow the contract (see core/api/parse.ts). */
export const CONTRACT_ERROR_MESSAGE =
  'El servidor respondió con datos que la aplicación no esperaba. Recarga la página; si vuelve a pasar, avisa al administrador.';

/**
 * Turns any HTTP error into a message the user can understand (in Spanish).
 * The backend always answers errors as {"detail": "text"}.
 */
export function apiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiContractError) {
    return CONTRACT_ERROR_MESSAGE;
  }
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return 'No se pudo conectar con el servidor. Revisa que el backend esté encendido.';
    }
    // Parsed, not cast: an unexpected error body just falls back to the generic message
    const body = zErrorOut.safeParse(error.error);
    if (body.success && body.data.detail.trim()) {
      return body.data.detail;
    }
    if (error.status >= 500) {
      return 'El servidor tuvo un problema. Intenta de nuevo en un momento.';
    }
  }
  return fallback;
}
