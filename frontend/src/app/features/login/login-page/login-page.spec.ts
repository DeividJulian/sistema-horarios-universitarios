import { HttpErrorResponse } from '@angular/common/http';

import { loginErrorMessage } from './login-page';

describe('loginErrorMessage', () => {
  it('explains that there is no connection', () => {
    expect(loginErrorMessage(new HttpErrorResponse({ status: 0 }))).toContain('No hay conexión con el servidor');
  });

  it('uses the backend message for wrong credentials and blocked accounts', () => {
    const wrong = new HttpErrorResponse({ status: 401, error: { detail: 'Correo o contraseña incorrectos.' } });
    expect(loginErrorMessage(wrong)).toBe('Correo o contraseña incorrectos.');
    expect(loginErrorMessage(new HttpErrorResponse({ status: 403, error: null }))).toContain('no tiene acceso');
  });

  it('says the server is waking up when Render answers 502, 503 or 504', () => {
    for (const status of [502, 503, 504]) {
      expect(loginErrorMessage(new HttpErrorResponse({ status }))).toContain('despertando');
    }
  });

  it('falls back to a generic message', () => {
    expect(loginErrorMessage(new Error('boom'))).toBe('No se pudo iniciar sesión. Intenta de nuevo.');
  });
});
