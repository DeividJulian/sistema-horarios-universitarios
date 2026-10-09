import { HttpErrorResponse } from '@angular/common/http';

import { apiErrorMessage } from './api-error';

describe('apiErrorMessage', () => {
  it('uses the backend detail when it is a string', () => {
    const error = new HttpErrorResponse({ status: 409, error: { detail: 'El aula ya está ocupada en esa franja' } });
    expect(apiErrorMessage(error, 'fallback')).toBe('El aula ya está ocupada en esa franja');
  });

  it('explains that the server is unreachable on status 0', () => {
    const error = new HttpErrorResponse({ status: 0 });
    expect(apiErrorMessage(error, 'fallback')).toContain('No se pudo conectar con el servidor');
  });

  it('gives a generic message for server errors without detail', () => {
    const error = new HttpErrorResponse({ status: 500, error: null });
    expect(apiErrorMessage(error, 'fallback')).toContain('El servidor tuvo un problema');
  });

  it('falls back for anything else', () => {
    expect(apiErrorMessage(new Error('boom'), 'No se pudo guardar.')).toBe('No se pudo guardar.');
    expect(apiErrorMessage(new HttpErrorResponse({ status: 422, error: { detail: ['x'] } }), 'fallback')).toBe('fallback');
  });
});
