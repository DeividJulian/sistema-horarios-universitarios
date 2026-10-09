import { HttpErrorResponse } from '@angular/common/http';

/**
 * Turns any HTTP error into a message the user can understand (in Spanish).
 * The backend always answers errors as {"detail": "text"}.
 */
export function apiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return 'No se pudo conectar con el servidor. Revisa que el backend esté encendido.';
    }
    const detail = (error.error as { detail?: unknown } | null)?.detail;
    if (typeof detail === 'string' && detail.trim()) {
      return detail;
    }
    if (error.status >= 500) {
      return 'El servidor tuvo un problema. Intenta de nuevo en un momento.';
    }
  }
  return fallback;
}
